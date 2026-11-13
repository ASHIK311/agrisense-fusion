# Member 3: Field Installation & Maintenance Protocol

**Subsystem:** Member 3 — IoT Soil & In-Situ Environmental Ground Monitoring  
**Target Region:** Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)  
**Date:** November 10, 2026  

---

## 1. Field Deployment Geometry & Sensor Placement

In the undulating terrace soils of the High Barind Tract, proper physical coupling between the capacitive sensor probe and the undisturbed soil matrix is crucial for valid volumetric water content ($VWC$) measurements.

```
                  [ 6V 3W Solar Panel (Tilted 24° South) ]
                                |
                   [ IP67 Weatherproof Enclosure ]
                                |
                  [ 1.5m Galvanized Mounting Mast ]
                                |
      ====== Ground Surface (0 cm) =============================
         |                                                 |
         | (PG9 Cable Gland)                               |
         |                                                 |
      [ Depth: 10 cm ] ----> Capacitive Sensor Probe #1    |
      (Topsoil Evaporation Front / Seed Bed)               |
                                                           |
      [ Depth: 10 cm ] ----> DS18B20 Temp Probe            |
                                                           |
      [ Depth: 30 cm ] ----> Capacitive Sensor Probe #2    |
      (Root-Zone Water Extraction Layer: Rice/Maize/Wheat) |
```

---

## 2. Step-by-Step Soil Probe Installation Procedure

### Step 1: Site Selection
* Locate the sensor node inside the representative cropping zone of the target plot (e.g. at least 5 meters away from irrigation bunds, field borders, or shaded tree canopies).
* Avoid localized low depressions where surface water pools artificially.

### Step 2: Auger Drilling & Soil Profile Inspection
* Using a 50mm hand auger, bore a clean vertical hole to the target depth (30 cm).
* Carefully preserve the excavated soil cores in separate trays by depth layer (0–10 cm, 10–20 cm, 20–30 cm). Inspect the soil texture for the compact, mottled silty clay "plow-pan" characteristic of Barind soils.

### Step 3: Slurry Coupling & Air-Pocket Prevention
* **The Air-Gap Hazard:** Air pockets around a capacitive sensor blade will cause severe measurement errors (air permittivity $\varepsilon \approx 1$ vs water $\varepsilon \approx 80$), falsely reading extreme dryness.
* Take a small portion of the excavated subsoil, sieve out coarse gravel, and mix with a minimal amount of water to form a thick, homogeneous soil slurry.
* Coat the blade of the capacitive sensor and press it firmly into the undisturbed vertical face at the bottom of the borehole.
* Gently backfill the borehole with the preserved excavated soil in reverse order, tamping lightly to restore the native bulk density ($\approx 1.35\text{ g/cm}^3$) without damaging sensor cables.

### Step 4: Cable Protection Against Agricultural Machinery & Rodents
* Field rodents (bandicoot rats) and cultivation tools frequently sever buried wires in rural Rajshahi.
* Route the sensor cables through 16mm flexible PVC electrical conduit or stainless steel braided shielding from the probe depth up to the base of the mast.
* Terminate cables into the enclosure through IP68-rated PG7/PG9 nylon cable glands with compressed rubber seals.

---

## 3. Mast & Solar Panel Mechanical Setup

1. **Mast Sinking:** Drive a 2.0-meter galvanized iron pipe (25mm OD) at least 50 cm into the ground. Pack with crushed brick/concrete at the base for storm stability during pre-monsoon "Kalbaishakhi" thunderstorms.
2. **Solar Panel Alignment in Godagari:**
   * **Azimuth:** Face the solar panel directly **True South (180°)**.
   * **Tilt Angle:** Fixed tilt at **$24^\circ\text{ to } 25^\circ$ from horizontal** (equal to Godagari's latitude $24.47^\circ\text{N}$). This maximizes year-round photovoltaic energy collection and ensures natural rainwater run-off to clear accumulated dust.
3. **Desiccant Enclosure Sealing:** Place a 20g pouch of rechargeable silica gel desiccant inside the enclosure to absorb ambient humidity ingress before tightening the stainless steel lid screws.

---

## 4. Routine Maintenance & Inspection Checklist

| Interval | Inspection Task | Operational Action Required |
|:---:|---|---|
| **Monthly** | **Solar Panel Surface Cleaning** | Wipe accumulated Barind dust and bird droppings off the tempered glass with a damp microfiber cloth to prevent photovoltaic derating. |
| **Bi-Monthly** | **Desiccant Packet Check** | Inspect silica gel color through the enclosure lid. If pink/green (saturated), replace with fresh blue/orange dried silica gel. |
| **Quarterly** | **Battery Terminal & Voltage Audit** | Verify battery open-circuit voltage exceeds $3.6\text{V}$ via the telemetry dashboard or handheld multimeter. |
| **Seasonal** | **Probe Coupling & Ground Settlement** | Inspect topsoil around the probe mast for cracking or soil erosion after heavy monsoon downpours. Re-pack if subsidence occurs. |
| **Annual** | **Sensor Calibration Recalibration** | Collect companion gravimetric core sample to verify calibration drift in Barind high-clay soils. |
