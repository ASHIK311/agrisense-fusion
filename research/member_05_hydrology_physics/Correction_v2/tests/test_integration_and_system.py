"""
Comprehensive Test Suite 3: Integration, Nationwide Configuration, and Cross-Platform Physics
"""

# import pytest
from pathlib import Path
import pandas as pd
from src.crop_parameters.national_adapter import get_upazila_profile, BANGLADESH_UPAZILA_REGISTRY
from src.weather.nasa_power import NASAWeatherClient
from src.validation.comparison_engine import compare_python_and_javascript_physics
from src.seasonal_simulation.simulation_engine import SeasonalSimulationRunner


def test_location_configurability_nationwide():
    """Test 18: Upazila profile adapter supports nationwide Bangladesh expansion."""
    godagari = get_upazila_profile("godagari")
    assert godagari.latitude_deg == 24.469
    assert godagari.longitude_deg == 88.330
    assert godagari.aez_number == 26

    # Test Tanore and Chuadanga
    tanore = get_upazila_profile("tanore")
    assert tanore.district == "Rajshahi"
    assert tanore.theta_fc == 0.34

    chuadanga = get_upazila_profile("chuadanga_sadar")
    assert chuadanga.latitude_deg == 23.640
    assert "Heat Extreme" in chuadanga.drought_vulnerability


def test_raw_weather_caching_and_persistence():
    """Test 19: NASA POWER raw JSON and processed CSV caching."""
    client = NASAWeatherClient(
        raw_cache_dir=Path("F:/nasa project/Member 5/Correction_v2/data/raw"),
        processed_cache_dir=Path("F:/nasa project/Member 5/Correction_v2/data/processed"),
    )
    dataset = client.fetch_nasa_power_data(
        latitude=24.469,
        longitude=88.330,
        start_date="2019-01-01",
        end_date="2024-01-01",
    )
    assert dataset.record_count == 1827
    assert dataset.source_type in ["NASA_POWER_REANALYSIS", "LOCAL_CACHE"]

    # Verify processed CSV exists on disk
    processed_csv = Path("F:/nasa project/Member 5/Correction_v2/data/processed/weather_processed_daily.csv")
    assert processed_csv.exists()
    assert processed_csv.stat().st_size > 50000


def test_api_timeout_and_retry_configuration():
    """Test 20: Client enforces explicit timeout and retry properties."""
    client = NASAWeatherClient(timeout_seconds=15, max_retries=3, backoff_factor=1.5)
    assert client.timeout_seconds == 15
    assert client.max_retries == 3
    assert client.backoff_factor == 1.5


def test_deterministic_simulation_reproducibility():
    """Test 21: Identical inputs produce bitwise identical mathematical outputs."""
    weather_df = pd.read_csv("F:/nasa project/Member 5/Correction_v2/data/processed/weather_processed_daily.csv")
    runner = SeasonalSimulationRunner(latitude_deg=24.469, elevation_m=20.0)

    res1 = runner.run_single_crop_season(weather_df, crop_id="wheat", planting_date="2022-11-20")
    res2 = runner.run_single_crop_season(weather_df, crop_id="wheat", planting_date="2022-11-20")

    assert res1.total_et0_mm == res2.total_et0_mm
    assert res1.total_etc_act_mm == res2.total_etc_act_mm
    assert res1.total_net_irrigation_mm == res2.total_net_irrigation_mm
    assert res1.irrigation_event_count == res2.irrigation_event_count


def test_python_vs_javascript_physics_comparison():
    """Test 22: Cross-platform validation comparing Python reference with Node.js backend."""
    js_path = Path("F:/nasa project/server/physics/penmanMonteith.js")
    records = compare_python_and_javascript_physics(js_module_path=js_path)
    assert len(records) == 5

    # Standard day must have high concordance (<5% relative difference)
    std_case = records[0]
    assert std_case.agreement_status == "EXCELLENT"
    assert std_case.relative_difference_pct < 5.0
