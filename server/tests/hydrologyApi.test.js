/**
 * Unit tests for Hydrology PNG DEM decoding & terrain slope metrics
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');

const hydrologyApi = require('../services/hydrologyApiService');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function buildTestRgbPng(width, height, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 2; // RGB

  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter 0
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y);
      const idx = y * stride + 1 + x * 3;
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', idat), makeChunk('IEND', Buffer.alloc(0))]);
}

test('Hydrology API Service: PNG RGB decoder & Terrarium elevation math', () => {
  // Terrarium elevation 32m -> (32 + 32768) = 32800 -> R=128 (128*256=32768), G=32, B=0
  const png = buildTestRgbPng(4, 4, () => [128, 32, 0]);
  const decoded = hydrologyApi.decodePngRgb(png);
  assert.equal(decoded.width, 4);
  assert.equal(decoded.height, 4);
  const elev = decoded.rgb[0] * 256 + decoded.rgb[1] + decoded.rgb[2] / 256 - 32768;
  assert.equal(elev, 32);
});

test('Hydrology API Service: computes West->East profile & 8 slope bins accurately', () => {
  // Build a 10x10 synthetic sloped ramp (2m drop/rise per cell across 35m pixel)
  const grid = Array.from({ length: 10 }, (_, r) =>
    Array.from({ length: 10 }, (_, c) => 20 + c * 2.5 + r * 0.4)
  );
  const res = hydrologyApi.computeTerrainMetricsFromGrid(grid, 35);
  assert.equal(res.centreProfile.length, 10);
  assert.equal(res.slopeHistogram.length, 8);
  assert.equal(res.stats.minM, 20);
  assert.ok(res.stats.reliefM > 20);
  assert.ok(res.stats.meanSlopeDeg > 3.5 && res.stats.meanSlopeDeg < 5.0);
  const totalPct = res.slopeHistogram.reduce((acc, b) => acc + b.pct, 0);
  assert.ok(Math.abs(totalPct - 100) <= 0.5);
});
