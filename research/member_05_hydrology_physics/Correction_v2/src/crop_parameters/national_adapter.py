"""
National Bangladesh Upazila Environment & Climate Adaptation Interface
Enables nationwide expansion across all agro-ecological zones (AEZ) of Bangladesh.
"""

from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class UpazilaEnvironmentProfile:
    """Geographic, elevation, and pedological profile for an administrative Upazila."""
    upazila_id: str
    upazila_name_en: str
    upazila_name_bn: str
    district: str
    division: str
    aez_number: int
    aez_name: str
    latitude_deg: float
    longitude_deg: float
    elevation_m: float
    primary_soil_texture: str
    theta_fc: float       # Field capacity (m3/m3)
    theta_wp: float       # Wilting point (m3/m3)
    awc_mm_per_m: float   # Available water capacity in mm/m of root depth
    drought_vulnerability: str  # "Severe", "Moderate", "Low"


BANGLADESH_UPAZILA_REGISTRY: Dict[str, UpazilaEnvironmentProfile] = {
    "godagari": UpazilaEnvironmentProfile(
        upazila_id="godagari",
        upazila_name_en="Godagari",
        upazila_name_bn="গোদাগাড়ী",
        district="Rajshahi",
        division="Rajshahi",
        aez_number=26,
        aez_name="High Barind Tract",
        latitude_deg=24.469,
        longitude_deg=88.330,
        elevation_m=20.0,
        primary_soil_texture="Silty Clay Loam",
        theta_fc=0.30,
        theta_wp=0.15,
        awc_mm_per_m=150.0,
        drought_vulnerability="Severe",
    ),
    "tanore": UpazilaEnvironmentProfile(
        upazila_id="tanore",
        upazila_name_en="Tanore",
        upazila_name_bn="তানোর",
        district="Rajshahi",
        division="Rajshahi",
        aez_number=26,
        aez_name="High Barind Tract",
        latitude_deg=24.583,
        longitude_deg=88.583,
        elevation_m=22.0,
        primary_soil_texture="Heavy Clay",
        theta_fc=0.34,
        theta_wp=0.18,
        awc_mm_per_m=160.0,
        drought_vulnerability="Severe",
    ),
    "nachole": UpazilaEnvironmentProfile(
        upazila_id="nachole",
        upazila_name_en="Nachole",
        upazila_name_bn="নাচোল",
        district="Chapai Nawabganj",
        division="Rajshahi",
        aez_number=26,
        aez_name="High Barind Tract",
        latitude_deg=24.729,
        longitude_deg=88.419,
        elevation_m=25.0,
        primary_soil_texture="Silty Clay",
        theta_fc=0.32,
        theta_wp=0.16,
        awc_mm_per_m=160.0,
        drought_vulnerability="Severe",
    ),
    "niamatpur": UpazilaEnvironmentProfile(
        upazila_id="niamatpur",
        upazila_name_en="Niamatpur",
        upazila_name_bn="নিয়ামতপুর",
        district="Naogaon",
        division="Rajshahi",
        aez_number=26,
        aez_name="High Barind Tract",
        latitude_deg=24.858,
        longitude_deg=88.566,
        elevation_m=26.0,
        primary_soil_texture="Clay Loam",
        theta_fc=0.29,
        theta_wp=0.14,
        awc_mm_per_m=150.0,
        drought_vulnerability="Severe",
    ),
    "dinajpur_sadar": UpazilaEnvironmentProfile(
        upazila_id="dinajpur_sadar",
        upazila_name_en="Dinajpur Sadar",
        upazila_name_bn="দিনাজপুর সদর",
        district="Dinajpur",
        division="Rangpur",
        aez_number=1,
        aez_name="Old Himalayan Piedmont Plain",
        latitude_deg=25.627,
        longitude_deg=88.633,
        elevation_m=37.0,
        primary_soil_texture="Sandy Loam",
        theta_fc=0.22,
        theta_wp=0.08,
        awc_mm_per_m=140.0,
        drought_vulnerability="Moderate",
    ),
    "chuadanga_sadar": UpazilaEnvironmentProfile(
        upazila_id="chuadanga_sadar",
        upazila_name_en="Chuadanga Sadar",
        upazila_name_bn="চুয়াডাঙ্গা সদর",
        district="Chuadanga",
        division="Khulna",
        aez_number=11,
        aez_name="High Ganges River Floodplain",
        latitude_deg=23.640,
        longitude_deg=88.850,
        elevation_m=12.0,
        primary_soil_texture="Calcareous Silt Loam",
        theta_fc=0.28,
        theta_wp=0.12,
        awc_mm_per_m=160.0,
        drought_vulnerability="High (Heat Extreme)",
    ),
    "mymensingh_sadar": UpazilaEnvironmentProfile(
        upazila_id="mymensingh_sadar",
        upazila_name_en="Mymensingh Sadar",
        upazila_name_bn="ময়মনসিংহ সদর",
        district="Mymensingh",
        division="Mymensingh",
        aez_number=9,
        aez_name="Old Brahmaputra Floodplain",
        latitude_deg=24.747,
        longitude_deg=90.420,
        elevation_m=18.0,
        primary_soil_texture="Silt Loam",
        theta_fc=0.27,
        theta_wp=0.11,
        awc_mm_per_m=160.0,
        drought_vulnerability="Low",
    ),
}


def get_upazila_profile(upazila_key: str) -> UpazilaEnvironmentProfile:
    """Retrieve environmental profile for an upazila."""
    clean_key = upazila_key.lower().replace(" ", "_").strip()
    if clean_key not in BANGLADESH_UPAZILA_REGISTRY:
        available = list(BANGLADESH_UPAZILA_REGISTRY.keys())
        raise KeyError(f"Upazila '{upazila_key}' not in registry. Available upazilas: {available}")
    return BANGLADESH_UPAZILA_REGISTRY[clean_key]
