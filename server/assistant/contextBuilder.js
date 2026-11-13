/**
 * AgriSense Fusion - Assistant Context Builder
 * Assembles multi-tenant metadata, active field telemetry, retrieved RAG chunks, and conversation history.
 */

const fs = require('fs');
const path = require('path');
const storage = require('../storage/storageService');
const retrievalService = require('./retrievalService');

const SYSTEM_PROMPT_PATH = path.join(__dirname, 'prompts', 'agri_assistant_system.md');

class ContextBuilder {
  constructor() {
    this.systemPromptCache = null;
    this.loadSystemPrompt();
  }

  loadSystemPrompt() {
    try {
      if (fs.existsSync(SYSTEM_PROMPT_PATH)) {
        this.systemPromptCache = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8');
      }
    } catch (e) {
      console.warn('[ContextBuilder] Could not read agri_assistant_system.md:', e.message);
    }
  }

  getSystemPrompt() {
    if (!this.systemPromptCache) this.loadSystemPrompt();
    return this.systemPromptCache || 'You are AgriSense Fusion AI Agricultural Assistant for High Barind Tract, Bangladesh.';
  }

  async buildContext({ userMessage, farmId = null, fieldId = null, userContext = null, history = [] }) {
    const systemPrompt = this.getSystemPrompt();

    // 1. Retrieve RAG Knowledge Chunks
    const retrievedChunks = retrievalService.retrieve(userMessage, { limit: 4 });

    // 2. Resolve Active Farm & Field Context with Strict Multi-Tenant Ownership Enforcement
    let farmInfo = null;
    let fieldInfo = null;
    let latestReading = null;

    if (farmId) {
      const rawFarm = (storage.state?.farms || []).find((f) => f.id === farmId);
      if (!rawFarm) {
        const err = new Error(`Farm '${farmId}' not found.`);
        err.statusCode = 404;
        err.code = 'FARM_NOT_FOUND';
        throw err;
      }
      farmInfo = storage.getFarmById(farmId, userContext);
      if (!farmInfo) {
        const err = new Error(
          userContext
            ? `Access denied: You do not have permission to query private farm '${farmId}'.`
            : `Authentication required to query private farm '${farmId}'.`
        );
        err.statusCode = userContext ? 403 : 401;
        err.code = userContext ? 'FORBIDDEN' : 'UNAUTHORIZED';
        throw err;
      }
    }

    if (fieldId) {
      const rawField = (storage.state?.fields || []).find((f) => f.id === fieldId);
      if (!rawField) {
        const err = new Error(`Field '${fieldId}' not found.`);
        err.statusCode = 404;
        err.code = 'FIELD_NOT_FOUND';
        throw err;
      }
      fieldInfo = storage.getFieldById(fieldId, userContext);
      if (!fieldInfo) {
        const err = new Error(
          userContext
            ? `Access denied: You do not have permission to query private field '${fieldId}'.`
            : `Authentication required to query private field '${fieldId}'.`
        );
        err.statusCode = userContext ? 403 : 401;
        err.code = userContext ? 'FORBIDDEN' : 'UNAUTHORIZED';
        throw err;
      }
      if (farmInfo && fieldInfo.farm_id && fieldInfo.farm_id !== farmInfo.id) {
        const err = new Error(`Field '${fieldId}' does not belong to farm '${farmInfo.id}'.`);
        err.statusCode = 400;
        err.code = 'FIELD_FARM_MISMATCH';
        throw err;
      }
      latestReading = storage.getLatestReading(fieldId);
    }

    const contextPayload = {
      user: userContext ? { id: userContext.id, role: userContext.role, name: userContext.full_name } : { role: 'guest' },
      target_location: {
        upazila: 'Godagari',
        district: 'Rajshahi',
        aez: 'AEZ 26 (High Barind Tract)',
        coordinates: { lat: 24.469, lon: 88.330 }
      },
      active_farm: farmInfo ? { id: farmInfo.id, name: farmInfo.name, district: farmInfo.district } : null,
      active_field: fieldInfo ? { id: fieldInfo.id, name: fieldInfo.name, area_ha: fieldInfo.area_ha, soil_type: fieldInfo.soil_type } : null,
      latest_sensor_reading: latestReading ? {
        vwc: latestReading.soil_moisture_vwc,
        soil_temp: latestReading.soil_temp_c,
        is_simulated: true,
        calibration: 'UNCALIBRATED'
      } : null,
      retrieved_knowledge: retrievedChunks.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        doi: c.doi,
        source: c.source
      }))
    };

    return {
      systemPrompt,
      contextPayload,
      retrievedChunks,
      history
    };
  }
}

module.exports = new ContextBuilder();
