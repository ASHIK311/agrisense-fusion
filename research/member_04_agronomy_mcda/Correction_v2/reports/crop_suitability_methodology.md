# Crop Suitability Methodology & BARC Multi-Criteria Evaluation Report
## Field Shift — Member 4 Subsystem Correction_v2
**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Date:** November 2026  

---

## 1. Agricultural Land Evaluation Framework

The crop suitability assessment in **Field Shift** is based on the Land Resources Appraisal (LRA) system developed by the Bangladesh Agricultural Research Council (BARC) and the Soil Resource Development Institute (SRDI).

### Evaluated Land & Soil Attributes:
1. **Soil Physical Characteristics:** Effective soil depth, topsoil and subsoil texture, structure, presence of hardpan (common in Barind terrace).
2. **Soil Hydrology & Drainage:** Permeability, internal drainage class, groundwater depth, inundation depth and duration (Land Types F0: 0–30 cm, F1: 30–90 cm, F2: 90–180 cm, F3: 180–300 cm, F4: >300 cm).
3. **Soil Chemical Constraints:** Topsoil pH, electrical conductivity (salinity in coastal belt), organic matter content, nutrient availability.
4. **Physiography & Slope:** Terrain slope, flood risk, drought susceptibility index.

---

## 2. Area-Weighted Suitability Mathematical Formula

For each crop and upazila, the land evaluation establishes the physical area (in hectares) falling into five standard FAO land suitability orders:
- **Very Suitable ($A_{\text{very}}$):** Factor score = 1.0 (No significant land limitations).
- **Suitable ($A_{\text{suit}}$):** Factor score = 0.8 (Minor limitations readily overcome by management).
- **Moderately Suitable ($A_{\text{mod}}$):** Factor score = 0.6 (Moderate limitations reducing yield or increasing costs).
- **Marginally Suitable ($A_{\text{marg}}$):** Factor score = 0.4 (Severe limitations requiring high inputs).
- **Not Suitable ($A_{\text{not}}$):** Factor score = 0.0 (Prohibitive physical or chemical barriers).

The aggregate suitability score and percentage are computed as:

$$\text{Suitability Score} = (1.0 \times A_{\text{very}}) + (0.8 \times A_{\text{suit}}) + (0.6 \times A_{\text{mod}}) + (0.4 \times A_{\text{marg}}) + (0.0 \times A_{\text{not}})$$

$$\text{Suitability Percentage (\%)} = \left( \frac{\text{Suitability Score}}{A_{\text{classified}}} \right) \times 100$$

Where $A_{\text{classified}} = A_{\text{very}} + A_{\text{suit}} + A_{\text{mod}} + A_{\text{marg}} + A_{\text{not}}$.

---

## 3. Suitability Classes & Interpretative Guidelines

| Class Symbol | Descriptive Nomenclature | Suitability Score Range | Production & Management Interpretation |
| :---: | :--- | :---: | :--- |
| **S1** | Highly Suitable | $\ge 75.0\%$ | Optimal land capability. Yield potential exceeds 85% of genetic potential with standard farmer practice. |
| **S2** | Suitable | $65.0\% - 74.99\%$ | Good capability. Minor limitations (e.g., slight drainage restriction or minor slope) manageable with recommended fertilizer and irrigation. |
| **S3** | Moderately Suitable | $50.0\% - 64.99\%$ | Moderate capability. Production viable but requires specialized interventions (e.g., supplementary irrigation, liming, or subsoiling). |
| **S4** | Marginally Suitable | $35.0\% - 49.99\%$ | Marginal capability. High economic and climatic risk. Low return on investment without intensive capital infrastructure. |
| **N** | Not Suitable | $< 35.0\%$ | Unsuitable land. Severe constraints (e.g. permanent waterlogging, severe salinity, rocky terrain) render cultivation unsustainable. |

---

## 4. Distinction Between Suitability and Yield

It is a core scientific mandate of this audit to maintain a strict distinction between:
- **Suitability Score (%):** A static spatial assessment of physical land and soil capability under normal seasonal management.
- **Crop Yield (kg/ha):** The dynamic, realized harvest output dependent on seasonal weather anomalies (heat waves, dry spells, flood surges), fertilizer timing, seed variety, pest outbreaks, and irrigation delivery.
- **A high suitability score does NOT guarantee high yield if a severe climatic shock occurs, and suitability must never be cited as an ML prediction accuracy metric.**
