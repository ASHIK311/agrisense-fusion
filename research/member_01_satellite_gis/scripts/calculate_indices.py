"""
Vegetation and Moisture Indices Calculation Pipeline
Project: Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)
Member 1: Satellite Image Processing, Remote Sensing & GIS Analysis

Indices Computed:
1. NDVI (Normalized Difference Vegetation Index):
   NDVI = (NIR - Red) / (NIR + Red)
   Sentinel-2 Bands: NIR = B08 (842nm), Red = B04 (665nm)
   Application: Green biomass, canopy photosynthetic capacity, vegetative vigor.

2. NDWI (Normalized Difference Water Index - McFeeters 1996):
   NDWI_McFeeters = (Green - NIR) / (Green + NIR)
   Sentinel-2 Bands: Green = B03 (560nm), NIR = B08 (842nm)
   Application: Open surface water delineation, Boro rice wetland flooding, irrigation ponds.

3. NDMI / NDWI_Gao (Normalized Difference Moisture Index - Gao 1996):
   NDMI = (NIR - SWIR1) / (NIR + SWIR1)
   Sentinel-2 Bands: NIR = B08 (842nm), SWIR1 = B11 (1610nm)
   Application: Canopy water content, plant water stress, soil surface dryness.

4. EVI (Enhanced Vegetation Index - Huete et al. 2002):
   EVI = 2.5 * (NIR - Red) / (NIR + 6.0 * Red - 7.5 * Blue + 1.0)
   Sentinel-2 Bands: NIR = B08, Red = B04, Blue = B02 (490nm)
   Application: Dense canopy biomass without saturation; reduces atmospheric & soil background noise.
"""

import os
import sys
import json
import glob
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import rasterio

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
INDICES_DIR = os.path.join(BASE_DIR, "indices")
NDVI_DIR = os.path.join(INDICES_DIR, "NDVI")
NDWI_DIR = os.path.join(INDICES_DIR, "NDWI")
EVI_DIR = os.path.join(INDICES_DIR, "EVI")
MAPS_VEG_DIR = os.path.join(BASE_DIR, "maps", "vegetation")
EXPORTS_GEOTIFF = os.path.join(BASE_DIR, "exports", "geotiff")
EXPORTS_CSV = os.path.join(BASE_DIR, "exports", "csv")
EXPORTS_VIS = os.path.join(BASE_DIR, "exports", "visualizations")

for d in [NDVI_DIR, NDWI_DIR, EVI_DIR, MAPS_VEG_DIR, EXPORTS_GEOTIFF, EXPORTS_CSV, EXPORTS_VIS]:
    os.makedirs(d, exist_ok=True)

def save_index_raster(array, profile, out_path, desc):
    """Saves a single-band index raster as a GeoTIFF."""
    prof = profile.copy()
    prof.update({
        'count': 1,
        'dtype': 'float32',
        'nodata': np.nan,
        'compress': 'deflate',
        'predictor': 3,
        'driver': 'GTiff'
    })
    with rasterio.open(out_path, 'w', **prof) as dst:
        dst.write(array.astype(np.float32), 1)
        dst.set_band_description(1, desc)

def plot_and_save_index_map(array, index_name, date_str, season, out_png, vmin=-0.2, vmax=0.8, cmap='RdYlGn'):
    """Generates a high-resolution cartographic visualization with scale bar and metadata."""
    fig, ax = plt.subplots(figsize=(10, 8), dpi=200)
    
    # Custom background color for figure
    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#1e293b')
    
    im = ax.imshow(array, cmap=cmap, vmin=vmin, vmax=vmax)
    
    # Title and subtitle
    plt.title(f"Field Shift — {index_name}\nGodagari Upazila, Rajshahi (Barind Tract) | Date: {date_str} ({season})",
              fontsize=13, fontweight='bold', color='#f8fafc', pad=15)
    
    # Colorbar
    cbar = plt.colorbar(im, ax=ax, fraction=0.035, pad=0.04)
    cbar.set_label(f"{index_name} Value", color='#e2e8f0', fontsize=11, labelpad=10)
    cbar.ax.yaxis.set_tick_params(color='#cbd5e1')
    plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='#e2e8f0')
    
    # Remove pixel ticks for clean map display
    ax.set_xticks([])
    ax.set_yticks([])
    
    # Informational footer
    footer_text = f"Spatial Resolution: 10m | Sentinel-2 L2A Surface Reflectance | CRS: EPSG:32645 (UTM 45N)\nAgriSense Fusion Remote Sensing Engine"
    plt.figtext(0.5, 0.03, footer_text, ha='center', fontsize=8, color='#94a3b8')
    
    plt.tight_layout()
    plt.savefig(out_png, facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
    plt.close()

def compute_zonal_stats(index_array, valid_mask, name):
    """Calculates robust statistical metrics for valid agricultural pixels."""
    valid_vals = index_array[valid_mask & ~np.isnan(index_array)]
    if len(valid_vals) == 0:
        return {}
    
    return {
        f"{name}_mean": round(float(np.mean(valid_vals)), 4),
        f"{name}_median": round(float(np.median(valid_vals)), 4),
        f"{name}_std": round(float(np.std(valid_vals)), 4),
        f"{name}_min": round(float(np.min(valid_vals)), 4),
        f"{name}_max": round(float(np.max(valid_vals)), 4),
        f"{name}_p10": round(float(np.percentile(valid_vals, 10)), 4),
        f"{name}_p90": round(float(np.percentile(valid_vals, 90)), 4),
    }

def process_all_indices():
    print("=" * 70)
    print(" FIELD SHIFT — VEGETATION & MOISTURE INDICES ENGINE")
    print(" Computing NDVI, NDWI (McFeeters), NDMI (Gao), and EVI")
    print("=" * 70)

    preprocessed_files = sorted(glob.glob(os.path.join(PROCESSED_DIR, "*_godagari_preprocessed.tif")))
    if not preprocessed_files:
        print("No preprocessed files found in data/processed/. Run preprocess.py first.")
        return

    timeseries_records = []

    for pf in preprocessed_files:
        filename = os.path.basename(pf)
        date_str = filename.split("_")[0]  # e.g. '20240228'
        formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        
        # Read metadata report if available
        report_file = os.path.join(PROCESSED_DIR, f"{date_str}_preprocessing_report.json")
        season = "Unknown"
        if os.path.exists(report_file):
            with open(report_file, "r") as rf:
                s_meta = json.load(rf)
                season = s_meta.get("season", "Unknown")

        print(f"\nComputing Indices for {formatted_date} ({season})...")

        with rasterio.open(pf) as src:
            profile = src.profile.copy()
            b02_blue = src.read(1)
            b03_green = src.read(2)
            b04_red = src.read(3)
            b08_nir = src.read(4)
            b11_swir = src.read(5)
            valid_mask = (src.read(6) == 1)

        # 1. NDVI = (NIR - Red) / (NIR + Red)
        denom_ndvi = b08_nir + b04_red
        ndvi = np.where(denom_ndvi > 0, (b08_nir - b04_red) / (denom_ndvi + 1e-7), np.nan)
        ndvi[~valid_mask] = np.nan
        ndvi = np.clip(ndvi, -1.0, 1.0)

        # 2. NDWI (McFeeters 1996 for Water Delineation) = (Green - NIR) / (Green + NIR)
        denom_ndwi = b03_green + b08_nir
        ndwi_mcfeeters = np.where(denom_ndwi > 0, (b03_green - b08_nir) / (denom_ndwi + 1e-7), np.nan)
        ndwi_mcfeeters[~valid_mask] = np.nan
        ndwi_mcfeeters = np.clip(ndwi_mcfeeters, -1.0, 1.0)

        # 3. NDMI / NDWI (Gao 1996 for Canopy Moisture) = (NIR - SWIR) / (NIR + SWIR)
        denom_ndmi = b08_nir + b11_swir
        ndmi_gao = np.where(denom_ndmi > 0, (b08_nir - b11_swir) / (denom_ndmi + 1e-7), np.nan)
        ndmi_gao[~valid_mask] = np.nan
        ndmi_gao = np.clip(ndmi_gao, -1.0, 1.0)

        # 4. EVI = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)
        denom_evi = b08_nir + (6.0 * b04_red) - (7.5 * b02_blue) + 1.0
        evi = np.where(denom_evi != 0, 2.5 * (b08_nir - b04_red) / denom_evi, np.nan)
        evi[~valid_mask] = np.nan
        evi = np.clip(evi, -1.0, 1.5)

        # Save GeoTIFFs
        ndvi_tif = os.path.join(NDVI_DIR, f"{date_str}_NDVI.tif")
        ndwi_tif = os.path.join(NDWI_DIR, f"{date_str}_NDWI_McFeeters.tif")
        ndmi_tif = os.path.join(NDWI_DIR, f"{date_str}_NDMI_Gao.tif")
        evi_tif = os.path.join(EVI_DIR, f"{date_str}_EVI.tif")

        save_index_raster(ndvi, profile, ndvi_tif, "Sentinel-2 NDVI")
        save_index_raster(ndwi_mcfeeters, profile, ndwi_tif, "Sentinel-2 NDWI McFeeters")
        save_index_raster(ndmi_gao, profile, ndmi_tif, "Sentinel-2 NDMI Gao Moisture")
        save_index_raster(evi, profile, evi_tif, "Sentinel-2 EVI")

        # Copy to exports/geotiff
        import shutil
        shutil.copyfile(ndvi_tif, os.path.join(EXPORTS_GEOTIFF, f"{date_str}_NDVI.tif"))
        shutil.copyfile(ndwi_tif, os.path.join(EXPORTS_GEOTIFF, f"{date_str}_NDWI_McFeeters.tif"))
        shutil.copyfile(ndmi_tif, os.path.join(EXPORTS_GEOTIFF, f"{date_str}_NDMI_Gao.tif"))
        shutil.copyfile(evi_tif, os.path.join(EXPORTS_GEOTIFF, f"{date_str}_EVI.tif"))

        # Generate Visualizations
        ndvi_png = os.path.join(EXPORTS_VIS, f"{date_str}_NDVI_map.png")
        ndwi_png = os.path.join(EXPORTS_VIS, f"{date_str}_NDWI_McFeeters_map.png")
        ndmi_png = os.path.join(EXPORTS_VIS, f"{date_str}_NDMI_Moisture_map.png")
        evi_png = os.path.join(EXPORTS_VIS, f"{date_str}_EVI_map.png")

        plot_and_save_index_map(ndvi, "NDVI (Normalized Difference Vegetation Index)", formatted_date, season, ndvi_png, vmin=-0.1, vmax=0.85, cmap='RdYlGn')
        plot_and_save_index_map(ndwi_mcfeeters, "NDWI (McFeeters 1996 Open Water Index)", formatted_date, season, ndwi_png, vmin=-0.7, vmax=0.5, cmap='Blues_r')
        plot_and_save_index_map(ndmi_gao, "NDMI (Gao 1996 Canopy Moisture Index)", formatted_date, season, ndmi_png, vmin=-0.4, vmax=0.6, cmap='YlGnBu')
        plot_and_save_index_map(evi, "EVI (Enhanced Vegetation Index)", formatted_date, season, evi_png, vmin=-0.1, vmax=0.8, cmap='YlGn')

        # Also save copy to maps/vegetation
        shutil.copyfile(ndvi_png, os.path.join(MAPS_VEG_DIR, f"{date_str}_NDVI_map.png"))
        shutil.copyfile(evi_png, os.path.join(MAPS_VEG_DIR, f"{date_str}_EVI_map.png"))

        # Compute Statistics
        stats_ndvi = compute_zonal_stats(ndvi, valid_mask, "NDVI")
        stats_ndwi = compute_zonal_stats(ndwi_mcfeeters, valid_mask, "NDWI_McFeeters")
        stats_ndmi = compute_zonal_stats(ndmi_gao, valid_mask, "NDMI_Gao")
        stats_evi = compute_zonal_stats(evi, valid_mask, "EVI")

        row = {
            "date": formatted_date,
            "season": season,
            **stats_ndvi,
            **stats_ndwi,
            **stats_ndmi,
            **stats_evi
        }
        timeseries_records.append(row)

        print(f" -> {formatted_date}: NDVI Mean={stats_ndvi.get('NDVI_mean')}, EVI Mean={stats_evi.get('EVI_mean')}, NDMI Moisture={stats_ndmi.get('NDMI_Gao_mean')}")

    # Save CSV Summary
    df_ts = pd.DataFrame(timeseries_records)
    df_ts = df_ts.sort_values(by="date").reset_index(drop=True)
    csv_path = os.path.join(EXPORTS_CSV, "vegetation_indices_timeseries.csv")
    df_ts.to_csv(csv_path, index=False)
    print(f"\nSaved vegetation indices time-series summary to: {csv_path}")

    # Generate summary JSON
    json_path = os.path.join(INDICES_DIR, "indices_summary.json")
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(timeseries_records, jf, indent=2)

    print("=" * 70)
    print(" VEGETATION INDEX COMPUTATION COMPLETE")
    print(f" - NDVI GeoTIFFs: {len(preprocessed_files)} saved in indices/NDVI/ and exports/geotiff/")
    print(f" - NDWI GeoTIFFs: {len(preprocessed_files)} saved in indices/NDWI/ and exports/geotiff/")
    print(f" - EVI GeoTIFFs:  {len(preprocessed_files)} saved in indices/EVI/ and exports/geotiff/")
    print(f" - High-res maps: 16 visualization PNGs saved in exports/visualizations/")
    print("=" * 70)

if __name__ == "__main__":
    process_all_indices()
