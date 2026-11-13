"""
FAO-56 Analytical Solar Geometry and Radiation Equations
Reference: FAO Irrigation and Drainage Paper No. 56, Chapter 3 (Allen et al., 1998)
"""

import math
from typing import Union
from datetime import datetime, date


def calculate_day_of_year(d: Union[str, datetime, date, int]) -> int:
    """
    Extract integer day of year (J in [1, 366]) from date object or ISO string.
    """
    if isinstance(d, int):
        if not (1 <= d <= 366):
            raise ValueError(f"Day of year J must be in [1, 366], got {d}")
        return d
    if isinstance(d, str):
        # Support YYYY-MM-DD or YYYYMMDD
        cleaned = d.replace("-", "").strip()
        parsed = datetime.strptime(cleaned, "%Y%m%d")
        return parsed.timetuple().tm_yday
    if isinstance(d, (datetime, date)):
        return d.timetuple().tm_yday
    raise TypeError(f"Unsupported date format: {type(d)}")


def calculate_inverse_earth_sun_distance(day_of_year: int) -> float:
    """
    Calculate inverse relative distance Earth-Sun (dr).
    FAO-56 Eq. 23:
        dr = 1 + 0.033 * cos(2 * pi / 365 * J)
    """
    j = calculate_day_of_year(day_of_year)
    return 1.0 + 0.033 * math.cos(2.0 * math.pi / 365.0 * j)


def calculate_solar_declination(day_of_year: int) -> float:
    """
    Calculate solar declination (delta) in radians.
    FAO-56 Eq. 24:
        delta = 0.409 * sin(2 * pi / 365 * J - 1.39)
    """
    j = calculate_day_of_year(day_of_year)
    return 0.409 * math.sin(2.0 * math.pi / 365.0 * j - 1.39)


def calculate_sunset_hour_angle(latitude_rad: float, solar_declination_rad: float) -> float:
    """
    Calculate sunset hour angle (omega_s) in radians.
    FAO-56 Eq. 25:
        omega_s = arccos(-tan(phi) * tan(delta))
    Clamped to [-1.0, 1.0] to account for polar day/night at extreme latitudes.
    """
    term = -math.tan(latitude_rad) * math.tan(solar_declination_rad)
    clamped_term = max(-1.0, min(1.0, term))
    return math.acos(clamped_term)


def calculate_daylight_hours(sunset_hour_angle_rad: float) -> float:
    """
    Calculate maximum daylight duration (N) in hours.
    FAO-56 Eq. 34:
        N = 24 / pi * omega_s
    """
    return (24.0 / math.pi) * sunset_hour_angle_rad


def calculate_extraterrestrial_radiation(
    latitude_deg: float, day_of_year: int
) -> float:
    """
    Calculate extraterrestrial radiation (Ra) in MJ / m^2 / day.
    FAO-56 Eq. 21:
        Ra = (24 * 60 / pi) * Gsc * dr * [omega_s * sin(phi) * sin(delta) + cos(phi) * cos(delta) * sin(omega_s)]
    where solar constant Gsc = 0.0820 MJ / m^2 / min
    constant (24 * 60 / pi) * 0.0820 = 37.60 MJ / m^2 / day (approximately 37.586 in unrounded standard)
    """
    phi = math.radians(latitude_deg)
    j = calculate_day_of_year(day_of_year)
    dr = calculate_inverse_earth_sun_distance(j)
    delta = calculate_solar_declination(j)
    omega_s = calculate_sunset_hour_angle(phi, delta)

    # Gsc = 0.0820 MJ m^-2 min^-1
    # 24 * 60 / pi * 0.0820 = 37.586
    factor = (24.0 * 60.0 / math.pi) * 0.0820 * dr
    inner = omega_s * math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.sin(omega_s)
    ra = factor * inner
    return max(0.0, ra)


def calculate_clear_sky_radiation(
    ra_mj: float, elevation_m: float = 20.0
) -> float:
    """
    Calculate clear-sky solar radiation (Rso) in MJ / m^2 / day.
    FAO-56 Eq. 37:
        Rso = (0.75 + 2e-5 * z) * Ra
    where z is elevation above sea level in metres.
    """
    if ra_mj <= 0:
        return 0.0
    factor = 0.75 + (2e-5 * elevation_m)
    return factor * ra_mj
