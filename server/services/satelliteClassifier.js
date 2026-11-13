/**
 * AgriSense Fusion - Real Random Forest Ensemble Inference & Sentinel-2 Catalog Service (Member 1)
 * Evaluates serialized scikit-learn decision-tree ensembles exported from
 * final_model.pkl (15-feature RF) and optimized_model.pkl (21-feature RF)
 * directly in Node.js without heuristic if-else fallbacks.
 */

const fs = require('fs');
const path = require('path');

const ENSEMBLE_PATH = path.join(__dirname, '..', 'data', 'satellite_rf_ensemble.json');
const SCENES_CATALOG_PATH = path.join(
  __dirname,
  '..',
  '..',
  'research',
  'member_01_satellite_gis',
  'data',
  'metadata',
  'sentinel2_scenes_catalog.csv'
);
const PREDICTIONS_CSV_PATH = path.join(
  __dirname,
  '..',
  '..',
  'research',
  'member_01_satellite_gis',
  'reports',
  'final_audit',
  'runtime_subset_block_c_predictions.csv'
);

let cachedEnsemble = null;
let cachedCatalog = null;
let cachedHoldoutEval = null;

function getEnsemble() {
  if (!cachedEnsemble) {
    const raw = fs.readFileSync(ENSEMBLE_PATH, 'utf-8');
    cachedEnsemble = JSON.parse(raw);
  }
  return cachedEnsemble;
}

/**
 * Computes concurrent optical/SWIR spectral indices from the 5 physical bands
 * matching research/member_01_satellite_gis/models/predict.py.
 */
function deriveConcurrentIndices(b2, b3, b4, b8, b11) {
  const safeDiv = (num, den) => (Math.abs(den) > 1e-7 ? num / den : 0);
  const ndvi = safeDiv(b8 - b4, b8 + b4);
  const ndwi = safeDiv(b3 - b8, b3 + b8);
  const ndmi = safeDiv(b8 - b11, b8 + b11);
  const eviDenom = b8 + 6.0 * b4 - 7.5 * b2 + 1.0;
  const evi = eviDenom > 0.05 ? (2.5 * (b8 - b4)) / eviDenom : 0.0;
  const ndbi = safeDiv(b11 - b8, b11 + b8);
  const bsiDenom = b11 + b4 + b8 + b2;
  const bsi = bsiDenom > 1e-7 ? (b11 + b4 - (b8 + b2)) / bsiDenom : 0.0;
  const mndwi = safeDiv(b3 - b11, b3 + b11);

  const round4 = (v) => Math.round(v * 10000) / 10000;
  return {
    NDVI_Rabi: round4(ndvi),
    NDWI_McFeeters: round4(ndwi),
    NDMI_Moisture: round4(ndmi),
    EVI_Rabi: round4(evi),
    NDBI_Rabi: round4(ndbi),
    BSI_Rabi: round4(bsi),
    MNDWI_Rabi: round4(mndwi)
  };
}

/**
 * Evaluates a single exported decision tree iteratively.
 * Internal node: [featureIdx, threshold, leftIdx, rightIdx] (featureIdx >= 0)
 * Leaf node: [-1, p0, p1, p2, p3]
 */
function evaluateTree(nodes, x) {
  let idx = 0;
  while (idx >= 0 && idx < nodes.length) {
    const node = nodes[idx];
    if (node[0] === -1) {
      return [node[1], node[2], node[3], node[4]];
    }
    const featIdx = node[0];
    const threshold = node[1];
    idx = x[featIdx] <= threshold ? node[2] : node[3];
  }
  return [0.25, 0.25, 0.25, 0.25];
}

/**
 * Classifies a 15-feature or 21-feature Sentinel-2 vector using the exported
 * Member 1 Random Forest decision-tree ensemble.
 */
function classifyFeatures(features) {
  if (!Array.isArray(features) || (features.length !== 15 && features.length !== 21)) {
    throw new Error('Feature vector must contain exactly 15 or 21 numeric values.');
  }

  const numeric = features.map((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) {
      throw new Error('All feature values must be finite numbers.');
    }
    return n;
  });

  const ensemble = getEnsemble();
  const classOrder = ensemble.metadata?.class_order || [
    'Cropland',
    'Tree_Cover',
    'Permanent_Water',
    'Built_Up'
  ];

  const spec = numeric.length === 21 ? ensemble.rf_21feat : ensemble.rf_15feat;
  const trees = spec.trees || [];
  const treeCount = trees.length;
  const sumProbs = [0, 0, 0, 0];

  for (let i = 0; i < treeCount; i += 1) {
    const leaf = evaluateTree(trees[i], numeric);
    sumProbs[0] += leaf[0];
    sumProbs[1] += leaf[1];
    sumProbs[2] += leaf[2];
    sumProbs[3] += leaf[3];
  }

  const avgProbs = sumProbs.map((s) => (treeCount > 0 ? s / treeCount : 0.25));
  let bestIdx = 0;
  for (let i = 1; i < avgProbs.length; i += 1) {
    if (avgProbs[i] > avgProbs[bestIdx]) {
      bestIdx = i;
    }
  }

  const classProbabilities = {};
  for (let i = 0; i < classOrder.length; i += 1) {
    classProbabilities[classOrder[i]] = Math.round(avgProbs[i] * 10000) / 10000;
  }

  const evalStats = getRuntimeHoldoutEvaluation();
  const is21 = numeric.length === 21;
  const runtimeKey = is21 ? 'runtime_21feat' : 'runtime_15feat';
  const fullKey = is21 ? 'full_21feat' : 'full_15feat';
  const rMetrics = evalStats?.[runtimeKey] || null;
  const fMetrics = evalStats?.[fullKey] || null;

  return {
    class_id: bestIdx,
    class_label: classOrder[bestIdx],
    confidence: classProbabilities[classOrder[bestIdx]],
    class_probabilities: classProbabilities,
    trees_evaluated: treeCount,
    total_trained_trees: spec.total_trained_trees,
    max_depth_exported: spec.max_depth_exported,
    model_name: spec.model_name,
    source_artifact: spec.source_artifact,
    feature_count: spec.feature_count,
    runtime_subset_metrics: rMetrics
      ? {
          n_holdout: rMetrics.n_holdout,
          n_correct: rMetrics.n_correct,
          block_c_overall_accuracy: rMetrics.block_c_overall_accuracy,
          block_c_balanced_accuracy: rMetrics.block_c_balanced_accuracy,
          block_c_macro_f1: rMetrics.block_c_macro_f1,
          block_c_pure_interior_accuracy: rMetrics.block_c_pure_interior_accuracy,
          block_c_mixed_boundary_accuracy: rMetrics.block_c_mixed_boundary_accuracy,
          agreement_with_full_pkl_count: rMetrics.agreement_with_full_pkl_count,
          agreement_with_full_pkl_pct: rMetrics.agreement_with_full_pkl_pct,
          computed_from_csv: 'research/member_01_satellite_gis/reports/final_audit/runtime_subset_block_c_predictions.csv'
        }
      : null,
    offline_full_model_metrics: fMetrics
      ? {
          total_trees: spec.total_trained_trees,
          n_holdout: fMetrics.n_holdout,
          n_correct: fMetrics.n_correct,
          block_c_overall_accuracy: fMetrics.block_c_overall_accuracy,
          block_c_balanced_accuracy: fMetrics.block_c_balanced_accuracy,
          block_c_macro_f1: fMetrics.block_c_macro_f1,
          block_c_pure_interior_accuracy: fMetrics.block_c_pure_interior_accuracy,
          block_c_mixed_boundary_accuracy: fMetrics.block_c_mixed_boundary_accuracy,
          computed_from_csv: 'research/member_01_satellite_gis/reports/final_audit/runtime_subset_block_c_predictions.csv'
        }
      : null,
    derived_indices: deriveConcurrentIndices(numeric[0], numeric[1], numeric[2], numeric[3], numeric[4])
  };
}

function computeHoldoutMetrics(rows, predColIdx, refColIdx, yTrueIdx, isPureIdx) {
  const round2 = (v) => Math.round(v * 100) / 100;
  const round4 = (v) => Math.round(v * 10000) / 10000;
  const nTotal = rows.length;
  let nCorrect = 0;
  let pureN = 0;
  let pureCorrect = 0;
  let mixedN = 0;
  let mixedCorrect = 0;
  let agreeCount = 0;

  const tp = [0, 0, 0, 0];
  const fp = [0, 0, 0, 0];
  const support = [0, 0, 0, 0];

  for (let i = 0; i < nTotal; i += 1) {
    const r = rows[i];
    const yTrue = r[yTrueIdx];
    const yPred = r[predColIdx];
    const yRef = r[refColIdx];
    const isPure = r[isPureIdx] === 1;

    support[yTrue] += 1;
    if (yTrue === yPred) {
      tp[yTrue] += 1;
      nCorrect += 1;
    } else {
      fp[yPred] += 1;
    }

    if (isPure) {
      pureN += 1;
      if (yTrue === yPred) pureCorrect += 1;
    } else {
      mixedN += 1;
      if (yTrue === yPred) mixedCorrect += 1;
    }

    if (yPred === yRef) agreeCount += 1;
  }

  let recallSum = 0;
  let f1Sum = 0;
  for (let c = 0; c < 4; c += 1) {
    const rec = support[c] > 0 ? tp[c] / support[c] : 0;
    const prec = tp[c] + fp[c] > 0 ? tp[c] / (tp[c] + fp[c]) : 0;
    const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
    recallSum += rec;
    f1Sum += f1;
  }

  return {
    n_holdout: nTotal,
    n_correct: nCorrect,
    block_c_overall_accuracy: round2((nCorrect / nTotal) * 100),
    block_c_balanced_accuracy: round2((recallSum / 4) * 100),
    block_c_macro_f1: round4(f1Sum / 4),
    pure_n: pureN,
    pure_correct: pureCorrect,
    block_c_pure_interior_accuracy: round2((pureCorrect / pureN) * 100),
    mixed_n: mixedN,
    mixed_correct: mixedCorrect,
    block_c_mixed_boundary_accuracy: round2((mixedCorrect / mixedN) * 100),
    agreement_with_full_pkl_count: agreeCount,
    agreement_with_full_pkl_pct: round2((agreeCount / nTotal) * 100)
  };
}

/**
 * Dynamically computes full-model vs. 35-tree runtime subset holdout metrics
 * directly from the committed 6,000-row Block C evaluation CSV.
 */
function getRuntimeHoldoutEvaluation() {
  if (cachedHoldoutEval) return cachedHoldoutEval;
  if (!fs.existsSync(PREDICTIONS_CSV_PATH)) return null;

  const content = fs.readFileSync(PREDICTIONS_CSV_PATH, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return null;

  const headers = lines[0].split(',').map((h) => h.trim());
  const idxIsPure = headers.indexOf('is_pure');
  const idxYTrue = headers.indexOf('y_true');
  const idxFull21 = headers.indexOf('pred_full_21feat_250t');
  const idxRun21 = headers.indexOf('pred_runtime_21feat_35t');
  const idxFull15 = headers.indexOf('pred_full_15feat_180t');
  const idxRun15 = headers.indexOf('pred_runtime_15feat_35t');

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((v) => parseInt(v, 10));
    if (cols.length >= 9 && !Number.isNaN(cols[idxYTrue])) {
      rows.push(cols);
    }
  }
  if (rows.length === 0) return null;

  const ensemble = getEnsemble();
  cachedHoldoutEval = {
    source_csv: 'research/member_01_satellite_gis/reports/final_audit/runtime_subset_block_c_predictions.csv',
    summary_csv: 'research/member_01_satellite_gis/reports/final_audit/runtime_subset_block_c_summary.csv',
    n_holdout: rows.length,
    full_21feat: {
      total_trained_trees: ensemble.rf_21feat?.total_trained_trees || 250,
      ...computeHoldoutMetrics(rows, idxFull21, idxFull21, idxYTrue, idxIsPure)
    },
    runtime_21feat: {
      trees_exported: ensemble.rf_21feat?.trees_exported || 35,
      total_trained_trees: ensemble.rf_21feat?.total_trained_trees || 250,
      max_depth_exported: ensemble.rf_21feat?.max_depth_exported || 9,
      ...computeHoldoutMetrics(rows, idxRun21, idxFull21, idxYTrue, idxIsPure)
    },
    full_15feat: {
      total_trained_trees: ensemble.rf_15feat?.total_trained_trees || 180,
      ...computeHoldoutMetrics(rows, idxFull15, idxFull15, idxYTrue, idxIsPure)
    },
    runtime_15feat: {
      trees_exported: ensemble.rf_15feat?.trees_exported || 35,
      total_trained_trees: ensemble.rf_15feat?.total_trained_trees || 180,
      max_depth_exported: ensemble.rf_15feat?.max_depth_exported || 9,
      ...computeHoldoutMetrics(rows, idxRun15, idxFull15, idxYTrue, idxIsPure)
    }
  };
  return cachedHoldoutEval;
}

function mapBangladeshSeason(monthNum) {
  if (monthNum === 11 || monthNum === 12) return 'Rabi Sowing / Early Vegetative';
  if (monthNum === 1 || monthNum === 2) return 'Rabi Peak Vegetative & Harvest';
  if (monthNum === 3) return 'Pre-Kharif-1 Transition / Summer Heat';
  if (monthNum === 4 || monthNum === 5) return 'Kharif-1 (Aus / High Temperature)';
  if (monthNum >= 6 && monthNum <= 9) return 'Kharif-2 (Aman Monsoon Peak)';
  return 'Post-Monsoon / Aman Ripening';
}

/**
 * Loads real Sentinel-2 L2A scene metadata from Member 1's 407-scene catalog CSV.
 */
function loadSentinel2ScenesCatalog({ limit = 12, tileId = null, maxCloudPct = null } = {}) {
  if (!cachedCatalog) {
    if (!fs.existsSync(SCENES_CATALOG_PATH)) {
      cachedCatalog = [];
    } else {
      const content = fs.readFileSync(SCENES_CATALOG_PATH, 'utf-8');
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        cachedCatalog = [];
      } else {
        const headers = lines[0].split(',').map((h) => h.trim());
        const idxSceneId = headers.indexOf('scene_id');
        const idxPlatform = headers.indexOf('platform');
        const idxDate = headers.indexOf('date');
        const idxMonth = headers.indexOf('month');
        const idxCloud = headers.indexOf('cloud_cover_pct');
        const idxTile = headers.indexOf('tile_id');
        const idxBaseline = headers.indexOf('processing_baseline');

        const parsed = [];
        for (let i = 1; i < lines.length; i += 1) {
          const cols = lines[i].split(',');
          if (cols.length < 8) continue;
          const monthNum = parseInt(cols[idxMonth], 10) || 1;
          const cloudPct = parseFloat(cols[idxCloud]);
          parsed.push({
            scene_id: cols[idxSceneId],
            platform: cols[idxPlatform] || 'Sentinel-2',
            date: cols[idxDate],
            cloud_pct: Number.isFinite(cloudPct) ? Math.round(cloudPct * 100) / 100 : null,
            tile_id: cols[idxTile] || null,
            processing_baseline: cols[idxBaseline] || null,
            season: mapBangladeshSeason(monthNum)
          });
        }
        cachedCatalog = parsed;
      }
    }
  }

  let filtered = cachedCatalog;
  if (tileId) {
    const normalizedTile = String(tileId).trim().toUpperCase();
    filtered = filtered.filter((s) => String(s.tile_id || '').toUpperCase() === normalizedTile);
  }
  if (maxCloudPct !== null && maxCloudPct !== undefined && Number.isFinite(Number(maxCloudPct))) {
    const cap = Number(maxCloudPct);
    filtered = filtered.filter((s) => s.cloud_pct !== null && s.cloud_pct <= cap);
  } else {
    // Default view surfaces low-cloud (<15%) passes across the multi-year catalog
    filtered = filtered.filter((s) => s.cloud_pct === null || s.cloud_pct <= 15.0);
  }

  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(200, Number(limit)) : 12;
  return {
    total_catalog_scenes: cachedCatalog.length,
    filtered_count: filtered.length,
    scenes: filtered.slice(0, safeLimit)
  };
}

module.exports = {
  classifyFeatures,
  deriveConcurrentIndices,
  getRuntimeHoldoutEvaluation,
  loadSentinel2ScenesCatalog,
  ENSEMBLE_PATH,
  PREDICTIONS_CSV_PATH,
  SCENES_CATALOG_PATH
};
