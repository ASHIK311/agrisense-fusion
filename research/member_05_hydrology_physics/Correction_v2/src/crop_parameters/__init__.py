"""
Crop Parameters & National Upazila Adaptation Module
Provides stage-specific crop coefficients, root depths, and regional crop calendars.
"""

from .crop_catalog import (
    CropStageCalendar,
    CropSpecification,
    CROP_CATALOG,
    get_crop_specification,
    calculate_dynamic_kc_and_depth,
)

from .national_adapter import (
    UpazilaEnvironmentProfile,
    get_upazila_profile,
    BANGLADESH_UPAZILA_REGISTRY,
)

__all__ = [
    "CropStageCalendar",
    "CropSpecification",
    "CROP_CATALOG",
    "get_crop_specification",
    "calculate_dynamic_kc_and_depth",
    "UpazilaEnvironmentProfile",
    "get_upazila_profile",
    "BANGLADESH_UPAZILA_REGISTRY",
]
