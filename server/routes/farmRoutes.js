/**
 * AgriSense Fusion - Farm & Field Management Routes
 * /api/v1/farms and /api/v1/fields
 * Enforces ownership-based authorization and protects demonstration data.
 */

const express = require('express');
const router = express.Router();
const storage = require('../storage/storageService');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

// --- FARMS ---

// GET /api/v1/farms
router.get('/farms', optionalAuth, (req, res) => {
  const farms = storage.getFarms(req.user);
  res.json({ success: true, count: farms.length, farms });
});

// GET /api/v1/farms/:id
router.get('/farms/:id', optionalAuth, (req, res) => {
  const farm = storage.getFarmById(req.params.id, req.user);
  if (!farm) {
    return res.status(404).json({ success: false, error: 'Farm not found or access denied.' });
  }
  const fields = storage.getFieldsByFarm(farm.id, req.user);
  const groundwater = storage.getGroundwater(farm.id);
  res.json({ success: true, farm, fields, groundwater });
});

// POST /api/v1/farms (Requires Authentication)
router.post('/farms', authenticateToken, (req, res) => {
  const { name, district = 'Rajshahi', division = 'Rajshahi', upazila = 'Godagari', aez_code = 'AEZ-26', latitude, longitude, elevation_m = 28.0, boundary_geojson } = req.body;

  if (!name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: 'Name, latitude, and longitude are required.' });
  }

  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);
  if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return res.status(400).json({ success: false, error: 'Valid latitude [-90, 90] and longitude [-180, 180] are required.' });
  }

  const newFarm = storage.createFarm({
    name,
    district,
    division,
    upazila,
    aez_code,
    latitude: latNum,
    longitude: lonNum,
    elevation_m: parseFloat(elevation_m),
    timezone: 'Asia/Dhaka',
    boundary_geojson: boundary_geojson || null
  }, req.user);

  res.status(201).json({ success: true, message: 'Farm created successfully.', farm: newFarm });
});

// PUT /api/v1/farms/:id (Requires Authentication & Ownership)
router.put('/farms/:id', authenticateToken, (req, res) => {
  const result = storage.updateFarm(req.params.id, req.body, req.user);
  if (result.error) {
    return res.status(result.statusCode || 400).json({
      success: false,
      error: result.error,
      message: result.message
    });
  }
  res.json({ success: true, message: 'Farm updated successfully.', farm: result.farm });
});

// --- FIELDS ---

// GET /api/v1/fields
router.get('/fields', optionalAuth, (req, res) => {
  const { farm_id } = req.query;
  const fields = farm_id ? storage.getFieldsByFarm(farm_id, req.user) : storage.getFields(req.user);
  res.json({ success: true, count: fields.length, fields });
});

// GET /api/v1/fields/:id
router.get('/fields/:id', optionalAuth, (req, res) => {
  const field = storage.getFieldById(req.params.id, req.user);
  if (!field) {
    return res.status(404).json({ success: false, error: 'Field not found or access denied.' });
  }
  const latestReading = storage.getLatestReading(field.id);
  res.json({ success: true, field, latestReading });
});

// POST /api/v1/fields (Requires Authentication & Farm Ownership)
router.post('/fields', authenticateToken, (req, res) => {
  const { farm_id, name, area_m2, soil_type = 'silty_clay_loam', theta_fc = 0.323, theta_wp = 0.165, root_depth_m = 0.50, current_crop = 'Mustard', boundary_geojson } = req.body;

  if (!farm_id || !name || area_m2 === undefined) {
    return res.status(400).json({ success: false, error: 'farm_id, name, and area_m2 are required.' });
  }

  const areaNum = parseFloat(area_m2);
  if (isNaN(areaNum) || areaNum <= 0) {
    return res.status(400).json({ success: false, error: 'area_m2 must be a positive number.' });
  }

  const fc = parseFloat(theta_fc);
  const wp = parseFloat(theta_wp);
  const zr = parseFloat(root_depth_m);
  if (isNaN(fc) || isNaN(wp) || fc <= wp || fc <= 0 || wp < 0 || fc > 1 || wp > 1) {
    return res.status(400).json({ success: false, error: 'Field capacity (theta_fc) must be strictly greater than wilting point (theta_wp) within [0, 1].' });
  }
  if (isNaN(zr) || zr <= 0 || zr > 3.0) {
    return res.status(400).json({ success: false, error: 'root_depth_m must be within (0, 3.0] meters.' });
  }

  const soilTypeLabel =
    soil_type === 'silty_clay_loam'
      ? 'Barind Silty Clay Loam (Saxton & Rawls Provisional)'
      : soil_type === 'clay_loam'
        ? 'Barind Red Clay Loam (ভারী এঁটেল দোআঁশ)'
        : soil_type;

  const result = storage.createField({
    farm_id,
    name,
    area_m2: areaNum,
    soil_type,
    soil_type_label: soilTypeLabel,
    theta_fc: fc,
    theta_wp: wp,
    root_depth_m: zr,
    current_crop,
    boundary_geojson: boundary_geojson || null
  }, req.user);

  if (result.error) {
    return res.status(result.statusCode || 400).json({
      success: false,
      error: result.error,
      message: result.message
    });
  }

  res.status(201).json({ success: true, message: 'Field created successfully.', field: result.field });
});

// PUT /api/v1/fields/:id (Requires Authentication & Ownership)
router.put('/fields/:id', authenticateToken, (req, res) => {
  const result = storage.updateField(req.params.id, req.body, req.user);
  if (result.error) {
    return res.status(result.statusCode || 400).json({
      success: false,
      error: result.error,
      message: result.message
    });
  }
  res.json({ success: true, message: 'Field updated successfully.', field: result.field });
});

module.exports = router;
