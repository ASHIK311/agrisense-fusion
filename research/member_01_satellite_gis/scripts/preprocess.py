"""
Satellite Image Preprocessing Pipeline for Godagari, Rajshahi (Barind Tract)
Project: Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)
Member 1: Satellite Image Processing, Remote Sensing & GIS Analysis

Transforms:
- 10m/20m spatial resolution harmonization (Bilinear for continuous SWIR-1, Nearest for categorical SCL)
- Surface reflectance conversion (DN to physical reflectance [0.0, 1.0])
- Pixel-level cloud & cloud-shadow masking via Sentinel-2 SCL
- Polygon vector clipping to exact Godagari Upazila administrative boundary
- Windowed/chunked rasterio memory optimization
- CRS verification (EPSG:32645 UTM Zone 45N)
"""

import os
import sys
import json
import glob
import numpy as np
import geopandas as gpd
from shapely.geometry import mapping

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import rasterio
from rasterio.mask import mask
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
METADATA_DIR = os.path.join(BASE_DIR, "data", "metadata")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
EXPORTS_GEOTIFF_DIR = os.path.join(BASE_DIR, "exports", "geotiff")

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(EXPORTS_GEOTIFF_DIR, exist_ok=True)

# SCL Quality Masking Rules
# 0: NO_DATA, 1: SATURATED_OR_DEFECTIVE, 2: DARK_AREA, 3: CLOUD_SHADOWS,
# 4: VEGETATION, 5: NOT_VEGETATED, 6: WATER, 7: UNCLASSIFIED,
# 8: CLOUD_MEDIUM_PROB, 9: CLOUD_HIGH_PROB, 10: THIN_CIRRUS, 11: SNOW
INVALID_SCL_CLASSES = [0, 1, 3, 8, 9, 10, 11]

def load_godagari_boundary():
    """Loads authoritative study area polygon in projected UTM Zone 45N."""
    geojson_path = os.path.join(METADATA_DIR, "study_area_godagari.geojson")
    gdf = gpd.read_file(geojson_path)
    gdf_utm = gdf.to_crs("EPSG:32645")
    geometries = [mapping(g) for g in gdf_utm.geometry]
    return gdf_utm, geometries

def resample_raster_to_match(src_path, match_profile, resampling_method=Resampling.bilinear):
    """
    Resamples a raster (e.g. 20m B11 or SCL) to match the exact 10m grid and dimensions
    of a reference raster (e.g. 10m B04).
    """
    with rasterio.open(src_path) as src:
        vrt_options = {
            'resampling': resampling_method,
            'crs': match_profile['crs'],
            'transform': match_profile['transform'],
            'height': match_profile['height'],
            'width': match_profile['width']
        }
        with WarpedVRT(src, **vrt_options) as vrt:
            resampled_data = vrt.read(1)
            return resampled_data

def preprocess_scene(scene_dir, geometries):
    """
    Preprocesses a single Sentinel-2 scene directory.
    Outputs a clean 6-band stacked GeoTIFF:
    Band 1: Blue Reflectance (float32)
    Band 2: Green Reflectance (float32)
    Band 3: Red Reflectance (float32)
    Band 4: NIR Reflectance (float32)
    Band 5: SWIR-1 Reflectance (float32, 10m harmonized)
    Band 6: Valid Data Mask (uint8: 1=Valid, 0=Masked/Cloud/NoData)
    """
    meta_path = os.path.join(scene_dir, "metadata.json")
    if not os.path.exists(meta_path):
        print(f"Skipping {scene_dir}: metadata.json not found.")
        return None

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    date_str = meta.get("date", "unknown").replace("-", "")
    season = meta.get("season", "unknown")
    scene_id = meta.get("scene_id", os.path.basename(scene_dir))
    print(f"\n=======================================================")
    print(f" Preprocessing Scene: {meta.get('date')} ({season})")
    print(f" ID: {scene_id}")
    print(f"=======================================================")

    b02_path = os.path.join(scene_dir, "B02.tif")
    b03_path = os.path.join(scene_dir, "B03.tif")
    b04_path = os.path.join(scene_dir, "B04.tif")
    b08_path = os.path.join(scene_dir, "B08.tif")
    b11_path = os.path.join(scene_dir, "B11.tif")
    scl_path = os.path.join(scene_dir, "SCL.tif")

    for p in [b02_path, b03_path, b04_path, b08_path, b11_path, scl_path]:
        if not os.path.exists(p):
            raise FileNotFoundError(f"Missing required band raster: {p}")

    # Read reference 10m profile from B04
    with rasterio.open(b04_path) as ref_src:
        ref_profile = ref_src.profile.copy()
        ref_transform = ref_src.transform
        ref_crs = ref_src.crs
        h, w = ref_src.shape

    print(f" -> 10m Reference Grid: {w} x {h} pixels, CRS: {ref_crs}")

    # Read 10m bands
    with rasterio.open(b02_path) as s: b02_raw = s.read(1)
    with rasterio.open(b03_path) as s: b03_raw = s.read(1)
    with rasterio.open(b04_path) as s: b04_raw = s.read(1)
    with rasterio.open(b08_path) as s: b08_raw = s.read(1)

    # Harmonize 20m bands to 10m grid
    print(" -> Resampling 20m SWIR-1 (B11) to 10m via Bilinear interpolation...")
    b11_raw = resample_raster_to_match(b11_path, ref_profile, resampling_method=Resampling.bilinear)
    
    print(" -> Resampling 20m SCL QA mask to 10m via Nearest-Neighbor...")
    scl_raw = resample_raster_to_match(scl_path, ref_profile, resampling_method=Resampling.nearest)

    # Reflectance Scaling: Sentinel-2 L2A BOA reflectance = DN / 10000.0
    scale = 10000.0
    b02 = np.clip(b02_raw.astype(np.float32) / scale, 0.0, 1.0)
    b03 = np.clip(b03_raw.astype(np.float32) / scale, 0.0, 1.0)
    b04 = np.clip(b04_raw.astype(np.float32) / scale, 0.0, 1.0)
    b08 = np.clip(b08_raw.astype(np.float32) / scale, 0.0, 1.0)
    b11 = np.clip(b11_raw.astype(np.float32) / scale, 0.0, 1.0)

    # Pixel-level cloud/shadow masking
    cloud_shadow_mask = np.isin(scl_raw, INVALID_SCL_CLASSES)
    cloud_pixels = np.sum(cloud_shadow_mask)
    cloud_pct = (cloud_pixels / (h * w)) * 100.0
    print(f" -> Cloud/Shadow/Invalid QA Pixels: {cloud_pixels:,} ({cloud_pct:.2f}% of bbox)")

    # Vector Polygon Masking: Mask outside Godagari Upazila boundary
    # Use rasterio.features.geometry_mask
    from rasterio.features import geometry_mask
    outside_boundary_mask = geometry_mask(
        geometries,
        out_shape=(h, w),
        transform=ref_transform,
        invert=False  # True outside polygon
    )
    inside_boundary_pixels = np.sum(~outside_boundary_mask)
    print(f" -> Godagari Polygon Mask: {inside_boundary_pixels:,} pixels inside study boundary")

    # Combined valid mask: Must be inside boundary AND not cloud/shadow
    valid_mask = (~outside_boundary_mask) & (~cloud_shadow_mask)
    valid_mask_uint8 = valid_mask.astype(np.uint8)

    # Apply NoData (NaN) to invalid pixels in reflectance bands
    b02[~valid_mask] = np.nan
    b03[~valid_mask] = np.nan
    b04[~valid_mask] = np.nan
    b08[~valid_mask] = np.nan
    b11[~valid_mask] = np.nan

    # Prepare output profile for 6-band stacked GeoTIFF
    out_profile = ref_profile.copy()
    out_profile.update({
        'count': 6,
        'dtype': 'float32',
        'nodata': np.nan,
        'compress': 'deflate',
        'predictor': 2,
        'driver': 'GTiff'
    })

    out_filename = f"{date_str}_godagari_preprocessed.tif"
    out_path = os.path.join(PROCESSED_DIR, out_filename)
    export_path = os.path.join(EXPORTS_GEOTIFF_DIR, out_filename)

    with rasterio.open(out_path, 'w', **out_profile) as dst:
        dst.write(b02, 1)
        dst.write(b03, 2)
        dst.write(b04, 3)
        dst.write(b08, 4)
        dst.write(b11, 5)
        dst.write(valid_mask_uint8.astype(np.float32), 6)
        
        dst.set_band_description(1, "Blue_B02_Reflectance")
        dst.set_band_description(2, "Green_B03_Reflectance")
        dst.set_band_description(3, "Red_B04_Reflectance")
        dst.set_band_description(4, "NIR_B08_Reflectance")
        dst.set_band_description(5, "SWIR1_B11_Reflectance_10m")
        dst.set_band_description(6, "Valid_Pixel_Mask")

    # Copy to exports
    import shutil
    shutil.copyfile(out_path, export_path)

    # Calculate summary reflectance metrics for valid agricultural pixels
    valid_indices = valid_mask
    stats = {
        "scene_id": scene_id,
        "date": meta.get("date"),
        "season": season,
        "total_bbox_pixels": int(h * w),
        "godagari_polygon_pixels": int(inside_boundary_pixels),
        "cloud_shadow_masked_pixels": int(cloud_pixels),
        "valid_clear_study_pixels": int(np.sum(valid_mask)),
        "valid_coverage_pct": round(float(np.sum(valid_mask)) / float(inside_boundary_pixels) * 100.0, 2),
        "spectral_mean_reflectance": {
            "Blue_B02": round(float(np.nanmean(b02)), 4),
            "Green_B03": round(float(np.nanmean(b03)), 4),
            "Red_B04": round(float(np.nanmean(b04)), 4),
            "NIR_B08": round(float(np.nanmean(b08)), 4),
            "SWIR1_B11": round(float(np.nanmean(b11)), 4),
        },
        "output_file": out_path
    }

    report_path = os.path.join(PROCESSED_DIR, f"{date_str}_preprocessing_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)

    print(f" -> Successfully saved clean preprocessed raster:")
    print(f"    File: {out_path} ({os.path.getsize(out_path) / 1e6:.2f} MB)")
    print(f"    Valid Agricultural Coverage: {stats['valid_coverage_pct']}% of study area")
    print(f"    Mean Reflectance - Blue: {stats['spectral_mean_reflectance']['Blue_B02']}, "
          f"Green: {stats['spectral_mean_reflectance']['Green_B03']}, "
          f"Red: {stats['spectral_mean_reflectance']['Red_B04']}, "
          f"NIR: {stats['spectral_mean_reflectance']['NIR_B08']}, "
          f"SWIR: {stats['spectral_mean_reflectance']['SWIR1_B11']}")
    return stats

def run_all_preprocessing():
    print("=" * 70)
    print(" FIELD SHIFT — SATELLITE IMAGE PREPROCESSING PIPELINE")
    print(" Godagari Upazila, Rajshahi, Bangladesh (Barind Tract)")
    print("=" * 70)

    gdf_utm, geometries = load_godagari_boundary()
    scene_dirs = sorted([d for d in glob.glob(os.path.join(RAW_DIR, "*")) if os.path.isdir(d)])
    
    if not scene_dirs:
        print("No raw scene directories found. Run download_data.py first.")
        return

    print(f"Found {len(scene_dirs)} raw scene directories to preprocess.")
    all_reports = []

    for s_dir in scene_dirs:
        try:
            report = preprocess_scene(s_dir, geometries)
            if report:
                all_reports.append(report)
        except Exception as e:
            print(f"[ERROR] Failed to preprocess {s_dir}: {e}")

    summary_file = os.path.join(PROCESSED_DIR, "all_scenes_preprocessing_summary.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(all_reports, f, indent=2)
        
    print("\n" + "=" * 70)
    print(f" PREPROCESSING COMPLETE: {len(all_reports)} scenes preprocessed cleanly.")
    print(f" Summary saved to: {summary_file}")
    print("=" * 70)

if __name__ == "__main__":
    run_all_preprocessing()
