# AgriSense Fusion: Honest Engineering Disclosures & Known Limitations

_Updated November 13, 2026 (`v2.1.0-competition-verified`). In accordance with transparent Space Apps scientific governance, all simulated components, synthetic proxies, and deferred production modules are explicitly documented below._

---

## 1. Scientific & Hardware Disclosures

| Component | Current Reality | Safeguard & Disclosure in System |
|---|---|---|
| **Physical ESP32 Edge Sensors** | **Hardware Pending Field Deployment.** Baseline node `esp32-node-raj-01` and seed readings (`5,760`-row dataset) represent calibrated capacitive FDR v2 simulation traces. | Every payload & UI card displays `is_simulated: true` and `calibration_status: "UNCALIBRATED"` until gravimetric field calibration completes. |
| **BMDA Groundwater Piezometers** | **Synthetic Regional Proxy (`SYNTHETIC_REGIONAL_PROXY`).** Monitoring records (`26.4 m` / `27.8 m` depth, `0.65 m/year` decline rate) reflect published literature baselines (Jahan et al. 2010), not live SCADA piezometers. | Endpoint `/api/v1/groundwater` explicitly returns `has_physical_piezometers: false` and cautions against inferring aquifer volume from a single well. |
| **LULC Classifier Holdout Scope** | `RandomForest_21Feat_Deep` (`85.77%` Block C overall accuracy, `84.02%` balanced accuracy, `0.8257` Macro-F1 across `N = 6,000` holdout samples; `77.07%` representative prevalence) was evaluated on contiguous latitudinal blocks without an inter-block geographic buffer zone. | Area-weighted landscape accuracy remains `"Not Yet Independently Established"`; live `/api/v1/satellite/classify` uses a `15-feature` offline heuristic fallback. |
| **Crop-Species & Yield Models** | **Explicitly Gated.** Fine-grained parcel crop species classification and field-level yield prediction lack multi-season DAE cadastral polygons and crop-cut ground truth. | `/satellite/classify-crop` returns `HTTP 422 BLOCKED` and `/agronomy/predict-yield` returns `HTTP 501 NOT_IMPLEMENTED` rather than inventing results. |
| **Soil Parameters & Rotations** | Barind Silty Clay Loam defaults (`79.0 mm` TAW, `39.5 mm` RAW) derive from Saxton & Rawls (2006) pedotransfer functions; crop-rotation savings reflect **provisional modeled MCDA scenarios**, not multi-year agronomic trial guarantees. | Legacy unverified percentage savings claims were removed; assistant and UI display modeled/provisional caveats. |
| **Direct Soil Evaporation ($E_s$)** | Dual-$K_c$ lysimeter separation requires bare-soil calibration coefficients unavailable locally. | $E_s$ is transparently held `null` rather than fabricated; single-$K_c$ $ET_c = K_c \times ET_0$ is clearly displayed. |

---

## 2. Infrastructure & AI Disclosures

1. **Runtime Persistence (`P2-02` Deferred):** Although `database/schema.sql` provides a complete normalized PostgreSQL 16 + PostGIS schema, the active runtime executes against atomic lock-safe JSON (`server/data/store.json` + `.bak`) for zero-dependency edge/demo execution. Horizontal multi-instance scaling requires cutting over to PostgreSQL.
2. **Rate Limiting (`P2-03` Deferred):** `server/middleware/rateLimiter.js` tracks quotas in process memory (`HTTP 429` verified), which requires Redis/gateway backing for clustered deployments.
3. **Offline RAG vs. Live Cloud LLMs:**
   - Category A offline retrieval (`hybrid_lexical_bm25_char_ngram_rrf`, `87` chunks) achieves `30/30` tool selection and `81.82%` Hit@4 (`18/22`), with `40.91%` Hit@1 (`Q03`, `Q12`, `Q21`, `Q25` misses).
   - Live Cloud LLM modes (Gemini `gemini-1.5-flash` & OpenAI `gpt-4o-mini`) report `NOT_EVALUATED_NO_API_KEY_IN_ENV` in offline CI environments; deterministic synthesis powers 100% of offline demos.
