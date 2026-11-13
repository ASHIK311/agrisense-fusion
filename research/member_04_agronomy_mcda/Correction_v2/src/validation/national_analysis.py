"""
National Agricultural Analysis and Regional Profiling Engine
NASA Space Apps Challenge 2026: Field Shift (AgriSense Fusion)
Member 4 Correction & Expansion Subsystem
"""

import os
import pandas as pd
import numpy as np

print("Executing National Agricultural Analysis & Regional Profiling Engine...")

base1 = r"F:\nasa project\data set that we test\Member4_Final_Submission\new sub\Member 4\Correction_v2"
base2 = r"F:\nasa project\Member 4\Correction_v2"

# Load datasets
admin_df = pd.read_csv(os.path.join(base1, "data", "reference", "bangladesh_admin_reference.csv"))
coords_df = pd.read_csv(os.path.join(base1, "data", "reference", "upazila_coordinate_reference.csv"))
suit_df = pd.read_csv(os.path.join(base1, "data", "processed", "national_crop_suitability.csv"))
rank_df = pd.read_csv(os.path.join(base1, "data", "processed", "upazila_crop_rankings.csv"))
clim_df = pd.read_csv(os.path.join(base1, "data", "processed", "national_upazila_climate_monthly.csv"))
et0_df = pd.read_csv(os.path.join(base1, "data", "processed", "daily_et0_national.csv"))
net_iwr_df = pd.read_csv(os.path.join(base1, "data", "processed", "net_irrigation_requirement.csv"))
rot_df = pd.read_csv(os.path.join(base1, "data", "processed", "national_crop_rotation_recommendations.csv"))

print(f"Loaded admin ({len(admin_df)} rows), suit ({len(suit_df)} rows), rank ({len(rank_df)} rows), IWR ({len(net_iwr_df)} rows), rotation ({len(rot_df)} rows)")

# 1. Climate and ET0 annual averages per upazila (5-year total / 5)
clim_agg = clim_df.groupby(["division_name", "district_name", "upazila_name"]).agg(
    total_precip_5yr=("precipitation_monthly_total_mm", "sum"),
    mean_t2m=("t2m_mean_degc", "mean"),
    mean_solar=("allsky_sfc_sw_dwn_mj_per_m2_day", "mean")
).reset_index()
clim_agg["annual_mean_precip_mm"] = (clim_agg["total_precip_5yr"] / 5.0).round(1)
clim_agg["mean_t2m_degc"] = clim_agg["mean_t2m"].round(1)
clim_agg["mean_solar_mj_per_m2_day"] = clim_agg["mean_solar"].round(2)

et0_agg = et0_df.groupby(["division_name", "district_name", "upazila_name"]).agg(
    total_et0_5yr=("et0_monthly_accumulated_mm", "sum")
).reset_index()
et0_agg["annual_mean_et0_mm"] = (et0_agg["total_et0_5yr"] / 5.0).round(1)

# Merge climate and et0
upz_clim = clim_agg.merge(et0_agg[["division_name", "district_name", "upazila_name", "annual_mean_et0_mm"]], on=["division_name", "district_name", "upazila_name"])

# 2. IWR annual/seasonal totals per crop and upazila
crop_iwr = net_iwr_df.groupby(["district_name", "upazila_name", "crop"])["net_irrigation_requirement_mm"].sum().reset_index()
crop_iwr["seasonal_mean_net_iwr_mm"] = (crop_iwr["net_irrigation_requirement_mm"] / 5.0).round(1)

crop_iwr_piv = crop_iwr.pivot_table(
    index=["district_name", "upazila_name"],
    columns="crop",
    values="seasonal_mean_net_iwr_mm"
).reset_index()
crop_iwr_piv.columns.name = None
crop_iwr_piv.rename(columns={
    "Aman Rice": "aman_net_iwr_mm",
    "Boro Rice": "boro_net_iwr_mm",
    "Aus Rice": "aus_net_iwr_mm",
    "Wheat": "wheat_net_iwr_mm",
    "Maize (Rabi)": "maize_net_iwr_mm"
}, inplace=True)

# 3. Merge upazila-level comprehensive metrics
upz_full = upz_clim.merge(crop_iwr_piv, on=["district_name", "upazila_name"], how="left")
upz_full = upz_full.merge(
    rank_df[["district_name", "upazila_name", "rank_1_crop", "rank_1_score", "rank_5_crop", "rank_5_score"]],
    on=["district_name", "upazila_name"],
    how="left"
)
upz_full = upz_full.merge(
    rot_df[["district_name", "upazila_name", "primary_recommended_rotation", "water_savings_potential"]],
    on=["district_name", "upazila_name"],
    how="left"
)

# 4. Build District-Level Aggregations (64 districts)
dist_summary = upz_full.groupby(["division_name", "district_name"]).agg(
    upazila_count=("upazila_name", "count"),
    annual_mean_precip_mm=("annual_mean_precip_mm", "mean"),
    annual_mean_et0_mm=("annual_mean_et0_mm", "mean"),
    boro_net_iwr_mm=("boro_net_iwr_mm", "mean"),
    aman_net_iwr_mm=("aman_net_iwr_mm", "mean"),
    wheat_net_iwr_mm=("wheat_net_iwr_mm", "mean"),
    maize_net_iwr_mm=("maize_net_iwr_mm", "mean"),
    top_suitable_crop=("rank_1_crop", lambda x: x.mode()[0] if not x.empty else "Unknown"),
    top_rotation_pattern=("primary_recommended_rotation", lambda x: x.mode()[0] if not x.empty else "Unknown")
).reset_index()

dist_summary["annual_mean_precip_mm"] = dist_summary["annual_mean_precip_mm"].round(1)
dist_summary["annual_mean_et0_mm"] = dist_summary["annual_mean_et0_mm"].round(1)
dist_summary["boro_net_iwr_mm"] = dist_summary["boro_net_iwr_mm"].round(1)
dist_summary["aman_net_iwr_mm"] = dist_summary["aman_net_iwr_mm"].round(1)
dist_summary["wheat_net_iwr_mm"] = dist_summary["wheat_net_iwr_mm"].round(1)
dist_summary["maize_net_iwr_mm"] = dist_summary["maize_net_iwr_mm"].round(1)

# Flag Barind / Western Groundwater Stress
dist_summary["groundwater_stress_vulnerability"] = dist_summary.apply(
    lambda r: "High (Critical Barind / Western Drought Zone)" if (r["boro_net_iwr_mm"] > 400 and r["annual_mean_precip_mm"] < 1700) else (
        "Moderate (Winter Supplemental Irrigation Needed)" if r["boro_net_iwr_mm"] > 300 else "Low to Moderate (High Rainfall Zone)"
    ), axis=1
)

# 5. Build Division-Level Aggregations (8 divisions)
div_summary = upz_full.groupby("division_name").agg(
    district_count=("district_name", lambda s: s.nunique()),
    upazila_count=("upazila_name", "count"),
    mean_annual_precip_mm=("annual_mean_precip_mm", "mean"),
    mean_annual_et0_mm=("annual_mean_et0_mm", "mean"),
    mean_boro_net_iwr_mm=("boro_net_iwr_mm", "mean"),
    mean_aman_net_iwr_mm=("aman_net_iwr_mm", "mean"),
    mean_wheat_net_iwr_mm=("wheat_net_iwr_mm", "mean"),
    mean_maize_net_iwr_mm=("maize_net_iwr_mm", "mean"),
    dominant_crop=("rank_1_crop", lambda x: x.mode()[0]),
    dominant_rotation=("primary_recommended_rotation", lambda x: x.mode()[0])
).reset_index()

div_summary["mean_annual_precip_mm"] = div_summary["mean_annual_precip_mm"].round(1)
div_summary["mean_annual_et0_mm"] = div_summary["mean_annual_et0_mm"].round(1)
div_summary["mean_boro_net_iwr_mm"] = div_summary["mean_boro_net_iwr_mm"].round(1)
div_summary["mean_aman_net_iwr_mm"] = div_summary["mean_aman_net_iwr_mm"].round(1)
div_summary["mean_wheat_net_iwr_mm"] = div_summary["mean_wheat_net_iwr_mm"].round(1)
div_summary["mean_maize_net_iwr_mm"] = div_summary["mean_maize_net_iwr_mm"].round(1)

div_vulnerabilities = {
    "Barishal": "Coastal Salinity Intrusion, Tidal Inundation, Cyclone Frequency",
    "Chattogram": "Hilly Topography, Flash Flooding, Coastal Storm Surge",
    "Dhaka": "Riverbank Erosion, Surface Runoff Variations, Rapid Urban Encroachment",
    "Khulna": "Severe Dry-Season Salinity Intrusion (SW Coastal Belt), Mangrove Ecology Buffer",
    "Mymensingh": "Northern Piedmont Flash Flooding, Acidic Basin Soils",
    "Rajshahi": "Barind Tract Severe Groundwater Depletion, High Summer VPD, Rabi Aridity",
    "Rangpur": "Teesta Floodplain Inundation, Cold Wave Sensitivity in Rabi, Sand Casting",
    "Sylhet": "Haor Early Flash Floods (Pre-Monsoon Boro Inundation Risk), Highest National Rainfall"
}
div_summary["primary_agroclimatic_vulnerability"] = div_summary["division_name"].map(div_vulnerabilities)

# Build Comprehensive Regional Agricultural Profile
regional_profiles = dist_summary.copy()
regional_profiles["division_vulnerability_context"] = regional_profiles["division_name"].map(div_vulnerabilities)

# Save to derived directories
for dest in [base1, base2]:
    derived_dir = os.path.join(dest, "data", "derived")
    os.makedirs(derived_dir, exist_ok=True)
    
    dist_summary.to_csv(os.path.join(derived_dir, "district_agricultural_summary.csv"), index=False)
    div_summary.to_csv(os.path.join(derived_dir, "division_agricultural_summary.csv"), index=False)
    regional_profiles.to_csv(os.path.join(derived_dir, "regional_agricultural_profiles.csv"), index=False)
    upz_full.to_csv(os.path.join(derived_dir, "upazila_comprehensive_profile.csv"), index=False)

print(f"Successfully generated regional agricultural profiles across {len(div_summary)} divisions and {len(dist_summary)} districts!")
print("\n--- Division-Level Summary ---")
print(div_summary[["division_name", "upazila_count", "mean_annual_precip_mm", "mean_boro_net_iwr_mm", "dominant_crop"]])
