"""
Satellite Data Discovery, Cataloging, and ROI Window Extraction
Project: Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)
Member 1: Satellite Image Processing, Remote Sensing & GIS Analysis

Sources:
- Sentinel-2 Level-2A (Copernicus / Microsoft Planetary Computer STAC / Element84 Earth Search)
- Landsat Collection 2 Level-2 Surface Reflectance (USGS / Planetary Computer STAC)
- ESA WorldCover 10m v200 (ESA / Planetary Computer STAC)
"""

import os
import sys
import json
import time
import certifi
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

# Reconfigure stdout/stderr to UTF-8 for Windows PowerShell/CMD
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import numpy as np
import pandas as pd
import geopandas as gpd
from datetime import datetime
from shapely.geometry import box, shape

# Geospatial libraries
import rasterio
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
import pyproj
from pystac_client import Client
import planetary_computer as pc

# Ensure GDAL & SSL environment configuration
os.environ['CURL_CA_BUNDLE'] = certifi.where()
os.environ['GDAL_DISABLE_READDIR_ON_OPEN'] = 'EMPTY_DIR'
os.environ['GDAL_HTTP_MAX_RETRY'] = '3'
os.environ['GDAL_HTTP_TIMEOUT'] = '30'

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
METADATA_DIR = os.path.join(DATA_DIR, "metadata")
LABELS_DIR = os.path.join(DATA_DIR, "labels")

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(METADATA_DIR, exist_ok=True)
os.makedirs(LABELS_DIR, exist_ok=True)

STAC_ENDPOINT = "https://planetarycomputer.microsoft.com/api/stac/v1"

def load_study_area():
    """Loads Godagari Upazila GeoJSON boundary and returns bounds."""
    geojson_path = os.path.join(METADATA_DIR, "study_area_godagari.geojson")
    if not os.path.exists(geojson_path):
        raise FileNotFoundError(f"Study area boundary missing at {geojson_path}. Run study_area.py first.")
    
    gdf = gpd.read_file(geojson_path)
    gdf_utm = gdf.to_crs("EPSG:32645")
    wgs84_bounds = list(gdf.total_bounds)      # [minx, miny, maxx, maxy] in EPSG:4326
    utm_bounds = list(gdf_utm.total_bounds)    # [minx, miny, maxx, maxy] in EPSG:32645
    return gdf, gdf_utm, wgs84_bounds, utm_bounds

def catalog_sentinel2_scenes(catalog, bbox, date_range="2021-01-01/2026-03-31", max_cloud=20):
    """
    Catalogs all available Sentinel-2 L2A scenes over Godagari with metadata.
    """
    print(f"\n[1/4] Cataloging Sentinel-2 Level-2A scenes (Date: {date_range}, Max Cloud: {max_cloud}%)...")
    search = catalog.search(
        collections=["sentinel-2-l2a"],
        bbox=bbox,
        datetime=date_range,
        query={"eo:cloud_cover": {"lt": max_cloud}}
    )
    items = list(search.items())
    print(f" -> Found {len(items)} matching Sentinel-2 scenes.")

    records = []
    for it in items:
        props = it.properties
        records.append({
            "scene_id": it.id,
            "platform": props.get("platform", "Sentinel-2"),
            "datetime": it.datetime.isoformat() if it.datetime else None,
            "date": it.datetime.strftime("%Y-%m-%d") if it.datetime else None,
            "year": it.datetime.year if it.datetime else None,
            "month": it.datetime.month if it.datetime else None,
            "cloud_cover_pct": round(props.get("eo:cloud_cover", 0.0), 2),
            "tile_id": props.get("s2:mgrs_tile", "45RXH"),
            "sun_elevation": round(props.get("view:sun_elevation", 0.0), 2),
            "sun_azimuth": round(props.get("view:sun_azimuth", 0.0), 2),
            "processing_baseline": props.get("s2:processing_baseline", "unknown"),
            "b02_url": it.assets.get("B02", {}).href if "B02" in it.assets else None,
            "b03_url": it.assets.get("B03", {}).href if "B03" in it.assets else None,
            "b04_url": it.assets.get("B04", {}).href if "B04" in it.assets else None,
            "b08_url": it.assets.get("B08", {}).href if "B08" in it.assets else None,
            "b11_url": it.assets.get("B11", {}).href if "B11" in it.assets else None,
            "scl_url": it.assets.get("SCL", {}).href if "SCL" in it.assets else None,
        })
    
    df = pd.DataFrame(records)
    if not df.empty:
        df = df.sort_values(by="datetime", ascending=False).reset_index(drop=True)
        csv_path = os.path.join(METADATA_DIR, "sentinel2_scenes_catalog.csv")
        df.to_csv(csv_path, index=False)
        print(f" -> Saved Sentinel-2 catalog to {csv_path} ({len(df)} rows)")
    return items, df

def catalog_landsat_scenes(catalog, bbox, date_range="2021-01-01/2026-03-31", max_cloud=20):
    """
    Catalogs all available Landsat Collection 2 Level-2 scenes over Godagari.
    """
    print(f"\n[2/4] Cataloging Landsat 8/9 Collection 2 Level-2 scenes...")
    search = catalog.search(
        collections=["landsat-c2-l2"],
        bbox=bbox,
        datetime=date_range,
        query={"eo:cloud_cover": {"lt": max_cloud}}
    )
    items = list(search.items())
    print(f" -> Found {len(items)} matching Landsat scenes.")

    records = []
    for it in items:
        props = it.properties
        records.append({
            "scene_id": it.id,
            "platform": props.get("platform", "Landsat"),
            "instruments": ",".join(props.get("instruments", [])),
            "datetime": it.datetime.isoformat() if it.datetime else None,
            "date": it.datetime.strftime("%Y-%m-%d") if it.datetime else None,
            "year": it.datetime.year if it.datetime else None,
            "month": it.datetime.month if it.datetime else None,
            "cloud_cover_pct": round(props.get("eo:cloud_cover", 0.0), 2),
            "path": props.get("landsat:wrs_path"),
            "row": props.get("landsat:wrs_row"),
            "sun_elevation": round(props.get("view:sun_elevation", 0.0), 2),
            "sun_azimuth": round(props.get("view:sun_azimuth", 0.0), 2),
            "red_url": it.assets.get("red", {}).href if "red" in it.assets else None,
            "green_url": it.assets.get("green", {}).href if "green" in it.assets else None,
            "blue_url": it.assets.get("blue", {}).href if "blue" in it.assets else None,
            "nir08_url": it.assets.get("nir08", {}).href if "nir08" in it.assets else None,
            "swir16_url": it.assets.get("swir16", {}).href if "swir16" in it.assets else None,
            "qa_pixel_url": it.assets.get("qa_pixel", {}).href if "qa_pixel" in it.assets else None,
        })
    
    df = pd.DataFrame(records)
    if not df.empty:
        df = df.sort_values(by="datetime", ascending=False).reset_index(drop=True)
        csv_path = os.path.join(METADATA_DIR, "landsat_scenes_catalog.csv")
        df.to_csv(csv_path, index=False)
        print(f" -> Saved Landsat catalog to {csv_path} ({len(df)} rows)")
    return items, df

def download_esa_worldcover(catalog, bbox, utm_bounds):
    """
    Downloads ESA WorldCover 10m land cover raster clipped to Godagari Upazila bounds.
    Classes:
    10: Tree cover, 20: Shrubland, 30: Grassland, 40: Cropland,
    50: Built-up, 60: Bare / sparse vegetation, 70: Snow and ice,
    80: Permanent water bodies, 90: Herbaceous wetland, 95: Mangroves, 100: Moss and lichen.
    """
    print(f"\n[3/4] Fetching ESA WorldCover 10m Land Cover reference layer...")
    out_path = os.path.join(LABELS_DIR, "esa_worldcover_godagari.tif")
    if os.path.exists(out_path):
        print(f" -> ESA WorldCover already downloaded: {out_path}")
        return out_path

    search = catalog.search(
        collections=["esa-worldcover"],
        bbox=bbox
    )
    items = list(search.items())
    if not items:
        print(" ! No ESA WorldCover item found.")
        return None

    # Get 2021 v200 item
    item = items[0]
    map_url = item.assets["map"].href
    
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"):
        with rasterio.open(map_url) as src:
            # Transform UTM bounds to source CRS (EPSG:4326 for WorldCover)
            transformer = pyproj.Transformer.from_crs("EPSG:32645", src.crs, always_xy=True)
            minx, miny = transformer.transform(utm_bounds[0], utm_bounds[1])
            maxx, maxy = transformer.transform(utm_bounds[2], utm_bounds[3])
            
            window = from_bounds(minx, miny, maxx, maxy, src.transform)
            window = window.round_offsets().round_lengths()
            win_transform = rasterio.windows.transform(window, src.transform)
            data = src.read(1, window=window)
            
            profile = src.profile.copy()
            profile.update({
                "height": data.shape[0],
                "width": data.shape[1],
                "transform": win_transform,
                "compress": "lzw"
            })
            
            with rasterio.open(out_path, "w", **profile) as dst:
                dst.write(data, 1)
                
    print(f" -> Successfully saved ESA WorldCover GeoTIFF to: {out_path} (Shape: {data.shape})")
    return out_path

def extract_single_band(item, band, utm_bounds, out_band_file):
    """Worker to extract a single band window."""
    if os.path.exists(out_band_file):
        return band, out_band_file, True, 0.0
    
    if band not in item.assets:
        return band, None, False, 0.0

    asset_url = item.assets[band].href
    t0 = time.time()
    try:
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"):
            with rasterio.open(asset_url) as src:
                window = from_bounds(utm_bounds[0], utm_bounds[1], utm_bounds[2], utm_bounds[3], src.transform)
                window = window.round_offsets().round_lengths()
                win_transform = rasterio.windows.transform(window, src.transform)
                
                data = src.read(1, window=window)
                
                profile = src.profile.copy()
                profile.update({
                    "height": data.shape[0],
                    "width": data.shape[1],
                    "transform": win_transform,
                    "compress": "deflate",
                    "driver": "GTiff"
                })

                with rasterio.open(out_band_file, "w", **profile) as dst:
                    dst.write(data, 1)

                elapsed = time.time() - t0
                return band, out_band_file, True, elapsed
    except Exception as e:
        print(f"   [ERROR] Failed to extract {band}: {e}")
        return band, None, False, time.time() - t0

def download_sentinel2_roi_scenes(s2_items, utm_bounds, target_dates_per_season=1):
    """
    Selects representative cloud-free Sentinel-2 scenes across 4 agricultural seasons
    and downloads ROI window bands in parallel:
    - B02 (Blue 10m), B03 (Green 10m), B04 (Red 10m), B08 (NIR 10m), B11 (SWIR-1 20m), SCL (20m)
    """
    print("\n[4/4] Extracting multi-temporal ROI Sentinel-2 scenes across agricultural seasons...")
    
    # Filter candidate scenes with < 2% cloud cover and matching primary MGRS tile 45RXH
    clear_items = [
        it for it in s2_items 
        if it.properties.get("eo:cloud_cover", 100) < 2.0 and it.properties.get("s2:mgrs_tile") == "45RXH"
    ]
    
    # Target 4 key seasonal representations:
    # 1. Rabi Peak (Feb/Mar): Peak Wheat / Maize heading & Boro vegetative
    # 2. Pre-Kharif (Apr/May): Boro harvest & Aus sowing
    # 3. Kharif-2 (Sep/Oct): Aman monsoon rice peak vegetative vigor & water inundation
    # 4. Post-Harvest (Nov/Dec): Aman harvest & Rabi soil preparation
    season_definitions = [
        ("Rabi_Winter", [2, 3], 2024),
        ("Pre_Kharif_Aus", [4, 5], 2024),
        ("Kharif_Aman", [9, 10], 2023),
        ("Post_Harvest_Rabi", [11, 12], 2023),
    ]
    
    selected_scenes = []
    picked_ids = set()
    for s_name, months, pref_year in season_definitions:
        # First try preferred year
        cands = [it for it in clear_items if it.datetime.year == pref_year and it.datetime.month in months]
        if not cands:
            # Fallback to any year
            cands = [it for it in clear_items if it.datetime.month in months]
        
        cands.sort(key=lambda x: x.properties.get("eo:cloud_cover", 100))
        for cand in cands:
            if cand.id not in picked_ids:
                selected_scenes.append((s_name, cand))
                picked_ids.add(cand.id)
                break

    # Sort selected scenes chronologically
    selected_scenes.sort(key=lambda x: x[1].datetime)

    print(f" -> Selected {len(selected_scenes)} canonical multi-temporal scenes for ROI window extraction:")
    for s_name, it in selected_scenes:
        print(f"    * {it.datetime.strftime('%Y-%m-%d')} ({s_name}): Cloud {it.properties.get('eo:cloud_cover'):.2f}%, ID: {it.id}")

    bands_to_extract = ["B02", "B03", "B04", "B08", "B11", "SCL"]
    extracted_manifest = []

    for s_name, item in selected_scenes:
        date_str = item.datetime.strftime("%Y%m%d")
        scene_dir = os.path.join(RAW_DIR, f"{date_str}_{item.id[:20]}")
        os.makedirs(scene_dir, exist_ok=True)
        
        meta_json_path = os.path.join(scene_dir, "metadata.json")
        scene_manifest = {
            "scene_id": item.id,
            "date": item.datetime.strftime("%Y-%m-%d"),
            "season": s_name,
            "cloud_cover_pct": item.properties.get("eo:cloud_cover"),
            "sun_elevation": item.properties.get("view:sun_elevation"),
            "bands": {}
        }

        # Check if already fully downloaded
        all_bands_exist = all(os.path.exists(os.path.join(scene_dir, f"{b}.tif")) for b in bands_to_extract)
        if all_bands_exist and os.path.exists(meta_json_path):
            print(f" -> Scene {date_str} ({s_name}) already complete at {scene_dir}")
            for b in bands_to_extract:
                scene_manifest["bands"][b] = os.path.join(scene_dir, f"{b}.tif")
            extracted_manifest.append(scene_manifest)
            continue

        print(f"\n --- Extracting ROI bands in parallel for Scene {date_str} ({s_name}) ---")
        
        # Parallel extraction of bands
        futures = []
        with ThreadPoolExecutor(max_workers=4) as executor:
            for band in bands_to_extract:
                out_band_file = os.path.join(scene_dir, f"{band}.tif")
                futures.append(executor.submit(extract_single_band, item, band, utm_bounds, out_band_file))

            for fut in as_completed(futures):
                band, out_file, success, elapsed = fut.result()
                if success and out_file:
                    print(f"   [OK] Band {band} ready ({elapsed:.2f}s) -> {os.path.basename(out_file)}")
                    scene_manifest["bands"][band] = out_file

        with open(meta_json_path, "w", encoding="utf-8") as f:
            json.dump(scene_manifest, f, indent=2)
            
        extracted_manifest.append(scene_manifest)

    # Save manifest
    manifest_file = os.path.join(METADATA_DIR, "download_manifest.json")
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(extracted_manifest, f, indent=2)
    print(f"\nSaved complete extraction manifest to: {manifest_file}")
    return extracted_manifest

def run_pipeline():
    print("=" * 70)
    print(" FIELD SHIFT — SATELLITE DATA COLLECTION & ROI EXTRACTION PIPELINE")
    print(" Study Area: Godagari Upazila, Rajshahi, Bangladesh (Barind Tract)")
    print("=" * 70)
    
    gdf, gdf_utm, wgs84_bounds, utm_bounds = load_study_area()
    print(f"Study Area WGS84 Bounding Box: {wgs84_bounds}")
    print(f"Study Area UTM Bounding Box: {utm_bounds}")

    # Open STAC client with signed SAS modifier
    catalog = Client.open(STAC_ENDPOINT, modifier=pc.sign_inplace)

    # 1. Catalog Sentinel-2
    s2_items, s2_df = catalog_sentinel2_scenes(catalog, wgs84_bounds)

    # 2. Catalog Landsat
    ls_items, ls_df = catalog_landsat_scenes(catalog, wgs84_bounds)

    # 3. Download ESA WorldCover
    wc_path = download_esa_worldcover(catalog, wgs84_bounds, utm_bounds)

    # 4. Download multi-temporal Sentinel-2 ROI bands
    extracted = download_sentinel2_roi_scenes(s2_items, utm_bounds, target_dates_per_season=2)

    print("\n" + "=" * 70)
    print(f" DATA COLLECTION SUMMARY:")
    print(f" - Sentinel-2 Catalogued: {len(s2_df)} scenes recorded in metadata CSV")
    print(f" - Landsat Catalogued:    {len(ls_df)} scenes recorded in metadata CSV")
    print(f" - ESA WorldCover Layer:  {'Downloaded' if wc_path else 'Failed'}")
    print(f" - Sentinel-2 ROI Scenes: {len(extracted)} multi-temporal scenes extracted locally")
    print("=" * 70)

if __name__ == "__main__":
    run_pipeline()
