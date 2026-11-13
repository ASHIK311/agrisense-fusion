"""
Field Shift - Member 2 Standalone Inference Engine
Weather Risk Prediction Module
"""

import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb

MODEL_JSON_PATH = os.path.join(os.path.dirname(__file__), "drought_heat_model.json")
FEATURE_NAMES = ['t_max', 't_min', 'rainfall', 'humidity', 'wind_speed', 'solar_radiation']

class WeatherRiskPredictor:
    def __init__(self, model_path: str = MODEL_JSON_PATH):
        self.model_path = model_path
        self.booster = None
        self._load_model()
    
    def _load_model(self):
        if os.path.exists(self.model_path):
            self.booster = xgb.Booster()
            self.booster.load_model(self.model_path)
        else:
            self.booster = None
    
    def predict_rule(self, t_max: float, humidity: float, rainfall: float) -> int:
        """
        Deterministic screening rule (100% fidelity to Member 2's ground truth definition)
        """
        return int((t_max >= 35.0) and (humidity <= 50.0) and (rainfall <= 1.0))
    
    def predict(self, weather_data: dict) -> dict:
        """
        Predict acute heat & desiccation risk from daily meteorological variables.
        
        Input dict must contain:
          - t_max (°C)
          - t_min (°C)
          - rainfall (mm/day)
          - humidity (%)
          - wind_speed (m/s)
          - solar_radiation (MJ/m²/day)
        """
        # Validate inputs
        for f in FEATURE_NAMES:
            if f not in weather_data:
                raise ValueError(f"Missing required meteorological parameter: {f}")
        
        t_max = float(weather_data['t_max'])
        t_min = float(weather_data['t_min'])
        rainfall = float(weather_data['rainfall'])
        humidity = float(weather_data['humidity'])
        wind_speed = float(weather_data['wind_speed'])
        solar_radiation = float(weather_data['solar_radiation'])
        
        # Rule prediction
        rule_risk = self.predict_rule(t_max, humidity, rainfall)
        
        # ML model prediction (if JSON model is loaded)
        if self.booster is not None:
            arr = np.array([[t_max, t_min, rainfall, humidity, wind_speed, solar_radiation]])
            dmat = xgb.DMatrix(arr, feature_names=FEATURE_NAMES)
            prob = float(self.booster.predict(dmat)[0])
            ml_risk = int(prob >= 0.5)
        else:
            prob = float(rule_risk)
            ml_risk = rule_risk
        
        return {
            "heat_desiccation_risk": ml_risk,
            "risk_probability": round(prob, 4),
            "rule_evaluation": bool(rule_risk),
            "is_heatwave_temperature": bool(t_max >= 36.0),
            "is_rice_sterility_risk": bool(t_max >= 35.0),
            "is_acute_low_humidity": bool(humidity <= 50.0),
            "daily_rainfall_mm": rainfall,
            "units": {
                "temperature": "Celsius",
                "humidity": "Percentage",
                "rainfall": "mm/day",
                "wind_speed": "m/s",
                "solar_radiation": "MJ/m^2/day"
            }
        }

if __name__ == "__main__":
    predictor = WeatherRiskPredictor()
    
    # Test Normal Day (Winter)
    sample_normal = {
        "t_max": 25.43, "t_min": 8.53, "rainfall": 0.0,
        "humidity": 58.69, "wind_speed": 1.51, "solar_radiation": 14.98
    }
    print("Normal Day Test Result:")
    print(predictor.predict(sample_normal))
    
    # Test Extreme Pre-Monsoon Heatwave Day (April)
    sample_extreme = {
        "t_max": 41.2, "t_min": 24.5, "rainfall": 0.0,
        "humidity": 32.0, "wind_speed": 2.1, "solar_radiation": 24.5
    }
    print("\nExtreme Heat Day Test Result:")
    print(predictor.predict(sample_extreme))
