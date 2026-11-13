# Field Shift — Member 4 Subsystem (Correction_v2)
## Nationwide Bangladesh Crop Intelligence, Agronomy & Hydrological Decision Support System
### NASA Space Apps Challenge 2026: Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)

**Workspace:** `Member 4/Correction_v2/`  
**Certification Status:** VERIFIED & REPRODUCIBLE (18/18 TESTS PASSED)  
**Primary Study Pilot:** Godagari Upazila, Rajshahi District ($24.469^\circ\text{N}, 88.330^\circ\text{E}$)  
**Expanded Geographic Footprint:** Full Bangladesh Coverage (8 Divisions, 64 Districts, 466 Agricultural Upazilas)

---

## 1. Subsystem Capabilities

1. **Nationwide Administrative & Geospatial Reference:** Standardized gazetteer and centroid coordinate reference for all 466 agricultural upazilas (100% matched, 0 unmatched), projected in UTM Zone 45N (EPSG:32645) with 100% Point-in-Polygon verification.
2. **NASA POWER Meteorological Pipeline:** Continuous 5-year monthly climate assimilations (2020–2024, 27,960 records) from MERRA-2 with rectified daily rate vs monthly depth units.
3. **BARC Biophysical Crop Suitability Engine:** Continuous area-weighted suitability formula evaluated across 2,330 crop-upazila combinations; exact reproduction of Godagari audit rankings (Aman: 78.92%, Maize: 73.44%, Wheat: 57.41%, Aus: 40.98%, Boro: 40.51%).
4. **FAO-56 Penman-Monteith Hydrology Engine:** Daily aerodynamic and radiation balance, complete 4-stage phenological $K_c$ harmonization (BRRI/BARI/FAO-56), USDA SCS effective rainfall, and root-zone water balance across 58,250 crop-month records.
5. **Operational Dynamic Crop Calendars:** 2,796 upazila crop calendar schedules linked to continuous NASA POWER climatological normals, rectifying previous 0.0% weather gaps.
6. **Sustainable Crop Rotation System:** Agro-ecologically grounded 3-season crop rotations with verified turnaround windows ($\ge 12\text{--}15$ days) and quantified groundwater savings (saving $> 4,000\text{ m}^3\text{/ha}$ in the Barind Tract).
7. **64-Year Historical Crop Yield Record & ML Audit:** Clean 1961–2024 production statistics from BBS and FAOSTAT; rigorous chronological holdout post-mortem explaining ML failure and refusing to deploy flawed models.
8. **Regional Decision Support Profiles:** 64 district and 8 division strategic profiles synthesized for plug-and-play backend API integration.

---

## 2. Quickstart & Reproduction

### Prerequisites:
- Python 3.10+ (tested on Python 3.11 x64)

### Installation:
```bash
cd "Member 4/Correction_v2"
pip install -r requirements.txt
```

### Run Automated Verification Test Suite (18 Tests):
```bash
python -m unittest tests/test_correction_v2.py -v
```
*Expected Output: `Ran 18 tests in ~0.47s ... OK`*

### Run Regional Decision Profiling Pipeline:
```bash
python src/validation/national_analysis.py
```

---

## 3. Directory Layout

```
Member 4/Correction_v2/
├── config/             # YAML configurations (paths, bounds, thresholds)
├── data/
│   ├── raw/            # Preserved immutable original data inputs
│   ├── reference/      # Administrative, geospatial & biological gazetteers
│   ├── processed/      # Nationally expanded, validated scientific datasets
│   └── derived/        # District & division decision support summaries
├── reports/            # 13 comprehensive handover, methodology & test reports
├── src/                # Modular Python packages (geospatial, climate, suitability, irrigation, etc.)
├── tests/              # 18-category automated test suite
├── requirements.txt    # Pinned dependencies
└── README.md           # System guide
```

---

## 4. Key Documentation in `reports/`

- [`MASTER_FINAL_REPORT.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/MASTER_FINAL_REPORT.md): Definitive master handover document.
- [`EXECUTIVE_SUMMARY.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/EXECUTIVE_SUMMARY.md): High-level executive overview.
- [`TEST_RESULTS.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/TEST_RESULTS.md): Detailed 18-test execution matrix.
- [`FINAL_HANDOVER.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/FINAL_HANDOVER.md): Integration guide for backend developers.
- [`DATA_PROVENANCE_REGISTER.csv`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/DATA_PROVENANCE_REGISTER.csv): Complete lineage and license register for all 23 data assets.
- [`NATIONAL_COVERAGE_REPORT.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/NATIONAL_COVERAGE_REPORT.md): Administrative resolution details.
- [`CLIMATE_DATA_REPORT.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/CLIMATE_DATA_REPORT.md): NASA POWER unit audit.
- [`CROP_SUITABILITY_REPORT.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/CROP_SUITABILITY_REPORT.md): BARC methodology and rankings.
- [`IRRIGATION_ENGINE_REPORT.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/IRRIGATION_ENGINE_REPORT.md): FAO-56 Penman-Monteith details.
- [`CROP_CALENDAR_REPORT.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/CROP_CALENDAR_REPORT.md): Weather-linked phenological schedules.
- [`CROP_ROTATION_REPORT.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/CROP_ROTATION_REPORT.md): Sustainable cropping sequences.
- [`YIELD_ANALYSIS_REPORT.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/YIELD_ANALYSIS_REPORT.md): Historical trends & ML post-mortem.
- [`CODE_REPRODUCIBILITY_REPORT.md`](file:///F:/nasa%20project/Member%204/Correction_v2/reports/CODE_REPRODUCIBILITY_REPORT.md): Architecture & pipeline DAG.

---
*Field Shift — NASA Space Apps Challenge 2026*
