"""
FAO-56 Penman-Monteith Reference Evapotranspiration (ET0) Engine
Reference: FAO Irrigation and Drainage Paper No. 56 (Allen et al., 1998)
"""

import math
from dataclasses import dataclass
from typing import Optional, Union
from datetime import datetime, date

from .solar_geometry import (
    calculate_day_of_year,
    calculate_extraterrestrial_radiation,
    calculate_clear_sky_radiation,
)


@dataclass
class ET0Result:
    """Complete diagnostic result of FAO-56 Penman-Monteith calculation."""
    date: Optional[str]
    day_of_year: int
    t_mean_c: float
    t_max_c: float
    t_min_c: float
    rh_mean_pct: float
    u2_m_s: float
    rs_mj_m2_day: float
    ra_mj_m2_day: float
    rso_mj_m2_day: float
    rns_mj_m2_day: float
    rnl_mj_m2_day: float
    rn_mj_m2_day: float
    p_atm_kpa: float
    gamma_kpa_c: float
    delta_kpa_c: float
    es_kpa: float
    ea_kpa: float
    vpd_kpa: float
    radiation_term: float
    aerodynamic_term: float
    denominator: float
    et0_mm_day: float
    is_clamped_low: bool
    warning_flag: Optional[str] = None


def calculate_atmospheric_pressure(elevation_m: float = 20.0) -> float:
    """
    Calculate atmospheric pressure P in kPa.
    FAO-56 Eq. 7:
        P = 101.3 * ((293 - 0.0065 * z) / 293)^5.26
    """
    return 101.3 * math.pow((293.0 - 0.0065 * elevation_m) / 293.0, 5.26)


def calculate_psychrometric_constant(elevation_m: float = 20.0) -> float:
    """
    Calculate psychrometric constant (gamma) in kPa / °C.
    FAO-56 Eq. 8:
        gamma = 0.000665 * P
    """
    p = calculate_atmospheric_pressure(elevation_m)
    return 0.000665 * p


def calculate_saturation_vapor_pressure(t_celsius: float) -> float:
    """
    Calculate saturation vapor pressure e°(T) in kPa.
    FAO-56 Eq. 11:
        e°(T) = 0.6108 * exp((17.27 * T) / (T + 237.3))
    """
    return 0.6108 * math.exp((17.27 * t_celsius) / (t_celsius + 237.3))


def calculate_mean_saturation_vapor_pressure(t_max: float, t_min: float) -> float:
    """
    Calculate mean saturation vapor pressure es in kPa.
    FAO-56 Eq. 12:
        es = (e°(Tmax) + e°(Tmin)) / 2
    """
    e_tmax = calculate_saturation_vapor_pressure(t_max)
    e_tmin = calculate_saturation_vapor_pressure(t_min)
    return (e_tmax + e_tmin) / 2.0


def calculate_actual_vapor_pressure(
    t_max: float,
    t_min: float,
    rh_max: Optional[float] = None,
    rh_min: Optional[float] = None,
    rh_mean: Optional[float] = None,
) -> float:
    """
    Calculate actual vapor pressure ea in kPa.
    FAO-56 Eq. 17 (when RHmax and RHmin are available):
        ea = [e°(Tmin) * (RHmax / 100) + e°(Tmax) * (RHmin / 100)] / 2
    FAO-56 Eq. 19 (when only RHmean is available):
        ea = es * (RHmean / 100)
    """
    if rh_max is not None and rh_min is not None:
        e_tmin = calculate_saturation_vapor_pressure(t_min)
        e_tmax = calculate_saturation_vapor_pressure(t_max)
        ea = (e_tmin * (rh_max / 100.0) + e_tmax * (rh_min / 100.0)) / 2.0
    elif rh_mean is not None:
        es = calculate_mean_saturation_vapor_pressure(t_max, t_min)
        ea = es * (rh_mean / 100.0)
    else:
        # Fallback: dewpoint approximation e°(Tmin)
        ea = calculate_saturation_vapor_pressure(t_min)

    # Physical constraint: ea cannot exceed es
    es = calculate_mean_saturation_vapor_pressure(t_max, t_min)
    return max(0.001, min(ea, es))


def calculate_slope_vapor_pressure_curve(t_celsius: float) -> float:
    """
    Calculate slope of saturation vapor pressure curve (Delta) in kPa / °C.
    FAO-56 Eq. 13:
        Delta = 4098 * [0.6108 * exp((17.27 * T) / (T + 237.3))] / (T + 237.3)^2
    """
    es = calculate_saturation_vapor_pressure(t_celsius)
    return (4098.0 * es) / math.pow(t_celsius + 237.3, 2)


def convert_wind_height(u_z: float, z_m: float = 10.0) -> float:
    """
    Convert wind speed measured at height z_m to standard 2m height (u2).
    FAO-56 Eq. 47:
        u2 = u_z * [4.87 / ln(67.8 * z - 5.42)]
    For z = 10m: conversion factor is approximately 0.748.
    For z = 2m: returns u_z directly.
    """
    if abs(z_m - 2.0) < 0.05:
        return max(0.0, u_z)
    factor = 4.87 / math.log(67.8 * z_m - 5.42)
    return max(0.0, u_z * factor)


def calculate_net_radiation(
    t_max: float,
    t_min: float,
    ea: float,
    rs_mj: float,
    rso_mj: float,
    albedo: float = 0.23,
) -> dict:
    """
    Calculate net shortwave (Rns), net longwave (Rnl), and net radiation (Rn) in MJ / m^2 / day.
    FAO-56 Eq. 38, 39, 40.
    """
    # 1. Net shortwave radiation (Rns)
    rns = (1.0 - albedo) * rs_mj

    # 2. Cloudiness fraction (f_cd) - FAO-56 Eq. 39
    if rso_mj > 0:
        rel_rs = min(1.0, max(0.3, rs_mj / rso_mj))
        f_cd = 1.35 * rel_rs - 0.35
        f_cd = max(0.05, min(1.0, f_cd))
    else:
        f_cd = 0.5  # Neutral default in polar night

    # 3. Stefan-Boltzmann law for longwave radiation (Rnl)
    # sigma = 4.903e-9 MJ K^-4 m^-2 day^-1
    t_max_k4 = math.pow(t_max + 273.16, 4)
    t_min_k4 = math.pow(t_min + 273.16, 4)
    mean_temp_k4 = (t_max_k4 + t_min_k4) / 2.0

    # Net emissivity: (0.34 - 0.14 * sqrt(ea))
    emissivity_term = 0.34 - 0.14 * math.sqrt(max(0.0, ea))

    rnl = 4.903e-9 * mean_temp_k4 * emissivity_term * f_cd

    # 4. Net radiation (Rn)
    rn = rns - rnl
    return {
        "rns": rns,
        "rnl": rnl,
        "rn": rn,
        "f_cd": f_cd,
    }


def calculate_reference_et0(
    date_val: Union[str, datetime, date, int],
    t_max: float,
    t_min: float,
    rs_mj: float,
    rh_mean: Optional[float] = None,
    rh_max: Optional[float] = None,
    rh_min: Optional[float] = None,
    wind_speed: float = 2.0,
    wind_height_m: float = 2.0,
    latitude_deg: float = 24.469,
    elevation_m: float = 20.0,
    albedo: float = 0.23,
) -> ET0Result:
    """
    Calculate FAO-56 Penman-Monteith reference evapotranspiration (ET0) in mm / day.
    Full physical reference implementation adhering to FAO Irrigation and Drainage Paper No. 56.
    
    Zero artificial minimum clamping: Returns mathematically derived ET0 without forcing ET0 >= 0.5 mm/day.
    """
    j = calculate_day_of_year(date_val)
    date_str = str(date_val) if not isinstance(date_val, int) else f"DOY-{date_val:03d}"

    # Mean temperature
    t_mean = (t_max + t_min) / 2.0

    # 1. Atmospheric pressure & Psychrometric constant
    p_atm = calculate_atmospheric_pressure(elevation_m)
    gamma = calculate_psychrometric_constant(elevation_m)

    # 2. Vapor pressures
    es = calculate_mean_saturation_vapor_pressure(t_max, t_min)
    if rh_mean is None and rh_max is not None and rh_min is not None:
        rh_mean = (rh_max + rh_min) / 2.0
    elif rh_mean is None:
        rh_mean = 70.0  # fallback assumption if all RH is absent

    ea = calculate_actual_vapor_pressure(t_max, t_min, rh_max, rh_min, rh_mean)
    vpd = max(0.0, es - ea)

    # 3. Slope of saturation vapor pressure curve
    delta = calculate_slope_vapor_pressure_curve(t_mean)

    # 4. Wind speed at 2m
    u2 = convert_wind_height(wind_speed, wind_height_m)

    # 5. Solar geometry & Net Radiation
    ra = calculate_extraterrestrial_radiation(latitude_deg, j)
    rso = calculate_clear_sky_radiation(ra, elevation_m)
    rad_dict = calculate_net_radiation(t_max, t_min, ea, rs_mj, rso, albedo)
    rns = rad_dict["rns"]
    rnl = rad_dict["rnl"]
    rn = rad_dict["rn"]

    # Soil heat flux G is negligible for daily time steps
    g = 0.0

    # 6. Penman-Monteith Equation (FAO-56 Eq. 6)
    # Radiation term: 0.408 * Delta * (Rn - G)
    rad_term = 0.408 * delta * (rn - g)

    # Aerodynamic term: gamma * (900 / (Tmean + 273)) * u2 * (es - ea)
    aero_term = gamma * (900.0 / (t_mean + 273.0)) * u2 * vpd

    # Denominator: Delta + gamma * (1 + 0.34 * u2)
    denom = delta + gamma * (1.0 + 0.34 * u2)

    warning = None
    if denom <= 0:
        warning = "Zero or negative denominator in Penman-Monteith equation"
        raw_et0 = 0.0
    else:
        raw_et0 = (rad_term + aero_term) / denom

    # Scientifically justified low-end handling:
    # If raw ET0 is negative (due to net radiative cooling in heavy overcast night), physical ET0 is 0.0
    is_clamped_low = False
    if raw_et0 < 0.0:
        et0 = 0.0
        is_clamped_low = True
        warning = "Negative mathematical ET0 clamped to 0.0 mm/day (condensation/dew formation)"
    else:
        et0 = round(raw_et0, 2)

    return ET0Result(
        date=date_str,
        day_of_year=j,
        t_mean_c=round(t_mean, 2),
        t_max_c=round(t_max, 2),
        t_min_c=round(t_min, 2),
        rh_mean_pct=round(rh_mean, 1),
        u2_m_s=round(u2, 2),
        rs_mj_m2_day=round(rs_mj, 2),
        ra_mj_m2_day=round(ra, 2),
        rso_mj_m2_day=round(rso, 2),
        rns_mj_m2_day=round(rns, 2),
        rnl_mj_m2_day=round(rnl, 2),
        rn_mj_m2_day=round(rn, 2),
        p_atm_kpa=round(p_atm, 3),
        gamma_kpa_c=round(gamma, 4),
        delta_kpa_c=round(delta, 4),
        es_kpa=round(es, 3),
        ea_kpa=round(ea, 3),
        vpd_kpa=round(vpd, 3),
        radiation_term=round(rad_term, 3),
        aerodynamic_term=round(aero_term, 3),
        denominator=round(denom, 4),
        et0_mm_day=et0,
        is_clamped_low=is_clamped_low,
        warning_flag=warning,
    )


class FAO56ReferenceCalculator:
    """Configurable FAO-56 Reference ET0 Calculator."""

    def __init__(
        self,
        latitude_deg: float = 24.469,
        elevation_m: float = 20.0,
        albedo: float = 0.23,
    ):
        self.latitude_deg = latitude_deg
        self.elevation_m = elevation_m
        self.albedo = albedo

    def calculate(
        self,
        date_val: Union[str, datetime, date, int],
        t_max: float,
        t_min: float,
        rs_mj: float,
        rh_mean: Optional[float] = None,
        rh_max: Optional[float] = None,
        rh_min: Optional[float] = None,
        wind_speed: float = 2.0,
        wind_height_m: float = 2.0,
    ) -> ET0Result:
        return calculate_reference_et0(
            date_val=date_val,
            t_max=t_max,
            t_min=t_min,
            rs_mj=rs_mj,
            rh_mean=rh_mean,
            rh_max=rh_max,
            rh_min=rh_min,
            wind_speed=wind_speed,
            wind_height_m=wind_height_m,
            latitude_deg=self.latitude_deg,
            elevation_m=self.elevation_m,
            albedo=self.albedo,
        )
