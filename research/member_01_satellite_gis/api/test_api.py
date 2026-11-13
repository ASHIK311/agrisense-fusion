"""
Comprehensive Automated Test Suite for AgriSense Fusion FastAPI Service
Project: Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)
Member 1: Satellite Image Processing, Remote Sensing & GIS Analysis

Validates:
- Health and status endpoints
- STAC catalog metadata counts
- Vegetation indices and time-series extraction
- Agronomic field stress diagnostics & boundary enforcement
- ML inference (Extra Trees / Random Forest) on multi-spectral features
- Error handling (out-of-bounds coords, missing features, invalid types, invalid dates)
- GIS maps catalog and GeoJSON boundary topology
"""

import os
import sys
import json

# Ensure project root is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(CURRENT_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_01_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data["status"] == "healthy"
    assert "Godagari" in data["study_area"]
    assert data["version"] == "1.0.0"

def test_02_satellite_metadata_catalog():
    resp = client.get("/satellite/metadata")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_sentinel2_scenes_cataloged"] >= 400
    assert data["total_landsat_scenes_cataloged"] >= 200
    assert len(data["available_dates"]) >= 4
    assert data["local_processed_scenes_count"] == 4

def test_03_vegetation_indices_default():
    resp = client.get("/vegetation/indices")
    assert resp.status_code == 200
    data = resp.json()
    assert "NDVI" in data
    assert "EVI" in data
    assert "NDWI_McFeeters" in data
    assert "NDMI_Gao_Moisture" in data
    assert -1.0 <= data["NDVI"]["mean"] <= 1.0
    assert -1.0 <= data["NDMI_Gao_Moisture"]["mean"] <= 1.0

def test_04_vegetation_indices_valid_date():
    resp = client.get("/vegetation/indices?date=2023-10-26")
    assert resp.status_code == 200
    data = resp.json()
    assert data["date"] == "2023-10-26"
    assert "Aman" in data["season"]
    assert data["NDVI"]["mean"] > 0.35  # Peak Aman greenness (0.395 mean, 0.452 median)

def test_05_vegetation_indices_invalid_date_rejection():
    resp = client.get("/vegetation/indices?date=1995-05-15")
    assert resp.status_code == 400
    assert "not found" in resp.json()["detail"].lower()

def test_06_vegetation_timeseries_structure():
    resp = client.get("/vegetation/timeseries")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_observations"] == 4
    assert len(data["timeseries"]) == 4
    for r in data["timeseries"]:
        assert "date" in r
        assert "NDVI_mean" in r
        assert "NDMI_Gao_mean" in r

def test_07_vegetation_timeseries_trends():
    resp = client.get("/vegetation/timeseries")
    assert resp.status_code == 200
    summary = resp.json()["trend_summary"]
    assert "peak_biomass_season" in summary
    assert "lowest_biomass_season" in summary
    assert summary["seasonal_ndvi_amplitude"] > 0.10

def test_08_vegetation_analyze_valid_coordinate():
    payload = {
        "lat": 24.469,
        "lon": 88.330,
        "target_date": "2024-02-28",
        "crop_interest": "Wheat"
    }
    resp = client.post("/vegetation/analyze", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["location"]["latitude"] == 24.469
    assert data["location"]["longitude"] == 88.330
    assert "ndvi_canopy_vigor" in data
    assert "water_stress_status" in data
    assert "aquifer_depletion_risk" in data
    assert "agronomic_recommendation" in data

def test_09_vegetation_analyze_out_of_bounds_north():
    # Latitude too far north (e.g. 26.5°N in Himalayas)
    payload = {"lat": 26.50, "lon": 88.330}
    resp = client.post("/vegetation/analyze", json=payload)
    assert resp.status_code == 400
    assert "outside" in resp.json()["detail"].lower()

def test_10_vegetation_analyze_out_of_bounds_west():
    # Longitude too far west (e.g. 75.0°E in Rajasthan)
    payload = {"lat": 24.469, "lon": 75.00}
    resp = client.post("/vegetation/analyze", json=payload)
    assert resp.status_code == 400
    assert "outside" in resp.json()["detail"].lower()

def test_11_vegetation_analyze_invalid_target_date():
    payload = {
        "lat": 24.469,
        "lon": 88.330,
        "target_date": "2018-04-12"
    }
    resp = client.post("/vegetation/analyze", json=payload)
    assert resp.status_code == 400
    assert "available dates" in resp.json()["detail"].lower()

def test_12_crop_classify_empty_payload_rejection():
    # Empty feature payload must be rejected with HTTP 400 (never auto-substitute dummy inputs in production)
    resp = client.post("/crop/classify", json={})
    assert resp.status_code == 400
    assert "empty feature payload rejected" in resp.json()["detail"].lower()

def test_12b_crop_classify_demo_endpoint():
    # Explicit demo endpoint providing documented representative Rabi agricultural parcel
    resp = client.get("/crop/classify/demo")
    assert resp.status_code == 200
    data = resp.json()
    assert data["predicted_class_name"] == "Cropland"
    assert 0.0 <= data["confidence"] <= 1.0
    assert "probabilities" in data
    assert "DEMO PARCEL" in data["ground_truth_status"]

def test_13_crop_classify_cropland_signature():
    # Valid Multi-Temporal Cropland signature: high NDVI, high NIR, moderate SWIR, high seasonal swing
    payload = {
        "features": {
            "Blue_B02": 0.08, "Green_B03": 0.12, "Red_B04": 0.09, "NIR_B08": 0.45, "SWIR1_B11": 0.18,
            "NDVI_Rabi": 0.66, "NDWI_McFeeters": -0.58, "NDMI_Moisture": 0.42, "EVI_Rabi": 0.62,
            "Delta_NDVI_Kharif_Rabi": 0.10,
            "NDVI_Seasonal_Min": 0.20, "NDVI_Seasonal_Max": 0.70, "NDVI_Seasonal_Amplitude": 0.50,
            "NDMI_Seasonal_Mean": 0.35, "EVI_Temporal_Change": 0.08
        }
    }
    resp = client.post("/crop/classify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["predicted_class_name"] == "Cropland"
    assert data["confidence"] > 0.50

def test_14_crop_classify_water_signature():
    # Valid Multi-Temporal Water signature: high NDWI, very low NIR, negative NDVI
    payload = {
        "features": {
            "Blue_B02": 0.15, "Green_B03": 0.20, "Red_B04": 0.14, "NIR_B08": 0.04, "SWIR1_B11": 0.02,
            "NDVI_Rabi": -0.55, "NDWI_McFeeters": 0.66, "NDMI_Moisture": 0.33, "EVI_Rabi": -0.20,
            "Delta_NDVI_Kharif_Rabi": -0.05,
            "NDVI_Seasonal_Min": -0.60, "NDVI_Seasonal_Max": -0.40, "NDVI_Seasonal_Amplitude": 0.20,
            "NDMI_Seasonal_Mean": 0.30, "EVI_Temporal_Change": 0.02
        }
    }
    resp = client.post("/crop/classify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["predicted_class_name"] == "Permanent_Water"
    assert data["confidence"] > 0.70

def test_15_crop_classify_missing_feature_rejection():
    # Missing 5 required features
    payload = {
        "features": {
            "Blue_B02": 0.12,
            "Green_B03": 0.16
        }
    }
    resp = client.post("/crop/classify", json=payload)
    assert resp.status_code in [400, 422]  # Pydantic 422 validation rejection
    assert "missing required features" in resp.json()["detail"].lower()

def test_16_crop_classify_invalid_type_rejection():
    payload = {
        "features": {
            "Blue_B02": "NOT_A_FLOAT",
            "Green_B03": 0.16, "Red_B04": 0.14, "NIR_B08": 0.38, "SWIR1_B11": 0.22,
            "NDVI_Rabi": 0.46, "NDWI_McFeeters": -0.40, "NDMI_Moisture": 0.26, "EVI_Rabi": 0.48,
            "Delta_NDVI_Kharif_Rabi": 0.18
        }
    }
    resp = client.post("/crop/classify", json=payload)
    assert resp.status_code in [400, 422]  # Pydantic 422 validation rejection

def test_17_maps_available_catalog():
    resp = client.get("/maps/available")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_maps"] >= 8
    map_ids = [m["id"] for m in data["maps"]]
    assert "study_area_interactive" in map_ids
    assert "land_cover_distribution" in map_ids
    assert "surface_water_moisture_trend" in map_ids

def test_18_study_area_geojson_topology():
    resp = client.get("/study-area")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Godagari Upazila"
    assert 440.0 <= data["area_sq_km"] <= 450.0
    assert data["native_geographic_crs"] == "EPSG:4326"
    assert data["projected_metric_crs"] == "EPSG:32645"
    assert len(data["bbox_actual"]) == 4

    # Also verify the static geojson file is valid GeoJSON
    geojson_path = os.path.join(BASE_DIR, "exports", "geojson", "study_area.geojson")
    assert os.path.exists(geojson_path)
    with open(geojson_path, "r", encoding="utf-8") as f:
        geojson = json.load(f)
    assert geojson["type"] in ["FeatureCollection", "Feature", "Polygon", "MultiPolygon"]

def test_19_vegetation_analyze_inside_bbox_outside_polygon():
    # Coordinate (24.37, 88.54) is inside the bounding box rectangle, but outside the meandering Godagari border
    payload = {"lat": 24.37, "lon": 88.54}
    resp = client.post("/vegetation/analyze", json=payload)
    assert resp.status_code == 400
    assert "outside the authoritative" in resp.json()["detail"].lower()

def test_20_crop_classify_metadata_provenance():
    # Verify model provenance, version, and limitation transparency with a valid feature payload
    payload = {
        "lat": 24.469,
        "lon": 88.330,
        "features": {
            "Blue_B02": 0.08, "Green_B03": 0.12, "Red_B04": 0.09, "NIR_B08": 0.45, "SWIR1_B11": 0.18,
            "NDVI_Rabi": 0.66, "NDWI_McFeeters": -0.58, "NDMI_Moisture": 0.42, "EVI_Rabi": 0.62,
            "Delta_NDVI_Kharif_Rabi": 0.10,
            "NDVI_Seasonal_Min": 0.20, "NDVI_Seasonal_Max": 0.70, "NDVI_Seasonal_Amplitude": 0.50,
            "NDMI_Seasonal_Mean": 0.35, "EVI_Temporal_Change": 0.08
        }
    }
    resp = client.post("/crop/classify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "data_source" in data
    assert "model_version" in data
    assert "limitations" in data
    assert "BLOCKED" in data["limitations"]

def test_21_crop_classify_point_in_polygon_rejection():
    # Coordinate (24.37, 88.54) in adjacent Upazila should be rejected by point-in-polygon
    payload = {"lat": 24.37, "lon": 88.54}
    resp = client.post("/crop/classify", json=payload)
    assert resp.status_code == 400
    assert "outside the authoritative" in resp.json()["detail"].lower()

def test_22_crop_classify_21_feature_payload():
    # Native 21-feature payload
    payload = {
        "features": {
            "Blue_B02": 0.08, "Green_B03": 0.12, "Red_B04": 0.09, "NIR_B08": 0.45, "SWIR1_B11": 0.18,
            "NDVI_Rabi": 0.66, "NDWI_McFeeters": -0.58, "NDMI_Moisture": 0.42, "EVI_Rabi": 0.62,
            "Delta_NDVI_Kharif_Rabi": 0.10,
            "NDVI_Seasonal_Min": 0.20, "NDVI_Seasonal_Max": 0.70, "NDVI_Seasonal_Amplitude": 0.50,
            "NDMI_Seasonal_Mean": 0.35, "EVI_Temporal_Change": 0.08,
            "NDBI_Rabi": -0.42, "BSI_Rabi": -0.28, "MNDWI_Rabi": -0.20,
            "NDVI_Seasonal_Std": 0.18, "NDWI_Seasonal_Max": -0.15, "NDMI_Seasonal_Min": 0.10
        }
    }
    resp = client.post("/crop/classify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["predicted_class_name"] in ["Cropland", "Tree_Cover", "Permanent_Water", "Built_Up"]
    assert 0.0 <= data["confidence"] <= 1.0

def test_23_crop_classify_15_feature_payload():
    # Standard 15-feature multi-temporal payload
    payload = {
        "features": {
            "Blue_B02": 0.08, "Green_B03": 0.12, "Red_B04": 0.09, "NIR_B08": 0.45, "SWIR1_B11": 0.18,
            "NDVI_Rabi": 0.66, "NDWI_McFeeters": -0.58, "NDMI_Moisture": 0.42, "EVI_Rabi": 0.62,
            "Delta_NDVI_Kharif_Rabi": 0.10,
            "NDVI_Seasonal_Min": 0.20, "NDVI_Seasonal_Max": 0.70, "NDVI_Seasonal_Amplitude": 0.50,
            "NDMI_Seasonal_Mean": 0.35, "EVI_Temporal_Change": 0.08
        }
    }
    resp = client.post("/crop/classify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["predicted_class_name"] in ["Cropland", "Tree_Cover", "Permanent_Water", "Built_Up"]

def test_24_crop_classify_single_date_rejection():
    # 5 single-date raw bands without multi-temporal features
    payload = {
        "features": {
            "Blue_B02": 0.12, "Green_B03": 0.16, "Red_B04": 0.14, "NIR_B08": 0.38, "SWIR1_B11": 0.22
        }
    }
    resp = client.post("/crop/classify", json=payload)
    assert resp.status_code in [400, 422]
    assert "missing required features" in resp.json()["detail"].lower()

def run_all_tests():
    print("=" * 70)
    print(" RUNNING EXPANDED FASTAPI TEST SUITE (24 TESTS)")
    print("=" * 70)
    tests = [
        test_01_health_endpoint,
        test_02_satellite_metadata_catalog,
        test_03_vegetation_indices_default,
        test_04_vegetation_indices_valid_date,
        test_05_vegetation_indices_invalid_date_rejection,
        test_06_vegetation_timeseries_structure,
        test_07_vegetation_timeseries_trends,
        test_08_vegetation_analyze_valid_coordinate,
        test_09_vegetation_analyze_out_of_bounds_north,
        test_10_vegetation_analyze_out_of_bounds_west,
        test_11_vegetation_analyze_invalid_target_date,
        test_12_crop_classify_empty_payload_rejection,
        test_12b_crop_classify_demo_endpoint,
        test_13_crop_classify_cropland_signature,
        test_14_crop_classify_water_signature,
        test_15_crop_classify_missing_feature_rejection,
        test_16_crop_classify_invalid_type_rejection,
        test_17_maps_available_catalog,
        test_18_study_area_geojson_topology,
        test_19_vegetation_analyze_inside_bbox_outside_polygon,
        test_20_crop_classify_metadata_provenance,
        test_21_crop_classify_point_in_polygon_rejection,
        test_22_crop_classify_21_feature_payload,
        test_23_crop_classify_15_feature_payload,
        test_24_crop_classify_single_date_rejection
    ]
    passed = 0
    for t in tests:
        try:
            t()
            passed += 1
            print(f"  [PASS] {t.__name__}")
        except Exception as e:
            print(f"  [FAIL] {t.__name__}: {e}")
            raise e

    print("=" * 70)
    print(f" ALL {passed}/{len(tests)} TESTS PASSED SUCCESSFULLY! (100% PASS RATE)")
    print("=" * 70)

if __name__ == "__main__":
    run_all_tests()
