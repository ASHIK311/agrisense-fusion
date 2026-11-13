# Member 5: Integration & Physics Module (NASA Space Apps Challenge)

## Overview
This module implements a pure **Physics-Based & Agro-Meteorological Framework** using the standard **FAO-56 Penman-Monteith** model for evapotranspiration and root-zone soil water depletion. It avoids unsupported black-box ML models, strictly adhering to deterministic physical and hydrological laws.

## Contents
1. `member5_water_balance_physics.py`
   - Complete Python pipeline that fetches NASA POWER API daily climate data (2019-2024).
   - Implements the FAO-56 Penman-Monteith equation for reference evapotranspiration ($ET_0$) and crop evapotranspiration ($ET_c = K_c \times ET_0$).
   - Simulates root-zone soil water balance ($D_r$), calculating Readily Available Water ($RAW$) and Total Available Water ($TAW$).
   - Triggers irrigation requirements and alerts for drought/water-stress and waterlogging.
   - Generates the high-resolution visualization curve.

2. `run_in_colab.ipynb` / Standalone execution
   - Can be run directly via Python CLI (`python member5_water_balance_physics.py`) or imported into Google Colab / Jupyter.

## Outputs Produced
- `water_balance_simulation.csv`: 5-year daily simulated time-series (1,827 records) with depletion, crop water demand, and irrigation triggers.
- `fao56_water_balance_curve.png`: Root-zone depletion vs. RAW threshold curve illustrating physics-triggered irrigation cycles.
