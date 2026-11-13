# Ground Truth Cadastral Parcel Field Survey Schema
**Field Shift — Adapting Farms with NASA Data (NASA Space Apps Challenge 2026)**  
**Standard Operating Procedure & Data Dictionary for Crop Species Ground Truth Collection**  
**Target Region:** Godagari Upazila, Rajshahi District, Bangladesh (Barind Tract)  
**Schema Version:** 1.0 (March 2026)  

---

## 1. Survey Overview & Data Collection Mandate

To transition **Field Shift** from broad Land Cover classification (ESA WorldCover) to fine-grained crop species discrimination (Rice vs. Wheat vs. Maize vs. Mustard), direct in-situ field survey data is mandatory.

### Critical Methodological Rules:
1. **Never label satellite pixels through visual inference alone.** A green pixel in February can be Boro Rice, Late Wheat, Maize, or Winter Vegetables. Ground verification is essential.
2. **Collect parcel boundaries as closed polygons, NOT isolated centroid points.** Centroid points risk capturing field boundaries, irrigation channels, or tree edges when intersected with 10m Sentinel-2 pixels.
3. **Record observation date, planting date, and exact phenological growth stage.** Crop spectral signatures change dramatically every 10–14 days.

---

## 2. Parcel Geometry Specifications

* **Spatial Format:** GeoJSON (RFC 7946) or OGC GeoPackage (`.gpkg`).
* **Coordinate Reference System (CRS):**
  - Collection Device: WGS 84 (`EPSG:4326`) in decimal degrees with minimum 6 decimal places (approx. $\pm 0.1\text{ m}$ precision).
  - Storage & Analysis: Reprojected into WGS 84 / UTM Zone 45N (`EPSG:32645`) in meters.
* **Minimum Plot Size:** $> 0.1\text{ hectares}$ ($1,000\text{ m}^2$, corresponding to at least $10$ pure Sentinel-2 $10\text{ m} \times 10\text{ m}$ pixels).
* **Buffer Rule:** A 5-meter internal negative buffer is applied during spectral extraction to eliminate mixed boundary pixels (roads, ridges/ails, ditches).

---

## 3. Data Dictionary / Attribute Schema

| Field Name | Type | Mandatory | Allowed Values / Format | Description |
|:---|:---|:---:|:---|:---|
| `plot_id` | String(20) | Yes | `BD_RAJ_GOD_XXXXXX` | Unique parcel identifier |
| `union_name` | String(50) | Yes | `Deopara`, `Godagari`, `Gogram`, `Matikata`, `Mohanpur`, `Pakri`, `Rishikul`, `Char Ashariadaha` | Administrative Union within Godagari Upazila |
| `mouza_name` | String(50) | Yes | Text string | Cadastral revenue unit (Mouza name) |
| `jl_number` | Integer | Yes | Positive integer | Jurisdiction List (JL) Number from land registry |
| `survey_date` | Date | Yes | `YYYY-MM-DD` | Date when ground survey was conducted |
| `surveyor_id` | String(20) | Yes | Alphanumeric | DAE field agent or enumerator ID |
| `crop_category` | String(30) | Yes | `Cereal`, `Pulse`, `Oilseed`, `Horticulture`, `Fallow` | Broad agricultural category |
| `crop_species` | String(30) | Yes | `Boro_Rice`, `Aus_Rice`, `Aman_Rice`, `Wheat`, `Maize`, `Mustard`, `Lentil`, `Potato`, `Mango`, `Fallow` | Target primary crop species |
| `crop_variety` | String(50) | No | e.g., `BRRI dhan28`, `BRRI dhan29`, `BRRI dhan89`, `BARI Gom-30`, `Pioneer 3355` | Specific cultivar or hybrid breed |
| `cropping_season` | String(20) | Yes | `Rabi_2025_2026`, `Kharif_I_2026`, `Kharif_II_2026` | Formal agricultural season |
| `sowing_date` | Date | No | `YYYY-MM-DD` (or estimated week) | Approximate seed sowing or nursery date |
| `transplant_date`| Date | No | `YYYY-MM-DD` | Date transplanted into main field (Rice) |
| `phenology_stage`| String(30) | Yes | `Land_Prep_Puddled`, `Emergence`, `Vegetative`, `Tillering`, `Stem_Elongation`, `Booting_Heading`, `Flowering_Anthesis`, `Milking_Dough`, `Ripening_Maturity`, `Harvested_Stubble` | BBCH-scale aligned crop growth stage at time of survey |
| `canopy_cover_pct`| Integer | Yes | `0` to `100` | Estimated percentage of soil covered by crop canopy |
| `irrigation_type`| String(30) | Yes | `BMDA_Deep_Tubewell`, `Shallow_Tubewell`, `Canal_Surface`, `Pond_LLP`, `Rainfed` | Primary irrigation water source |
| `soil_moisture_visual`| String(20) | Yes | `Flooded_Standing_Water`, `Saturated_Muddy`, `Moist`, `Dry_Cracked` | Surface soil hydration state |
| `weed_infestation`| String(20) | No | `None`, `Low (<10%)`, `Moderate (10-30%)`, `Severe (>30%)` | Presence of non-crop vegetation |
| `photo_north` | String(100)| Yes | File path / URL | Geotagged JPEG looking North from parcel centroid |
| `photo_south` | String(100)| Yes | File path / URL | Geotagged JPEG looking South from parcel centroid |
| `qc_status` | String(20) | Yes | `Draft`, `Verified_DAE`, `Rejected_Inconsistent` | Data quality control sign-off |

---

## 4. Minimum Sample Size Target for Godagari Upazila

To achieve statistically robust training and evaluation without spatial overfitting, the following sample size quotas are established:

```
Target Crop Classes & Sample Quotas:
├── 1. Boro Rice: 400 parcels (Min 4,000 pure pixels)
├── 2. Wheat: 300 parcels (Min 3,000 pure pixels)
├── 3. Maize: 250 parcels (Min 2,500 pure pixels)
├── 4. Mustard/Oilseeds: 150 parcels (Min 1,500 pure pixels)
└── 5. Orchards/Mango: 100 parcels (Min 1,000 pure pixels)
Total: 1,200 parcels (Min 12,000 pure 10m pixels)
```

---

## 5. Storage Directory Structure in Workspace

```
data/
└── ground_truth/
    ├── raw_survey/
    │   ├── 2026_rabi_godagari_survey_v1.gpkg
    │   └── photos/
    │       ├── BD_RAJ_GOD_000101_N.jpg
    │       └── BD_RAJ_GOD_000101_S.jpg
    ├── processed/
    │   ├── godagari_parcels_utm45n.geojson
    │   └── godagari_parcels_buffered_negative5m.geojson
    └── schemas/
        └── ground_truth_schema.md
```
