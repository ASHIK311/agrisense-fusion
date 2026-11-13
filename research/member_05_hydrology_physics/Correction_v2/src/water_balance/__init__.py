"""
Hydrological Water Balance & Irrigation Scheduling Module
Implements continuous effective rainfall, root-zone depletion accounting, and irrigation scheduling.
"""

from .effective_rainfall import (
    calculate_effective_rainfall_usda,
    calculate_effective_rainfall_comparison,
)

from .root_zone_balance import (
    DailyWaterBalanceStep,
    RootZoneBalanceEngine,
    calculate_taw,
    calculate_raw,
    calculate_water_stress_ks,
)

from .irrigation_scheduler import (
    IrrigationEvent,
    IrrigationScheduler,
)

from .soil_adapter import (
    SoilTelemetryAdapter,
    SoilObservationRecord,
    SoilMode,
)

__all__ = [
    "calculate_effective_rainfall_usda",
    "calculate_effective_rainfall_comparison",
    "DailyWaterBalanceStep",
    "RootZoneBalanceEngine",
    "calculate_taw",
    "calculate_raw",
    "calculate_water_stress_ks",
    "IrrigationEvent",
    "IrrigationScheduler",
    "SoilTelemetryAdapter",
    "SoilObservationRecord",
    "SoilMode",
]
