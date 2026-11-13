# National Readiness & Nationwide Upazila Parameterization Report

**Project:** Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)  
**Component:** Member 5 Nationwide Agro-Climatic Parameterization (`national_adapter.py`)  
**Target Coverage:** Nationwide Bangladesh (AEZ 1 through AEZ 30)  
**Primary Pilot Location:** Godagari Upazila, Rajshahi District (`24.469°N, 88.330°E`, AEZ-11)  
**Author:** Senior Agricultural Systems Architect & GIS Specialist  
**Report ID:** FS-M5-REP-08-NATIONAL  
**Status:** Architecture Designed and Tested for 7 Benchmark Upazilas  

---

## 1. Executive Summary

This report presents the architectural framework developed in Member 5 Correction V2 to scale the physics-based agro-meteorological water balance from the local Godagari Upazila pilot site to a nationwide, 64-district operational capability across Bangladesh.

While Godagari remains the primary empirical validation location (due to its acute groundwater crisis in the Barind Tract), the underlying mathematical models (FAO-56 Penman-Monteith, solar geometry, USDA-SCS effective rainfall, and crop phenology) have been completely decoupled from hardcoded coordinates and local constants. Through the `NationalAdapter` registry, the system is fully parameterized to accept any Upazila in Bangladesh by injecting local geographic coordinates, elevation, Agro-Ecological Zone (AEZ) characteristics, and SRDI soil hydraulic parameters.

---

## 2. Nationwide Architectural Design

```
                                      +------------------------------------+
                                      |     Upazila Registry Interface     |
                                      |     (national_adapter.py)          |
                                      +-----------------+------------------+
                                                        |
                    +-----------------------------------+-----------------------------------+
                    |                                   |                                   |
                    v                                   v                                   v
+-----------------------------------+ +-----------------------------------+ +-----------------------------------+
|     Geographic Positioning        | |      Soil Hydraulic Profile       | |     Crop Phenology & Calendar     |
| (Latitude, Longitude, Elevation)  | |   (Texture, FC, WP, AWC, Ks)      | |   (BARI / BRRI Regional Sowing)   |
+-------------------+---------------+ +-----------------+-----------------+ +-----------------+-----------------+
                    |                                   |                                   |
                    v                                   v                                   v
+-----------------------------------+ +-----------------------------------+ +-----------------------------------+
| Dynamic Solar Geometry Engine     | | Root-Zone Water Balance Reservoir | | Dynamic Kc(t) & Zr(t) Scheduler  |
|  Ra(phi, J), Rso(z, Ra), omega_s  | |   TAW = 1000 * AWC * Zr(t)        | |    Irrigation Ledger Generation   |
+-----------------------------------+ +-----------------------------------+ +-----------------------------------+
```

### 2.1 Decoupling Principles
1. **Latitude-Independent Solar Physics:** The solar geometry engine (`src/physics/solar_geometry.py`) computes declination ($\delta$), sunset angle ($\omega_s$), and extraterrestrial radiation ($R_a$) purely from geographical latitude ($\phi$) and day of year ($J$), spanning Bangladesh's latitudinal range ($20.5^\circ\text{N}$ to $26.5^\circ\text{N}$).
2. **Elevation-Dependent Clear-Sky Radiation:** Clear-sky radiation $R_{so} = (0.75 + 2 \times 10^{-5} z) R_a$ and atmospheric pressure $P(z)$ dynamically adapt from coastal sea-level plains ($z \approx 2\text{ m}$) to northern piedmont and hill tracts ($z > 80\text{ m}$).
3. **Soil Resource Development Institute (SRDI) Mapping:** Upazila-specific soil associations are translated into volumetric field capacity ($\theta_{FC}$), permanent wilting point ($\theta_{WP}$), and available water capacity ($AWC$).

---

## 3. Seven Benchmark Upazila Profiles

To validate national scalability, seven representative Upazilas were configured across four distinct Agro-Ecological Zones (AEZs):

| Upazila Identifier | District | Division | AEZ Region | Latitude ($\phi$) | Longitude | Elevation ($z$) | Dominant Soil Texture | Field Capacity ($\theta_{FC}$) | Wilting Point ($\theta_{WP}$) | AWC ($mm/m$) | Drought / Hydrological Vulnerability |
|---|---|---|---|:---:|:---:|:---:|---|:---:|:---:|:---:|---|
| `godagari` *(Pilot)* | Rajshahi | Rajshahi | AEZ-11 (High Barind Tract) | $24.469^\circ\text{N}$ | $88.330^\circ\text{E}$ | $24.0\text{ m}$ | Silt Loam | 0.28 | 0.13 | $150\text{ mm}$ | Severe Groundwater Over-Draft |
| `tanore` | Rajshahi | Rajshahi | AEZ-11 (High Barind Tract) | $24.593^\circ\text{N}$ | $88.583^\circ\text{E}$ | $22.0\text{ m}$ | Silty Clay | 0.32 | 0.16 | $160\text{ mm}$ | Deep Aquifer Decline ($>0.5\text{ m/yr}$) |
| `nachole` | Chapai Nawabganj | Rajshahi | AEZ-11 (High Barind Tract) | $24.729^\circ\text{N}$ | $88.419^\circ\text{E}$ | $26.0\text{ m}$ | Clay Loam | 0.30 | 0.15 | $150\text{ mm}$ | Extreme Pre-Monsoon Heatwaves |
| `niamatpur` | Naogaon | Rajshahi | AEZ-11 (High Barind Tract) | $24.856^\circ\text{N}$ | $88.563^\circ\text{E}$ | $23.0\text{ m}$ | Silt Loam | 0.29 | 0.14 | $150\text{ mm}$ | Intensive Dry-Season Boro Pumping |
| `dinajpur_sadar` | Dinajpur | Rangpur | AEZ-01 (Old Himalayan Piedmont) | $25.628^\circ\text{N}$ | $88.633^\circ\text{E}$ | $37.0\text{ m}$ | Sandy Loam | 0.22 | 0.09 | $130\text{ mm}$ | Rapid Drainage, Low Moisture Retention |
| `chuadanga_sadar` | Chuadanga | Khulna | AEZ-11 (High Ganges Plain) | $23.640^\circ\text{N}$ | $88.850^\circ\text{E}$ | $14.0\text{ m}$ | Loam | 0.26 | 0.11 | $150\text{ mm}$ | Record Summer Temperatures ($>43^\circ\text{C}$) |
| `mymensingh_sadar` | Mymensingh | Mymensingh | AEZ-09 (Old Brahmaputra Plain) | $24.754^\circ\text{N}$ | $90.407^\circ\text{E}$ | $19.0\text{ m}$ | Silt Loam | 0.31 | 0.14 | $170\text{ mm}$ | High Groundwater Table, Moderate Rain |

---

## 4. Climatic & Solar Gradients Across Bangladesh

Simulating the clear-sky radiation ($R_{so}$) and astronomical extraterrestrial radiation ($R_a$) across the national network highlights the latitudinal variation between Southern and Northern Bangladesh:

```
========================================================================================================
LATITUDINAL SOLAR DYNAMICS ACROSS BANGLADESH
========================================================================================================
Location              Latitude   Elevation  Winter Solstice (J=355)        Summer Solstice (J=172)
                                             Ra (MJ/m2/d)  Rso (MJ/m2/d)   Ra (MJ/m2/d)  Rso (MJ/m2/d)
--------------------------------------------------------------------------------------------------------
Chuadanga (South)     23.640°N     14 m         24.84         18.64           40.16         30.14
Godagari (Central-W)  24.469°N     24 m         24.28         18.23           40.29         30.25
Dinajpur (North)      25.628°N     37 m         23.49         17.64           40.44         30.37
--------------------------------------------------------------------------------------------------------
National Gradient:    Δφ = 1.99°   Δz = 23 m    ΔRa = -1.35   ΔRso = -1.00    ΔRa = +0.28   ΔRso = +0.23
========================================================================================================
```

### Observations
1. **Winter Gradient:** In December, northern Bangladesh (Dinajpur) receives $1.0\text{ MJ/m}^2/\text{d}$ less clear-sky radiation than southern districts (Chuadanga), lowering baseline winter $ET_0$ and slowing crop development.
2. **Summer Gradient:** In June, the slightly longer photoperiod in northern Bangladesh produces marginally higher extraterrestrial radiation.
3. **National Coverage:** The legacy hardcoded constant ($R_{so} = 22.5\text{ MJ/m}^2/\text{d}$) was incorrect for every single Upazila in Bangladesh, regardless of region or season.

---

## 5. Integration Protocol with Member 4 (Crop Recommendation)

The `NationalAdapter` provides a standardized programmatic interface for Member 4's machine learning and agronomic crop recommendation models:

```python
from crop_parameters.national_adapter import NationalAdapter
from crop_parameters.crop_catalog import CropCatalog

# 1. Retrieve Upazila metadata and soil properties
upazila_profile = NationalAdapter.get_upazila("dinajpur_sadar")

# 2. Retrieve crop specifications
wheat_spec = CropCatalog.get_crop("wheat")

# 3. Query soil parameters for local water balance
AWC = upazila_profile.awc_mm_m  # 130.0 mm/m for Sandy Loam
latitude = upazila_profile.latitude  # 25.628°N
elevation = upazila_profile.elevation_m  # 37.0 m
```

This clean decoupled architecture allows the AgriSense Fusion backend to extend its crop water balance advisory service to any Upazila in Bangladesh with zero code changes.
