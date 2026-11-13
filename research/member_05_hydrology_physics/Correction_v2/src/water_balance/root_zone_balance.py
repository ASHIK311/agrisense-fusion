"""
Root-Zone Soil Water Balance Accounting Engine
Reference: FAO Irrigation and Drainage Paper No. 56, Chapter 8 (Allen et al., 1998)
"""

from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass
class DailyWaterBalanceStep:
    """Detailed record of a single 24-hour root-zone water balance step."""
    date: str
    day_since_planting: int
    crop_id: str
    growth_stage: str
    kc: float
    root_depth_m: float
    et0_mm: float
    etc_potential_mm: float
    ks: float
    etc_actual_mm: float
    rainfall_mm: float
    peff_mm: float
    dr_start_mm: float
    dr_pre_irrigation_mm: float
    irrigation_net_mm: float
    irrigation_gross_mm: float
    deep_percolation_mm: float
    surface_runoff_mm: float
    dr_end_mm: float
    taw_mm: float
    raw_mm: float
    soil_water_status: str  # "optimal", "mild_stress", "severe_stress", "saturated", "fallow"
    alert_code: str         # "NORMAL", "IRRIGATION_APPLIED", "DROUGHT_STRESS", "WATERLOGGING", "FALLOW"


def calculate_taw(theta_fc: float, theta_wp: float, z_root_m: float) -> float:
    """
    Calculate Total Available Water (TAW) in the root zone in mm.
    FAO-56 Eq. 82:
        TAW = 1000 * (theta_fc - theta_wp) * Zr
    """
    if z_root_m <= 0 or theta_fc <= theta_wp:
        return 0.0
    return round(1000.0 * (theta_fc - theta_wp) * z_root_m, 2)


def calculate_raw(taw_mm: float, p_depletion: float = 0.50) -> float:
    """
    Calculate Readily Available Water (RAW) in mm.
    FAO-56 Eq. 83:
        RAW = p * TAW
    """
    return round(max(0.0, taw_mm * p_depletion), 2)


def calculate_water_stress_ks(taw_mm: float, dr_mm: float, p_depletion: float = 0.50) -> float:
    """
    Calculate water stress coefficient Ks.
    FAO-56 Eq. 84:
        Ks = (TAW - Dr) / ((1 - p) * TAW) when Dr > RAW
        Ks = 1.0 when Dr <= RAW
        Ks = 0.0 when Dr >= TAW
    """
    if taw_mm <= 0:
        return 1.0
    raw = p_depletion * taw_mm
    if dr_mm <= raw:
        return 1.0
    if dr_mm >= taw_mm:
        return 0.0
    ks = (taw_mm - dr_mm) / ((1.0 - p_depletion) * taw_mm)
    return round(max(0.0, min(1.0, ks)), 3)


class RootZoneBalanceEngine:
    """
    1D Daily root-zone soil water balance accountant enforcing mass conservation.
    """

    def __init__(
        self,
        theta_fc: float = 0.30,
        theta_wp: float = 0.15,
        irrigation_efficiency: float = 0.70,
    ):
        self.theta_fc = theta_fc
        self.theta_wp = theta_wp
        self.irrigation_efficiency = irrigation_efficiency

    def step(
        self,
        date_str: str,
        dr_previous: float,
        et0_mm: float,
        rainfall_mm: float,
        peff_mm: float,
        kc: float,
        root_depth_m: float,
        p_depletion: float,
        crop_id: str = "wheat",
        growth_stage: str = "mid_season",
        day_since_planting: int = 40,
        is_active_crop: bool = True,
        trigger_irrigation_if_stressed: bool = True,
    ) -> DailyWaterBalanceStep:
        """Advance the soil reservoir by one daily time-step."""
        # 1. Hydraulic capacities
        if is_active_crop and root_depth_m > 0:
            taw = calculate_taw(self.theta_fc, self.theta_wp, root_depth_m)
            raw = calculate_raw(taw, p_depletion)
        else:
            # Fallow bare soil shallow layer (0.15m)
            taw = calculate_taw(self.theta_fc, self.theta_wp, 0.15)
            raw = calculate_raw(taw, 0.50)

        # 2. Crop water demand
        etc_pot = round(et0_mm * kc, 2)

        # 3. Water stress evaluation based on previous depletion
        if is_active_crop and taw > 0:
            ks = calculate_water_stress_ks(taw, dr_previous, p_depletion)
        else:
            ks = 1.0

        etc_act = round(etc_pot * ks, 2)

        # 4. Preliminary depletion update before irrigation
        # Dr,t = Dr,t-1 - Peff + ETc_act
        dr_pre = dr_previous - peff_mm + etc_act

        # Water balance partitioning: runoff / deep percolation if rainfall exceeds depletion
        deep_percolation = 0.0
        surface_runoff = max(0.0, rainfall_mm - peff_mm)

        if dr_pre < 0.0:
            deep_percolation = round(abs(dr_pre), 2)
            dr_pre = 0.0

        # 5. Irrigation evaluation
        irrigation_net = 0.0
        irrigation_gross = 0.0
        alert = "NORMAL"
        status = "optimal"

        if not is_active_crop:
            status = "fallow"
            alert = "FALLOW_SEASON"
            dr_end = min(dr_pre, taw)

        else:
            # Check for waterlogging / saturation
            if dr_pre == 0.0 and rainfall_mm > 25.0:
                status = "saturated"
                alert = "WATERLOGGING_SATURATION"

            # Check for water stress
            if dr_pre > raw:
                status = "mild_stress" if dr_pre < taw else "severe_stress"
                if trigger_irrigation_if_stressed:
                    # Apply irrigation to replenish up to 95% of field capacity (buffer target)
                    target_dr = round(0.05 * taw, 2)
                    irrigation_net = round(max(0.0, dr_pre - target_dr), 2)
                    irrigation_gross = round(irrigation_net / self.irrigation_efficiency, 2)
                    dr_end = target_dr
                    alert = "IRRIGATION_APPLIED"
                else:
                    alert = "DROUGHT_STRESS"
                    dr_end = min(dr_pre, taw)
            else:
                dr_end = min(dr_pre, taw)

        return DailyWaterBalanceStep(
            date=date_str,
            day_since_planting=day_since_planting,
            crop_id=crop_id,
            growth_stage=growth_stage,
            kc=kc,
            root_depth_m=root_depth_m,
            et0_mm=et0_mm,
            etc_potential_mm=etc_pot,
            ks=ks,
            etc_actual_mm=etc_act,
            rainfall_mm=rainfall_mm,
            peff_mm=peff_mm,
            dr_start_mm=round(dr_previous, 2),
            dr_pre_irrigation_mm=round(dr_pre, 2),
            irrigation_net_mm=irrigation_net,
            irrigation_gross_mm=irrigation_gross,
            deep_percolation_mm=deep_percolation,
            surface_runoff_mm=surface_runoff,
            dr_end_mm=round(dr_end, 2),
            taw_mm=taw,
            raw_mm=raw,
            soil_water_status=status,
            alert_code=alert,
        )
