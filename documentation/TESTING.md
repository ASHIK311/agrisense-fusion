# AgriSense Fusion: Testing & Verification Methodology

_Updated November 13, 2026 (`v2.1.0-competition-verified`). Every test count and benchmark reported below was executed directly against the current repository state._

---

## 1. Automated Verification Summary

| Verification Harness | Command | Observed Result | Scope |
|---|---|---|---|
| **Node.js Automated Test Runner** | `npm test` (`node --test server/tests/*.test.js`) | **`91 / 91` passed** (`0` failed, `0` skipped, `~3.9s`) | Integration, Security, Auth, FAO-56 Parity, Hydrology, SQLite WAL & Persistence, RAG, Physics, MCDA, Option 1 Regression |
| **Node–Python FAO-56 Generator** | `python generate_fao56_benchmark.py` | **4 / 4 seasonal vectors match** | Generates reference JSON directly from Member 5 Python `fao56.py` |
| **Live End-to-End Workflow Audit** | `node server/tests/live_workflow_audit.js` | **11 workflows + 3 scientific gates pass** | Runs full HTTP lifecycle against isolated Express server |
| **RAG Category A Benchmark** | `node server/tests/run_rag_benchmark.js` | **`30/30` tool & disclosure, `81.82%` Hit@4** | Evaluates 15 EN + 15 BN queries across 87 chunks (`12.99 ms` mean) |
| **Vite Production Bundle** | `npm --prefix frontend run build` | **`2,184` modules built in `4.09 s`** | Confirms zero JSX/CSS/Three.js bundling errors |

---

## 2. Canonical Test Suites (`server/tests/`)

| Suite File | Cases | Verified Behaviors |
|---|---:|---|
| `api_integration.test.js` | 21 | Health endpoint (`node:sqlite` WAL + SQLite diagnostics), auth register/me, farm/field retrieval, NASA POWER history, weather risk, ESP32 sensor POST, satellite metadata (full vs. 35-tree subset), live RF ensemble inference across all `6,000 × 21` Block C holdout feature vectors (`block_c_holdout_6000_features.csv`) & 407-scene CSV catalog, BARC suitability, FAO-56 water balance, 17 diseases, 60 DOIs, disease microclimate screening, alerts, groundwater, consolidated report, full `/dashboard` aggregation. |
| `assistant.test.js` | 14 | 9 assistant tool specs, deterministic `calculate_et0`, hybrid RAG search, English & বাংলা chat responses, disease non-diagnostic disclaimer, Jahan et al. (2010) 0.65 m/yr citation, uncalibrated ESP32 disclosure, persistent thread feedback, SSE streaming, `P0-01` satellite metric guard, `P0-02` missing-input guard, `P1-03` multi-tenant authorization (6 checks), SQLite multi-turn RAG + tool persistence. |
| `patch_regression.test.js` | 10 | Signup `'farmer'` role lock (`admin`/`researcher`/`agronomist` escalation rejected), security headers & `/favicon.ico != 500`, cross-tenant `404` isolation, canonical Barind `79.0 mm` TAW / `39.5 mm` RAW + override parity, `RandomForest_21Feat_Deep` + `SYNTHETIC_REGIONAL_PROXY` + `48/5/7` paper tiers, provisional rotation caveat, `4000`-char chat limit + `429` rate limit, Member 2 `1,827`-day sentinel rule parity, cross-layer soil provenance parity. |
| `security_regression.test.js` | 12 | Rejects weak `JWT_SECRET < 32` chars in production, forged JWT `403`, unauthenticated farm/field/alert mutations `401`, cross-tenant isolation, `x-device-key`/Bearer sensor guard, auth rate limiter `429`, validation `400`, immutable demo farms `403`, honest `422`/`501` uncalibrated model gates, safe zero-denominator NDVI/NDWI, CSV & JSON report exports. |
| `unit.test.js` | 13 | Saturation vapour pressure, Barind $ET_0$ calculation & missing-input failure, crop $ET_c$, TAW, root-zone depletion $D_r$, daily water balance infiltration, sensor range bounds & `HTTP 409` duplicate `event_id`, MCDA water vs. profit re-ranking & machine reason codes. |
| `persistence_safety.test.js` | 8 | Native `node:sqlite` WAL relational persistence & JOIN query parity, crash-safe atomic `store.json` writes, corrupted primary recovery from `.bak`, prevention of non-atomic fallback when rename locks (`EBUSY`), concurrent write safety, clean seed recovery when both `.json` and `.bak` fail. |
| `device_auth.test.js` | 4 | Rejects missing auth (`401`), rejects forged `x-device-key` even with valid `device_id` (`401`), accepts authorized `x-device-key` (`201`), accepts user Bearer token (`201`). |
| `fao56_parity.test.js` | 4 | Verifies Node.js `penmanMonteith.js` matches Python `fao56.py` across Godagari April Hot-Dry (`ET0 7.49`), Jan Cool-Dry (`ET0 2.41`), Jul Monsoon (`ET0 2.94`), and Oct Post-Monsoon (`ET0 3.80`). |
| `hydrologyApi.test.js` | 2 | PNG RGB Terrarium elevation decoding math and West➔East slope bin transect extraction. |

---

## 3. Clean Store Isolation Protocol

To prevent tests from modifying the clean baseline demo database (`server/data/store.json`, SHA-256 `7FC370F631D3D7CF005F0A4830B948640F737576CBCA35FF0D55FD2261679CC2`), all automated test files redirect `AGRISENSE_STORE_FILE` to isolated `os.tmpdir()` directories and clean up on exit.
