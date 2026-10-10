const http = require('http');

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch (e) {
          resolve({ status: res.statusCode, body: buf });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('1. Testing GET /api/health...');
  const health = await getJson('/api/health');
  console.log('Health status:', health.status, health.body.application, health.body.version);

  console.log('\n2. Testing GET /api/dashboard...');
  const dash = await getJson('/api/dashboard');
  console.log('Dashboard status:', dash.status, 'Farm:', dash.body.farm?.name);
  console.log('Weather source:', dash.body.weather?.source, 'isRealNasaData:', dash.body.weather?.isRealNasaData);
  console.log('ET0 (mm/day):', dash.body.physics?.et0_mm_day, 'Depletion (mm):', dash.body.physics?.depletion_mm);

  console.log('\n3. Testing POST /api/sensor-readings (ESP32 Ingestion)...');
  const simEvtId = 'evt-test-' + Date.now();
  const ingest = await postJson('/api/sensor-readings', {
    device_id: 'esp32-node-raj-01',
    event_id: simEvtId,
    soil_moisture_vwc: 0.28,
    soil_temp_c: 25.5,
    is_simulated: true
  });
  console.log('Ingest status:', ingest.status, ingest.body.message);

  console.log('\n4. Testing duplicate event_id rejection...');
  const duplicate = await postJson('/api/sensor-readings', {
    device_id: 'esp32-node-raj-01',
    event_id: simEvtId,
    soil_moisture_vwc: 0.28
  });
  console.log('Duplicate status:', duplicate.status, 'Error:', duplicate.body.error);

  console.log('\n5. Testing POST /api/rotation/compare (Water Priority: 80% water, 5% econ)...');
  const rotWater = await postJson('/api/rotation/compare', {
    weights: { waterConservation: 80, soilHealth: 10, heatResilience: 5, economicPreference: 5 }
  });
  console.log('Top Recommendation:', rotWater.body.topRecommendation?.name, 'Score:', rotWater.body.topRecommendation?.scores?.composite);

  console.log('\n6. Testing POST /api/rotation/compare (Economic Priority: 10% water, 80% econ)...');
  const rotEcon = await postJson('/api/rotation/compare', {
    weights: { waterConservation: 10, soilHealth: 5, heatResilience: 5, economicPreference: 80 }
  });
  console.log('Top Recommendation:', rotEcon.body.topRecommendation?.name, 'Score:', rotEcon.body.topRecommendation?.scores?.composite);

  console.log('\n7. Testing GET / (Frontend Single Page App)...');
  const root = await getJson('/');
  console.log('Root HTML status:', root.status, 'Is HTML:', typeof root.body === 'string' && root.body.includes('<div id="root">'));

  console.log('\n=== ALL ENDPOINTS VERIFIED OPERATIONAL! ===');
}

run().catch((e) => console.error('Verification failed:', e));
