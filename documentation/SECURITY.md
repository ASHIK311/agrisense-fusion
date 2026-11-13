# AgriSense Fusion: Security Architecture & Threat Posture

_Updated November 13, 2026 (`v2.1.0-competition-verified`). Verified by `security_regression.test.js`, `device_auth.test.js`, and `patch_regression.test.js`._

---

## 1. Core Security Controls

| Control Domain | Implementation | Verified File(s) |
|---|---|---|
| **Public Signup Role Lock (`P1-01`)** | Public self-registration strictly assigns `role: "farmer"`, silently overriding any client-supplied privilege escalation attempts (`admin`, `researcher`, `agronomist`, `superuser`). | `server/services/authService.js`, `patch_regression.test.js` |
| **JWT & Secret Hardening** | Production boot/runtime enforces `JWT_SECRET.length >= 32`. Invalid or tampered JWTs fail closed with `HTTP 403`. | `server/middleware/auth.js`, `security_regression.test.js` |
| **Constant-Time Hardware Auth** | ESP32 IoT edge ingestion validates `x-device-key` via `crypto.timingSafeEqual` (preventing timing side-channel leaks and forged key bypasses for valid `device_id`s). | `server/middleware/auth.js`, `device_auth.test.js` |
| **Multi-Tenant Isolation (`P1-03`)** | Farms, fields, reports, sensor telemetry, and AI conversation threads enforce strict caller ownership (`HTTP 404` on foreign farm/field lookups, `HTTP 401`/`403` on unauthorized threads/feedback). | `farmRoutes.js`, `reportRoutes.js`, `sensorRoutes.js`, `assistantRoutes.js` |
| **Immutable Demo Records** | Seeded Barind demonstration farms (`farm-barind-01`) are strictly protected against user modification or deletion (`HTTP 403`). | `farmRoutes.js`, `security_regression.test.js` |
| **HTTP Security Headers** | Disables `X-Powered-By` fingerprint and enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and strict `Permissions-Policy`. | `server/index.js` |
| **CORS Production Fail-Closed** | Production mode restricts cross-origin requests exclusively to explicit `CORS_ALLOWED_ORIGINS` allowlists (failing closed with `HTTP 403` if unset). | `server/index.js` |
| **Payload & Rate-Limit Bounds** | Express JSON body capped at `256kb`; assistant inputs bounded (`4000` chars `/chat`, `1000` chars `/query`); auth & AI burst traffic throttled (`HTTP 429` + `X-RateLimit-Limit`). | `server/index.js`, `server/middleware/rateLimiter.js`, `assistantRoutes.js` |
| **Postgres TLS Default** | Production `pg` pool configuration enforces strict TLS (`rejectUnauthorized: true` unless explicitly overridden). | `server/storage/db.js` |
| **Idempotency & Bounds Check** | Duplicate IoT `event_id` returns `HTTP 409`; physically impossible values (`VWC > 1.0`, `Temp > 65°C`) rejected with `HTTP 422`. | `server/services/sensorService.js`, `unit.test.js` |

---

## 2. Git Privacy & Secrets Hygiene

- `.gitignore` excludes `.env`, `.env.*` (preserving `.env.example`), runtime `.bak` files, and pre-cleanup forensic snapshot directories (`documentation/audit/**/backups/`).
- No live API keys or production secrets are committed in repository history.
