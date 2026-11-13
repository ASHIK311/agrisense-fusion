# Field Shift — Member 1: Comprehensive Data Quality & Integrity Audit

**Study Area:** Godagari Upazila, Rajshahi, Bangladesh (445.69 km², EPSG:32645)

---

## 1. Spatial & Preprocessing Integrity

- **Satellite Sensor:** Copernicus Sentinel-2 MSI Level-2A BOA Surface Reflectance.
- **Scenes:** 12 verified scenes spanning 2022 to 2025 across all four Barind phenological seasons.
- **Band Alignment:** 5 spectral bands (B02, B03, B04, B08 at 10m; B11 at 20m resampled to 10m via bilinear interpolation).
- **Spatial Resolution Disclosure:** B11 (SWIR1) was bilinearly resampled to 10m grid. In strict accordance with scientific integrity rules, it is explicitly disclosed that **resampling B11 does NOT create genuine 10m spatial information**.
- **Cloud Masking:** Scene Classification Layer (SCL) filters all cloud, cirrus, and shadow pixels.
- **NoData Propagation:** Valid polygon pixel mask (`common_valid`) strictly enforced across all 12 rasters.

## 2. Mixed Pixel & Boundary Dynamics

- **Pure Interior Pixels (3x3 modal homogeneity):** 3,633,697 pixels (81.61% of polygon).
- **Mixed Boundary Pixels (3x3 heterogeneity):** 818,751 pixels (18.39% of polygon).
- **Physical Source:** Rural homesteads (*bari*) in the Barind tract interleave corrugated tin roofs (10–30m²), mango canopies, courtyard trees, and bare red soil within single 10m pixels.
- **Classification Implication:** Pure interior pixels achieve **90.64% accuracy**, whereas mixed pixels achieve **75.92% accuracy**, proving that boundary sub-pixel spectral mixing is the primary empirical limitation preventing 95% landscape accuracy.

