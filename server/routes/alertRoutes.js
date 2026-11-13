/**
 * AgriSense Fusion - Automated Alerting Engine Routes
 * /api/v1/alerts
 * Protects alert mutation and enforces multi-tenant ownership.
 */

const express = require('express');
const router = express.Router();
const storage = require('../storage/storageService');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

// GET /api/v1/alerts
router.get('/', optionalAuth, (req, res) => {
  const { farm_id, active_only } = req.query;
  const isOnlyActive = active_only === 'true' || active_only === '1';
  const alerts = storage.getAlerts(farm_id, isOnlyActive, req.user);

  res.json({
    success: true,
    total: alerts.length,
    active_count: alerts.filter((a) => !a.is_resolved).length,
    alerts
  });
});

// POST /api/v1/alerts (Requires Authentication)
router.post('/', authenticateToken, (req, res) => {
  const { farm_id, field_id, alert_type, severity = 'warning', title, message, trigger_source } = req.body;

  if (!farm_id || !title || !message) {
    return res.status(400).json({ success: false, error: 'farm_id, title, and message are required.' });
  }

  const result = storage.createAlert({
    farm_id,
    field_id: field_id || null,
    alert_type: alert_type || 'system_notice',
    severity,
    title,
    message,
    trigger_source: trigger_source || 'MANUAL_TRIGGER'
  }, req.user);

  if (result.error) {
    return res.status(result.statusCode || 400).json({
      success: false,
      error: result.error,
      message: result.message
    });
  }

  res.status(201).json({ success: true, message: 'Alert created successfully.', alert: result.alert });
});

// PATCH /api/v1/alerts/:id/acknowledge (Requires Authentication)
router.patch('/:id/acknowledge', authenticateToken, (req, res) => {
  const result = storage.acknowledgeAlert(req.params.id, req.user);
  if (result.error) {
    return res.status(result.statusCode || 400).json({
      success: false,
      error: result.error,
      message: result.message
    });
  }
  res.json({ success: true, message: 'Alert acknowledged.', alert: result.alert });
});

// PATCH /api/v1/alerts/:id/resolve (Requires Authentication)
router.patch('/:id/resolve', authenticateToken, (req, res) => {
  const result = storage.resolveAlert(req.params.id, req.user);
  if (result.error) {
    return res.status(result.statusCode || 400).json({
      success: false,
      error: result.error,
      message: result.message
    });
  }
  res.json({ success: true, message: 'Alert marked as resolved.', alert: result.alert });
});

module.exports = router;
