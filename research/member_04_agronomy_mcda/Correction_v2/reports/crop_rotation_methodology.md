# Crop Rotation Methodology & Agronomic Validation Report
## Field Shift — Member 4 Subsystem Correction_v2
**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Date:** November 2026  

---

## 1. Executive Summary & Audit Resolution

The initial forensic audit revealed that Member 4's previous crop rotation dataset (`crop_rotation_candidate_dataset.csv`, 409 rows) was merely a list of candidate crops with **306 duplicate rows** and **zero rotation sequencing logic**.

In `Correction_v2`, an agronomic crop rotation engine was constructed based on:
1. **Soil Nutrient Dynamics:** Alternating nitrogen-depleting exhaustive cereals (rice, maize) with nitrogen-fixing grain legumes (mungbean, lentil, chickpea).
2. **Turnaround Window Feasibility:** Enforcing a minimum 10–15 day window between harvesting Crop A and sowing Crop B for tillage, stubble management, and land leveling.
3. **Hydrological Sustainability:** Restricting water-intensive Boro rice in drought-prone Barind upazilas (including Godagari) and promoting water-saving conservation rotations (T. Aman -> Wheat -> Mungbean).
4. **Pest & Disease Break:** Interrupting continuous monoculture cycles that foster stem borers (*Scirpophaga incertulas*), gall midge, and bacterial leaf blight.

---

## 2. Validated Cropping Patterns

Documented in `data/reference/rotation_rules_reference.csv`:

### Pattern 1: Conservation Cereal-Legume Rotation (Recommended for Godagari)
- **Sequence:** $\text{T. Aman Rice (Kharif-2)} \longrightarrow \text{Winter Wheat (Rabi)} \longrightarrow \text{Mungbean (Kharif-1)}$
- **Turnaround:** Aman harvest late Nov $\rightarrow$ Wheat sowing Nov 25–30 (10–12 days). Wheat harvest late March $\rightarrow$ Mungbean sowing early April (10 days).
- **Water Demand:** 350–450 mm annually (Low). **Saves >65% groundwater** relative to Boro monoculture.
- **Soil Benefit:** Mungbean leaves fix 30–50 kg N/ha, enhancing soil organic matter in heavy Barind clay.

### Pattern 2: High-Value Cereal Diversification
- **Sequence:** $\text{T. Aman Rice (Kharif-2)} \longrightarrow \text{Rabi Maize (Rabi)} \longrightarrow \text{Fallow / Short Pulse}$
- **Turnaround:** Aman harvest late Nov $\rightarrow$ Maize sowing Dec 1–10 (12–15 days). Maize harvest late April.
- **Water Demand:** 500–650 mm annually (Moderate). **Saves ~50% groundwater** relative to Boro rice while generating higher economic margins.

### Pattern 3: Traditional Double Rice (Restricted in High Barind)
- **Sequence:** $\text{T. Aman Rice} \longrightarrow \text{Boro Rice} \longrightarrow \text{Fallow}$
- **Water Demand:** 1,100–1,400 mm annually (Extreme). Over-pumping depletes the Barind aquifer at >0.5 m/year. Restricted in Godagari; restricted to low-lying floodplains with abundant surface water.

---

## 3. National Upazila Recommendations

The dataset `data/processed/national_crop_rotation_recommendations.csv` covers all **466 agricultural upazilas in Bangladesh**.
- Each recommendation integrates BARC suitability rankings, regional hydrogeological constraints, and agro-ecological zone characteristics.
- For Godagari Upazila:
  - **Primary Recommendation:** `T. Aman Rice -> Winter Wheat -> Mungbean (Water-Conserving)`
  - **Alternative Recommendation:** `T. Aman Rice -> Rabi Maize -> Fallow (High-Value Grain)`
  - **Water Savings:** 60%–70% reduction in groundwater extraction compared to Boro rice.
