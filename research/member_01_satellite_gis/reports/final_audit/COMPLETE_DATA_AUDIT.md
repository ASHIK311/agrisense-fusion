# Field Shift — Member 1 Satellite GIS: Complete Data Audit
**NASA Space Apps Challenge 2026**  
**Audit Scope:** Full File Inventory, Storage Footprint, and Satellite Provenance  

---

## 1. Storage Footprint by Asset Category
Based on the recursive workspace audit (`reports/complete_project_inventory.csv`):

| Category | File Count | Storage Used (MB) | Formats | Primary Location |
|:---|:---:|:---:|:---|:---|
| **Raw Satellite Imagery** | 24 | ~220 MB | GeoTIFF (.tif) | `data/raw/` |
| **Processed 6-Band Stacks** | 4 | 176.4 MB | GeoTIFF (.tif) | `data/processed/` |
| **Land Cover Labels** | 2 | 27.2 MB | GeoTIFF (.tif) | `data/labels/` |
| **Vegetation Indices** | 16 | 110.8 MB | GeoTIFF (.tif) | `indices/` |
| **Cartographic Maps & PNGs**| 23 | ~38 MB | PNG (.png) | `exports/visualizations/` |
| **ML Model Binaries** | 3 | 48.5 MB | Joblib (.pkl) | `models/` |
| **Metadata & GeoJSON** | 8 | 1.8 MB | JSON, GeoJSON | `data/metadata/`, `exports/geojson/` |
| **CSVs & Reports** | 24 | 4.2 MB | CSV, Markdown | `reports/`, `exports/csv/` |
| **Total Project Assets** | **144+** | **~626 MB** | — | — |

## 2. Satellite Data Provenance Summary
* **Sentinel-2 MSI Level-2A:** Cataloged 407 scenes covering MGRS Tile `45QWF` (2021–2026). Ingested 4 canonical cloud-free scenes:
  - `2023-10-26` (Kharif-Aman monsoon rice peak, 1.2% cloud)
  - `2023-12-25` (Post-harvest fallow / early Boro nursery, 0.4% cloud)
  - `2024-02-28` (Peak Rabi winter wheat & irrigated Boro, 0.1% cloud)
  - `2024-04-13` (Pre-Kharif Aus emergence / Boro harvest, 2.5% cloud)
* **Landsat 8/9 Collection 2 L2:** Cataloged 209 scenes (Path 138, Row 43). 0 scenes downloaded locally due to Sentinel-2's higher spatial resolution (10m vs. 30m). Documented with full transparency.
* **ESA WorldCover 10m v200 (2021):** Global 10m land cover raster. Reprojected to EPSG:32645 and strictly clipped to Godagari administrative boundary polygon.
