# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
# FIELD SHIFT — AGRISENSE FUSION
## NASA Space Apps Challenge 2026
### Adapting Farms with NASA Data

**Document Type:** Master Software Requirements Specification  
**Version:** 1.0  
**Development Strategy:** Backend-first, science-first, integration-first  
**UI Strategy:** Functional MVP first; visual polish later  
**Primary Study Area:** Godagari Upazila, Rajshahi, Bangladesh  
**Agro-Ecological Zone:** AEZ 26 — High Barind Tract  
**Study Centroid:** 24.469°N, 88.330°E  
**Primary Goal:** Build an integrated, evidence-backed agricultural intelligence and decision-support platform using NASA Earth observation, weather data, ground IoT sensors, crop science, and physics-based water balance calculations.

---

# 1. EXECUTIVE SUMMARY

## 1.1 Project Overview

Field Shift is an integrated agricultural decision-support platform designed to help farmers, agricultural researchers, and agricultural administrators understand field conditions and make better farming decisions.

The platform combines:

1. Satellite-based land and vegetation monitoring.
2. Historical weather and atmospheric heat-dryness screening.
3. Ground-based IoT soil monitoring.
4. Crop suitability and agronomic intelligence.
5. Physics-based crop water requirement and irrigation calculations.
6. Evidence-backed crop disease risk screening.
7. Explainable agricultural recommendations.
8. Historical analysis, forecasting where supported, and scenario simulation.

The platform will integrate these independent subsystems into one central system.

## 1.2 Core Philosophy

Field Shift must distinguish between:

- Measured data.
- Satellite-derived data.
- NASA POWER weather/reanalysis data.
- Literature-derived agricultural parameters.
- Model-generated estimates.
- Simulated IoT data.
- Actual field observations.

The system must never present simulated or estimated data as actual field measurements.

## 1.3 Main Objective

Provide an integrated answer to these questions:

- What is happening in a particular agricultural area?
- What is the current soil and vegetation condition?
- Which crops are suitable for the area?
- How much water does a crop require?
- Is irrigation required now?
- Are environmental conditions favorable for a particular crop disease?
- What crop rotation options are worth considering?
- What are the possible consequences of changing irrigation or crop choices?
- Which recommendations have strong evidence and which are uncertain?

---

# 2. PROJECT SCOPE

## 2.1 In Scope

The first complete version must include:

- User authentication and authorization.
- Farm and field management.
- Geographic field selection.
- Satellite data integration.
- Vegetation-index analysis.
- NASA POWER weather ingestion.
- Historical weather analytics.
- Heat and atmospheric desiccation screening.
- IoT sensor ingestion and monitoring.
- Soil property and moisture analysis.
- Crop suitability analysis.
- Crop calendar and crop-stage tracking.
- Crop water requirement calculation.
- ET0, ETc, effective rainfall and root-zone water balance.
- Irrigation requirement estimation.
- Crop rotation comparison.
- Disease knowledge base.
- Disease environmental susceptibility screening.
- Explainable recommendation engine.
- Alerts and notifications.
- Historical reports.
- Administrative data management.
- API integration and audit logging.

## 2.2 Out of Scope for Initial MVP

These features should not be claimed as complete until suitable data and validation exist:

- Guaranteed crop-yield prediction.
- Confirmed disease diagnosis from weather data.
- Nationwide field-level groundwater measurement.
- Real-time satellite imagery where no live feed is available.
- Automatic pesticide prescription without expert-approved rules.
- Fully autonomous irrigation hardware control.
- A production-validated disease image classifier.
- Guaranteed groundwater-saving percentages.
- Claims of field accuracy based only on synthetic or simulated datasets.

---

# 3. SYSTEM ARCHITECTURE

## 3.1 High-Level Architecture

```text
                    FIELD SHIFT PLATFORM
                             |
             +---------------+---------------+
             |                               |
        FRONTEND                         BACKEND API
             |                               |
     Functional Dashboard             Authentication
     Field Management                 Field Management
     Maps & Charts                    Data Ingestion
     Recommendations                  Calculation Engine
     Alerts & Reports                 Recommendation Engine
             |                               |
             +---------------+---------------+
                             |
                       DATABASE
                             |
       +---------------------+----------------------+
       |                     |                      |
   Satellite             Weather                 IoT Soil
   Intelligence           Intelligence            Intelligence
       |                     |                      |
   Member 1              Member 2                 Member 3
       |                     |                      |
       +---------------------+----------------------+
                             |
                 AGRICULTURAL INTELLIGENCE
                             |
           +-----------------+------------------+
           |                 |                  |
      Crop & Agronomy    Water Balance      Disease Risk
      Member 4           Member 5           Member 6
           |                 |                  |
           +-----------------+------------------+
                             |
                 EXPLAINABLE DECISION ENGINE
                             |
                  RECOMMENDATIONS & ALERTS
```

## 3.2 Recommended Technology Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts
- Leaflet or MapLibre
- Lucide icons

### Backend
- Node.js
- Express.js
- TypeScript
- REST API
- Background job processing

### Database
- PostgreSQL
- PostGIS for geospatial data
- JSONB for flexible scientific metadata
- TimescaleDB extension if time-series volume justifies it

### Scientific Computation
- Python
- NumPy
- Pandas
- Scikit-learn where appropriate
- Rasterio
- GeoPandas
- Shapely

### Integration
- NASA POWER API
- Google Earth Engine workflows where available
- Sentinel-2 L2A products
- ESP32 sensor API
- Member 4 agronomic datasets
- Member 5 physics reference implementation
- Member 6 disease knowledge base

### Deployment
- Docker
- Environment-based configuration
- Centralized logs
- Database migrations
- Automated tests

The main Node.js backend will remain the integration authority. Python will serve as a scientific computation and validation service where necessary.

---

# 4. USER ROLES AND PERMISSIONS

## 4.1 Farmer

Can:
- Register and manage farms.
- Add agricultural fields.
- Select crop and planting date.
- View field conditions.
- View soil and weather information.
- View irrigation recommendations.
- View crop suitability.
- Receive alerts.
- View disease risk screening.
- Download farm reports.

## 4.2 Agricultural Researcher

Can:
- View multiple fields.
- Compare crop scenarios.
- Inspect historical weather.
- Analyze satellite vegetation trends.
- View water-balance calculations.
- Review scientific evidence.
- Export datasets and reports.

## 4.3 Administrator

Can:
- Manage users.
- Manage data sources.
- Manage crop parameters.
- Manage disease knowledge base.
- Configure alerts.
- Review system health.
- Monitor data ingestion.
- View audit logs.
- Manage geographic coverage.

## 4.4 System-Level Permissions

All API endpoints must enforce role-based access control.

A user must not be able to access another user's private farm or sensor data without permission.

---

# 5. MODULE 1 — FARM AND FIELD MANAGEMENT

## 5.1 Purpose

Provide a central registry for agricultural farms and individual fields.

## 5.2 Features

- Create farm.
- Edit farm.
- Delete farm with confirmation.
- Add multiple fields to one farm.
- Draw field polygon on map.
- Select location using coordinates.
- Store field boundary.
- Calculate field area.
- Assign crop.
- Store planting date.
- Store crop stage.
- Track irrigation events.
- Track fertilizer and farm operations.

## 5.3 Field Information

Each field should store:

- Field ID.
- Farm ID.
- Owner ID.
- Field name.
- Polygon geometry.
- Area in hectares.
- Latitude and longitude.
- Administrative location.
- AEZ classification.
- Soil profile reference.
- Active crop.
- Planting date.
- Crop variety.
- Irrigation method.
- Data provenance.

## 5.4 Geographic Requirements

Use PostGIS geometry for field polygons.

Use the appropriate projected CRS for area calculation. For the Godagari study, EPSG:32645 is the project working CRS.

Never calculate accurate field area directly from unprojected latitude/longitude degrees.

---

# 6. MODULE 2 — SATELLITE AND VEGETATION INTELLIGENCE

**Source:** Member 1

## 6.1 Purpose

Monitor land-cover classification and vegetation condition using Sentinel-2 satellite observations.

## 6.2 Data Sources

- Sentinel-2 Level-2A.
- ESA WorldCover 2021 v200 as reference labels.
- Derived vegetation and moisture indices.

ESA WorldCover labels must be identified as reference labels, not field-verified ground truth.

## 6.3 Satellite Features

### A. Land-Cover Classification

Initial categories:

- Cropland.
- Tree cover.
- Water.
- Built-up.

The system must not claim that generic ESA Cropland classification identifies rice, wheat or maize individually.

### B. Vegetation Indices

Implement:

**NDVI**

NDVI = (NIR - Red) / (NIR + Red)

Purpose:
- Vegetation greenness.
- Relative vegetation condition.
- Seasonal vegetation changes.

**EVI**

EVI = 2.5 × (NIR - Red) / (NIR + 6 × Red - 7.5 × Blue + 1)

Purpose:
- Vegetation monitoring with improved sensitivity in some dense vegetation conditions.

**NDMI**

NDMI = (NIR - SWIR1) / (NIR + SWIR1)

Purpose:
- Vegetation moisture-related monitoring.

**NDWI**

Use the exact NDWI variant consistently. The project Member 1 schema uses McFeeters NDWI; distinguish it from other NDWI definitions.

## 6.4 Additional Indices

- NDBI.
- BSI.
- MNDWI.
- Seasonal NDVI minimum.
- Seasonal NDVI maximum.
- Seasonal NDVI amplitude.
- Seasonal NDVI standard deviation.
- Seasonal NDMI mean.
- Temporal vegetation change.

## 6.5 Satellite Dashboard

Display:

- Latest available observation date.
- Satellite scene coverage.
- Cloud coverage where metadata exists.
- NDVI map.
- NDMI map.
- Land-cover map.
- Seasonal vegetation chart.
- Historical vegetation comparison.
- Field-level average indices.
- Missing observation warning.

## 6.6 Model Performance Transparency

Member 1's spatial cross-validation results:

- Mean accuracy: 84.63%.
- Macro-F1: 0.8342.
- Balanced accuracy: 84.37%.
- No inter-block exclusion buffer.

Block C development holdout accuracy was 85.77%; it was not an untouched independent test.

The UI must use the spatial CV result as the principal reported metric and document the validation limitation.

Do not claim 95% accuracy.

## 6.7 Important Satellite Limitations

- Sentinel-2 B11 has native 20m resolution.
- Resampling B11 to 10m does not create true 10m detail.
- Cloud and missing-scene conditions must be visible.
- Satellite soil-moisture-related indices are not direct ground sensor measurements.
- Satellite land surface temperature is not subsurface soil temperature.

---

# 7. MODULE 3 — WEATHER AND ATMOSPHERIC RISK INTELLIGENCE

**Source:** Member 2

## 7.1 Purpose

Provide historical and available weather analytics and screen for hot and dry atmospheric conditions.

## 7.2 Data Sources

NASA POWER parameters include:

- T2M_MAX.
- T2M_MIN.
- PRECTOTCORR.
- RH2M.
- WS2M.
- ALLSKY_SFC_SW_DWN.

Each parameter must retain its source and resolution metadata.

## 7.3 Weather Features

- Daily maximum temperature.
- Daily minimum temperature.
- Rainfall.
- Relative humidity.
- Wind speed.
- Solar radiation.
- Vapor pressure deficit.
- Consecutive dry days.
- Historical hot-dry spells.
- Monthly and seasonal summaries.

## 7.4 Heat and Atmospheric Desiccation Screening

Member 2 uses the deterministic screening rule:

Tmax ≥ 35°C AND RH ≤ 50% AND rainfall ≤ 1mm

The output must be called:

**Pre-Monsoon Heat and Atmospheric Desiccation Screening**

It is not a confirmed drought prediction model.

## 7.5 Weather Dashboard

- Temperature chart.
- Rainfall chart.
- Relative humidity chart.
- Solar radiation chart.
- VPD chart.
- Dry-spell timeline.
- Hot-dry screening days.
- Historical monthly comparison.
- Seasonal summaries.

## 7.6 Weather Risk Classification

Create configurable, source-backed categories.

Do not invent universal thresholds for all crops and regions.

Every threshold must store:
- Parameter.
- Threshold.
- Unit.
- Source.
- Applicable crop or geography.
- Effective date.
- Evidence confidence.

## 7.7 Weather Data Integrity

The current Member 2 dataset contains 1,827 daily rows from 2019-01-01 through 2024-01-01.

Its station coordinate is approximately 24.3636°N, 88.6241°E, around 34.8km from the Godagari project centroid.

Do not silently relabel these weather observations as direct Godagari station measurements.

Retain the original coordinate and source provenance.

## 7.8 Important Limitation

The 99.73% temporal holdout result represents reconstruction of the deterministic screening rule, not 99.73% accuracy in predicting agricultural drought.

---

# 8. MODULE 4 — IOT SOIL MONITORING

**Source:** Member 3

## 8.1 Purpose

Provide field-level ground sensor monitoring.

## 8.2 Hardware Architecture

ESP32-based monitoring device.

Potential sensors:
- Capacitive soil moisture sensor.
- DS18B20 soil temperature sensor.
- Optional DHT22 air temperature/humidity sensor.
- Battery voltage monitoring.

## 8.3 Features

- Device registration.
- Sensor registration.
- Device-to-field mapping.
- Sensor readings ingestion.
- Timestamped measurements.
- Sensor health.
- Battery monitoring.
- Data validation.
- Offline data synchronization.
- Historical sensor charts.
- Sensor fault detection.

## 8.4 Sensor API

Example:

POST /api/v1/iot/readings

```json
{
  "device_id": "ESP32-001",
  "field_id": "FIELD-001",
  "timestamp": "2026-11-10T12:00:00Z",
  "soil_moisture_vwc": 24.5,
  "soil_temperature_c": 29.1,
  "battery_voltage": 3.85,
  "data_status": "SIMULATED_TEST_DATA"
}
```

This is an example payload, not a claim of actual sensor deployment.

## 8.5 Data Quality

Every sensor reading must have:

- Device ID.
- Timestamp.
- Parameter.
- Value.
- Unit.
- Quality status.
- Calibration status.
- Data provenance.

## 8.6 Sensor Status

Possible statuses:

- Online.
- Offline.
- Low battery.
- Sensor fault.
- Uncalibrated.
- Simulated.
- Validated field reading.

## 8.7 Soil Thresholds

Member 3 currently uses provisional literature-derived assumptions:

- Saturation: 43.5% VWC.
- Field capacity: 32.3% VWC.
- Permanent wilting point: 16.5% VWC.
- Irrigation trigger: 24.4% VWC.

These are not Godagari field-calibrated values.

The system must support per-field and per-soil-profile parameters rather than treating these values as universal.

## 8.8 External Soil Data

Support:

- NASA SMAP L4 soil moisture.
- ISRIC SoilGrids soil properties.

Clearly distinguish:
- Satellite/model soil moisture.
- SoilGrids mapped soil properties.
- Local IoT sensor measurements.

## 8.9 Simulation Handling

The existing 5,760-row IoT dataset is simulated test data.

It must never appear in the dashboard as live field sensor measurements.

---

# 9. MODULE 5 — CROP SUITABILITY AND AGRONOMIC INTELLIGENCE

**Source:** Member 4

## 9.1 Purpose

Provide crop suitability, crop calendar, crop rotation and agronomic information.

## 9.2 Crop Coverage

Initial crop groups:

- Aman rice.
- Boro rice.
- Aus rice.
- Wheat.
- Maize.
- Mungbean.
- Lentil.
- Mustard.
- Potato.
- Other supported crops when verified data exists.

## 9.3 Crop Suitability

Display:

- Crop suitability score.
- Suitability category.
- Supporting parameters.
- Geographic applicability.
- Data source.
- Confidence and limitations.

The existing BARC suitability mapping is a weighted suitability score, not yield probability or model accuracy.

Godagari baseline rankings from Member 4:

| Crop | Suitability score |
|---|---:|
| Aman | 78.92% |
| Maize | 73.44% |
| Wheat | 57.41% |
| Aus | 40.98% |
| Boro | 40.51% |

These are source-derived baseline scores, not guarantees of farm-level success.

## 9.4 Crop Calendar

Features:
- Planting period.
- Growing duration.
- Crop stages.
- Expected harvesting period.
- Crop-specific water demand.
- Weather-sensitive stages.

Missing calendar values must be shown as unknown rather than fabricated.

## 9.5 Crop Rotation

Provide:
- Previous crop.
- Candidate next crop.
- Rotation sequence.
- Water requirement comparison.
- Crop calendar compatibility.
- Nutrient management considerations.
- Evidence sources.

Do not promise a fixed percentage of groundwater savings unless validated under the relevant local conditions.

## 9.6 Yield Intelligence

The existing yield ML experiments did not outperform the naive historical baseline.

Therefore:
- Do not deploy an unreliable ML yield model.
- Use source-backed historical statistics where appropriate.
- Show uncertainty.
- Clearly label district-level or national data.
- Do not imply district-level data is Godagari farm-level yield.

---

# 10. MODULE 6 — PHYSICS-BASED WATER BALANCE AND IRRIGATION ENGINE

**Source:** Member 5, with compatibility with Member 4 crop parameters.

This is one of the central modules of Field Shift.

## 10.1 Purpose

Estimate crop water demand and root-zone water balance using FAO-56 principles.

## 10.2 Calculation Pipeline

```text
Weather Inputs
     |
     v
FAO-56 Reference ET0
     |
     v
Crop Coefficient Kc
     |
     v
Crop ETc
     |
     v
Effective Rainfall
     |
     v
Root-Zone Water Balance
     |
     v
Soil Water Depletion
     |
     v
Net Irrigation Requirement
     |
     v
Gross Irrigation Requirement
     |
     v
Irrigation Recommendation
```

## 10.3 Reference Evapotranspiration

Use FAO-56 Penman-Monteith:

ET0 = [0.408Δ(Rn-G) + γ(900/(T+273))u2(es-ea)] / [Δ + γ(1+0.34u2)]

Where:

- ET0 = reference evapotranspiration, mm/day.
- Rn = net radiation, MJ/m²/day.
- G = soil heat flux, MJ/m²/day.
- T = mean air temperature, °C.
- u2 = wind speed at 2m, m/s.
- es = saturation vapour pressure.
- ea = actual vapour pressure.
- Δ = slope of saturation vapour pressure curve.
- γ = psychrometric constant.

The engine must preserve units and calculation inputs.

## 10.4 Crop Evapotranspiration

ETc = Kc × ET0

Kc must be selected by:
- Crop.
- Crop stage.
- Variety where data supports it.
- Local conditions where data supports adjustment.

## 10.5 Crop Growth Stages

Support four stages:

1. Initial.
2. Crop development.
3. Mid-season.
4. Late-season.

Each stage must store:
- Duration.
- Kc.
- Root depth.
- Source.
- Evidence confidence.

## 10.6 Effective Rainfall

Implement the selected effective rainfall method with clearly documented assumptions.

The same method must be used consistently in:
- Python reference calculations.
- Production JS calculations.
- Seasonal simulations.
- API responses.

Do not switch formulas silently between modules.

## 10.7 Root-Zone Water Balance

Maintain a daily root-zone storage state.

A simplified conceptual balance:

Dr = Dr(previous) - P_eff - I_net + ETc + DP

Where:

- Dr = root-zone depletion.
- P_eff = effective rainfall.
- I_net = net irrigation entering the root zone.
- ETc = crop evapotranspiration.
- DP = deep percolation or other explicitly modeled losses.

The implementation must follow the selected FAO-56 depletion convention and storage bounds.

## 10.8 Available Water

Total available water:

TAW = 1000 × (θFC - θWP) × Zr

Where:

- θFC = volumetric water content at field capacity.
- θWP = volumetric water content at wilting point.
- Zr = effective root depth in metres.

Readily available water:

RAW = p × TAW

Where p is the depletion fraction for the crop and conditions.

## 10.9 Irrigation Decision

The engine should evaluate:

- Root-zone depletion.
- RAW.
- Soil moisture sensor readings where calibrated.
- Effective rainfall.
- Crop stage.
- Crop-specific irrigation constraints.

If depletion exceeds the allowable threshold, the system may recommend irrigation.

It must also explain why irrigation is recommended.

## 10.10 Net and Gross Irrigation

Gross irrigation requirement:

I_gross = I_net / η

Where η is irrigation application efficiency.

The current Member 5 reference uses 70% as a simulation assumption.

Do not assume all farms use 70% efficiency. It must be configurable by irrigation method and field conditions.

Do not count conveyance losses as soil water storage.

## 10.11 Seasonal Water Simulation

Support:
- Aman.
- Boro.
- Aus.
- Wheat.
- Maize.
- Supported rotation sequences.

The engine must prevent irrigation outside configured crop-season windows unless a user explicitly creates a valid scenario.

## 10.12 Outputs

- Daily ET0.
- Daily ETc.
- Effective rainfall.
- Root-zone depletion.
- Soil water storage.
- TAW.
- RAW.
- Net irrigation.
- Gross irrigation.
- Seasonal irrigation requirement.
- Water deficit.
- Irrigation recommendation.
- Assumptions and confidence.

## 10.13 Calculation Transparency

Every calculation must store:
- Input values.
- Input source.
- Formula version.
- Crop parameters.
- Assumptions.
- Calculation timestamp.
- Output values.

## 10.14 Validation Requirements

Member 5's Python reference and JS production engine differ by up to 23.68% in the monsoon overcast comparison because of net-radiation approximation.

Therefore, the production engine must not claim universal numerical parity.

Before final deployment:
- Document the JS radiation approximation.
- Define acceptable error by climate regime.
- Preserve benchmark test cases.
- Show calculation limitations.
- Improve or explicitly accept approximations through a recorded engineering decision.

---

# 11. MODULE 7 — CROP DISEASE KNOWLEDGE AND RISK SCREENING

**Source:** Member 6

## 11.1 Purpose

Provide literature-backed crop disease information and environmental susceptibility screening.

This is not a confirmed disease diagnosis system.

## 11.2 Disease Knowledge Base

Initial scope:
- 17 diseases.
- 7 crop groups.
- 60 research papers.
- 47 Bangladesh-focused papers.

The knowledge base includes:
- Disease name.
- Scientific name.
- Causal pathogen.
- Symptoms.
- Crop.
- Crop stage.
- Environmental relationships.
- Geographic evidence.
- Seasonal information.
- Management.
- Resistant varieties.
- Research citations.
- Evidence level.

## 11.3 Disease Screening Pipeline

```text
Weather Data
     |
Soil Sensor Data
     |
Crop & Growth Stage
     |
Disease Knowledge Base
     |
Evidence-backed Conditions
     |
Environmental Susceptibility Screening
     |
Risk Explanation
     |
Field Inspection Recommendation
```

## 11.4 Screening Inputs

Depending on disease:
- Air temperature.
- Relative humidity.
- Rainfall.
- Soil temperature.
- Soil moisture.
- Crop type.
- Crop stage.
- Leaf wetness where actually measured.
- Historical environmental conditions.

Not every disease uses every parameter.

For example, potato bacterial wilt must not use leaf wetness as its soil-borne pathogen trigger.

## 11.5 Risk Output

Use evidence-based categories such as:
- Insufficient data.
- Conditions not favorable.
- Conditions potentially favorable.
- Elevated environmental susceptibility.

The system may calculate a normalized score only where the scoring model and weights are scientifically defined.

Do not present an arbitrary 0–100 score as a scientifically validated probability of infection.

## 11.6 Explainable Output

Example:

**Potentially favorable environmental conditions for Rice Blast**

- Crop: Rice.
- Current crop stage: Heading.
- Observed humidity: sourced weather value.
- Temperature: sourced weather value.
- Literature evidence: cited research.
- Missing information: no direct leaf-wetness measurement.
- Recommendation: inspect the field for characteristic symptoms.

The UI must clearly state that environmental conditions do not confirm infection.

## 11.7 Image Support

Display only verified image references.

Where hotlinking is unreliable:
- Cache legally reusable images.
- Preserve attribution and license.
- Provide source links.
- Use placeholders when an image is unavailable.

---

# 12. MODULE 8 — UNIFIED AGRICULTURAL DECISION ENGINE

## 12.1 Purpose

Combine the outputs of all six subsystem modules into understandable agricultural recommendations.

The engine must not simply combine every value into an arbitrary AI score.

It should use deterministic calculations, source-backed rules, and LLM explanations only where useful.

## 12.2 Decision Inputs

- Field boundary.
- Active crop.
- Crop stage.
- Satellite vegetation indices.
- Weather.
- Soil moisture.
- Soil temperature.
- Crop suitability.
- Water balance.
- Disease environmental conditions.
- Historical field information.

## 12.3 Recommendation Types

### Irrigation
- Irrigation required.
- Irrigation not currently required.
- Monitor soil moisture.
- Insufficient sensor data.

### Crop
- Suitable crop options.
- Crop-stage management.
- Planting-window information.
- Rotation alternatives.

### Water
- Seasonal water demand.
- Water deficit.
- Net irrigation.
- Gross irrigation estimate.
- Scenario comparison.

### Disease
- Environmental susceptibility alert.
- Field inspection suggestion.
- Evidence-backed disease information.

### Vegetation
- Vegetation decline.
- Seasonal vegetation comparison.
- Missing satellite observation.

### Weather
- Hot-dry atmospheric screening.
- Extreme weather screening where validated.
- Historical weather anomaly.

## 12.4 Recommendation Object

Every recommendation should contain:

- Recommendation ID.
- Field ID.
- Category.
- Severity.
- Title.
- Explanation.
- Evidence.
- Supporting measurements.
- Data freshness.
- Confidence or evidence level.
- Required user action.
- Generated timestamp.
- Expiry or review time.
- Model/rule version.

## 12.5 Explainability

Example:

"Consider checking soil moisture before irrigation."

Why:
- Current sensor moisture is below the configured trigger.
- Crop stage is mid-season.
- Root-zone depletion is approaching RAW.
- Recent effective rainfall is insufficient.

If sensor calibration is unverified, the explanation must say so.

---

# 13. MODULE 9 — ALERTS AND NOTIFICATIONS

## 13.1 Alert Types

- Irrigation alert.
- Low soil moisture.
- Sensor offline.
- Low battery.
- Hot-dry screening.
- Vegetation decline.
- Disease susceptibility.
- Missing data.
- Data ingestion failure.

## 13.2 Alert Lifecycle

- Created.
- Active.
- Acknowledged.
- Resolved.
- Expired.

## 13.3 Notification Channels

Initial:
- In-app notifications.
- Dashboard alerts.

Later:
- Email.
- SMS.
- Push notifications.
- Bangla notification messages.

## 13.4 Alert Safety

Alerts must distinguish:
- Confirmed measurement.
- Model-derived screening.
- Simulated data.
- Insufficient evidence.

---

# 14. MODULE 10 — HISTORICAL ANALYSIS AND REPORTING

## 14.1 Reports

- Farm report.
- Field condition report.
- Satellite vegetation report.
- Weather history report.
- Soil monitoring report.
- Crop suitability report.
- Water balance report.
- Irrigation report.
- Disease screening report.
- Seasonal crop comparison.

## 14.2 Export Formats

- PDF.
- CSV.
- JSON.

## 14.3 Historical Comparison

Support:
- Daily.
- Weekly.
- Monthly.
- Seasonal.
- Year-to-year comparisons where data coverage permits.

Missing periods must be shown clearly.

---

# 15. MODULE 11 — SCENARIO SIMULATION

## 15.1 Purpose

Allow users to compare possible agricultural decisions without pretending that simulated outcomes are observed reality.

## 15.2 Supported Scenarios

- Crop A vs Crop B.
- Different planting dates.
- Different Kc assumptions.
- Different irrigation efficiencies.
- Different soil moisture conditions.
- Different effective rainfall assumptions.
- Crop rotation alternatives.
- Irrigation strategy comparison.

## 15.3 Outputs

- Estimated seasonal ETc.
- Estimated net irrigation.
- Estimated gross irrigation.
- Water deficit.
- Crop calendar compatibility.
- Scenario assumptions.
- Comparison charts.

## 15.4 Scenario Transparency

Every scenario must display:
- Input assumptions.
- Data sources.
- Model version.
- Limitations.
- Whether the result is simulated or observed.

Do not label simulated water savings as validated field savings.

---

# 16. DATABASE DESIGN

Use PostgreSQL with PostGIS.

The following is the initial logical schema. It can be refined during implementation without changing the core scientific data contracts.

## 16.1 Identity and Access

### users
- id
- name
- email
- password_hash
- role
- status
- created_at

### farms
- id
- owner_id
- name
- administrative_location
- created_at

### fields
- id
- farm_id
- name
- boundary_geometry
- area_hectares
- centroid
- aez_code
- soil_profile_id
- created_at

## 16.2 Crop Management

### crops
- id
- crop_name
- scientific_name
- crop_category

### crop_varieties
- id
- crop_id
- variety_name
- source
- evidence_level

### crop_cycles
- id
- field_id
- crop_id
- variety_id
- planting_date
- expected_harvest_date
- current_stage
- status

### crop_stage_parameters
- id
- crop_id
- stage
- duration_days
- kc
- root_depth_m
- source
- evidence_level

## 16.3 Satellite Data

### satellite_scenes
- id
- source
- scene_id
- acquisition_date
- cloud_coverage
- spatial_resolution
- processing_status
- metadata

### vegetation_observations
- id
- field_id
- scene_id
- observation_date
- ndvi
- evi
- ndmi
- ndwi
- quality_status

### land_cover_results
- id
- field_id
- classification
- model_version
- confidence
- observation_date

## 16.4 Weather Data

### weather_observations
- id
- source
- source_location_id
- latitude
- longitude
- timestamp
- tmax
- tmin
- rainfall
- humidity
- wind_speed
- solar_radiation
- vpd
- quality_status

### weather_screening_events
- id
- source_observation_id
- screening_type
- screening_result
- rule_version
- evidence
- created_at

## 16.5 IoT Data

### iot_devices
- id
- device_code
- field_id
- status
- firmware_version
- calibration_status

### iot_sensor_readings
- id
- device_id
- field_id
- timestamp
- soil_moisture_vwc
- soil_temperature_c
- air_temperature_c
- relative_humidity
- battery_voltage
- data_status
- quality_status

## 16.6 Soil Data

### soil_profiles
- id
- field_id
- source
- depth_from_cm
- depth_to_cm
- sand_percent
- silt_percent
- clay_percent
- field_capacity
- wilting_point
- bulk_density
- evidence_level

### soil_thresholds
- id
- soil_profile_id
- saturation_vwc
- field_capacity_vwc
- wilting_point_vwc
- irrigation_trigger_vwc
- source
- calibration_status

## 16.7 Water Balance

### water_balance_runs
- id
- field_id
- crop_cycle_id
- model_version
- start_date
- end_date
- input_snapshot
- assumptions
- status

### daily_water_balance
- id
- run_id
- date
- et0
- kc
- etc
- effective_rainfall
- root_zone_depletion
- taw
- raw
- net_irrigation
- gross_irrigation
- storage
- quality_status

### irrigation_events
- id
- field_id
- crop_cycle_id
- event_date
- applied_water_mm
- irrigation_method
- source
- actual_or_estimated

## 16.8 Disease Knowledge

### diseases
- id
- disease_name
- scientific_name
- pathogen
- crop_id
- symptoms
- description

### research_papers
- id
- title
- authors
- publication_year
- journal
- doi
- source_url
- evidence_tier
- geographic_scope

### disease_research_papers
- disease_id
- paper_id
- evidence_type
- relevance
- notes

### disease_climate_relationships
- id
- disease_id
- parameter
- operator
- threshold
- unit
- crop_stage
- geographic_scope
- evidence_source
- confidence

### disease_management
- id
- disease_id
- management_type
- recommendation
- source
- approval_status

### disease_varieties
- id
- disease_id
- variety_name
- resistance_type
- source
- evidence_level

### disease_screening_runs
- id
- field_id
- crop_cycle_id
- screening_date
- environmental_inputs
- screening_result
- evidence
- limitations
- rule_version

## 16.9 Recommendations and Alerts

### recommendations
- id
- field_id
- category
- severity
- title
- explanation
- evidence
- confidence
- data_freshness
- status
- rule_version
- created_at

### alerts
- id
- user_id
- field_id
- recommendation_id
- alert_type
- severity
- message
- status
- created_at

## 16.10 System Operations

### data_sources
- id
- source_name
- source_type
- source_location
- resolution
- license
- metadata

### ingestion_jobs
- id
- source_id
- job_type
- started_at
- completed_at
- status
- records_processed
- error_message

### audit_logs
- id
- user_id
- action
- entity_type
- entity_id
- timestamp
- metadata

### model_versions
- id
- model_name
- version
- source
- validation_summary
- limitations
- created_at

---

# 17. API REQUIREMENTS

Use REST API with version prefix:

`/api/v1/`

## 17.1 Authentication

- POST /auth/register
- POST /auth/login
- POST /auth/logout
- GET /auth/me

## 17.2 Farms and Fields

- GET /farms
- POST /farms
- GET /farms/:id
- PATCH /farms/:id
- DELETE /farms/:id
- GET /fields
- POST /fields
- GET /fields/:id
- PATCH /fields/:id
- DELETE /fields/:id

## 17.3 Satellite

- GET /fields/:id/satellite
- GET /fields/:id/vegetation
- GET /fields/:id/land-cover
- GET /satellite/scenes
- POST /satellite/ingest

## 17.4 Weather

- GET /fields/:id/weather
- GET /fields/:id/weather/summary
- GET /weather/screening
- POST /weather/ingest

## 17.5 IoT

- POST /iot/readings
- GET /iot/devices
- POST /iot/devices
- GET /fields/:id/sensors
- GET /fields/:id/sensors/readings
- GET /iot/devices/:id/health

## 17.6 Agronomy

- GET /crops
- GET /crops/:id
- GET /fields/:id/suitability
- GET /fields/:id/crop-calendar
- GET /fields/:id/rotation-options

## 17.7 Water Balance

- POST /water-balance/calculate
- GET /fields/:id/water-balance
- GET /fields/:id/irrigation-requirement
- POST /water-balance/scenarios

## 17.8 Disease

- GET /diseases
- GET /diseases/:id
- GET /diseases/:id/evidence
- POST /disease/screen
- GET /fields/:id/disease-screening

## 17.9 Recommendations

- GET /fields/:id/recommendations
- POST /recommendations/generate
- PATCH /recommendations/:id/status

## 17.10 Reporting

- GET /reports/field/:id
- GET /reports/water-balance/:id
- GET /reports/weather/:id
- GET /reports/disease/:id

All endpoints must validate input, enforce authorization, log errors, and return consistent response formats.

---

# 18. DATA INGESTION AND PROCESSING PIPELINE

## 18.1 General Pipeline

```text
EXTERNAL DATA SOURCE
        |
        v
DATA INGESTION
        |
        v
RAW DATA STORAGE
        |
        v
VALIDATION
        |
        v
NORMALIZATION
        |
        v
PROCESSED DATA STORAGE
        |
        v
SCIENTIFIC CALCULATION
        |
        v
RECOMMENDATION ENGINE
        |
        v
API
        |
        v
FRONTEND
```

## 18.2 Ingestion Rules

Every imported dataset must record:

- Source.
- Original coordinates.
- Original timestamp.
- Timezone.
- Units.
- Spatial resolution.
- Temporal resolution.
- Processing date.
- Transformation.
- Quality status.
- License.
- Provenance.

## 18.3 Missing Data

Never silently replace missing measurements with zero.

Use explicit statuses:
- Missing.
- Invalid.
- Estimated.
- Interpolated.
- Simulated.
- Measured.
- Satellite-derived.

## 18.4 Coordinate Management

The subsystems use different source coordinates.

Preserve each source's original location and its distance from the study centroid.

Do not force all data sources to the same coordinate.

For field-level use, implement an explicit spatial matching and suitability policy:
- Point-in-polygon.
- Nearest observation.
- Maximum allowed distance.
- Resolution compatibility.
- Temporal compatibility.

The UI must disclose when an observation is spatially distant from the selected field.

---

# 19. FUNCTIONAL DASHBOARD REQUIREMENTS

The initial UI can be simple and functional.

## 19.1 Dashboard

Display:
- Total farms.
- Total fields.
- Active crop cycles.
- Available satellite observations.
- Latest weather observation.
- IoT device status.
- Active alerts.
- Latest water-balance result.
- Disease screening status.

## 19.2 Field Detail Page

Tabs:
1. Overview.
2. Satellite.
3. Weather.
4. Soil & IoT.
5. Crop & Suitability.
6. Water Balance.
7. Disease Intelligence.
8. Recommendations.
9. Reports.

## 19.3 Map Page

Display:
- Farm polygons.
- Field boundaries.
- Satellite observation coverage.
- Sensor locations.
- Weather source locations.
- Geographic data quality indicators.

## 19.4 Water Balance Page

Display:
- ET0.
- ETc.
- Effective rainfall.
- Root-zone depletion.
- TAW/RAW.
- Net irrigation.
- Gross irrigation.
- Daily and seasonal charts.
- Calculation assumptions.

## 19.5 Disease Page

Display:
- Disease.
- Crop.
- Symptoms.
- Environmental conditions.
- Evidence references.
- Screening output.
- Missing measurements.
- Inspection recommendation.

---

# 20. NON-FUNCTIONAL REQUIREMENTS

## 20.1 Performance

Initial targets, to be benchmarked rather than assumed achieved:

- Standard API reads: p95 under 500ms for normal database queries.
- Dashboard initial API response: under 2 seconds for cached summary data.
- Heavy raster processing must run asynchronously.
- Long water-balance simulations must support background jobs.

## 20.2 Reliability

- Retry transient external API failures.
- Use ingestion job status.
- Prevent duplicate data imports.
- Use database transactions.
- Keep raw input data immutable.
- Record processing failures.

## 20.3 Security

- Password hashing.
- Role-based access.
- Input validation.
- Rate limiting.
- Secure secrets.
- HTTPS in deployment.
- SQL injection prevention.
- Audit logs.
- User data isolation.

## 20.4 Maintainability

- Modular backend.
- Typed API contracts.
- Database migrations.
- Unit tests.
- Integration tests.
- Reproducible calculations.
- Versioned models and rules.

## 20.5 Accessibility

- Responsive layout.
- Readable charts.
- Clear units.
- Accessible forms.
- Bangla and English localization support in later UI phase.

---

# 21. SCIENTIFIC VALIDATION AND TESTING

## 21.1 Unit Tests

Test:
- NDVI, EVI, NDMI, NDWI calculations.
- Weather parameter conversion.
- VPD calculation.
- ET0 calculation.
- ETc calculation.
- Effective rainfall.
- TAW and RAW.
- Root-zone water balance.
- Irrigation requirement.
- Disease threshold evaluation.
- Crop-stage date calculation.

## 21.2 Integration Tests

Test:
- Weather ingestion to database.
- IoT ingestion to database.
- Satellite processing to field observations.
- Crop parameter lookup.
- Water balance with weather and crop inputs.
- Disease screening with weather and soil data.
- Recommendation generation.

## 21.3 Scientific Benchmark Tests

Use:
- FAO-56 reference examples.
- Member 5's Python reference cases.
- Known unit conversion cases.
- Independently calculated sample water balances.
- Disease literature threshold test cases.

## 21.4 Data Quality Tests

Test:
- Duplicate records.
- Missing dates.
- Invalid units.
- Impossible sensor values.
- Out-of-range coordinates.
- Incorrect field associations.
- Unverified source metadata.

## 21.5 End-to-End Tests

Example:

1. Create a user.
2. Create a farm.
3. Create a field polygon.
4. Add a crop cycle.
5. Ingest weather.
6. Ingest IoT readings.
7. Attach satellite observations.
8. Calculate water balance.
9. Run disease screening.
10. Generate recommendations.
11. Display field report.

---

# 22. IMPLEMENTATION PHASES

Development should follow dependencies, not visual design priorities.

## Phase 0 — Repository and Architecture Audit

Tasks:
- Inspect current repository.
- Inspect all member folders.
- Identify available source files.
- Review existing backend and frontend.
- Review existing database.
- Identify duplicate modules.
- Create final integration map.
- Confirm environment variables.
- Create architecture decision records.

Deliverables:
- Repository audit.
- Final architecture.
- Module ownership.
- API contract.
- Data provenance policy.

## Phase 1 — Core Backend Foundation

Tasks:
- Express application structure.
- PostgreSQL connection.
- PostGIS setup.
- Database migrations.
- Authentication.
- Authorization.
- Error handling.
- Logging.
- API versioning.
- Health check.

Deliverables:
- Working backend.
- Working database.
- Authentication APIs.
- Initial test suite.

## Phase 2 — Farm and Field Management

Tasks:
- Farm CRUD.
- Field CRUD.
- Polygon storage.
- Area calculation.
- Crop cycle management.
- Geographic matching.

Deliverables:
- Functional farm management.
- Functional field management.

## Phase 3 — Data Ingestion

Tasks:
- NASA POWER ingestion.
- Satellite metadata ingestion.
- IoT reading ingestion.
- Member 4 data ingestion.
- Member 6 JSON and CSV ingestion.
- Raw data preservation.
- Data quality validation.

Deliverables:
- Centralized data layer.
- Provenance tracking.
- Ingestion logs.

## Phase 4 — Scientific Calculation Engine

Tasks:
- Vegetation index processing.
- Weather analytics.
- Heat-dry screening.
- Soil moisture processing.
- Crop suitability.
- Crop calendar.
- ET0.
- ETc.
- Effective rainfall.
- Root-zone balance.
- Irrigation requirement.

Deliverables:
- Tested scientific calculation APIs.
- Benchmark reports.

## Phase 5 — Disease and Agricultural Intelligence

Tasks:
- Disease knowledge base.
- Disease evidence API.
- Environmental screening.
- Recommendation engine.
- Alert generation.
- Explainability layer.

Deliverables:
- Disease screening API.
- Unified recommendation API.

## Phase 6 — Functional Frontend

Tasks:
- Authentication pages.
- Dashboard.
- Farm management.
- Field management.
- Maps.
- Weather charts.
- Satellite charts.
- IoT monitoring.
- Crop suitability.
- Water balance.
- Disease intelligence.
- Recommendations.
- Reports.

The frontend should prioritize usability and complete workflows, not final visual polish.

## Phase 7 — Integration and End-to-End Testing

Tasks:
- Connect all subsystem APIs.
- Verify data contracts.
- Test full field workflow.
- Verify provenance labels.
- Test failure conditions.
- Verify scientific outputs.
- Test authorization.
- Test performance.

## Phase 8 — UI/UX Polish

Only after the core system works:

- Professional design system.
- Responsive dashboard.
- Better charts.
- Map styling.
- Loading states.
- Empty states.
- Error states.
- Animations.
- Bangla localization.
- Accessibility improvements.

## Phase 9 — Deployment and Demonstration

Tasks:
- Docker configuration.
- Production environment.
- Database backups.
- Monitoring.
- Seed demonstration data.
- Demo scenario.
- Final documentation.
- Deployment verification.

---

# 23. PRIORITY MATRIX

| Feature | Priority | Phase |
|---|---|---|
| Database and API foundation | Critical | 1 |
| Authentication and authorization | Critical | 1 |
| Farm and field management | Critical | 2 |
| Data provenance | Critical | 1–3 |
| NASA POWER ingestion | Critical | 3 |
| Satellite integration | High | 3–4 |
| IoT ingestion | High | 3 |
| ET0 / ETc / water balance | Critical | 4 |
| Crop suitability | High | 4 |
| Disease knowledge base | High | 5 |
| Recommendation engine | Critical | 5 |
| Alerts | High | 5–6 |
| Functional dashboard | High | 6 |
| Reports | Medium | 6 |
| Scenario simulation | Medium | 6 |
| UI visual polish | Later | 8 |

---

# 24. PROJECT ACCEPTANCE CRITERIA

The main project is considered functionally complete only when:

1. Users can register and log in.
2. Users can create farms and fields.
3. Field polygons are stored and area is calculated correctly.
4. Weather observations can be ingested and queried.
5. Satellite observations can be associated with fields under a documented spatial policy.
6. IoT readings can be ingested with provenance and calibration status.
7. Crop suitability results are displayed with source and limitations.
8. Crop calendar information is available where verified.
9. ET0 and ETc calculations pass reference tests.
10. Root-zone water balance passes benchmark tests.
11. Irrigation calculations distinguish net and gross requirements.
12. Disease evidence can be retrieved.
13. Disease screening clearly distinguishes environmental susceptibility from confirmed infection.
14. Recommendations include explanations and supporting data.
15. Alerts can be acknowledged and resolved.
16. Reports can be generated.
17. Simulated data is visibly identified.
18. Missing and unverified data is not silently converted into measurements.
19. All major APIs pass integration tests.
20. The full workflow works from field creation to recommendation generation.

---

# 25. IMPORTANT SCIENTIFIC AND DATA LIMITATIONS

These limitations must remain visible in the final system.

| Subsystem | Current limitation |
|---|---|
| Satellite | Spatial CV has no inter-block exclusion buffer |
| Weather | NASA POWER is not a direct local weather station observation |
| Weather screening | Deterministic hot-dry screening is not drought forecasting |
| IoT | Existing records are simulated; physical calibration not completed |
| Soil | Current soil thresholds are provisional literature-derived assumptions |
| Agronomy | Some national datasets use 466 historical BARC units, not a complete current 495-unit administrative coverage |
| Yield | ML experiments did not outperform the naive historical baseline |
| Water balance | Python and production JS differ in some climate regimes due to radiation approximation |
| Disease | Seven papers were metadata-only verified |
| Disease images | Direct Wikimedia hotlinking may fail |
| Disease screening | Environmental suitability is not confirmed infection |

The system must preserve these limitations rather than hiding them.

---

# 26. FINAL DEVELOPMENT STRATEGY

The project must be built as a modular monolith initially, not as multiple independent microservices.

Recommended initial backend structure:

```text
server/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── connection.ts
│   ├── middleware/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── farms/
│   │   ├── fields/
│   │   ├── crops/
│   │   ├── satellite/
│   │   ├── weather/
│   │   ├── iot/
│   │   ├── soil/
│   │   ├── agronomy/
│   │   ├── waterBalance/
│   │   ├── disease/
│   │   ├── recommendations/
│   │   ├── alerts/
│   │   └── reports/
│   ├── integrations/
│   │   ├── nasaPower/
│   │   ├── earthEngine/
│   │   ├── esp32/
│   │   └── memberData/
│   ├── scientific/
│   │   ├── vegetation/
│   │   ├── weather/
│   │   ├── evapotranspiration/
│   │   ├── waterBalance/
│   │   └── diseaseScreening/
│   ├── jobs/
│   ├── utils/
│   └── tests/
```

Frontend:

```text
frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── farms/
│   │   ├── fields/
│   │   ├── satellite/
│   │   ├── weather/
│   │   ├── soil/
│   │   ├── crops/
│   │   ├── waterBalance/
│   │   ├── disease/
│   │   ├── recommendations/
│   │   └── reports/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── types/
│   └── styles/
```

---

# 27. FINAL PROJECT DEFINITION

Field Shift is not simply a weather dashboard, satellite viewer, crop recommendation application, or IoT monitoring tool.

It is a unified, explainable agricultural decision-support system.

Its main scientific pipeline is:

**NASA Earth Observation + NASA POWER Weather + Ground IoT + Soil Data + Crop Science + FAO-56 Physics + Disease Research**

These inputs feed:

**Agricultural Monitoring → Crop Intelligence → Water Balance → Disease Susceptibility Screening → Explainable Recommendations → Farmer Decision Support**

The implementation priority is:

**Correct Data → Correct Calculations → Reliable APIs → Complete Workflows → Functional UI → Visual Polish.**

The project must prioritize scientific honesty, reproducibility, data provenance, and explainability over impressive but unsupported AI claims.

**Final objective:** Deliver a fully integrated and demonstrable Field Shift platform where all accepted subsystems work together through one central backend, database, and functional frontend.
