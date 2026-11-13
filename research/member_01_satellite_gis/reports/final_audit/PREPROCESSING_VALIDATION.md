# Field Shift — Member 1 Satellite GIS: Preprocessing & Index Validation
**NASA Space Apps Challenge 2026**  
**Radiometric Calibration, Quality Masking, and Mathematical Index Verification**  

---

## 1. Preprocessing Pipeline Verification
* **Resolution Standardization:** 20m SWIR1 (B11) band upsampled to 10.0m using bilinear interpolation, precisely matching 10m native Blue (B02), Green (B03), Red (B04), and NIR (B08) bands.
* **Reflectance Calibration:** S2 L2A BOA digital numbers scaled by $0.0001$ into physical surface reflectance range $[0.0, 1.0]$.
* **Cloud & Shadow Masking:** Validated Scene Classification Layer (SCL); filtered out cloud shadows (SCL=3), high/medium cloud probability (SCL=8,9), and thin cirrus (SCL=10).
* **Projection & Alignment:** All rasters share uniform grid origin and affine transform in EPSG:32645.

## 2. Mathematical Index Verification
Independent re-computation on 10 randomly sampled pixels across all 4 dates verified $<10^{-5}$ deviation against on-disk GeoTIFF rasters:
1. **NDVI:** $rac{	ext{NIR} - 	ext{Red}}{	ext{NIR} + 	ext{Red}}$ — Verified correct canopy vigor dynamics.
2. **NDWI (McFeeters):** $rac{	ext{Green} - 	ext{NIR}}{	ext{Green} + 	ext{NIR}}$ — Verified open water discrimination (Padma River $>0.20$).
3. **NDMI (Gao):** $rac{	ext{NIR} - 	ext{SWIR1}}{	ext{NIR} + 	ext{SWIR1}}$ — Verified canopy moisture stress index.
4. **EVI:** $2.5 \cdot rac{	ext{NIR} - 	ext{Red}}{	ext{NIR} + 6.0\cdot	ext{Red} - 7.5\cdot	ext{Blue} + 1.0}$ — Verified high biomass saturation resistance.
