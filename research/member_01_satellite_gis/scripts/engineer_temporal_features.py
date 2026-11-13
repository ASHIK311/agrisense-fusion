"""
Field Shift — Phase 3: Multi-Temporal Feature Engineering Engine
NASA Space Apps Challenge 2026

Extracts advanced multi-temporal phenological features across available Sentinel-2 scenes:
1. Core Spectral: Blue_B02, Green_B03, Red_B04, NIR_B08, SWIR1_B11
2. Baseline Indices: NDVI_Rabi, NDWI_McFeeters, NDMI_Moisture, EVI_Rabi
3. Multi-Temporal Phenology Dynamics:
   - Delta_NDVI_Kharif_Rabi: Seasonal crop biomass amplitude
   - NDVI_Seasonal_Min: Minimum annual greenness (Key discriminator for Tree Cover vs Crop)
   - NDVI_Seasonal_Max: Peak annual greenness
   - NDVI_Seasonal_Amplitude: Annual vegetation swing (Key discriminator for Built-Up vs Crop)
   - NDMI_Seasonal_Mean: Multi-season moisture persistence
   - EVI_Temporal_Change: Multi-season structural canopy shift
4. Quality Flags: Valid observation count per pixel (cloud-free count)
"""

import os
import sys
import glob
import json
import numpy as np
import pandas as pd
import rasterio

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
LABELS_DIR = os.path.join(BASE_DIR, "data", "labels")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
EXPORTS_CSV = os.path.join(BASE_DIR, "exports", "csv")

def extract_advanced_temporal_features(num_samples_per_class=5000, random_state=42):
    print("=" * 75)
    print(" PHASE 3: ADVANCED MULTI-TEMPORAL FEATURE EXTRACTION")
    print("=" * 75)

    proc_files = sorted(glob.glob(os.path.join(PROCESSED_DIR, "*_godagari_preprocessed.tif")))
    print(f"Ingesting {len(proc_files)} preprocessed multi-temporal GeoTIFFs...")

    # Load ground truth layer: ESA WorldCover
    wc_file = os.path.join(LABELS_DIR, "esa_worldcover_godagari.tif")
    with rasterio.open(wc_file) as src_wc:
        wc_data = src_wc.read(1)
        wc_profile = src_wc.profile.copy()

    # Identify canonical Rabi and Kharif scenes
    rabi_files = [f for f in proc_files if "0228" in f or "0305" in f or "0309" in f or "0319" in f]
    kharif_files = [f for f in proc_files if "1021" in f or "1026" in f or "1110" in f or "1124" in f]
    harvest_files = [f for f in proc_files if "1224" in f or "1225" in f or "0109" in f]
    pre_kharif_files = [f for f in proc_files if "0405" in f or "0413" in f or "0419" in f]

    # Explicitly anchor baseline Rabi and Kharif scenes to canonical 20240228 and 20231026
    primary_rabi = [f for f in rabi_files if "20240228" in f][0] if any("20240228" in f for f in rabi_files) else rabi_files[0]
    primary_kharif = [f for f in kharif_files if "20231026" in f][0] if any("20231026" in f for f in kharif_files) else kharif_files[0]

    print(f" -> Primary Baseline Rabi Scene: {os.path.basename(primary_rabi)}")
    print(f" -> Primary Baseline Kharif Scene: {os.path.basename(primary_kharif)}")

    with rasterio.open(primary_rabi) as src_r:
        ref_profile = src_r.profile.copy()
        b02_r = src_r.read(1)
        b03_r = src_r.read(2)
        b04_r = src_r.read(3)
        b08_r = src_r.read(4)
        b11_r = src_r.read(5)
        valid_r = (src_r.read(6) == 1.0)

    with rasterio.open(primary_kharif) as src_k:
        b04_k = src_k.read(3)
        b08_k = src_k.read(4)
        b11_k = src_k.read(5)
        b02_k = src_k.read(1)
        valid_k = (src_k.read(6) == 1.0)

    # Compute baseline Rabi indices
    ndvi_rabi = np.where((b08_r + b04_r) > 0, (b08_r - b04_r) / (b08_r + b04_r + 1e-7), 0.0)
    ndwi_rabi = np.where((b03_r + b08_r) > 0, (b03_r - b08_r) / (b03_r + b08_r + 1e-7), 0.0)
    ndmi_rabi = np.where((b08_r + b11_r) > 0, (b08_r - b11_r) / (b08_r + b11_r + 1e-7), 0.0)
    denom_evi_r = b08_r + (6.0 * b04_r) - (7.5 * b02_r) + 1.0
    evi_rabi = np.where(denom_evi_r != 0, 2.5 * (b08_r - b04_r) / denom_evi_r, 0.0)

    # Compute Kharif indices
    ndvi_kharif = np.where((b08_k + b04_k) > 0, (b08_k - b04_k) / (b08_k + b04_k + 1e-7), 0.0)
    ndmi_kharif = np.where((b08_k + b11_k) > 0, (b08_k - b11_k) / (b08_k + b11_k + 1e-7), 0.0)
    denom_evi_k = b08_k + (6.0 * b04_k) - (7.5 * b02_k) + 1.0
    evi_kharif = np.where(denom_evi_k != 0, 2.5 * (b08_k - b04_k) / denom_evi_k, 0.0)

    # Advanced Temporal Features
    delta_ndvi = ndvi_kharif - ndvi_rabi
    ndvi_stack = [ndvi_rabi, ndvi_kharif]
    ndmi_stack = [ndmi_rabi, ndmi_kharif]
    valid_count = valid_r.astype(np.int32) + valid_k.astype(np.int32)

    # Read additional scenes if present
    for extra_f in [f for f in proc_files if f not in [primary_rabi, primary_kharif]]:
        with rasterio.open(extra_f) as src_e:
            b4_e = src_e.read(3)
            b8_e = src_e.read(4)
            b11_e = src_e.read(5)
            val_e = (src_e.read(6) == 1.0)
            nd_e = np.where((b8_e + b4_e) > 0, (b8_e - b4_e) / (b8_e + b4_e + 1e-7), 0.0)
            ndm_e = np.where((b8_e + b11_e) > 0, (b8_e - b11_e) / (b8_e + b11_e + 1e-7), 0.0)
            ndvi_stack.append(nd_e)
            ndmi_stack.append(ndm_e)
            valid_count += val_e.astype(np.int32)

    # Calculate seasonal extrema and amplitude across the multi-temporal stack
    ndvi_all = np.stack(ndvi_stack, axis=0)
    ndmi_all = np.stack(ndmi_stack, axis=0)

    ndvi_seasonal_max = np.max(ndvi_all, axis=0)
    ndvi_seasonal_min = np.min(ndvi_all, axis=0)
    ndvi_seasonal_amplitude = ndvi_seasonal_max - ndvi_seasonal_min
    ndmi_seasonal_mean = np.mean(ndmi_all, axis=0)
    evi_temporal_change = evi_kharif - evi_rabi

    # Resample wc_data if shape slightly differs
    if wc_data.shape != b04_r.shape:
        from rasterio.vrt import WarpedVRT
        with rasterio.open(wc_file) as src_w:
            vrt_opt = {
                'crs': ref_profile['crs'],
                'transform': ref_profile['transform'],
                'height': ref_profile['height'],
                'width': ref_profile['width'],
                'resampling': rasterio.enums.Resampling.nearest
            }
            with WarpedVRT(src_w, **vrt_opt) as vrt:
                wc_data = vrt.read(1)

    common_valid = valid_r & valid_k & (wc_data > 0) & np.isfinite(b04_r)

    # Full 15-Feature Definition
    feature_names_15 = [
        # 1-5: Core Spectral Bands
        "Blue_B02", "Green_B03", "Red_B04", "NIR_B08", "SWIR1_B11",
        # 6-9: Primary Vegetation Indices
        "NDVI_Rabi", "NDWI_McFeeters", "NDMI_Moisture", "EVI_Rabi",
        # 10: Multi-Temporal Biomass Amplitude
        "Delta_NDVI_Kharif_Rabi",
        # 11-15: Advanced Multi-Seasonal Phenology Features (Targets Weak Classes)
        "NDVI_Seasonal_Min",
        "NDVI_Seasonal_Max",
        "NDVI_Seasonal_Amplitude",
        "NDMI_Seasonal_Mean",
        "EVI_Temporal_Change"
    ]

    feature_stack_15 = np.stack([
        b02_r, b03_r, b04_r, b08_r, b11_r,
        ndvi_rabi, ndwi_rabi, ndmi_rabi, evi_rabi,
        delta_ndvi,
        ndvi_seasonal_min,
        ndvi_seasonal_max,
        ndvi_seasonal_amplitude,
        ndmi_seasonal_mean,
        evi_temporal_change
    ], axis=-1)

    print(f" -> Constructed 15-Feature Multi-Temporal Stack: shape={feature_stack_15.shape}")

    # Sample balanced dataset
    CLASS_MAPPING = {
        40: ("Cropland", 1),
        10: ("Tree_Cover", 2),
        80: ("Permanent_Water", 3),
        50: ("Built_Up", 4)
    }

    np.random.seed(random_state)
    records = []

    for orig_code, (label_name, new_id) in CLASS_MAPPING.items():
        coords = np.argwhere(common_valid & (wc_data == orig_code))
        sample_count = min(num_samples_per_class, len(coords))
        chosen = np.random.choice(len(coords), size=sample_count, replace=False)
        selected = coords[chosen]

        for r, c in selected:
            feats = feature_stack_15[r, c, :]
            if np.all(np.isfinite(feats)):
                row_dict = {name: float(val) for name, val in zip(feature_names_15, feats)}
                row_dict["target_id"] = int(new_id)
                row_dict["target_label"] = label_name
                row_dict["row"] = int(r)
                row_dict["col"] = int(c)
                records.append(row_dict)
        print(f"   ✓ Sampled {sample_count:,} pixels for: {label_name}")

    df_samples = pd.DataFrame(records)
    print(f" -> Total Sampled Dataset: {len(df_samples):,} rows across 4 balanced classes")

    return df_samples, feature_names_15, feature_stack_15, common_valid, ref_profile, wc_data

if __name__ == "__main__":
    extract_advanced_temporal_features()
