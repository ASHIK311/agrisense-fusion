"""
Field Shift — Phase 1: Multi-Year Sentinel-2 Ingestion & Processing Engine
NASA Space Apps Challenge 2026

Ingests 12 canonical acquisitions across 3 agricultural years:
- Year 1 (2022-2023): 2022-10-21, 2023-01-09, 2023-03-05, 2023-04-19
- Year 2 (2023-2024): 2023-10-26, 2023-12-25, 2024-02-28, 2024-04-13 (Already Processed)
- Year 3 (2024-2025): 2024-11-24, 2024-12-24, 2025-03-19, 2025-04-05

For each scene:
1. Windowed extraction of required bands: B02, B03, B04, B08, B11, SCL
2. Save raw bands to data/raw/<date>_<scene_id>/
3. Preprocess: 0.0001 BOA scaling, bilinear 10m B11 resampling, SCL quality masking
4. Save 6-band GeoTIFF to data/processed/<date>_godagari_preprocessed.tif
5. Compute NDVI, NDWI, NDMI, EVI rasters into indices/
6. Compile reports/multi_year_download_manifest.csv and reports/multi_year_processing_report.md
"""

import os
import sys
import time
import glob
import json
import numpy as np
import pandas as pd
import rasterio
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
import pystac_client
import planetary_computer as pc

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
INDICES_DIR = os.path.join(BASE_DIR, "indices")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
EXPORTS_CSV = os.path.join(BASE_DIR, "exports", "csv")

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(EXPORTS_CSV, exist_ok=True)
for idx in ["NDVI", "NDWI", "NDMI", "EVI"]:
    os.makedirs(os.path.join(INDICES_DIR, idx), exist_ok=True)

# Exact Godagari Upazila UTM Zone 45N bounds matching existing 2522x2629 rasters
UTM_BOUNDS = [632040.0, 2695250.0, 657260.0, 2721540.0]  # [minx, miny, maxx, maxy] in EPSG:32645
EXPECTED_SHAPE = (2629, 2522)

# 12 Target Multi-Year Acquisitions
TARGET_ACQUISITIONS = [
    # Year 1: 2022 - 2023
    {"year": "2022-2023", "season": "Kharif_Aman", "date": "2022-10-21", "scene_id": "S2B_MSIL2A_20221021T043819_R033_T45RXH_20221022T074752"},
    {"year": "2022-2023", "season": "Post_Harvest_Rabi", "date": "2023-01-09", "scene_id": "S2B_MSIL2A_20230109T044139_R033_T45RXH_20240810T123409"},
    {"year": "2022-2023", "season": "Rabi_Winter", "date": "2023-03-05", "scene_id": "S2A_MSIL2A_20230305T043701_R033_T45RXH_20230305T094651"},
    {"year": "2022-2023", "season": "Pre_Kharif_Aus", "date": "2023-04-19", "scene_id": "S2B_MSIL2A_20230419T043659_R033_T45RXH_20230419T173254"},

    # Year 2: 2023 - 2024 (Baseline)
    {"year": "2023-2024", "season": "Kharif_Aman", "date": "2023-10-26", "scene_id": "S2B_MSIL2A_20231026T043849_R033_T45RXH_20241121T122521"},
    {"year": "2023-2024", "season": "Post_Harvest_Rabi", "date": "2023-12-25", "scene_id": "S2B_MSIL2A_20231225T044219_R033_T45RXH_20231225T081826"},
    {"year": "2023-2024", "season": "Rabi_Winter", "date": "2024-02-28", "scene_id": "S2A_MSIL2A_20240228T043731_R033_T45RXH_20240228T101839"},
    {"year": "2023-2024", "season": "Pre_Kharif_Aus", "date": "2024-04-13", "scene_id": "S2B_MSIL2A_20240413T043659_R033_T45RXH_20240413T083818"},

    # Year 3: 2024 - 2025
    {"year": "2024-2025", "season": "Kharif_Aman", "date": "2024-11-24", "scene_id": "S2A_MSIL2A_20241124T044121_R033_T45RXH_20241124T094101"},
    {"year": "2024-2025", "season": "Post_Harvest_Rabi", "date": "2024-12-24", "scene_id": "S2A_MSIL2A_20241224T044211_R033_T45RXH_20241224T071557"},
    {"year": "2024-2025", "season": "Rabi_Winter", "date": "2025-03-19", "scene_id": "S2B_MSIL2A_20250319T043709_R033_T45RXH_20250319T072326"},
    {"year": "2024-2025", "season": "Pre_Kharif_Aus", "date": "2025-04-05", "scene_id": "S2A_MSIL2A_20250405T044231_R033_T45RXH_20250405T095713"},
]

def download_and_process():
    print("=" * 75)
    print(" PHASE 1: MULTI-YEAR SENTINEL-2 INGESTION & PROCESSING ENGINE")
    print("=" * 75)

    catalog = pystac_client.Client.open(
        "https://planetarycomputer.microsoft.com/api/stac/v1",
        modifier=pc.sign_inplace
    )

    manifest_records = []
    timeseries_records = []

    for idx, item_info in enumerate(TARGET_ACQUISITIONS, 1):
        dt_str = item_info["date"]
        dt_clean = dt_str.replace("-", "")
        scene_id = item_info["scene_id"]
        season = item_info["season"]
        year_cycle = item_info["year"]

        print(f"\n[{idx}/12] Processing {year_cycle} | {season} ({dt_str}) | Scene: {scene_id[:35]}...")

        raw_scene_dir = os.path.join(RAW_DIR, f"{dt_clean}_{scene_id[:25]}")
        os.makedirs(raw_scene_dir, exist_ok=True)

        proc_tif = os.path.join(PROCESSED_DIR, f"{dt_clean}_godagari_preprocessed.tif")

        # Check if already processed
        if os.path.exists(proc_tif):
            print(f" -> Scene already processed: {proc_tif}")
            with rasterio.open(proc_tif) as src:
                ref_profile = src.profile.copy()
                file_size_mb = os.path.getsize(proc_tif) / (1024 * 1024)
            manifest_records.append({
                "year_cycle": year_cycle,
                "season": season,
                "acquisition_date": dt_str,
                "scene_id": scene_id,
                "raw_dir": raw_scene_dir,
                "processed_tif": proc_tif,
                "file_size_mb": round(file_size_mb, 2),
                "status": "Verified Existing",
                "bands_extracted": "B02,B03,B04,B08,B11,SCL"
            })
            continue

        # Ingest from Planetary Computer STAC
        stac_item = None
        try:
            stac_item = catalog.get_collection("sentinel-2-l2a").get_item(scene_id)
        except Exception as e:
            print(f" ! Exception retrieving STAC item: {e}")

        if stac_item is None:
            # Query by date and tile
            print(f" -> Querying STAC by date {dt_str} and tile 45RXH...")
            s_q = catalog.search(
                collections=["sentinel-2-l2a"],
                bbox=[88.303856, 24.363352, 88.552513, 24.601456],
                datetime=f"{dt_str}/{dt_str}",
                query={"s2:mgrs_tile": {"eq": "45RXH"}}
            )
            items_q = list(s_q.items())
            if items_q:
                stac_item = items_q[0]
                print(f"    ✓ Found alternative item: {stac_item.id}")
            else:
                print(f"    ! No STAC item found for {dt_str}, skipping.")
                continue

        bands_to_extract = ["B02", "B03", "B04", "B08", "B11", "SCL"]
        band_arrays = {}
        band_profiles = {}

        # 1. Download raw bands
        for b in bands_to_extract:
            out_band_file = os.path.join(raw_scene_dir, f"{b}.tif")
            if os.path.exists(out_band_file):
                with rasterio.open(out_band_file) as src:
                    band_arrays[b] = src.read(1)
                    band_profiles[b] = src.profile.copy()
            else:
                asset_url = stac_item.assets[b].href
                t0 = time.time()
                with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"):
                    with rasterio.open(asset_url) as src:
                        win = from_bounds(UTM_BOUNDS[0], UTM_BOUNDS[1], UTM_BOUNDS[2], UTM_BOUNDS[3], src.transform)
                        win = win.round_offsets().round_lengths()
                        win_trans = rasterio.windows.transform(win, src.transform)
                        data = src.read(1, window=win)

                        prof = src.profile.copy()
                        prof.update({
                            "height": data.shape[0],
                            "width": data.shape[1],
                            "transform": win_trans,
                            "compress": "deflate",
                            "driver": "GTiff"
                        })
                        with rasterio.open(out_band_file, "w", **prof) as dst:
                            dst.write(data, 1)

                        band_arrays[b] = data
                        band_profiles[b] = prof
                        print(f"    ✓ Downloaded {b}: shape={data.shape}, time={time.time()-t0:.1f}s")

        # 2. Resample B11 and SCL to 10m grid (2629, 2522) if needed
        ref_prof_10m = band_profiles["B04"].copy()
        target_h, target_w = EXPECTED_SHAPE

        def resample_band(b_data, b_prof, target_shape, resample_method):
            if b_data.shape == target_shape:
                return b_data
            from rasterio.warp import reproject
            resampled = np.zeros(target_shape, dtype=b_data.dtype)
            reproject(
                source=b_data,
                destination=resampled,
                src_transform=b_prof["transform"],
                src_crs=b_prof["crs"],
                dst_transform=ref_prof_10m["transform"],
                dst_crs=ref_prof_10m["crs"],
                resampling=resample_method
            )
            return resampled

        b02 = band_arrays["B02"].astype(np.float32) * 0.0001
        b03 = band_arrays["B03"].astype(np.float32) * 0.0001
        b04 = band_arrays["B04"].astype(np.float32) * 0.0001
        b08 = band_arrays["B08"].astype(np.float32) * 0.0001

        b11_resampled = resample_band(band_arrays["B11"], band_profiles["B11"], EXPECTED_SHAPE, Resampling.bilinear)
        b11 = b11_resampled.astype(np.float32) * 0.0001

        scl_resampled = resample_band(band_arrays["SCL"], band_profiles["SCL"], EXPECTED_SHAPE, Resampling.nearest)
        
        # Valid quality mask: SCL in [4, 5, 6, 7, 11] and data > 0
        valid_mask = np.isin(scl_resampled, [4, 5, 6, 7, 11]) & (b04 > 0.0) & (b08 > 0.0)
        valid_mask_u8 = valid_mask.astype(np.uint8)

        # 3. Stack into processed 6-band GeoTIFF
        proc_prof = ref_prof_10m.copy()
        proc_prof.update({
            "count": 6,
            "dtype": "float32",
            "compress": "deflate",
            "nodata": np.nan
        })

        with rasterio.open(proc_tif, "w", **proc_prof) as dst:
            dst.write(b02, 1)
            dst.write(b03, 2)
            dst.write(b04, 3)
            dst.write(b08, 4)
            dst.write(b11, 5)
            dst.write(valid_mask_u8.astype(np.float32), 6)
            dst.set_band_description(1, "B02_Blue_10m_SurfaceReflectance")
            dst.set_band_description(2, "B03_Green_10m_SurfaceReflectance")
            dst.set_band_description(3, "B04_Red_10m_SurfaceReflectance")
            dst.set_band_description(4, "B08_NIR_10m_SurfaceReflectance")
            dst.set_band_description(5, "B11_SWIR1_10m_Resampled_SurfaceReflectance")
            dst.set_band_description(6, "Valid_Mask_SCL_CloudShadowFiltered")

        print(f" -> Successfully processed and saved stack: {proc_tif}")

        # 4. Compute Vegetation & Moisture Indices
        denom_ndvi = b08 + b04
        ndvi = np.where((denom_ndvi > 0) & valid_mask, (b08 - b04) / (denom_ndvi + 1e-7), np.nan)

        denom_ndwi = b03 + b08
        ndwi = np.where((denom_ndwi > 0) & valid_mask, (b03 - b08) / (denom_ndwi + 1e-7), np.nan)

        denom_ndmi = b08 + b11
        ndmi = np.where((denom_ndmi > 0) & valid_mask, (b08 - b11) / (denom_ndmi + 1e-7), np.nan)

        denom_evi = b08 + (6.0 * b04) - (7.5 * b02) + 1.0
        raw_evi = np.where((denom_evi != 0) & valid_mask, 2.5 * (b08 - b04) / denom_evi, np.nan)
        evi = np.where(valid_mask & np.isfinite(raw_evi), np.clip(raw_evi, -1.0, 1.5), np.nan)

        idx_prof = ref_prof_10m.copy()
        idx_prof.update({"count": 1, "dtype": "float32", "nodata": np.nan, "compress": "deflate"})

        indices_dict = {"NDVI": ndvi, "NDWI": ndwi, "NDMI": ndmi, "EVI": evi}
        for idx_name, idx_arr in indices_dict.items():
            idx_file = os.path.join(INDICES_DIR, idx_name, f"{dt_clean}_{idx_name}.tif")
            with rasterio.open(idx_file, "w", **idx_prof) as dst:
                dst.write(idx_arr.astype(np.float32), 1)

        # 5. Spatial summary statistics
        v_ndvi = ndvi[valid_mask & np.isfinite(ndvi)]
        v_ndmi = ndmi[valid_mask & np.isfinite(ndmi)]
        v_evi = evi[valid_mask & np.isfinite(evi)]

        manifest_records.append({
            "year_cycle": year_cycle,
            "season": season,
            "acquisition_date": dt_str,
            "scene_id": scene_id,
            "raw_dir": raw_scene_dir,
            "processed_tif": proc_tif,
            "file_size_mb": round(os.path.getsize(proc_tif) / (1024 * 1024), 2),
            "status": "Downloaded and Calibrated",
            "bands_extracted": "B02,B03,B04,B08,B11,SCL",
            "valid_pixel_pct": round(float(valid_mask.sum()) / valid_mask.size * 100.0, 2),
            "ndvi_mean": round(float(np.mean(v_ndvi)), 4),
            "ndmi_mean": round(float(np.mean(v_ndmi)), 4),
            "evi_mean": round(float(np.mean(v_evi)), 4)
        })

    # Save manifest CSV
    df_manifest = pd.DataFrame(manifest_records)
    out_manifest = os.path.join(REPORTS_DIR, "multi_year_download_manifest.csv")
    df_manifest.to_csv(out_manifest, index=False)
    print(f"\nSaved Multi-Year Download Manifest CSV: {out_manifest}")

    return df_manifest

if __name__ == "__main__":
    download_and_process()
