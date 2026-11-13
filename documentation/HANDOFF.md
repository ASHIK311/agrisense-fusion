# AgriSense Fusion: Developer Handoff & Operations Guide

_Updated November 13, 2026 (`v2.1.0-competition-verified`). Read this first before modifying server routes, physics equations, or research datasets._

---

## 1. Context & Mission

- **Competition:** NASA International Space Apps Challenge 2026 — **Field Shift: Adapting Farms with NASA Data**
- **Primary Pilot Region:** Godagari Upazila, Rajshahi District, Bangladesh (`AEZ-26 High Barind Tract · 24.4690°N, 88.3300°E · 28m elevation`)
- **Core Problem:** Over-reliance on dry-season Boro rice extraction drives regional groundwater decline (`0.65 m/year`, approaching the `28.0 m` suction limit of surface centrifugal pumps).
- **Solution:** Multi-scale fusion of Copernicus Sentinel-2 spectral LULC, NASA POWER daily agroclimatology, simulated ESP32 edge soil telemetry, FAO-56 Penman-Monteith physics, BARC AEZ-26 agronomy MCDA, and a bilingual (English + বাংলা) grounded RAG Copilot.

---

## 2. Repository Map

| Directory / File | Role & Ownership |
| :--- | :--- |
| `server/` | Express 5 backend, FAO-56 physics (`server/physics/`), MCDA engine (`server/decision/`), hybrid RAG assistant (`server/assistant/`), atomic persistence (`server/storage/`), and `88` automated tests (`server/tests/`). |
| `frontend/` | React 18 + Vite 5 SPA with Three.js 3D stratigraphic soil twin, dual canopy comparison, Leaflet GIS parcels, and dark/daylight glassmorphic UI. |
| `database/schema.sql` | Normalized PostgreSQL 16 + PostGIS relational DDL aligned with canonical Barind soil defaults (`0.3230` FC, `0.1650` WP, `0.500 m` depth). |
| `research/` | Consolidated scientific modules (`member_01` to `member_06`): scripts, ESP32 C++ firmware, independent forensic audits, notebooks, and Hugging Face dataset card (`research/dataset_card.md`). |
| `documentation/` | Complete engineering, testing, security, API, architecture, expert review (`documentation/review/`), and submission documentation (`documentation/SUBMISSION.md`). |
| `scripts/` | Cross-platform utilities including `scripts/download_dataset.py` to pull `~2.80 GB` of raw GeoTIFF rasters from Hugging Face (`ashik1236/nasatest`). |
| `start.bat` | One-click Windows launcher starting both Express API (`:5000`) and Vite UI (`:5173`). |

---

## 3. Critical Operational Rules & Gotchas

1. **Preserve the Clean Demo Store (`server/data/store.json`):**
   - The committed `server/data/store.json` is sanitized (`0` users, `3` farms, `3` fields, SHA-256 `7FC370F631D3D7CF005F0A4830B948640F737576CBCA35FF0D55FD2261679CC2`).
   - Whenever running ad-hoc verification scripts or live servers for testing mutations, point `AGRISENSE_STORE_FILE` to a temporary file so the clean baseline is never polluted. (`npm test` tests isolate automatically.)
2. **Windows PowerShell `npm` Execution Policy:**
   - If PowerShell blocks `npm.ps1`, run `npm.cmd test` or use Command Prompt (`cmd /c npm test`).
3. **Intentional Scientific Gates (`HTTP 422` & `HTTP 501`):**
   - Do **not** "fix" or remove the `422` / `501` responses on:
     - `POST /api/v1/satellite/classify-crop` (`422 BLOCKED` — pending DAE cadastral polygons)
     - `POST /api/v1/agronomy/predict-yield` (`501 NOT_IMPLEMENTED` — pending multi-season plot trials)
     - `GET /api/v1/weather/forecast` (`501 NOT_IMPLEMENTED` — forecast API disabled rather than mocked)
   - Automated tests (`security_regression.test.js` Test 10 & `live_workflow_audit.js`) explicitly assert that these endpoints fail honestly instead of fabricating predictions.
4. **Cross-Language Numerical Parity:**
   - If you touch `server/physics/penmanMonteith.js`, regenerate Python reference vectors via `python generate_fao56_benchmark.py` and confirm `npm test` passes all 4 seasonal Godagari parity assertions.
5. **External Archive & Hugging Face Staging (Local Developer Machine Note):**
   - Unused stock videos, duplicate member backups, `.venv` directories, and pre-patch snapshots removed from the Git tree were safely archived (never deleted) at `F:\nasa_project_archive\`.
   - The `~2.80 GB` GeoTIFF rasters and national climate archive were staged at `F:\nasa_project_hf_dataset\` for Hugging Face (`ashik1236/nasatest`).
