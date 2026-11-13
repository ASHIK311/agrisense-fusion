# AgriSense Fusion: Honest Engineering Disclosures & Known Limitations

_Updated November 13, 2026 (`v2.1.0-competition-verified`). In accordance with transparent Space Apps scientific governance, all simulated components, synthetic proxies, and deferred production modules are explicitly documented below._

---

## 1. Scientific & Hardware Disclosures

| Component | Current Reality | Safeguard & Disclosure in System |
|---|---|---|
| **Physical ESP32 Edge Sensors** | **Hardware Pending Field Deployment.** Baseline node `esp32-node-raj-01` and seed readings (`5,760`-row dataset) represent calibrated capacitive FDR v2 simulation traces. | Every payload & UI card displays `is_simulated: true` and `calibration_status: "UNCALIBRATED"` until gravimetric field calibration completes. |
| **BMDA Groundwater Piezometers** | **Synthetic Regional Proxy (`SYNTHETIC_REGIONAL_PROXY`).** Monitoring records (`26.4 m` / `27.8 m` depth, `0.65 m/year` decline rate) reflect published literature baselines (Jahan et al. 2010), not live SCADA piezometers. | Endpoint `/api/v1/groundwater` explicitly returns `has_physical_piezometers: false` and cautions against inferring aquifer volume from a single well. |
| **LULC Classifier Holdout Scope** | **Offline full model vs. live runtime subset:** `85.77%` Block C overall accuracy (`84.02%` balanced, `0.8257` Macro-F1 across `N = 6,000`; `77.07%` representative prevalence) belongs strictly to the offline full `250`-tree `optimized_model.pkl` (`85.28%` for the full `180`-tree `final_model.pkl`), evaluated on contiguous latitudinal blocks without an inter-block buffer. Live `POST /api/v1/satellite/classify` runs an exported **`35`-tree (`max_depth=9`) runtime subset** (`35/250` for 21-feat achieving `85.47%` Block C / `97.00%` agreement with full `.pkl`; `35/180` for 15-feat achieving `83.98%` Block C / `96.40%` agreement). `GET /api/v1/satellite/scenes` serves a `407`-row metadata index from CSV rather than streaming raw GeoTIFF rasters (hosted on Hugging Face). | Area-weighted landscape accuracy remains `"Not Yet Independently Established"`; `/api/v1/satellite/metadata` and `/classify` return both full offline `.pkl` and live `35`-tree subset metrics side-by-side (`runtime_subset_metrics` vs. `offline_full_model_metrics`). |
| **Crop-Species & Yield Models** | **Explicitly Gated.** Fine-grained parcel crop species classification and field-level yield prediction lack multi-season DAE cadastral polygons and crop-cut ground truth. | `/satellite/classify-crop` returns `HTTP 422 BLOCKED` and `/agronomy/predict-yield` returns `HTTP 501 NOT_IMPLEMENTED` rather than inventing results. |
| **Soil Parameters & Rotations** | Barind Silty Clay Loam defaults (`79.0 mm` TAW, `39.5 mm` RAW) derive from Saxton & Rawls (2006) pedotransfer functions; crop-rotation savings reflect **provisional modeled MCDA scenarios**, not multi-year agronomic trial guarantees. | Legacy unverified percentage savings claims were removed; assistant and UI display modeled/provisional caveats. |
| **Direct Soil Evaporation ($E_s$)** | Dual-$K_c$ lysimeter separation requires bare-soil calibration coefficients unavailable locally. | $E_s$ is transparently held `null` rather than fabricated; single-$K_c$ $ET_c = K_c \times ET_0$ is clearly displayed. |

---

## 2. Infrastructure & AI Disclosures

1. **Runtime Persistence (SQLite WAL + PostgreSQL Deferred):** Although `database/schema.sql` provides a complete normalized PostgreSQL 16 + PostGIS schema, the local single-node runtime uses Node.js 22+'s built-in `node:sqlite` (`DatabaseSync` in WAL mode across 9 relational tables — flagged experimental in Node 22) paired with atomic lock-safe JSON (`server/data/store.json` + `.bak`) recovery. Horizontal multi-instance scaling still requires cutting over to PostgreSQL.
2. **Rate Limiting (`P2-03` Deferred):** `server/middleware/rateLimiter.js` tracks quotas in process memory (`HTTP 429` verified), which requires Redis/gateway backing for clustered deployments.
3. **Offline RAG vs. Live Cloud LLMs:**
   - Category A offline retrieval (`hybrid_lexical_bm25_char_ngram_rrf`, `87` chunks) achieves `30/30` tool selection and `81.82%` Hit@4 (`18/22`), with `40.91%` Hit@1 (`Q03`, `Q12`, `Q21`, `Q25` misses).
   - Live Cloud LLM modes (Gemini `gemini-1.5-flash` & OpenAI `gpt-4o-mini`) report `NOT_EVALUATED_NO_API_KEY_IN_ENV` in offline CI environments; deterministic synthesis powers 100% of offline demos.
