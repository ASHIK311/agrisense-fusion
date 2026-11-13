"""
NASA POWER Agroclimatology Client & Weather Preprocessing
Target: Godagari Upazila (24.469°N, 88.330°E) with nationwide parameterization.
"""

import json
import logging
import math
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
import requests

logger = logging.getLogger(__name__)


@dataclass
class WeatherDataset:
    """Container for processed weather series and ingestion metadata."""
    df: pd.DataFrame
    latitude: float
    longitude: float
    elevation_m: float
    start_date: str
    end_date: str
    record_count: int
    missing_counts: Dict[str, int]
    source_type: str  # "NASA_POWER_REANALYSIS" or "LOCAL_CACHE"
    retrieval_timestamp: str


def create_weather_parameter_dictionary(output_path: Optional[Path] = None) -> pd.DataFrame:
    """Create standardized parameter dictionary for weather variables."""
    records = [
        {
            "Parameter_Code": "T2M_MAX",
            "Parameter_Name": "Maximum Air Temperature at 2 Meters",
            "Units": "deg C",
            "Physical_Min": -10.0,
            "Physical_Max": 55.0,
            "Source_Type": "NASA POWER / MERRA-2 assimilation",
            "Role_In_FAO56": "Vapor pressure e°(Tmax) & longwave radiation",
            "Missing_Sentinel": -999.0
        },
        {
            "Parameter_Code": "T2M_MIN",
            "Parameter_Name": "Minimum Air Temperature at 2 Meters",
            "Units": "deg C",
            "Physical_Min": -15.0,
            "Physical_Max": 40.0,
            "Source_Type": "NASA POWER / MERRA-2 assimilation",
            "Role_In_FAO56": "Vapor pressure e°(Tmin) & longwave radiation",
            "Missing_Sentinel": -999.0
        },
        {
            "Parameter_Code": "T2M",
            "Parameter_Name": "Mean Air Temperature at 2 Meters",
            "Units": "deg C",
            "Physical_Min": -10.0,
            "Physical_Max": 50.0,
            "Source_Type": "NASA POWER / MERRA-2 assimilation",
            "Role_In_FAO56": "Slope Delta & aerodynamic numerator",
            "Missing_Sentinel": -999.0
        },
        {
            "Parameter_Code": "PRECTOTCORR",
            "Parameter_Name": "Corrected Precipitation (Daily Total)",
            "Units": "mm/day",
            "Physical_Min": 0.0,
            "Physical_Max": 500.0,
            "Source_Type": "NASA POWER / MERRA-2 assimilation",
            "Role_In_FAO56": "Effective rainfall Peff & soil water replenishment",
            "Missing_Sentinel": -999.0
        },
        {
            "Parameter_Code": "RH2M",
            "Parameter_Name": "Relative Humidity at 2 Meters",
            "Units": "%",
            "Physical_Min": 0.0,
            "Physical_Max": 100.0,
            "Source_Type": "NASA POWER / MERRA-2 assimilation",
            "Role_In_FAO56": "Actual vapor pressure ea calculation",
            "Missing_Sentinel": -999.0
        },
        {
            "Parameter_Code": "WS2M",
            "Parameter_Name": "Wind Speed at 2 Meters",
            "Units": "m/s",
            "Physical_Min": 0.0,
            "Physical_Max": 45.0,
            "Source_Type": "NASA POWER / MERRA-2 assimilation",
            "Role_In_FAO56": "Aerodynamic bulk transfer velocity u2",
            "Missing_Sentinel": -999.0
        },
        {
            "Parameter_Code": "ALLSKY_SFC_SW_DWN",
            "Parameter_Name": "All Sky Surface Shortwave Downward Irradiance",
            "Units": "MJ/m^2/day",
            "Physical_Min": 0.0,
            "Physical_Max": 40.0,
            "Source_Type": "NASA POWER / MERRA-2 assimilation",
            "Role_In_FAO56": "Solar radiation Rs & net shortwave Rns",
            "Missing_Sentinel": -999.0
        }
    ]
    df = pd.DataFrame(records)
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(output_path, index=False)
    return df


class NASAWeatherClient:
    """Robust client for fetching, validating, and caching NASA POWER weather series."""

    def __init__(
        self,
        base_url: str = "https://power.larc.nasa.gov/api/temporal/daily/point",
        timeout_seconds: int = 15,
        max_retries: int = 3,
        backoff_factor: float = 1.5,
        raw_cache_dir: Union[str, Path] = "data/raw",
        processed_cache_dir: Union[str, Path] = "data/processed",
    ):
        self.base_url = base_url
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.raw_cache_dir = Path(raw_cache_dir)
        self.processed_cache_dir = Path(processed_cache_dir)

        self.raw_cache_dir.mkdir(parents=True, exist_ok=True)
        self.processed_cache_dir.mkdir(parents=True, exist_ok=True)

    def _build_url(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
        parameters: Optional[List[str]] = None,
    ) -> str:
        if parameters is None:
            parameters = [
                "T2M_MAX",
                "T2M_MIN",
                "T2M",
                "PRECTOTCORR",
                "RH2M",
                "WS2M",
                "ALLSKY_SFC_SW_DWN",
            ]
        param_str = ",".join(parameters)
        start_fmt = start_date.replace("-", "")
        end_fmt = end_date.replace("-", "")
        return (
            f"{self.base_url}?"
            f"parameters={param_str}&"
            f"community=AG&"
            f"longitude={longitude:.4f}&"
            f"latitude={latitude:.4f}&"
            f"start={start_fmt}&"
            f"end={end_fmt}&"
            f"format=JSON"
        )

    def fetch_nasa_power_data(
        self,
        latitude: float = 24.469,
        longitude: float = 88.330,
        start_date: str = "2019-01-01",
        end_date: str = "2024-01-01",
        force_refresh: bool = False,
    ) -> WeatherDataset:
        """Fetch NASA POWER daily agroclimatology data with caching, timeouts, and retries."""
        start_clean = start_date.replace("-", "")
        end_clean = end_date.replace("-", "")
        raw_cache_file = self.raw_cache_dir / f"nasa_power_{latitude:.3f}_{longitude:.3f}_{start_clean}_{end_clean}.json"

        data_json = None
        source_type = "NASA_POWER_REANALYSIS"

        # Check raw cache first
        if not force_refresh and raw_cache_file.exists():
            try:
                with open(raw_cache_file, "r", encoding="utf-8") as f:
                    data_json = json.load(f)
                source_type = "LOCAL_CACHE"
                logger.info(f"Loaded raw weather data from cache: {raw_cache_file.name}")
            except Exception as e:
                logger.warning(f"Failed to read cache file {raw_cache_file}: {e}. Refetching from API.")

        # If not cached, perform HTTP query with retries
        if data_json is None:
            url = self._build_url(latitude, longitude, start_date, end_date)
            logger.info(f"Querying NASA POWER API: ({latitude}, {longitude}) [{start_date} to {end_date}]")
            
            last_err = None
            for attempt in range(1, self.max_retries + 1):
                try:
                    res = requests.get(url, timeout=self.timeout_seconds)
                    if res.status_code == 200:
                        data_json = res.json()
                        # Save raw JSON cache
                        with open(raw_cache_file, "w", encoding="utf-8") as f:
                            json.dump(data_json, f, indent=2)
                        logger.info(f"Successfully fetched and cached NASA POWER JSON ({raw_cache_file.name})")
                        break
                    else:
                        logger.warning(f"NASA POWER API returned HTTP {res.status_code} on attempt {attempt}")
                        last_err = RuntimeError(f"HTTP {res.status_code}: {res.text[:100]}")
                except (requests.RequestException, TimeoutError) as e:
                    logger.warning(f"Connection attempt {attempt} failed: {e}")
                    last_err = e

                if attempt < self.max_retries:
                    sleep_time = self.backoff_factor ** attempt
                    time.sleep(sleep_time)

            if data_json is None:
                raise RuntimeError(
                    f"NASA POWER API request failed after {self.max_retries} attempts for ({latitude}, {longitude}). Error: {last_err}"
                )

        # Parse JSON into DataFrame
        parsed_df, missing_counts, elevation_m = self._parse_and_validate(data_json)

        # Cache processed daily CSV
        processed_csv_file = self.processed_cache_dir / "weather_processed_daily.csv"
        parsed_df.to_csv(processed_csv_file, index=False)

        # Record metadata
        self._record_metadata(latitude, longitude, elevation_m, start_date, end_date, len(parsed_df), source_type)

        return WeatherDataset(
            df=parsed_df,
            latitude=latitude,
            longitude=longitude,
            elevation_m=elevation_m,
            start_date=start_date,
            end_date=end_date,
            record_count=len(parsed_df),
            missing_counts=missing_counts,
            source_type=source_type,
            retrieval_timestamp=time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        )

    def _parse_and_validate(self, data_json: dict) -> Tuple[pd.DataFrame, Dict[str, int], float]:
        """Extract parameter series, filter sentinels, perform quality checks."""
        header = data_json.get("properties", {})
        param_data = header.get("parameter", {})
        elevation_m = header.get("elevation", 20.0)

        # Expected parameters
        keys = ["T2M_MAX", "T2M_MIN", "T2M", "PRECTOTCORR", "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN"]
        series_dict = {}
        missing_counts = {}

        for k in keys:
            if k in param_data:
                s = pd.Series(param_data[k])
                # Sentinel check: count -999.0
                missing_mask = s == -999.0
                missing_counts[k] = int(missing_mask.sum())
                s = s.replace(-999.0, np.nan)
                series_dict[k] = s
            else:
                logger.warning(f"Parameter {k} missing from NASA POWER payload!")
                series_dict[k] = pd.Series(dtype=float)
                missing_counts[k] = 0

        df = pd.DataFrame(series_dict)
        df.index = pd.to_datetime(df.index, format="%Y%m%d")
        df.sort_index(inplace=True)

        # Controlled interpolation for isolated missing values (never replace blindly with 0)
        df = df.interpolate(method="time", limit=3).bfill().ffill()

        # Rename to clean scientific field names
        df.reset_index(inplace=True)
        df.rename(
            columns={
                "index": "date",
                "T2M_MAX": "t_max_c",
                "T2M_MIN": "t_min_c",
                "T2M": "t_mean_c",
                "PRECTOTCORR": "rainfall_mm",
                "RH2M": "humidity_pct",
                "WS2M": "wind_speed_2m_m_s",
                "ALLSKY_SFC_SW_DWN": "solar_radiation_mj_m2_day",
            },
            inplace=True,
        )

        # Quality check: ensure Tmax >= Tmin
        inversion_mask = df["t_max_c"] < df["t_min_c"]
        if inversion_mask.any():
            logger.warning(f"Fixed {inversion_mask.sum()} instances of Tmax < Tmin by swapping values.")
            for idx in df[inversion_mask].index:
                t_max = df.loc[idx, "t_max_c"]
                t_min = df.loc[idx, "t_min_c"]
                df.loc[idx, "t_max_c"] = t_min
                df.loc[idx, "t_min_c"] = t_max

        # Physical bounds assertions
        df["rainfall_mm"] = df["rainfall_mm"].clip(lower=0.0)
        df["humidity_pct"] = df["humidity_pct"].clip(lower=0.0, upper=100.0)
        df["wind_speed_2m_m_s"] = df["wind_speed_2m_m_s"].clip(lower=0.0)
        df["solar_radiation_mj_m2_day"] = df["solar_radiation_mj_m2_day"].clip(lower=0.0)

        df["date"] = df["date"].dt.strftime("%Y-%m-%d")
        return df, missing_counts, float(elevation_m)

    def _record_metadata(
        self,
        lat: float,
        lon: float,
        elevation_m: float,
        start_date: str,
        end_date: str,
        record_count: int,
        source_type: str,
    ):
        """Append metadata entry to weather_raw_metadata.csv."""
        metadata_file = self.processed_cache_dir / "weather_raw_metadata.csv"
        record = {
            "query_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "latitude": lat,
            "longitude": lon,
            "elevation_m": elevation_m,
            "start_date": start_date,
            "end_date": end_date,
            "record_count": record_count,
            "source_type": source_type,
            "data_provider": "NASA Langley Research Center POWER API",
            "model_assimilation": "MERRA-2 / GEOS-5.12.4 FP-IT",
            "spatial_resolution": "0.5 x 0.625 degrees",
            "temporal_resolution": "Daily",
            "disclaimer": "NASA POWER values are reanalysis-derived satellite estimates; not direct in-situ gauge observations."
        }
        df_meta = pd.DataFrame([record])
        if metadata_file.exists():
            try:
                existing = pd.read_csv(metadata_file)
                df_meta = pd.concat([existing, df_meta], ignore_index=True).drop_duplicates(
                    subset=["latitude", "longitude", "start_date", "end_date"], keep="last"
                )
            except Exception:
                pass
        df_meta.to_csv(metadata_file, index=False)


def fetch_or_load_weather_data(
    latitude: float = 24.469,
    longitude: float = 88.330,
    start_date: str = "2019-01-01",
    end_date: str = "2024-01-01",
    raw_dir: str = "data/raw",
    processed_dir: str = "data/processed",
) -> WeatherDataset:
    """Convenience factory function."""
    client = NASAWeatherClient(raw_cache_dir=raw_dir, processed_cache_dir=processed_dir)
    return client.fetch_nasa_power_data(
        latitude=latitude,
        longitude=longitude,
        start_date=start_date,
        end_date=end_date,
    )
