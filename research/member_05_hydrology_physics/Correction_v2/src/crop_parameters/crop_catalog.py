"""
Verified Regional Crop Catalog & Dynamic Phenology Engine for Northern Bangladesh
References:
- FAO Irrigation and Drainage Paper No. 56, Tables 11 & 12 (Allen et al., 1998)
- BARI (Bangladesh Agricultural Research Institute) Krishi Projukti Hatboi (Handbook of Agro-technologies), 8th Edition
- BRRI (Bangladesh Rice Research Institute) Modern Rice Cultivation Manual
"""

from dataclasses import dataclass
from typing import Dict, Optional, Tuple


@dataclass
class CropStageCalendar:
    """Durations of the four standard FAO-56 crop growth stages in days."""
    ini_days: int
    dev_days: int
    mid_days: int
    late_days: int

    @property
    def total_days(self) -> int:
        return self.ini_days + self.dev_days + self.mid_days + self.late_days


@dataclass
class CropSpecification:
    """Comprehensive agronomic and hydraulic specification for a regional crop."""
    crop_id: str
    name_en: str
    name_bn: str
    season_category: str  # "Rabi", "Kharif-1", "Kharif-2"
    typical_planting_window: str
    default_planting_month: int
    default_planting_day: int
    stages: CropStageCalendar
    kc_ini: float
    kc_mid: float
    kc_end: float
    zr_ini_m: float
    zr_max_m: float
    p_depletion: float
    is_wetland_paddy: bool
    literature_source: str
    agronomic_notes: str


CROP_CATALOG: Dict[str, CropSpecification] = {
    "wheat": CropSpecification(
        crop_id="wheat",
        name_en="Wheat (Prodip / BARI Gom-26)",
        name_bn="গম",
        season_category="Rabi",
        typical_planting_window="Nov 15 - Dec 05",
        default_planting_month=11,
        default_planting_day=20,
        stages=CropStageCalendar(ini_days=20, dev_days=30, mid_days=40, late_days=20),
        kc_ini=0.35,
        kc_mid=1.15,
        kc_end=0.40,
        zr_ini_m=0.20,
        zr_max_m=0.60,
        p_depletion=0.55,
        is_wetland_paddy=False,
        literature_source="FAO-56 Table 12; BARI Krishi Projukti Hatboi 2019",
        agronomic_notes="Strict winter crop. Highly sensitive to terminal heat stress if sown after Dec 5. Requires 3-4 critical irrigations (CRI, flowering, grain-fill).",
    ),
    "aman_rice": CropSpecification(
        crop_id="aman_rice",
        name_en="Transplanted Aman Rice (BRRI dhan49 / Swarna)",
        name_bn="রোপা আমন ধান",
        season_category="Kharif-2",
        typical_planting_window="Jul 15 - Aug 10",
        default_planting_month=7,
        default_planting_day=25,
        stages=CropStageCalendar(ini_days=20, dev_days=30, mid_days=50, late_days=30),
        kc_ini=1.05,
        kc_mid=1.20,
        kc_end=0.90,
        zr_ini_m=0.20,
        zr_max_m=0.50,
        p_depletion=0.20,
        is_wetland_paddy=True,
        literature_source="FAO-56 Table 12 (Wetland Rice); BRRI Modern Rice Manual 2021",
        agronomic_notes="Monsoon season rainfed/supplemental irrigated paddy. Main risk in Barind is terminal drought in October/November during grain filling.",
    ),
    "boro_rice": CropSpecification(
        crop_id="boro_rice",
        name_en="Boro Dry-Season Rice (BRRI dhan28 / 29)",
        name_bn="বোরো ধান",
        season_category="Rabi/Pre-Kharif",
        typical_planting_window="Jan 10 - Jan 25",
        default_planting_month=1,
        default_planting_day=15,
        stages=CropStageCalendar(ini_days=20, dev_days=30, mid_days=45, late_days=25),
        kc_ini=1.05,
        kc_mid=1.20,
        kc_end=0.90,
        zr_ini_m=0.20,
        zr_max_m=0.50,
        p_depletion=0.20,
        is_wetland_paddy=True,
        literature_source="FAO-56 Table 12; BMDA Tubewell Irrigation Water Balance 2020",
        agronomic_notes="Exclusively tubewell groundwater-irrigated. Primary driver of deep aquifer suction lift decline in Barind tract (needs ~1000-1200 mm water).",
    ),
    "aus_rice": CropSpecification(
        crop_id="aus_rice",
        name_en="Aus Rice (BRRI dhan48 / Parija)",
        name_bn="আউশ ধান",
        season_category="Kharif-1",
        typical_planting_window="Apr 15 - May 05",
        default_planting_month=4,
        default_planting_day=20,
        stages=CropStageCalendar(ini_days=15, dev_days=25, mid_days=40, late_days=20),
        kc_ini=1.00,
        kc_mid=1.15,
        kc_end=0.85,
        zr_ini_m=0.20,
        zr_max_m=0.50,
        p_depletion=0.30,
        is_wetland_paddy=True,
        literature_source="FAO-56 Table 12; BRRI Aus Handbook 2020",
        agronomic_notes="Pre-monsoon short duration rice. Avoids excessive tubewell pumping by capturing early pre-monsoon showers.",
    ),
    "maize": CropSpecification(
        crop_id="maize",
        name_en="Maize / Corn (NK-40 / Pacific 984)",
        name_bn="ভুট্টা",
        season_category="Rabi",
        typical_planting_window="Nov 25 - Dec 20",
        default_planting_month=12,
        default_planting_day=5,
        stages=CropStageCalendar(ini_days=25, dev_days=35, mid_days=45, late_days=30),
        kc_ini=0.30,
        kc_mid=1.20,
        kc_end=0.50,
        zr_ini_m=0.30,
        zr_max_m=0.80,
        p_depletion=0.55,
        is_wetland_paddy=False,
        literature_source="FAO-56 Table 12; BARI Maize Production Bulletin",
        agronomic_notes="High-yielding cash crop replacing Boro rice in Barind. Deeper root system (0.8m) accesses sub-soil moisture with high water use efficiency.",
    ),
}


def get_crop_specification(crop_id: str) -> CropSpecification:
    """Retrieve verified crop specification by ID."""
    key = crop_id.lower().strip()
    if key not in CROP_CATALOG:
        available = list(CROP_CATALOG.keys())
        raise KeyError(f"Unknown crop '{crop_id}'. Available crops: {available}")
    return CROP_CATALOG[key]


def calculate_dynamic_kc_and_depth(
    crop_spec: CropSpecification, day_since_planting: int
) -> Tuple[str, float, float, float]:
    """
    Calculate daily stage, dynamic crop coefficient Kc(t), rooting depth Zr(t),
    and depletion fraction p(t) using FAO-56 Chapter 6 continuous linear interpolation.
    
    Returns:
        (stage_name, kc_value, root_depth_m, p_depletion)
    """
    cal = crop_spec.stages
    total_days = cal.total_days

    # Fallow / Inactive checks
    if day_since_planting < 0:
        return ("pre_planting", 0.0, 0.0, 0.50)
    if day_since_planting >= total_days:
        return ("harvested_fallow", 0.0, 0.0, 0.50)

    # 1. Initial stage
    if day_since_planting < cal.ini_days:
        stage = "initial"
        kc = crop_spec.kc_ini
        zr = crop_spec.zr_ini_m

    # 2. Crop development stage (linear interpolation between ini and mid)
    elif day_since_planting < (cal.ini_days + cal.dev_days):
        stage = "development"
        progress = (day_since_planting - cal.ini_days) / float(cal.dev_days)
        kc = crop_spec.kc_ini + progress * (crop_spec.kc_mid - crop_spec.kc_ini)
        zr = crop_spec.zr_ini_m + progress * (crop_spec.zr_max_m - crop_spec.zr_ini_m)

    # 3. Mid-season stage (plateau at peak canopy)
    elif day_since_planting < (cal.ini_days + cal.dev_days + cal.mid_days):
        stage = "mid_season"
        kc = crop_spec.kc_mid
        zr = crop_spec.zr_max_m

    # 4. Late-season stage (senescence/maturity: linear interpolation between mid and end)
    else:
        stage = "late_season"
        late_start = cal.ini_days + cal.dev_days + cal.mid_days
        progress = (day_since_planting - late_start) / float(cal.late_days)
        kc = crop_spec.kc_mid + progress * (crop_spec.kc_end - crop_spec.kc_mid)
        zr = crop_spec.zr_max_m  # Root depth remains maximum through maturity

    p = crop_spec.p_depletion
    return (stage, round(kc, 3), round(zr, 3), p)
