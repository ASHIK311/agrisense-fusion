"""
Seasonal Crop Water Balance Simulation Engine
Simulates realistic crop growth cycles, phenological stages, and rotational water demand.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from datetime import datetime, timedelta

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import pandas as pd

from ..physics.fao56 import FAO56ReferenceCalculator
from ..crop_parameters.crop_catalog import (
    CROP_CATALOG,
    CropSpecification,
    get_crop_specification,
    calculate_dynamic_kc_and_depth,
)
from ..water_balance.effective_rainfall import calculate_effective_rainfall_usda
from ..water_balance.root_zone_balance import (
    DailyWaterBalanceStep,
    RootZoneBalanceEngine,
)
from ..water_balance.irrigation_scheduler import (
    IrrigationEvent,
    IrrigationScheduler,
)


@dataclass
class CropSeasonRunResult:
    """Summary and daily time-series container for a completed seasonal simulation."""
    crop_id: str
    crop_name: str
    planting_date: str
    harvest_date: str
    total_days: int
    df: pd.DataFrame
    irrigation_events: List[IrrigationEvent]
    total_et0_mm: float
    total_etc_pot_mm: float
    total_etc_act_mm: float
    total_rainfall_mm: float
    total_peff_mm: float
    total_net_irrigation_mm: float
    total_gross_irrigation_mm: float
    total_deep_percolation_mm: float
    total_surface_runoff_mm: float
    irrigation_event_count: int


class SeasonalSimulationRunner:
    """Orchestrates seasonal crop simulations and rotational water balances."""

    def __init__(
        self,
        latitude_deg: float = 24.469,
        elevation_m: float = 20.0,
        theta_fc: float = 0.30,
        theta_wp: float = 0.15,
        irrigation_efficiency: float = 0.70,
    ):
        self.latitude_deg = latitude_deg
        self.elevation_m = elevation_m
        self.theta_fc = theta_fc
        self.theta_wp = theta_wp
        self.irrigation_efficiency = irrigation_efficiency

        self.et0_calculator = FAO56ReferenceCalculator(latitude_deg, elevation_m)
        self.balance_engine = RootZoneBalanceEngine(
            theta_fc=theta_fc,
            theta_wp=theta_wp,
            irrigation_efficiency=irrigation_efficiency,
        )
        self.scheduler = IrrigationScheduler(application_efficiency=irrigation_efficiency)

    def run_single_crop_season(
        self,
        weather_df: pd.DataFrame,
        crop_id: str = "wheat",
        planting_date: Optional[str] = None,
        initial_depletion_fraction: float = 0.05,
    ) -> CropSeasonRunResult:
        """
        Execute simulation for a single crop season over its active growth calendar.
        """
        crop_spec = get_crop_specification(crop_id)
        cal = crop_spec.stages
        total_duration = cal.total_days

        # Determine planting date
        df_copy = weather_df.copy()
        df_copy["date"] = pd.to_datetime(df_copy["date"])
        min_date = df_copy["date"].min()

        if planting_date is None:
            # Anchor to first occurrence of default planting month/day in weather series
            cand_year = min_date.year
            cand_date = pd.Timestamp(cand_year, crop_spec.default_planting_month, crop_spec.default_planting_day)
            if cand_date < min_date:
                cand_date = pd.Timestamp(cand_year + 1, crop_spec.default_planting_month, crop_spec.default_planting_day)
            p_date = cand_date
        else:
            p_date = pd.to_datetime(planting_date)

        h_date = p_date + pd.Timedelta(days=total_duration)
        p_str = p_date.strftime("%Y-%m-%d")
        h_str = h_date.strftime("%Y-%m-%d")

        # Filter weather to season window
        season_weather = df_copy[(df_copy["date"] >= p_date) & (df_copy["date"] < h_date)].sort_values("date")
        if len(season_weather) < total_duration:
            raise ValueError(
                f"Insufficient weather records ({len(season_weather)}) for crop {crop_id} "
                f"requiring {total_duration} days from {p_str} to {h_str}."
            )

        daily_records = []
        irrigation_events = []

        # Initial depletion at planting
        initial_taw = 1000.0 * (self.theta_fc - self.theta_wp) * crop_spec.zr_ini_m
        dr_current = initial_depletion_fraction * initial_taw

        event_counter = 1

        for idx, row in season_weather.reset_index(drop=True).iterrows():
            d_str = row["date"].strftime("%Y-%m-%d")
            day_since = idx

            # 1. Dynamic crop stage, Kc, root depth
            stage, kc, zr, p_dep = calculate_dynamic_kc_and_depth(crop_spec, day_since)

            # 2. Reference ET0
            et0_res = self.et0_calculator.calculate(
                date_val=d_str,
                t_max=row["t_max_c"],
                t_min=row["t_min_c"],
                rs_mj=row["solar_radiation_mj_m2_day"],
                rh_mean=row.get("humidity_pct", 70.0),
                wind_speed=row.get("wind_speed_2m_m_s", 2.0),
            )
            et0_val = et0_res.et0_mm_day

            # 3. Effective precipitation (USDA-SCS)
            p_tot = row["rainfall_mm"]
            peff = calculate_effective_rainfall_usda(p_tot)

            # 4. Advance soil reservoir balance step
            step_res = self.balance_engine.step(
                date_str=d_str,
                dr_previous=dr_current,
                et0_mm=et0_val,
                rainfall_mm=p_tot,
                peff_mm=peff,
                kc=kc,
                root_depth_m=zr,
                p_depletion=p_dep,
                crop_id=crop_id,
                growth_stage=stage,
                day_since_planting=day_since,
                is_active_crop=True,
                trigger_irrigation_if_stressed=True,
            )

            # Log irrigation event if triggered
            if step_res.irrigation_net_mm > 0:
                irr_ev = self.scheduler.evaluate_and_schedule(
                    event_index=event_counter,
                    date_str=d_str,
                    crop_id=crop_id,
                    growth_stage=stage,
                    day_since_planting=day_since,
                    depletion_mm=step_res.dr_pre_irrigation_mm,
                    raw_mm=step_res.raw_mm,
                    taw_mm=step_res.taw_mm,
                    is_active_crop=True,
                )
                if irr_ev:
                    irrigation_events.append(irr_ev)
                    event_counter += 1

            dr_current = step_res.dr_end_mm

            daily_records.append({
                "date": d_str,
                "crop_id": crop_id,
                "growth_stage": stage,
                "day_since_planting": day_since,
                "et0_mm": et0_val,
                "kc": kc,
                "root_depth_m": zr,
                "etc_pot_mm": step_res.etc_potential_mm,
                "ks": step_res.ks,
                "etc_act_mm": step_res.etc_actual_mm,
                "rainfall_mm": p_tot,
                "peff_mm": peff,
                "dr_start_mm": step_res.dr_start_mm,
                "dr_pre_irr_mm": step_res.dr_pre_irrigation_mm,
                "irrigation_net_mm": step_res.irrigation_net_mm,
                "irrigation_gross_mm": step_res.irrigation_gross_mm,
                "deep_percolation_mm": step_res.deep_percolation_mm,
                "surface_runoff_mm": step_res.surface_runoff_mm,
                "dr_end_mm": step_res.dr_end_mm,
                "taw_mm": step_res.taw_mm,
                "raw_mm": step_res.raw_mm,
                "soil_status": step_res.soil_water_status,
                "alert_code": step_res.alert_code,
            })

        res_df = pd.DataFrame(daily_records)

        return CropSeasonRunResult(
            crop_id=crop_id,
            crop_name=crop_spec.name_en,
            planting_date=p_str,
            harvest_date=h_str,
            total_days=total_duration,
            df=res_df,
            irrigation_events=irrigation_events,
            total_et0_mm=round(res_df["et0_mm"].sum(), 2),
            total_etc_pot_mm=round(res_df["etc_pot_mm"].sum(), 2),
            total_etc_act_mm=round(res_df["etc_act_mm"].sum(), 2),
            total_rainfall_mm=round(res_df["rainfall_mm"].sum(), 2),
            total_peff_mm=round(res_df["peff_mm"].sum(), 2),
            total_net_irrigation_mm=round(res_df["irrigation_net_mm"].sum(), 2),
            total_gross_irrigation_mm=round(res_df["irrigation_gross_mm"].sum(), 2),
            total_deep_percolation_mm=round(res_df["deep_percolation_mm"].sum(), 2),
            total_surface_runoff_mm=round(res_df["surface_runoff_mm"].sum(), 2),
            irrigation_event_count=len(irrigation_events),
        )

    def plot_seasonal_trajectory(
        self,
        run_result: CropSeasonRunResult,
        output_path: Union[str, Path] = "outputs/seasonal_water_balance_curve.png",
    ):
        """
        Generate high-resolution publication-quality figure with:
          - Inverted rainfall hyetograph on twin axis (top-down blue bars)
          - Daily root-zone depletion (Dr) curve
          - Total Available Water (TAW) reference line
          - Readily Available Water (RAW) stress threshold line
          - Irrigation applied markers
          - Phenological growth stage shading
          - Non-overlapping legend
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        df = run_result.df.copy()
        df["date"] = pd.to_datetime(df["date"])

        fig, ax1 = plt.subplots(figsize=(13, 7))

        # 1. Twin axis for inverted rainfall hyetograph (top-down)
        ax2 = ax1.twinx()
        max_rain = max(df["rainfall_mm"].max(), 20.0)
        ax2.set_ylim(max_rain * 3.5, 0)  # Inverted Y-axis
        ax2.bar(
            df["date"],
            df["rainfall_mm"],
            width=0.8,
            color="#38bdf8",
            alpha=0.65,
            edgecolor="#0284c7",
            label="Daily Precipitation (Hyetograph)",
            zorder=2,
        )
        ax2.set_ylabel("Daily Precipitation (mm)", color="#0284c7", fontsize=11, labelpad=10)
        ax2.tick_params(axis="y", labelcolor="#0284c7")

        # 2. Main Axis: Root-Zone Depletion, TAW, RAW
        ax1.plot(
            df["date"],
            df["dr_end_mm"],
            label="Root-Zone Depletion (Dr)",
            color="#1e40af",
            lw=2.2,
            zorder=4,
        )
        ax1.plot(
            df["date"],
            df["raw_mm"],
            label="Readily Available Water (RAW Trigger)",
            color="#dc2626",
            linestyle="--",
            lw=1.8,
            zorder=3,
        )
        ax1.plot(
            df["date"],
            df["taw_mm"],
            label="Total Available Water (TAW Capacity)",
            color="#b45309",
            linestyle=":",
            lw=1.6,
            zorder=3,
        )

        # 3. Irrigation Applied Scatter Markers
        irr_df = df[df["irrigation_net_mm"] > 0]
        if not irr_df.empty:
            ax1.scatter(
                irr_df["date"],
                irr_df["dr_pre_irr_mm"],
                color="#16a34a",
                edgecolors="#14532d",
                s=90,
                zorder=6,
                label=f"Irrigation Applied ({len(irr_df)} events, Gross: {run_result.total_gross_irrigation_mm:.1f} mm)",
            )

        # 4. Phenological Stage Background Shading
        stages = df["growth_stage"].unique()
        stage_colors = {
            "initial": "#fef3c7",
            "development": "#dcfce7",
            "mid_season": "#e0f2fe",
            "late_season": "#fae8ff",
        }
        for stg in stages:
            stg_dates = df[df["growth_stage"] == stg]["date"]
            if not stg_dates.empty:
                ax1.axvspan(
                    stg_dates.min(),
                    stg_dates.max(),
                    color=stage_colors.get(stg, "#f1f5f9"),
                    alpha=0.35,
                    zorder=1,
                    label=f"Stage: {stg.capitalize().replace('_', ' ')}",
                )

        # Axis styling & Formatting
        ax1.set_xlabel("Date", fontsize=11, labelpad=8)
        ax1.set_ylabel("Soil Water Depth (mm)", color="#1e40af", fontsize=11, labelpad=8)
        ax1.set_ylim(-2, df["taw_mm"].max() * 1.15)
        ax1.grid(True, linestyle=":", alpha=0.55, zorder=0)
        ax1.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m-%d"))
        ax1.xaxis.set_major_locator(mdates.WeekdayLocator(interval=2))
        plt.setp(ax1.get_xticklabels(), rotation=25, ha="right")

        # Title
        crop_title = run_result.crop_name
        ax1.set_title(
            f"FAO-56 Seasonal Root-Zone Soil Water Balance: {crop_title}\n"
            f"Godagari Upazila (24.469°N, 88.330°E) | Season: {run_result.planting_date} to {run_result.harvest_date} ({run_result.total_days} Days)",
            fontsize=13,
            fontweight="bold",
            pad=15,
        )

        # Merge Legends cleanly without overlap (place outside top right or upper center)
        lines1, labels1 = ax1.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        # Deduplicate labels
        by_label = dict(zip(labels1 + labels2, lines1 + lines2))
        ax1.legend(
            by_label.values(),
            by_label.keys(),
            loc="upper center",
            bbox_to_anchor=(0.5, -0.18),
            ncol=3,
            frameon=True,
            fontsize=9.5,
        )

        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches="tight")
        plt.close()
        return output_path


def run_benchmark_wheat_simulation(
    weather_csv_path: Union[str, Path] = "data/processed/weather_processed_daily.csv",
    output_dir: Union[str, Path] = "data/simulation",
    figures_dir: Union[str, Path] = "outputs",
) -> CropSeasonRunResult:
    """Run benchmark single-season Rabi Wheat simulation for Godagari Upazila."""
    weather_df = pd.read_csv(weather_csv_path)
    runner = SeasonalSimulationRunner(
        latitude_deg=24.469,
        elevation_m=20.0,
        theta_fc=0.30,
        theta_wp=0.15,
        irrigation_efficiency=0.70,
    )
    # 2022-2023 Rabi Wheat Season (Nov 20, 2022 to Mar 10, 2023)
    res = runner.run_single_crop_season(
        weather_df=weather_df,
        crop_id="wheat",
        planting_date="2022-11-20",
    )

    out_p = Path(output_dir)
    out_p.mkdir(parents=True, exist_ok=True)
    res.df.to_csv(out_p / "wheat_seasonal_water_balance.csv", index=False)

    # Export irrigation ledger
    if res.irrigation_events:
        irr_records = [ev.__dict__ for ev in res.irrigation_events]
        pd.DataFrame(irr_records).to_csv(out_p / "wheat_irrigation_events_ledger.csv", index=False)

    # Plot figure
    fig_path = Path(figures_dir) / "fao56_seasonal_wheat_curve.png"
    runner.plot_seasonal_trajectory(res, fig_path)

    return res


def run_rotational_cycle_simulation(
    weather_csv_path: Union[str, Path] = "data/processed/weather_processed_daily.csv",
    output_dir: Union[str, Path] = "data/simulation",
    figures_dir: Union[str, Path] = "outputs",
) -> Dict[str, CropSeasonRunResult]:
    """
    Run multi-crop rotational sequences across an annual agricultural cycle in Godagari:
      Sequence A: Sustainable Low-Water Rotation (Wheat -> Aus Rice -> T. Aman Rice)
      Sequence B: Conventional Groundwater-Intensive Rotation (Boro Rice -> Fallow -> T. Aman Rice)
    """
    weather_df = pd.read_csv(weather_csv_path)
    runner = SeasonalSimulationRunner(
        latitude_deg=24.469,
        elevation_m=20.0,
        theta_fc=0.30,
        theta_wp=0.15,
        irrigation_efficiency=0.70,
    )

    results = {}

    # Sequence A: Wheat -> Aus Rice -> Aman Rice (2022-2023 Agricultural Year)
    res_wheat = runner.run_single_crop_season(weather_df, crop_id="wheat", planting_date="2022-11-20")
    res_aus = runner.run_single_crop_season(weather_df, crop_id="aus_rice", planting_date="2023-04-20")
    res_aman = runner.run_single_crop_season(weather_df, crop_id="aman_rice", planting_date="2023-07-25")

    # Sequence B: Boro Rice -> Aman Rice (Conventional)
    res_boro = runner.run_single_crop_season(weather_df, crop_id="boro_rice", planting_date="2023-01-15")

    results["wheat_rabi"] = res_wheat
    results["aus_kharif1"] = res_aus
    results["aman_kharif2"] = res_aman
    results["boro_rabi"] = res_boro

    out_p = Path(output_dir)
    out_p.mkdir(parents=True, exist_ok=True)
    fig_p = Path(figures_dir)
    fig_p.mkdir(parents=True, exist_ok=True)

    # Save CSVs
    res_wheat.df.to_csv(out_p / "rotation_wheat_2022_2023.csv", index=False)
    res_aus.df.to_csv(out_p / "rotation_aus_2023.csv", index=False)
    res_aman.df.to_csv(out_p / "rotation_aman_2023.csv", index=False)
    res_boro.df.to_csv(out_p / "rotation_boro_2023.csv", index=False)

    # Plot curves
    runner.plot_seasonal_trajectory(res_wheat, fig_p / "rotation_wheat_curve.png")
    runner.plot_seasonal_trajectory(res_boro, fig_p / "rotation_boro_curve.png")
    runner.plot_seasonal_trajectory(res_aman, fig_p / "rotation_aman_curve.png")

    return results
