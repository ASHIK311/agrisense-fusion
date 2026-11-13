"""
Comprehensive Automated Test Suite for Member 4 Correction & Expansion
NASA Space Apps Challenge 2026: Field Shift (AgriSense Fusion)
Member 4 Subsystem: Bangladesh Crop Intelligence & Agronomy System
"""

import unittest
import os
import sys
import glob
import pandas as pd
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_REF = os.path.join(BASE_DIR, "data", "reference")
DATA_PROC = os.path.join(BASE_DIR, "data", "processed")
DATA_DER = os.path.join(BASE_DIR, "data", "derived")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")


class TestMember4CorrectionV2(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print(f"\n=======================================================")
        print(f"RUNNING AUTOMATED TEST SUITE: MEMBER 4 CORRECTION V2")
        print(f"Workspace: {BASE_DIR}")
        print(f"=======================================================\n")

    # TEST 1: Admin identifier uniqueness
    def test_01_admin_identifier_uniqueness(self):
        admin_path = os.path.join(DATA_REF, "bangladesh_admin_reference.csv")
        self.assertTrue(os.path.exists(admin_path), "bangladesh_admin_reference.csv missing")
        df = pd.read_csv(admin_path)
        self.assertEqual(len(df), 466, f"Expected 466 upazilas, found {len(df)}")
        self.assertEqual(df["upazila_code"].nunique(), 466, "Upazila codes must be strictly unique")

    # TEST 2: Administrative hierarchy integrity
    def test_02_admin_hierarchy_integrity(self):
        admin_path = os.path.join(DATA_REF, "bangladesh_admin_reference.csv")
        df = pd.read_csv(admin_path)
        divisions = df["division_name"].unique().tolist()
        self.assertEqual(len(divisions), 8, f"Expected exactly 8 divisions, found {len(divisions)}")
        districts = df["district_name"].unique().tolist()
        self.assertEqual(len(districts), 64, f"Expected exactly 64 districts, found {len(districts)}")

    # TEST 3: Coordinate bounds validity
    def test_03_coordinate_bounds_validity(self):
        coords_path = os.path.join(DATA_REF, "upazila_coordinate_reference.csv")
        self.assertTrue(os.path.exists(coords_path), "upazila_coordinate_reference.csv missing")
        df = pd.read_csv(coords_path)
        self.assertEqual(len(df), 466, f"Expected 466 coordinate rows, found {len(df)}")
        # Bangladesh bounding box: Lat 20.5 to 26.7 N, Lon 88.0 to 92.7 E
        self.assertTrue((df["latitude_wgs84"] >= 20.5).all() and (df["latitude_wgs84"] <= 26.7).all(), "Latitudes out of Bangladesh bounds")
        self.assertTrue((df["longitude_wgs84"] >= 88.0).all() and (df["longitude_wgs84"] <= 92.7).all(), "Longitudes out of Bangladesh bounds")
        self.assertTrue((df["utm_easting_m"] > 0).all(), "UTM Easting must be positive")
        self.assertTrue((df["utm_northing_m"] > 0).all(), "UTM Northing must be positive")
        self.assertTrue((df["point_in_polygon_verified"] == True).all(), "All centroids must be verified inside polygon")

    # TEST 4: National geographic coverage
    def test_04_national_geographic_coverage(self):
        unmatched_report = os.path.join(REPORTS_DIR, "unmatched_upazila_report.csv")
        self.assertTrue(os.path.exists(unmatched_report), "unmatched_upazila_report.csv missing")
        df_unmatched = pd.read_csv(unmatched_report)
        self.assertEqual(len(df_unmatched), 0, f"Expected 0 unmatched upazilas, found {len(df_unmatched)}")

    # TEST 5: Climate date continuity
    def test_05_climate_date_continuity(self):
        clim_path = os.path.join(DATA_PROC, "national_upazila_climate_monthly.csv")
        self.assertTrue(os.path.exists(clim_path), "national_upazila_climate_monthly.csv missing")
        df = pd.read_csv(clim_path)
        self.assertEqual(len(df), 27960, f"Expected 27,960 rows (466 upz * 60 months), found {len(df)}")
        # Check every upazila has exactly 60 months
        counts = df.groupby("upazila_code")["date"].count()
        self.assertTrue((counts == 60).all(), "Every upazila must have exactly 60 continuous months")

    # TEST 6: Climate parameter unit validation
    def test_06_climate_parameter_units(self):
        clim_path = os.path.join(DATA_PROC, "national_upazila_climate_monthly.csv")
        df = pd.read_csv(clim_path)
        # Daily rate vs monthly total check: monthly_total = daily_rate * days_in_month
        expected_monthly = df["prectotcorr_daily_rate_mm_per_day"] * df["days_in_month"]
        np.testing.assert_allclose(df["precipitation_monthly_total_mm"], expected_monthly, rtol=1e-3, atol=1e-3)
        self.assertTrue((df["precipitation_monthly_total_mm"] >= 0).all(), "Precipitation must be non-negative")
        self.assertTrue((df["t2m_min_degc"] <= df["t2m_max_degc"]).all(), "Tmin must not exceed Tmax")

    # TEST 7: Missing value handling
    def test_07_missing_value_handling(self):
        files_to_check = [
            os.path.join(DATA_PROC, "national_crop_suitability.csv"),
            os.path.join(DATA_PROC, "upazila_crop_rankings.csv"),
            os.path.join(DATA_PROC, "daily_et0_national.csv"),
            os.path.join(DATA_PROC, "effective_rainfall_national.csv"),
            os.path.join(DATA_PROC, "net_irrigation_requirement.csv"),
            os.path.join(DATA_PROC, "national_crop_calendar.csv"),
            os.path.join(DATA_PROC, "national_crop_rotation_recommendations.csv")
        ]
        for f in files_to_check:
            self.assertTrue(os.path.exists(f), f"File {f} missing")
            df = pd.read_csv(f)
            # Upazila identifiers must never be null
            self.assertFalse(df["upazila_name"].isnull().any(), f"Null upazila_name found in {os.path.basename(f)}")

    # TEST 8: ET0 FAO-56 bounds check
    def test_08_et0_fao56_bounds(self):
        et0_path = os.path.join(DATA_PROC, "daily_et0_national.csv")
        df = pd.read_csv(et0_path)
        # Daily ET0 in Bangladesh climate must fall within 1.0 to 9.0 mm/day
        self.assertTrue((df["et0_daily_mean_mm_per_day"] >= 1.0).all(), "ET0 daily rate below physical Bangladesh lower bound")
        self.assertTrue((df["et0_daily_mean_mm_per_day"] <= 9.0).all(), "ET0 daily rate above physical Bangladesh upper bound")

    # TEST 9: ETc = Kc * ET0 arithmetic exactness
    def test_09_etc_arithmetic_exactness(self):
        etc_path = os.path.join(DATA_PROC, "daily_etc_national.csv")
        et0_path = os.path.join(DATA_PROC, "daily_et0_national.csv")
        df_etc = pd.read_csv(etc_path)
        df_et0 = pd.read_csv(et0_path)
        self.assertEqual(len(df_etc), 58250, f"Expected 58,250 rows (466 upz * 5 crops * 25 season-months), found {len(df_etc)}")
        
        merged = df_etc.merge(df_et0[["upazila_code", "year", "month", "et0_daily_mean_mm_per_day"]], on=["upazila_code", "year", "month"])
        expected_etc = (merged["et0_daily_mean_mm_per_day"] * merged["kc_value"]).round(2)
        np.testing.assert_allclose(merged["etc_daily_mm_per_day"], expected_etc, atol=0.02)

    # TEST 10: Effective rainfall bounds (0 <= Peff <= P)
    def test_10_effective_rainfall_bounds(self):
        peff_path = os.path.join(DATA_PROC, "effective_rainfall_national.csv")
        df = pd.read_csv(peff_path)
        self.assertTrue((df["effective_rainfall_usda_scs_mm"] >= 0).all(), "Effective rainfall cannot be negative")
        self.assertTrue((df["effective_rainfall_usda_scs_mm"] <= df["precipitation_total_mm"] + 1e-4).all(),
                        "Effective rainfall cannot exceed total precipitation")

    # TEST 11: Net Irrigation Requirement bounds
    def test_11_net_irrigation_requirement_bounds(self):
        iwr_path = os.path.join(DATA_PROC, "net_irrigation_requirement.csv")
        df = pd.read_csv(iwr_path)
        self.assertTrue((df["net_irrigation_requirement_mm"] >= 0).all(), "Net IWR cannot be negative")
        # In rainy monsoon months for Aman, Net IWR should often be 0 or low
        aman_jul = df[(df["crop"] == "Aman Rice") & (df["month"] == 7)]
        self.assertTrue((aman_jul["net_irrigation_requirement_mm"] == 0).mean() > 0.8,
                        "Aman in July should have 0 Net IWR across most upazilas due to monsoon rainfall")
        # In dry winter months for Boro, Net IWR should be high (mean > 100 mm in March)
        boro_mar = df[(df["crop"] == "Boro Rice") & (df["month"] == 3)]
        self.assertTrue(boro_mar["net_irrigation_requirement_mm"].mean() > 100.0,
                        "Boro in March must require substantial irrigation (mean > 100 mm)")

    # TEST 12: Root-zone water balance consistency
    def test_12_root_zone_water_balance(self):
        rz_path = os.path.join(DATA_PROC, "root_zone_water_balance.csv")
        df = pd.read_csv(rz_path)
        self.assertTrue((df["readily_available_water_raw_mm"] <= df["total_available_water_taw_mm"]).all(),
                        "RAW must be less than or equal to TAW")

    # TEST 13: Crop calendar weather linkage
    def test_13_crop_calendar_weather_linkage(self):
        link_path = os.path.join(DATA_PROC, "crop_calendar_weather_linkage.csv")
        df = pd.read_csv(link_path)
        self.assertTrue(len(df) > 0, "crop_calendar_weather_linkage.csv must not be empty")
        self.assertFalse(df["mean_season_temp_degc"].isnull().any(), "Weather temperature linkage contains unjoined nulls")
        self.assertFalse(df["total_season_rainfall_mm"].isnull().any(), "Weather rainfall linkage contains unjoined nulls")

    # TEST 14: Suitability formula reproduction (Godagari)
    def test_14_suitability_godagari_reproduction(self):
        suit_path = os.path.join(DATA_PROC, "national_crop_suitability.csv")
        df = pd.read_csv(suit_path)
        godagari = df[df["upazila_name"].str.lower() == "godagari"]
        self.assertEqual(len(godagari), 5, "Godagari must have exactly 5 crops evaluated")
        # Check exact audit scores using crop_display_name
        scores = dict(zip(godagari["crop_display_name"], godagari["suitability_percentage"]))
        self.assertAlmostEqual(scores["Aman Rice"], 78.92, delta=0.05, msg="Godagari Aman Rice score mismatch")
        self.assertAlmostEqual(scores["Maize"], 73.44, delta=0.05, msg="Godagari Maize score mismatch")
        self.assertAlmostEqual(scores["Wheat"], 57.41, delta=0.05, msg="Godagari Wheat score mismatch")
        self.assertAlmostEqual(scores["Aus Rice"], 40.98, delta=0.05, msg="Godagari Aus Rice score mismatch")
        self.assertAlmostEqual(scores["Boro Rice"], 40.51, delta=0.05, msg="Godagari Boro Rice score mismatch")

    # TEST 15: Crop rotation timing turnaround feasibility
    def test_15_rotation_timing_turnaround(self):
        rot_path = os.path.join(DATA_PROC, "national_crop_rotation_recommendations.csv")
        df = pd.read_csv(rot_path)
        self.assertEqual(len(df), 466, f"Expected 466 rotation recommendations, found {len(df)}")
        self.assertTrue(df["turnaround_feasibility"].str.contains("12-15 days").all(),
                        "All recommended rotations must have feasible turnaround windows verified")

    # TEST 16: Yield chronological validation metrics
    def test_16_yield_model_benchmarking(self):
        comp_path = os.path.join(DATA_PROC, "yield_model_comparison.csv")
        df = pd.read_csv(comp_path)
        # All ML models should have R2 < 0 on chronological holdout
        ml_models = df[df["model_name"] != "Last Training Year Baseline (2011)"]
        self.assertTrue((ml_models["r2_score"] < 0).all(), "All ML models must exhibit negative R2 on chronological holdout")
        # ML models must not beat baseline
        self.assertFalse(ml_models["beats_baseline"].any(), "No ML model should falsely claim to beat the baseline")

    # TEST 17: File path portability (no /kaggle or /content)
    def test_17_file_path_portability(self):
        src_files = glob.glob(os.path.join(BASE_DIR, "src", "**", "*.py"), recursive=True)
        self.assertTrue(len(src_files) > 0, "No source files found in src/")
        for sf in src_files:
            with open(sf, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                self.assertNotIn("/kaggle/working", content, f"Hardcoded /kaggle/working found in {sf}")
                self.assertNotIn("/content/Member4_Project", content, f"Hardcoded /content/Member4_Project found in {sf}")

    # TEST 18: Derived regional summaries integrity
    def test_18_derived_regional_summaries(self):
        dist_path = os.path.join(DATA_DER, "district_agricultural_summary.csv")
        div_path = os.path.join(DATA_DER, "division_agricultural_summary.csv")
        self.assertTrue(os.path.exists(dist_path), "district_agricultural_summary.csv missing")
        self.assertTrue(os.path.exists(div_path), "division_agricultural_summary.csv missing")
        df_dist = pd.read_csv(dist_path)
        df_div = pd.read_csv(div_path)
        self.assertEqual(len(df_dist), 64, f"Expected 64 districts, found {len(df_dist)}")
        self.assertEqual(len(df_div), 8, f"Expected 8 divisions, found {len(df_div)}")


if __name__ == "__main__":
    unittest.main()
