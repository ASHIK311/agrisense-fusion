# AGRISENSE FUSION — FINAL DESIGN SYSTEM SPECIFICATION

**Theme Identity:** `Barind Terracotta & Botanical Obsidian` (**Barind Stratigraphic Lab**)  
**Study Region:** Godagari Upazila, Rajshahi District, Bangladesh (`AEZ 26 — High Barind Tract`, Primary Centroid: `24.469°N, 88.330°E`)  
**Implementation File:** [`frontend/src/index.css`](file:///F:/nasa%20project/frontend/src/index.css)

---

## 1. Color Token System

| Semantic Token | Hex / Value | Purpose |
|---|---|---|
| `--bg-canvas` | `#080D0A` | Primary deep botanical obsidian canvas with subtle topographic grid |
| `--bg-alt` | `#101713` | Secondary sidebar, table header, and elevated section background |
| `--bg-surface` | `#111A15` | Primary analytical card and observatory workspace surface |
| `--bg-elevated` | `#18251D` | Active interactive state, selected layer button, and modal header |
| `--text-main` | `#F1F1E8` | High-contrast warm parchment primary text |
| `--text-muted` | `#A6B2A7` | Secondary descriptive copy and axis labels |
| `--text-dim` | `#7E8F81` | Tertiary metadata and graticule annotations |
| `--accent-terracotta` | `#D97742` | Barind Pleistocene clay-loam soil, strata emphasis, and judge tour accents |
| `--accent-canopy` | `#10B981` | Photosynthetic vegetation vigor (`NDVI`/`EVI`), active states, and primary CTAs |
| `--accent-water` | `#06B6D4` | FAO-56 root-zone water (`ET0`/`ETc`/`TAW`), `NDMI`/`NDWI`, and BMDA aquifer |
| `--accent-warning` | `#F59E0B` | Atmospheric desiccation screening, simulated/uncalibrated warnings, and RAW trigger |
| `--accent-danger` | `#E36F67` | High-risk thresholds (`28.0 m` suction limit, `PWP`, blocked scientific gates) |
| `--border-subtle` | `#29352D` | Hairline 1px structural borders across all cards and tables |

---

## 2. Typography & Tabular Numerals

- **Display / Editorial Headlines (`--font-display`):** `'Fraunces', Georgia, serif`
- **UI & Bilingual Body (`--font-sans`):** `'Plus Jakarta Sans', 'Noto Sans Bengali', system-ui, sans-serif`
- **Telemetry, Equations & Coordinates (`--font-mono`):** `'JetBrains Mono', monospace`
- **Tabular Numerals:** Enforced globally via `font-variant-numeric: tabular-nums` on `.tabular-nums`, `.card-value`, `table`, `td`, `th`, `code`, `pre`, and `.mono`.
- **Responsive Fluid Type Scale:** Uses `clamp()` combining viewport-relative and font-relative units with maximum $\le 2.5\times$ minimum so browser zoom up to 500% satisfies WCAG 1.4.4 (200% text resize).

---

## 3. Surface & Provenance Badge Rules

- **Restrained Glass:** Heavy glassmorphism is removed from standard cards; `backdrop-filter: blur(8px)` is restricted exclusively to floating map/3D HUD overlays (`.hud-floating-panel`).
- **Standardized Provenance Badges (`ProvenanceBadge.jsx`):**
  - `MEASURED`, `SATELLITE-DERIVED`, `NASA POWER`, `SIMULATED`, `UNCALIBRATED`, `SYNTHETIC PROXY`, `HISTORICAL BASELINE`, `MODEL-DERIVED`, `LITERATURE-DERIVED`, `ASSUMPTION`, `UNAVAILABLE`, `BLOCKED`.
- **Global `X-RAY PROVENANCE` Toggle:** Expands structured `.xray-drawer` metadata on every card showing source, spatial/spectral resolution, coordinate offset, calibration state, and missing/null variables.
