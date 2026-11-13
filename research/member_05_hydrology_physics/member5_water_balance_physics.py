"""
Member 5: Physics-Based Agro-Meteorological Water Balance Engine
Framework: FAO-56 Penman-Monteith & Root-Zone Soil Water Depletion
NASA International Space Apps Challenge
"""

import numpy as np
import pandas as pd
import requests
import matplotlib.pyplot as plt

# --- 1. NASA POWER API Data Retrieval ---
def fetch_nasa_weather_data(latitude=24.3636, longitude=88.6241, start_date="20190101", end_date="20240101"):
    print(f"Fetching NASA POWER API data for ({latitude}, {longitude}) from {start_date} to {end_date}...")
    url = (
        f"https://power.larc.nasa.gov/api/temporal/daily/point?"
        f"parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN&"
        f"community=AG&longitude={longitude}&latitude={latitude}&"
        f"start={start_date}&end={end_date}&format=JSON"
    )
    res = requests.get(url)
    res.raise_for_status()
    data = res.json()["properties"]["parameter"]

    df = pd.DataFrame({
        "t_max": data["T2M_MAX"],
        "t_min": data["T2M_MIN"],
        "rainfall": data["PRECTOTCORR"],
        "humidity": data["RH2M"],
        "wind_speed": data["WS2M"],
        "solar_radiation": data["ALLSKY_SFC_SW_DWN"]
    })

    df.index = pd.to_datetime(df.index)
    df.reset_index(inplace=True)
    df.rename(columns={"index": "date"}, inplace=True)
    df.replace(-999, np.nan, inplace=True)
    df.bfill(inplace=True)
    df.ffill(inplace=True)
    print("-> NASA Weather data processed successfully.")
    return df


# --- 2. FAO-56 Water Balance Physics Engine ---
class FAO56WaterBalanceModule:
    def __init__(self, latitude_deg=24.36, altitude_m=20.0, theta_fc=0.30, theta_wp=0.15, p_depletion=0.50):
        self.lat_rad = np.radians(latitude_deg)
        self.altitude = altitude_m
        self.theta_fc = theta_fc       # Field Capacity (volumetric)
        self.theta_wp = theta_wp       # Wilting Point (volumetric)
        self.p_depletion = p_depletion # Depletion fraction without water stress

    def calculate_et0(self, row):
        """Calculates daily reference evapotranspiration (ET0) using FAO-56 Penman-Monteith."""
        t_max = row['t_max']
        t_min = row['t_min']
        t_mean = (t_max + t_min) / 2.0
        rh = row['humidity']
        u2 = row['wind_speed']
        rs = row['solar_radiation']

        # Psychrometric constant (gamma)
        p_atm = 101.3 * (((293.0 - 0.0065 * self.altitude) / 293.0) ** 5.26)
        gamma = 0.000665 * p_atm

        # Saturation & actual vapor pressure
        e0_tmax = 0.6108 * np.exp((17.27 * t_max) / (t_max + 237.3))
        e0_tmin = 0.6108 * np.exp((17.27 * t_min) / (t_min + 237.3))
        es = (e0_tmax + e0_tmin) / 2.0
        ea = es * (rh / 100.0)

        # Slope of saturation vapor pressure curve (Delta)
        delta = (4098.0 * (0.6108 * np.exp((17.27 * t_mean) / (t_mean + 237.3)))) / ((t_mean + 237.3) ** 2)

        # Net radiation estimation (Rn)
        rns = (1 - 0.23) * rs
        rso = 0.75 * 30.0
        f_cd = max(0.05, min(1.0, 1.35 * min(rs / rso, 1.0) - 0.35))
        sigma_t = 4.903e-9 * (((t_max + 273.16) ** 4 + (t_min + 273.16) ** 4) / 2.0)
        rnl = sigma_t * (0.34 - 0.14 * np.sqrt(max(0, ea))) * f_cd
        rn = max(0.0, rns - rnl)

        # Penman-Monteith equation
        num = 0.408 * delta * rn + gamma * (900.0 / (t_mean + 273.0)) * u2 * (es - ea)
        den = delta + gamma * (1.0 + 0.34 * u2)
        return max(0.5, round(num / den, 2))

    def run_simulation(self, weather_df, crop_name="Wheat", z_root_m=0.6, kc_value=1.15):
        """Root-zone soil water balance simulation."""
        taw = 1000.0 * (self.theta_fc - self.theta_wp) * z_root_m # Total Available Water (mm)
        raw = self.p_depletion * taw                              # Readily Available Water (mm)
        results = []
        d_r = 0.0 # Initial root-zone depletion (assuming soil at field capacity)

        for _, row in weather_df.iterrows():
            et0 = self.calculate_et0(row)
            etc = round(kc_value * et0, 2)
            rain = row['rainfall']

            # Effective rainfall (USDA SCS method approximation)
            p_eff = max(0.0, rain * 0.8) if rain > 2.0 else 0.0

            # Soil water depletion balance
            d_r = d_r - p_eff + etc

            waterlogging_risk = False
            if d_r < 0.0:
                d_r = 0.0
                if rain > 50.0:
                    waterlogging_risk = True

            water_stress = False
            irrigation_needed = 0.0
            alert = "NORMAL"

            if d_r > raw:
                water_stress = True
                irrigation_needed = round(d_r, 2)
                d_r = 0.0 # Reset depletion after applying irrigation
                alert = "DROUGHT_WATER_STRESS_IRRIGATE"
            elif waterlogging_risk:
                alert = "WATERLOGGING_FLOOD_RISK"

            results.append({
                "date": str(row['date'])[:10],
                "crop": crop_name,
                "et0_mm": et0,
                "etc_mm": etc,
                "rainfall_mm": rain,
                "p_eff_mm": round(p_eff, 2),
                "soil_depletion_mm": round(d_r, 2),
                "taw_mm": round(taw, 2),
                "raw_threshold_mm": round(raw, 2),
                "irrigation_applied_mm": irrigation_needed,
                "water_stress_flag": water_stress,
                "physics_alert": alert
            })
        return pd.DataFrame(results)


# --- 3. Visualization Generator ---
def plot_water_balance(simulation_df, output_path="fao56_water_balance_curve.png", start_date="2023-01-01", end_date="2023-04-30"):
    sim_copy = simulation_df.copy()
    sim_copy['date'] = pd.to_datetime(sim_copy['date'])
    sample_period = sim_copy[(sim_copy['date'] >= start_date) & (sim_copy['date'] <= end_date)]

    plt.figure(figsize=(12, 6))
    plt.plot(sample_period['date'], sample_period['soil_depletion_mm'], label='Root-Zone Depletion (Dr)', color='#2980b9', lw=2)

    raw_limit = sample_period['raw_threshold_mm'].iloc[0]
    plt.axhline(y=raw_limit, color='#e74c3c', linestyle='--', lw=2, label=f'Irrigation Trigger Threshold (RAW = {raw_limit} mm)')

    irrigation_events = sample_period[sample_period['irrigation_applied_mm'] > 0]
    plt.scatter(irrigation_events['date'], [raw_limit]*len(irrigation_events), color='#27ae60', s=80, zorder=5, label='Irrigation Applied')

    plt.title('FAO-56 Root-Zone Soil Water Balance & Irrigation Schedule (Physics Model)', fontsize=13, fontweight='bold')
    plt.xlabel('Date', fontsize=11)
    plt.ylabel('Water Depth (mm)', fontsize=11)
    plt.grid(True, linestyle=':', alpha=0.6)
    plt.legend(loc='upper left', frameon=True)
    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"-> Plot saved to {output_path}")


if __name__ == "__main__":
    weather_df = fetch_nasa_weather_data()
    engine = FAO56WaterBalanceModule(latitude_deg=24.36, altitude_m=20.0)
    sim_results = engine.run_simulation(weather_df, crop_name="Wheat", z_root_m=0.6, kc_value=1.15)
    sim_results.to_csv("water_balance_simulation.csv", index=False)
    print("-> Simulation CSV saved as water_balance_simulation.csv")
    plot_water_balance(sim_results)
