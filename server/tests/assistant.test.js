const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const __tmpStoreDir = (() => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrisense-assistant-test-'));
  const file = path.join(dir, 'store.json');
  fs.copyFileSync(path.join(__dirname, '../data/store.json'), file);
  process.env.AGRISENSE_STORE_FILE = file;
  return dir;
})();
process.on('exit', () => {
  try {
    require('fs').rmSync(__tmpStoreDir, { recursive: true, force: true });
  } catch {}
});
const app = require('../index');
const authService = require('../services/authService');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('AgriSense AI Assistant & RAG Subsystem Integration Suite', async (t) => {

  await t.test('01. GET /api/v1/assistant/tools returns 9 live tool specifications', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/tools`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.count >= 9, 'Must expose at least 9 live tool definitions');
    const toolNames = body.tools.map((t) => t.name);
    assert.ok(toolNames.includes('calculate_et0'));
    assert.ok(toolNames.includes('calculate_water_balance'));
    assert.ok(toolNames.includes('evaluate_crop_rotations'));
    assert.ok(toolNames.includes('get_groundwater_status'));
    assert.ok(toolNames.includes('screen_crop_diseases'));
  });

  await t.test('02. POST /api/v1/assistant/tools/execute executes calculate_et0 deterministically', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_name: 'calculate_et0',
        parameters: { temp_c: 28.5, rh_pct: 75.0, wind_speed_2m: 2.0, solar_radiation_mj: 19.5 }
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.tool, 'calculate_et0');
    assert.ok(typeof body.output.reference_et_mm_day === 'number');
    assert.ok(body.output.reference_et_mm_day > 3.0 && body.output.reference_et_mm_day < 6.0);
  });

  await t.test('03. POST /api/v1/assistant/query performs hybrid RAG semantic search', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'groundwater drawdown BMDA 0.65 m/year' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.results.length > 0);
    const topResult = body.results[0];
    assert.ok(topResult.doi, 'Top retrieved result must carry DOI provenance');
    assert.match(topResult.content, /0\.65|drawdown|BMDA|Jahan/i);
  });

  await t.test('04. POST /api/v1/assistant/chat responds in English with tool execution and citations', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the daily reference evapotranspiration ET0 in Godagari and how should I irrigate?'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.language, 'en');
    assert.match(body.response, /FAO-56|Evapotranspiration|ET0|mm\/day/i);
    assert.ok(body.tool_calls.length > 0, 'Must execute calculate_et0 or water balance tool');
    assert.ok(body.sources.length > 0, 'Must provide knowledge provenance sources');
  });

  await t.test('05. POST /api/v1/assistant/chat responds in fluent technical Bangla (বাংলা)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'গোদাগাড়ীতে বোরো ধানের বিকল্প হিসেবে কোন শস্য পর্যায় সবচেয়ে কম সেচ দাবি করে?'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.language, 'bn');
    assert.match(body.response, /শস্য পর্যায়|সেচ|পানি সাশ্রয়|সরিষা|গম|ছোলা/);
    assert.ok(body.tool_calls.length > 0, 'Must execute evaluate_crop_rotations tool');
  });

  await t.test('06. Disease query includes mandatory non-diagnostic scientific disclaimer', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'My rice leaves show spindle-shaped lesions with brown borders. What disease is this?'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.match(body.response, /scientific disclaimer|laboratory diagnosis|DAE|BARI/i);
  });

  await t.test('07. Groundwater query cites 0.65 m/year drawdown rate and Jahan et al. 2010', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the current status of groundwater overdraft in Barind tract deep tubewells?'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.match(body.response, /0\.65|drawdown|BMDA|Jahan/i);
    assert.match(body.response, /10\.1007\/s12594-010-0083-0/);
  });

  await t.test('08. Sensor telemetry query discloses uncalibrated prototype simulation status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the latest FDR sensor reading for plot A-1?'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.match(body.response, /is_simulated|UNCALIBRATED|simulated/i);
  });

  await t.test('09. Authenticated multi-tenant conversation persistence and feedback tracking', async () => {
    // Register User A
    const regA = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `asst_user_a_${Date.now()}@agrisense.test`,
        password: 'Password123!',
        fullName: 'Assistant User A',
        role: 'farmer'
      })
    });
    const bodyA = await regA.json();
    const tokenA = bodyA.token;
    assert.ok(tokenA, 'User A must receive JWT token');

    // 1. Create persistent conversation message as User A
    const chatRes = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ message: 'Conversation thread persistence test' })
    });
    const chatBody = await chatRes.json();
    assert.strictEqual(chatRes.status, 200);
    assert.strictEqual(chatBody.mode, 'authenticated_persistent');
    const convId = chatBody.conversation_id;
    const msgId = chatBody.message_id;
    assert.ok(convId, 'Authenticated user must receive persistent conversation_id');

    // 2. Fetch thread as User A
    const getRes = await fetch(`${baseUrl}/api/v1/assistant/conversations/${convId}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(getRes.status, 200);
    const getBody = await getRes.json();
    assert.strictEqual(getBody.success, true);
    assert.strictEqual(getBody.conversation.id, convId);
    assert.ok(getBody.conversation.messages.length >= 2);

    // 3. Submit feedback as User A
    const fbRes = await fetch(`${baseUrl}/api/v1/assistant/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        conversation_id: convId,
        message_id: msgId,
        rating: 5,
        comments: 'Excellent, evidence-backed Barind agronomy recommendations.'
      })
    });
    assert.strictEqual(fbRes.status, 200);
    const fbBody = await fbRes.json();
    assert.strictEqual(fbBody.success, true);
  });

  await t.test('10. POST /api/v1/assistant/stream delivers Server-Sent Events', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assistant/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is FAO-56 Penman-Monteith?' })
    });
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('text/event-stream'));
    const text = await res.text();
    assert.match(text, /data: \{"type":"start"/);
    assert.match(text, /data: \{"type":"chunk"/);
    assert.match(text, /data: \{"type":"done"/);
  });

  await t.test('11. P0-01 Regression: Satellite accuracy queries return reconciled Member 1 metrics and never 88.72% / 88.7% / 95%', async () => {
    const chatRes = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the Sentinel-2 Random Forest satellite LULC classification accuracy and spatial CV result?'
      })
    });
    assert.strictEqual(chatRes.status, 200);
    const chatBody = await chatRes.json();
    const text = chatBody.response;

    // Must contain reconciled Member 1 figures
    assert.match(text, /84\.63%/);
    assert.match(text, /0\.8342/);
    assert.match(text, /84\.37%/);
    assert.match(text, /85\.77%/);
    assert.match(text, /90\.64%/);
    assert.match(text, /75\.92%/);
    assert.match(text, /86\.09%/);
    assert.match(text, /77\.07%/);
    assert.match(text, /no inter-block|buffer/i);
    assert.match(text, /development holdout|not an untouched external/i);

    // Must NEVER contain unsupported 88.72%, 87.80%, 88.10%, 88.7%, or 95% claims
    assert.doesNotMatch(text, /88\.72%|87\.80%|88\.10%|88\.7%|95%/);

    // Verify RAG knowledge base chunk as well
    const qRes = await fetch(`${baseUrl}/api/v1/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Sentinel-2 Random Forest LULC accuracy spatial CV Block C', category: 'satellite' })
    });
    const qBody = await qRes.json();
    assert.ok(qBody.results.length > 0);
    const satChunk = qBody.results[0];
    assert.match(satChunk.content, /84\.63%/);
    assert.match(satChunk.content, /85\.77%/);
    assert.doesNotMatch(satChunk.content, /88\.72%|87\.80%|88\.10%|88\.7%/);
  });

  await t.test('12. P0-02 Regression: calculate_et0 and calculate_water_balance reject missing inputs without silent defaults and disclose staleness', async () => {
    // 1. calculate_et0 with missing RH, wind, solar -> MISSING_REQUIRED_INPUTS
    const missingEtRes = await fetch(`${baseUrl}/api/v1/assistant/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_name: 'calculate_et0',
        parameters: { temp_c: 29.0 }
      })
    });
    assert.strictEqual(missingEtRes.status, 200);
    const missingEtBody = await missingEtRes.json();
    assert.strictEqual(missingEtBody.output.status, 'MISSING_REQUIRED_INPUTS');
    assert.strictEqual(missingEtBody.output.reference_et_mm_day, null);
    assert.ok(missingEtBody.output.missing_inputs.includes('relative_humidity_pct'));
    assert.ok(missingEtBody.output.missing_inputs.includes('wind_speed_2m_m_s'));
    assert.ok(missingEtBody.output.missing_inputs.includes('solar_radiation_mj_m2_day'));

    // 2. calculate_et0 with use_current_weather=true -> discloses coordinate, observation_date, and staleness
    const archiveEtRes = await fetch(`${baseUrl}/api/v1/assistant/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_name: 'calculate_et0',
        parameters: { use_current_weather: true }
      })
    });
    const archiveEtBody = await archiveEtRes.json();
    assert.strictEqual(archiveEtBody.output.source_coordinate.latitude, 24.3636);
    assert.strictEqual(archiveEtBody.output.source_coordinate.longitude, 88.6241);
    assert.ok(archiveEtBody.output.observation_date);
    assert.strictEqual(typeof archiveEtBody.output.is_stale, 'boolean');
    assert.ok(typeof archiveEtBody.output.reference_et_mm_day === 'number');

    // 3. calculate_water_balance with missing fluxes -> MISSING_REQUIRED_INPUTS (no silent 0.0 mm rainfall or 3.8 mm ETc)
    const missingWbRes = await fetch(`${baseUrl}/api/v1/assistant/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_name: 'calculate_water_balance',
        parameters: { soil_type: 'clay_loam', root_depth_m: 0.40 }
      })
    });
    const missingWbBody = await missingWbRes.json();
    assert.strictEqual(missingWbBody.output.status, 'MISSING_REQUIRED_INPUTS');
    assert.strictEqual(missingWbBody.output.daily_balance, null);
    assert.ok(missingWbBody.output.missing_inputs.includes('precip_mm'));
    assert.ok(missingWbBody.output.missing_inputs.includes('etc_mm'));

    // 4. calculate_water_balance with explicit inputs updates depletion_mm via drNext
    const validWbRes = await fetch(`${baseUrl}/api/v1/assistant/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_name: 'calculate_water_balance',
        parameters: {
          soil_type: 'silty_clay_loam',
          root_depth_m: 0.45,
          p_depletion: 0.50,
          initial_depletion_mm: 30.0,
          etc_mm: 4.5,
          precip_mm: 0.0,
          irrigation_mm: 0.0
        }
      })
    });
    const validWbBody = await validWbRes.json();
    assert.strictEqual(validWbBody.output.status, 'COMPUTED_FROM_EXPLICIT_INPUTS');
    assert.strictEqual(validWbBody.output.daily_balance.previous_depletion_mm, 30.0);
    assert.strictEqual(validWbBody.output.daily_balance.depletion_mm, 34.5);
  });

  await t.test('13. P1-03 Security Suite: 6 Multi-Tenant & Anonymous Authorization Tests', async () => {
    // Register User A and User B
    const regUser = async (tag) => {
      const r = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `sec_${tag}_${Date.now()}@agrisense.test`,
          password: 'Password123!',
          fullName: `Security User ${tag}`,
          role: 'farmer'
        })
      });
      return r.json();
    };

    const userA = await regUser('A');
    const userB = await regUser('B');
    const tokenA = userA.token;
    const tokenB = userB.token;

    // Create private farm & field owned by User B
    const farmBRes = await fetch(`${baseUrl}/api/v1/farms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({
        name: 'User B Private Barind Farm',
        district: 'Rajshahi',
        upazila: 'Godagari',
        latitude: 24.47,
        longitude: 88.33
      })
    });
    const farmB = (await farmBRes.json()).farm;

    const fieldBRes = await fetch(`${baseUrl}/api/v1/fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({
        farm_id: farmB.id,
        name: 'User B Secret Field',
        soil_type: 'clay_loam',
        area_m2: 5000
      })
    });
    const fieldB = (await fieldBRes.json()).field;

    // Create conversation owned by User B
    const convBRes = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({ message: 'User B private consultation' })
    });
    const convBId = (await convBRes.json()).conversation_id;
    assert.ok(convBId);

    // Subtest 1: Anonymous access to private tools & conversation list -> 401
    const anonToolRes = await fetch(`${baseUrl}/api/v1/assistant/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_name: 'get_sensor_telemetry', parameters: { field_id: fieldB.id } })
    });
    assert.strictEqual(anonToolRes.status, 401);

    const anonListRes = await fetch(`${baseUrl}/api/v1/assistant/conversations`);
    assert.strictEqual(anonListRes.status, 401);

    // Subtest 2: User A querying User B's field -> 403 Forbidden
    const crossFieldChatRes = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({ message: 'Show sensor status', field_id: fieldB.id })
    });
    assert.strictEqual(crossFieldChatRes.status, 403);

    const crossFieldToolRes = await fetch(`${baseUrl}/api/v1/assistant/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({ tool_name: 'get_sensor_telemetry', parameters: { field_id: fieldB.id } })
    });
    assert.strictEqual(crossFieldToolRes.status, 403);

    // Subtest 3: User A retrieving User B's conversation -> 403 Forbidden
    const crossGetConvRes = await fetch(`${baseUrl}/api/v1/assistant/conversations/${convBId}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(crossGetConvRes.status, 403);

    // Subtest 4: User A deleting User B's conversation -> 403 Forbidden
    const crossDelConvRes = await fetch(`${baseUrl}/api/v1/assistant/conversations/${convBId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(crossDelConvRes.status, 403);

    // Subtest 5: Anonymous use of public knowledge-only query -> 200 OK & stateless
    const anonPublicQueryRes = await fetch(`${baseUrl}/api/v1/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'High Barind AEZ 26 soil properties' })
    });
    assert.strictEqual(anonPublicQueryRes.status, 200);

    const anonStatelessChatRes = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is the drawdown rate in High Barind?' })
    });
    assert.strictEqual(anonStatelessChatRes.status, 200);
    const anonChatBody = await anonStatelessChatRes.json();
    assert.strictEqual(anonChatBody.mode, 'stateless_public_demo');
    assert.strictEqual(anonChatBody.conversation_id, null);

    // Subtest 6: Public demo mode data boundaries (rejects persistent conversation_id, private farm, and user_id spoofing)
    const anonPersistAttempt = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Continue thread', conversation_id: convBId })
    });
    assert.strictEqual(anonPersistAttempt.status, 401);

    const spoofAttempt = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({ message: 'Spoof user_id', user_id: userB.user.id })
    });
    assert.strictEqual(spoofAttempt.status, 403);
  });

  await t.test('14. Authenticated persistent chat executes tools, retrieves RAG chunks, and preserves SQLite multi-turn history', async () => {
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `rag_sqlite_${Date.now()}@agrisense.test`,
        password: 'Password123!',
        fullName: 'SQLite RAG Tester',
        role: 'farmer'
      })
    });
    assert.strictEqual(regRes.status, 201);
    const { token } = await regRes.json();

    // Turn 1: Authenticated query requiring tool execution + grounded sources
    const turn1Res = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        message: 'What is the daily reference evapotranspiration ET0 in Godagari and how should I irrigate?',
        farm_id: 'farm-barind-01',
        field_id: 'field-godagari-a'
      })
    });
    assert.strictEqual(turn1Res.status, 200);
    const turn1Body = await turn1Res.json();
    assert.strictEqual(turn1Body.mode, 'authenticated_persistent');
    assert.ok(turn1Body.conversation_id && turn1Body.conversation_id.startsWith('conv-'));
    assert.ok(
      Array.isArray(turn1Body.tool_calls) &&
      turn1Body.tool_calls.some((tc) => (tc.tool || tc.name) === 'calculate_et0')
    );
    assert.ok(Array.isArray(turn1Body.sources) && turn1Body.sources.length > 0);

    // Turn 2: Bengali follow-up on the same persisted SQLite thread
    const turn2Res = await fetch(`${baseUrl}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        conversation_id: turn1Body.conversation_id,
        message: 'বাংলায় বোরো ধানের সেচ পরামর্শ দিন।',
        farm_id: 'farm-barind-01',
        field_id: 'field-godagari-a'
      })
    });
    assert.strictEqual(turn2Res.status, 200);
    const turn2Body = await turn2Res.json();
    assert.strictEqual(turn2Body.conversation_id, turn1Body.conversation_id);
    assert.strictEqual(turn2Body.language, 'bn');

    // Verify SQLite-backed conversation contains all 4 messages (2 user + 2 assistant)
    const convRes = await fetch(`${baseUrl}/api/v1/assistant/conversations/${turn1Body.conversation_id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(convRes.status, 200);
    const convBody = await convRes.json();
    assert.strictEqual((convBody.conversation?.messages || []).length, 4);
  });
});
