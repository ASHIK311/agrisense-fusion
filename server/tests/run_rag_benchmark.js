/**
 * Field Shift — AgriSense Fusion
 * P1-05: Empirical 30-Query RAG & Provider Benchmark Runner
 * Separates:
 *   - Category A: Offline Deterministic Retrieval + Tool Synthesis (`offline_deterministic_synthesizer`)
 *   - Category B: Live Gemini Provider (`gemini-1.5-flash`)
 *   - Category C: Live OpenAI Provider (`gpt-4o-mini`)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const __tmpBenchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrisense-rag-bench-'));
const __tmpBenchStore = path.join(__tmpBenchDir, 'store.json');
fs.copyFileSync(path.join(__dirname, '../data/store.json'), __tmpBenchStore);
process.env.AGRISENSE_STORE_FILE = __tmpBenchStore;

const assistantService = require('../assistant/assistantService');
const documentIngestionService = require('../assistant/documentIngestionService');
const llmProvider = require('../assistant/llmProvider');

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function runBenchmark() {
  try {
  const csvPath = path.join(
    __dirname,
    'rag_evaluation_dataset.csv'
  );
  const raw = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
  const rows = raw.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      id: cols[0],
      lang: cols[1],
      category: cols[2],
      query: cols[3],
      expectedTool: cols[4],
      expectedSource: cols[5],
      groundTruth: cols[6],
      criteria: cols[7]
    };
  });

  const userContext = { id: 'usr-admin-01', role: 'admin', email: 'researcher@barind-agrisense.org' };
  const results = [];
  let hitAt1Count = 0;
  let hitAt4Count = 0;
  let retrievalQueriesCount = 0;
  let toolMatchCount = 0;
  let langMatchCount = 0;
  let scientificDisclosurePassCount = 0;

  for (const row of rows) {
    const t0 = performance.now();
    const res = await assistantService.chat({
      message: row.query,
      farmId: 'farm-barind-01',
      fieldId: 'field-godagari-a',
      userContext
    });
    const latencyMs = Number((performance.now() - t0).toFixed(2));

    const actualTools = (res.tool_calls || []).map((t) => t.tool);
    const actualSources = (res.sources || []).map((s) => s.id);
    const top1Source = actualSources[0] || 'none';

    const toolMatched =
      row.expectedTool === 'none'
        ? actualTools.length === 0
        : actualTools.includes(row.expectedTool);
    if (toolMatched) toolMatchCount++;

    let hitAt1 = null;
    let hitAt4 = null;
    if (row.expectedSource !== 'none') {
      retrievalQueriesCount++;
      hitAt1 = top1Source === row.expectedSource;
      hitAt4 = actualSources.includes(row.expectedSource);
      if (hitAt1) hitAt1Count++;
      if (hitAt4) hitAt4Count++;
    }

    const expectedLangCode = row.lang.toLowerCase();
    const langMatched = res.language === expectedLangCode;
    if (langMatched) langMatchCount++;

    // Check scientific integrity & disclosure rules
    const msg = res.response || res.message || '';
    const hasLegacySatOverclaim = /88\.72%|87\.80%|88\.10%|88\.7%/.test(msg);
    let disclosurePass = !hasLegacySatOverclaim;

    if (row.id === 'Q15' || row.id === 'Q16') {
      disclosurePass = disclosurePass && msg.includes('84.63%') && msg.includes('85.77%') && msg.includes('422');
    }
    if (row.id === 'Q09' || row.id === 'Q10' || row.id === 'Q11' || row.id === 'Q12') {
      disclosurePass =
        disclosurePass &&
        (msg.includes('Non-Diagnostic') ||
          msg.includes('NOT a definitive clinical diagnosis') ||
          msg.includes('রোগ নির্ণয়ের বিকল্প নয়'));
    }
    if (row.id === 'Q27' || row.id === 'Q28') {
      disclosurePass = disclosurePass && (msg.includes('Refusal') || msg.includes('প্রত্যাখ্যান'));
    }
    if (row.id === 'Q29' || row.id === 'Q30') {
      disclosurePass = disclosurePass && msg.includes('501');
    }

    if (disclosurePass) scientificDisclosurePassCount++;

    results.push({
      id: row.id,
      lang: row.lang,
      category: row.category,
      expectedTool: row.expectedTool,
      actualTools,
      toolMatched,
      expectedSource: row.expectedSource,
      top1Source,
      actualSources,
      hitAt1,
      hitAt4,
      langMatched,
      disclosurePass,
      latencyMs,
      provider: res.provider
    });
  }

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const meanLatencyMs = Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2));
  const p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)];

  const summary = {
    evaluated_at: new Date().toISOString(),
    total_queries: rows.length,
    category_a_offline_deterministic: {
      provider: 'offline_deterministic_synthesizer',
      generation_mode: 'offline_deterministic_retrieval_synthesis',
      retrieval_method: 'hybrid_lexical_bm25_char_ngram_rrf',
      total_chunks_indexed: documentIngestionService.getChunks().length,
      queries_evaluated: rows.length,
      retrieval_queries_with_ground_truth_chunk: retrievalQueriesCount,
      hit_at_1_count: hitAt1Count,
      hit_at_1_pct: Number(((hitAt1Count / retrievalQueriesCount) * 100).toFixed(2)),
      hit_at_4_count: hitAt4Count,
      hit_at_4_pct: Number(((hitAt4Count / retrievalQueriesCount) * 100).toFixed(2)),
      tool_selection_accuracy_count: toolMatchCount,
      tool_selection_accuracy_pct: Number(((toolMatchCount / rows.length) * 100).toFixed(2)),
      language_match_count: langMatchCount,
      language_match_pct: Number(((langMatchCount / rows.length) * 100).toFixed(2)),
      scientific_disclosure_pass_count: scientificDisclosurePassCount,
      scientific_disclosure_pass_pct: Number(((scientificDisclosurePassCount / rows.length) * 100).toFixed(2)),
      mean_latency_ms: meanLatencyMs,
      p95_latency_ms: p95LatencyMs
    },
    category_b_live_gemini: {
      provider: 'gemini-1.5-flash',
      api_key_configured: Boolean(llmProvider.geminiApiKey),
      status: llmProvider.geminiApiKey ? 'EVALUATED' : 'NOT_EVALUATED_NO_API_KEY_IN_ENV',
      note: 'Requires GEMINI_API_KEY or GOOGLE_API_KEY in runtime environment. Offline benchmark figures in Category A must not be attributed to live Gemini generation.'
    },
    category_c_live_openai: {
      provider: 'gpt-4o-mini',
      api_key_configured: Boolean(llmProvider.openAiApiKey),
      status: llmProvider.openAiApiKey ? 'EVALUATED' : 'NOT_EVALUATED_NO_API_KEY_IN_ENV',
      note: 'Requires OPENAI_API_KEY in runtime environment. Offline benchmark figures in Category A must not be attributed to live OpenAI generation.'
    },
    per_query_results: results
  };

  console.log(JSON.stringify(summary, null, 2));

  if (hitAt4Count < 18 || toolMatchCount < 30 || langMatchCount < 30 || scientificDisclosurePassCount < 30) {
    throw new Error(
      `Category A RAG benchmark regression detected: Hit@4=${hitAt4Count}/${retrievalQueriesCount}, Tools=${toolMatchCount}/30, Lang=${langMatchCount}/30, Disclosure=${scientificDisclosurePassCount}/30`
    );
  }
  } finally {
    fs.rmSync(__tmpBenchDir, { recursive: true, force: true });
  }
}

runBenchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});
