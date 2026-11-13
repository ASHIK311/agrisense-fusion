# AGRISENSE FUSION — GUIDED 3-MINUTE JUDGE DEMO STORYBOARD

**Controller Component:** [`frontend/src/components/JudgeDemoBar.jsx`](file:///F:/nasa%20project/frontend/src/components/JudgeDemoBar.jsx)  
**Activation:** Click `🏆 3-Min Judge Tour` in the Public Home Header or Command Deck Top Context Bar.

---

## 6-Step Interactive Walkthrough (180 Seconds Total)

| Step | Time | Target Route | Demonstration Focus | Key Verified Evidence Shown |
|---|---|---|---|---|
| **Step 1** | `0:00–0:30` | `/` (`HomeStoryPage`) | **The High Barind Crisis & 4-Layer Stratigraphic Twin** | Explode/assemble the 4 layers (`Atmosphere`, `Spectral Canopy`, `Terraced Surface`, `Subsurface Root Zone & Aquifer`). Highlight `26.4 m` proxy DTW depth vs `28.0 m` suction limit (`+0.65 m/yr` drawdown). |
| **Step 2** | `0:30–1:00` | `/app/spatial-twin` | **Synchronized 2D/3D Spatial Twin & 34.8 km NASA Tether** | Move the linked crosshair cursor across the 2D GIS cadastre and 3D terraced relief. Inspect the explicit **34.8 km ESE Spatial Offset Tether** (`24.469°N, 88.330°E` $\leftrightarrow$ `24.3636°N, 88.6241°E`). |
| **Step 3** | `1:00–1:30` | `/app/spectral-lab` | **Sentinel-2 Canopy & Spectral Curtain Wipe** | Drag the curtain slider across `NDVI` (`10m`) and `NDMI` (`20m Band 11 → 10m`) in Mode A and across the 12 valid Sentinel-2 passes in Mode B. Verify `84.63% ± 3.81%` spatial CV, `85.77%` Block C holdout, and the `422` crop-species gate. |
| **Step 4** | `1:30–2:00` | `/app/root-zone` | **FAO-56 Root-Zone Cutaway & Dual-Inspector** | Toggle between the 2D scientific profile and 3D soil column. Inspect provisional VWC thresholds (`43.5%`, `32.3%`, `24.4%`, `16.5%`), the 8-step FAO-56 trace, `70%` vs `85%` irrigation efficiency, and the **Physics vs. RAG Dual-Inspector**. |
| **Step 5** | `2:00–2:30` | `/app/simulator` | **Split-Screen What-If Scenario Simulator** | Compare Scenario A (`Boro-Heavy Baseline` @ `70%` eff) vs Scenario B (`Mustard → Mungbean → T. Aman` @ `85%` eff) powered by `/api/v1/decision/crop-rotations` (`SIMULATED SCENARIO — NOT FIELD-VALIDATED SAVINGS`). |
| **Step 6** | `2:30–3:00` | `/app/assistant` | **Grounded Bilingual (EN / বাংলা) RAG Assistant** | Run English and Bangla queries against the 83-chunk scientific corpus and 9 deterministic tools. Verify DOI citations and non-override of deterministic physics outputs. |
