"""
Field Shift — Experiment: Pure Interior Pixel Sample Weighting on Block A
Evaluates whether weighting pure pixels (2.0x or 3.0x) improves Block B validation performance.
"""

import os
import sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, f1_score, log_loss

from scripts.run_rapid_optimization import extract_enhanced_features

df_samples, feats_15, feats_21, _, _, _, _, _, _ = extract_enhanced_features(5000, 42)

rows = df_samples["row"].values
p40 = np.percentile(rows, 40)
p70 = np.percentile(rows, 70)

mask_train = (rows < p40)
mask_val = (rows >= p40) & (rows < p70)
mask_holdout = (rows >= p70)

X_tr = df_samples.loc[mask_train, feats_21].values
y_tr = df_samples.loc[mask_train, "target"].values
is_pure_tr = df_samples.loc[mask_train, "is_pure"].values

X_v = df_samples.loc[mask_val, feats_21].values
y_v = df_samples.loc[mask_val, "target"].values
is_pure_v = df_samples.loc[mask_val, "is_pure"].values

weights_configs = [
    ("Unweighted (1.0x / 1.0x)", np.ones(len(y_tr))),
    ("Pure 1.5x / Mixed 1.0x", np.where(is_pure_tr, 1.5, 1.0)),
    ("Pure 2.0x / Mixed 1.0x", np.where(is_pure_tr, 2.0, 1.0)),
    ("Pure 3.0x / Mixed 1.0x", np.where(is_pure_tr, 3.0, 1.0)),
    ("Pure Only on Train", None) # Train only on pure pixels
]

print("Evaluating Sample Weighting on Validation Block B:")
for name, sw in weights_configs:
    clf = RandomForestClassifier(n_estimators=250, max_depth=22, min_samples_split=3, min_samples_leaf=1, max_features="sqrt", class_weight="balanced", random_state=42, n_jobs=-1)
    if name == "Pure Only on Train":
        sub_X = X_tr[is_pure_tr]
        sub_y = y_tr[is_pure_tr]
        clf.fit(sub_X, sub_y)
    else:
        clf.fit(X_tr, y_tr, sample_weight=sw)
    
    preds_v = clf.predict(X_v)
    probs_v = clf.predict_proba(X_v)
    acc = accuracy_score(y_v, preds_v)
    bal = balanced_accuracy_score(y_v, preds_v)
    f1 = f1_score(y_v, preds_v, average="macro")
    loss = log_loss(y_v, probs_v)
    
    # Pure vs mixed accuracy on Val Block B
    acc_pure_v = accuracy_score(y_v[is_pure_v], preds_v[is_pure_v])
    acc_mixed_v = accuracy_score(y_v[~is_pure_v], preds_v[~is_pure_v])
    
    print(f"[{name:<26}] All Val Acc: {acc*100:5.2f}% | Pure Val Acc: {acc_pure_v*100:5.2f}% | Mixed Val: {acc_mixed_v*100:5.2f}% | Macro-F1: {f1:.4f} | Loss: {loss:.4f}")
