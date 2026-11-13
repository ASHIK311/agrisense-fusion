# Crop Calendar & Weather Linkage Report
## Field Shift — Member 4 Subsystem Correction_v2
**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Date:** November 2026  

---

## 1. Audit Finding Resolution: The 0% Weather Defect

In the initial audit, 5 out of 6 crop calendar CSVs extracted from Department of Agricultural Extension (DAE) scanned PDFs exhibited **0.0% weather coverage** (all weekly meteorological parameter columns were blank).

### Corrective Implementation in `Correction_v2`:
1. **Separation of Concerns:** Recognized that static scanned agricultural advisories provide authoritative **phenological timing** (sowing windows, seedling nursery durations, transplanting cutoffs, harvesting dates), while satellite/reanalysis products provide continuous **meteorological conditions**.
2. **NASA POWER Linkage:** Created `data/processed/crop_calendar_weather_linkage.csv`, which directly connects the phenological active growing window of each crop to NASA POWER MERRA-2 continuous climatology.
3. **National Expansion:** Built `data/processed/national_crop_calendar.csv` across all 466 official agricultural upazilas covering:
   - T. Aman Rice (Kharif-2)
   - Boro Rice (Rabi)
   - Aus Rice (Kharif-1)
   - Winter Wheat (Rabi)
   - Rabi Maize
   - Kharif-1 Summer Maize

---

## 2. Phenological Schedule for Godagari Upazila (Barind Tract)

| Crop | Primary Season | Sowing / Nursery Window | Optimal Transplanting Window | Peak Reproductive Phase | Harvest Window | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T. Aman Rice** | Kharif-2 | June 15 – July 15 | July 15 – August 15 | Sep 20 – Oct 25 (Heading/Flowering) | Nov 10 – Dec 10 | 135 days |
| **Boro Rice** | Rabi | Nov 15 – Dec 15 | Jan 10 – Feb 10 | April 1 – April 25 (Peak Heat Risk) | April 25 – May 25 | 150 days |
| **Aus Rice** | Kharif-1 | March 20 – April 20 | April 15 – May 10 | June 10 – July 5 | July 10 – August 10 | 115 days |
| **Wheat** | Rabi | Nov 15 – Dec 5 | Direct seeded (Nov 20–30) | Feb 10 – Feb 28 (Anthesis) | March 15 – March 30 | 110 days |
| **Rabi Maize** | Rabi | Nov 1 – Dec 10 | Direct seeded | Feb 15 – March 20 (Silking) | April 10 – April 30 | 140 days |

---

## 3. Climate Vulnerability Analysis by Growth Stage

1. **Boro Rice Thermal Hazard in April:** Heading occurs when mean maximum temperatures in Godagari peak at **38°C to 40°C**. High temperatures combined with vapor pressure deficit induce spikelet sterility if standing water is not maintained.
2. **T. Aman Terminal Drought in October:** Monsoon rains abruptly cease in mid-October. Late-transplanted Aman faces acute moisture stress during panicle development unless supplementary irrigation is delivered.
3. **Wheat Terminal Heat in Late February:** Sowing past December 5 pushes grain filling into hot March conditions, drastically shrinking the 1000-grain weight.
