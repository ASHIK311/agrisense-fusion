/**
 * AgriSense Fusion - Core Express Backend Server
 * NASA Space Apps Challenge 2026: Field Shift
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const storage = require('./storage/storageService');
const nasaService = require('./services/nasaService');
const sensorService = require('./services/sensorService');
const { calculateReferenceET, calculateCropET } = require('./physics/penmanMonteith');
const { calculateTAW, calculateRootZoneDepletion, calculateDailyWaterBalance } = require('./physics/waterBalance');
const { evaluateCropRotations } = require('./decision/cropRotationEngine');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

// 1. Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    application: 'AgriSense Fusion',
    version: '1.0.0-mvp',
    environment: process.env.NODE_ENV || 'development',
    storageMode: 'Persistent Local Store (schema.sql available for production PostgreSQL)',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    features: {
      nasaPowerIntegration: true,
      esp32SensorIngestion: true,
      fao56PhysicsEngine: true,
      cropRotationExplorer: true,
      groundwaterMonitoring: true
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
  const fields = farm_id ? storage.getFieldsByFarm(farm_id) : storage.state.fields || [];
  res.json({ success: true, fields });
});

// 3. Main Dashboard Aggregation Endpoint
app.get('/api/dashboard', async (req, res) => {
  try {
    const farmId = req.query.farm_id || 'farm-barind-01';
    const fieldId = req.query.field_id || 'field-godagari-a';

    const farm = storage.getFarmById(farmId) || storage.getFarms()[0];
    const field = storage.getFieldById(fieldId) || storage.getFieldsByFarm(farm.id)[0];

    // Fetch NASA POWER weather data
    const nasaData = await nasaService.fetchDailyWeather(farm.latitude, farm.longitude, 10);

    // Get latest sensor reading
    const latestReading = storage.getLatestReading(field.id) || {
      soil_moisture_vwc: 0.22,
      soil_temp_c: 26.5,
      air_temp_c: 29.0,
      relative_humidity_pct: 75.0,
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
      tMean: latestCompleteWeather.t2m,
      tMax: latestCompleteWeather.t2m_max,
      tMin: latestCompleteWeather.t2m_min,
      rhMean: latestCompleteWeather.rh2m,
      solarRadiationMJ: latestCompleteWeather.solar_mj,
      windSpeed10m: latestCompleteWeather.ws10m,
      elevationM: farm.elevation_m || 25
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
        model: 'FAO-56 Penman-Monteith & Root-Zone Water Balance',
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
      warnings: [
        latestReading.is_simulated ? 'Current sensor reading is a labelled demonstration simulation.' : 'Physical sensor connected.',
        !nasaData.isRealNasaData ? 'Using cached/fallback weather records due to NASA API latency or timeout.' : 'Live NASA POWER satellite-derived data active.'
      ]
    });
  } catch (err) {
    console.error('Dashboard aggregation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Raw NASA POWER Endpoint
app.get('/api/nasa/power', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 24.469;
    const lon = parseFloat(req.query.lon) || 88.330;
    const days = parseInt(req.query.days) || 12;

    const data = await nasaService.fetchDailyWeather(lat, lon, days);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. ESP32 Sensor Readings Ingestion (Supports both /api/sensor-readings and /api/v1/sensor-readings)
const handleSensorIngest = (req, res) => {
  // Support both single reading payload and blueprint batch { device_id, readings: [...] }
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
      next_action: 'field_recalculation_queued'
    });
  }

  const result = sensorService.ingestReading(req.body);
  return res.status(result.statusCode).json(result);
};

app.post('/api/sensor-readings', handleSensorIngest);
app.post('/api/v1/sensor-readings', handleSensorIngest);

// 6. Physics Analysis Endpoint
app.post('/api/analysis', (req, res) => {
  const { weather = {}, soil = {} } = req.body;

  const et0Res = calculateReferenceET({
    tMean: weather.tMean,
    tMax: weather.tMax,
    tMin: weather.tMin,
    rhMean: weather.rhMean,
    solarRadiationMJ: weather.solarRadiationMJ,
    windSpeed10m: weather.windSpeed10m,
    windSpeed2m: weather.windSpeed2m,
    elevationM: weather.elevationM || 20
  });

  const cropKc = weather.cropKc || 1.0;
  const etcRes = calculateCropET(et0Res.et0, cropKc);

  const taw = calculateTAW(soil.thetaFC || 0.30, soil.thetaWP || 0.12, soil.rootDepthM || 0.35);
  const depletionRes = calculateRootZoneDepletion(
    soil.thetaFC || 0.30,
    soil.theta || 0.22,
    soil.rootDepthM || 0.35,
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
      soil_evaporation_mm_day: null // Explicitly null per blueprint section 3.5
    },
    confidence: et0Res.confidence,
    warnings: [
      ...et0Res.warnings,
      ...depletionRes.warnings,
      'Direct soil evaporation is not calculated (dual-Kc uncalibrated)'
    ]
  });
});

// 7. Crop Rotation Explorer Endpoint (Deterministic Multi-Criteria Ranking)
app.post('/api/rotation/compare', (req, res) => {
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
    console.error('Crop rotation evaluation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Groundwater Endpoint
app.get('/api/groundwater', (req, res) => {
  const farmId = req.query.farm_id || 'farm-barind-01';
  const readings = storage.getGroundwater(farmId);
  res.json({ success: true, farmId, readings });
});

// Serve frontend static build
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// Fallback catch-all for SPA client routing (Express 5 compatible)
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `API route ${req.path} not found` });
  }
  const indexHtml = path.join(frontendDist, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) res.status(200).send('AgriSense Fusion Backend running. Frontend building or dev server active.');
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` AgriSense Fusion API Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(` Dashboard:    http://localhost:${PORT}/api/dashboard`);
  console.log(`=======================================================`);
});

module.exports = app;
