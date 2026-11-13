/**
 * AgriSense Fusion - In-Memory Rate Limiting Middleware
 * Protects authentication and IoT sensor ingestion endpoints against brute force and flooding.
 */

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000;
    this.max = options.max || 60;
    this.message = options.message || 'Rate limit exceeded. Please try again later.';
    this.keyGenerator = options.keyGenerator || ((req) => req.ip || req.connection.remoteAddress || 'unknown');
    this.hits = new Map();
  }

  middleware() {
    return (req, res, next) => {
      // Allow bypass in test mode only if explicitly configured
      if (process.env.DISABLE_RATE_LIMITS === 'true') {
        return next();
      }

      const key = this.keyGenerator(req);
      const now = Date.now();

      let record = this.hits.get(key);
      if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + this.windowMs };
        this.hits.set(key, record);
      }

      record.count += 1;

      const remaining = Math.max(0, this.max - record.count);
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);

      res.setHeader('X-RateLimit-Limit', this.max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

      if (record.count > this.max) {
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          statusCode: 429,
          message: this.message,
          retryAfterSeconds: retryAfterSec
        });
      }

      next();
    };
  }

  reset() {
    this.hits.clear();
  }
}

// 1. Auth Rate Limiter: 10 requests per 15 minutes per IP
const authLimiter = new RateLimiter({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  message: 'Too many authentication attempts. Please try again in 15 minutes.'
});

// 2. Sensor Ingestion Limiter: 120 requests per minute per device / IP
const sensorLimiter = new RateLimiter({
  windowMs: parseInt(process.env.SENSOR_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 min
  max: parseInt(process.env.SENSOR_RATE_LIMIT_MAX || '120', 10),
  keyGenerator: (req) => {
    return req.headers['x-device-key'] || req.body?.device_id || req.ip || 'sensor-client';
  },
  message: 'Telemetry ingestion rate limit exceeded. Max 120 readings per minute per node.'
});

// 3. AI Assistant Limiter: protects chat/streaming/tool routes and external LLM quota
const hasExternalLlm = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
const assistantLimiter = new RateLimiter({
  windowMs: parseInt(process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 min
  max: parseInt(process.env.ASSISTANT_RATE_LIMIT_MAX || (hasExternalLlm ? '12' : '30'), 10),
  keyGenerator: (req) => {
    return req.user?.id ? `user:${req.user.id}` : (req.ip || 'assistant-client');
  },
  message: 'Assistant query rate limit exceeded. Please wait briefly before sending more requests.'
});

module.exports = {
  RateLimiter,
  authLimiter: authLimiter.middleware(),
  sensorLimiter: sensorLimiter.middleware(),
  assistantLimiter: assistantLimiter.middleware(),
  _authLimiterInstance: authLimiter,
  _sensorLimiterInstance: sensorLimiter,
  _assistantLimiterInstance: assistantLimiter
};
