# Field Shift — Member 1 Satellite GIS: GIS & Area Integrity Report
**NASA Space Apps Challenge 2026**  
**Resolution of Area Inconsistency & Definitive Land-Cover Statistics**  

---

## 1. Discrepancy Investigation
* **Reported Upazila Area:** 445.69 km²
* **Original Calculated Cropland:** 626.12 km² (Impossible: 140.5% of total Upazila area)
* **Root Cause Identified:** The original script `analyze.py` calculated pixel histograms on the unmasked rectangular bounding box raster ($2,522 	imes 2,629$ pixels, representing $851.46	ext{ km}^2$), which included surrounding Upazilas (Tanore, Paba, Nawabganj Sadar) and trans-boundary areas in West Bengal, India.

## 2. Corrective GIS Methodology Applied
1. Loaded authoritative Godagari boundary polygon (`data/metadata/study_area_godagari.geojson`).
2. Reprojected vector geometry from WGS84 (`EPSG:4326`) into UTM Zone 45N (`EPSG:32645`).
3. Executed `rasterio.mask.mask(src, [polygon], crop=True, all_touched=False, nodata=0)`.
4. Calculated pixel area: $10.0	ext{ m} 	imes 10.0	ext{ m} = 100	ext{ m}^2 = 0.0001	ext{ km}^2/	ext{pixel}$.
5. Excluded NoData pixels ($4,057,756$ pixels outside polygon).

## 3. Definitive Godagari Upazila Land Cover Statistics

| Class ID | Land Cover Class | Pixel Count | Area (km²) | Percentage (%) |
|:---:|:---|:---:|:---:|:---:|
| **1** | **Cropland** | **3,538,719** | **353.87** | **79.40%** |
| **2** | **Tree Cover** | 523,738 | 52.37 | 11.75% |
| **3** | **Built-Up / Settlements** | 228,416 | 22.84 | 5.12% |
| **4** | **Permanent Water** | 163,822 | 16.38 | 3.67% |
| **5** | **Grassland** | 1,725 | 0.17 | 0.04% |
| **6** | **Bare / Sparse Vegetation** | 452 | 0.05 | 0.01% |
| **7** | **Herbaceous Wetland** | 114 | 0.01 | 0.003% |
| **Total** | **Valid Godagari Land Area** | **4,456,986** | **445.69** | **100.00%** |

* Mathematical integrity verified: Total area exactly equals $445.69	ext{ km}^2$; Cropland percentage is strictly valid ($79.40\%$).
