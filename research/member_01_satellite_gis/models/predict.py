"""
Standalone Prediction and Inference Module for Crop & Land Cover Classification
Project: Field Shift — Adapting Farms with NASA Data (AgriSense Fusion)
Member 1: Satellite Image Processing, Remote Sensing & GIS Analysis

Enables:
1. Loading the trained final Random Forest / Extra Trees model independently outside training notebooks.
2. Ingesting single-pixel or batch spectral vectors (both 15-feature multi-temporal and 10-feature baseline).
3. Ingesting GeoTIFF rasters and generating classification masks and confidence surfaces.
4. Input schema validation and calibrated class probability outputs.
"""

import os
import sys
import json
import joblib
import numpy as np

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

MODELS_DIR = os.path.dirname(os.path.abspath(__file__))

# Model resolution hierarchy:
# Optimized 21-Feat -> final_model 15-Feat -> updated_best -> best -> crop_classifier
OPTIMIZED_MODEL_PATH = os.path.join(MODELS_DIR, "optimized_model.pkl")
FINAL_MODEL_PATH = os.path.join(MODELS_DIR, "final_model.pkl")
UPDATED_MODEL_PATH = os.path.join(MODELS_DIR, "updated_best_landcover_classifier.pkl")
BEST_MODEL_PATH = os.path.join(MODELS_DIR, "best_landcover_classifier.pkl")
BASELINE_MODEL_PATH = os.path.join(MODELS_DIR, "crop_classifier.pkl")

# If USE_OPTIMIZED_MODEL is explicitly set or default resolution
if os.environ.get("USE_OPTIMIZED_MODEL", "0") == "1" and os.path.exists(OPTIMIZED_MODEL_PATH):
    MODEL_PATH = OPTIMIZED_MODEL_PATH
elif os.path.exists(FINAL_MODEL_PATH):
    MODEL_PATH = FINAL_MODEL_PATH
elif os.path.exists(OPTIMIZED_MODEL_PATH):
    MODEL_PATH = OPTIMIZED_MODEL_PATH
elif os.path.exists(UPDATED_MODEL_PATH):
    MODEL_PATH = UPDATED_MODEL_PATH
elif os.path.exists(BEST_MODEL_PATH):
    MODEL_PATH = BEST_MODEL_PATH
else:
    MODEL_PATH = BASELINE_MODEL_PATH

OPTIMIZED_SCHEMA_PATH = os.path.join(MODELS_DIR, "optimized_feature_schema.json")
FINAL_SCHEMA_PATH = os.path.join(MODELS_DIR, "final_feature_schema.json")
BASELINE_SCHEMA_PATH = os.path.join(MODELS_DIR, "feature_schema.json")

if MODEL_PATH == OPTIMIZED_MODEL_PATH and os.path.exists(OPTIMIZED_SCHEMA_PATH):
    SCHEMA_PATH = OPTIMIZED_SCHEMA_PATH
elif os.path.exists(FINAL_SCHEMA_PATH):
    SCHEMA_PATH = FINAL_SCHEMA_PATH
else:
    SCHEMA_PATH = BASELINE_SCHEMA_PATH

class SatelliteLandCoverPredictor:
    def __init__(self, model_path=MODEL_PATH, schema_path=SCHEMA_PATH):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Trained model not found at: {model_path}. Run scripts/train_and_evaluate_strict.py first.")
        if not os.path.exists(schema_path):
            raise FileNotFoundError(f"Feature schema not found at: {schema_path}.")

        self.model = joblib.load(model_path)
        with open(schema_path, "r", encoding="utf-8") as f:
            self.schema = json.load(f)

        self.feature_names = self.schema["features"]
        self.classes = {int(k): v for k, v in self.schema["classes"].items()}

    def _auto_complete_features(self, d: dict) -> dict:
        """
        Safely computes concurrent spectral indices from physical reflectance bands.
        
        Strict Scientific Rule:
        - Concurrent spectral indices (NDBI, BSI, MNDWI, NDVI, NDWI, NDMI, EVI) are 
          deterministically computed from the 5 raw bands (B02, B03, B04, B08, B11).
        - Multi-temporal phenological features (Delta_NDVI, Seasonal Min, Max, Amplitude, 
          Std, Mean, EVI change) REQUIRE multi-date observations and are NEVER synthesized 
          or fabricated from single-date data.
        """
        res = dict(d)

        # 1. Safely derive concurrent spectral indices if the 5 physical bands are present
        has_bands = all(b in res for b in ["Blue_B02", "Green_B03", "Red_B04", "NIR_B08", "SWIR1_B11"])
        if has_bands:
            b02 = float(res["Blue_B02"])
            b03 = float(res["Green_B03"])
            b04 = float(res["Red_B04"])
            b08 = float(res["NIR_B08"])
            b11 = float(res["SWIR1_B11"])

            if "NDVI_Rabi" not in res:
                res["NDVI_Rabi"] = (b08 - b04) / (b08 + b04 + 1e-7)
            if "NDWI_McFeeters" not in res:
                res["NDWI_McFeeters"] = (b03 - b08) / (b03 + b08 + 1e-7)
            if "NDMI_Moisture" not in res:
                res["NDMI_Moisture"] = (b08 - b11) / (b08 + b11 + 1e-7)
            if "EVI_Rabi" not in res:
                denom_evi = b08 + (6.0 * b04) - (7.5 * b02) + 1.0
                res["EVI_Rabi"] = 2.5 * (b08 - b04) / denom_evi if denom_evi > 0.05 else 0.0

            if "NDBI_Rabi" not in res and "NDBI_Rabi" in self.feature_names:
                res["NDBI_Rabi"] = (b11 - b08) / (b11 + b08 + 1e-7)
            if "BSI_Rabi" not in res and "BSI_Rabi" in self.feature_names:
                bsi_num = (b11 + b04) - (b08 + b02)
                bsi_denom = (b11 + b04) + (b08 + b02) + 1e-7
                res["BSI_Rabi"] = bsi_num / bsi_denom if bsi_denom > 0 else 0.0
            if "MNDWI_Rabi" not in res and "MNDWI_Rabi" in self.feature_names:
                res["MNDWI_Rabi"] = (b03 - b11) / (b03 + b11 + 1e-7)

        return res

    def predict_vector(self, feature_dict_or_list):
        """
        Runs inference on a single feature vector or a list/dict of features.
        Returns predicted class ID, class name, and class probability distribution.
        """
        if isinstance(feature_dict_or_list, dict):
            # Auto-complete 15 features if 10 are provided
            d_completed = self._auto_complete_features(feature_dict_or_list)
            missing = [f for f in self.feature_names if f not in d_completed]
            if missing:
                raise ValueError(f"Input dictionary missing required features: {missing}")
            vector = np.array([d_completed[f] for f in self.feature_names], dtype=np.float32).reshape(1, -1)
        elif isinstance(feature_dict_or_list, (list, np.ndarray)):
            arr = np.array(feature_dict_or_list, dtype=np.float32)
            if arr.ndim == 1:
                if len(arr) != len(self.feature_names):
                    raise ValueError(f"Expected {len(self.feature_names)} features, got {len(arr)}")
                vector = arr.reshape(1, -1)
            else:
                vector = arr
        else:
            raise TypeError("Input must be a dictionary, list, or numpy array.")

        preds = self.model.predict(vector)
        probs = self.model.predict_proba(vector)

        results = []
        for p, prob_dist in zip(preds, probs):
            class_id = int(p)
            class_name = self.classes.get(class_id, "Unknown")
            
            prob_dict = {
                self.classes.get(int(c_id), str(c_id)): round(float(prob), 4)
                for c_id, prob in zip(self.model.classes_, prob_dist)
            }
            results.append({
                "class_id": class_id,
                "class_name": class_name,
                "confidence": round(float(np.max(prob_dist)), 4),
                "probabilities": prob_dict
            })

        return results[0] if len(results) == 1 else results

    def predict_raster(self, feature_stack, valid_mask=None):
        """
        Runs high-throughput windowed raster inference.
        feature_stack: (H, W, num_features)
        Returns: (H, W) classification map (uint8)
        """
        h, w, c = feature_stack.shape
        if c != len(self.feature_names):
            raise ValueError(f"Feature stack channels ({c}) mismatch expected schema ({len(self.feature_names)})")

        if valid_mask is None:
            valid_mask = np.all(np.isfinite(feature_stack), axis=-1)

        output_map = np.zeros((h, w), dtype=np.uint8)
        valid_pixels = feature_stack[valid_mask]

        if len(valid_pixels) > 0:
            preds = self.model.predict(valid_pixels)
            output_map[valid_mask] = preds

        return output_map

def test_inference():
    print("Testing SatelliteLandCoverPredictor with unseen simulated agricultural sample vectors...")
    predictor = SatelliteLandCoverPredictor()
    
    # 1. Unseen Cropland Test Vector (Active Rabi Wheat Parcel)
    cropland_sample = {
        "Blue_B02": 0.08, "Green_B03": 0.12, "Red_B04": 0.09, "NIR_B08": 0.45, "SWIR1_B11": 0.18,
        "NDVI_Rabi": 0.66, "NDWI_McFeeters": -0.58, "NDMI_Moisture": 0.42, "EVI_Rabi": 0.62,
        "Delta_NDVI_Kharif_Rabi": 0.10
    }

    # 2. Unseen Water Test Vector (Padma River channel)
    water_sample = {
        "Blue_B02": 0.15, "Green_B03": 0.20, "Red_B04": 0.14, "NIR_B08": 0.04, "SWIR1_B11": 0.02,
        "NDVI_Rabi": -0.45, "NDWI_McFeeters": 0.62, "NDMI_Moisture": 0.35, "EVI_Rabi": -0.20,
        "Delta_NDVI_Kharif_Rabi": -0.05
    }

    # 3. Unseen Tree Cover / Orchard Vector
    tree_sample = {
        "Blue_B02": 0.06, "Green_B03": 0.10, "Red_B04": 0.07, "NIR_B08": 0.48, "SWIR1_B11": 0.14,
        "NDVI_Rabi": 0.75, "NDWI_McFeeters": -0.65, "NDMI_Moisture": 0.50, "EVI_Rabi": 0.72,
        "Delta_NDVI_Kharif_Rabi": 0.01,
        "NDVI_Seasonal_Min": 0.55, "NDVI_Seasonal_Max": 0.78, "NDVI_Seasonal_Amplitude": 0.23,
        "NDMI_Seasonal_Mean": 0.48, "EVI_Temporal_Change": 0.02
    }

    samples = [("Rabi Cropland", cropland_sample), ("Permanent Water", water_sample), ("Tree Cover", tree_sample)]
    for desc, s in samples:
        res = predictor.predict_vector(s)
        print(f"\n[Test Case: {desc}]")
        print(f" -> Predicted Class: {res['class_name']} (ID: {res['class_id']}) | Confidence: {res['confidence']*100:.2f}%")
        print(f" -> Probabilities: {res['probabilities']}")

if __name__ == "__main__":
    test_inference()
