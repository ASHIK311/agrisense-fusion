# Expert Review Kit: High Barind Tract Agronomic & Hydrological Validation

For independent validation by **BARC Agronomists, BMDA Groundwater Engineers, and DAE Extension Officers** reviewing **AgriSense Fusion** (`Godagari Upazila, Rajshahi · AEZ-26 · 24.4690°N, 88.3300°E`).

---

## What We Ask

Please review the candidate crop-rotation transitions, FAO-56 Silty Clay Loam water thresholds, and Sentinel-2 LULC error patterns below, and enter your candid field ratings in [`review_sheet.csv`](review_sheet.csv) (Excel or Google Sheets compatible). Ratings never alter system scores automatically—they appear directly as external scientific peer feedback.

---

## The Evaluation Rubric

| Column | Question for Reviewer | Scale |
|---|---|---|
| `ground_physics` | Are the FAO-56 defaults (`θFC 0.323`, `θWP 0.165`, `79.0 mm` TAW, `39.5 mm` RAW at `0.50 m` depth) realistic for Godagari High Barind Silty Clay Loam terraces? | `1` (unrealistic) to `5` (accurate) |
| `crop_feasibility` | Are the recommended Boro-replacement rotations (*Lentil → Aus → T. Aman*, *Mustard → Mungbean → T. Aman*, *Chickpea → T. Aman*) agronomically viable for local farmers? | `1` to `5` |
| `water_impact` | Does shifting away from dry-season Boro rice meaningfully reduce deep tubewell draw during peak pre-monsoon drawdown (`26.4–28.0 m`)? | `1` to `5` |
| `adoption_access` | Can smallholders realistically obtain quality seeds, inputs, and market access for the alternative crop sequence? | `1` to `5` |
| `overall_verdict` | Would you endorse pilot testing this module with DAE/BMDA field blocks? | `yes` / `maybe` / `no` |
| `notes` | Any hazards, pest overlaps, local soil variations, or irrigation constraints we missed. | Free text |

---

## Priority Validation Targets

1. **Top Modeled Water-Saving Sequence:** *Lentil (BARI Masur-8) → Aus Rice → T. Aman* (`MCDA Score 81.4` under water conservation priority)
2. **Top Economic Relay Sequence:** *Rabi Maize (Hybrid) → Mungbean → T. Aman*
3. **Soil & Aquifer Benchmark:** Godagari Terraced Plot A-1 (`24.36°–24.47°N, 88.33°–88.62°E`, `28.0 m` suction limit threshold)
4. **Remote Sensing LULC Map:** `RandomForest_21Feat_Deep` (`85.77%` Block C synthetic holdout; `75.92%` boundary mixed-pixel accuracy)
5. **Epidemiological Screening Rule:** *Potato Bacterial Wilt* (`soil-borne`, `leaf_wetness_applicable = false`) vs *Rice Blast* (`humidity >= 85%`)
