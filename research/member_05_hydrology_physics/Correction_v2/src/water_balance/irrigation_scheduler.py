"""
Irrigation Scheduling & Application Efficiency Accounting
Provides realistic net vs. gross water application and runtime estimations.
"""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class IrrigationEvent:
    """Record of a scheduled physical irrigation application."""
    event_id: str
    date: str
    crop_id: str
    growth_stage: str
    day_since_planting: int
    depletion_before_mm: float
    raw_threshold_mm: float
    taw_mm: float
    net_depth_mm: float
    gross_depth_mm: float
    application_efficiency: float
    post_irrigation_depletion_mm: float
    estimated_pumping_hours_per_ha: float
    trigger_reason: str


class IrrigationScheduler:
    """
    Schedules irrigation events based on dynamic root-zone depletion and farm application constraints.
    """

    def __init__(
        self,
        application_efficiency: float = 0.70,
        pump_discharge_lps: float = 14.0,  # 0.5 cusec centrifugal / submersible pump typical in Barind
    ):
        self.application_efficiency = application_efficiency
        self.pump_discharge_lps = pump_discharge_lps  # Liters per second

    def evaluate_and_schedule(
        self,
        event_index: int,
        date_str: str,
        crop_id: str,
        growth_stage: str,
        day_since_planting: int,
        depletion_mm: float,
        raw_mm: float,
        taw_mm: float,
        is_active_crop: bool,
    ) -> Optional[IrrigationEvent]:
        """
        Evaluate whether an irrigation event is triggered.
        Enforces strict constraints:
          1. Strictly NO irrigation if crop is not active in the field (is_active_crop == False).
          2. Triggers only when depletion Dr strictly exceeds Readily Available Water (RAW).
        """
        if not is_active_crop:
            return None

        if depletion_mm <= raw_mm:
            return None

        # Net irrigation depth to refill soil to 95% of field capacity
        target_dr = round(0.05 * taw_mm, 2)
        net_depth = round(max(0.0, depletion_mm - target_dr), 2)
        gross_depth = round(net_depth / self.application_efficiency, 2)

        # Pumping hours per hectare:
        # 1 mm of water over 1 hectare = 10,000 liters (10 m^3)
        # Total volume (L) = gross_depth (mm) * 10,000
        # Flow rate = pump_discharge_lps * 3,600 L/hour
        total_volume_liters = gross_depth * 10000.0
        hourly_discharge_liters = self.pump_discharge_lps * 3600.0
        pumping_hours = round(total_volume_liters / hourly_discharge_liters, 1)

        event = IrrigationEvent(
            event_id=f"IRR-{crop_id.upper()[:3]}-{event_index:03d}",
            date=date_str,
            crop_id=crop_id,
            growth_stage=growth_stage,
            day_since_planting=day_since_planting,
            depletion_before_mm=round(depletion_mm, 2),
            raw_threshold_mm=raw_mm,
            taw_mm=taw_mm,
            net_depth_mm=net_depth,
            gross_depth_mm=gross_depth,
            application_efficiency=self.application_efficiency,
            post_irrigation_depletion_mm=target_dr,
            estimated_pumping_hours_per_ha=pumping_hours,
            trigger_reason=f"Root-zone depletion ({depletion_mm:.1f} mm) exceeded RAW threshold ({raw_mm:.1f} mm)",
        )
        return event
