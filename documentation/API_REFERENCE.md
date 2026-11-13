# AgriSense Fusion: REST API Reference

_Updated November 13, 2026 (`v2.1.0-competition-verified`). Base URL: `http://localhost:5000/api/v1` (with backwards-compatible aliases on `/api/*`)._

---

## 1. Core System & Authentication

| Method | Endpoint | Auth | Response / Behavior |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/health`, `/api/v1/health` | None | Returns system status, `storageMode`, uptime, and active Member 1–6 flags. |
| `GET` | `/api/dashboard`, `/api/v1/dashboard` | Optional | Consolidated dashboard initialization state (farm, field, NASA weather, FAO-56 physics, sensor, groundwater, alerts). |
| `POST` | `/api/v1/auth/register` | Rate-Limited | Creates user account. Public signup strictly forces `role = "farmer"` regardless of submitted role (`HTTP 201`). |
| `POST` | `/api/v1/auth/login` | Rate-Limited | Authenticates user and returns signed JWT (`HTTP 200`). |
| `GET` | `/api/v1/auth/me` | Bearer JWT | Returns current authenticated user profile (`HTTP 401`/`403` on missing/invalid JWT). |

---

## 2. Farms, Fields & Telemetry

| Method | Endpoint | Auth | Response / Behavior |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/v1/farms` | Optional | Lists public demo farms (`farm-barind-01`) + caller's own tenant farms. |
| `GET` | `/api/v1/farms/:id` | Optional / Owner | Returns farm details, fields, and groundwater (`HTTP 404` on foreign private farms). |
| `POST` | `/api/v1/farms` | Bearer JWT | Creates a tenant-scoped farm (`HTTP 201`). Demo farm edits blocked (`HTTP 403`). |
| `GET` | `/api/v1/fields` | Optional | Lists fields (scoped to caller or public demo). |
| `POST` | `/api/v1/fields` | Bearer JWT | Creates field plot assigning canonical Barind `silty_clay_loam` defaults (`0.323` FC, `0.165` WP, `0.50 m` depth) if omitted. |
| `POST` | `/api/v1/sensor-readings` | `x-device-key` / Bearer | Ingests ESP32 FDR v2 readings. Enforces physical range bounds (`HTTP 422`), duplicate `event_id` idempotency (`HTTP 409`), and `is_simulated: true`. |
| `GET` | `/api/v1/sensor-readings` | Optional / Owner | Lists telemetry scoped strictly to authorized fields (`HTTP 404` on foreign field). |
| `GET` | `/api/v1/sensor-readings/profile` | None | Returns canonical Barind soil profile (`0.435` sat, `0.323` FC, `0.244` trigger, `0.165` WP, `0.50 m`, `79.0 mm` TAW, `39.5 mm` RAW). |
| `GET` | `/api/v1/devices` | Optional | Lists registered ESP32 edge node identifiers. |

---

## 3. NASA POWER Weather, Satellite GIS & Hydrology

| Method | Endpoint | Auth | Response / Behavior |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/v1/weather/history` | None | Returns historical NASA POWER Godagari daily rows (`1,827` records `2019–2024`; `34.8 km` ESE Rajshahi station anchor). |
| `GET` | `/api/v1/weather/risk` | None | Evaluates Member 2 compound heat-dryness hazard (`Tmax >= 35°C`, `Rain == 0`) guarding `-999`/`null` sentinels as `INSUFFICIENT_DATA`. |
| `GET` | `/api/v1/weather/forecast` | None | **Intentional Gate (`HTTP 501 NOT_IMPLEMENTED`):** Live NWP forecasting not fabricated. |
| `GET` | `/api/v1/satellite/metadata` | None | Returns reconciled `RandomForest_21Feat_Deep` performance (`85.77%` Block C holdout, `84.63% ± 3.81%` spatial CV, `N=6,000`). |
| `POST` | `/api/v1/satellite/classify` | None | Runs offline 15-feature heuristic demo fallback LULC prediction across 4 classes. |
| `POST` | `/api/v1/satellite/indices` | None | Computes NDVI, NDWI, EVI, SAVI, and BSI safely guarding zero denominators. |
| `POST` | `/api/v1/satellite/classify-crop` | None | **Intentional Gate (`HTTP 422 BLOCKED`):** Crop-species classification disabled pending DAE cadastral polygons. |
| `GET` | `/api/v1/groundwater` | Optional | Returns regional drawdown readings (`SYNTHETIC_REGIONAL_PROXY`, `is_simulated: true`, `has_physical_piezometers: false`, `0.65 m/yr` decline). |

---

## 4. FAO-56 Physics, Agronomy, Pathology & Reports

| Method | Endpoint | Auth | Response / Behavior |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/physics/et0` | None | Calculates deterministic FAO-56 Penman-Monteith $ET_0$ (rejects missing inputs without silent defaults). |
| `POST` | `/api/v1/physics/water-balance` | None | Computes root-zone depletion $D_r$, stress coefficient $K_s$, TAW (`79.0 mm` default or explicit override), and RAW (`39.5 mm`). |
| `GET` | `/api/v1/agronomy/suitability` | None | Returns BARC AEZ-26 suitability scores across Barind crops. |
| `GET` | `/api/v1/agronomy/calendar` | None | Returns Godagari sowing/harvest crop calendars. |
| `POST` | `/api/v1/decision/crop-rotations` | None | Dynamic 4-slider MCDA ranking across 6 modeled provisional Barind crop rotations (alias: `/api/v1/agronomy/rotations`). |
| `POST` | `/api/v1/agronomy/predict-yield` | None | **Intentional Gate (`HTTP 501 NOT_IMPLEMENTED`):** Multi-season parcel yield prediction disabled pending field trials. |
| `GET` | `/api/v1/diseases` | None | Lists `17` Bangladesh crop diseases with mandatory non-diagnostic disclaimer. |
| `GET` | `/api/v1/diseases/research/papers` | None | Returns `60` DOI-verified papers (`48` full-text, `5` abstract, `7` metadata confirmed). |
| `GET` | `/api/v1/diseases/screen/environmental` | None | Microclimate susceptibility screening (soil-borne diseases explicitly flag `leaf_wetness_applicable: false`). |
| `GET` | `/api/v1/alerts` | Optional | Tenant-scoped soil moisture / drawdown alerts (`PATCH /api/v1/alerts/:id/acknowledge` requires Bearer JWT). |
| `GET` | `/api/v1/reports/summary` | Optional / Owner | Consolidated multi-domain report (`?format=json|csv`, `HTTP 404` on foreign farm). |
| `GET` | `/api/v1/reports/export` | Optional / Owner | Export telemetry or agronomic records excluding private cross-tenant leaks. |

---

## 5. Bilingual AI Copilot & RAG Assistant

| Method | Endpoint | Auth | Response / Behavior |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/assistant/chat` | Rate-Limited | Conversational English / বাংলা assistant (`4000`-char max, executes deterministic physics tools, cites DOIs). |
| `POST` | `/api/v1/assistant/stream` | Rate-Limited | Server-Sent Events (SSE) streaming assistant response. |
| `POST` | `/api/v1/assistant/query` | Rate-Limited | Hybrid BM25 + 3-gram RRF semantic search across `87` chunks (`1000`-char max). |
| `GET` | `/api/v1/assistant/tools` | None | Lists `9` deterministic assistant tool schemas. |
| `POST` | `/api/v1/assistant/tools/execute` | Optional / Rate-Limited | Direct tool execution (`HTTP 400` on invalid object params, `401`/`403` on private farm tools). |
| `GET`/`DELETE` | `/api/v1/assistant/conversations/:id` | Bearer JWT | Manage caller's own conversation threads (`401`/`403` cross-tenant). |
| `POST` | `/api/v1/assistant/feedback` | Bearer JWT | Record thumbs-up/down accuracy rating (`401`/`403` cross-tenant). |
