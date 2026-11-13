/**
 * AgriSense Fusion - IoT Sensor Devices & Ingestion Routes (Member 3)
 * /api/v1/sensor-readings and /api/v1/devices
 * Enforces rate limiting, device/user authentication, and strict honest simulation labels.
 */

const express = require('express');
const router = express.Router();
const sensorService = require('../services/sensorService');
const storage = require('../storage/storageService');
const { authenticateSensorOrDevice, optionalAuth } = require('../middleware/auth');
const { sensorLimiter } = require('../middleware/rateLimiter');

// POST /api/v1/sensor-readings (Protected by Device Key or User Token + Rate Limited)
router.post('/sensor-readings', sensorLimiter, authenticateSensorOrDevice, (req, res) => {
  // Support both single reading and batch { device_id, readings: [...] }
  if (req.body?.readings && Array.isArray(req.body.readings)) {
    const results = [];
    let duplicates = 0;
    for (const r of req.body.readings) {
      const outcome = sensorService.ingestReading({ device_id: req.body.device_id, ...r });
      if (outcome.statusCode === 409) duplicates++;
      results.push(outcome);
    }
    return res.status(200).json({
      status: 'accepted',
      accepted: results.filter((x) => x.success).length,
      duplicates,
      rejected: results.filter((x) => !x.success && x.statusCode !== 409).length,
      next_action: 'field_recalculation_queued',
      provenance: {
        is_simulated: true,
        calibration_status: 'UNCALIBRATED',
        hardware_profile: 'Simulated ESP32/FDR Prototype — Uncalibrated',
        note: 'Derived from SoilGrids Barind clay loam dielectric transfer curves. No in-situ hardware deployed.'
      }
    });
  }

  const result = sensorService.ingestReading(req.body);
  return res.status(result.statusCode).json({
    ...result,
    is_simulated: true,
    calibration_status: 'UNCALIBRATED',
    provenance: {
      is_simulated: true,
      calibration_status: 'UNCALIBRATED',
      hardware_profile: 'Simulated ESP32/FDR Prototype — Uncalibrated',
      total_source_records: 5760,
      runtime_cached_records: 500
    }
  });
});

// GET /api/v1/sensor-readings (Multi-tenant scoped: public/demo fields or owned fields)
router.get('/sensor-readings', optionalAuth, (req, res) => {
  const { field_id, limit = 50 } = req.query;
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);

  if (field_id) {
    const field = storage.getFieldById(field_id, req.user);
    if (!field) {
      return res.status(404).json({
        success: false,
        error: 'FIELD_NOT_FOUND_OR_DENIED',
        message: 'Field not found or access denied.'
      });
    }
    const readings = storage.getReadings(field_id, parsedLimit);
    return res.json({
      success: true,
      count: readings.length,
      field_id,
      total_source_records: 5760,
      runtime_cached_records: 500,
      provenance: {
        is_simulated: true,
        calibration_status: 'UNCALIBRATED',
        description: 'Simulated ESP32/FDR Prototype — Uncalibrated'
      },
      readings
    });
  }

  const accessibleFieldIds = new Set(storage.getFields(req.user).map((f) => f.id));
  const allAccessibleReadings = (storage.state?.readings || [])
    .filter((r) => accessibleFieldIds.has(r.field_id))
    .slice(-parsedLimit)
    .reverse();

  res.json({
    success: true,
    count: allAccessibleReadings.length,
    field_id: null,
    total_source_records: 5760,
    runtime_cached_records: 500,
    provenance: {
      is_simulated: true,
      calibration_status: 'UNCALIBRATED',
      description: 'Simulated ESP32/FDR Prototype — Uncalibrated'
    },
    readings: allAccessibleReadings
  });
});

// GET /api/v1/sensor-readings/profile
router.get('/sensor-readings/profile', (req, res) => {
  res.json({
    success: true,
    profile: {
      soil_type: 'silty_clay_loam',
      soil_texture_label: 'Barind Silty Clay Loam (AEZ-26 Provisional, Saxton & Rawls PTF)',
      theta_sat: 0.435,
      theta_fc: 0.323,
      trigger_vwc: 0.244,
      theta_wp: 0.165,
      root_depth_m: 0.50,
      taw_50cm_mm: 79.0,
      raw_50pct_mm: 39.5,
      critical_suction_kpa: 1500,
      provenance: {
        source: 'ISRIC SoilGrids 250m (0-5cm Silty Clay Loam) + Saxton & Rawls (2006) PTF Provisional Profile (Member 3)',
        calibration_status: 'UNCALIBRATED',
        is_simulated: true,
        requires_gravimetric_field_calibration: true
      }
    }
  });
});

// GET /api/v1/devices
router.get('/devices', optionalAuth, (req, res) => {
  const devices = storage.getDevices(req.user);
  res.json({
    success: true,
    count: devices.length,
    provenance: {
      is_simulated: true,
      hardware_status: 'PROTOTYPE_SPECIFICATION_ONLY',
      note: 'ESP32 firmware specifications and simulated device profiles.'
    },
    devices
  });
});

module.exports = router;
