/**
 * AgriSense Fusion - Core Express Backend Server
 * NASA Space Apps Challenge 2026: Field Shift
 * Location: Godagari Upazila, Rajshahi District, Bangladesh (High Barind Tract)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { initDb, getDbStatus } = require('./storage/db');
const storage = require('./storage/storageService');
const authService = require('./services/authService');
const nasaService = require('./services/nasaService');
const sensorService = require('./services/sensorService');
const { calculateReferenceET, calculateCropET } = require('./physics/penmanMonteith');
const { calculateTAW, calculateRootZoneDepletion, calculateDailyWaterBalance } = require('./physics/waterBalance');
const { evaluateCropRotations } = require('./decision/cropRotationEngine');

// Import Modular v1 Routes
const authRoutes = require('./routes/authRoutes');
const farmRoutes = require('./routes/farmRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const satelliteRoutes = require('./routes/satelliteRoutes');
const agronomyRoutes = require('./routes/agronomyRoutes');
const physicsRoutes = require('./routes/physicsRoutes');
const diseaseRoutes = require('./routes/diseaseRoutes');
const alertRoutes = require('./routes/alertRoutes');
const groundwaterRoutes = require('./routes/groundwaterRoutes');
const waterRoutes = require('./routes/waterRoutes');
const reportRoutes = require('./routes/reportRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
app.disable('x-powered-by');

// CORS configuration (env allowlist required in production; localhost dev origins permitted outside production)
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

const rawAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS;
let configuredOrigins = defaultAllowedOrigins;
if (rawAllowedOrigins) {
  configuredOrigins = rawAllowedOrigins.split(',').map(s => s.trim()).filter(Boolean);
} else if (process.env.NODE_ENV === 'production') {
  configuredOrigins = [];
  console.warn('[CORS] WARNING: In production NODE_ENV, CORS_ALLOWED_ORIGINS / ALLOWED_ORIGINS is not configured. Cross-origin browser requests will fail-closed.');
}

const isLocalDevOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(origin);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser / same-origin requests without Origin header
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      if (isLocalDevOrigin(origin) || configuredOrigins.includes(origin)) {
        return callback(null, true);
      }
      const err = new Error(`CORS blocked: Origin ${origin} is not in local development allowlist.`);
      err.statusCode = 403;
      return callback(err);
    }
    if (configuredOrigins.length > 0 && configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
    const err = new Error(`CORS blocked: Origin ${origin} is not allowed.`);
    err.statusCode = 403;
    return callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-key', 'x-api-key']
};

// Baseline HTTP security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '256kb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// --- Unified API v1 Modular Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', farmRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1', sensorRoutes);
app.use('/api/v1/satellite', satelliteRoutes);
app.use('/api/v1', agronomyRoutes);
app.use('/api/v1/physics', physicsRoutes);
app.use('/api/v1/diseases', diseaseRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/groundwater', groundwaterRoutes);
app.use('/api/v1/water', waterRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/assistant', assistantRoutes);
app.use('/api/assistant', assistantRoutes);

// --- Backwards-Compatible Core Endpoints ---

// 1. Health Endpoint
app.get(['/api/health', '/api/v1/health'], (req, res) => {
  const dbStatus = getDbStatus();
  const sqliteDiag = storage.getSqliteDiagnostics();
  res.json({
    status: 'healthy',
    application: 'AgriSense Fusion',
    version: '2.1.0-competition-verified',
    environment: process.env.NODE_ENV || 'development',
    storageMode: dbStatus.mode === 'postgres'
      ? 'PostgreSQL Pool'
      : 'SQLite Relational Engine (node:sqlite WAL) + Atomic JSON Mirror',
    dbEngine: dbStatus.engine,
    dbConnected: dbStatus.isConnected,
    sqliteDiagnostics: sqliteDiag,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    features: {
      member1_satellite_gis: true,
      member2_weather_risk: true,
      member3_esp32_iot_ingestion: true,
      member4_crop_suitability_calendar: true,
      member5_fao56_physics_water_balance: true,
      member6_disease_knowledge_base: true,
      groundwater_monitoring: true,
      automated_alerts: true,
      rag_ai_assistant: true
    }
  });
});

// 2. Demonstration Farms & Fields
app.get('/api/farms', (req, res) => {
  const farms = storage.getFarms();
  res.json({ success: true, farms });
});

app.get('/api/fields', (req, res) => {
  const { farm_id } = req.query;
  const fields = farm_id ? storage.getFieldsByFarm(farm_id) : (storage.state.fields || []);
  res.json({ success: true, fields });
});

// 3. Main Dashboard Aggregation Endpoint
app.get(['/api/dashboard', '/api/v1/dashboard'], async (req, res, next) => {
  try {
    const farmId = req.query.farm_id || 'farm-barind-01';
    const fieldId = req.query.field_id || 'field-godagari-a';

    const farm = storage.getFarmById(farmId) || storage.getFarms()[0];
    const field = storage.getFieldById(fieldId) || storage.getFieldsByFarm(farm.id)[0];

    // Fetch NASA POWER weather data
    const nasaData = await nasaService.fetchDailyWeather(farm.latitude, farm.longitude, 10);

    // Get latest sensor reading
    const latestReading = storage.getLatestReading(field.id) || {
      soil_moisture_vwc: 0.224,
      soil_temp_c: 26.8,
      air_temp_c: 29.5,
      relative_humidity_pct: 74.2,
      soil_ph: 6.4,
      is_simulated: true,
      observed_at: new Date().toISOString()
    };

    // Find latest weather record that has complete radiation and temp inputs
    const weatherHistory = nasaData.records || [];
    const latestCompleteWeather = [...weatherHistory].reverse().find(
      (r) => r.solar_mj !== null && r.t2m !== null && r.rh2m !== null
    ) || nasaData.latest || {
      t2m: latestReading.air_temp_c || 28.0,
      rh2m: latestReading.relative_humidity_pct || 75.0,
      solar_mj: 16.5,
      ws10m: 2.2,
      precip_mm: 0
    };

    const latestWeather = nasaData.latest || latestCompleteWeather;

    const et0Result = calculateReferenceET({
      date: latestWeather.date,
      tMean: latestCompleteWeather.t2m,
      tMax: latestCompleteWeather.t2m_max,
      tMin: latestCompleteWeather.t2m_min,
      rhMean: latestCompleteWeather.rh2m,
      solarRadiationMJ: latestCompleteWeather.solar_mj,
      windSpeed10m: latestCompleteWeather.ws10m,
      elevationM: farm.elevation_m || 28.0,
      latitude: farm.latitude || 24.469
    });

    const cropKc = 1.05; // Typical for mid-stage mustard or pre-season
    const cropEtResult = calculateCropET(et0Result.et0, cropKc);

    // Root-zone depletion
    const taw = calculateTAW(field.theta_fc, field.theta_wp, field.root_depth_m);
    const depletionResult = calculateRootZoneDepletion(
      field.theta_fc,
      latestReading.soil_moisture_vwc,
      field.root_depth_m,
      taw
    );

    // Groundwater readings for farm
    const groundwater = storage.getGroundwater(farm.id);

    // Alerts
    const alerts = storage.getAlerts(farm.id, true);

    // Aggregate dashboard response
    res.json({
      success: true,
      farm,
      field,
      weather: {
        source: nasaData.source,
        isRealNasaData: nasaData.isRealNasaData,
        sourceStatus: nasaData.sourceStatus,
        attribution: nasaData.attribution,
        fetchedAt: nasaData.fetchedAt,
        latest: latestWeather,
        history: nasaData.records || []
      },
      sensor: {
        latestReading,
        isSimulated: latestReading.is_simulated,
        deviceCount: storage.getDevices().length
      },
      physics: {
        model: 'FAO-56 Penman-Monteith (Full Stefan-Boltzmann Rnl Parity) & Root-Zone Water Balance',
        et0_mm_day: et0Result.et0,
        etc_mm_day: cropEtResult.etc,
        cropKc,
        taw_mm: taw,
        depletion_mm: depletionResult.depletionMm,
        depletion_pct: depletionResult.depletionPct,
        waterStatus: depletionResult.waterStatus,
        confidence: et0Result.confidence,
        warnings: [...et0Result.warnings, ...depletionResult.warnings]
      },
      groundwater: groundwater[0] || null,
      alerts: alerts.slice(0, 3),
      warnings: [
        latestReading.is_simulated ? 'Current sensor reading is a calibrated demonstration simulation.' : 'Physical sensor connected.',
        !nasaData.isRealNasaData ? 'Using cached/fallback weather records due to NASA API latency.' : 'Live NASA POWER satellite-derived data active.'
      ]
    });
  } catch (err) {
    next(err);
  }
});

// 4. Raw NASA POWER Endpoint
app.get('/api/nasa/power', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat) || 24.469;
    const lon = parseFloat(req.query.lon) || 88.330;
    const days = parseInt(req.query.days) || 12;

    const data = await nasaService.fetchDailyWeather(lat, lon, days);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

// 5. ESP32 Sensor Readings Ingestion
const handleSensorIngest = (req, res) => {
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
      is_simulated: true
    });
  }

  const result = sensorService.ingestReading(req.body);
  return res.status(result.statusCode).json({ ...result, is_simulated: true });
};

app.post('/api/sensor-readings', handleSensorIngest);

// 6. Physics Analysis Endpoint
app.post('/api/analysis', (req, res) => {
  const { weather = {}, soil = {} } = req.body;

  const et0Res = calculateReferenceET({
    date: weather.date,
    tMean: weather.tMean,
    tMax: weather.tMax,
    tMin: weather.tMin,
    rhMean: weather.rhMean,
    solarRadiationMJ: weather.solarRadiationMJ,
    windSpeed10m: weather.windSpeed10m,
    windSpeed2m: weather.windSpeed2m,
    elevationM: weather.elevationM || 28.0,
    latitude: weather.latitude || 24.469
  });

  const cropKc = weather.cropKc || 1.0;
  const etcRes = calculateCropET(et0Res.et0, cropKc);

  const thetaFC = soil.thetaFC ?? 0.323;
  const thetaWP = soil.thetaWP ?? 0.165;
  const rootDepthM = soil.rootDepthM ?? 0.50;
  const taw = calculateTAW(thetaFC, thetaWP, rootDepthM);
  const depletionRes = calculateRootZoneDepletion(
    thetaFC,
    soil.theta !== undefined ? soil.theta : 0.224,
    rootDepthM,
    taw
  );

  res.json({
    analysis_id: `analysis-${Date.now()}`,
    results: {
      reference_et_mm_day: et0Res.et0,
      crop_et_mm_day: etcRes.etc,
      total_available_water_mm: taw,
      root_zone_depletion_mm: depletionRes.depletionMm,
      water_status: depletionRes.waterStatus,
      soil_evaporation_mm_day: null
    },
    confidence: et0Res.confidence,
    warnings: [
      ...et0Res.warnings,
      ...depletionRes.warnings,
      'Direct soil evaporation is not calculated (dual-Kc uncalibrated)'
    ]
  });
});

// 7. Crop Rotation Explorer Endpoint
app.post('/api/rotation/compare', (req, res, next) => {
  try {
    const {
      weights = { waterConservation: 35, soilHealth: 25, heatResilience: 20, economicPreference: 20 },
      soilInfo = { soilType: 'clay_loam', ph: 6.4 },
      previousCrops = ['T_AMAN_RICE'],
      weatherContext = { meanTemp: 28.2, recentRainfallMm: 14.0 }
    } = req.body;

    const evaluation = evaluateCropRotations({
      weights,
      soilInfo,
      previousCrops,
      weatherContext
    });

    res.json({ success: true, ...evaluation });
  } catch (err) {
    next(err);
  }
});

// 8. Groundwater Endpoint
app.get('/api/groundwater', (req, res) => {
  const farmId = req.query.farm_id || 'farm-barind-01';
  const readings = storage.getGroundwater(farmId);
  res.json({
    success: true,
    farmId,
    provenance: 'SYNTHETIC_REGIONAL_PROXY',
    is_simulated: true,
    has_physical_piezometers: false,
    disclosure: 'Synthetic regional groundwater proxy seeded from published BMDA trendlines; no live physical piezometer telemetry is connected.',
    readings
  });
});

// Global Error Handler
app.use(errorHandler);

// Serve frontend static build with no-cache on index.html
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.includes('favicon') || filePath.includes('logo')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Dedicated favicon handler to prevent SPA HTML fallback on /favicon.ico
app.get('/favicon.ico', (req, res) => {
  const icoPath = path.join(frontendDist, 'favicon.ico');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (fs.existsSync(icoPath)) {
    return res.sendFile(icoPath);
  }
  return res.redirect('/agrisense-logo.svg');
});

// Fallback catch-all for SPA client routing (Express 5 compatible)
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `API route ${req.path} not found` });
  }
  const indexHtml = path.join(frontendDist, 'index.html');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(indexHtml, (err) => {
    if (err) res.status(200).send('AgriSense Fusion Backend running. Frontend building or dev server active.');
  });
});

// Initialize database then start listening if invoked directly
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled rejection:', reason);
});

if (require.main === module) {
  if (process.env.NODE_ENV === 'production') {
    authService.validateJwtSecret(process.env.NODE_ENV, process.env.JWT_SECRET);
  }
  initDb().then((dbStatus) => {
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` AgriSense Fusion API Server running on port ${PORT}`);
      console.log(` Storage Mode: ${dbStatus.mode === 'postgres' ? 'PostgreSQL' : 'Local Persistent Store'}`);
      console.log(` Health check: http://localhost:${PORT}/api/health`);
      console.log(` Dashboard:    http://localhost:${PORT}/api/dashboard`);
      console.log(`=======================================================`);
    });
  });
}

module.exports = app;
