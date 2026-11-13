# AGRISENSE FUSION — 2D/3D SPATIAL & SPECTRAL COMPARISON SPECIFICATION

**Components:**
- [`frontend/src/components/SpatialTwinWorkspace.jsx`](file:///F:/nasa%20project/frontend/src/components/SpatialTwinWorkspace.jsx) (`/app/spatial-twin`)
- [`frontend/src/components/CanopySpectralLab.jsx`](file:///F:/nasa%20project/frontend/src/components/CanopySpectralLab.jsx) (`/app/spectral-lab`)

---

## 1. Synchronized 2D/3D Spatial Twin (`/app/spatial-twin`)

- **Dual-Viewport Architecture:**
  - **Left Viewport (2D Orthographic GIS Map):** Renders Godagari parcel polygons (`PARCEL A-01`, `PARCEL B-02`, `PARCEL C-03`), graticule coordinates (`EPSG:4326`), UTM Zone 45N metric readouts (`EPSG:32645`), simulated ESP32 node placement, and the **34.8 km Spatial Offset Tether**.
  - **Right Viewport (2.5D/3D Isometric Terraced Relief):** Renders stepped High Barind terrace blocks (`34.8 m` to `39.2 m` relative elevation) above the subsurface BMDA aquifer profile (`26.4 m` vs `28.0 m` critical suction limit). Explicitly labeled as **illustrative terraced relief (non-survey DEM)**.
- **Linked Spatial Crosshair Cursor:** Pointer movement over either viewport computes normalized spatial coordinates $(u, v) \in [0, 1]^2$ and projects synchronized crosshairs in both 2D and 3D simultaneously, updating live `WGS84` and `UTM 45N` coordinates in the telemetry bar.
- **Layout Modes:** `Split 2D + 3D` (default), `2D GIS Only`, `3D Terrain Only`, and `Swap Left/Right`.
- **34.8 km Spatial Offset Tether:** Visually links the Godagari Upazila study centroid (`24.469°N, 88.330°E`) to the NASA POWER Rajshahi grid point (`24.3636°N, 88.6241°E`, ~`34.8 km` ESE).

---

## 2. Canopy & Spectral Curtain Wipe Lab (`/app/spectral-lab`)

- **Mode A (Same-Date Multi-Index Comparison):** Draggable vertical curtain (`5%`–`95%`) wiping between any two Sentinel-2 indices (`NDVI`, `NDMI`, `EVI`, `McFeeters NDWI`, `True Color`) on the same observation date.
- **Mode B (12-Scene Temporal Comparison):** Draggable vertical curtain comparing any two of the 12 valid cloud-screened Sentinel-2 passes (`2025-11-17` through `2026-03-07`).
- **Resolution & Validation Provenance:** Explicitly distinguishes `10m` native optical bands (`B2, B3, B4, B8`) from `20m` `Band 11` SWIR resampled to `10m` for `NDMI`, alongside the reconciled Random Forest validation metrics (`84.63% ± 3.81%` 5-fold spatial CV; `85.77%` Block C holdout) and the `HTTP 422` crop-species gate.
