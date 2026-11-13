/**
 * AgriSense Fusion - Authentication & Authorization Middleware
 */

const crypto = require('crypto');
const authService = require('../services/authService');
const storage = require('../storage/storageService');

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Middleware: Verify JWT Bearer token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token in Authorization header.'
    });
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token. Please log in again.'
    });
  }

  req.user = payload;
  next();
}

/**
 * Middleware: Optional authentication (attaches user if present, proceeds if absent)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (token) {
    const payload = authService.verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

/**
 * Middleware: Enforce minimum required roles
 * @param {...string} allowedRoles
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'.`
      });
    }
    next();
  };
}

/**
 * Middleware: Protect sensor ingestion using authenticated device key OR valid user Bearer token
 */
function authenticateSensorOrDevice(req, res, next) {
  // 1. Check for valid Bearer token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (token) {
    const payload = authService.verifyToken(token);
    if (payload) {
      req.user = payload;
      return next();
    }
  }

  // 2. Check for device key header (ESP32 hardware credentials)
  const deviceKey = req.headers['x-device-key'] || req.headers['x-api-key'];
  if (!deviceKey) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required for sensor ingestion. Provide a valid Bearer token or x-device-key header.'
    });
  }

  // 3. Assemble authorized system keys
  const allowedDevKeys = [];
  if (process.env.DEVICE_API_KEY) {
    allowedDevKeys.push(process.env.DEVICE_API_KEY);
  }
  if (process.env.NODE_ENV !== 'production') {
    allowedDevKeys.push('agrisense-device-key-2026', 'test-device-secret-key', 'esp32-hardware-key-dev-barind');
  }

  // Compare against allowed system keys using constant-time comparison
  for (const validKey of allowedDevKeys) {
    if (safeCompare(deviceKey, validKey)) {
      req.device = { authenticated: true, key: validKey, type: 'system_key' };
      return next();
    }
  }

  // 4. Compare against specific registered device key hash if device_id is provided
  const deviceId = req.body?.device_id;
  if (deviceId) {
    const devices = storage.getDevices();
    const matched = devices.find((d) => d.id === deviceId);
    if (matched && matched.api_key_hash) {
      const incomingHash = crypto.createHash('sha256').update(deviceKey).digest('hex');
      if (safeCompare(incomingHash, matched.api_key_hash)) {
        req.device = { authenticated: true, id: deviceId, type: 'device_key' };
        return next();
      }
    }
  }

  // 5. Fail closed if no key matched
  return res.status(401).json({
    success: false,
    error: 'Authentication failed for sensor ingestion. Invalid or unauthorized device key.'
  });
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRoles,
  authenticateSensorOrDevice
};
