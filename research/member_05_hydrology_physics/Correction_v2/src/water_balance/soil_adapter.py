"""
Member 3 IoT Ground Sensor Telemetry Adapter & Dual-Mode Assimilation Interface
References:
- Member 3 Subsystem Audit & Technical Report (FDR Capacitive Probes & ESP32 Edge Ingress)
- ASTM D2216 Standard Test Methods for Laboratory Determination of Water Content
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional, Tuple


class SoilMode(str, Enum):
    PHYSICS_ONLY = "PHYSICS_ONLY"
    SENSOR_ASSISTED = "SENSOR_ASSISTED"


@dataclass
class SoilObservationRecord:
    """Incoming soil telemetry packet from in-situ FDR sensors or edge simulators."""
    timestamp: str
    sensor_id: str
    latitude: float
    longitude: float
    soil_depth_cm: float
    volumetric_water_content: float  # theta in [0.0, 0.65] m3/m3
    soil_temperature_c: Optional[float]
    soil_ec_ds_m: Optional[float]
    is_simulated: bool
    is_laboratory_calibrated: bool
    quality_flag: str  # "VALID", "SUSPECT", "OUT_OF_BOUNDS", "STALE"


class SoilTelemetryAdapter:
    """
    Adapter bridging in-situ edge telemetry with analytical root-zone water balance.
    Strictly reports whether outputs are derived from purely analytical physics
    or telemetry-assisted assimilation.
    """

    def __init__(
        self,
        theta_fc: float = 0.30,
        theta_wp: float = 0.15,
        default_mode: SoilMode = SoilMode.PHYSICS_ONLY,
    ):
        self.theta_fc = theta_fc
        self.theta_wp = theta_wp
        self.mode = default_mode

    def assimilate_observation(
        self,
        record: Optional[SoilObservationRecord],
        root_depth_m: float,
    ) -> Tuple[float, SoilMode, str]:
        """
        Derive root-zone soil water depletion (Dr) from sensor telemetry or analytical fallback.
        
        Returns:
            (derived_depletion_mm, operational_mode, provenance_note)
        """
        # If no record provided or operating in pure physics mode:
        if record is None or self.mode == SoilMode.PHYSICS_ONLY:
            return (
                0.0,  # Caller uses analytical depletion recursion
                SoilMode.PHYSICS_ONLY,
                "Analytical 1D FAO-56 balance without ground sensor assimilation (Default).",
            )

        # Validate incoming sensor telemetry
        theta = record.volumetric_water_content
        if not (0.0 <= theta <= 0.65):
            return (
                0.0,
                SoilMode.PHYSICS_ONLY,
                f"Sensor reading theta={theta} outside physical bounds [0.0, 0.65]. Fallback to physics mode.",
            )

        # Integrity check on physical calibration status
        cal_status = "Laboratory Calibrated" if record.is_laboratory_calibrated else "UNCALIBRATED EMPIRICAL TEMPLATE"
        sim_status = "SYNTHETIC_SIMULATED_TEST_DATA" if record.is_simulated else "PHYSICAL_IN_SITU_OBSERVATION"

        # Direct hydraulic depletion from observed moisture:
        # Dr = 1000 * (theta_fc - theta) * Zr
        # If soil is above field capacity (theta > theta_fc), Dr = 0.0
        raw_dr = 1000.0 * (self.theta_fc - theta) * root_depth_m
        taw = 1000.0 * (self.theta_fc - self.theta_wp) * root_depth_m
        clamped_dr = max(0.0, min(taw, raw_dr))

        note = (
            f"Assimilated sensor reading (theta={theta:.3f}) at depth {record.soil_depth_cm}cm. "
            f"Data nature: {sim_status}; Calibration: {cal_status}."
        )

        return (round(clamped_dr, 2), SoilMode.SENSOR_ASSISTED, note)
