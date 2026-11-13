import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORTS_DIR = os.path.join(BASE_DIR, "reports")

rows = [
    {
        "model_name": "Baseline ExtraTrees (10 Feat, Unweighted)",
        "feature_architecture": "10 Baseline Spectral & Index Features",
        "evaluation_regime": "Regime A: Untouched South Holdout (Block C, N=6,000)",
        "metric_name": "Holdout Overall Accuracy",
        "reported_value": "68.47%",
        "verified_csv_value": "68.47%",
        "source_file": "reports/validation_regimes_comparison.csv",
        "reconciliation_status": "Verified Exact",
        "scientific_note": "Trained on North Block A (N=7,996) without class_weight parameter. Wilson 95% CI: [67.28%, 69.63%]."
    },
    {
        "model_name": "Baseline ExtraTrees (10 Feat, Balanced Weighted)",
        "feature_architecture": "10 Baseline Spectral & Index Features",
        "evaluation_regime": "Regime A: Untouched South Holdout (Block C, N=6,000)",
        "metric_name": "Holdout Overall Accuracy",
        "reported_value": "75.02%",
        "verified_csv_value": "75.02%",
        "source_file": "reports/updated_model_benchmark.csv",
        "reconciliation_status": "Verified Exact",
        "scientific_note": "Identical samples and partition as 68.47%, but with class_weight='balanced' added to ExtraTreesClassifier (+6.55% gain)."
    },
    {
        "model_name": "Baseline ExtraTrees (10 Feat, 2-Way Median Split)",
        "feature_architecture": "10 Baseline Spectral & Index Features",
        "evaluation_regime": "2-Way Latitudinal Split at Median Row (N=10,000)",
        "metric_name": "Overall Accuracy",
        "reported_value": "79.77%",
        "verified_csv_value": "79.77%",
        "source_file": "reports/validation_regimes_comparison.csv",
        "reconciliation_status": "Verified Exact",
        "scientific_note": "Evaluated on South half (50% test set) trained on North half (50% train set). Different partition geometry than 3-way split."
    },
    {
        "model_name": "Updated ExtraTrees (15 Feat)",
        "feature_architecture": "15 Multi-Temporal Phenology Features",
        "evaluation_regime": "Development Validation Set (Central Block B, N=6,004)",
        "metric_name": "Validation Overall Accuracy",
        "reported_value": "85.81%",
        "verified_csv_value": "85.81%",
        "source_file": "reports/holdout_independence_audit.md",
        "reconciliation_status": "Verified Exact",
        "scientific_note": "Ranked #1 among all 5 architectures on independent Validation Block B; justified model selection for production."
    },
    {
        "model_name": "Updated ExtraTrees (15 Feat)",
        "feature_architecture": "15 Multi-Temporal Phenology Features",
        "evaluation_regime": "Regime A: Untouched South Holdout (Block C, N=6,000)",
        "metric_name": "Holdout Overall Accuracy",
        "reported_value": "83.05%",
        "verified_csv_value": "83.05%",
        "source_file": "reports/updated_model_benchmark.csv",
        "reconciliation_status": "Verified Exact",
        "scientific_note": "Evaluated on frozen South Block C. +8.03% gain over weighted baseline and +14.58% gain over unweighted baseline."
    },
    {
        "model_name": "Updated ExtraTrees (15 Feat)",
        "feature_architecture": "15 Multi-Temporal Phenology Features",
        "evaluation_regime": "Regime B: Representative Real Prevalence (N=10,000)",
        "metric_name": "Operational Overall Accuracy",
        "reported_value": "83.93%",
        "verified_csv_value": "83.93%",
        "source_file": "reports/updated_model_benchmark.csv",
        "reconciliation_status": "Verified Exact",
        "scientific_note": "Weighted by real Godagari prevalence (79.4% Crop, 11.8% Tree, 5.1% Built, 3.7% Water)."
    },
    {
        "model_name": "Updated ExtraTrees (15 Feat)",
        "feature_architecture": "15 Multi-Temporal Phenology Features",
        "evaluation_regime": "Regime B: Representative Real Prevalence (N=10,000)",
        "metric_name": "Operational Cropland Precision",
        "reported_value": "97.84%",
        "verified_csv_value": "97.84%",
        "source_file": "reports/updated_model_benchmark.csv",
        "reconciliation_status": "Verified Exact",
        "scientific_note": "Reliable crop field boundary delineation."
    },
    {
        "model_name": "Updated ExtraTrees (15 Feat)",
        "feature_architecture": "15 Multi-Temporal Phenology Features",
        "evaluation_regime": "Regime B: Representative Real Prevalence (N=10,000)",
        "metric_name": "Operational Tree Cover F1",
        "reported_value": "0.5654",
        "verified_csv_value": "0.5654",
        "source_file": "reports/updated_model_benchmark.csv",
        "reconciliation_status": "Verified Exact",
        "scientific_note": "Improved from 0.4860 (+16.3% relative gain) via NDVI_Seasonal_Min."
    },
    {
        "model_name": "Updated ExtraTrees (15 Feat)",
        "feature_architecture": "15 Multi-Temporal Phenology Features",
        "evaluation_regime": "Regime B: Representative Real Prevalence (N=10,000)",
        "metric_name": "Operational Built-Up F1",
        "reported_value": "0.6560",
        "verified_csv_value": "0.6560",
        "source_file": "reports/updated_model_benchmark.csv",
        "reconciliation_status": "Reconciled & Corrected",
        "scientific_note": "Exact value is 0.6560. Previous executive summary conflated 0.6657 (which was the Random Forest value) with Extra Trees."
    },
    {
        "model_name": "Random Forest (15 Feat)",
        "feature_architecture": "15 Multi-Temporal Phenology Features",
        "evaluation_regime": "Regime A: Untouched South Holdout (Block C, N=6,000)",
        "metric_name": "Holdout Overall Accuracy",
        "reported_value": "85.28%",
        "verified_csv_value": "85.28%",
        "source_file": "reports/updated_model_benchmark.csv",
        "reconciliation_status": "Verified Exact",
        "scientific_note": "Highest raw accuracy on Block C holdout (+10.26% over weighted baseline)."
    },
    {
        "model_name": "Random Forest (15 Feat)",
        "feature_architecture": "15 Multi-Temporal Phenology Features",
        "evaluation_regime": "Regime B: Representative Real Prevalence (N=10,000)",
        "metric_name": "Operational Built-Up F1",
        "reported_value": "0.6657",
        "verified_csv_value": "0.6657",
        "source_file": "reports/updated_model_benchmark.csv",
        "reconciliation_status": "Reconciled & Corrected",
        "scientific_note": "Source of the 0.6657 metric. Correctly attributed to Random Forest."
    }
]

df = pd.DataFrame(rows)
out_csv = os.path.join(REPORTS_DIR, "benchmark_metric_reconciliation.csv")
df.to_csv(out_csv, index=False)
print("Saved benchmark_metric_reconciliation.csv successfully!")
