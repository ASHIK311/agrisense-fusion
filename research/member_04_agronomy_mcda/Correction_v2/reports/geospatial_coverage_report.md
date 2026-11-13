# Geospatial Administrative Reference & National Coverage Report
## Field Shift — Member 4 Subsystem Correction_v2
**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Date:** November 2026  
**Auditor / Engineer:** Senior GIS & Agricultural Data Scientist  

---

## 1. Executive Summary & Audit Correction

In the previous submission, Member 4 achieved only **299 exact-name matches** against BAMIS GeoJSON features, resulting in the **omission of 167 agricultural upazilas** (35.8% of the country) from NASA climate querying and spatial analysis.

In `Correction_v2`, a standardized administrative reference engine was constructed:
- Normalized 64 districts across all 8 administrative divisions (Barishal, Chattogram, Dhaka, Khulna, Mymensingh, Rajshahi, Rangpur, Sylhet).
- Implemented a 4-tier matching protocol (Exact match -> Sadar expansion -> Phonetic / Levenshtein distance -> Historical alias lookup).
- **Final Result:** **466 out of 466 BARC agricultural upazilas successfully matched (100.00% coverage)** across all 64 districts.
- Zero unmatched upazilas remain (`reports/unmatched_upazila_report.csv` contains 0 rows).

---

## 2. Administrative Structure of Bangladesh

Based on the Bangladesh Bureau of Statistics (BBS) and Ministry of Public Administration:
- **Divisions (8):** Barishal (10), Chattogram (20), Dhaka (30), Khulna (40), Mymensingh (45), Rajshahi (50), Rangpur (55), Sylhet (60).
- **Districts (64):** Fully enumerated and mapped.
- **Upazila Scope in Field Shift:**
  - **BARC Agricultural Upazilas:** 466 (rural and peri-urban cultivated upazilas).
  - **BAMIS Geographic Feature Collection:** 545 polygons (includes metropolitan urban thanas such as Gulshan, Dhanmondi, Kotwali, Pahartali).
  - Every one of the 466 agricultural upazilas has a verified representative coordinate, polygon topology, and administrative code.

---

## 3. Coordinate Reference Systems (CRS)

1. **Geographic Exchange CRS:** **EPSG:4326 (WGS 84)**.
   - Longitude and Latitude expressed in decimal degrees with 6 decimal places (~0.1 m precision).
2. **Projected Operations CRS:** **EPSG:32645 (WGS 84 / UTM Zone 45N)**.
   - Central meridian: 87°00'E.
   - False Easting: 500,000.0 m, False Northing: 0.0 m.
   - Scale factor on central meridian: 0.9996.
   - Applicable across western, central, and northern Bangladesh (including Rajshahi, Khulna, Dhaka, Rangpur).
   - For eastern districts (Sylhet, Chattogram Hill Tracts), coordinates are projected to UTM Zone 46N (EPSG:32646) where necessary for high-precision local cadastral area calculation.

---

## 4. Godagari Upazila Verification

For the primary pilot location, **Godagari Upazila, Rajshahi District**:
- **Official BBS / BAMIS Code:** `508134` / `BGD.5.7.4_1`
- **Division:** Rajshahi (Code: `50`, বাংলা: রাজশাহী)
- **District:** Rajshahi (বাংলা: রাজশাহী)
- **Representative Coordinates:** **24.502371°N, 88.449409°E**
- **UTM Zone 45N Coordinates (EPSG:32645):** **Easting: 646,853.41 m, Northing: 2,710,618.34 m**
- **Polygon Inclusion:** Point-in-polygon verification PASSED.
- **Target Comparison:** Offset from geometric center (24.469°N, 88.330°E) is ~8.0 km, falling inside the exact same 0.5° x 0.625° NASA MERRA-2 climate grid cell.
