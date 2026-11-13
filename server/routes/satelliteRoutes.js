/**
 * AgriSense Fusion - Satellite & GIS Intelligence Routes (Member 1)
 * /api/v1/satellite
 * Discloses spatial validation parameters and crop classification status.
 */

const express = require('express');
const router = express.Router();
const storage = require('../storage/storageService');
const { classifyFeatures, loadSentinel2ScenesCatalog } = require('../services/satelliteClassifier');

// GET /api/v1/satellite/metadata
router.get('/metadata', (req, res) => {
  const metadata = storage.getSatelliteMetadata();
  const perf = metadata?.verified_performance || {};
  res.json({
    success: true,
    metadata: {
      model_name: perf.model_name || 'RandomForest_21Feat_Deep',
      feature_count: perf.feature_count || metadata?.schema?.features?.length || 21,
      spatial_cv_accuracy: perf.spatial_cv_accuracy || '84.63% +/- 3.81%',
      spatial_cv_macro_f1: perf.spatial_cv_macro_f1 || '0.8342 +/- 0.0194',
      spatial_cv_balanced_accuracy: perf.spatial_cv_balanced_accuracy || '84.37% +/- 1.16%',
      block_c_holdout_overall_accuracy: perf.block_c_holdout_overall_accuracy || 85.77,
      block_c_balanced_accuracy: perf.block_c_balanced_accuracy || 84.02,
      block_c_macro_f1: perf.block_c_macro_f1 || 0.8257,
      block_c_pure_interior_accuracy: perf.block_c_pure_interior_accuracy || 90.64,
      block_c_boundary_mixed_accuracy: perf.block_c_boundary_mixed_accuracy || 75.92,
      ...metadata,
      validation_disclosures: {
        production_model: 'RandomForest_21Feat_Deep (21 multi-temporal Sentinel-2 spectral, textural & seasonal features)',
        spatial_cv_method: '5-Fold Spatial Block Cross-Validation: 84.63% +/- 3.81% accuracy (N=20,000; Macro-F1: 0.8342 +/- 0.0194; Balanced Accuracy: 84.37% +/- 1.16%)',
        spatial_buffer_status: 'No inter-block geographic buffer was applied between contiguous latitudinal training and validation blocks; spatial proximity is explicitly acknowledged.',
        holdout_status: 'Block C (85.77% overall; 5,146/6,000; Balanced Acc: 84.02%; Macro-F1: 0.8257; Pure Interior: 90.64% [3,639/4,015]; Mixed Boundary: 75.92% [1,507/1,985]) is a southern latitudinal development holdout partition, not an untouched external landscape test.',
        block_b_validation: 'Block B Validation Set: 86.09% overall accuracy (84.31% balanced accuracy, 0.8436 Macro-F1)',
        representative_prevalence_benchmark: '77.07% (Baseline 15-feature RF under empirical landscape prevalence; 15-feature Block C comparison RF: 85.28%)',
        area_weighted_landscape_accuracy: 'Not Yet Independently Established',
        crop_species_classification: 'BLOCKED pending parcel-level cadastral ground truth from DAE.'
      }
    }
  });
});

// GET /api/v1/satellite/scenes
router.get('/scenes', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 12;
  const tileId = req.query.tile_id || null;
  const maxCloudPct = req.query.max_cloud_pct !== undefined ? parseFloat(req.query.max_cloud_pct) : null;

  const catalog = loadSentinel2ScenesCatalog({ limit, tileId, maxCloudPct });

  res.json({
    success: true,
    total_scenes: catalog.scenes.length,
    total_catalog_scenes: catalog.total_catalog_scenes,
    filtered_catalog_scenes: catalog.filtered_count,
    catalog_source: 'research/member_01_satellite_gis/data/metadata/sentinel2_scenes_catalog.csv',
    satellite: 'Sentinel-2 MSI Level-2A BOA Reflectance',
    resolution_m: 10,
    scenes: catalog.scenes
  });
});

// GET /api/v1/satellite/indices
router.get('/indices', (req, res) => {
  const parseBand = (val, def) => {
    if (val === undefined || val === null || val === '') return def;
    const num = parseFloat(val);
    return isNaN(num) ? def : num;
  };

  const b2 = parseBand(req.query.b2 ?? req.query.blue, 0.05);
  const b3 = parseBand(req.query.b3 ?? req.query.green, 0.08);
  const b4 = parseBand(req.query.b4 ?? req.query.red, 0.06);
  const b8 = parseBand(req.query.b8 ?? req.query.nir, 0.42);
  const b11 = parseBand(req.query.b11 ?? req.query.swir1, 0.18);
  const b12 = parseBand(req.query.b12 ?? req.query.swir2, 0.09);

  // Numerical guards against zero division
  const ndvi = (b8 + b4 !== 0) ? (b8 - b4) / (b8 + b4) : 0;
  const ndwi = (b3 + b8 !== 0) ? (b3 - b8) / (b3 + b8) : 0;
  const ndmi = (b8 + b11 !== 0) ? (b8 - b11) / (b8 + b11) : 0;
  const eviDenom = b8 + 6.0 * b4 - 7.5 * b2 + 1.0;
  const evi = (eviDenom !== 0) ? 2.5 * ((b8 - b4) / eviDenom) : 0;
  const savi = (b8 + b4 + 0.5 !== 0) ? ((b8 - b4) / (b8 + b4 + 0.5)) * 1.5 : 0;

  res.json({
    success: true,
    sensor: 'Sentinel-2 MSI Level-2A BOA',
    indices: {
      ndvi: Math.round(ndvi * 1000) / 1000,
      ndwi: Math.round(ndwi * 1000) / 1000,
      ndmi: Math.round(ndmi * 1000) / 1000,
      evi: Math.round(evi * 1000) / 1000,
      savi: Math.round(savi * 1000) / 1000
    },
    inputs: { b2, b3, b4, b8, b11, b12 }
  });
});

// POST /api/v1/satellite/classify-crop (Honest BLOCKED status)
router.post('/classify-crop', (req, res) => {
  res.status(422).json({
    success: false,
    status: 'BLOCKED',
    error: 'CROP_SPECIES_CLASSIFICATION_BLOCKED',
    message: 'Fine-grained crop species identification (Aman, Aus, Boro, Wheat, Maize) is strictly BLOCKED pending field-level cadastral ground-truth boundary polygons from the Department of Agricultural Extension (DAE).',
    supported_classes: ['Cropland', 'Tree_Cover', 'Permanent_Water', 'Built_Up']
  });
});

// POST /api/v1/satellite/classify
router.post('/classify', async (req, res) => {
  const { features, parcel_id = null } = req.body;

  if (!features || !Array.isArray(features) || (features.length !== 15 && features.length !== 21) || features.some((v) => !Number.isFinite(Number(v)))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid feature vector. Member 1 requires 15 or 21 finite multi-temporal numeric features.',
      expected_features: [
        'Blue_B02', 'Green_B03', 'Red_B04', 'NIR_B08', 'SWIR1_B11',
        'NDVI_Rabi', 'NDWI_McFeeters', 'NDMI_Moisture', 'EVI_Rabi', 'Delta_NDVI_Kharif_Rabi',
        'NDVI_Seasonal_Min', 'NDVI_Seasonal_Max', 'NDVI_Seasonal_Amplitude', 'NDMI_Seasonal_Mean', 'EVI_Temporal_Change'
      ]
    });
  }

  // Attempt to query live FastAPI microservice on port 8000 (bounded fast timeout)
  try {
    const response = await fetch('http://127.0.0.1:8000/api/v1/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
      signal: AbortSignal.timeout(400)
    });
    if (response.ok) {
      const data = await response.json();
      return res.json({
        success: true,
        source: 'MEMBER_1_FASTAPI_LIVE',
        parcel_id,
        ...data
      });
    }
  } catch (err) {
    // FastAPI microservice not actively running on port 8000; execute serialized Member 1 RF ensemble
  }

  const rfResult = classifyFeatures(features);

  res.json({
    success: true,
    source: 'MEMBER_1_RANDOM_FOREST_ENSEMBLE_ENGINE',
    parcel_id,
    prediction: {
      class_id: rfResult.class_id,
      class_label: rfResult.class_label,
      confidence: rfResult.confidence,
      class_probabilities: rfResult.class_probabilities
    },
    derived_indices: rfResult.derived_indices,
    provenance: {
      runtime_inference_mode: `Serialized Random Forest Decision-Tree Ensemble (${rfResult.trees_evaluated}/${rfResult.total_trained_trees} trees, depth <= ${rfResult.max_depth_exported}) exported from ${rfResult.source_artifact}`,
      model_name: rfResult.model_name,
      feature_count: rfResult.feature_count,
      trees_evaluated: rfResult.trees_evaluated,
      production_model_name: 'RandomForest_21Feat_Deep',
      production_block_c_accuracy_ref: 85.77,
      production_block_c_macro_f1_ref: 0.8257,
      comparison_15feat_block_c_rf_ref: 85.28,
      pure_interior_accuracy_ref: 90.64,
      boundary_mixed_accuracy_ref: 75.92,
      note: 'Field-level crop species differentiation is blocked (HTTP 422) pending DAE cadastral polygons. Runtime endpoint evaluates real decision-tree splits exported from Member 1 scikit-learn Random Forest weights (no if-else heuristic).'
    }
  });
});

module.exports = router;
