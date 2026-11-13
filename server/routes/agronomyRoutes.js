/**
 * AgriSense Fusion - Agronomy, Crop Calendars & Rotation Explorer (Member 4)
 * /api/v1/agronomy and /api/v1/rotation
 * Provides BARC suitability, calendars, and explainable multi-criteria rotation rankings.
 */

const express = require('express');
const router = express.Router();
const storage = require('../storage/storageService');
const { evaluateCropRotations } = require('../decision/cropRotationEngine');

// GET /api/v1/agronomy/suitability
router.get('/agronomy/suitability', (req, res) => {
  const suitability = storage.getAgronomySuitability();
  res.json({
    success: true,
    upazila: 'Godagari',
    district: 'Rajshahi',
    division: 'Rajshahi',
    aez: 'AEZ-26 (High Barind Tract)',
    count: suitability.length,
    provenance: {
      source: 'BARC AEZ Land Suitability Database',
      spatial_coverage: 'AEZ-26 High Barind Tract (466 historical upazila units)',
      note: 'Based on soil texture, drainage, permeability, and soil pH.'
    },
    suitability
  });
});

// GET /api/v1/agronomy/calendar
router.get('/agronomy/calendar', (req, res) => {
  const calendar = storage.getCropCalendar();
  res.json({
    success: true,
    upazila: 'Godagari',
    district: 'Rajshahi',
    count: calendar.length,
    provenance: {
      source: 'DAE / BARC Regional Cropping Calendars',
      seasons: ['Rabi (Winter)', 'Kharif-1 (Early Summer)', 'Kharif-2 (Monsoon)']
    },
    calendar
  });
});

// GET /api/v1/agronomy/rotations & /api/v1/agronomy/rotations/standard
function handleGetRotations(req, res) {
  const recommendations = storage.getRotationRecommendations();
  res.json({
    success: true,
    upazila: 'Godagari',
    district: 'Rajshahi',
    validation_status: 'PROVISIONAL_CANDIDATE_SEQUENCES',
    recommendations
  });
}
router.get('/agronomy/rotations', handleGetRotations);
router.get('/agronomy/rotations/standard', handleGetRotations);

// Multi-criteria rotation handler (used by both routes)
function handleRotationCompare(req, res) {
  try {
    const {
      weights = { waterConservation: 35, soilHealth: 25, heatResilience: 20, economicPreference: 20 },
      soilInfo = { soilType: 'clay_loam', ph: 6.4 },
      previousCrops = ['T_AMAN_RICE'],
      weatherContext = { meanTemp: 28.2, recentRainfallMm: 14.0 }
    } = req.body;

    const evaluation = evaluateCropRotations({
      weights,
      soilInfo,
      previousCrops,
      weatherContext
    });

    res.json({ success: true, ...evaluation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/v1/rotation/compare
router.post('/rotation/compare', handleRotationCompare);

// POST /api/v1/agronomy/evaluate-rotations (SRS Contract Alias)
router.post('/agronomy/evaluate-rotations', handleRotationCompare);

// POST /api/v1/agronomy/rotations (POST alias for MCDA ranking)
router.post('/agronomy/rotations', handleRotationCompare);

// POST /api/v1/agronomy/rotation/compare (Prefix Alias)
router.post('/agronomy/rotation/compare', handleRotationCompare);

// POST /api/v1/agronomy/predict-yield & /api/v1/agronomy/yield-predict (Honest NOT_IMPLEMENTED Status)
function handleYieldNotImplemented(req, res) {
  res.status(501).json({
    success: false,
    status: 'NOT_IMPLEMENTED',
    error: 'ML_YIELD_MODEL_EXCLUDED',
    message: 'Machine-learning crop yield forecasting model is intentionally excluded from deployment. Validation against Member 4 historical benchmarks demonstrated negative predictive skill (R² < 0) relative to the naive historical mean baseline. Deploying this model would violate scientific integrity guidelines.',
    alternative: 'Use historical BARC AEZ-26 suitability scores from /api/v1/agronomy/suitability'
  });
}
router.post('/agronomy/predict-yield', handleYieldNotImplemented);
router.post('/agronomy/yield-predict', handleYieldNotImplemented);

module.exports = router;
