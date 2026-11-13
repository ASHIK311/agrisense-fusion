"""
Pydantic Schemas for AgriSense Fusion FastAPI Service
Project: Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)
Member 1: Satellite Image Processing, Remote Sensing & GIS Analysis
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = Field(..., example="healthy")
    timestamp: str = Field(..., example="2026-11-09T23:40:00Z")
    service: str = Field(..., example="AgriSense Fusion Satellite Remote Sensing & GIS API")
    version: str = Field(..., example="1.0.0")
    study_area: str = Field(..., example="Godagari Upazila, Rajshahi, Bangladesh (Barind Tract)")

class SceneMetadataRecord(BaseModel):
    scene_id: str
    date: str
    season: Optional[str] = None
    cloud_cover_pct: float
    sun_elevation: Optional[float] = None
    tile_id: Optional[str] = None

class SatelliteMetadataResponse(BaseModel):
    study_area: str
    geographic_bbox: List[float]
    projected_crs: str
    total_sentinel2_scenes_cataloged: int
    total_landsat_scenes_cataloged: int
    local_processed_scenes_count: int
    available_dates: List[str]
    scenes: List[SceneMetadataRecord]

class IndexMetric(BaseModel):
    mean: float
    median: float
    std: float
    min: float
    max: float
    p10: float
    p90: float

class VegetationIndicesResponse(BaseModel):
    date: str
    season: str
    study_area: str
    NDVI: IndexMetric
    NDWI_McFeeters: IndexMetric
    NDMI_Gao_Moisture: IndexMetric
    EVI: IndexMetric
    provenance: str

class VegetationTimeseriesRecord(BaseModel):
    date: str
    season: str
    NDVI_mean: float
    EVI_mean: float
    NDWI_McFeeters_mean: float
    NDMI_Gao_mean: float
    NDVI_std: float
    NDMI_std: float

class VegetationTimeseriesResponse(BaseModel):
    total_observations: int
    timeseries: List[VegetationTimeseriesRecord]
    trend_summary: Dict[str, Any]

class VegetationAnalyzeRequest(BaseModel):
    lat: Optional[float] = Field(24.469, description="Field Latitude (WGS84)", example=24.469)
    lon: Optional[float] = Field(88.330, description="Field Longitude (WGS84)", example=88.330)
    target_date: Optional[str] = Field(None, description="Optional target date (YYYY-MM-DD)", example="2024-02-28")
    crop_interest: Optional[str] = Field("Rice", description="Priority crop interest", example="Rice")

class VegetationAnalyzeResponse(BaseModel):
    location: Dict[str, float]
    nearest_observation_date: str
    season: str
    ndvi_canopy_vigor: float
    evi_biomass_density: float
    ndmi_moisture_level: float
    ndwi_surface_water: float
    canopy_condition: str
    water_stress_status: str
    aquifer_depletion_risk: str
    agronomic_recommendation: str
    data_source: Optional[str] = "Sentinel-2 MSI Level-2A BOA Reflectance"
    model_version: Optional[str] = "v2.1"
    limitations: Optional[str] = "Spatial resolution 10m; cloud masking via SCL; in-situ groundwater logs pending BMDA digitization."

class CropClassifyRequest(BaseModel):
    features: Optional[Dict[str, float]] = Field(
        None,
        description="Spectral & temporal feature dictionary",
        example={
            "Blue_B02": 0.12,
            "Green_B03": 0.16,
            "Red_B04": 0.14,
            "NIR_B08": 0.38,
            "SWIR1_B11": 0.22,
            "NDVI_Rabi": 0.46,
            "NDWI_McFeeters": -0.40,
            "NDMI_Moisture": 0.26,
            "EVI_Rabi": 0.48,
            "Delta_NDVI_Kharif_Rabi": 0.18
        }
    )
    lat: Optional[float] = Field(None, description="Field coordinate Latitude", example=24.469)
    lon: Optional[float] = Field(None, description="Field coordinate Longitude", example=88.330)

class CropClassifyResponse(BaseModel):
    predicted_class_id: int
    predicted_class_name: str
    confidence: float
    probabilities: Dict[str, float]
    model_type: str
    ground_truth_status: str
    note: str
    data_date: Optional[str] = "2024-02-28"
    data_source: Optional[str] = "Copernicus Sentinel-2 L2A & ESA WorldCover 10m v200"
    model_version: Optional[str] = "v2.1-ExtraTrees-SpatialBlock"
    limitations: Optional[str] = "Valid for Land Cover (Cropland/Tree/Water/Built). Crop species (Rice/Wheat/Maize) BLOCKED pending DAE cadastral ground truth."

class MapItem(BaseModel):
    id: str
    title: str
    category: str
    date: Optional[str] = None
    format: str
    url_path: str
    description: str

class AvailableMapsResponse(BaseModel):
    total_maps: int
    maps: List[MapItem]
