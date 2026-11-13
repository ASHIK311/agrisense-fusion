/**
 * AgriSense Fusion - Authentication & User Management Service
 * Implements bcrypt password hashing, JWT token issuance and verification,
 * and role-based access control (farmer, agronomist, researcher, admin).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const storage = require('../storage/storageService');

function getJwtSecret() {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET;

  if (isProduction) {
    if (!secret || secret.trim().length < 32) {
      throw new Error('FATAL: JWT_SECRET environment variable is missing or insufficiently strong (minimum 32 characters required) in production mode.');
    }
    return secret;
  }
  return secret || 'agrisense-fusion-jwt-dev-secret-key-2026-field-shift';
}

const JWT_EXPIRES_IN = '7d';

class AuthService {
  constructor() {
    this.jwtSecret = getJwtSecret();
  }

  /**
   * Helper to validate production secret configuration
   */
  validateJwtSecret(env = process.env.NODE_ENV, secret = process.env.JWT_SECRET) {
    if (env === 'production') {
      if (!secret || secret.trim().length < 32) {
        throw new Error('FATAL: JWT_SECRET environment variable is missing or insufficiently strong (minimum 32 characters required) in production mode.');
      }
    }
    return true;
  }

  /**
   * Register a new user
   */
  async register(data) {
    if (!data || typeof data !== 'object') {
      const err = new Error('Request body must be a valid JSON object.');
      err.statusCode = 400;
      throw err;
    }

    const { email, password, role: _ignoredClientRole, organization = '', preferredLanguage = 'bn' } = data;
    const fullName = data.fullName || data.full_name;

    if (!email || !email.includes('@')) {
      const err = new Error('A valid email address is required.');
      err.statusCode = 400;
      throw err;
    }
    if (!password || password.length < 6) {
      const err = new Error('Password must be at least 6 characters long.');
      err.statusCode = 400;
      throw err;
    }
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      const err = new Error('Full name is required.');
      err.statusCode = 400;
      throw err;
    }

    // Security Fix (P0-01): Public registration is strictly locked to least-privilege 'farmer' role.
    // Client-supplied privileged role claims ('admin', 'researcher', 'agronomist') are ignored.
    const assignedRole = 'farmer';

    // Check existing
    const existing = storage.getUserByEmail(email.toLowerCase().trim());
    if (existing) {
      const err = new Error('A user with this email address already exists.');
      err.statusCode = 409;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: crypto.randomUUID(),
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      full_name: fullName.trim(),
      role: assignedRole,
      organization: organization.trim(),
      preferred_language: preferredLanguage,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    storage.saveUser(newUser);

    const token = this.generateToken(newUser);
    const sanitizedUser = this.sanitizeUser(newUser);

    return { user: sanitizedUser, token };
  }

  /**
   * Authenticate a user with email and password
   */
  async login(email, password) {
    if (!email || !password) {
      const err = new Error('Email and password are required.');
      err.statusCode = 400;
      throw err;
    }

    const user = storage.getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    if (!user.is_active) {
      const err = new Error('Account has been deactivated.');
      err.statusCode = 403;
      throw err;
    }

    const token = this.generateToken(user);
    const sanitizedUser = this.sanitizeUser(user);

    return { user: sanitizedUser, token };
  }

  /**
   * Generate signed JWT
   */
  generateToken(user) {
    const secret = getJwtSecret();
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      },
      secret,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Verify JWT and extract payload
   */
  verifyToken(token) {
    try {
      const secret = getJwtSecret();
      return jwt.verify(token, secret);
    } catch (err) {
      return null;
    }
  }

  /**
   * Remove sensitive fields
   */
  sanitizeUser(user) {
    if (!user) return null;
    const { password_hash, ...safe } = user;
    return safe;
  }
}

const authService = new AuthService();
module.exports = authService;
