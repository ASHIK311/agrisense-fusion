"""
Forensic Audit Script for Phase 0
Examines all 6 Member deliverables and current main app repository.
"""
import os
import sys
import json
import hashlib
import glob
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEMBERS_BASE = os.path.join(BASE_DIR, "research")

results = {
    "audit_timestamp": pd.Timestamp.now().isoformat(),
    "base_dir": BASE_DIR,
    "members": {}
}

def get_file_info(filepath):
    if not os.path.exists(filepath):
        return None
    stat = os.stat(filepath)
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        # read first 1MB for hash if file is huge, or all if <= 10MB
        if stat.st_size <= 10 * 1024 * 1024:
            hasher.update(f.read())
        else:
            hasher.update(f.read(1024 * 1024))
    return {
        "size_bytes": stat.st_size,
        "sha256_sample": hasher.hexdigest(),
        "modified": pd.Timestamp(stat.st_mtime, unit='s').isoformat()
    }

# 1. Member 1 Audit
m1_dir = os.path.join(MEMBERS_BASE, "member_01_satellite_gis")
m1_info = {
    "path": m1_dir,
    "models": {},
    "reports": {},
    "api_files": {},
    "raster_count": 0
}
for model_name in ["final_model.pkl", "optimized_model.pkl", "crop_classifier.pkl", "best_landcover_classifier.pkl"]:
    p = os.path.join(m1_dir, "models", model_name)
    m1_info["models"][model_name] = get_file_info(p)

for schema_name in ["feature_schema.json", "final_feature_schema.json", "optimized_feature_schema.json"]:
    p = os.path.join(m1_dir, "models", schema_name)
    if os.path.exists(p):
        with open(p, "r") as f:
            m1_info["models"][schema_name] = json.load(f)

# Count scenes/indices
scene_files = glob.glob(os.path.join(m1_dir, "data", "scenes", "**", "*.tif"), recursive=True)
index_files = glob.glob(os.path.join(m1_dir, "indices", "**", "*.tif"), recursive=True)
m1_info["scene_tif_count"] = len(scene_files)
m1_info["indices_tif_count"] = len(index_files)

# Check final audit reports
audit_dir = os.path.join(m1_dir, "reports", "final_audit")
if os.path.exists(audit_dir):
    m1_info["final_audit_files"] = os.listdir(audit_dir)
results["members"]["member_1"] = m1_info

# 2. Member 2 Audit
m2_dir = os.path.join(MEMBERS_BASE, "member_02_weather_risk", "Member_2_Production_System")
m2_info = {
    "path": m2_dir,
    "files": {}
}
for fname in ["drought_heat_model.json", "predict_risk.py", "weather_with_dryness_indicators.csv", 
              "NASA_POWER_parameter_provenance.csv", "hot_dry_event_analysis.csv", "monthly_seasonal_analysis.csv"]:
    p = os.path.join(m2_dir, fname)
    m2_info["files"][fname] = get_file_info(p)

# Check weather dataset
weather_csv = os.path.join(m2_dir, "weather_with_dryness_indicators.csv")
if os.path.exists(weather_csv):
    df_w = pd.read_csv(weather_csv)
    m2_info["weather_dataset"] = {
        "rows": len(df_w),
        "columns": list(df_w.columns),
        "date_min": str(df_w['DATE'].min()) if 'DATE' in df_w.columns else None,
        "date_max": str(df_w['DATE'].max()) if 'DATE' in df_w.columns else None,
        "null_counts": df_w.isnull().sum().to_dict(),
        "summary": df_w.describe().to_dict()
    }
# Check drought model json
m2_model_p = os.path.join(m2_dir, "drought_heat_model.json")
if os.path.exists(m2_model_p):
    with open(m2_model_p, "r") as f:
        m2_info["model_spec"] = json.load(f)
results["members"]["member_2"] = m2_info

# 3. Member 3 Audit
m3_dir = os.path.join(MEMBERS_BASE, "member_03_iot_hardware")
m3_info = {
    "path": m3_dir,
    "firmware": get_file_info(os.path.join(m3_dir, "firmware", "esp32_soil_monitor.ino")),
    "config": get_file_info(os.path.join(m3_dir, "config", "hardware_config.json")),
    "data_files": {}
}
if os.path.exists(os.path.join(m3_dir, "config", "hardware_config.json")):
    with open(os.path.join(m3_dir, "config", "hardware_config.json")) as f:
        m3_info["hardware_config"] = json.load(f)

for root, dirs, files in os.walk(os.path.join(m3_dir, "data")):
    for f in files:
        if f.endswith(".csv"):
            fp = os.path.join(root, f)
            rel_p = os.path.relpath(fp, m3_dir)
            try:
                df = pd.read_csv(fp)
                m3_info["data_files"][rel_p] = {
                    "rows": len(df),
                    "cols": list(df.columns)
                }
            except Exception as e:
                m3_info["data_files"][rel_p] = {"error": str(e)}
results["members"]["member_3"] = m3_info

# 4. Member 4 Audit
m4_dir = os.path.join(MEMBERS_BASE, "member_04_agronomy_mcda", "Correction_v2")
m4_info = {
    "path": m4_dir,
    "datasets": {}
}
for dpath in [os.path.join(m4_dir, "data", "processed"), os.path.join(m4_dir, "data", "reference")]:
    if os.path.exists(dpath):
        for f in os.listdir(dpath):
            if f.endswith(".csv"):
                fp = os.path.join(dpath, f)
                try:
                    df = pd.read_csv(fp, nrows=100)
                    total_rows = sum(1 for _ in open(fp, encoding="utf-8", errors="ignore")) - 1
                    m4_info["datasets"][f] = {
                        "total_rows": total_rows,
                        "sample_cols": list(df.columns)
                    }
                except Exception as e:
                    m4_info["datasets"][f] = {"error": str(e)}
results["members"]["member_4"] = m4_info

# 5. Member 5 Audit
m5_dir = os.path.join(MEMBERS_BASE, "member_05_hydrology_physics", "Correction_v2")
m5_info = {
    "path": m5_dir,
    "physics_files": [f for f in os.listdir(os.path.join(m5_dir, "src", "physics")) if f.endswith(".py")],
    "reference_files": os.listdir(os.path.join(m5_dir, "data", "reference")) if os.path.exists(os.path.join(m5_dir, "data", "reference")) else []
}
results["members"]["member_5"] = m5_info

# 6. Member 6 Audit
m6_dir = os.path.join(MEMBERS_BASE, "member_06_crop_pathology", "Correction_v2")
m6_info = {
    "path": m6_dir,
    "csv_files": {}
}
for f in os.listdir(m6_dir):
    if f.endswith(".csv"):
        fp = os.path.join(m6_dir, f)
        try:
            df = pd.read_csv(fp)
            m6_info["csv_files"][f] = {
                "rows": len(df),
                "cols": list(df.columns)
            }
        except Exception as e:
            m6_info["csv_files"][f] = {"error": str(e)}

if os.path.exists(os.path.join(m6_dir, "disease_knowledge_base.json")):
    with open(os.path.join(m6_dir, "disease_knowledge_base.json"), encoding="utf-8") as f:
        kb = json.load(f)
        m6_info["kb_keys"] = list(kb.keys()) if isinstance(kb, dict) else len(kb)

if os.path.exists(os.path.join(m6_dir, "verified_60_papers.json")):
    with open(os.path.join(m6_dir, "verified_60_papers.json"), encoding="utf-8") as f:
        vp = json.load(f)
        m6_info["verified_papers_count"] = len(vp)

results["members"]["member_6"] = m6_info

# Write forensic output
out_path = os.path.join(BASE_DIR, "documentation", "forensic_inventory.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, default=str)

print("Forensic inspection complete. Output written to:", out_path)
