/**
 * AgriSense Fusion - NASA POWER Meteorological Ingestion Service
 * 
 * Target: https://power.larc.nasa.gov/api/temporal/daily/point
 * Parameters: T2M, T2M_MAX, T2M_MIN, RH2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR, WS10M
 * 
 * Rules:
 * 1. Missing values (-999 in NASA POWER) must NEVER be treated as zero.
 * 2. Proper caching to avoid requesting NASA on every page render.
 * 3. Transparently report source status (live vs fallback demo).
 */

const storage = new StorageServiceInstance(); // Will require instance
const https = require('https');

// Helper for formatted dates YYYYMMDD
function formatDateToYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatDateToISO(dateStr) {
  // 20261001 -> 2026-10-01
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

// Fallback historical demonstration dataset if live NASA request times out or is unreachable
function getDemonstrationFallbackData(lat, lon, startDateStr, endDateStr) {
  const days = [
    { date: '2026-09-22', t2m: 29.41, t2m_max: 33.2, t2m_min: 25.8, rh2m: 83.5, solar_mj: 11.09, precip_mm: 3.58, ws10m: 2.62 },
    { date: '2026-09-23', t2m: 28.03, t2m_max: 31.8, t2m_min: 25.1, rh2m: 88.6, solar_mj: 8.52, precip_mm: 8.24, ws10m: 3.79 },
    { date: '2026-09-24', t2m: 26.51, t2m_max: 29.5, t2m_min: 24.3, rh2m: 93.2, solar_mj: 11.63, precip_mm: 14.28, ws10m: 4.33 },
    { date: '2026-09-25', t2m: 26.26, t2m_max: 30.1, t2m_min: 24.0, rh2m: 94.1, solar_mj: 14.99, precip_mm: 7.42, ws10m: 5.39 },
    { date: '2026-09-26', t2m: 27.82, t2m_max: 32.4, t2m_min: 24.8, rh2m: 88.4, solar_mj: 16.88, precip_mm: 6.65, ws10m: 4.05 },
    { date: '2026-09-27', t2m: 28.28, t2m_max: 33.0, t2m_min: 25.0, rh2m: 85.0, solar_mj: 17.32, precip_mm: 1.14, ws10m: 1.51 },
    { date: '2026-09-28', t2m: 28.34, t2m_max: 33.5, t2m_min: 25.2, rh2m: 83.0, solar_mj: 18.53, precip_mm: 0.66, ws10m: 1.97 }
  ];

  return {
    source: 'SIMULATED_DEMO_FALLBACK',
    isRealNasaData: false,
    sourceStatus: 'simulated_fallback',
    attribution: 'Demonstration synthetic dataset (NASA POWER live endpoint timed out or unavailable)',
    latitude: lat,
    longitude: lon,
    fetchedAt: new Date().toISOString(),
    records: days,
    latest: days[days.length - 1],
    warnings: [
      'LIVE NASA POWER API call was unreachable or timed out.',
      'Displaying clearly labelled fallback demonstration records for uninterrupted review.'
    ]
  };
}

class NasaService {
  constructor(storageService) {
    this.storage = storageService;
    this.cacheTTLMs = 60 * 60 * 1000; // 1 hour cache
  }

  /**
   * Fetch daily agroclimatology data from NASA POWER
   */
  async fetchDailyWeather(lat = 24.469, lon = 88.330, daysBack = 14) {
    // NASA POWER has 3-4 days publication latency
    const now = new Date();
    const end = new Date(now.getTime() - 3 * 24 * 3600 * 1000);
    const start = new Date(end.getTime() - daysBack * 24 * 3600 * 1000);

    const startStr = formatDateToYYYYMMDD(start);
    const endStr = formatDateToYYYYMMDD(end);

    const cacheKey = `nasa_${lat.toFixed(3)}_${lon.toFixed(3)}_${startStr}_${endStr}`;
    const cached = this.storage.getCachedNasa(cacheKey);

    if (cached && (Date.now() - new Date(cached.cachedAt).getTime() < this.cacheTTLMs)) {
      return {
        ...cached.data,
        isFromCache: true
      };
    }

    const params = 'T2M,T2M_MAX,T2M_MIN,RH2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR,WS10M';
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${params}&community=AG&longitude=${lon}&latitude=${lat}&start=${startStr}&end=${endStr}&format=JSON`;

    try {
      const responseData = await this._makeHttpRequest(url, 10000);
      const parsed = this._parseNasaPayload(responseData, lat, lon);

      // Cache successful response
      this.storage.setCachedNasa(cacheKey, parsed);
      return parsed;
    } catch (err) {
      console.warn(`NASA POWER API request failed: ${err.message}. Falling back to labelled demo data.`);
      const fallback = getDemonstrationFallbackData(lat, lon, startStr, endStr);
      fallback.networkError = err.message;
      return fallback;
    }
  }

  _makeHttpRequest(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`NASA POWER API returned status code ${res.statusCode}`));
        }
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error(`Invalid JSON received from NASA API: ${e.message}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error(`NASA API request timed out after ${timeoutMs}ms`));
      });
    });
  }

  _parseNasaPayload(json, lat, lon) {
    const properties = json?.properties || {};
    const parameter = properties.parameter || {};

    const t2mMap = parameter.T2M || {};
    const t2mMaxMap = parameter.T2M_MAX || {};
    const t2mMinMap = parameter.T2M_MIN || {};
    const rh2mMap = parameter.RH2M || {};
    const solarMap = parameter.ALLSKY_SFC_SW_DWN || {};
    const precipMap = parameter.PRECTOTCORR || {};
    const ws10mMap = parameter.WS10M || {};

    const dates = Object.keys(t2mMap).sort();
    const records = [];
    const missingValueFlag = -999;

    for (const dateKey of dates) {
      const cleanVal = (val) => (val === missingValueFlag || val === undefined || isNaN(val) ? null : val);

      const record = {
        date: formatDateToISO(dateKey),
        rawDate: dateKey,
        t2m: cleanVal(t2mMap[dateKey]),
        t2m_max: cleanVal(t2mMaxMap[dateKey]),
        t2m_min: cleanVal(t2mMinMap[dateKey]),
        rh2m: cleanVal(rh2mMap[dateKey]),
        solar_mj: cleanVal(solarMap[dateKey]),
        precip_mm: cleanVal(precipMap[dateKey]),
        ws10m: cleanVal(ws10mMap[dateKey]),
        source_status: 'valid'
      };

      records.push(record);
    }

    const latest = records.length > 0 ? records[records.length - 1] : null;

    return {
      source: 'NASA_POWER',
      isRealNasaData: true,
      sourceStatus: 'valid',
      attribution: 'NASA Langley Research Center POWER Project (Agroclimatology Daily Methodology)',
      latitude: lat,
      longitude: lon,
      elevation_m: properties?.elevation || null,
      fetchedAt: new Date().toISOString(),
      recordCount: records.length,
      records,
      latest,
      units: {
        t2m: '°C',
        rh2m: '%',
        solar_mj: 'MJ/m²/day',
        precip_mm: 'mm/day',
        ws10m: 'm/s'
      },
      warnings: []
    };
  }
}

function StorageServiceInstance() {
  return require('../storage/storageService');
}

module.exports = new NasaService(require('../storage/storageService'));
