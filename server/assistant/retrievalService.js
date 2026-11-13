/**
 * AgriSense Fusion - Hybrid Lexical Retrieval Service (BM25 + Bilingual Synonym Expansion + Character N-Gram TF-IDF Cosine)
 * Implements Reciprocal Rank Fusion (RRF, k=60), bilingual English-Bangla tokenization, and metadata filtering.
 * Honest Disclosure (P1-04): Uses deterministic lexical BM25 + character 3-gram cosine similarity; does not claim dense neural embeddings.
 */

const ingestionService = require('./documentIngestionService');

// Bilingual Synonym Expansion Map (Bangla <-> English agricultural terminology)
const SYNONYM_MAP = {
  'সেচ': ['irrigation', 'water', 'watering', 'sech', 'water balance'],
  'irrigation': ['সেচ', 'water', 'depletion', 'fao56', 'raw', 'taw'],
  'বোরো': ['boro', 'rice', 'groundwater', 'paddy'],
  'boro': ['বোরো', 'rice', 'paddy', 'irrigation'],
  'আমন': ['aman', 't.aman', 'rainfed', 'rice'],
  'aman': ['আমন', 't_aman', 'rice', 'monsoon'],
  'সরিষা': ['mustard', 'oilseed', 'rabi'],
  'mustard': ['সরিষা', 'oilseed', 'barisha', 'rabi'],
  'গম': ['wheat', 'cereal', 'rabi', 'gom'],
  'wheat': ['গম', 'gom', 'cereal', 'rabi'],
  'ছোলা': ['chickpea', 'pulse', 'legume', 'chola'],
  'chickpea': ['ছোলা', 'chola', 'legume', 'pulse'],
  'মসুর': ['lentil', 'masur', 'pulse', 'legume'],
  'lentil': ['মসুর', 'masur', 'pulse', 'legume'],
  'মুগ': ['mungbean', 'pulse', 'legume', 'moog'],
  'mungbean': ['মুগ', 'legume', 'nitrogen'],
  'ভূগর্ভস্থ': ['groundwater', 'aquifer', 'tubewell', 'bmda'],
  'পানি': ['water', 'hydrology', 'drawdown'],
  'groundwater': ['ভূগর্ভস্থ', 'পানি', 'bmda', 'aquifer', 'drawdown', 'jahan'],
  'drawdown': ['পানির স্তর হ্রাস', 'groundwater', '0.65', 'depletion'],
  'খরা': ['drought', 'dry', 'stress'],
  'drought': ['খরা', 'stress', 'water_stress', 'heat'],
  'রোগ': ['disease', 'pathology', 'symptom', 'blight', 'blast'],
  'disease': ['রোগ', 'pathogen', 'fungal', 'bacterial'],
  'blast': ['ব্লাস্ট', 'pyricularia', 'rice blast', 'wheat blast'],
  'blight': ['ব্লাইট', 'late blight', 'bacterial blight', 'sheath blight'],
  'wilt': ['উইল্ট', 'ralstonia', 'bacterial wilt', 'soil-borne'],
  'et0': ['evapotranspiration', 'penman-monteith', 'fao56', 'বাষ্পীভবন'],
  'বাষ্পীভবন': ['evapotranspiration', 'et0', 'fao56'],
  'taw': ['total available water', 'field capacity', 'wilting point', 'raw'],
  'মাটি': ['soil', 'clay', 'loam', 'barind', 'terrace'],
  'soil': ['মাটি', 'terrace', 'texture', 'silty clay loam', 'hardpan'],
  'উপগ্রহ': ['satellite', 'sentinel', 'landsat', 'remote sensing', 'lulc', '84.63', '85.77'],
  'satellite': ['উপগ্রহ', 'sentinel-2', 'random forest', 'remote sensing', 'lulc', '84.63', '85.77'],
  'আবহাওয়া': ['weather', 'nasa power', 'merra-2', 'ceres', 'vpd'],
  'weather': ['আবহাওয়া', 'nasa power', 'merra-2', 'ceres', '34.8']
};

class RetrievalService {
  constructor() {
    this.bm25Index = null;
    this.ngramIndex = null;
    this.k1 = 1.2;
    this.b = 0.75;
    this.init();
  }

  init() {
    this.buildIndex();
  }

  extractCharNgrams(text, n = 3) {
    if (!text || typeof text !== 'string') return [];
    const normalized = text.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g, ' ').trim();
    const grams = [];
    for (let i = 0; i <= normalized.length - n; i++) {
      const g = normalized.slice(i, i + n);
      if (g.trim().length >= 2) grams.push(g);
    }
    return grams;
  }

  buildIndex() {
    const chunks = ingestionService.getChunks();
    const docCount = chunks.length;
    if (docCount === 0) return;

    const termDocs = new Map(); // term -> Set of chunk ids
    const docTermFreqs = new Map(); // chunkId -> Map of term -> count
    const docLengths = new Map(); // chunkId -> total tokens
    let totalLength = 0;

    // Character 3-gram TF-IDF structures
    const ngramDocFreq = new Map();
    const docNgramTfs = new Map();

    for (const chunk of chunks) {
      const fullText = `${chunk.title} ${chunk.title_bn || ''} ${chunk.content} ${chunk.content_bn || ''} ${(chunk.keywords || []).join(' ')}`;
      const tokens = this.tokenize(fullText);
      docLengths.set(chunk.id, tokens.length);
      totalLength += tokens.length;

      const tfMap = new Map();
      for (const t of tokens) {
        tfMap.set(t, (tfMap.get(t) || 0) + 1);
        if (!termDocs.has(t)) {
          termDocs.set(t, new Set());
        }
        termDocs.get(t).add(chunk.id);
      }
      docTermFreqs.set(chunk.id, tfMap);

      // Build character 3-grams for title + keywords + primary content
      const ngramSource = `${chunk.title} ${chunk.title_bn || ''} ${(chunk.keywords || []).join(' ')} ${chunk.content.slice(0, 600)}`;
      const grams = this.extractCharNgrams(ngramSource, 3);
      const gramTf = new Map();
      const seenGrams = new Set();
      for (const g of grams) {
        gramTf.set(g, (gramTf.get(g) || 0) + 1);
        seenGrams.add(g);
      }
      for (const g of seenGrams) {
        ngramDocFreq.set(g, (ngramDocFreq.get(g) || 0) + 1);
      }
      docNgramTfs.set(chunk.id, gramTf);
    }

    const avgdl = totalLength / docCount;

    // Calculate IDF for each word token: log((N - n + 0.5) / (n + 0.5) + 1)
    const idfMap = new Map();
    for (const [term, docSet] of termDocs.entries()) {
      const n = docSet.size;
      const idf = Math.log(1 + (docCount - n + 0.5) / (n + 0.5));
      idfMap.set(term, idf);
    }

    // Calculate IDF and L2 norm for character 3-grams
    const ngramIdf = new Map();
    for (const [g, df] of ngramDocFreq.entries()) {
      ngramIdf.set(g, Math.log(1 + docCount / (1 + df)));
    }

    const docNgramNorms = new Map();
    for (const [chunkId, gramTf] of docNgramTfs.entries()) {
      let sumSq = 0;
      for (const [g, count] of gramTf.entries()) {
        const w = (1 + Math.log(count)) * (ngramIdf.get(g) || 0.1);
        sumSq += w * w;
      }
      docNgramNorms.set(chunkId, Math.sqrt(sumSq) || 1);
    }

    this.bm25Index = {
      chunks,
      docCount,
      avgdl,
      docLengths,
      docTermFreqs,
      idfMap
    };

    this.ngramIndex = {
      chunks,
      ngramIdf,
      docNgramTfs,
      docNgramNorms
    };
  }

  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    // Normalize and match alphanumeric, decimal numbers, and Bengali Unicode characters (\u0980-\u09FF)
    const lower = text.toLowerCase();
    const matches = lower.match(/[a-z0-9\u0980-\u09ff.]{2,}/g) || [];
    return matches.map((m) => m.replace(/^\.+|\.+$/g, '')).filter((m) => m.length >= 2);
  }

  expandQuery(query) {
    const originalTokens = this.tokenize(query);
    const expanded = new Set(originalTokens);

    for (const token of originalTokens) {
      if (SYNONYM_MAP[token]) {
        for (const syn of SYNONYM_MAP[token]) {
          const subTokens = this.tokenize(syn);
          for (const st of subTokens) expanded.add(st);
        }
      }
    }

    return Array.from(expanded);
  }

  scoreBM25(queryTokens, categoryFilter = null) {
    if (!this.bm25Index) this.buildIndex();
    if (!this.bm25Index) return [];

    const { chunks, avgdl, docLengths, docTermFreqs, idfMap } = this.bm25Index;
    const scores = [];

    for (const chunk of chunks) {
      if (categoryFilter && chunk.category !== categoryFilter) continue;

      const docLen = docLengths.get(chunk.id) || 1;
      const tfMap = docTermFreqs.get(chunk.id);
      let score = 0;

      for (const term of queryTokens) {
        if (!tfMap || !tfMap.has(term)) continue;
        const tf = tfMap.get(term);
        const idf = idfMap.get(term) || 0.1;
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / avgdl));
        score += idf * (numerator / denominator);
      }

      if (score > 0) {
        scores.push({ chunk, score });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    return scores;
  }

  scoreCharNgramCosine(query, expandedTokens, categoryFilter = null) {
    if (!this.ngramIndex) this.buildIndex();
    if (!this.ngramIndex) return [];

    const { chunks, ngramIdf, docNgramTfs, docNgramNorms } = this.ngramIndex;
    const queryText = `${query} ${expandedTokens.join(' ')}`;
    const qGrams = this.extractCharNgrams(queryText, 3);
    if (qGrams.length === 0) return [];

    const qTf = new Map();
    for (const g of qGrams) {
      qTf.set(g, (qTf.get(g) || 0) + 1);
    }

    let qNormSq = 0;
    const qWeights = new Map();
    for (const [g, count] of qTf.entries()) {
      const idf = ngramIdf.get(g);
      if (!idf) continue;
      const w = (1 + Math.log(count)) * idf;
      qWeights.set(g, w);
      qNormSq += w * w;
    }
    const qNorm = Math.sqrt(qNormSq) || 1;

    const scored = [];
    const querySet = new Set(expandedTokens);

    for (const chunk of chunks) {
      if (categoryFilter && chunk.category !== categoryFilter) continue;
      const docTf = docNgramTfs.get(chunk.id);
      const docNorm = docNgramNorms.get(chunk.id) || 1;
      if (!docTf) continue;

      let dot = 0;
      for (const [g, qw] of qWeights.entries()) {
        const dCount = docTf.get(g);
        if (!dCount) continue;
        const dw = (1 + Math.log(dCount)) * (ngramIdf.get(g) || 0.1);
        dot += qw * dw;
      }

      const cosine = dot / (qNorm * docNorm);

      // Lexical title/keyword boost
      let titleBoost = 0;
      const titleLower = `${chunk.title} ${chunk.title_bn || ''}`.toLowerCase();
      for (const qt of querySet) {
        if (titleLower.includes(qt)) titleBoost += 0.15;
      }

      const finalScore = cosine + titleBoost;
      if (finalScore > 0.02) {
        scored.push({ chunk, score: finalScore });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Hybrid Lexical Search using Reciprocal Rank Fusion (RRF, k=60)
   * Fuses Okapi BM25 word-level ranking with Character 3-Gram TF-IDF Cosine Similarity.
   * @param {string} query 
   * @param {Object} options 
   * @returns {Array} Ranked knowledge chunks
   */
  retrieve(query, options = {}) {
    const { category = null, limit = 5, rrfK = 60 } = options;
    const expandedTokens = this.expandQuery(query);

    const bm25Results = this.scoreBM25(expandedTokens, category);
    const ngramResults = this.scoreCharNgramCosine(query, expandedTokens, category);

    // Map chunk ID to RRF score
    const rrfScores = new Map();
    const chunkMap = new Map();

    bm25Results.forEach((item, rank) => {
      chunkMap.set(item.chunk.id, item.chunk);
      const prev = rrfScores.get(item.chunk.id) || 0;
      rrfScores.set(item.chunk.id, prev + (1.0 / (rrfK + rank + 1)));
    });

    ngramResults.forEach((item, rank) => {
      chunkMap.set(item.chunk.id, item.chunk);
      const prev = rrfScores.get(item.chunk.id) || 0;
      rrfScores.set(item.chunk.id, prev + (1.0 / (rrfK + rank + 1)));
    });

    const fused = [];
    for (const [id, rrfScore] of rrfScores.entries()) {
      fused.push({
        chunk: chunkMap.get(id),
        rrfScore: Math.round(rrfScore * 10000) / 10000
      });
    }

    fused.sort((a, b) => b.rrfScore - a.rrfScore);

    return fused.slice(0, limit).map((f) => ({
      id: f.chunk.id,
      title: f.chunk.title,
      title_bn: f.chunk.title_bn,
      category: f.chunk.category,
      source: f.chunk.source,
      source_section: f.chunk.source_section || null,
      document_version: f.chunk.document_version || '2.1.0',
      verification_tier: f.chunk.verification_tier || null,
      ingestion_depth: f.chunk.ingestion_depth || null,
      publication_year: f.chunk.publication_year || null,
      geographic_scope: f.chunk.geographic_scope || null,
      doi: f.chunk.doi,
      content: f.chunk.content,
      content_bn: f.chunk.content_bn,
      relevance_score: f.rrfScore,
      retrieval_method: 'hybrid_lexical_bm25_char_ngram_rrf'
    }));
  }
}

module.exports = new RetrievalService();
