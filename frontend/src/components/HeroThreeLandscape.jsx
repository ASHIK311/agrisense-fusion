import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Generates a soft glowing radial sprite texture for voxel points, starlight, and surface flares.
 */
function createGlowSpriteTexture(innerColor, midColor, outerColor = 'rgba(0,0,0,0)') {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.28, midColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Procedural depth height function tailored to match the photorealistic
 * Barind Cosmic Valley masterplate geometry (mountains right, lake/fields left-front, deep cosmic sky top).
 */
function valleyMasterplateDepth(u, v) {
  // Smoothly feather Z-displacement down to 0 along all 4 outer edges so borders remain crisp and flush!
  const edgeU = Math.min(1, u / 0.16) * Math.min(1, (1 - u) / 0.16);
  const edgeV = Math.min(1, v / 0.12) * Math.min(1, (1 - v) / 0.12);
  const rawEdge = Math.max(0, Math.min(1, edgeU * edgeV));
  const smoothEdge = rawEdge * rawEdge * (3 - 2 * rawEdge);

  let z = 0;

  if (v < 0.62) {
    // Terrain region: subtle perspective incline forward toward foreground
    const groundT = 1.0 - v / 0.62;
    z += Math.pow(groundT, 1.3) * 1.45;

    // Rolling misty Barind hills rising on right horizon
    const hillMaskX = Math.max(0, (u - 0.62) / 0.38);
    const hillMaskV = Math.exp(-Math.pow((v - 0.50) / 0.14, 2));
    z += hillMaskX * hillMaskV * 0.85;

    // Foreground tree groves relief pops
    z += Math.sin(u * 22.0) * Math.cos(v * 18.0) * 0.05 * groundT;
  } else {
    // Upper cosmos concave curve
    const skyT = (v - 0.62) / 0.38;
    const horizCurve = Math.pow(u - 0.5, 2) * 0.9;
    z -= skyT * 0.85 + horizCurve;
  }

  return z * smoothEdge;
}

export default function HeroThreeLandscape({
  activeLayer = 0, // 0 = All, 1 = Atmosphere, 2 = Canopy, 3 = Surface, 4 = Root-Zone
  exploded = true,
  spectralMode = 'NDVI', // 'NDVI' | 'NDRE' | 'MSAVI' | 'EVI'
  selectedFieldId = 'field-a01',
  onSelectField = () => {},
  pauseMotion = false,
  autoRotate = true,
  onHoverParcel = () => {},
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    activeLayer,
    exploded,
    spectralMode,
    selectedFieldId,
    pauseMotion,
    autoRotate,
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    zoom: 14.0,
    targetZoom: 14.0,
    mouseX: 0,
    mouseY: 0,
    isVisible: true,
  });

  const [webglReady, setWebglReady] = useState(true);

  useEffect(() => {
    stateRef.current.activeLayer = activeLayer;
    stateRef.current.exploded = exploded;
    stateRef.current.spectralMode = spectralMode;
    stateRef.current.selectedFieldId = selectedFieldId;
    stateRef.current.pauseMotion = pauseMotion;
    stateRef.current.autoRotate = autoRotate;
  }, [activeLayer, exploded, spectralMode, selectedFieldId, pauseMotion, autoRotate]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      console.warn('WebGL unavailable:', err);
      setWebglReady(false);
      return undefined;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 860;
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030812);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 200);
    camera.position.set(0, 0, 14.0);

    // Lighting tailored for Metallic Gold Foil & Solar Wings on NASA Landsat 8 Model
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.95);
    scene.add(ambientLight);

    const sunDirLight = new THREE.DirectionalLight(0xffe6ba, 3.2);
    sunDirLight.position.set(-12, 8, 12);
    scene.add(sunDirLight);

    const earthBounceLight = new THREE.DirectionalLight(0x6ee7b7, 1.1);
    earthBounceLight.position.set(8, -10, 6);
    scene.add(earthBounceLight);

    // Texture Loader with crisp non-mipmap filtering for native 1:1 sharpness
    const texLoader = new THREE.TextureLoader();
    const valleyColorTex = texLoader.load('/story-assets/barind-orbital-valley.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.needsUpdate = true;
    });

    // ==================== 2.5D/3D DEPTH-DISPLACED VALLEY ====================
    const valleyGroup = new THREE.Group();
    scene.add(valleyGroup);

    // Near 1:1 viewport sizing (21.6 x 12.2) preserves ~94% of native pixels instead of cropping blurry magnification!
    const backdropW = 21.6;
    const backdropH = 12.34;
    const backdropGeo = new THREE.PlaneGeometry(backdropW, backdropH, 96, 64);
    const bPos = backdropGeo.attributes.position;
    const bUv = backdropGeo.attributes.uv;
    for (let i = 0; i < bPos.count; i++) {
      const u = bUv.getX(i);
      const v = bUv.getY(i);
      bPos.setZ(i, valleyMasterplateDepth(u, v) * 0.8);
    }
    backdropGeo.computeVertexNormals();

    // Custom GLSL Shader for Crisp Sharpened Photoreal Masterplate + Live River Shimmer + Spectral Filter
    const backdropMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: valleyColorTex },
        uTime: { value: 0 },
        uSpectralIdx: { value: 0 }, // 0=NDVI(natural+vigor), 1=NDRE, 2=MSAVI, 3=EVI
        uPauseMotion: { value: 0 },
        uTexelSize: { value: new THREE.Vector2(1.0 / 1792.0, 1.0 / 1024.0) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uTime;
        uniform float uSpectralIdx;
        uniform float uPauseMotion;
        uniform vec2 uTexelSize;
        varying vec2 vUv;

        void main() {
          vec4 tex = texture2D(uMap, vUv);
          vec3 col = tex.rgb;

          // 5-Tap GPU Unsharp Contrast-Adaptive Sharpen filter so trees, plots & rivers stay razor crisp
          vec3 cL = texture2D(uMap, vUv - vec2(uTexelSize.x, 0.0)).rgb;
          vec3 cR = texture2D(uMap, vUv + vec2(uTexelSize.x, 0.0)).rgb;
          vec3 cU = texture2D(uMap, vUv + vec2(0.0, uTexelSize.y)).rgb;
          vec3 cD = texture2D(uMap, vUv - vec2(0.0, uTexelSize.y)).rgb;
          vec3 neighborAvg = (cL + cR + cU + cD) * 0.25;
          col = clamp(col + (col - neighborAvg) * 0.42, 0.0, 1.0);

          // Estimate vegetation canopy vs river/soil hues for subtle scientific spectral overlays
          float greenness = col.g - max(col.r, col.b) * 0.85;
          float riverMask = smoothstep(0.55, 0.72, vUv.x) * smoothstep(0.0, 0.52, vUv.y) * smoothstep(0.45, 0.15, greenness);

          // Live gentle sunrise water shimmer along the sunlit river surface
          if (uPauseMotion < 0.5) {
            float shimmer = sin(vUv.y * 95.0 - uTime * 2.8 + vUv.x * 35.0) * 0.5 + 0.5;
            float sparkle = pow(shimmer, 10.0) * riverMask * smoothstep(0.45, 0.75, tex.r);
            col += vec3(1.0, 0.88, 0.55) * sparkle * 0.045;
          }

          // Spectral Mode Grading across Terrestrial Vegetation (below horizon vUv.y < 0.62)
          float groundMask = smoothstep(0.64, 0.54, vUv.y);
          if (uSpectralIdx > 0.5 && uSpectralIdx < 1.5) {
            // NDRE: Red-edge chlorophyll boost (teal-emerald canopy + amber soil edge)
            vec3 ndreTint = mix(col, vec3(0.08, 0.82, 0.62), clamp(greenness * 2.2, 0.0, 0.55));
            col = mix(col, ndreTint, groundMask * 0.72);
          } else if (uSpectralIdx >= 1.5 && uSpectralIdx < 2.5) {
            // MSAVI: Soil-adjusted drought moisture palette (cyan-blue irrigated vs warm amber dry)
            vec3 msaviTint = mix(vec3(0.75, 0.45, 0.25), vec3(0.12, 0.68, 0.85), clamp(greenness * 2.5 + 0.2, 0.0, 1.0));
            col = mix(col, mix(col, msaviTint, 0.48), groundMask * 0.75);
          } else if (uSpectralIdx >= 2.5) {
            // EVI: Enhanced intense atmospheric-corrected photosynthetic emerald contrast
            vec3 eviTint = vec3(col.r * 0.82, min(1.0, col.g * 1.18), col.b * 0.85);
            col = mix(col, eviTint, groundMask * 0.85);
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
    valleyGroup.add(backdropMesh);

    // Subtle Dynamic Twinkling Cosmic Stars overlay in Upper Space Sky (v > 0.68)
    const starTex = createGlowSpriteTexture('rgba(255,255,255,1)', 'rgba(190,230,255,0.65)');
    const starCount = 160;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 23.0;
      starPositions[i * 3 + 1] = 2.4 + Math.random() * 4.5; // Upper cosmic zone
      starPositions[i * 3 + 2] = -0.3 + Math.random() * 0.4;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      map: starTex,
      size: 0.16,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cosmicStars = new THREE.Points(starGeo, starMat);
    valleyGroup.add(cosmicStars);

    // Draped Perspective GIS Ground Laser Grid on Bottom-Right Foreground Agricultural Plots
    const gisGridVerts = [];
    const gwCols = 8;
    const gwRows = 7;
    const gridPlaneW = 8.4;
    const gridPlaneD = 6.2;
    for (let c = 0; c <= gwCols; c++) {
      const gx = -gridPlaneW / 2 + (c / gwCols) * gridPlaneW;
      gisGridVerts.push(gx, 0, -gridPlaneD / 2, gx, 0, gridPlaneD / 2);
    }
    for (let r = 0; r <= gwRows; r++) {
      const gz = -gridPlaneD / 2 + (r / gwRows) * gridPlaneD;
      gisGridVerts.push(-gridPlaneW / 2, 0, gz, gridPlaneW / 2, 0, gz);
    }
    const gisGridGeo = new THREE.BufferGeometry();
    gisGridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gisGridVerts, 3));
    const gisGridMat = new THREE.LineBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
    });
    const gisGridMesh = new THREE.LineSegments(gisGridGeo, gisGridMat);
    gisGridMesh.position.set(3.5, -2.55, 3.5);
    gisGridMesh.rotation.set(0.22, -0.36, 0.04); // Aligned cleanly with perspective plane of right foreground plots!
    valleyGroup.add(gisGridMesh);

    // Intersection dots at GIS Grid corners
    const nodeVerts = [];
    for (let c = 0; c <= gwCols; c += 2) {
      for (let r = 0; r <= gwRows; r += 2) {
        const gx = -gridPlaneW / 2 + (c / gwCols) * gridPlaneW;
        const gz = -gridPlaneD / 2 + (r / gwRows) * gridPlaneD;
        nodeVerts.push(gx, 0.02, gz);
      }
    }
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodeVerts, 3));
    const nodeMat = new THREE.PointsMaterial({
      color: 0xa7f3d0,
      map: starTex,
      size: 0.22,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const gisNodes = new THREE.Points(nodeGeo, nodeMat);
    gisGridMesh.add(gisNodes);

    // ==================== 3D HERO OVERLAYS: HOLOGRAPHIC DATA CUBE + OFFICIAL NASA GPM GLB SATELLITE ====================
    // 1. Floating Holographic 3D Digital Twin Cube hovering cleanly over right-midground meadows above HUD card
    const cubeGroup = new THREE.Group();
    cubeGroup.position.set(3.45, -0.35, 4.25);
    cubeGroup.rotation.set(0.22, 0.54, -0.02);
    scene.add(cubeGroup);

    const cw = 2.4;
    const ch = 1.4;
    const cd = 2.4;

    const outerCubeGeo = new THREE.BoxGeometry(cw, ch, cd);
    const outerCubeEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(outerCubeGeo),
      new THREE.LineBasicMaterial({
        color: 0x5eead4,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
      })
    );
    cubeGroup.add(outerCubeEdges);

    const coreShellMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.032,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coreShell = new THREE.Mesh(outerCubeGeo, coreShellMat);
    cubeGroup.add(coreShell);

    // 4 Stratified Layers inside Cube matching HUD Layer Tabs
    const sliceGroups = [];
    const sliceColors = [0xf59e0b, 0x34d399, 0x5eead4, 0x38bdf8];
    const sliceYs = [ch * 0.44, ch * 0.14, -ch * 0.16, -ch * 0.44];

    sliceYs.forEach((sy, idx) => {
      const sg = new THREE.GridHelper(cw * 0.95, 6, sliceColors[idx], sliceColors[idx]);
      sg.position.y = sy;
      sg.material.transparent = true;
      sg.material.opacity = 0.52;
      sg.material.blending = THREE.AdditiveBlending;
      cubeGroup.add(sg);
      sliceGroups.push(sg);
    });

    // Floating Volumetric Voxel Telemetry Points inside Data Cube
    const voxelCount = 150;
    const voxelGeo = new THREE.BufferGeometry();
    const voxelPos = new Float32Array(voxelCount * 3);
    for (let v = 0; v < voxelCount; v++) {
      voxelPos[v * 3] = (Math.random() - 0.5) * (cw * 0.88);
      voxelPos[v * 3 + 1] = (Math.random() - 0.5) * (ch * 0.88);
      voxelPos[v * 3 + 2] = (Math.random() - 0.5) * (cd * 0.88);
    }
    voxelGeo.setAttribute('position', new THREE.BufferAttribute(voxelPos, 3));
    const voxelTex = createGlowSpriteTexture('rgba(255,255,255,1)', 'rgba(94,234,212,0.85)');
    const voxelMat = new THREE.PointsMaterial({
      color: 0xa7f3d0,
      map: voxelTex,
      size: 0.22,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const voxelPoints = new THREE.Points(voxelGeo, voxelMat);
    cubeGroup.add(voxelPoints);

    // Vertical Tether Beam anchoring Hologram Cube to Field Surface + Glowing Flare
    const anchorGeo = new THREE.CylinderGeometry(0.02, 0.07, 1.5, 16, 1, true);
    const anchorMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const anchorBeam = new THREE.Mesh(anchorGeo, anchorMat);
    anchorBeam.position.set(0, -1.3, 0);
    cubeGroup.add(anchorBeam);

    const nadirFlare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createGlowSpriteTexture('rgba(255,255,255,1)', 'rgba(94,234,212,0.8)'),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    nadirFlare.position.set(0, -1.9, 0);
    nadirFlare.scale.set(1.35, 1.35, 1);
    cubeGroup.add(nadirFlare);

    // 2. Official NASA GPM `.glb` Twin-Wing Spacecraft in Open Upper-Right Space
    const satAnchor = new THREE.Group();
    satAnchor.position.set(3.4, 2.35, 4.6);
    satAnchor.rotation.set(0.24, -0.12, -0.24);
    scene.add(satAnchor);

    // Dedicated warm solar key light illuminating the NASA spacecraft against cosmic night
    const satSpotLight = new THREE.PointLight(0xfff1cc, 32, 18);
    satSpotLight.position.set(2.0, 3.5, 7.2);
    scene.add(satSpotLight);

    // Subtle Orbital Telemetry Torus Rings around Spacecraft (compact & crisp)
    const orbRingGeo = new THREE.TorusGeometry(0.78, 0.0065, 8, 64);
    const orbRingMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
    });
    const orbRing1 = new THREE.Mesh(orbRingGeo, orbRingMat);
    orbRing1.rotation.x = Math.PI * 0.44;
    satAnchor.add(orbRing1);

    const orbRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.0055, 8, 64), orbRingMat);
    orbRing2.rotation.y = Math.PI * 0.35;
    satAnchor.add(orbRing2);

    // Subtle Airy Optical Downlink Scan Cone Shining Toward Valley (Never overexposing river)
    const scanBeamGeo = new THREE.ConeGeometry(2.0, 4.4, 32, 1, true);
    scanBeamGeo.translate(0, -2.2, 0);
    const scanBeamMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.026,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const scanBeam = new THREE.Mesh(scanBeamGeo, scanBeamMat);
    scanBeam.rotation.z = 0.22;
    scanBeam.rotation.x = 0.06;
    satAnchor.add(scanBeam);

    // Load Official Public-Domain NASA GPM Twin-Wing GLB Asset with Local Draco Decoder
    let loadedSatellite = null;
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.load(
      '/models/gpm.glb',
      (gltf) => {
        const model = gltf.scene;
        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSpan = 2.02;
        const scaleFactor = targetSpan / maxDim;

        model.scale.setScalar(scaleFactor);
        model.position.sub(center.multiplyScalar(scaleFactor));
        // Orient GPM so twin Z-axis solar wings spread wide left-to-right and cobalt arrays face camera
        model.rotation.set(0.12, Math.PI * 0.45, 0.08);

        // Enhance default PBR factors inside NASA GPM GLB so both solar wings, gold MLI & radar dish shine clearly
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              const mName = (m.name || '').toLowerCase();
              if (mName.startsWith('solar-') || mName === 'solarpanelback') {
                m.color.setHex(0x2563eb);
                m.emissive.setHex(0x1d4ed8);
                m.emissiveIntensity = 0.62;
                m.metalness = 0.22;
                m.roughness = 0.28;
              } else if (mName.includes('solarpanelwhite')) {
                m.color.setHex(0xdbeafe);
                m.emissive.setHex(0x334155);
                m.emissiveIntensity = 0.25;
                m.metalness = 0.15;
                m.roughness = 0.36;
              } else if (mName.includes('bronze') || mName.includes('gold')) {
                m.color.setHex(0xfbbf24);
                m.emissive.setHex(0x92400e);
                m.emissiveIntensity = 0.48;
                m.metalness = 0.25;
                m.roughness = 0.28;
              } else if (mName.includes('mainbody-black')) {
                m.color.setHex(0x1e293b);
                m.emissive.setHex(0x0f172a);
                m.emissiveIntensity = 0.32;
                m.metalness = 0.2;
                m.roughness = 0.45;
              } else {
                m.color.setHex(0xf1f5f9);
                m.emissive.setHex(0x475569);
                m.emissiveIntensity = 0.32;
                m.metalness = 0.15;
                m.roughness = 0.36;
              }
              m.needsUpdate = true;
            });
          }
        });

        loadedSatellite = model;
        satAnchor.add(model);
      },
      undefined,
      (err) => {
        console.warn('Could not load official NASA GPM GLB model:', err);
      }
    );

    // Floating Warm Golden Sun Motes Drifting Gently Through Foreground Light
    const moteCount = 90;
    const moteGeo = new THREE.BufferGeometry();
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 18;
      motePos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      motePos[i * 3 + 2] = 4.2 + Math.random() * 4.5;
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteTex = createGlowSpriteTexture('rgba(255, 240, 190, 0.95)', 'rgba(255, 190, 90, 0.4)');
    const moteMat = new THREE.PointsMaterial({
      color: 0xfef3c7,
      map: moteTex,
      size: 0.14,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunMotes = new THREE.Points(moteGeo, moteMat);
    scene.add(sunMotes);

    // Interactive Parcel Hit Targets (cleanly invisible unless active/hovered so photoreal nature remains crisp)
    const parcelMeshes = [];
    const parcelSpecs = [
      { id: 'field-a01', code: 'PARCEL A-01', x: -1.8, y: -2.4, z: 3.6, w: 2.3, d: 1.8, color: 0x34d399 },
      { id: 'field-b02', code: 'PARCEL B-02', x: 3.45, y: -2.45, z: 3.6, w: 2.4, d: 1.9, color: 0xfbbf24 },
      { id: 'field-c03', code: 'PARCEL C-03', x: 6.0, y: -2.3, z: 2.6, w: 2.3, d: 1.8, color: 0x38bdf8 },
      { id: 'field-d04', code: 'PARCEL D-04', x: 1.1, y: -2.6, z: 3.4, w: 2.2, d: 1.7, color: 0xfb923c },
    ];

    parcelSpecs.forEach((p) => {
      const boxGeo = new THREE.BoxGeometry(p.w, 0.04, p.d);
      const boxMat = new THREE.MeshBasicMaterial({
        color: p.color,
        transparent: true,
        opacity: 0.0,
      });
      const mesh = new THREE.Mesh(boxGeo, boxMat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.set(0.22, -0.36, 0.04);
      mesh.userData = { fieldId: p.id, code: p.code };

      const outlineMat = new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.0 });
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), outlineMat);
      mesh.userData.outlineMat = outlineMat;
      mesh.add(outline);
      scene.add(mesh);
      parcelMeshes.push(mesh);
    });

    // ==================== POINTER, PARALLAX & RAYCAST INTERACTION ====================
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const domElem = renderer.domElement;

    const handlePointerDown = (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const handlePointerMove = (e) => {
      const rect = domElem.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      stateRef.current.mouseX = pointer.x;
      stateRef.current.mouseY = pointer.y;

      if (isDragging) {
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;
        const maxYaw = 0.042;
        const maxPitch = 0.03;
        stateRef.current.targetYaw = Math.max(-maxYaw, Math.min(maxYaw, stateRef.current.targetYaw - dx * 0.0012));
        stateRef.current.targetPitch = Math.max(-maxPitch, Math.min(maxPitch, stateRef.current.targetPitch + dy * 0.001));
        return;
      }

      if (parcelMeshes.length > 0) {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(parcelMeshes, false);
        if (hits.length > 0) {
          domElem.style.cursor = 'pointer';
          onHoverParcel(hits[0].object.userData.code);
        } else {
          domElem.style.cursor = 'grab';
          onHoverParcel(null);
        }
      }
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const handleClick = (e) => {
      if (parcelMeshes.length === 0) return;
      const rect = domElem.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(parcelMeshes, false);
      if (hits.length > 0 && hits[0].object.userData?.fieldId) {
        onSelectField(hits[0].object.userData.fieldId);
      }
    };

    const handleWheel = (e) => {
      const minZ = 12.6;
      const maxZ = 14.2;
      stateRef.current.targetZoom = Math.max(minZ, Math.min(maxZ, stateRef.current.targetZoom + e.deltaY * 0.0025));
    };

    domElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    domElem.addEventListener('click', handleClick);
    domElem.addEventListener('wheel', handleWheel, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          stateRef.current.isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // ==================== 60FPS ANIMATION LOOP ====================
    let animId;
    const clock = new THREE.Clock();
    const spectralToIdx = { NDVI: 0, NDRE: 1, MSAVI: 2, EVI: 3 };

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!stateRef.current.isVisible) return;

      const t = clock.getElapsedTime();
      const st = stateRef.current;

      valleyGroup.visible = true;

      // Update Shader Uniforms
      backdropMat.uniforms.uTime.value = t;
      backdropMat.uniforms.uSpectralIdx.value = spectralToIdx[st.spectralMode] ?? 0;
      backdropMat.uniforms.uPauseMotion.value = st.pauseMotion ? 1.0 : 0.0;

      // Subtle atmospheric camera parallax + idle floating sway
      const idleYaw = st.autoRotate && !isDragging && !st.pauseMotion ? Math.sin(t * 0.35) * 0.016 : 0;
      const idlePitch = st.autoRotate && !isDragging && !st.pauseMotion ? Math.cos(t * 0.25) * 0.01 : 0;

      const parallaxYaw = st.mouseX * 0.022;
      const parallaxPitch = -st.mouseY * 0.016;

      st.yaw += (st.targetYaw + idleYaw + parallaxYaw - st.yaw) * 0.07;
      st.pitch += (st.targetPitch + idlePitch + parallaxPitch - st.pitch) * 0.07;
      st.zoom += (st.targetZoom - st.zoom) * 0.08;

      camera.position.set(
        Math.sin(st.yaw) * st.zoom * 0.85,
        Math.sin(st.pitch) * st.zoom * 0.65,
        Math.cos(st.yaw) * st.zoom
      );
      camera.lookAt(0, 0, 0);

      // Dynamic WebGL Cover Auto-Fit: mathematically guarantees ZERO empty side strips on ANY screen ratio!
      const vFovRad = (camera.fov * Math.PI) / 180;
      const visHAtZero = 2 * Math.tan(vFovRad / 2) * st.zoom;
      const visWAtZero = visHAtZero * camera.aspect;
      const coverScale = Math.max(visWAtZero / backdropW, visHAtZero / backdropH) * 1.07;
      backdropMesh.scale.set(coverScale, coverScale, 1);

      // Responsive safe frustum framing for Spacecraft (clear below top HUD) & Hologram Cube (lower-right river)
      const fgDist = Math.max(3.5, st.zoom - 4.4);
      const fgHalfH = Math.tan(vFovRad / 2) * fgDist;
      const fgHalfW = fgHalfH * camera.aspect;
      const safeSatX = Math.min(fgHalfW * 0.56, 4.15);
      const safeSatY = fgHalfH * 0.34;
      const safeCubeX = Math.min(fgHalfW * 0.44, 3.35);
      const safeCubeY = -fgHalfH * 0.34;

      // Animate Real NASA GPM Twin-Wing Satellite (continuous 3D rounding spin + gentle orbital drift) & Cube
      if (!st.pauseMotion) {
        satAnchor.position.x = safeSatX + Math.sin(t * 0.45) * 0.25;
        satAnchor.position.y = safeSatY + Math.cos(t * 0.6) * 0.11;
        satAnchor.position.z = 4.6 + Math.sin(t * 0.45) * 0.22;
        satSpotLight.position.set(safeSatX - 1.2, safeSatY + 1.1, 7.2);
        orbRing1.rotation.z = t * 0.65;
        orbRing2.rotation.z = -t * 0.48;

        if (loadedSatellite) {
          loadedSatellite.rotation.y = Math.PI * 0.45 + (st.autoRotate ? t * 0.52 : Math.sin(t * 0.25) * 0.12);
        }

        // Keep Holographic 3D Digital Twin Data Cube steadily anchored over lower-right valley bend (no rounding spin)
        cubeGroup.position.x = safeCubeX;
        cubeGroup.position.y = safeCubeY + Math.sin(t * 1.15) * 0.04;
        cubeGroup.rotation.y = 0.54;
        gisGridMesh.position.x = safeCubeX;

        // Drift sunlit pollen/dust motes smoothly
        const mPos = moteGeo.attributes.position;
        for (let i = 0; i < moteCount; i++) {
          let my = mPos.getY(i) + 0.004;
          if (my > 4.0) my = -4.0;
          mPos.setY(i, my);
        }
        mPos.needsUpdate = true;
      }

      // Highlight Active Layer Grid Inside Holographic 3D Data Cube
      sliceGroups.forEach((sg, idx) => {
        const layerNum = idx + 1;
        const isHighlighted = st.activeLayer === 0 || st.activeLayer === layerNum;
        sg.material.opacity = isHighlighted ? (st.activeLayer === layerNum ? 0.96 : 0.48) : 0.12;
        const explodeScale = st.exploded ? 1.12 : 0.85;
        sg.position.y = sliceYs[idx] * explodeScale;
      });

      // Keep valley fields cleanly unobstructed unless interactively highlighted
      parcelMeshes.forEach((pm) => {
        pm.material.opacity = 0.0;
        if (pm.userData.outlineMat) {
          pm.userData.outlineMat.opacity = 0.0;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth || window.innerWidth;
      const nh = container.clientHeight || 860;
      if (nw <= 0 || nh <= 0) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh, false);
    };
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    if (resizeObserver) resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      domElem.removeEventListener('click', handleClick);
      domElem.removeEventListener('wheel', handleWheel);
      renderer.dispose();
      backdropGeo.dispose();
      backdropMat.dispose();
      valleyColorTex.dispose();
      starGeo.dispose();
      starMat.dispose();
      starTex.dispose();
      gisGridGeo.dispose();
      gisGridMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      outerCubeGeo.dispose();
      coreShellMat.dispose();
      voxelGeo.dispose();
      voxelMat.dispose();
      voxelTex.dispose();
      anchorGeo.dispose();
      anchorMat.dispose();
      orbRingGeo.dispose();
      orbRingMat.dispose();
      scanBeamGeo.dispose();
      scanBeamMat.dispose();
      moteGeo.dispose();
      moteMat.dispose();
      moteTex.dispose();
      dracoLoader.dispose();
    };
  }, [onSelectField, onHoverParcel]);

  if (!webglReady) {
    return (
      <img
        src="/story-assets/barind-orbital-valley.jpg"
        alt="Photorealistic Earth Horizon and Sunlit Barind River Valley"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
        }}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    />
  );
}
