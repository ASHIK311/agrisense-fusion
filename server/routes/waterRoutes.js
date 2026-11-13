/**
 * AgriSense Fusion - Open Hydrology & Terrain Proxy Routes
 * /api/v1/water
 */

const express = require('express');
const router = express.Router();
const hydrologyApi = require('../services/hydrologyApiService');

function parseCoord(query) {
  const lat = parseFloat(query.lat);
  const lon = parseFloat(query.lon);
  return {
    lat: Number.isFinite(lat) ? lat : 24.469,
    lon: Number.isFinite(lon) ? lon : 88.330,
  };
}

// GET /api/v1/water/forecast
router.get('/forecast', async (req, res) => {
  const { lat, lon } = parseCoord(req.query);
  const result = await hydrologyApi.fetchHydrologyForecast(lat, lon);
  res.json({ success: result.available, ...result });
});

// GET /api/v1/water/river-discharge
router.get('/river-discharge', async (req, res) => {
  const { lat, lon } = parseCoord(req.query);
  const result = await hydrologyApi.fetchRiverDischarge(lat, lon);
  res.json({ success: result.available, ...result });
});

// GET /api/v1/water/dem-profile
router.get('/dem-profile', async (req, res) => {
  const { lat, lon } = parseCoord(req.query);
  const result = await hydrologyApi.fetchDemProfile(lat, lon);
  res.json({ success: result.available, ...result });
});

module.exports = router;
