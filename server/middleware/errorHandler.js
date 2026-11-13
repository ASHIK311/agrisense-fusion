/**
 * AgriSense Fusion - Global Error Handling Middleware
 */

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.path} -> ${statusCode}:`, err.stack || message);

  res.status(statusCode).json({
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path
  });
}

module.exports = errorHandler;
