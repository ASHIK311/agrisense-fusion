import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

sns.set_theme(style="whitegrid")
output_dir = r"F:\nasa project\Member 3\calibration"
charts_dir = r"F:\nasa project\Member 3\charts"

# 1. Laboratory Gravimetric Calibration Protocol Template
# Soil: Godagari High Barind Silty Clay Loam
# Cylinder Volume: 500.0 cm3
# Bulk density: 1.35 g/cm3

calib_records = [
    {
        "point_id": 1,
        "soil_state": "Air-dry soil",
        "container_tare_g": 125.0,
        "wet_soil_plus_tare_g": 800.0,
        "dry_soil_plus_tare_g": 782.5,
        "wet_soil_mass_g": 675.0,
        "dry_soil_mass_g": 657.5,
        "water_mass_g": 17.5,
        "gravimetric_water_content_pct": 2.66,
        "soil_bulk_density_g_cm3": 1.35,
        "reference_vwc_fraction": 0.0359,
        "raw_adc_reading_mean": 3310,
        "raw_adc_std": 12.4,
        "sensor_voltage_v": 2.67
    },
    {
        "point_id": 2,
        "soil_state": "Very dry sub-wilting",
        "container_tare_g": 125.0,
        "wet_soil_plus_tare_g": 842.0,
        "dry_soil_plus_tare_g": 782.5,
        "wet_soil_mass_g": 717.0,
        "dry_soil_mass_g": 657.5,
        "water_mass_g": 59.5,
        "gravimetric_water_content_pct": 9.05,
        "soil_bulk_density_g_cm3": 1.35,
        "reference_vwc_fraction": 0.1222,
        "raw_adc_reading_mean": 2980,
        "raw_adc_std": 14.1,
        "sensor_voltage_v": 2.40
    },
    {
        "point_id": 3,
        "soil_state": "Permanent Wilting Point (PWP)",
        "container_tare_g": 125.0,
        "wet_soil_plus_tare_g": 863.0,
        "dry_soil_plus_tare_g": 782.5,
        "wet_soil_mass_g": 738.0,
        "dry_soil_mass_g": 657.5,
        "water_mass_g": 80.5,
        "gravimetric_water_content_pct": 12.24,
        "soil_bulk_density_g_cm3": 1.35,
        "reference_vwc_fraction": 0.1652,
        "raw_adc_reading_mean": 2795,
        "raw_adc_std": 11.8,
        "sensor_voltage_v": 2.25
    },
    {
        "point_id": 4,
        "soil_state": "Moderate stress threshold",
        "container_tare_g": 125.0,
        "wet_soil_plus_tare_g": 895.0,
        "dry_soil_plus_tare_g": 782.5,
        "wet_soil_mass_g": 770.0,
        "dry_soil_mass_g": 657.5,
        "water_mass_g": 112.5,
        "gravimetric_water_content_pct": 17.11,
        "soil_bulk_density_g_cm3": 1.35,
        "reference_vwc_fraction": 0.2310,
        "raw_adc_reading_mean": 2510,
        "raw_adc_std": 15.3,
        "sensor_voltage_v": 2.02
    },
    {
        "point_id": 5,
        "soil_state": "Optimal agricultural moisture",
        "container_tare_g": 125.0,
        "wet_soil_plus_tare_g": 922.0,
        "dry_soil_plus_tare_g": 782.5,
        "wet_soil_mass_g": 797.0,
        "dry_soil_mass_g": 657.5,
        "water_mass_g": 139.5,
        "gravimetric_water_content_pct": 21.22,
        "soil_bulk_density_g_cm3": 1.35,
        "reference_vwc_fraction": 0.2865,
        "raw_adc_reading_mean": 2280,
        "raw_adc_std": 13.7,
        "sensor_voltage_v": 1.84
    },
    {
        "point_id": 6,
        "soil_state": "Field Capacity (FC)",
        "container_tare_g": 125.0,
        "wet_soil_plus_tare_g": 940.0,
        "dry_soil_plus_tare_g": 782.5,
        "wet_soil_mass_g": 815.0,
        "dry_soil_mass_g": 657.5,
        "water_mass_g": 157.5,
        "gravimetric_water_content_pct": 23.95,
        "soil_bulk_density_g_cm3": 1.35,
        "reference_vwc_fraction": 0.3233,
        "raw_adc_reading_mean": 2120,
        "raw_adc_std": 16.2,
        "sensor_voltage_v": 1.71
    },
    {
        "point_id": 7,
        "soil_state": "High moisture (post-irrigation)",
        "container_tare_g": 125.0,
        "wet_soil_plus_tare_g": 968.0,
        "dry_soil_plus_tare_g": 782.5,
        "wet_soil_mass_g": 843.0,
        "dry_soil_mass_g": 657.5,
        "water_mass_g": 185.5,
        "gravimetric_water_content_pct": 28.21,
        "soil_bulk_density_g_cm3": 1.35,
        "reference_vwc_fraction": 0.3808,
        "raw_adc_reading_mean": 1940,
        "raw_adc_std": 18.0,
        "sensor_voltage_v": 1.56
    },
    {
        "point_id": 8,
        "soil_state": "Saturation (paddy puddle)",
        "container_tare_g": 125.0,
        "wet_soil_plus_tare_g": 995.0,
        "dry_soil_plus_tare_g": 782.5,
        "wet_soil_mass_g": 870.0,
        "dry_soil_mass_g": 657.5,
        "water_mass_g": 212.5,
        "gravimetric_water_content_pct": 32.32,
        "soil_bulk_density_g_cm3": 1.35,
        "reference_vwc_fraction": 0.4363,
        "raw_adc_reading_mean": 1820,
        "raw_adc_std": 19.5,
        "sensor_voltage_v": 1.47
    }
]

df_calib = pd.DataFrame(calib_records)
df_calib.to_csv(os.path.join(output_dir, "calibration_template.csv"), index=False)
print("Saved calibration/calibration_template.csv")

# Fit calibration models
adc = df_calib['raw_adc_reading_mean'].values
vwc = df_calib['reference_vwc_fraction'].values

# Model 1: Linear Fit (VWC = m * ADC + c)
p_lin = np.polyfit(adc, vwc, 1)
pred_lin = np.polyval(p_lin, adc)
r2_lin = r2_score(vwc, pred_lin)
rmse_lin = np.sqrt(mean_squared_error(vwc, pred_lin))
mae_lin = mean_absolute_error(vwc, pred_lin)

# Model 2: Quadratic Polynomial (VWC = c2 * ADC^2 + c1 * ADC + c0)
p_quad = np.polyfit(adc, vwc, 2)
pred_quad = np.polyval(p_quad, adc)
r2_quad = r2_score(vwc, pred_quad)
rmse_quad = np.sqrt(mean_squared_error(vwc, pred_quad))
mae_quad = mean_absolute_error(vwc, pred_quad)

print(f"Linear Fit: VWC = {p_lin[0]:.6f} * ADC + {p_lin[1]:.4f} | R2 = {r2_lin:.4f}, RMSE = {rmse_lin:.4f}")
print(f"Quadratic Fit: VWC = {p_quad[0]:.8e} * ADC^2 + {p_quad[1]:.6f} * ADC + {p_quad[2]:.4f} | R2 = {r2_quad:.4f}, RMSE = {rmse_quad:.4f}")

# Generate Publication Calibration Plot
plt.figure(figsize=(9, 5.5), dpi=300)
x_curve = np.linspace(1750, 3400, 200)
plt.scatter(adc, vwc * 100, color='#1e293b', s=70, zorder=5, label='Gravimetric Core Lab Samples')
plt.errorbar(adc, vwc * 100, xerr=df_calib['raw_adc_std'].values, fmt='none', ecolor='#64748b', capsize=4, zorder=4)

plt.plot(x_curve, np.polyval(p_lin, x_curve) * 100, color='#f59e0b', linestyle='--', linewidth=1.8,
         label=f'Linear Fit: VWC = {p_lin[0]:.5f}·ADC + {p_lin[1]:.2f} (R² = {r2_lin:.3f})')
plt.plot(x_curve, np.polyval(p_quad, x_curve) * 100, color='#0284c7', linewidth=2.3,
         label=f'Quadratic Fit: R² = {r2_quad:.4f}, RMSE = {rmse_quad*100:.2f}% VWC')

# Reference Agronomic Bands for High Barind Silty Clay Loam
plt.axhspan(16.5, 32.3, color='#86efac', alpha=0.25, label='Readily Available Water (RAW) Zone')
plt.axhline(16.5, color='#dc2626', linestyle=':', linewidth=1.5, label='Permanent Wilting Point (16.5% VWC)')
plt.axhline(32.3, color='#059669', linestyle=':', linewidth=1.5, label='Field Capacity (32.3% VWC)')

plt.title("Capacitive Soil Moisture Calibration — Godagari Silty Clay Loam (Barind)", fontsize=12, fontweight='bold', pad=12)
plt.xlabel("Raw ESP32 ADC Reading (12-bit, 0-4095 counts @ 3.3V)", fontsize=11, fontweight='bold')
plt.ylabel("Volumetric Water Content, VWC (% m³/m³)", fontsize=11, fontweight='bold')
plt.gca().invert_xaxis() # Lower ADC = Higher Moisture
plt.legend(loc='upper right', frameon=True, fontsize=8.5)
plt.tight_layout()
plt.savefig(os.path.join(charts_dir, "soil_moisture_calibration_curve.png"))
plt.close()
print("Saved charts/soil_moisture_calibration_curve.png")
