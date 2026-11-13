/**
 * AgriSense Fusion - Authentication Routes
 * /api/v1/auth
 * Protected by IP-based rate limiting (10 req / 15 min).
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/v1/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      ...result
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({
      success: true,
      message: 'Login successful.',
      ...result
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const storage = require('../storage/storageService');
    const user = storage.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User record not found.' });
    }
    res.json({
      success: true,
      user: authService.sanitizeUser(user)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
