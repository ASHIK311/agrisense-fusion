# AgriSense Fusion — Hackathon Live Demonstration Script

**NASA Space Apps Challenge 2026**  
**Challenge:** Field Shift: Adapting Farms with NASA Data  
**Focus Region:** Northern Bangladesh (Barind Tract, Rajshahi / Rangpur / Bogura)  
**Local URL:** `http://localhost:5000`

---

## 1. Executive Concept (30 Seconds)
"Hello judges! We present **AgriSense Fusion**, built for the NASA Space Apps Challenge 2026 challenge *Field Shift*.

In Northern Bangladesh's Barind Tract, intensive dry-season Boro rice monoculture requires up to 45 deep-tubewell irrigations per hectare, driving rapid groundwater table decline of up to 0.75m/year. 

AgriSense Fusion fuses **live satellite-derived agro-meteorological data from NASA POWER** with **field-level ESP32 soil moisture telemetry** and a **physics-based FAO-56 Penman-Monteith water engine**. Most importantly, it powers an explainable **Crop-Rotation Explorer** that guides farmers and extension officers in transitioning to climate-smart, water-conserving crop sequences."

---

## 2. Feature Walkthrough (90 Seconds)

### Step 1: Open the Application
1. Open your browser at `http://localhost:5000`.
2. Notice the refined dark scientific interface with natural emerald green accents.
3. Observe the top header showing:
   - **Farm Selector**: Godagari Agricultural Research Hub (Barind Tract, Rajshahi)
   - **Data Provenance Badges**: `NASA POWER Live` (green) and `ESP32: Live Feed` / `Demo Sim` (clearly distinguished).

### Step 2: The Core Feature — Crop-Rotation Explorer
1. Click on the first tab: **🌾 Crop-Rotation Explorer (Core)**.
2. Review the Candidate Rotations:
   - Notice Candidate #1: *Mustard → Mungbean → T. Aman* or *Lentil → Aus Rice → T. Aman*.
   - Contrast this with the bottom candidate: *Boro Rice → Fallow → T. Aman* (Conventional baseline).
3. **Interactive Re-Ranking Demonstration**:
   - Move the **Water Conservation** slider to **80%** (or click the **Water Saver** preset button).
   - Watch the rankings instantly update! The pulse and oilseed rotations take the top spots, with clear water savings of up to 65% (saving ~1,000 mm of irrigation per hectare).
   - Now click the **Max Profit** preset (Economic Preference 65%+).
   - Immediately watch **Maize → Mungbean → T. Aman** surge to Rank #1 due to strong domestic poultry feed demand!
4. **Open the Agronomic Explanation**:
   - Click **"View Agronomic Breakdown & Explanations"** on the top candidate.
   - Show the judges the transparent Multi-Criteria Decision Analysis (MCDA) breakdown:
     - Exact score contributions ($w'_i \times S_i$)
     - Machine reason codes (`LEGUME_BIOLOGICAL_N_FIXATION`, `LOW_WATER_AQUIFER_FRIENDLY`)
     - Agronomic justification and cautions (soil pH compatibility, seed availability).

### Step 3: NASA POWER & Agro-Meteorological Dashboard
1. Click on the **📊 Agro-Meteorological Dashboard** tab.
2. View the real NASA POWER data:
   - Air Temperature, Relative Humidity, Solar Radiation ($ALLSKY\_SFC\_SW\_DWN$), and Wind Speed ($u_{10}$).
   - Notice the exact observation date and freshness attribution.
3. Review the responsive SVG meteorological chart showing bounded historical precipitation bars and temperature trends.
4. Click the **"Refresh NASA"** button in the header to show live on-demand fetching and caching.

### Step 4: Physics-Based Water Engine
1. Click on the **💧 FAO-56 Water Engine** tab.
2. Walk through the transparent calculations:
   - Reference Evapotranspiration: $ET_0 = 3.44\text{ mm/day}$ via FAO-56 Penman-Monteith.
   - Wind speed conversion: $u_2 = 0.748 \times u_{10}$ using logarithmic profile.
   - Crop demand: $ET_c = K_c \times ET_0$.
   - Root-Zone Depletion: $D_r$ based on calibrated volumetric water content (VWC) relative to Field Capacity ($\theta_{FC}$) and Wilting Point ($\theta_{WP}$).
   - Notice that direct soil evaporation ($E_s$) is transparently kept null until dual-coefficient lysimeter calibration is available (zero fake data!).

### Step 5: ESP32 Edge Ingestion & Simulation
1. Click the green **"Simulate Reading"** button in the header.
2. Move the Soil Moisture slider to 14% (simulating drought stress) and click **"Post Reading"**.
3. Point out:
   - The reading is sent to `POST /api/sensor-readings`.
   - The reading is permanently and honestly tagged with `is_simulated: true`.
   - The dashboard updates in real time, triggering the **Depletion Warning** badge!
4. Click on the **📡 ESP32 Ingestion Specs** tab to show the production REST specification, physical range constraints, and cURL commands for field hardware.

### Step 6: Groundwater & Aquifer Health
1. Click on the **📉 Barind Aquifer Groundwater** tab.
2. Show the deep tubewell water table depth (e.g. 26.4m vs critical suction limit of 28.0m).
3. Emphasize the regional alert: transitioning away from Boro monoculture directly slows aquifer drawdown.

---

## 3. Closing Summary (20 Seconds)
"AgriSense Fusion bridges space data and on-the-ground farming reality. By providing explainable decision support, we empower farmers in vulnerable agro-ecological zones to adapt to climate shifts while preserving critical groundwater resources."
