"""
Automated Test Runner for Member 5 Correction V2
Executes all 22 required validation test cases using Python standard library.
"""

import sys
import time
from pathlib import Path

# Add Correction_v2 root to path
base = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base))

# Import test functions
from tests.test_fao56_physics import (
    test_fao56_textbook_worked_examples,
    test_solar_geometry_across_days_of_year,
    test_seasonal_variation_clear_sky_radiation,
    test_low_energy_winter_conditions,
    test_high_temperature_heatwave_conditions,
    test_missing_weather_variables_fallback,
    test_wind_height_unit_conversion,
    test_et0_numerical_stability,
)

from tests.test_crop_and_water_balance import (
    test_etc_scaling_and_water_stress_ks,
    test_effective_rainfall_bounds_and_continuity,
    test_root_zone_water_balance_mass_conservation,
    test_irrigation_application_efficiency,
    test_irrigation_trigger_logic_and_post_depletion,
    test_crop_growth_stage_and_boundaries,
    test_wheat_seasonal_restrictions_no_monsoon_irrigation,
    test_rice_phenology_scheduling,
    test_multi_season_rotation_simulation,
)

from tests.test_integration_and_system import (
    test_location_configurability_nationwide,
    test_raw_weather_caching_and_persistence,
    test_api_timeout_and_retry_configuration,
    test_deterministic_simulation_reproducibility,
    test_python_vs_javascript_physics_comparison,
)


def run_all_tests():
    test_cases = [
        ("TEST-01", "FAO-56 Official Textbook Worked Examples", test_fao56_textbook_worked_examples),
        ("TEST-02", "Solar Geometry & Declination Across Solstices", test_solar_geometry_across_days_of_year),
        ("TEST-03", "Seasonal Variation in Clear-Sky Radiation Rso", test_seasonal_variation_clear_sky_radiation),
        ("TEST-04", "Low-Energy Winter Cold Fog Conditions (Zero Clamping)", test_low_energy_winter_conditions),
        ("TEST-05", "Barind April Extreme Heatwave Conditions", test_high_temperature_heatwave_conditions),
        ("TEST-06", "Graceful Missing Meteorological Variable Handling", test_missing_weather_variables_fallback),
        ("TEST-07", "Wind Speed 10m to 2m Logarithmic Conversion", test_wind_height_unit_conversion),
        ("TEST-08", "ET0 Mathematical and Numerical Stability", test_et0_numerical_stability),
        ("TEST-09", "ETc = Kc * ET0 Scaling and Water Stress Ks", test_etc_scaling_and_water_stress_ks),
        ("TEST-10", "Effective Rainfall Bounds & Smooth Continuity", test_effective_rainfall_bounds_and_continuity),
        ("TEST-11", "Root-Zone Water Balance Mass Conservation", test_root_zone_water_balance_mass_conservation),
        ("TEST-12", "Irrigation Application Efficiency Accounting (70%)", test_irrigation_application_efficiency),
        ("TEST-13", "Irrigation Threshold Trigger and Depletion Reset", test_irrigation_trigger_logic_and_post_depletion),
        ("TEST-14", "Crop Growth Stages and Phenological Boundaries", test_crop_growth_stage_and_boundaries),
        ("TEST-15", "Wheat Seasonal Restrictions (No Monsoon Irrigation)", test_wheat_seasonal_restrictions_no_monsoon_irrigation),
        ("TEST-16", "Aman, Boro, and Aus Rice Phenology Calendars", test_rice_phenology_scheduling),
        ("TEST-17", "Multi-Season Rotational Simulation Runner", lambda: test_multi_season_rotation_simulation(base)),
        ("TEST-18", "Nationwide Upazila Profile Parameterization", test_location_configurability_nationwide),
        ("TEST-19", "Raw Weather JSON and Processed CSV Caching", test_raw_weather_caching_and_persistence),
        ("TEST-20", "NASA POWER API Timeout & Retry Configurations", test_api_timeout_and_retry_configuration),
        ("TEST-21", "Deterministic 100% Simulation Reproducibility", test_deterministic_simulation_reproducibility),
        ("TEST-22", "Cross-Platform Validation: Python vs Node.js Backend", test_python_vs_javascript_physics_comparison),
    ]

    print("=" * 90)
    print("MEMBER 5 CORRECTION V2 — AUTOMATED VERIFICATION TEST SUITE (22 TESTS)")
    print("=" * 90)

    passed_count = 0
    failed_count = 0
    results = []

    start_time = time.time()

    for test_id, name, func in test_cases:
        t0 = time.time()
        try:
            func()
            elapsed_ms = (time.time() - t0) * 1000.0
            print(f"[PASS] {test_id}: {name} ({elapsed_ms:.1f} ms)")
            results.append((test_id, name, "PASS", elapsed_ms, "All assertions satisfied."))
            passed_count += 1
        except Exception as e:
            elapsed_ms = (time.time() - t0) * 1000.0
            print(f"[FAIL] {test_id}: {name} ({elapsed_ms:.1f} ms) -> Error: {e}")
            results.append((test_id, name, "FAIL", elapsed_ms, str(e)))
            failed_count += 1

    total_time = (time.time() - start_time) * 1000.0
    print("=" * 90)
    print(f"TEST SUMMARY: {passed_count}/{len(test_cases)} Passed | {failed_count} Failed | Total Time: {total_time:.1f} ms")
    print("=" * 90)

    # Export markdown report
    report_file = base / "reports" / "TEST_RESULTS.md"
    report_file.parent.mkdir(parents=True, exist_ok=True)
    with open(report_file, "w", encoding="utf-8") as f:
        f.write("# Automated Test Results — Member 5 Correction V2\n\n")
        f.write(f"**Execution Timestamp:** {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}  \n")
        f.write(f"**Total Tests Executed:** {len(test_cases)}  \n")
        f.write(f"**Total Passed:** {passed_count}  \n")
        f.write(f"**Total Failed:** {failed_count}  \n")
        f.write(f"**Overall Test Verdict:** **{'ALL TESTS PASS' if failed_count == 0 else 'TEST FAILURES DETECTED'}**  \n\n")
        f.write("---\n\n")
        f.write("## Test Execution Table\n\n")
        f.write("| Test ID | Test Category & Description | Result | Elapsed Time | Forensic Observations |\n")
        f.write("|:---:|---|:---:|:---:|---|\n")
        for tid, tname, status, el, obs in results:
            badge = "**PASS**" if status == "PASS" else "**FAIL**"
            f.write(f"| {tid} | {tname} | {badge} | {el:.1f} ms | {obs} |\n")

    return failed_count == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
