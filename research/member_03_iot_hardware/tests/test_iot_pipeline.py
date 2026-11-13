"""
Field Shift - Member 3: Automated IoT & Environmental Pipeline Test Suite
Unit and Integration Tests for Firmware Payloads, Calibration, Data Quality & Schema Integrity
"""

import unittest
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime

M3_ROOT = r"F:\nasa project\Member 3"

class TestIoTPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.sensor_csv = os.path.join(M3_ROOT, "data", "processed", "soil_sensor_dataset.csv")
        cls.smap_csv = os.path.join(M3_ROOT, "data", "processed", "smap_soil_moisture.csv")
        cls.soilgrids_csv = os.path.join(M3_ROOT, "data", "processed", "soilgrids_properties.csv")
        cls.calib_csv = os.path.join(M3_ROOT, "calibration", "calibration_template.csv")

    # TEST 1: Schema Integrity and Mandatory Column Presence
    def test_sensor_dataset_schema(self):
        self.assertTrue(os.path.exists(self.sensor_csv), "Processed sensor dataset missing")
        df = pd.read_csv(self.sensor_csv)
        required_cols = [
            'timestamp_utc', 'device_id', 'sensor_id', 'latitude', 'longitude',
            'site_id', 'depth_cm', 'soil_moisture_raw', 'soil_moisture_vwc',
            'soil_temperature_c', 'air_temperature_c', 'air_humidity_percent',
            'source', 'data_source', 'calibration_status', 'quality_flag', 'is_simulated'
        ]
        for col in required_cols:
            self.assertIn(col, df.columns, f"Mandatory column '{col}' missing from schema")

    # TEST 2: Timestamp ISO 8601 UTC Validation
    def test_timestamp_utc_format(self):
        df = pd.read_csv(self.sensor_csv)
        sample_ts = df['timestamp_utc'].sample(n=50, random_state=42)
        for ts in sample_ts:
            # Must end with Z (UTC) and parse cleanly
            self.assertTrue(ts.endswith('Z'), f"Timestamp {ts} must end with UTC indicator 'Z'")
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            self.assertIsNotNone(dt, f"Failed to parse {ts}")

    # TEST 3: Physical Boundary and Range Constraints
    def test_physical_numeric_ranges(self):
        df = pd.read_csv(self.sensor_csv)

        # Soil moisture VWC: [0.0, 1.0] for valid records
        valid_vwc = df['soil_moisture_vwc'].dropna()
        self.assertTrue((valid_vwc >= 0.0).all() and (valid_vwc <= 1.0).all(),
                        "soil_moisture_vwc contains out-of-bounds values outside [0.0, 1.0]")

        # Soil temperature: [-10.0, 65.0]
        valid_st = df['soil_temperature_c'].dropna()
        self.assertTrue((valid_st >= -10.0).all() and (valid_st <= 65.0).all(),
                        "soil_temperature_c out of realistic soil range [-10C, 65C]")

        # Air temperature: [-20.0, 60.0]
        valid_at = df['air_temperature_c'].dropna()
        self.assertTrue((valid_at >= -20.0).all() and (valid_at <= 60.0).all(),
                        "air_temperature_c out of range [-20C, 60C]")

        # Air relative humidity: [0.0, 100.0]
        valid_rh = df['air_humidity_percent'].dropna()
        self.assertTrue((valid_rh >= 0.0).all() and (valid_rh <= 100.0).all(),
                        "air_humidity_percent out of range [0%, 100%]")

        # Battery voltage: [3.0, 4.3]
        valid_batt = df['battery_voltage_v'].dropna()
        self.assertTrue((valid_batt >= 3.0).all() and (valid_batt <= 4.3).all(),
                        "battery_voltage_v out of Li-Ion operational limits [3.0V, 4.3V]")

    # TEST 4: Duplicate Detection and Idempotency
    def test_duplicate_records(self):
        df = pd.read_csv(self.sensor_csv)
        dups = df.duplicated(subset=['device_id', 'timestamp_utc']).sum()
        self.assertEqual(dups, 0, f"Found {dups} duplicate records in sensor stream")

    # TEST 5: Data Source Separation (Strict Simulated Labeling)
    def test_data_source_separation(self):
        df = pd.read_csv(self.sensor_csv)
        # All simulated data must have is_simulated == True
        self.assertTrue(df['is_simulated'].all(), "All records in simulated sensor stream must have is_simulated=True")
        self.assertTrue((df['source'] == 'SIMULATED_TEST_DATA').all(), "source column must clearly identify simulated data")

    # TEST 6: Calibration Model Conversion Fidelity
    def test_calibration_conversion(self):
        df_cal = pd.read_csv(self.calib_csv)
        adc = df_cal['raw_adc_reading_mean'].values
        ref_vwc = df_cal['reference_vwc_fraction'].values

        # Quadratic model: c2*ADC^2 + c1*ADC + c0
        c2 = 3.18255e-08
        c1 = -0.000418
        c0 = 1.0793

        calc_vwc = c2 * (adc ** 2) + c1 * adc + c0
        rmse = np.sqrt(np.mean((ref_vwc - calc_vwc) ** 2))
        self.assertLess(rmse, 0.02, f"Calibration RMSE {rmse:.4f} exceeds 2% VWC tolerance")

    # TEST 7: Sensor Fault Flagging (Handling Nulls without Made-up Values)
    def test_sensor_fault_handling(self):
        df = pd.read_csv(self.sensor_csv)
        fault_records = df[df['quality_flag'] != 'valid']
        self.assertGreater(len(fault_records), 0, "No fault records found for testing")

        # Verify that temp disconnected records have null soil_temperature_c
        temp_faults = df[df['quality_flag'] == 'sensor_fault_temp_disconnected']
        self.assertTrue(temp_faults['soil_temperature_c'].isnull().all(),
                        "Disconnected temperature sensor must record null, not a fabricated number")

        # Verify that saturated moisture records have null soil_moisture_vwc
        moist_faults = df[df['quality_flag'] == 'sensor_fault_moisture_saturation']
        self.assertTrue(moist_faults['soil_moisture_vwc'].isnull().all(),
                        "Saturated moisture sensor must record null, not a fabricated number")

if __name__ == "__main__":
    unittest.main()
