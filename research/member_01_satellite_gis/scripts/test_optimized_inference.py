import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from models.predict import SatelliteLandCoverPredictor

# Test loading baseline model
p_base = SatelliteLandCoverPredictor()
print(f"Loaded Baseline Model: {type(p_base.model).__name__} ({len(p_base.feature_names)} features)")

# Test loading optimized model
opt_model_path = os.path.join(BASE_DIR, "models", "optimized_model.pkl")
opt_schema_path = os.path.join(BASE_DIR, "models", "optimized_feature_schema.json")
p_opt = SatelliteLandCoverPredictor(model_path=opt_model_path, schema_path=opt_schema_path)
print(f"Loaded Optimized Model: {type(p_opt.model).__name__} ({len(p_opt.feature_names)} features)")

# 1. Test Incomplete Temporal Input Rejection
sample_payload_incomplete = {
    "Blue_B02": 0.08, "Green_B03": 0.12, "Red_B04": 0.09, "NIR_B08": 0.45, "SWIR1_B11": 0.18,
    "NDVI_Rabi": 0.66, "NDWI_McFeeters": -0.58, "NDMI_Moisture": 0.42, "EVI_Rabi": 0.62,
    "Delta_NDVI_Kharif_Rabi": 0.10
}
try:
    p_base.predict_vector(sample_payload_incomplete)
    assert False, "Should have rejected incomplete temporal input!"
except ValueError as e:
    print(f"Verified Incomplete Temporal Input Rejection: {e}")

# 2. Test Full 15-Feature Multi-Temporal Payload on Baseline Model
sample_payload_15 = {
    "Blue_B02": 0.08, "Green_B03": 0.12, "Red_B04": 0.09, "NIR_B08": 0.45, "SWIR1_B11": 0.18,
    "NDVI_Rabi": 0.66, "NDWI_McFeeters": -0.58, "NDMI_Moisture": 0.42, "EVI_Rabi": 0.62,
    "Delta_NDVI_Kharif_Rabi": 0.10,
    "NDVI_Seasonal_Min": 0.20, "NDVI_Seasonal_Max": 0.70, "NDVI_Seasonal_Amplitude": 0.50,
    "NDMI_Seasonal_Mean": 0.35, "EVI_Temporal_Change": 0.08
}
res_base = p_base.predict_vector(sample_payload_15)
print(f"Baseline (15 Feat) Prediction: Class={res_base['class_name']} | Conf={res_base['confidence']:.4f}")

# 3. Test Full 21-Feature Enhanced Payload on Optimized Model
sample_payload_21 = dict(sample_payload_15)
sample_payload_21.update({
    "NDBI_Rabi": -0.4286, "BSI_Rabi": -0.3250, "MNDWI_Rabi": -0.2000,
    "NDVI_Seasonal_Std": 0.1820, "NDWI_Seasonal_Max": -0.1500, "NDMI_Seasonal_Min": 0.1200
})
res_opt = p_opt.predict_vector(sample_payload_21)
print(f"Optimized (21 Feat) Prediction: Class={res_opt['class_name']} | Conf={res_opt['confidence']:.4f}")
print("Probabilities:", res_opt["probabilities"])

print("-> ALL INFERENCE TESTS PASSED WITH STRICT SCIENTIFIC GUARDRAILS!")
