"""
Master Ingestion & Harmonization Adapter
Extracts validated data from all 6 Member directories and builds
a unified, scientifically consistent master database seed.
"""

import os
import sys
import json
import csv
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEMBERS_BASE = os.path.join(BASE_DIR, "research")

print("Beginning master data ingestion...")

master_data = {
    "generated_at": pd.Timestamp.now().isoformat(),
    "provenance_note": "Harmonized master dataset compiled directly from accepted Member 1-6 deliverables.",
    "satellite": {},
    "weather": {},
    "iot_sensors": {},
    "agronomy": {},
    "physics": {},
    "diseases": [],
    "research_papers": [],
    "groundwater": []
}

# ----------------------------------------------------
# 1. Member 1: Satellite & Land Cover
# ----------------------------------------------------
m1_dir = os.path.join(MEMBERS_BASE, "member_01_satellite_gis")
schema_p = os.path.join(m1_dir, "models", "optimized_feature_schema.json")
if os.path.exists(schema_p):
    with open(schema_p, "r", encoding="utf-8") as f:
        master_data["satellite"]["schema"] = json.load(f)

cm_p = os.path.join(m1_dir, "reports", "final_audit", "confusion_matrix.csv")
if os.path.exists(cm_p):
    df_cm = pd.read_csv(cm_p)
    master_data["satellite"]["confusion_matrix"] = df_cm.to_dict(orient="records")

pcm_p = os.path.join(m1_dir, "reports", "final_audit", "per_class_metrics.csv")
if os.path.exists(pcm_p):
    df_pcm = pd.read_csv(pcm_p)
    master_data["satellite"]["per_class_metrics"] = df_pcm.to_dict(orient="records")

master_data["satellite"]["verified_performance"] = {
    "model_name": "RandomForest_21Feat_Deep",
    "feature_count": 21,
    "spatial_cv_accuracy": "84.63% +/- 3.81%",
    "spatial_cv_macro_f1": "0.8342 +/- 0.0194",
    "spatial_cv_balanced_accuracy": "84.37% +/- 1.16%",
    "spatial_cv_samples": 20000,
    "spatial_buffer_status": "No inter-block geographic buffer applied (contiguous latitudinal blocks)",
    "block_b_validation_accuracy": 86.09,
    "block_b_balanced_accuracy": 84.31,
    "block_b_macro_f1": 0.8436,
    "block_c_holdout_overall_accuracy": 85.77,
    "block_c_balanced_accuracy": 84.02,
    "block_c_macro_f1": 0.8257,
    "block_c_weighted_f1": 0.8589,
    "block_c_pure_interior_accuracy": 90.64,
    "block_c_boundary_mixed_accuracy": 75.92,
    "total_holdout_samples": 6000,
    "pure_interior_samples": 4015,
    "boundary_mixed_samples": 1985,
    "representative_prevalence_benchmark_accuracy": 77.07,
    "area_weighted_landscape_accuracy": "Not Yet Independently Established",
    "holdout_status": "Block C (85.77%, 5,146/6,000) is a southern latitudinal development holdout partition, not an untouched external test.",
    "crop_species_status": "BLOCKED pending DAE cadastral polygons. Validated strictly for 4 broad LULC classes."
}
print(" -> Member 1 ingested.")

# ----------------------------------------------------
# 2. Member 2: NASA POWER Weather & Climate Risk
# ----------------------------------------------------
m2_dir = os.path.join(MEMBERS_BASE, "member_02_weather_risk", "Member_2_Production_System")
w_csv = os.path.join(m2_dir, "weather_with_dryness_indicators.csv")
if os.path.exists(w_csv):
    df_w = pd.read_csv(w_csv)
    # Convert date to string
    df_w['date'] = df_w['date'].astype(str)
    # Store all 1,827 rows as clean records
    master_data["weather"]["godagari_daily_records"] = df_w.to_dict(orient="records")
    master_data["weather"]["summary"] = {
        "start_date": df_w['date'].min(),
        "end_date": df_w['date'].max(),
        "total_days": len(df_w),
        "mean_temp_c": round(float(((df_w['t_max'] + df_w['t_min']) / 2).mean()), 2),
        "total_rainfall_mm": round(float(df_w['rainfall'].sum()), 1),
        "mean_solar_mj": round(float(df_w['solar_radiation'].mean()), 2),
        "mean_rh_pct": round(float(df_w['humidity'].mean()), 1),
        "extreme_risk_days": int((df_w['heat_drought_risk'] == 1).sum())
    }

m2_model_p = os.path.join(m2_dir, "drought_heat_model.json")
if os.path.exists(m2_model_p):
    with open(m2_model_p, "r", encoding="utf-8") as f:
        master_data["weather"]["risk_model_spec"] = json.load(f)
print(f" -> Member 2 ingested ({len(master_data['weather'].get('godagari_daily_records', []))} daily weather rows).")

# ----------------------------------------------------
# 3. Member 3: IoT Sensor Data & Soil Profile
# ----------------------------------------------------
m3_dir = os.path.join(MEMBERS_BASE, "member_03_iot_hardware")
sg_csv = os.path.join(m3_dir, "data", "processed", "soilgrids_properties.csv")
if os.path.exists(sg_csv):
    df_sg = pd.read_csv(sg_csv)
    master_data["iot_sensors"]["soilgrids_profile"] = df_sg.to_dict(orient="records")

hw_p = os.path.join(m3_dir, "config", "hardware_config.json")
if os.path.exists(hw_p):
    with open(hw_p, "r", encoding="utf-8") as f:
        master_data["iot_sensors"]["hardware_config"] = json.load(f)

# Load sensor readings (keep most recent 500 for fast serving, plus aggregate stats)
sensor_csv = os.path.join(m3_dir, "data", "processed", "soil_sensor_dataset.csv")
if os.path.exists(sensor_csv):
    df_s = pd.read_csv(sensor_csv)
    master_data["iot_sensors"]["total_simulated_readings"] = len(df_s)
    master_data["iot_sensors"]["devices"] = list(df_s["device_id"].unique())
    master_data["iot_sensors"]["recent_readings"] = df_s.tail(500).to_dict(orient="records")
    master_data["iot_sensors"]["provenance"] = {
        "is_simulated": True,
        "note": "Calibrated FDR sensor simulation using empirical voltage-to-VWC response curves and SoilGrids clay loam texture."
    }
print(" -> Member 3 ingested.")

# ----------------------------------------------------
# 4. Member 4: Agronomy, Crop Calendars & Suitability
# ----------------------------------------------------
m4_dir = os.path.join(MEMBERS_BASE, "member_04_agronomy_mcda", "Correction_v2")
suit_csv = os.path.join(m4_dir, "data", "processed", "national_crop_suitability.csv")
if os.path.exists(suit_csv):
    df_suit = pd.read_csv(suit_csv)
    # Filter for Godagari or Rajshahi
    godagari_suit = df_suit[df_suit["upazila_name"].str.contains("Godagari", case=False, na=False)]
    if len(godagari_suit) == 0:
        godagari_suit = df_suit[df_suit["district_name"].str.contains("Rajshahi", case=False, na=False)]
    master_data["agronomy"]["godagari_crop_suitability"] = godagari_suit.to_dict(orient="records")

cal_csv = os.path.join(m4_dir, "data", "processed", "national_crop_calendar.csv")
if os.path.exists(cal_csv):
    df_cal = pd.read_csv(cal_csv)
    god_cal = df_cal[df_cal["upazila_name"].str.contains("Godagari", case=False, na=False)]
    if len(god_cal) == 0:
        god_cal = df_cal[df_cal["district_name"].str.contains("Rajshahi", case=False, na=False)]
    master_data["agronomy"]["godagari_crop_calendar"] = god_cal.to_dict(orient="records")

rot_csv = os.path.join(m4_dir, "data", "processed", "national_crop_rotation_recommendations.csv")
if os.path.exists(rot_csv):
    df_rot = pd.read_csv(rot_csv)
    god_rot = df_rot[df_rot["upazila_name"].str.contains("Godagari", case=False, na=False)]
    if len(god_rot) == 0:
        god_rot = df_rot[df_rot["district_name"].str.contains("Rajshahi", case=False, na=False)]
    master_data["agronomy"]["godagari_rotation_recommendations"] = god_rot.to_dict(orient="records")

kc_csv = os.path.join(m4_dir, "data", "reference", "crop_stage_kc_reference.csv")
if os.path.exists(kc_csv):
    df_kc = pd.read_csv(kc_csv)
    master_data["agronomy"]["crop_stage_kc_reference"] = df_kc.to_dict(orient="records")
print(" -> Member 4 ingested.")

# ----------------------------------------------------
# 5. Member 5: FAO-56 Physics Reference Parameters
# ----------------------------------------------------
master_data["physics"]["standard_parameters"] = {
    "reference_crop": "Grass (h = 0.12m, albedo = 0.23, rs = 70 s/m)",
    "solar_constant_gsc": 0.0820,
    "stefan_boltzmann_sigma": 4.903e-9,
    "psychrometric_kpa_c": 0.000665,
    "godagari_elevation_m": 28.0,
    "godagari_soil_texture": "Barind Silty Clay Loam (Saxton & Rawls 2006 PTF Provisional)",
    "godagari_soil_theta_sat": 0.435,
    "godagari_soil_theta_fc": 0.323,
    "godagari_soil_trigger_vwc": 0.244,
    "godagari_soil_theta_wp": 0.165,
    "godagari_soil_root_depth_m": 0.50,
    "godagari_soil_taw_50cm_mm": 79.0,
    "godagari_soil_raw_50cm_mm": 39.5
}
print(" -> Member 5 parameters recorded.")

# ----------------------------------------------------
# 6. Member 6: Crop Disease Knowledge Base (17 Diseases, 60 Papers)
# ----------------------------------------------------
m6_dir = os.path.join(MEMBERS_BASE, "member_06_crop_pathology", "Correction_v2")

master_p = os.path.join(m6_dir, "disease_master.csv")
clim_p = os.path.join(m6_dir, "disease_climate_relationships.csv")
mgmt_p = os.path.join(m6_dir, "disease_management_reference.csv")
res_p = os.path.join(m6_dir, "disease_resistant_varieties.csv")
cal_p = os.path.join(m6_dir, "disease_seasonal_calendar.csv")
papers_p = os.path.join(m6_dir, "research_papers.csv")

if os.path.exists(master_p):
    df_m = pd.read_csv(master_p)
    df_clim = pd.read_csv(clim_p) if os.path.exists(clim_p) else pd.DataFrame()
    df_mgmt = pd.read_csv(mgmt_p) if os.path.exists(mgmt_p) else pd.DataFrame()
    df_res = pd.read_csv(res_p) if os.path.exists(res_p) else pd.DataFrame()
    df_cal = pd.read_csv(cal_p) if os.path.exists(cal_p) else pd.DataFrame()

    diseases = []
    for _, row in df_m.iterrows():
        d_code = str(row.get("disease_id", row.get("disease_code", "")))
        d_name = str(row.get("disease_name_common", row.get("disease_name", "")))
        crop_val = str(row.get("crop_name", row.get("crop", "")))
        
        # Merge climate rule
        c_rule = {}
        if not df_clim.empty:
            m_c = df_clim[(df_clim.get("disease_id") == d_code) | (df_clim.get("disease_name") == d_name)]
            if not m_c.empty:
                c_rule = m_c.iloc[0].to_dict()
                
        # Merge management
        m_rule = {}
        if not df_mgmt.empty:
            m_m = df_mgmt[(df_mgmt.get("disease_id") == d_code) | (df_mgmt.get("disease_name") == d_name)]
            if not m_m.empty:
                m_rule = m_m.iloc[0].to_dict()
                
        # Merge resistant varieties
        v_list = []
        if not df_res.empty:
            m_v = df_res[(df_res.get("disease_id") == d_code) | (df_res.get("disease_name") == d_name)]
            if not m_v.empty:
                v_list = m_v.to_dict(orient="records")

        # Merge calendar
        cal_rule = {}
        if not df_cal.empty:
            m_cal = df_cal[(df_cal.get("disease_id") == d_code) | (df_cal.get("disease_name") == d_name)]
            if not m_cal.empty:
                cal_rule = m_cal.iloc[0].to_dict()

        disease_obj = {
            "disease_id": d_code,
            "disease_name": d_name,
            "crop": crop_val,
            "scientific_name": str(row.get("disease_name_scientific", row.get("pathogen_scientific_name", ""))),
            "pathogen_type": str(row.get("pathogen_type", "")),
            "symptoms": str(row.get("symptoms_summary", row.get("symptoms", ""))),
            "climate_rules": c_rule,
            "management": m_rule,
            "resistant_varieties": v_list,
            "seasonal_calendar": cal_rule
        }
        diseases.append(disease_obj)
    master_data["diseases"] = diseases

if os.path.exists(papers_p):
    df_pap = pd.read_csv(papers_p)
    master_data["research_papers"] = df_pap.to_dict(orient="records")

print(f" -> Member 6 ingested ({len(master_data['diseases'])} diseases, {len(master_data['research_papers'])} research papers).")

# ----------------------------------------------------
# 7. Groundwater Readings (Barind BMDA Logs)
# ----------------------------------------------------
master_data["groundwater"] = [
    {
        "id": 1,
        "farm_id": "farm-barind-01",
        "well_identifier": "DTW-BMDA-GODAGARI-42",
        "district": "Rajshahi",
        "upazila": "Godagari",
        "latitude": 24.469,
        "longitude": 88.330,
        "depth_below_surface_m": 26.4,
        "critical_threshold_m": 28.0,
        "annual_drawdown_rate_m": 0.65,
        "warning_level": "warning",
        "observed_at": "2026-10-15T00:00:00Z",
        "is_simulated": True,
        "source": "BMDA Monitoring Network Baseline"
    },
    {
        "id": 2,
        "farm_id": "farm-barind-01",
        "well_identifier": "DTW-BMDA-GODAGARI-108",
        "district": "Rajshahi",
        "upazila": "Godagari",
        "latitude": 24.485,
        "longitude": 88.315,
        "depth_below_surface_m": 27.8,
        "critical_threshold_m": 28.0,
        "annual_drawdown_rate_m": 0.72,
        "warning_level": "critical",
        "observed_at": "2026-10-15T00:00:00Z",
        "is_simulated": True,
        "source": "BMDA Monitoring Network Baseline"
    }
]

# Helper function to sanitize NaNs to None for strict JSON
def clean_for_json(obj):
    if isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(v) for v in obj]
    return obj

master_data_clean = clean_for_json(master_data)

# Write out to master_database_seed.json
out_file = os.path.join(BASE_DIR, "server", "data", "master_database_seed.json")
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(master_data_clean, f, indent=2, default=str)

print(f"Master database seed successfully created at: {out_file}")
print(f"Total size: {os.path.getsize(out_file):,} bytes")
