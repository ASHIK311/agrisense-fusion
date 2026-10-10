/**
 * AgriSense Fusion - ESP32 Sensor Ingestion Service
 * Handles payload validation, numeric boundary checks, duplicate rejection, and persistence.
 */

const storage = require('../storage/storageService');

class SensorService {
  /**
   * Validate and ingest an ESP32 sensor reading
   * @param {Object} payload 
   * @returns {Object} { success, statusCode, message, reading, duplicates, errors }
   */
  ingestReading(payload) {
    const errors = [];

    if (!payload || typeof payload !== 'object') {
      return {
        success: false,
        statusCode: 400,
        error: 'Invalid request body. Expected JSON object with sensor readings.'
      };
    }

    const {
      device_id,
      event_id,
      observed_at,
      soil_moisture_vwc,
      soil_temp_c,
      air_temp_c,
      relative_humidity_pct,
      soil_ph,
      calibration_version,
      is_simulated = false,
      quality_status = 'valid'
    } = payload;

    // 1. Mandatory Identifiers
    if (!device_id || typeof device_id !== 'string') {
      errors.push('Missing or invalid device_id (string expected)');
    }
    if (!event_id || typeof event_id !== 'string') {
      errors.push('Missing or invalid event_id (string or UUID expected)');
    }

    // 2. Duplicate Detection (Idempotency)
    if (event_id && storage.hasEventId(event_id)) {
      return {
        success: false,
        statusCode: 409,
        error: 'DUPLICATE_EVENT_ID',
        message: `Reading with event_id '${event_id}' has already been ingested.`,
        duplicates: 1
      };
    }

    // 3. Observed Timestamp Validation
    let observedDate;
    if (!observed_at) {
      observedDate = new Date();
    } else {
      observedDate = new Date(observed_at);
      if (isNaN(observedDate.getTime())) {
        errors.push(`Invalid timestamp format for observed_at: ${observed_at}`);
      }
    }

    // 4. Physical Numeric Range Checks
    if (soil_moisture_vwc !== undefined && soil_moisture_vwc !== null) {
      const vwc = Number(soil_moisture_vwc);
      if (isNaN(vwc) || vwc < 0.0 || vwc > 1.0) {
        errors.push(`soil_moisture_vwc out of physical range [0.0, 1.0]: ${soil_moisture_vwc}`);
      }
    }

    if (soil_temp_c !== undefined && soil_temp_c !== null) {
      const st = Number(soil_temp_c);
      if (isNaN(st) || st < -10 || st > 65) {
        errors.push(`soil_temp_c out of realistic soil temperature range [-10°C, 65°C]: ${soil_temp_c}`);
      }
    }

    if (air_temp_c !== undefined && air_temp_c !== null) {
      const at = Number(air_temp_c);
      if (isNaN(at) || at < -20 || at > 60) {
        errors.push(`air_temp_c out of range [-20°C, 60°C]: ${air_temp_c}`);
      }
    }

    if (relative_humidity_pct !== undefined && relative_humidity_pct !== null) {
      const rh = Number(relative_humidity_pct);
      if (isNaN(rh) || rh < 0 || rh > 100) {
        errors.push(`relative_humidity_pct out of range [0%, 100%]: ${relative_humidity_pct}`);
      }
    }

    if (soil_ph !== undefined && soil_ph !== null) {
      const ph = Number(soil_ph);
      if (isNaN(ph) || ph < 0 || ph > 14) {
        errors.push(`soil_ph out of physical chemical scale [0, 14]: ${soil_ph}`);
      }
    }

    // If validation failed, reject with 422 Unprocessable Entity
    if (errors.length > 0) {
      return {
        success: false,
        statusCode: 422,
        error: 'VALIDATION_FAILED',
        errors
      };
    }

    // Resolve field_id associated with device
    const devices = storage.getDevices();
    const matchedDevice = devices.find((d) => d.id === device_id);
    const field_id = matchedDevice ? matchedDevice.field_id : 'field-godagari-a';

    // Store reading
    const newRecord = {
      device_id,
      field_id,
      event_id,
      observed_at: observedDate.toISOString(),
      soil_moisture_vwc: soil_moisture_vwc !== undefined ? Number(soil_moisture_vwc) : null,
      soil_temp_c: soil_temp_c !== undefined ? Number(soil_temp_c) : null,
      air_temp_c: air_temp_c !== undefined ? Number(air_temp_c) : null,
      relative_humidity_pct: relative_humidity_pct !== undefined ? Number(relative_humidity_pct) : null,
      soil_ph: soil_ph !== undefined ? Number(soil_ph) : null,
      calibration_version: calibration_version || 'cal-fdr-2026.1',
      quality_status: quality_status || 'valid',
      is_simulated: Boolean(is_simulated), // Always enforce honest boolean label
      raw_payload: payload.raw_payload || null
    };

    const saved = storage.addReading(newRecord);

    return {
      success: true,
      statusCode: 201,
      message: 'Reading successfully ingested.',
      accepted: 1,
      duplicates: 0,
      reading: saved
    };
  }
}

module.exports = new SensorService();
