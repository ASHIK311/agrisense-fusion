/**
 * AgriSense Fusion - Groundwater Monitoring Routes (BMDA Deep Tubewells)
 * /api/v1/groundwater
 */

const express = require('express');
const router = express.Router();
const storage = require('../storage/storageService');

// GET /api/v1/groundwater
router.get('/', (req, res) => {
  const { farm_id } = req.query;
  const readings = storage.getGroundwater(farm_id);
  res.json({
    success: true,
    total: readings.length,
    region: 'High Barind Tract (Godagari Upazila, Rajshahi)',
    monitoring_authority: 'Barind Multipurpose Development Authority (BMDA)',
    provenance: 'SYNTHETIC_REGIONAL_PROXY',
    is_simulated: true,
    has_physical_piezometers: false,
    disclosure: 'Synthetic regional groundwater proxy seeded from published BMDA trendlines; no live physical piezometer telemetry is connected.',
    readings
  });
});

module.exports = router;
