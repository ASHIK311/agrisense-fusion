# Field Shift — Member 1 Satellite GIS: Crop Species Classification Readiness
**NASA Space Apps Challenge 2026**  
**Scientific Readiness Audit, Ground Truth Schema, and Phenological Separation**  

---

## 1. Current Status: BLOCKED
* **Land Cover (Cropland/Tree/Water/Settlement):** VALIDATED & OPERATIONAL.
* **Crop Species (Rice vs. Wheat vs. Maize):** BLOCKED pending official cadastral ground-truth data.

## 2. Why ESA WorldCover Cannot Classify Crop Species
* ESA WorldCover has only a single generic "Cropland" class (Value 40). It contains zero species-level attributes.
* Fabricating crop labels from global proxies violates NASA Open Science standards. Ground truth requires GPS field polygon surveys.

## 3. Barind Phenological Separation Framework
* **Boro Rice:** January transplanting into flooded fields ($	ext{NDWI} > 0.0$, $\sigma^0_{	ext{VH}} < -22	ext{ dB}$); peak flowering in late March; harvest in May.
* **Winter Wheat:** Direct seeded into dry soil in November; reaches peak greenness in February; senesces and dries down in early March ($\Delta	ext{NDVI}_{	ext{Mar-Feb}} \ll -0.25$).
* **Hybrid Maize:** Wide spacing in January; massive biomass accumulation in March ($	ext{NDVI} > 0.88$); harvested in late April.
* **Ground Truth Schema:** Complete standard operating procedure and data dictionary established in `data/labels/ground_truth_schema.md`.
