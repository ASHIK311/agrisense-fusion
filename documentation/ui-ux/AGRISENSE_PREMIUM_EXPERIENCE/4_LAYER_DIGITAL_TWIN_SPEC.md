# AGRISENSE FUSION — 4-LAYER STRATIGRAPHIC DIGITAL TWIN SPECIFICATION

**Component:** [`frontend/src/components/StratigraphicTwinCanvas.jsx`](file:///F:/nasa%20project/frontend/src/components/StratigraphicTwinCanvas.jsx)  
**Deployments:** Public Home Hero (`/`) & 3D-First Agricultural Command Center (`/app/overview`)

---

## 1. Four Vertically Stratified Horizons

| Layer | Name | Visual & Telemetry Representation | Provenance Badge & Source |
|---|---|---|---|
| **Layer 01 (Top)** | **Atmosphere & Agroclimatology** | Solar irradiance vectors (`20.4 MJ/m²/d`), `Tmax/Tmin`, `ET0 = 4.63 mm/day`, compound heat-dryness screening rule | `NASA POWER` (`MERRA-2` $0.5^\circ\times0.625^\circ$, `CERES` $1.0^\circ\times1.0^\circ$ at `24.3636°N, 88.6241°E`, ~`34.8 km` ESE) |
| **Layer 02** | **Spectral Canopy (Sentinel-2 L2A)** | 10m optical (`B2, B3, B4, B8`) + 20m SWIR (`Band 11` resampled to 10m) spectral mesh (`NDVI`, `NDMI`, `NDWI`, `True Color`) | `SATELLITE-DERIVED` (`84.63% ± 3.81%` 5-fold spatial CV; `85.77%` Block C; 422 Crop Species Gate) |
| **Layer 03** | **Agricultural Surface & Terraced Parcels** | Clickable Godagari terraced plots (`PARCEL A-01` `2.4 ha`, `PARCEL B-02` `1.85 ha`, `PARCEL C-03` `1.30 ha`), BARC suitability, disease screening | `HISTORICAL BASELINE` (`Aman 78.92%`, `Maize 73.44%`, `Wheat 57.41%`, `Aus 40.98%`, `Boro 40.51%`) |
| **Layer 04 (Base)** | **Subsurface Root Zone & BMDA Aquifer** | Isometric soil & vadose cutaway ($Z_r = 0.50\text{ m}$, `TAW = 79.0 mm`, `RAW = 39.5 mm`) + `26.4 m` DTW water table vs `28.0 m` suction limit | `MODEL-DERIVED` / `SYNTHETIC PROXY` (FAO-56 `< 1e-6` parity + Jahan et al., 2010 `+0.65 m/yr` drawdown) |

---

## 2. Interactive Controls & Fallbacks

1. **Exploded vs. Assembled Toggle (`exploded`):** Dynamically separates or compresses vertical Z-spacing between the 4 stratigraphic horizons.
2. **3D Stratified Twin vs. 2D GIS Ortho View (`renderMode`):** Instant one-click switch between the isometric 3D block and a 2D orthographic parcel map with the 34.8 km NASA POWER tether.
3. **Camera Orbit & Tilt Sliders (`cameraYaw`, `cameraPitch`):** Smooth user control over viewing angle without auto-rotating distractions.
4. **Reduced Motion & Low-GPU Resilience:** Pure hardware-accelerated SVG/CSS geometry renders in `< 16 ms` with zero multi-megabyte WebGL bundle bloat and honors `prefers-reduced-motion: reduce` and the global `Pause Motion` toggle.
