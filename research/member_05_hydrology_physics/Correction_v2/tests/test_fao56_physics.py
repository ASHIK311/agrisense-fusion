"""
Comprehensive Test Suite 1: FAO-56 Physics and Solar Geometry
"""

import math
# import pytest
from src.physics.solar_geometry import (
    calculate_day_of_year,
    calculate_inverse_earth_sun_distance,
    calculate_solar_declination,
    calculate_sunset_hour_angle,
    calculate_daylight_hours,
    calculate_extraterrestrial_radiation,
    calculate_clear_sky_radiation,
)
from src.physics.fao56 import (
    calculate_atmospheric_pressure,
    calculate_psychrometric_constant,
    calculate_saturation_vapor_pressure,
    calculate_mean_saturation_vapor_pressure,
    calculate_actual_vapor_pressure,
    calculate_slope_vapor_pressure_curve,
    convert_wind_height,
    calculate_reference_et0,
)
from src.validation.benchmark_fao56 import run_fao56_textbook_benchmarks


def test_fao56_textbook_worked_examples():
    """Test 1: FAO-56 official worked benchmark examples."""
    benchmarks = run_fao56_textbook_benchmarks()
    assert len(benchmarks) == 4
    for b in benchmarks:
        assert b.passed, f"Benchmark {b.test_id} failed: target={b.fao56_reference_target}, computed={b.computed_value}"


def test_solar_geometry_across_days_of_year():
    """Test 2: Solar declination and inverse distance across solstice and equinox."""
    # Equinox (Day ~80): Declination near 0 radians
    delta_eq = calculate_solar_declination(80)
    assert abs(delta_eq) < 0.05, f"Equinox declination should be near 0, got {delta_eq}"

    # Summer Solstice (Day 172): Declination near +0.409 rad (~23.45 deg)
    delta_solstice = calculate_solar_declination(172)
    assert abs(delta_solstice - 0.409) < 0.02, f"Summer solstice should be ~0.409 rad, got {delta_solstice}"

    # Winter Solstice (Day 355): Declination near -0.409 rad
    delta_winter = calculate_solar_declination(355)
    assert abs(delta_winter - (-0.409)) < 0.02, f"Winter solstice should be ~-0.409 rad, got {delta_winter}"

    # Perihelion (Jan 3, Day 3): dr near maximum (> 1.03)
    dr_peri = calculate_inverse_earth_sun_distance(3)
    assert dr_peri > 1.03, f"dr near perihelion should be > 1.03, got {dr_peri}"

    # Aphelion (July 4, Day 185): dr near minimum (< 0.97)
    dr_aphelion = calculate_inverse_earth_sun_distance(185)
    assert dr_aphelion < 0.97, f"dr near aphelion should be < 0.97, got {dr_aphelion}"


def test_seasonal_variation_clear_sky_radiation():
    """Test 3: Rso varies dynamically across the year at Godagari (24.469°N)."""
    rso_summer = calculate_clear_sky_radiation(calculate_extraterrestrial_radiation(24.469, 172), 20.0)
    rso_winter = calculate_clear_sky_radiation(calculate_extraterrestrial_radiation(24.469, 355), 20.0)

    # Rso in summer must be significantly higher than winter
    assert rso_summer > 29.0, f"Summer Rso should exceed 29 MJ/m2/d, got {rso_summer}"
    assert rso_winter < 19.5, f"Winter Rso should be below 19.5 MJ/m2/d, got {rso_winter}"
    assert rso_summer > rso_winter * 1.5, "Summer Rso must be > 1.5x winter Rso"


def test_low_energy_winter_conditions():
    """Test 4: Low-energy foggy winter conditions produce scientifically justified low ET0 without clamping."""
    # Jan 15 in Godagari: Low solar, dense fog (98% RH), light calm wind
    res = calculate_reference_et0(
        date_val=15,
        t_max=13.0,
        t_min=7.0,
        rs_mj=3.5,
        rh_mean=98.0,
        wind_speed=0.5,
        latitude_deg=24.469,
        elevation_m=20.0,
    )
    # ET0 should be very low (between 0.30 and 0.65 mm/day), not clamped at 0.5
    assert 0.20 <= res.et0_mm_day <= 0.70, f"Expected realistic low ET0, got {res.et0_mm_day}"
    assert res.vpd_kpa < 0.1, "VPD in dense fog should be near 0"


def test_high_temperature_heatwave_conditions():
    """Test 5: April extreme heatwave conditions in Barind tract."""
    # April 20: Tmax 42.5 C, Tmin 28.0 C, RH 30%, Wind 3.5 m/s, Solar 25 MJ/m2/d
    res = calculate_reference_et0(
        date_val=110,
        t_max=42.5,
        t_min=28.0,
        rs_mj=25.0,
        rh_mean=30.0,
        wind_speed=3.5,
        latitude_deg=24.469,
        elevation_m=20.0,
    )
    assert res.et0_mm_day >= 8.5, f"Heatwave ET0 should be high (>8.5 mm/d), got {res.et0_mm_day}"
    assert res.vpd_kpa > 3.0, "VPD under extreme heat should be > 3.0 kPa"


def test_missing_weather_variables_fallback():
    """Test 6: Graceful handling when optional RHmax/RHmin are missing."""
    res = calculate_reference_et0(
        date_val=100,
        t_max=30.0,
        t_min=20.0,
        rs_mj=18.0,
        rh_mean=65.0,  # Only mean provided
        wind_speed=2.0,
        latitude_deg=24.469,
    )
    assert res.et0_mm_day > 0, "ET0 should calculate successfully with mean RH"
    assert res.ea_kpa > 0


def test_wind_height_unit_conversion():
    """Test 7: 10m to 2m wind log profile conversion factor (~0.748)."""
    u10 = 10.0
    u2 = convert_wind_height(u10, z_m=10.0)
    assert abs(u2 - 7.48) < 0.05, f"Expected ~7.48 m/s, got {u2}"

    # Direct 2m wind should not be scaled
    u2_direct = convert_wind_height(5.0, z_m=2.0)
    assert abs(u2_direct - 5.0) < 0.01


def test_et0_numerical_stability():
    """Test 8: Numerical stability against division by zero and extreme limits."""
    # Zero wind, freezing temperature
    res_cold = calculate_reference_et0(
        date_val=1,
        t_max=0.5,
        t_min=-2.0,
        rs_mj=2.0,
        rh_mean=100.0,
        wind_speed=0.0,
        latitude_deg=24.469,
    )
    assert res_cold.et0_mm_day >= 0.0
    assert not math.isnan(res_cold.et0_mm_day)
