# AgriSense Fusion: Engineering Report

_Updated November 13, 2026 (`v2.1.0-competition-verified`). Every number, metric, test result, and engineering decision below was directly observed and verified on this codebase._

---

## Reproduce Everything Locally

```bash
npm ci
npm test                                    # 91/91 automated Node.js tests across 7 suites (~3.9s)
npm --prefix frontend run build             # Vite production bundle (2,184 modules, ~4.1s)
python generate_fao56_benchmark.py          # Regenerate Node-Python FAO-56 parity reference vectors
node server/tests/live_workflow_audit.js    # 11 critical E2E workflows + 3 scientific gates against isolated Express
node server/tests/run_rag_benchmark.js      # Offline Category A RAG benchmark (30 bilingual queries, 87 chunks)
```

---

## 1. Architecture, Hosting, Persistence & Design Rationale

- **Backend Runtime (`server/`):** Node.js + Express 5 (`server/index.js`). Exposes unified `/api/v1/*` modular REST APIs alongside backwards-compatible `/api/*` endpoints across 13 route modules (`auth`, `farm`, `weather`, `sensor`, `satellite`, `agronomy`, `physics`, `disease`, `alert`, `groundwater`, `water`, `report`, `assistant`).
- **Frontend Runtime (`frontend/`):** React 18.3 + Vite 5.4 + Three.js (`0.187.0`) + Leaflet (`1.9.4`) + GSAP (`3.15.1`) + Tailwind/custom dark-botanical styling (`2,184` transformed modules). Renders synchronized 2D GIS parcels, 3D WebGL stratigraphic digital twins, dual 3D canopy comparisons, and an interactive bilingual RAG assistant HUD.
- **Persistence Layer (`server/storage/`):**
  - **Active Runtime Store:** Native `node:sqlite` (`DatabaseSync` in WAL mode across 9 relational tables, built into Node.js 22+ as an experimental module) paired with atomic, lock-safe JSON backup recovery (`server/data/store.json` + `.bak` via `storageService.js` and `AGRISENSE_STORE_FILE` / `AGRISENSE_SQLITE_FILE` environment overrides for test isolation).
  - **Production Relational DDL:** Full normalized PostgreSQL 16 + PostGIS schema is prepared in `database/schema.sql` and TLS-hardened pool hooks exist in `server/storage/db.js` when `DATABASE_URL` is configured for multi-instance deployment.
- **Open Geospatial Data Offloading (Hugging Face):** Heavy multi-year Sentinel-2 Level-2A GeoTIFF scenes, trained `.pkl` classifiers, and national 1981–2024 climate archives (`~2.80 GB`) are hosted openly on Hugging Face ([`ashik1236/nasatest`](https://huggingface.co/datasets/ashik1236/nasatest)), keeping this Git repository lightweight (`~39 MB`) for rapid cloning while linking reproducibly via `scripts/download_dataset.py`.

---

## 2. Engineering Improvement & Remediation Matrix

Status key: **Done** (implemented and verified) · **Partial / Bounded** (implemented with explicit scope limits) · **Deferred** (architecturally planned for post-hackathon production). Priority `P0` = highest impact.

| # | Area | Finding / Requirement | Status | Evidence / Observed Metric | Risk if Ignored | Prio | Action Taken | Verification |
|---|---|---|---|---|---|---|---|---|
| 1 | Security | Public registration allowed client-controlled `role: "admin"` (`P1-01`) | **Done** | Unauthenticated user could self-register admin & read cross-tenant data | Privilege escalation & data leak | **P0** | Hard-locked `POST /api/v1/auth/register` to `role = "farmer"` regardless of payload | `patch_regression.test.js` Test 01 (`91/91` pass) |
| 2 | Security | Cross-tenant silent fallback on `/reports/summary` & `/sensor-readings` | **Done** | Foreign `farm_id`/`field_id` fell back to demo records | Tenant privacy breach (`P1-03`) | **P0** | Enforced strict ownership checks (`HTTP 404` on foreign IDs) & excluded private telemetry from anonymous calls | `patch_regression.test.js` Test 03 + `assistant.test.js` P1-03 |
| 3 | Security | ESP32 hardware authentication bypass vulnerability (`Defect B`) | **Done** | Valid `device_id` with forged key risked bypass | Unauthorized sensor injection | **P0** | Constant-time `crypto.timingSafeEqual` verification on `x-device-key` + Bearer fallback | `device_auth.test.js` (`4/4` pass) |
| 4 | Security | Weak JWT secrets in production deployments | **Done** | Short/default signing secret could allow token forgery | Auth bypass | **P0** | Production mode rejects missing or `< 32`-char `JWT_SECRET` at boot/verification | `security_regression.test.js` Test 01 |
| 5 | Security | Missing HTTP security headers & framework disclosure | **Done** | Express `X-Powered-By` exposed; missing `nosniff`/`SAMEORIGIN` | Clickjacking / MIME sniffing | **P1** | `app.disable('x-powered-by')` + `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` | `patch_regression.test.js` Test 02 |
| 6 | Reliability | Missing `fs` import crashed `GET /favicon.ico` (`P2-01`) | **Done** | Unhandled `ReferenceError` returned HTTP 500 | Broken browser requests | **P1** | Fixed `fs` import and favicon resolution in `server/index.js` | `patch_regression.test.js` Test 02 (`!= 500`) |
| 7 | Reliability | Pre-cleanup synthetic user records (`192` test entries) in `store.json` | **Done** | Polluted demo database (`454 KB`) | Dirty demo baseline | **P1** | Sanitized `server/data/store.json` (`0` users, `3` farms, `3` fields, SHA-256 `7FC370...`) | Verified via SHA-256 checksum & clean test isolation |
| 8 | Reliability | Non-atomic writes corrupting active store under concurrency | **Done** | Simultaneous test writes risked partial JSON | Data corruption | **P0** | Native `node:sqlite` WAL relational engine (9 tables) + atomic temp-file JSON `.bak` recovery | `persistence_safety.test.js` (`8/8` pass) |
| 9 | Science | Reconcile stale LULC accuracy citations (`97.78%` / `49.67%` / `15Feat`) | **Done** | Mixed legacy scores across UI/KB/seed (`P0-01`) | Overclaiming classification accuracy | **P0** | Unified to `RandomForest_21Feat_Deep`: `85.77%` Block C (`84.02%` bal. acc, `0.8257` macro-F1), `84.63% ± 3.81%` 5-fold CV | `patch_regression.test.js` Test 05 + `assistant.test.js` P0-01 |
| 10 | Science | Unify Barind Silty Clay Loam root-zone soil parameters (`P0-02`) | **Done** | Divergent TAW/RAW values (`72 mm` vs `79 mm`) across layers | Inconsistent water deficit triggers | **P0** | Aligned canonical defaults (`0.435` sat, `0.323` FC, `0.244` trigger, `0.165` WP, `0.50 m` -> `79.0 mm` TAW / `39.5 mm` RAW) | `patch_regression.test.js` Test 04 & Test 09 (`schema.sql` + seed + API) |
| 11 | Science | Node.js vs Python FAO-56 Penman-Monteith parity drift | **Done** | Up to `23.68%` divergence in humid monsoon overcast conditions | Incorrect crop irrigation demand | **P0** | Implemented full Stefan-Boltzmann `Rnl` and `10m -> 2m` log wind transformation matching Member 5 Python | `fao56_parity.test.js` (`4/4` seasonal Godagari vectors pass) |
| 12 | Science | Silent default weather inputs masking missing observations | **Done** | Missing solar radiation or wind silently substituted assumptions | Hallucinated physics outputs | **P0** | Explicit missing-input validation & staleness disclosures in `calculate_et0` / `calculate_water_balance` | `assistant.test.js` P0-02 + `live_workflow_audit.js` |
| 13 | Science | Unverified crop species classification & yield prediction promises | **Done** | No cadastral field polygons or parcel yield trials available | Scientific misrepresentation | **P0** | Enforced strict gates: `/satellite/classify-crop` (`HTTP 422`), `/agronomy/predict-yield` (`HTTP 501`), `/weather/forecast` (`HTTP 501`) | `security_regression.test.js` Test 10 + `live_workflow_audit.js` |
| 14 | Science | Groundwater well readings lacked synthetic proxy flag | **Done** | Could be mistaken for live BMDA piezometer telemetry | Misleading hydrological status | **P1** | Added `SYNTHETIC_REGIONAL_PROXY` (`is_simulated: true`, `has_physical_piezometers: false`) & `0.65 m/yr` Jahan et al. 2010 citation | `patch_regression.test.js` Test 05 |
| 15 | Science | Unsupported crop-rotation water saving guarantees (`up to 65%`) | **Done** | RAG & demo script overstated unvalidated percentage water cuts | Overclaiming agronomic gains | **P1** | Replaced guaranteed savings strings with modeled/provisional MCDA scenario comparison caveats | `patch_regression.test.js` Test 06 |
| 16 | Science | Weather heat-dryness rule sentinel (`-999`) handling | **Done** | NASA POWER `-999` missing flags could skew risk scores | Corrupted heat risk flags | **P1** | Guarded `-999`/`null`/`NaN` -> `INSUFFICIENT_DATA` across all `1,827` daily Godagari records (`35°C` threshold) | `patch_regression.test.js` Test 08 |
| 17 | Science | Soil-borne disease screening misapplied foliar leaf wetness | **Done** | Potato Bacterial Wilt used foliar humidity rules erroneously | False pathology alerts | **P1** | Set `leaf_wetness_applicable: false` for soil-borne pathogens | `live_workflow_audit.js` Step 9 |
| 18 | Science | Citation integrity across 60 crop pathology research papers | **Done** | Unclassified paper verification depth | Weak academic traceability | **P1** | Propagated 3-tier status across all `60` papers (`48` full-text, `5` abstract, `7` metadata confirmed) | `patch_regression.test.js` Test 05 |
| 19 | AI / RAG | Assistant input bounds & burst rate limiting | **Done** | Unbounded prompts & spam risk | Memory / DoS vulnerability | **P1** | Enforced `4000`-char `/chat`, `1000`-char `/query`, `X-RateLimit-Limit` headers & `HTTP 429` bursts | `patch_regression.test.js` Test 07 |
| 20 | AI / RAG | Bilingual English + Bangla RAG accuracy & citation traceability | **Done** | Need grounded answers without cloud LLM keys | Offline usability gap | **P0** | Hybrid BM25 + 3-gram RRF (`87` chunks `v2.1.2`): `30/30` tool selection, `30/30` disclosures, `81.82%` Hit@4 | `run_rag_benchmark.js` (`RAG_BENCHMARK_POST_PATCH.json`) |
| 21 | Repo | `3.01 GB` raw dataset & `.venv` bloat blocked fast GitHub clones | **Done** | `4.73 GB` working tree with 62 MB GeoTIFFs and virtualenvs | Broken clones & push warnings | **P0** | Offloaded `~2.80 GB` GeoTIFFs/models/1981–2024 CSV to Hugging Face (`ashik1236/nasatest`); archived `.venv`/unused `.mp4`/heavy internal audits safely | Repo reduced to clean code-first layout; `91/91` tests pass |
| 22 | Repo | Windows Junction symlinks inside `Member 5` and `Member 6` | **Done** | Git cannot track Windows junctions cleanly across OSes | Broken checkouts on Linux/macOS | **P0** | Resolved all junctions into real directories under `research/` and verified zero symlinks remain | `Get-ChildItem` scan returned 0 symlinks |
| 23 | Persistence | PostgreSQL / PostGIS runtime CRUD connection (`P2-02`) | **Deferred** | `schema.sql` & `db.js` exist; runtime uses `store.json` | Single-node scaling ceiling | **P2** | Kept atomic JSON store for hackathon portability; PostgreSQL migration queued for multi-tenant cloud phase | Documented in `documentation/KNOWN_LIMITATIONS.md` |
| 24 | Infra | Distributed Redis rate limiting (`P2-03`) | **Deferred** | In-memory limiter works per process | Horizontal scaling gap | **P2** | Adequate for single-process demo (`429` verified) | Documented in `documentation/KNOWN_LIMITATIONS.md` |
| 25 | External | Live Cloud LLM APIs (Gemini / OpenAI) benchmark | **Not Verified** | No API keys configured in local `.env` | Unmeasured live cloud latency | **P3** | Offline deterministic synthesizer handles 100% of demo & CI paths without keys | Documented (`NOT_EVALUATED_NO_API_KEY_IN_ENV`) |

---

## 3. Performance & Benchmark Measurements

| Subsystem / Metric | Measurement Context | Observed Value | Evidence File |
|---|---|---|---|
| **Automated Node Test Suite** | `npm test` (`91` tests across `7` suites) | **`~3.9 s`** (`0` failures) | `server/tests/*.test.js` |
| **Frontend Vite Production Build** | `npm --prefix frontend run build` (`2,184` modules) | **`4.09 s`** | `frontend/vite.config.js` |
| **RAG Hybrid Retrieval Latency** | `30` bilingual queries across `87` chunks (`v2.1.2`) | **`12.99 ms`** mean / **`16.61 ms`** P95 | `RAG_BENCHMARK_POST_PATCH.json` |
| **RAG Retrieval Quality (Offline)** | Category A (`22` ground-truth chunk queries) | **`81.82%` Hit@4** (`18/22`), **`40.91%` Hit@1** (`9/22`), **`100%`** tool & disclosure pass | `RAG_BENCHMARK_POST_PATCH.json` |
| **FAO-56 & Agronomy Physics** | Endpoint calculation latency | **`< 3 ms`** per payload | `server/tests/api_integration.test.js` |
| **NASA POWER Live Point API** | Godagari point series (`24.469°N, 88.330°E`) | **`~1.15 s`** cold dashboard fetch (cached `1 hr` rolling) | `server/services/nasaService.js` |
| **LULC Holdout (Offline Full `.pkl`)** | `optimized_model.pkl` (`250` trees, $N = 6,000$ Block C) | **`85.77%`** overall (`90.64%` interior / `75.92%` boundary; `85.28%` for full `180`-tree 15-feat) | `master_database_seed.json` |
| **LULC Live Runtime (`35`-Tree Subset)** | `satellite_rf_ensemble.json` (`35` trees, `max_depth=9`, Block C) | **`85.47%`** (21-feat, `97.00%` `.pkl` agree) / **`83.98%`** (15-feat, `96.40%` agree) | `server/services/satelliteClassifier.js` |
