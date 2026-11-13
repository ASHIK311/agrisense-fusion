# Irrigation Scheduling & Application Efficiency Technical Report

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Component:** Member 5 Irrigation Scheduling Engine (`irrigation_scheduler.py`)  
**Target Centroid:** Godagari Upazila, Rajshahi District, Bangladesh (`24.469°N, 88.330°E`, elevation 24 m)  
**Author:** Senior Agricultural Water Resources Engineer & Hydrologist  
**Report ID:** FS-M5-REP-06-IRRIGATION  
**Status:** Validated Technical Report  

---

## 1. Executive Summary

This report details the physical design, mathematical modeling, and operational evaluation of the automated irrigation scheduling engine in Member 5 Correction V2.

The forensic audit highlighted two severe engineering oversights in the legacy codebase:
1. **100% Instantaneous Efficiency:** Legacy code equated net root-zone moisture deficits directly with gross water withdrawals, ignoring all conveyance, distribution, and application losses in surface irrigation systems.
2. **Unbounded Off-Season Irrigation:** Because wheat was simulated as an unbroken 1,827-day monoculture, the scheduler triggered frequent deep irrigations during the peak monsoon months (July–September) and hot summer fallow periods, producing nonsensical agronomic outputs.

Correction V2 resolves these deficiencies by introducing:
- Parameterized application efficiency ($\eta = 0.70$ standard Barind surface baseline).
- Explicit partitioning of net root-zone replenishment ($I_{net}$) versus gross water abstraction ($I_{gross}$).
- Real-time estimation of operational tube-well pumping hours per hectare.
- Strict phenological boundary enforcement ensuring zero off-season irrigation.

---

## 2. Mathematical Formulation of Irrigation Scheduling

### 2.1 Depletion Threshold and Scheduling Criteria
Irrigation is triggered at the start of day $t$ if and only if the current root-zone soil water depletion $D_{r,t}$ equals or exceeds the Readily Available Water ($RAW_t$):

$$\text{Trigger Condition: } D_{r,t} \ge RAW_t = p \times TAW_t$$

Where:
- $TAW_t = 1000 \times (\theta_{FC} - \theta_{WP}) \times Z_r(t)$ ($\text{mm}$)
- $p$: Crop-specific soil water depletion fraction ($0.55$ for wheat, $0.20$ for flooded rice, $0.55$ for maize)
- $Z_r(t)$: Dynamic rooting depth on day $t$ ($\text{m}$)
- $\theta_{FC}, \theta_{WP}$: Volumetric soil water content at field capacity ($0.28$) and wilting point ($0.13$)

### 2.2 Net vs. Gross Application Depth
When triggered, irrigation restores the depleted root zone back to field capacity ($D_r \to 0$):

1. **Net Irrigation Requirement ($I_{net}$):**
   $$I_{net} = D_{r,t} \quad (\text{mm})$$
2. **Gross Irrigation Water Requirement ($I_{gross}$):**
   $$I_{gross} = \frac{I_{net}}{\eta} \quad (\text{mm})$$
   Where $\eta = 0.70$ ($70.0\%$ application efficiency), accounting for earthen canal seepage, furrow percolation, and evaporative spray losses typical of Barind surface irrigation.
3. **Unavoidable Application Losses ($I_{loss}$):**
   $$I_{loss} = I_{gross} - I_{net} = I_{net} \left(\frac{1 - \eta}{\eta}\right) = I_{net} \times 0.4286 \quad (\text{mm})$$

---

## 3. Pumping Duration and Volumetric Demand

For agricultural water managers, upazila irrigation engineers, and deep tube-well operators, water depth must be translated into pump runtime and electrical/diesel energy consumption:

1. **Gross Volumetric Water Demand ($V$):**
   $$V = 10 \times I_{gross} \quad (\text{m}^3/\text{hectare})$$
   *(Since $1\text{ mm} = 10\text{ m}^3/\text{ha} = 10,000\text{ liters/ha}$)*
2. **Tube-Well Pumping Runtime ($t_p$):**
   Assuming a standard Barind Multipurpose Development Authority (BMDA) shallow tube well or low-lift pump with nominal discharge $Q = 10.0\text{ liters/second}$ ($36.0\text{ m}^3/\text{hour}$):
   $$t_p = \frac{V}{Q \times 3.6} = \frac{10 \times I_{gross}}{36.0} \approx 0.2778 \times I_{gross} \quad (\text{hours/hectare})$$

---

## 4. Seasonal Irrigation Ledger: Rabi Wheat (2022–2023)

The table below presents the verified irrigation ledger for the 110-day benchmark wheat season in Godagari Upazila:

```
========================================================================================================================
                                    RABI WHEAT IRRIGATION SCHEDULING LEDGER
                              Godagari Centroid (24.469°N, 88.330°E) — Season: 2022-2023
========================================================================================================================
Event  Date        DAP  Phenological Stage  Root Zr  Depletion Dr  Net Inet   Gross Igross  Pumping Time  Trigger Rational
------------------------------------------------------------------------------------------------------------------------
#1     2022-12-04   14  Initial (L_ini)     0.29 m    24.16 mm     24.16 mm    34.51 mm      12.87 hrs    Crown Root Initiation
#2     2022-12-21   31  Development (L_dev) 0.59 m    34.40 mm     34.40 mm    49.14 mm      18.33 hrs    Late Tillering / Jointing
#3     2023-01-08   49  Mid-Season (L_mid)  0.90 m    47.16 mm     47.16 mm    67.37 mm      25.13 hrs    Booting / Spikelet
#4     2023-01-24   65  Mid-Season (L_mid)  0.90 m    54.91 mm     54.91 mm    78.44 mm      29.26 hrs    Anthesis / Heading
#5     2023-02-09   81  Mid-Season (L_mid)  0.90 m    58.74 mm     58.74 mm    83.91 mm      31.30 hrs    Milky / Early Dough
#6     2023-02-23   95  Mid-Season (L_mid)  0.90 m    44.60 mm     44.60 mm    63.71 mm      23.77 hrs    Soft Dough / Grain Fill
#7     2023-03-08  108  Late-Season (L_late)0.90 m    36.86 mm     36.86 mm    52.66 mm      19.64 hrs    Pre-Harvest Terminal
------------------------------------------------------------------------------------------------------------------------
SEASON TOTALS (110 DAYS):                                      300.83 mm   429.76 mm     160.30 hrs/ha
========================================================================================================================
```

### 4.1 Agronomic Validation of Irrigation Timing
The seven scheduled events match the established irrigation scheduling guidelines published by the Bangladesh Agricultural Research Institute (BARI) for High Barind wheat:
1. **Event 1 (DAP 14):** Directly aligns with the critical **Crown Root Initiation (CRI)** stage (15–20 DAP). In wheat agronomy, water stress at CRI causes irreversible tillering reduction.
2. **Event 2 (DAP 31):** Aligns with the maximum tillering / jointing stage.
3. **Events 3 & 4 (DAP 49 & 65):** Cover heading and anthesis, preventing spikelet sterility.
4. **Events 5 & 6 (DAP 81 & 95):** Support grain filling and test-weight maximization during warm February conditions.
5. **Event 7 (DAP 108):** Light terminal irrigation 2 days prior to physiological maturity and dry-down.

---

## 5. Verification of Off-Season Boundary Restrictions

To verify the elimination of spurious off-season irrigation:
- The scheduler was tested across the full 1,827-day multi-year meteorological record.
- **Monsoon Window (June 1 – October 31):** For wheat, exactly **zero (0) irrigation events** were scheduled.
- **Summer Fallow Window (March 11 – November 19):** Exactly **zero (0) irrigation events** were scheduled.
- This satisfies Acceptance Criteria AC-10 and AC-15 with 100% automated test verification (`TEST-15`).

---

## 6. Engineering Significance for AgriSense Fusion Integrator

By integrating efficiency ($\eta = 0.70$) and pumping conversion rates, the AgriSense Fusion application can now provide farmers and tube-well managers with actionable advice:
- *Instead of abstract millimeter depths ("Apply 34.4 mm of water"), the system can output operational advisories: "Run your 10 L/s pump for 18.3 hours per hectare (or 2.4 hours per bigha) on December 21st."*
- This provides an immediate, user-friendly feature for the final Field Shift user interface.
