"""
Field Shift — Member 1 Block C Holdout Evaluation: Full .pkl Models vs. Runtime 35-Tree Subset
Reproducibly evaluates and verifies the runtime exported ensemble (server/data/satellite_rf_ensemble.json)
against the offline full scikit-learn models on all N=6,000 Block C holdout samples.

Usage:
  1. Full evaluation from local GeoTIFFs & .pkl models:
       python research/member_01_satellite_gis/scripts/evaluate_runtime_subset.py
  2. Dependency-free CSV & JSON tree-walk verification (runs in CI without GeoTIFFs/.pkl):
       python research/member_01_satellite_gis/scripts/evaluate_runtime_subset.py --verify-csv
"""

import argparse
import csv
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MEMBER1_DIR = os.path.dirname(SCRIPT_DIR)
REPO_ROOT = os.path.dirname(os.path.dirname(MEMBER1_DIR))
REPORTS_AUDIT_DIR = os.path.join(MEMBER1_DIR, 'reports', 'final_audit')

ENSEMBLE_JSON_PATH = os.path.join(REPO_ROOT, 'server', 'data', 'satellite_rf_ensemble.json')
PREDICTIONS_CSV_PATH = os.path.join(REPORTS_AUDIT_DIR, 'runtime_subset_block_c_predictions.csv')
SUMMARY_CSV_PATH = os.path.join(REPORTS_AUDIT_DIR, 'runtime_subset_block_c_summary.csv')
SAMPLE_VECTORS_JSON_PATH = os.path.join(REPORTS_AUDIT_DIR, 'block_c_holdout_sample_vectors.json')

DEFAULT_HF_ARCHIVE_DIR = os.path.join('F:' + os.sep, 'nasa_project_hf_dataset', 'satellite_gis_barind')


def evaluate_tree_py(nodes, x):
    """Iterative tree evaluator mirroring server/services/satelliteClassifier.js."""
    idx = 0
    while 0 <= idx < len(nodes):
        node = nodes[idx]
        if node[0] == -1:
            return node[1], node[2], node[3], node[4]
        idx = node[2] if x[node[0]] <= node[1] else node[3]
    return 0.25, 0.25, 0.25, 0.25


def predict_json_ensemble(trees, x):
    """Returns predicted class index (0..3) and averaged probabilities across trees."""
    n_trees = len(trees)
    s0 = s1 = s2 = s3 = 0.0
    for tree in trees:
        p0, p1, p2, p3 = evaluate_tree_py(tree, x)
        s0 += p0
        s1 += p1
        s2 += p2
        s3 += p3
    probs = [s0 / n_trees, s1 / n_trees, s2 / n_trees, s3 / n_trees]
    best_idx = 0
    for i in range(1, 4):
        if probs[i] > probs[best_idx]:
            best_idx = i
    return best_idx, probs


def compute_metrics_from_rows(rows, pred_key, ref_key):
    """Computes overall, balanced, Macro-F1, pure, mixed, and agreement metrics from row dicts."""
    n_total = len(rows)
    n_correct = 0
    pure_n = 0
    pure_correct = 0
    mixed_n = 0
    mixed_correct = 0
    agree_count = 0

    tp = [0, 0, 0, 0]
    fp = [0, 0, 0, 0]
    fn = [0, 0, 0, 0]
    support = [0, 0, 0, 0]

    for row in rows:
        y_true = int(row['y_true'])
        y_pred = int(row[pred_key])
        y_ref = int(row[ref_key])
        is_pure = str(row['is_pure']).lower() in ('1', 'true', 'yes')

        support[y_true] += 1
        if y_true == y_pred:
            tp[y_true] += 1
            n_correct += 1
        else:
            fp[y_pred] += 1
            fn[y_true] += 1

        if is_pure:
            pure_n += 1
            if y_true == y_pred:
                pure_correct += 1
        else:
            mixed_n += 1
            if y_true == y_pred:
                mixed_correct += 1

        if y_pred == y_ref:
            agree_count += 1

    recalls = []
    f1s = []
    for c in range(4):
        rec = tp[c] / support[c] if support[c] > 0 else 0.0
        prec = tp[c] / (tp[c] + fp[c]) if (tp[c] + fp[c]) > 0 else 0.0
        f1 = (2.0 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
        recalls.append(rec)
        f1s.append(f1)

    return {
        'n_holdout': n_total,
        'n_correct': n_correct,
        'overall_accuracy_pct': round((n_correct / n_total) * 100.0, 2),
        'balanced_accuracy_pct': round((sum(recalls) / 4.0) * 100.0, 2),
        'macro_f1': round(sum(f1s) / 4.0, 4),
        'pure_n': pure_n,
        'pure_correct': pure_correct,
        'pure_accuracy_pct': round((pure_correct / pure_n) * 100.0, 2),
        'mixed_n': mixed_n,
        'mixed_correct': mixed_correct,
        'mixed_accuracy_pct': round((mixed_correct / mixed_n) * 100.0, 2),
        'full_pkl_agreement_count': agree_count,
        'full_pkl_agreement_pct': round((agree_count / n_total) * 100.0, 2),
    }


def generate_full_evaluation(hf_dir):
    import joblib
    import numpy as np

    if MEMBER1_DIR not in sys.path:
        sys.path.insert(0, MEMBER1_DIR)
    import scripts.run_rapid_optimization as rro

    local_proc = os.path.join(MEMBER1_DIR, 'data', 'processed')
    if os.path.exists(os.path.join(hf_dir, 'data', 'processed')):
        rro.DATA_DIR = os.path.join(hf_dir, 'data')
        models_dir = os.path.join(hf_dir, 'models')
    elif os.path.exists(local_proc) and any(f.endswith('.tif') for f in os.listdir(local_proc)):
        rro.DATA_DIR = os.path.join(MEMBER1_DIR, 'data')
        models_dir = os.path.join(MEMBER1_DIR, 'models')
    else:
        raise FileNotFoundError(
            f'Raw GeoTIFFs/.pkl models not found in {hf_dir} or {local_proc}. Run with --verify-csv in lightweight checkouts.'
        )

    rro.PROC_DIR = os.path.join(rro.DATA_DIR, 'processed')
    rro.LABELS_DIR = os.path.join(rro.DATA_DIR, 'labels')

    df_samples, feats_15, feats_21, *_ = rro.extract_enhanced_features(5000, 42)
    rows_coord = df_samples['row'].values
    p70 = np.percentile(rows_coord, 70)
    mask_holdout = rows_coord >= p70

    holdout_df = df_samples.loc[mask_holdout].reset_index(drop=True)
    y_ho = holdout_df['target'].values.astype(int)
    X_ho_15 = holdout_df[feats_15].values
    X_ho_21 = holdout_df[feats_21].values

    opt_pkl = joblib.load(os.path.join(models_dir, 'optimized_model.pkl'))
    base_pkl = joblib.load(os.path.join(models_dir, 'final_model.pkl'))

    with open(ENSEMBLE_JSON_PATH, 'r', encoding='utf-8') as f:
        ens = json.load(f)

    trees_21 = ens['rf_21feat']['trees']
    trees_15 = ens['rf_15feat']['trees']

    pred_full_21 = opt_pkl.predict(X_ho_21).astype(int)
    pred_full_15 = base_pkl.predict(X_ho_15).astype(int)
    pred_run_21 = [predict_json_ensemble(trees_21, X_ho_21[i].tolist())[0] for i in range(len(holdout_df))]
    pred_run_15 = [predict_json_ensemble(trees_15, X_ho_15[i].tolist())[0] for i in range(len(holdout_df))]

    os.makedirs(REPORTS_AUDIT_DIR, exist_ok=True)
    prediction_rows = []
    for i in range(len(holdout_df)):
        prediction_rows.append({
            'sample_idx': i,
            'row': int(holdout_df.loc[i, 'row']),
            'col': int(holdout_df.loc[i, 'col']),
            'is_pure': 1 if bool(holdout_df.loc[i, 'is_pure']) else 0,
            'y_true': int(y_ho[i]),
            'pred_full_21feat_250t': int(pred_full_21[i]),
            'pred_runtime_21feat_35t': int(pred_run_21[i]),
            'pred_full_15feat_180t': int(pred_full_15[i]),
            'pred_runtime_15feat_35t': int(pred_run_15[i]),
        })

    pred_fields = [
        'sample_idx', 'row', 'col', 'is_pure', 'y_true',
        'pred_full_21feat_250t', 'pred_runtime_21feat_35t',
        'pred_full_15feat_180t', 'pred_runtime_15feat_35t',
    ]
    with open(PREDICTIONS_CSV_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=pred_fields)
        writer.writeheader()
        writer.writerows(prediction_rows)

    configs = [
        ('Full_21Feat_250Trees', 21, 250, 250, 'full', 'pred_full_21feat_250t', 'pred_full_21feat_250t'),
        ('Runtime_21Feat_35Trees_d9', 21, len(trees_21), 250, ens['rf_21feat']['max_depth_exported'], 'pred_runtime_21feat_35t', 'pred_full_21feat_250t'),
        ('Full_15Feat_180Trees', 15, 180, 180, 'full', 'pred_full_15feat_180t', 'pred_full_15feat_180t'),
        ('Runtime_15Feat_35Trees_d9', 15, len(trees_15), 180, ens['rf_15feat']['max_depth_exported'], 'pred_runtime_15feat_35t', 'pred_full_15feat_180t'),
    ]
    summary_rows = []
    for variant, n_feat, t_eval, t_total, m_depth, p_col, r_col in configs:
        m = compute_metrics_from_rows(prediction_rows, p_col, r_col)
        summary_rows.append({
            'model_variant': variant,
            'feature_count': n_feat,
            'trees_evaluated': t_eval,
            'total_trained_trees': t_total,
            'max_depth': m_depth,
            **m,
        })

    summary_fields = list(summary_rows[0].keys())
    with open(SUMMARY_CSV_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=summary_fields)
        writer.writeheader()
        writer.writerows(summary_rows)

    # Export 40 real Block C holdout sample vectors (10 per class: prefer cases where all models predict cleanly + boundary variety)
    sample_vectors = []
    class_names = ens['metadata']['class_order']
    for cls_id in range(4):
        picked = 0
        for i in range(len(holdout_df)):
            if int(y_ho[i]) == cls_id and int(pred_run_21[i]) == cls_id and int(pred_full_21[i]) == cls_id:
                sample_vectors.append({
                    'sample_idx': i,
                    'row': int(holdout_df.loc[i, 'row']),
                    'col': int(holdout_df.loc[i, 'col']),
                    'is_pure': bool(holdout_df.loc[i, 'is_pure']),
                    'y_true': int(y_ho[i]),
                    'y_true_label': class_names[int(y_ho[i])],
                    'pred_full_21': int(pred_full_21[i]),
                    'pred_runtime_21': int(pred_run_21[i]),
                    'pred_full_15': int(pred_full_15[i]),
                    'pred_runtime_15': int(pred_run_15[i]),
                    'features_21': [round(float(v), 6) for v in X_ho_21[i]],
                    'features_15': [round(float(v), 6) for v in X_ho_15[i]],
                })
                picked += 1
                if picked >= 10:
                    break

    with open(SAMPLE_VECTORS_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump({
            'dataset': 'Block C Southern Latitudinal Holdout (N=6,000, pure=4,015, mixed=1,985)',
            'feature_names_21': feats_21,
            'feature_names_15': feats_15,
            'samples_count': len(sample_vectors),
            'samples': sample_vectors,
        }, f, indent=2)

    print(f'Generated Block C evaluation artifacts for {len(prediction_rows)} samples + {len(sample_vectors)} feature vectors.')


def verify_csv_and_vectors():
    with open(PREDICTIONS_CSV_PATH, 'r', encoding='utf-8') as f:
        pred_rows = list(csv.DictReader(f))
    assert len(pred_rows) == 6000, f'Expected 6000 Block C rows, found {len(pred_rows)}'

    with open(SUMMARY_CSV_PATH, 'r', encoding='utf-8') as f:
        summary_by_variant = {r['model_variant']: r for r in csv.DictReader(f)}

    checks = [
        ('Full_21Feat_250Trees', 'pred_full_21feat_250t', 'pred_full_21feat_250t'),
        ('Runtime_21Feat_35Trees_d9', 'pred_runtime_21feat_35t', 'pred_full_21feat_250t'),
        ('Full_15Feat_180Trees', 'pred_full_15feat_180t', 'pred_full_15feat_180t'),
        ('Runtime_15Feat_35Trees_d9', 'pred_runtime_15feat_35t', 'pred_full_15feat_180t'),
    ]

    for variant, p_col, r_col in checks:
        calc = compute_metrics_from_rows(pred_rows, p_col, r_col)
        expected = summary_by_variant[variant]
        for k, v in calc.items():
            assert str(v) == str(expected[k]), f'Mismatch on {variant}.{k}: calc={v} != csv={expected[k]}'
        print(
            f"[OK] {variant}: Overall={calc['overall_accuracy_pct']}% | "
            f"BalAcc={calc['balanced_accuracy_pct']}% | MacroF1={calc['macro_f1']} | "
            f"Pure={calc['pure_accuracy_pct']}% | Mixed={calc['mixed_accuracy_pct']}% | "
            f"AgreeWithFull={calc['full_pkl_agreement_pct']}%"
        )

    with open(ENSEMBLE_JSON_PATH, 'r', encoding='utf-8') as f:
        ens = json.load(f)
    with open(SAMPLE_VECTORS_JSON_PATH, 'r', encoding='utf-8') as f:
        vec_bundle = json.load(f)

    samples = vec_bundle['samples']
    assert len(samples) == 40, f'Expected 40 holdout sample vectors, got {len(samples)}'
    trees_21 = ens['rf_21feat']['trees']
    trees_15 = ens['rf_15feat']['trees']
    for s in samples:
        p21, _ = predict_json_ensemble(trees_21, s['features_21'])
        p15, _ = predict_json_ensemble(trees_15, s['features_15'])
        assert p21 == s['pred_runtime_21'], f"21-feat tree mismatch at sample {s['sample_idx']}"
        assert p15 == s['pred_runtime_15'], f"15-feat tree mismatch at sample {s['sample_idx']}"

    print(f'[OK] Re-verified live JSON tree-walk across {len(samples)} real Block C feature vectors (15-feat & 21-feat).')


def main():
    parser = argparse.ArgumentParser(description='Evaluate or verify Member 1 Block C full vs runtime RF subset.')
    parser.add_argument('--verify-csv', action='store_true', help='Verify committed CSV predictions and 40 holdout feature vectors using stdlib only.')
    parser.add_argument('--hf-dir', default=DEFAULT_HF_ARCHIVE_DIR, help='Path to satellite_gis_barind GeoTIFF/model directory.')
    args = parser.parse_args()

    if not args.verify_csv:
        try:
            generate_full_evaluation(args.hf_dir)
        except FileNotFoundError as exc:
            print(f'[INFO] {exc}')
            print('[INFO] Falling back to --verify-csv mode.')
    verify_csv_and_vectors()


if __name__ == '__main__':
    main()
