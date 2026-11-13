"""
FAO-56 Physical Evapotranspiration Module
Independent reference implementation following FAO Irrigation and Drainage Paper No. 56.
"""

from .solar_geometry import (
    calculate_day_of_year,
    calculate_solar_declination,
    calculate_sunset_hour_angle,
    calculate_inverse_earth_sun_distance,
    calculate_extraterrestrial_radiation,
    calculate_clear_sky_radiation,
    calculate_daylight_hours,
)

from .fao56 import (
    calculate_atmospheric_pressure,
    calculate_psychrometric_constant,
    calculate_saturation_vapor_pressure,
    calculate_mean_saturation_vapor_pressure,
    calculate_actual_vapor_pressure,
    calculate_slope_vapor_pressure_curve,
    convert_wind_height,
    calculate_net_radiation,
    calculate_reference_et0,
    FAO56ReferenceCalculator,
    ET0Result,
)

__all__ = [
    "calculate_day_of_year",
    "calculate_solar_declination",
    "calculate_sunset_hour_angle",
    "calculate_inverse_earth_sun_distance",
    "calculate_extraterrestrial_radiation",
    "calculate_clear_sky_radiation",
    "calculate_daylight_hours",
    "calculate_atmospheric_pressure",
    "calculate_psychrometric_constant",
    "calculate_saturation_vapor_pressure",
    "calculate_mean_saturation_vapor_pressure",
    "calculate_actual_vapor_pressure",
    "calculate_slope_vapor_pressure_curve",
    "convert_wind_height",
    "calculate_net_radiation",
    "calculate_reference_et0",
    "FAO56ReferenceCalculator",
    "ET0Result",
]
