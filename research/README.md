# AgriSense Fusion — Research & Scientific Subsystems (`research/`)

This directory consolidates the six independent, domain-specific scientific modules, forensic audits, hardware schematics, Python reference engines, and dataset cards authored by the 6-member AgriSense Fusion squad for the **NASA Space Apps Challenge 2026 (*Field Shift*)**.

> **Heavy Geospatial Rasters (~2.80 GB):** Raw Sentinel-2 L2A GeoTIFF scenes, trained `.pkl` classifiers, and the 1981–2024 multi-upazila climate archive are hosted openly on Hugging Face at [`ashik1236/nasatest`](https://huggingface.co/datasets/ashik1236/nasatest) to keep this Git repository lightweight and fast to clone. Run `python scripts/download_dataset.py` to pull them locally.

---

## Subsystem Directory Map

| Module Directory | Scientific Domain | Primary Deliverables Inside |
| :--- | :--- | :--- |
| [`member_01_satellite_gis/`](member_01_satellite_gis/) | **Satellite & GIS** | Sentinel-2 spectral preprocessing scripts, 21-feature Random Forest (`85.77%` full 250-tree Block C vs. `85.47%` / `83.98%` 35-tree runtime subset in [`runtime_subset_block_c_summary.csv`](member_01_satellite_gis/reports/final_audit/runtime_subset_block_c_summary.csv)), schemas, Jupyter notebook, and spatial holdout audits. |
| [`member_02_weather_risk/`](member_02_weather_risk/) | **NASA POWER Agroclimatology** | `1,827`-day Godagari daily meteorological dataset (`2019-01-01` to `2024-01-01`), canonical compound heat-dryness risk model (`Tmax >= 35.0°C`, `RH <= 50.0%`, `Rainfall <= 1.0 mm`), charts, and scientific audit. |
| [`member_03_iot_hardware/`](member_03_iot_hardware/) | **ESP32 & Edge Soil IoT** | `esp32_soil_monitor.ino` C++ firmware, capacitive FDR v2 circuit schematics, bill of materials, SoilGrids depth profiles, calibration templates, and `5,760`-row simulation audits. |
| [`member_04_agronomy_mcda/`](member_04_agronomy_mcda/) | **Agronomy & Crop Rotation MCDA** | BARC AEZ-26 crop suitability matrices, national crop calendars, crop stage $K_c$ tables, MCDA rotation candidate benchmarks, and yield prediction boundary audits. |
| [`member_05_hydrology_physics/`](member_05_hydrology_physics/) | **FAO-56 Physics & Water Balance** | Authoritative Python Penman-Monteith $ET_0$ & root-zone water depletion reference implementation (cross-language parity verified against Node.js backend). |
| [`member_06_crop_pathology/`](member_06_crop_pathology/) | **Plant Pathology Knowledge Base** | `17` validated Bangladesh crop diseases with microclimate epidemiological susceptibility rules and `60` DOI-verified research papers (`48` full-text, `5` abstract, `7` metadata confirmed). |

---

## Related Artifacts
* **[Hugging Face Dataset Card (`dataset_card.md`)](dataset_card.md)** — Full schema and licensing metadata for [`ashik1236/nasatest`](https://huggingface.co/datasets/ashik1236/nasatest).
* **[Master Ingestion Adapter (`../server/adapters/ingest_all.py`)](../server/adapters/ingest_all.py)** — Compiles all six research modules into `server/data/master_database_seed.json`.
* **[FAO-56 Parity Generator (`../generate_fao56_benchmark.py`)](../generate_fao56_benchmark.py)** — Generates reference test vectors directly from `member_05_hydrology_physics`.
