"""
Field Shift — Task 4: Multi-Year Sentinel-2 Expansion Engine
NASA Space Apps Challenge 2026

Selects optimal, cloud-filtered Sentinel-2 L2A acquisitions across 3 agricultural years
(2022-23, 2023-24, 2024-25) over Godagari Upazila (Tile 45QWF).
Four canonical agricultural windows per year:
- Window 1: Kharif-II Aman Rice Peak (Oct 15 - Nov 15)
- Window 2: Post-Harvest / Early Boro Puddling (Dec 15 - Jan 15)
- Window 3: Rabi Peak Wheat / Boro Tillering (Feb 15 - Mar 15)
- Window 4: Pre-Kharif Aus / Boro Harvest (Apr 01 - Apr 30)
"""

import os
import sys
import json
import pystac_client
import planetary_computer as pc
import pandas as pd

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
METADATA_DIR = os.path.join(BASE_DIR, "data", "metadata")
EXPORTS_CSV = os.path.join(BASE_DIR, "exports", "csv")
os.makedirs(METADATA_DIR, exist_ok=True)
os.makedirs(EXPORTS_CSV, exist_ok=True)

# Godagari Bounding Box
BBOX = [88.303856, 24.363352, 88.552513, 24.601456]

# 3 Agricultural Years x 4 Seasonal Windows
SEASONAL_WINDOWS = [
    # Year 1: 2022 - 2023
    {"year_cycle": "2022-2023", "season": "Kharif_II_Aman", "start": "2022-10-15", "end": "2022-11-20"},
    {"year_cycle": "2022-2023", "season": "Post_Harvest_Early_Boro", "start": "2022-12-15", "end": "2023-01-20"},
    {"year_cycle": "2022-2023", "season": "Rabi_Winter_Wheat_Boro", "start": "2023-02-15", "end": "2023-03-20"},
    {"year_cycle": "2022-2023", "season": "Pre_Kharif_Aus", "start": "2023-04-01", "end": "2023-05-05"},
    
    # Year 2: 2023 - 2024 (Our Baseline Year)
    {"year_cycle": "2023-2024", "season": "Kharif_II_Aman", "start": "2023-10-15", "end": "2023-11-20"},
    {"year_cycle": "2023-2024", "season": "Post_Harvest_Early_Boro", "start": "2023-12-15", "end": "2024-01-20"},
    {"year_cycle": "2023-2024", "season": "Rabi_Winter_Wheat_Boro", "start": "2024-02-15", "end": "2024-03-20"},
    {"year_cycle": "2023-2024", "season": "Pre_Kharif_Aus", "start": "2024-04-01", "end": "2024-05-05"},
    
    # Year 3: 2024 - 2025
    {"year_cycle": "2024-2025", "season": "Kharif_II_Aman", "start": "2024-10-15", "end": "2024-11-20"},
    {"year_cycle": "2024-2025", "season": "Post_Harvest_Early_Boro", "start": "2024-12-15", "end": "2025-01-20"},
    {"year_cycle": "2024-2025", "season": "Rabi_Winter_Wheat_Boro", "start": "2025-02-15", "end": "2025-03-20"},
    {"year_cycle": "2024-2025", "season": "Pre_Kharif_Aus", "start": "2025-04-01", "end": "2025-05-05"},
]

def query_multi_year_stac():
    print("=" * 75)
    print(" TASK 4: MULTI-YEAR SENTINEL-2 EXPANSION (STAC DISCOVERY)")
    print("=" * 75)

    catalog = pystac_client.Client.open(
        "https://planetarycomputer.microsoft.com/api/stac/v1",
        modifier=pc.sign_inplace
    )

    selected_scenes = []

    print("\nQuerying Microsoft Planetary Computer STAC for Tile 45QWF across 12 seasonal windows...")
    for win in SEASONAL_WINDOWS:
        date_range = f"{win['start']}/{win['end']}"
        search = catalog.search(
            collections=["sentinel-2-l2a"],
            bbox=BBOX,
            datetime=date_range,
            query={"eo:cloud_cover": {"lt": 25}}
        )
        items = list(search.items())
        print(f" -> [{win['year_cycle']} | {win['season']}] ({date_range}): Found {len(items)} scenes")

        if not items:
            continue

        # Sort by cloud cover and select clearest acquisition
        items_sorted = sorted(items, key=lambda it: it.properties.get("eo:cloud_cover", 100))
        best_item = items_sorted[0]
        cloud_pct = best_item.properties.get("eo:cloud_cover", 0.0)
        dt = best_item.datetime.strftime("%Y-%m-%d")

        rec = {
            "year_cycle": win["year_cycle"],
            "season": win["season"],
            "target_window": date_range,
            "scene_id": best_item.id,
            "acquisition_date": dt,
            "cloud_cover_pct": round(float(cloud_pct), 2),
            "sun_elevation": round(float(best_item.properties.get("view:sun_elevation", 0.0)), 2),
            "mgrs_tile": best_item.properties.get("s2:mgrs_tile", "45QWF"),
            "platform": best_item.properties.get("platform", "Sentinel-2"),
            "required_bands": ["B02", "B03", "B04", "B08", "B11", "SCL"]
        }
        selected_scenes.append(rec)
        print(f"    ✓ Selected: {best_item.id} | Date: {dt} | Cloud: {cloud_pct:.1f}% | Sun Elev: {rec['sun_elevation']}°")

    df_multi = pd.DataFrame(selected_scenes)
    out_csv = os.path.join(EXPORTS_CSV, "multi_year_satellite_scenes.csv")
    df_multi.to_csv(out_csv, index=False)
    print(f"\nSaved Multi-Year Scene CSV: {out_csv}")

    out_json = os.path.join(METADATA_DIR, "multi_year_sentinel2_catalog.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(selected_scenes, f, indent=2)
    print(f"Saved Multi-Year STAC Catalog JSON: {out_json}")

    return df_multi

if __name__ == "__main__":
    query_multi_year_stac()
