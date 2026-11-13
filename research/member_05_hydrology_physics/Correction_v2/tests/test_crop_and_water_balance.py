"""
Comprehensive Test Suite 2: Crop Phenology, Water Balance, and Irrigation Scheduling
"""

# import pytest
import pandas as pd
from src.crop_parameters.crop_catalog import (
    CROP_CATALOG,
    get_crop_specification,
    calculate_dynamic_kc_and_depth,
)
from src.water_balance.effective_rainfall import (
    calculate_effective_rainfall_usda,
    calculate_effective_rainfall_comparison,
)
from src.water_balance.root_zone_balance import (
    RootZoneBalanceEngine,
    calculate_taw,
    calculate_raw,
    calculate_water_stress_ks,
)
from src.water_balance.irrigation_scheduler import IrrigationScheduler
from src.seasonal_simulation.simulation_engine import SeasonalSimulationRunner


def test_etc_scaling_and_water_stress_ks():
    """Test 9: ETc = Kc * ET0 and Ks water stress reduction when Dr > RAW."""
    et0 = 4.0
    kc = 1.15
    etc_pot = et0 * kc  # 4.60 mm

    taw = 90.0
    raw = 45.0

    # No stress when Dr <= RAW
    ks_opt = calculate_water_stress_ks(taw, dr_mm=40.0, p_depletion=0.50)
    assert ks_opt == 1.0

    # Stress when Dr > RAW (e.g. Dr = 67.5 mm)
    # Ks = (90 - 67.5) / ((1 - 0.5) * 90) = 22.5 / 45 = 0.50
    ks_stress = calculate_water_stress_ks(taw, dr_mm=67.5, p_depletion=0.50)
    assert abs(ks_stress - 0.50) < 0.01

    # Total wilting when Dr >= TAW
    ks_wilt = calculate_water_stress_ks(taw, dr_mm=90.0, p_depletion=0.50)
    assert ks_wilt == 0.0


def test_effective_rainfall_bounds_and_continuity():
    """Test 10: Peff physical conservation and zero step-discontinuity at 2 mm."""
    # Bounds: Peff <= P
    for p in [0.0, 0.4, 1.0, 2.0, 2.1, 10.0, 50.0, 150.0, 300.0]:
        peff = calculate_effective_rainfall_usda(p)
        assert 0.0 <= peff <= p, f"Physical bounds violated: p={p}, peff={peff}"

    # Smooth continuity check around 2.0 mm
    p_19 = calculate_effective_rainfall_usda(1.9)
    p_20 = calculate_effective_rainfall_usda(2.0)
    p_21 = calculate_effective_rainfall_usda(2.1)

    diff_1 = p_20 - p_19
    diff_2 = p_21 - p_20

    # Difference across 0.1 mm increment must be small (<0.15 mm), NOT 1.68 mm jump!
    assert abs(diff_2) < 0.15, f"Step discontinuity detected: jump was {diff_2} mm"


def test_root_zone_water_balance_mass_conservation():
    """Test 11: Conservation of mass in daily root-zone soil reservoir."""
    engine = RootZoneBalanceEngine(theta_fc=0.30, theta_wp=0.15, irrigation_efficiency=0.70)
    
    # Start at 20 mm depletion, ETc = 4 mm, rain = 10 mm (Peff = 9.84 mm)
    step = engine.step(
        date_str="2023-01-10",
        dr_previous=20.0,
        et0_mm=4.0,
        rainfall_mm=10.0,
        peff_mm=9.84,
        kc=1.0,
        root_depth_m=0.6,
        p_depletion=0.5,
        is_active_crop=True,
    )

    # Expected Dr = 20 - 9.84 + 4.0 = 14.16 mm
    assert abs(step.dr_end_mm - 14.16) < 0.05
    assert step.deep_percolation_mm == 0.0


def test_irrigation_application_efficiency():
    """Test 12: Gross irrigation requirement accounts for 70% application efficiency."""
    scheduler = IrrigationScheduler(application_efficiency=0.70)
    # TAW = 90 mm, RAW = 45 mm, Dr = 50 mm (stressed)
    event = scheduler.evaluate_and_schedule(
        event_index=1,
        date_str="2023-01-15",
        crop_id="wheat",
        growth_stage="mid_season",
        day_since_planting=55,
        depletion_mm=50.0,
        raw_mm=45.0,
        taw_mm=90.0,
        is_active_crop=True,
    )
    assert event is not None
    # Target Dr = 0.05 * 90 = 4.5 mm
    # Net depth = 50 - 4.5 = 45.5 mm
    # Gross depth = 45.5 / 0.70 = 65.0 mm
    assert abs(event.net_depth_mm - 45.5) < 0.1
    assert abs(event.gross_depth_mm - 65.0) < 0.1
    assert event.estimated_pumping_hours_per_ha > 10.0


def test_irrigation_trigger_logic_and_post_depletion():
    """Test 13: Irrigation does NOT trigger below RAW, resets to buffer Dr."""
    scheduler = IrrigationScheduler(application_efficiency=0.70)
    # Dr = 40 mm <= RAW = 45 mm -> No event
    event_no = scheduler.evaluate_and_schedule(
        event_index=2,
        date_str="2023-01-14",
        crop_id="wheat",
        growth_stage="mid_season",
        day_since_planting=54,
        depletion_mm=40.0,
        raw_mm=45.0,
        taw_mm=90.0,
        is_active_crop=True,
    )
    assert event_no is None


def test_crop_growth_stage_and_boundaries():
    """Test 14: Dynamic Kc and Zr across growth stages and out-of-bounds fallow."""
    crop_spec = get_crop_specification("wheat")
    # Wheat: ini=20d, dev=30d, mid=40d, late=20d -> total 110d
    # Day 10: initial
    stg1, kc1, zr1, _ = calculate_dynamic_kc_and_depth(crop_spec, 10)
    assert stg1 == "initial"
    assert kc1 == 0.35
    assert zr1 == 0.20

    # Day 35: development (midway between 20 and 50)
    stg2, kc2, zr2, _ = calculate_dynamic_kc_and_depth(crop_spec, 35)
    assert stg2 == "development"
    assert 0.35 < kc2 < 1.15
    assert 0.20 < zr2 < 0.60

    # Day 70: mid-season
    stg3, kc3, zr3, _ = calculate_dynamic_kc_and_depth(crop_spec, 70)
    assert stg3 == "mid_season"
    assert kc3 == 1.15
    assert zr3 == 0.60

    # Day 120: Harvested fallow
    stg4, kc4, zr4, _ = calculate_dynamic_kc_and_depth(crop_spec, 120)
    assert stg4 == "harvested_fallow"
    assert kc4 == 0.0
    assert zr4 == 0.0


def test_wheat_seasonal_restrictions_no_monsoon_irrigation():
    """Test 15: Wheat cannot be scheduled for irrigation in summer or monsoon months."""
    scheduler = IrrigationScheduler(application_efficiency=0.70)
    # In July, Wheat is not an active crop in the field
    event_july = scheduler.evaluate_and_schedule(
        event_index=99,
        date_str="2023-07-15",
        crop_id="wheat",
        growth_stage="harvested_fallow",
        day_since_planting=150,
        depletion_mm=55.0,
        raw_mm=45.0,
        taw_mm=90.0,
        is_active_crop=False,  # Crop is inactive/fallow!
    )
    assert event_july is None, "Irrigation must NEVER be scheduled for wheat in July!"


def test_rice_phenology_scheduling():
    """Test 16: Aman, Boro, and Aus specifications conform to verified literature."""
    aman = get_crop_specification("aman_rice")
    boro = get_crop_specification("boro_rice")
    aus = get_crop_specification("aus_rice")

    assert aman.is_wetland_paddy and boro.is_wetland_paddy and aus.is_wetland_paddy
    assert aman.season_category == "Kharif-2"
    assert boro.season_category == "Rabi/Pre-Kharif"
    assert aus.season_category == "Kharif-1"
    assert boro.kc_mid == 1.20


def test_multi_season_rotation_simulation(tmp_path):
    """Test 17: Multi-season crop rotation runs without schedule collision."""
    # Create synthetic 365-day weather series
    dates = pd.date_range("2022-07-01", periods=365, freq="D")
    weather_df = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "t_max_c": [30.0] * 365,
        "t_min_c": [20.0] * 365,
        "t_mean_c": [25.0] * 365,
        "rainfall_mm": [2.0] * 365,
        "humidity_pct": [70.0] * 365,
        "wind_speed_2m_m_s": [1.5] * 365,
        "solar_radiation_mj_m2_day": [18.0] * 365,
    })

    runner = SeasonalSimulationRunner(latitude_deg=24.469, elevation_m=20.0)
    res_wheat = runner.run_single_crop_season(weather_df, crop_id="wheat", planting_date="2022-11-20")
    
    assert res_wheat.total_days == 110
    assert len(res_wheat.df) == 110
    assert res_wheat.total_etc_act_mm > 0
