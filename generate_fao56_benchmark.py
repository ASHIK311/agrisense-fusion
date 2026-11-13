"""
Generates reference FAO-56 test vectors using Member 5's Python engine
"""
import sys
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
M5_PHYSICS = os.path.join(BASE_DIR, "research", "member_05_hydrology_physics", "Correction_v2", "src")
sys.path.insert(0, M5_PHYSICS)

from physics.fao56 import calculate_reference_et0

test_cases = [
    {
        "name": "Hot-Dry Pre-Monsoon (Godagari April Extreme)",
        "params": {
            "date_val": "2023-04-15",
            "t_max": 39.5,
            "t_min": 24.0,
            "rs_mj": 22.8,
            "rh_mean": 38.0,
            "wind_speed": 3.2,
            "wind_height_m": 10.0,
            "latitude_deg": 24.469,
            "elevation_m": 28.0
        }
    },
    {
        "name": "Cool-Dry Rabi (Godagari January Wheat/Mustard)",
        "params": {
            "date_val": "2023-01-15",
            "t_max": 23.5,
            "t_min": 11.2,
            "rs_mj": 14.5,
            "rh_mean": 68.0,
            "wind_speed": 1.8,
            "wind_height_m": 10.0,
            "latitude_deg": 24.469,
            "elevation_m": 28.0
        }
    },
    {
        "name": "Monsoon Overcast (Godagari July High Humidity)",
        "params": {
            "date_val": "2023-07-20",
            "t_max": 32.0,
            "t_min": 26.5,
            "rs_mj": 12.0,
            "rh_mean": 88.0,
            "wind_speed": 2.5,
            "wind_height_m": 10.0,
            "latitude_deg": 24.469,
            "elevation_m": 28.0
        }
    },
    {
        "name": "Post-Monsoon Aman Heading (Godagari October)",
        "params": {
            "date_val": "2023-10-10",
            "t_max": 31.8,
            "t_min": 22.4,
            "rs_mj": 18.2,
            "rh_mean": 75.0,
            "wind_speed": 1.5,
            "wind_height_m": 10.0,
            "latitude_deg": 24.469,
            "elevation_m": 28.0
        }
    }
]

benchmark = []
for tc in test_cases:
    p = tc["params"]
    res = calculate_reference_et0(
        date_val=p["date_val"],
        t_max=p["t_max"],
        t_min=p["t_min"],
        rs_mj=p["rs_mj"],
        rh_mean=p["rh_mean"],
        wind_speed=p["wind_speed"],
        wind_height_m=p["wind_height_m"],
        latitude_deg=p["latitude_deg"],
        elevation_m=p["elevation_m"]
    )
    benchmark.append({
        "name": tc["name"],
        "input": p,
        "expected_python": {
            "et0": res.et0_mm_day,
            "ra": res.ra_mj_m2_day,
            "rso": res.rso_mj_m2_day,
            "rns": res.rns_mj_m2_day,
            "rnl": res.rnl_mj_m2_day,
            "rn": res.rn_mj_m2_day,
            "es": res.es_kpa,
            "ea": res.ea_kpa,
            "vpd": res.vpd_kpa,
            "u2": res.u2_m_s,
            "delta": res.delta_kpa_c,
            "gamma": res.gamma_kpa_c
        }
    })

out_p = os.path.join(BASE_DIR, "server", "tests", "fao56_benchmark.json")
with open(out_p, "w") as f:
    json.dump(benchmark, f, indent=2)

print(f"Benchmark vectors written to {out_p}")
for b in benchmark:
    print(f"{b['name']} -> ET0 = {b['expected_python']['et0']} mm/day (Rn={b['expected_python']['rn']}, VPD={b['expected_python']['vpd']})")
