import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RotateCcw, Pause, Play, Eye } from 'lucide-react';
import { CROP_3D_SPECS } from './cropSpecs';

export { CROP_3D_SPECS };

function seededNoise(i, salt = 1) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Reference-counted Bounded LRU GPU Texture Cache (max 18 entries).
 * Prevents memory leaks while preserving textures shared across active scenes.
 */
class BoundedTextureLRU {
  constructor(maxEntries = 18) {
    this.maxEntries = maxEntries;
    this.map = new Map();
    this.evicted = new Set();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  disposePayload(payload) {
    if (!payload) return;
    if (typeof payload.dispose === 'function') {
      payload.dispose();
    } else if (Array.isArray(payload)) {
      payload.forEach((t) => t?.dispose?.());
    } else if (typeof payload === 'object') {
      Object.values(payload).forEach((t) => t?.dispose?.());
    }
  }

  acquire(key, creator) {
    if (this.map.has(key)) {
      const entry = this.map.get(key);
      // Promote to most-recently-used tail
      this.map.delete(key);
      this.map.set(key, entry);
      entry.refCount += 1;
      this.stats.hits += 1;
      return {
        value: entry.value,
        release: () => this.releaseEntry(entry),
      };
    }

    this.stats.misses += 1;
    const value = creator();
    const entry = { key, value, refCount: 1, stale: false };
    this.map.set(key, entry);
    this.evictOverflow();

    return {
      value,
      release: () => this.releaseEntry(entry),
    };
  }

  evictOverflow() {
    while (this.map.size > this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      const oldest = this.map.get(oldestKey);
      this.map.delete(oldestKey);
      oldest.stale = true;
      this.stats.evictions += 1;
      if (oldest.refCount <= 0) {
        this.disposePayload(oldest.value);
      } else {
        this.evicted.add(oldest);
      }
    }
  }

  releaseEntry(entry) {
    entry.refCount = Math.max(0, entry.refCount - 1);
    if (entry.stale && entry.refCount === 0) {
      this.evicted.delete(entry);
      this.disposePayload(entry.value);
    }
  }

  purgeAll() {
    this.map.forEach((entry) => this.disposePayload(entry.value));
    this.map.clear();
    this.evicted.forEach((entry) => this.disposePayload(entry.value));
    this.evicted.clear();
  }
}

const SHARED_TEXTURE_CACHE = new BoundedTextureLRU(18);

/**
 * Generates procedural 512x512 Soil Pedon Stratigraphy + Bump CanvasTextures
 * showing A-horizon organic topsoil, Barind ferric clay B-horizon, and capillary wetting front.
 */
function createSoilPedonTextures(moistureNorm, isSoilDisease) {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  // Stratified gradient (top to bottom)
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  const topTone = moistureNorm > 0.65 ? '#261d17' : '#3d2f24';
  const midTone = isSoilDisease ? '#6b2c1a' : '#573d2c';
  const deepTone = moistureNorm > 0.5 ? '#25353d' : '#3a2b22';
  grad.addColorStop(0.0, topTone);
  grad.addColorStop(0.24, '#473629');
  grad.addColorStop(0.58, midTone);
  grad.addColorStop(1.0, deepTone);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Micro soil aggregates, ferric mottles & organic pore grains
  for (let i = 0; i < 6500; i++) {
    const x = seededNoise(i, 1) * size;
    const y = seededNoise(i, 2) * size;
    const r = 0.8 + seededNoise(i, 3) * 3.2;
    const shade = seededNoise(i, 4);

    if (y < size * 0.25) {
      ctx.fillStyle = shade > 0.5 ? 'rgba(24, 18, 14, 0.42)' : 'rgba(92, 74, 54, 0.30)';
    } else if (y < size * 0.7) {
      ctx.fillStyle = shade > 0.7 ? 'rgba(138, 86, 52, 0.24)' : 'rgba(35, 25, 19, 0.34)';
    } else {
      ctx.fillStyle = moistureNorm > 0.45
        ? 'rgba(38, 84, 102, 0.28)'
        : 'rgba(28, 22, 18, 0.38)';
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    const bv = Math.floor(90 + shade * 115);
    bCtx.fillStyle = `rgba(${bv}, ${bv}, ${bv}, 0.5)`;
    bCtx.beginPath();
    bCtx.arc(x, y, r * 0.9, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Subtle horizontal horizon demarcation lines + fine root pore fissures
  ctx.strokeStyle = 'rgba(20, 14, 10, 0.38)';
  ctx.lineWidth = 1.5;
  [0.24, 0.58].forEach((frac) => {
    ctx.beginPath();
    for (let x = 0; x <= size; x += 16) {
      const y = size * frac + Math.sin(x * 0.03) * 6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = 4;

  return { map, bumpMap };
}

/**
 * Generates procedural topsoil surface crust + mulch / puddle texture
 */
function createTopSurfaceTexture(moistureNorm, isFloodedRice) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = isFloodedRice || moistureNorm > 0.72 ? '#232824' : '#3b2e22';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4200; i++) {
    const x = seededNoise(i, 11) * size;
    const y = seededNoise(i, 12) * size;
    const r = 1 + seededNoise(i, 13) * 4.5;
    const v = seededNoise(i, 14);
    ctx.fillStyle = v > 0.6
      ? 'rgba(84, 67, 47, 0.32)'
      : v > 0.25
        ? 'rgba(24, 20, 16, 0.36)'
        : 'rgba(116, 98, 68, 0.18)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle moist paddy glint patches when flooded/boro
  if (isFloodedRice || moistureNorm > 0.7) {
    for (let p = 0; p < 18; p++) {
      const px = seededNoise(p, 21) * size;
      const py = seededNoise(p, 22) * size;
      const pr = 26 + seededNoise(p, 23) * 44;
      const rg = ctx.createRadialGradient(px, py, 2, px, py, pr);
      rg.addColorStop(0, 'rgba(56, 128, 148, 0.28)');
      rg.addColorStop(1, 'rgba(56, 128, 148, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Generates veined botanical leaf texture + realistic blast/necrotic lesion spots when stressed
 */
function createLeafTexture(stressRisk = 0, pathway = 'foliar_canopy_wetness') {
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Natural leaf chlorophyll gradient (darker near base, brighter sunlit tip)
  const g = ctx.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, '#a8b8a0');
  g.addColorStop(0.5, '#d6e5cb');
  g.addColorStop(1, '#f3f7e0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Midrib & parallel longitudinal vascular veins
  ctx.fillStyle = 'rgba(255, 255, 240, 0.35)';
  ctx.fillRect(w * 0.48, 0, w * 0.04, h);
  ctx.strokeStyle = 'rgba(20, 45, 20, 0.14)';
  ctx.lineWidth = 1;
  for (let vx = 10; vx < w; vx += 9) {
    ctx.beginPath();
    ctx.moveTo(vx, h);
    ctx.lineTo(vx, 0);
    ctx.stroke();
  }

  // Organic fungal / viral lesions instead of cartoon circles
  if (stressRisk >= 0.45) {
    const lesionCount = Math.floor(8 + stressRisk * 18);
    for (let i = 0; i < lesionCount; i++) {
      const lx = 18 + seededNoise(i, 51) * (w - 36);
      const ly = 20 + seededNoise(i, 52) * (h * 0.72);
      const rx = 5 + seededNoise(i, 53) * 9;
      const ry = 10 + seededNoise(i, 54) * 18;
      // Chlorotic yellow halo
      ctx.fillStyle = pathway === 'soil_borne_root_vascular'
        ? 'rgba(217, 119, 6, 0.55)'
        : 'rgba(234, 179, 8, 0.62)';
      ctx.beginPath();
      ctx.ellipse(lx, ly, rx * 1.4, ry * 1.35, 0, 0, Math.PI * 2);
      ctx.fill();
      // Necrotic gray-brown center (typical Magnaporthe / blast diamond lesion)
      ctx.fillStyle = 'rgba(68, 42, 28, 0.85)';
      ctx.beginPath();
      ctx.ellipse(lx, ly, rx * 0.75, ry * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tip burn / senescence at apex
    const tipGrad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
    tipGrad.addColorStop(0, 'rgba(161, 98, 7, 0.75)');
    tipGrad.addColorStop(1, 'rgba(161, 98, 7, 0)');
    ctx.fillStyle = tipGrad;
    ctx.fillRect(0, 0, w, h * 0.35);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Generates soft radial Gaussian mist/spore particle sprite
 */
function createMistSpriteTexture() {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  g.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  return t;
}

/**
 * Creates a natural parabolic-arched botanical leaf ribbon with central V-fold crease
 * anchored cleanly at y = 0.
 */
function createCurvedLeafGeometry({ length = 0.72, width = 0.065, arch = 0.34, droop = 0.22, segs = 10 }) {
  const geo = new THREE.PlaneGeometry(width, length, 2, segs);
  // Shift base from center to y = 0
  geo.translate(0, length / 2, 0);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, y / length)); // 0 at root base, 1 at tip

    // Taper width organically: narrow stem collar -> widest around 38% -> sharp tip
    const widthProfile = Math.sin(Math.pow(t, 0.75) * Math.PI) * 1.15 + (1 - t) * 0.16;
    const xTapered = x * Math.max(0.03, widthProfile);

    // Subtle V-fold crease down leaf midrib
    const vCrease = Math.abs(xTapered) * 0.22;

    // Outward parabolic arch + gravity tip droop
    const forwardZ = Math.pow(t, 1.35) * arch;
    const gravityY = y - Math.pow(t, 2.25) * droop;

    pos.setXYZ(i, xTapered, Math.max(0, gravityY), forwardZ + vCrease);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Injects GPU GLSL wind-wave vertex shader into MeshStandardMaterial:
 * keeps bases anchored at y <= 0.02 and applies organic travelling wind gusts across blades.
 */
function attachWindShader(material, timeUniform, gustAmp = 0.085) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform;
    shader.uniforms.uGustAmp = { value: gustAmp };

    shader.vertexShader = `
      uniform float uTime;
      uniform float uGustAmp;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vec4 wPos = instanceMatrix * vec4(transformed, 1.0);
      #else
        vec4 wPos = vec4(transformed, 1.0);
      #endif
      float heightFactor = pow(clamp(transformed.y, 0.0, 2.0), 1.55);
      float gust = sin(uTime * 1.85 + wPos.x * 1.7 + wPos.z * 1.25) * 0.65
                 + sin(uTime * 3.4 - wPos.z * 2.4 + wPos.x * 0.9) * 0.35;
      transformed.x += gust * uGustAmp * heightFactor;
      transformed.z += cos(uTime * 1.45 + wPos.x * 1.2) * uGustAmp * 0.55 * heightFactor;
      `
    );
  };
  material.customProgramCacheKey = () => `wind-${gustAmp.toFixed(3)}`;
  return material;
}

function createPlotScene(spec, stressState = null, timeUniform) {
  const scene = new THREE.Scene();
  const disposables = [];
  const track = (obj) => {
    disposables.push(obj);
    return obj;
  };

  // Studio + Solar Lighting (natural directional shadow + soft sky fill)
  const hemi = new THREE.HemisphereLight(0xdff5ff, 0x1a261f, 0.68);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff5e0, 2.15);
  sun.position.set(3.8, 6.4, 4.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 16;
  const d = 2.4;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x38bdf8, 0.48);
  rim.position.set(-3.5, 2.4, -4.2);
  scene.add(rim);

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const isStressed = Boolean(stressState && stressState.riskScore >= 0.45);
  const risk = stressState?.riskScore ?? 0;
  const pathway = stressState?.pathway || 'foliar_canopy_wetness';
  const moistureNorm = stressState?.soilMoistureVwc
    ? Math.min(1, Math.max(0, stressState.soilMoistureVwc / 0.45))
    : Math.max(0.25, 1 - spec.waterPull * 0.45);

  // 1. Dark Matte Lab Pedestal & Calibrated Scale Rings (receives realistic ground shadow)
  const pedDiscGeo = track(new THREE.CylinderGeometry(2.15, 2.22, 0.04, 64));
  const pedDiscMat = track(new THREE.MeshStandardMaterial({
    color: 0x09130f,
    roughness: 0.85,
    metalness: 0.15,
  }));
  const pedDisc = new THREE.Mesh(pedDiscGeo, pedDiscMat);
  pedDisc.position.y = -1.16;
  pedDisc.receiveShadow = true;
  rootGroup.add(pedDisc);

  // Subtle calibrated hydrologic pull ring flush on pedestal (Terracotta overdraft, Flare moderate, Cobalt/Sage balanced)
  const pullColor = spec.waterPull > 0.7 ? 0xe47a63 : spec.waterPull > 0.4 ? 0xf2c879 : 0x60a5fa;
  const pullRingGeo = track(new THREE.RingGeometry(1.52, 1.545 + spec.waterPull * 0.08, 64));
  const pullRingMat = track(new THREE.MeshBasicMaterial({
    color: pullColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.45,
  }));
  const pullRing = new THREE.Mesh(pullRingGeo, pullRingMat);
  pullRing.rotation.x = -Math.PI / 2;
  pullRing.position.y = -1.135;
  rootGroup.add(pullRing);

  // 2. High-Resolution Stratified Soil Pedon Block via Bounded LRU Cache
  const mBucket = Math.round(moistureNorm * 10);
  const soilDis = pathway === 'soil_borne_root_vascular' && isStressed;
  const soilCacheKey = `soil:${mBucket}:${soilDis ? 1 : 0}`;
  const soilHandle = SHARED_TEXTURE_CACHE.acquire(soilCacheKey, () =>
    createSoilPedonTextures(mBucket / 10, soilDis)
  );
  track({ dispose: soilHandle.release });
  const { map: strataMap, bumpMap: strataBump } = soilHandle.value;

  const isFlooded = spec.label.includes('Boro');
  const topCacheKey = `top:${mBucket}:${isFlooded ? 1 : 0}`;
  const topHandle = SHARED_TEXTURE_CACHE.acquire(topCacheKey, () =>
    createTopSurfaceTexture(mBucket / 10, isFlooded)
  );
  track({ dispose: topHandle.release });
  const topTex = topHandle.value;

  const sideMat = track(new THREE.MeshStandardMaterial({
    map: strataMap,
    bumpMap: strataBump,
    bumpScale: 0.032,
    roughness: 0.92,
    metalness: 0.02,
  }));
  const topMat = track(new THREE.MeshStandardMaterial({
    map: topTex,
    bumpMap: topTex,
    bumpScale: 0.02,
    roughness: isFlooded ? 0.42 : 0.90,
    metalness: isFlooded ? 0.12 : 0.0,
  }));
  const bottomMat = track(new THREE.MeshStandardMaterial({ color: 0x1e1713, roughness: 0.96 }));

  const pedonGeo = track(new THREE.BoxGeometry(2.38, 1.06, 2.38));
  const pedon = new THREE.Mesh(pedonGeo, [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat]);
  pedon.position.y = -0.54;
  pedon.castShadow = true;
  pedon.receiveShadow = true;
  rootGroup.add(pedon);

  // Museum-grade dark glass outer rhizosphere cutaway enclosure
  const casingGeo = track(new THREE.BoxGeometry(2.44, 1.07, 2.44));
  const casingMat = track(new THREE.MeshPhysicalMaterial({
    color: soilDis ? 0xe47a63 : 0x8fb4ea,
    transparent: true,
    opacity: 0.08,
    roughness: 0.15,
    metalness: 0.1,
    transmission: 0.35,
    depthWrite: false,
  }));
  const casing = new THREE.Mesh(casingGeo, casingMat);
  casing.position.y = -0.54;
  rootGroup.add(casing);

  // Crisp anodized edge wireframe around the pedon cutaway
  const edgeGeo = track(new THREE.EdgesGeometry(casingGeo));
  const edgeMat = track(new THREE.LineBasicMaterial({
    color: soilDis ? 0xe47a63 : 0x7cc8a0,
    transparent: true,
    opacity: 0.32,
  }));
  casing.add(new THREE.LineSegments(edgeGeo, edgeMat));

  // 3. Organic Curved Root Fibers along cutaway perimeter (visible behind glass edge)
  const rootMat = track(new THREE.MeshStandardMaterial({
    color: pathway === 'soil_borne_root_vascular' && isStressed ? 0x9a3412 : 0xd6c7ad,
    roughness: 0.72,
  }));
  const noduleMat = track(new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x059669,
    emissiveIntensity: 0.35,
    roughness: 0.45,
  }));
  const rootLen = 0.25 + spec.rootDepth * 0.68;

  for (let r = 0; r < 14; r++) {
    // Concentrate fine roots close to cutaway perimeter so they read cleanly on face
    const side = r % 4;
    const offset = (seededNoise(r, 71) - 0.5) * 1.9;
    const edgePos = 1.185;
    const rx = side === 0 ? offset : side === 1 ? -edgePos : side === 2 ? offset : edgePos;
    const rz = side === 0 ? edgePos : side === 1 ? offset : side === 2 ? -edgePos : offset;

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(rx, -0.02, rz),
      new THREE.Vector3(rx + (seededNoise(r, 72) - 0.5) * 0.12, -rootLen * 0.45, rz + (seededNoise(r, 73) - 0.5) * 0.12),
      new THREE.Vector3(rx + (seededNoise(r, 74) - 0.5) * 0.22, -rootLen, rz + (seededNoise(r, 75) - 0.5) * 0.22),
    ]);
    const tubeGeo = track(new THREE.TubeGeometry(curve, 8, 0.011, 5, false));
    const rootMesh = new THREE.Mesh(tubeGeo, rootMat);
    rootGroup.add(rootMesh);

    if (spec.style === 'pulse' && r % 2 === 0) {
      const nodGeo = track(new THREE.SphereGeometry(0.028, 8, 8));
      const nod = new THREE.Mesh(nodGeo, noduleMat);
      const pt = curve.getPoint(0.35 + seededNoise(r, 76) * 0.45);
      nod.position.copy(pt);
      rootGroup.add(nod);
    }
  }

  // 4. Organic Curved Canopy Foliage via High-Density InstancedMesh + Bounded LRU Leaf Texture
  const riskBucket = isStressed ? Math.max(5, Math.round(risk * 10)) : 0;
  const leafCacheKey = `leaf:${riskBucket}:${isStressed ? pathway : 'healthy'}`;
  const leafHandle = SHARED_TEXTURE_CACHE.acquire(leafCacheKey, () =>
    createLeafTexture(riskBucket / 10, pathway)
  );
  track({ dispose: leafHandle.release });
  const leafTex = leafHandle.value;
  const healthyBase = new THREE.Color(spec.canopyColor);
  const tipTint = new THREE.Color(spec.tipColor);
  const stressedColor = new THREE.Color(risk >= 0.72 ? 0xb45309 : 0x84a92c);

  const bladeMat = track(
    attachWindShader(
      new THREE.MeshStandardMaterial({
        map: leafTex,
        roughness: 0.54,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
      timeUniform,
      spec.style === 'maize' ? 0.075 : 0.11
    )
  );

  const headMat = track(
    attachWindShader(
      new THREE.MeshStandardMaterial({
        color: isStressed ? new THREE.Color(spec.headColor).lerp(new THREE.Color(0x92400e), 0.45) : spec.headColor,
        roughness: 0.62,
        metalness: 0.03,
      }),
      timeUniform,
      0.095
    )
  );

  const stalkMat = track(
    attachWindShader(
      new THREE.MeshStandardMaterial({
        color: isStressed ? 0x6b7f36 : 0x35693a,
        roughness: 0.68,
      }),
      timeUniform,
      spec.style === 'maize' ? 0.055 : 0.085
    )
  );

  const hillCount = spec.density;
  const dummy = new THREE.Object3D();
  const colorVar = new THREE.Color();

  if (spec.style === 'maize') {
    // Maize: Tall jointed stalks + arched broad ribbon leaves + cob ears + feathery branched tassel
    const stalkGeo = track(new THREE.CylinderGeometry(0.018, 0.028, 1.0, 7));
    stalkGeo.translate(0, 0.5, 0);
    const bladeGeo = track(createCurvedLeafGeometry({ length: 0.68, width: 0.095, arch: 0.42, droop: 0.28, segs: 10 }));
    const cobGeo = track(new THREE.CapsuleGeometry(0.026, 0.13, 5, 8));
    const tasselRayGeo = track(createCurvedLeafGeometry({ length: 0.24, width: 0.018, arch: 0.14, droop: 0.09, segs: 5 }));

    const stalks = new THREE.InstancedMesh(stalkGeo, stalkMat, hillCount);
    const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, hillCount * 6);
    const cobs = new THREE.InstancedMesh(cobGeo, headMat, hillCount);
    const tassels = new THREE.InstancedMesh(tasselRayGeo, headMat, hillCount * 4);
    [stalks, blades, cobs, tassels].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      rootGroup.add(m);
    });

    let bIdx = 0;
    let tIdx = 0;
    for (let i = 0; i < hillCount; i++) {
      const ang = i * 2.39996;
      const rad = Math.sqrt((i + 0.5) / hillCount) * 0.96;
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * rad;
      const h = (0.95 + seededNoise(i, 31) * 0.28) * spec.heightScale;

      dummy.position.set(px, 0, pz);
      dummy.rotation.set((seededNoise(i, 32) - 0.5) * 0.05, ang, (seededNoise(i, 33) - 0.5) * 0.05);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      stalks.setMatrixAt(i, dummy.matrix);

      // Spiraling broad ribbon leaves along stalk nodes
      for (let b = 0; b < 6; b++) {
        const nodeY = h * (0.24 + b * 0.115);
        dummy.position.set(px, nodeY, pz);
        dummy.rotation.set(0.28, ang + b * 2.25, 0);
        const s = 0.85 + seededNoise(bIdx, 34) * 0.28;
        dummy.scale.set(s, s * 0.82, s);
        dummy.updateMatrix();
        blades.setMatrixAt(bIdx, dummy.matrix);

        colorVar.copy(healthyBase).lerp(tipTint, seededNoise(bIdx, 35) * 0.55);
        if (isStressed) colorVar.lerp(stressedColor, Math.min(0.75, risk));
        blades.setColorAt(bIdx, colorVar);
        bIdx++;
      }

      // Ear / cob tucked neatly at mid-upper node
      dummy.position.set(px + Math.cos(ang + 1.2) * 0.045, h * 0.56, pz + Math.sin(ang + 1.2) * 0.045);
      dummy.rotation.set(0.45, ang + 1.2, 0.2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      cobs.setMatrixAt(i, dummy.matrix);

      // Feathery branched terminal tassel rays (replaces cone!)
      for (let t = 0; t < 4; t++) {
        dummy.position.set(px, h * 0.96, pz);
        dummy.rotation.set(-0.15, ang + t * (Math.PI / 2), 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        tassels.setMatrixAt(tIdx++, dummy.matrix);
      }
    }
    blades.instanceColor.needsUpdate = true;
  } else if (spec.style === 'mustard' || spec.style === 'pulse') {
    // Organic herbaceous canopy: slender curved stems, ovate compound leaves, micro-floret clusters
    const stemGeo = track(new THREE.CylinderGeometry(0.01, 0.018, 1.0, 6));
    stemGeo.translate(0, 0.5, 0);
    const leafGeo = track(createCurvedLeafGeometry({
      length: spec.style === 'pulse' ? 0.24 : 0.30,
      width: spec.style === 'pulse' ? 0.14 : 0.16,
      arch: 0.18,
      droop: 0.08,
      segs: 6,
    }));
    const floretGeo = track(new THREE.SphereGeometry(spec.style === 'mustard' ? 0.024 : 0.018, 6, 6));

    const stems = new THREE.InstancedMesh(stemGeo, stalkMat, hillCount * 2);
    const leaves = new THREE.InstancedMesh(leafGeo, bladeMat, hillCount * 8);
    const florets = new THREE.InstancedMesh(floretGeo, headMat, hillCount * 6);
    [stems, leaves, florets].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      rootGroup.add(m);
    });

    let sIdx = 0;
    let lIdx = 0;
    let fIdx = 0;
    for (let i = 0; i < hillCount; i++) {
      const ang = i * 2.39996;
      const rad = Math.sqrt((i + 0.5) / hillCount) * 0.98;
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * rad;
      const h = (0.72 + seededNoise(i, 41) * 0.32) * spec.heightScale;

      for (let st = 0; st < 2; st++) {
        dummy.position.set(px + st * 0.04, 0, pz - st * 0.03);
        dummy.rotation.set((st - 0.5) * 0.24, ang + st * 1.9, (st - 0.5) * 0.2);
        dummy.scale.set(1, h * (0.85 + st * 0.15), 1);
        dummy.updateMatrix();
        stems.setMatrixAt(sIdx++, dummy.matrix);
      }

      for (let lf = 0; lf < 8; lf++) {
        const ly = h * (0.22 + (lf / 8) * 0.72);
        dummy.position.set(px, ly, pz);
        dummy.rotation.set(0.35, ang + lf * 2.1, 0);
        const sc = 0.8 + seededNoise(lIdx, 42) * 0.45;
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        leaves.setMatrixAt(lIdx, dummy.matrix);

        colorVar.copy(healthyBase).lerp(tipTint, seededNoise(lIdx, 43) * 0.55);
        if (isStressed) colorVar.lerp(stressedColor, Math.min(0.75, risk));
        leaves.setColorAt(lIdx, colorVar);
        lIdx++;
      }

      for (let fl = 0; fl < 6; fl++) {
        const fa = ang + fl * 1.05;
        const fr = 0.04 + seededNoise(fIdx, 44) * 0.07;
        dummy.position.set(px + Math.cos(fa) * fr, h * (0.86 + seededNoise(fIdx, 45) * 0.18), pz + Math.sin(fa) * fr);
        dummy.rotation.set(0, fa, 0);
        const fs = 0.75 + seededNoise(fIdx, 46) * 0.6;
        dummy.scale.set(fs, fs, fs);
        dummy.updateMatrix();
        florets.setMatrixAt(fIdx++, dummy.matrix);
      }
    }
    leaves.instanceColor.needsUpdate = true;
  } else {
    // Rice & Wheat: Dense tillering tufts + arched grass blades + gracefully weighted drooping grain panicles
    const bladesPerHill = 7;
    const paniclesPerHill = 2;
    const bladeGeo = track(createCurvedLeafGeometry({
      length: spec.style === 'wheat' ? 0.54 : 0.72,
      width: 0.042,
      arch: 0.36,
      droop: 0.24,
      segs: 9,
    }));

    // Drooping arched grain panicle curve via TubeGeometry
    const pCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.26, 0.02),
      new THREE.Vector3(0, 0.42, 0.11),
      new THREE.Vector3(0, 0.36, 0.22),
    ]);
    const culmGeo = track(new THREE.CylinderGeometry(0.008, 0.013, 0.55, 5));
    culmGeo.translate(0, 0.275, 0);
    const panicleGeo = track(new THREE.TubeGeometry(pCurve, 10, spec.style === 'wheat' ? 0.018 : 0.014, 6, false));

    const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, hillCount * bladesPerHill);
    const culms = new THREE.InstancedMesh(culmGeo, stalkMat, hillCount * paniclesPerHill);
    const panicles = new THREE.InstancedMesh(panicleGeo, headMat, hillCount * paniclesPerHill);
    [blades, culms, panicles].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      rootGroup.add(m);
    });

    let bIdx = 0;
    let pIdx = 0;
    for (let i = 0; i < hillCount; i++) {
      const ang = i * 2.39996;
      const rad = Math.sqrt((i + 0.4) / hillCount) * 0.98;
      const px = Math.cos(ang) * rad;
      const pz = Math.sin(ang) * rad;
      const hillScale = (0.85 + seededNoise(i, 61) * 0.3) * spec.heightScale;

      for (let b = 0; b < bladesPerHill; b++) {
        const bAng = ang + b * 1.15 + seededNoise(bIdx, 62) * 0.4;
        dummy.position.set(px + Math.cos(bAng) * 0.02, 0, pz + Math.sin(bAng) * 0.02);
        dummy.rotation.set(0.08 + seededNoise(bIdx, 63) * 0.18, bAng, 0);
        const s = hillScale * (0.76 + seededNoise(bIdx, 64) * 0.38);
        dummy.scale.set(1, s, 1);
        dummy.updateMatrix();
        blades.setMatrixAt(bIdx, dummy.matrix);

        colorVar.copy(healthyBase).lerp(tipTint, seededNoise(bIdx, 65) * 0.65);
        if (isStressed) colorVar.lerp(stressedColor, Math.min(0.78, risk));
        blades.setColorAt(bIdx, colorVar);
        bIdx++;
      }

      for (let p = 0; p < paniclesPerHill; p++) {
        const pAng = ang + p * 2.8;
        dummy.position.set(px, 0, pz);
        dummy.rotation.set(0, pAng, 0);
        dummy.scale.set(1, hillScale, 1);
        dummy.updateMatrix();
        culms.setMatrixAt(pIdx, dummy.matrix);

        dummy.position.set(px, 0.48 * hillScale, pz);
        dummy.rotation.set(spec.style === 'wheat' ? -0.22 : 0.06, pAng, 0);
        dummy.scale.set(1, hillScale, 1);
        dummy.updateMatrix();
        panicles.setMatrixAt(pIdx, dummy.matrix);
        pIdx++;
      }
    }
    blades.instanceColor.needsUpdate = true;
  }

  // 5. Soft Volumetric Microclimate Mist / Vector Cloud (when Pathology stress active)
  let particleSystem = null;
  if (isStressed) {
    const pCount = pathway === 'foliar_canopy_wetness' ? 72 : 42;
    const positions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = (seededNoise(i, 81) - 0.5) * 2.1;
      positions[i * 3 + 1] = 0.25 + seededNoise(i, 82) * 1.15;
      positions[i * 3 + 2] = (seededNoise(i, 83) - 0.5) * 2.1;
    }
    const pGeo = track(new THREE.BufferGeometry());
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mistHandle = SHARED_TEXTURE_CACHE.acquire('mist:gaussian', createMistSpriteTexture);
    track({ dispose: mistHandle.release });
    const mistTex = mistHandle.value;
    const pMat = track(new THREE.PointsMaterial({
      map: mistTex,
      color: pathway === 'insect_vector_whitefly' ? 0xf2c879 : 0x60a5fa,
      size: pathway === 'insect_vector_whitefly' ? 0.14 : 0.24,
      transparent: true,
      opacity: pathway === 'insect_vector_whitefly' ? 0.65 : 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    particleSystem = new THREE.Points(pGeo, pMat);
    rootGroup.add(particleSystem);
  }

  return { scene, rootGroup, pullRing, particleSystem, disposables };
}

export default function ThreeCropCompareStage({
  mode = 'crops', // 'crops' | 'pathology'
  leftCropKey = 'rice_aman',
  rightCropKey = 'rice_boro',
  pathologyState = null,
  height = 385,
}) {
  const mountRef = useRef(null);
  const [autoSpin, setAutoSpin] = useState(true);
  const [webglOk, setWebglOk] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const [contextGen, setContextGen] = useState(0);

  const plotsRef = useRef({ left: null, right: null });
  const envTexRef = useRef(null);
  const timeUniformRef = useRef({ value: 0 });
  const contextLostCountRef = useRef(0);

  const camRef = useRef({
    rotY: 0.62,
    rotX: 0.34,
    targetRotY: 0.62,
    targetRotX: 0.34,
    zoom: 4.35,
    targetZoom: 4.35,
    autoSpin: true,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    camRef.current.autoSpin = autoSpin;
  }, [autoSpin]);

  const leftSpec = CROP_3D_SPECS[leftCropKey] || CROP_3D_SPECS.rice_aman;
  const rightSpec = mode === 'pathology' ? leftSpec : (CROP_3D_SPECS[rightCropKey] || CROP_3D_SPECS.rice_boro);

  // 1. Persistent WebGLRenderer + RoomEnvironment PMREM + Context Recovery
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setWebglOk(false);
      return undefined;
    }

    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setScissorTest(true);

    const w = Math.max(300, container.clientWidth);
    const h = Math.max(240, height);
    renderer.setSize(w, h);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    envTexRef.current = envRT.texture;

    if (plotsRef.current.left) plotsRef.current.left.scene.environment = envRT.texture;
    if (plotsRef.current.right) plotsRef.current.right.scene.environment = envRT.texture;

    const canvas = renderer.domElement;
    const onContextLost = (ev) => {
      ev.preventDefault();
      contextLostCountRef.current += 1;
      setContextLost(true);
      // Dispose active scenes and purge stale GPU texture handles safely
      plotsRef.current.left?.disposables?.forEach((d) => d?.dispose?.());
      plotsRef.current.right?.disposables?.forEach((d) => d?.dispose?.());
      plotsRef.current = { left: null, right: null };
      SHARED_TEXTURE_CACHE.purgeAll();
    };
    const onContextRestored = () => {
      setContextLost(false);
      setContextGen((g) => g + 1);
    };
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    canvas.addEventListener('webglcontextrestored', onContextRestored, false);

    const camera = new THREE.PerspectiveCamera(38, (w / 2) / h, 0.1, 50);
    let rafId = 0;
    let frameSamples = 0;
    let frameTimeAccum = 0;
    let lastFrameAt = performance.now();

    const resize = () => {
      if (!container) return;
      const cw = Math.max(300, container.clientWidth);
      renderer.setSize(cw, h);
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(container);

    const renderLoop = () => {
      const now = performance.now();
      const dtMs = now - lastFrameAt;
      lastFrameAt = now;
      frameSamples += 1;
      frameTimeAccum += dtMs;

      const paused = document.body.classList.contains('pause-motion');
      const st = camRef.current;

      if (!paused) {
        timeUniformRef.current.value += 0.022;
        if (st.autoSpin && !st.dragging) {
          st.targetRotY += 0.0032;
        }
      }

      st.rotY += (st.targetRotY - st.rotY) * 0.12;
      st.rotX += (st.targetRotX - st.rotX) * 0.12;
      st.zoom += (st.targetZoom - st.zoom) * 0.14;

      const camX = Math.sin(st.rotY) * Math.cos(st.rotX) * st.zoom;
      const camY = Math.sin(st.rotX) * st.zoom + 0.30;
      const camZ = Math.cos(st.rotY) * Math.cos(st.rotX) * st.zoom;
      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, 0.12, 0);

      const { left: leftPlot, right: rightPlot } = plotsRef.current;
      if (leftPlot && rightPlot && !contextLost) {
        if (!paused) {
          [leftPlot, rightPlot].forEach((plot, idx) => {
            const pulse = 1 + Math.sin(timeUniformRef.current.value * 1.6 + idx) * 0.025;
            plot.pullRing.scale.set(pulse, pulse, 1);
            if (plot.particleSystem) {
              plot.particleSystem.rotation.y += 0.0035;
            }
          });
        }

        const fullW = renderer.domElement.clientWidth || w;
        const halfW = Math.floor(fullW / 2);
        camera.aspect = Math.max(0.5, halfW / h);
        camera.updateProjectionMatrix();

        renderer.setViewport(0, 0, halfW, h);
        renderer.setScissor(0, 0, halfW, h);
        renderer.render(leftPlot.scene, camera);

        renderer.setViewport(halfW, 0, fullW - halfW, h);
        renderer.setScissor(halfW, 0, fullW - halfW, h);
        renderer.render(rightPlot.scene, camera);
      }

      if (frameSamples % 30 === 0 && typeof window !== 'undefined') {
        window.__agrisense3dStats = {
          ...(window.__agrisense3dStats || {}),
          lastFrameMs: Number(dtMs.toFixed(2)),
          avgFrameMs: Number((frameTimeAccum / frameSamples).toFixed(2)),
          cacheHits: SHARED_TEXTURE_CACHE.stats.hits,
          cacheMisses: SHARED_TEXTURE_CACHE.stats.misses,
          cacheEvictions: SHARED_TEXTURE_CACHE.stats.evictions,
          cacheSize: SHARED_TEXTURE_CACHE.map.size,
          contextLostCount: contextLostCountRef.current,
        };
      }

      rafId = window.requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      envTexRef.current = null;
      envRT.dispose();
      roomEnv.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, [height, contextGen]);

  // 2. Fast Plot Swaps / Pathology Rebuilds (Reuses renderer, IBL env & bounded LRU textures)
  useEffect(() => {
    const t0 = performance.now();
    const prevLeft = plotsRef.current.left;
    const prevRight = plotsRef.current.right;

    const nextLeft = createPlotScene(leftSpec, null, timeUniformRef.current);
    const nextRight = createPlotScene(
      rightSpec,
      mode === 'pathology' ? pathologyState : null,
      timeUniformRef.current
    );
    if (envTexRef.current) {
      nextLeft.scene.environment = envTexRef.current;
      nextRight.scene.environment = envTexRef.current;
    }

    plotsRef.current = { left: nextLeft, right: nextRight };

    // Release previous scene geometries/materials & decrement shared LRU texture refs AFTER swap
    prevLeft?.disposables?.forEach((d) => d?.dispose?.());
    prevRight?.disposables?.forEach((d) => d?.dispose?.());

    const buildMs = performance.now() - t0;
    if (typeof window !== 'undefined') {
      window.__agrisense3dStats = {
        ...(window.__agrisense3dStats || {}),
        sceneBuildMs: Number(buildMs.toFixed(2)),
        cacheHits: SHARED_TEXTURE_CACHE.stats.hits,
        cacheMisses: SHARED_TEXTURE_CACHE.stats.misses,
        cacheEvictions: SHARED_TEXTURE_CACHE.stats.evictions,
        cacheSize: SHARED_TEXTURE_CACHE.map.size,
      };
    }

    return () => {
      nextLeft.disposables.forEach((d) => d?.dispose?.());
      nextRight.disposables.forEach((d) => d?.dispose?.());
      if (plotsRef.current.left === nextLeft) plotsRef.current.left = null;
      if (plotsRef.current.right === nextRight) plotsRef.current.right = null;
    };
  }, [leftSpec, rightSpec, mode, pathologyState?.riskScore, pathologyState?.pathway, pathologyState?.soilMoistureVwc, contextGen]);

  const handlePointerDown = (e) => {
    camRef.current.dragging = true;
    camRef.current.lastX = e.clientX;
    camRef.current.lastY = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!camRef.current.dragging) return;
    const dx = e.clientX - camRef.current.lastX;
    const dy = e.clientY - camRef.current.lastY;
    camRef.current.lastX = e.clientX;
    camRef.current.lastY = e.clientY;
    camRef.current.targetRotY += dx * 0.008;
    camRef.current.targetRotX = Math.max(0.1, Math.min(1.12, camRef.current.targetRotX + dy * 0.006));
  };

  const handlePointerUp = () => {
    camRef.current.dragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    camRef.current.targetZoom = Math.max(2.7, Math.min(6.8, camRef.current.targetZoom + e.deltaY * 0.0025));
  };

  const resetCamera = () => {
    camRef.current.targetRotY = 0.62;
    camRef.current.targetRotX = 0.34;
    camRef.current.targetZoom = 4.35;
  };

  if (!webglOk) {
    return (
      <div className="surface" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        WebGL 3D context unavailable in this browser. View 2D digital comparison charts below.
      </div>
    );
  }

  return (
    <div
      className="dual3d-stage"
      style={{ height: `${height}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div ref={mountRef} className="dual3d-canvas-host" />

      {/* Center Vertical Split Line */}
      <div className="dual3d-divider" aria-hidden="true">
        <span className="dual3d-vs-pill mono">VS</span>
      </div>

      {/* Left Label Overlay */}
      <div className="dual3d-badge dual3d-badge--left">
        <span className="dual3d-dot" style={{ background: '#7cc8a0' }} />
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#edeae4' }}>
            {mode === 'pathology' ? `Healthy Control (${leftSpec.label})` : `Left · ${leftSpec.label}`}
          </div>
          <div className="mono" style={{ fontSize: '0.67rem', color: '#a8a59e' }}>
            {mode === 'pathology' ? 'Baseline Microclimate (No Active Stress)' : leftSpec.subtitle}
          </div>
        </div>
      </div>

      {/* Right Label Overlay */}
      <div className="dual3d-badge dual3d-badge--right">
        <span
          className="dual3d-dot"
          style={{
            background:
              mode === 'pathology'
                ? (pathologyState?.riskScore >= 0.7 ? '#e47a63' : pathologyState?.riskScore >= 0.45 ? '#f2c879' : '#7cc8a0')
                : '#60a5fa',
          }}
        />
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#edeae4' }}>
            {mode === 'pathology'
              ? `Screened Plot • ${pathologyState?.topDiseaseName || 'Pathology Window'}`
              : `Right · ${rightSpec.label}`}
          </div>
          <div className="mono" style={{ fontSize: '0.67rem', color: '#a8a59e' }}>
            {mode === 'pathology'
              ? `Risk ${(Number(pathologyState?.riskScore || 0) * 100).toFixed(0)}% (${pathologyState?.riskLevel || 'LOW'}) • Environmental Only`
              : rightSpec.subtitle}
          </div>
        </div>
      </div>

      {contextLost && (
        <div className="dual3d-badge" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#f2c879' }}>
          Restoring WebGL 3D context cleanly...
        </div>
      )}

      {/* Synchronized Controls Footer — kept left-aligned to never collide with floating AI Orb */}
      <div className="dual3d-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="dual3d-ctrl-btn"
            onClick={(e) => {
              e.stopPropagation();
              setAutoSpin((v) => !v);
            }}
          >
            {autoSpin ? <Pause size={12} /> : <Play size={12} />}
            <span>{autoSpin ? 'Pause Spin' : 'Auto Spin'}</span>
          </button>
          <button
            type="button"
            className="dual3d-ctrl-btn"
            onClick={(e) => {
              e.stopPropagation();
              resetCamera();
            }}
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
          <span className="mono" style={{ fontSize: '0.66rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Eye size={12} /> Drag anywhere to orbit both 3D plots in lockstep • Scroll to zoom
          </span>
        </div>
      </div>
    </div>
  );
}
