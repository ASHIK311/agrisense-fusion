/**
 * AgriSense Fusion - Open Hydrology & Terrain API Proxy Service
 * Integrates verifiable public hydrological data streams with strict offline gates:
 *   1. Open-Meteo NWP 7-Day Agro-Hydrology Forecast (rainfall, FAO ET0, wind, surface soil moisture)
 *   2. Open-Meteo GloFAS River Discharge (Padma / Mahananda basin context)
 *   3. AWS Open Data Terrarium 30m DEM Tile Decoder (West->East elevation transect & slope bins)
 *
 * Scientific Integrity Rule: Never fabricate forecast, river discharge, or DEM values on failure.
 */

const https = require('https');
const zlib = require('zlib');

const SLOPE_BINS = [
  { label: '0°', min: 0, max: 1 },
  { label: '1°', min: 1, max: 2 },
  { label: '2°', min: 2, max: 4 },
  { label: '4°', min: 4, max: 6 },
  { label: '6°', min: 6, max: 10 },
  { label: '10°', min: 10, max: 15 },
  { label: '15°', min: 15, max: 25 },
  { label: '25°+', min: 25, max: Infinity },
];

class HydrologyApiService {
  constructor() {
    this.cache = new Map();
    this.cacheTtlMs = 60 * 60 * 1000; // 1 hour
  }

  _getCached(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  _setCached(key, data) {
    this.cache.set(key, { ts: Date.now(), data });
  }

  _httpGetBuffer(url, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: timeoutMs }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this._httpGetBuffer(res.headers.location, timeoutMs).then(resolve, reject);
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error(`Upstream HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Upstream HTTP request timed out'));
      });
    });
  }

  async _httpGetJson(url, timeoutMs = 8000) {
    const buf = await this._httpGetBuffer(url, timeoutMs);
    return JSON.parse(buf.toString('utf8'));
  }

  /**
   * 1. Open-Meteo 7-Day Agro-Hydrology NWP Forecast
   */
  async fetchHydrologyForecast(lat = 24.469, lon = 88.330) {
    const key = `om_fc_${Number(lat).toFixed(3)}_${Number(lon).toFixed(3)}`;
    const cached = this._getCached(key);
    if (cached) return { ...cached, cached: true };

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      `&daily=precipitation_sum,et0_fao_evapotranspiration,wind_speed_10m_max,temperature_2m_max,temperature_2m_min` +
      `&hourly=soil_moisture_0_to_7cm&forecast_days=7&timezone=auto`;

    try {
      const json = await this._httpGetJson(url);
      const daily = json.daily || {};
      const times = daily.time || [];
      const hourlyMoist = json.hourly?.soil_moisture_0_to_7cm || [];

      const records = times.map((date, idx) => {
        // Average 24 hourly soil moisture points per forecast day if present
        const slice = hourlyMoist.slice(idx * 24, (idx + 1) * 24).filter((v) => v !== null && v !== undefined);
        const avgSm = slice.length > 0 ? Number((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(3)) : null;

        return {
          date,
          precip_mm: Number((daily.precipitation_sum?.[idx] ?? 0).toFixed(2)),
          et0_mm: Number((daily.et0_fao_evapotranspiration?.[idx] ?? 0).toFixed(2)),
          wind_max_ms: Number((((daily.wind_speed_10m_max?.[idx] ?? 0) * 1000) / 3600).toFixed(2)),
          wind_max_kmh: Number((daily.wind_speed_10m_max?.[idx] ?? 0).toFixed(1)),
          t_max_c: daily.temperature_2m_max?.[idx] ?? null,
          t_min_c: daily.temperature_2m_min?.[idx] ?? null,
          surface_sm_m3m3: avgSm,
        };
      });

      const totalRain7d = Number(records.reduce((s, r) => s + r.precip_mm, 0).toFixed(1));
      const totalEt07d = Number(records.reduce((s, r) => s + r.et0_mm, 0).toFixed(1));

      const payload = {
        available: true,
        source: 'OPEN_METEO_NWP_FORECAST',
        attribution: 'Open-Meteo NWP Agro-Hydrology Forecast (ECMWF/GFS blend)',
        provenance_disclosure: 'Live 7-day NWP model forecast, distinct from historical NASA POWER reanalysis.',
        latitude: Number(lat),
        longitude: Number(lon),
        summary: {
          total_rain_7d_mm: totalRain7d,
          total_et0_7d_mm: totalEt07d,
          net_moisture_balance_7d_mm: Number((totalRain7d - totalEt07d).toFixed(1)),
        },
        records,
        fetched_at: new Date().toISOString(),
      };
      this._setCached(key, payload);
      return payload;
    } catch (err) {
      return {
        available: false,
        source: 'OPEN_METEO_NWP_FORECAST',
        error: err.message || 'Open-Meteo forecast unreachable',
        records: [],
      };
    }
  }

  /**
   * 2. Open-Meteo GloFAS River Discharge (Surface Basin Context)
   */
  async fetchRiverDischarge(lat = 24.469, lon = 88.330) {
    const key = `glofas_${Number(lat).toFixed(3)}_${Number(lon).toFixed(3)}`;
    const cached = this._getCached(key);
    if (cached) return { ...cached, cached: true };

    const url =
      `https://flood-api.open-meteo.com/v1/flood?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      `&daily=river_discharge,river_discharge_mean&past_days=14&forecast_days=7`;

    try {
      const json = await this._httpGetJson(url);
      const daily = json.daily || {};
      const times = daily.time || [];
      const records = times
        .map((date, idx) => ({
          date,
          discharge_m3s: daily.river_discharge?.[idx] ?? null,
          mean_m3s: daily.river_discharge_mean?.[idx] ?? null,
        }))
        .filter((r) => r.discharge_m3s !== null);

      const values = records.map((r) => r.discharge_m3s);
      const latest = records[records.length - 1] || null;
      const peak = values.length > 0 ? Math.max(...values) : null;

      const payload = {
        available: records.length > 0,
        source: 'OPEN_METEO_GLOFAS',
        attribution: 'Copernicus GloFAS v4 River Discharge via Open-Meteo Flood API',
        provenance_disclosure: 'Gridded ~5 km basin river discharge index; reflects nearest river routing cell rather than an in-situ BWDB gauge.',
        latitude: Number(lat),
        longitude: Number(lon),
        summary: {
          latest_m3s: latest?.discharge_m3s ?? null,
          mean_m3s: latest?.mean_m3s ?? null,
          peak_window_m3s: peak,
        },
        records,
        fetched_at: new Date().toISOString(),
      };
      this._setCached(key, payload);
      return payload;
    } catch (err) {
      return {
        available: false,
        source: 'OPEN_METEO_GLOFAS',
        error: err.message || 'GloFAS flood API unreachable',
        records: [],
      };
    }
  }

  /**
   * 3. AWS Open Data Terrarium 30m DEM Profile & Slope Histogram
   */
  async fetchDemProfile(lat = 24.469, lon = 88.330) {
    const key = `dem_${Number(lat).toFixed(3)}_${Number(lon).toFixed(3)}`;
    const cached = this._getCached(key);
    if (cached) return { ...cached, cached: true };

    const z = 12;
    const n = 2 ** z;
    const latRad = (Number(lat) * Math.PI) / 180;
    const xExact = ((Number(lon) + 180) / 360) * n;
    const yExact = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

    const xTile = Math.floor(xExact);
    const yTile = Math.floor(yExact);
    const px = Math.min(255, Math.max(0, Math.floor((xExact - xTile) * 256)));
    const py = Math.min(255, Math.max(0, Math.floor((yExact - yTile) * 256)));

    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${xTile}/${yTile}.png`;

    try {
      const pngBuffer = await this._httpGetBuffer(url, 8000);
      const { width, height, rgb } = decodePngRgb(pngBuffer);
      const pixelMeters = (156543.03392 * Math.cos(latRad)) / n; // ~34.8 m at 24.47 deg N, z=12

      const half = 24;
      const startX = Math.max(0, Math.min(width - half * 2, px - half));
      const startY = Math.max(0, Math.min(height - half * 2, py - half));
      const size = half * 2;

      const grid = [];
      for (let r = 0; r < size; r++) {
        const row = [];
        for (let c = 0; c < size; c++) {
          const idx = ((startY + r) * width + (startX + c)) * 3;
          const elev = rgb[idx] * 256 + rgb[idx + 1] + rgb[idx + 2] / 256 - 32768;
          row.push(Number(elev.toFixed(2)));
        }
        grid.push(row);
      }

      const terrain = computeTerrainMetricsFromGrid(grid, pixelMeters);
      const payload = {
        available: true,
        source: 'AWS_TERRARIUM_SRTM_DEM',
        attribution: 'AWS Open Data Terrain Tiles (Terrarium / SRTM 30m)',
        provenance_disclosure: `Zoom-12 DEM transect (~${(size * pixelMeters / 1000).toFixed(2)} km × ${(size * pixelMeters / 1000).toFixed(2)} km centered at ${Number(lat).toFixed(4)}°N, ${Number(lon).toFixed(4)}°E, ${pixelMeters.toFixed(1)} m/pixel).`,
        latitude: Number(lat),
        longitude: Number(lon),
        pixel_size_m: Number(pixelMeters.toFixed(2)),
        ...terrain,
        fetched_at: new Date().toISOString(),
      };
      this._setCached(key, payload);
      return payload;
    } catch (err) {
      return {
        available: false,
        source: 'AWS_TERRARIUM_SRTM_DEM',
        reason: 'DEM_TILES_UNREACHABLE',
        error: err.message || 'Unable to download Terrarium elevation tiles',
      };
    }
  }
}

/**
 * Pure Node PNG decoder supporting RGB (colorType 2) & RGBA (colorType 6), 8-bit non-interlaced.
 */
function decodePngRgb(buffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(sig)) {
    throw new Error('Invalid PNG signature');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === 'IHDR') {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4; // skip CRC
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Unsupported PNG format (bitDepth=${bitDepth}, colorType=${colorType})`);
  }

  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const raw = Buffer.alloc(height * stride);

  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };

  for (let y = 0; y < height; y++) {
    const filter = inflated[y * (stride + 1)];
    const srcRow = y * (stride + 1) + 1;
    const dstRow = y * stride;

    for (let x = 0; x < stride; x++) {
      const val = inflated[srcRow + x];
      const left = x >= bpp ? raw[dstRow + x - bpp] : 0;
      const up = y > 0 ? raw[dstRow - stride + x] : 0;
      const upLeft = x >= bpp && y > 0 ? raw[dstRow - stride + x - bpp] : 0;

      let recon = val;
      if (filter === 1) recon = (val + left) & 0xff;
      else if (filter === 2) recon = (val + up) & 0xff;
      else if (filter === 3) recon = (val + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) recon = (val + paeth(left, up, upLeft)) & 0xff;

      raw[dstRow + x] = recon;
    }
  }

  if (bpp === 3) return { width, height, rgb: raw };

  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0, j = 0; i < raw.length; i += 4, j += 3) {
    rgb[j] = raw[i];
    rgb[j + 1] = raw[i + 1];
    rgb[j + 2] = raw[i + 2];
  }
  return { width, height, rgb };
}

/**
 * Compute center West->East elevation cross-section & slope histogram from a 2D elevation grid.
 */
function computeTerrainMetricsFromGrid(grid, pixelMeters = 35) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  if (rows < 3 || cols < 3) {
    throw new Error('Elevation grid too small for slope calculation');
  }

  const midRowIdx = Math.floor(rows / 2);
  const halfWidthKm = ((cols - 1) * pixelMeters) / 2000;
  const centreProfile = grid[midRowIdx].map((elevM, idx) => ({
    distanceKm: Number((-halfWidthKm + (idx * pixelMeters) / 1000).toFixed(2)),
    elevationM: Number(elevM.toFixed(1)),
  }));

  const slopes = [];
  const allElevs = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      allElevs.push(grid[r][c]);
      if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1) {
        const dzdx = (grid[r][c + 1] - grid[r][c - 1]) / (2 * pixelMeters);
        const dzdy = (grid[r + 1][c] - grid[r - 1][c]) / (2 * pixelMeters);
        const slopeDeg = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
        slopes.push(slopeDeg);
      }
    }
  }

  const sortedSlopes = [...slopes].sort((a, b) => a - b);
  const meanSlopeDeg = slopes.reduce((a, b) => a + b, 0) / slopes.length;
  const p90SlopeDeg = sortedSlopes[Math.min(sortedSlopes.length - 1, Math.floor(sortedSlopes.length * 0.9))];
  const minM = Math.min(...allElevs);
  const maxM = Math.max(...allElevs);
  const meanElev = allElevs.reduce((a, b) => a + b, 0) / allElevs.length;
  const roughnessM = Math.sqrt(allElevs.reduce((acc, v) => acc + (v - meanElev) ** 2, 0) / allElevs.length);

  const counts = SLOPE_BINS.map(() => 0);
  for (const s of slopes) {
    const binIdx = SLOPE_BINS.findIndex((b) => s >= b.min && s < b.max);
    if (binIdx >= 0) counts[binIdx] += 1;
  }

  const slopeHistogram = SLOPE_BINS.map((b, i) => ({
    bin: b.label,
    pct: Number(((counts[i] / slopes.length) * 100).toFixed(1)),
    count: counts[i],
  }));

  return {
    centreProfile,
    slopeHistogram,
    stats: {
      minM: Number(minM.toFixed(1)),
      maxM: Number(maxM.toFixed(1)),
      reliefM: Number((maxM - minM).toFixed(1)),
      meanSlopeDeg: Number(meanSlopeDeg.toFixed(2)),
      p90SlopeDeg: Number(p90SlopeDeg.toFixed(2)),
      roughnessM: Number(roughnessM.toFixed(2)),
    },
  };
}

const instance = new HydrologyApiService();
instance.decodePngRgb = decodePngRgb;
instance.computeTerrainMetricsFromGrid = computeTerrainMetricsFromGrid;

module.exports = instance;
