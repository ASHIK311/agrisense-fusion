import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PARCELS } from '../context/AgriSenseContext';

const LAYER_CONFIG = [
  {
    id: 1,
    key: 'atmosphere',
    name: 'Atmosphere & Solar Flux',
    shortName: '1. Atmosphere',
    sub: 'NASA POWER MERRA-2 / CERES (~34.8 km ESE)',
    color: '#F59E0B',
  },
  {
    id: 2,
    key: 'canopy',
    name: 'Spectral Canopy Layer',
    shortName: '2. Spectral Canopy',
    sub: 'Sentinel-2 L2A 10m NDVI / NDMI / EVI',
    color: '#16865B',
  },
  {
    id: 3,
    key: 'surface',
    name: 'Agricultural Surface & Parcels',
    shortName: '3. Field Surface',
    sub: 'Godagari Terraced Parcels & Simulated ESP32 Node',
    color: '#C87952',
  },
  {
    id: 4,
    key: 'subsurface',
    name: 'Subsurface Root Zone & Aquifer',
    shortName: '4. Root-Zone & Aquifer',
    sub: 'FAO-56 Zr = 0.50m • 26.4m DTW Proxy Table',
    color: '#398EAA',
  },
];

function barindHeight(x, z) {
  // Stepped Pleistocene Barind terrace topography + gentle undulating relief
  const raw =
    Math.sin(x * 0.35) * 0.45 +
    Math.cos(z * 0.32) * 0.4 +
    Math.sin((x + z) * 0.22) * 0.35;
  const terraceStep = Math.round(raw * 3.2) / 3.2;
  return raw * 0.35 + terraceStep * 0.65;
}

export default function ThreeLandscapeStage({
  activeLayer = 0, // 0 = all layers, 1..4 = highlight specific layer
  exploded = true,
  spectralMode = 'NDVI',
  selectedFieldId = 'field-a01',
  onSelectField,
  pauseMotion = false,
  cursorGeo = null,
  onCursorMove = null,
  height = 460,
  variant = 'landscape', // 'landscape' | 'pedon'
  moisturePct = 25.4,
  depletionMm = 38.2,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    activeLayer,
    exploded,
    spectralMode,
    selectedFieldId,
    pauseMotion,
    cursorGeo,
    moisturePct,
    depletionMm,
    rotY: variant === 'pedon' ? 0.65 : 0.58,
    rotX: variant === 'pedon' ? 0.38 : 0.52,
    zoom: variant === 'pedon' ? 10.5 : 13.5,
  });

  const [webglSupported, setWebglSupported] = useState(true);
  const [hoveredParcel, setHoveredParcel] = useState(null);
  const [cameraHud, setCameraHud] = useState({ az: 33, el: 30, zoom: 1.0 });

  useEffect(() => {
    stateRef.current.activeLayer = activeLayer;
    stateRef.current.exploded = exploded;
    stateRef.current.spectralMode = spectralMode;
    stateRef.current.selectedFieldId = selectedFieldId;
    stateRef.current.pauseMotion = pauseMotion;
    stateRef.current.cursorGeo = cursorGeo;
    stateRef.current.moisturePct = moisturePct;
    stateRef.current.depletionMm = depletionMm;
  }, [activeLayer, exploded, spectralMode, selectedFieldId, pauseMotion, cursorGeo, moisturePct, depletionMm]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglSupported(false);
      return undefined;
    }

    const width = container.clientWidth || 720;
    const h = container.clientHeight || height;
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b1f17, 0.022);

    const camera = new THREE.PerspectiveCamera(38, width / h, 0.1, 120);

    // Lighting: warm Barind solar directional light + ambient sky/ground hemisphere light
    const hemiLight = new THREE.HemisphereLight(0xdff7ea, 0x1a2e22, 0.95);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e4, 1.45);
    sunLight.position.set(10, 16, 9);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    rimLight.position.set(-12, 6, -10);
    scene.add(rimLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Layer groups for vertical stratigraphic separation
    const layerSubsurface = new THREE.Group();
    const layerSurface = new THREE.Group();
    const layerCanopy = new THREE.Group();
    const layerAtmosphere = new THREE.Group();

    rootGroup.add(layerSubsurface);
    rootGroup.add(layerSurface);
    rootGroup.add(layerCanopy);
    rootGroup.add(layerAtmosphere);

    const parcelMeshes = [];
    let canopyGeo = null;
    let waterPlane = null;
    let cursorPin = null;

    if (variant === 'pedon') {
      // 3D Soil Column Pedon for /app/root-zone
      const horizons = [
        { y: 1.5, h: 0.7, color: 0x1f8a5c, label: 'Canopy & Surface Mulch' },
        { y: 0.45, h: 1.35, color: 0x8d5b3e, label: 'Active Root Zone (0–30 cm Clay-Loam)' },
        { y: -0.75, h: 1.0, color: 0xa46743, label: 'Lower Root Zone (30–50 cm Zr = 0.50m)' },
        { y: -1.85, h: 1.15, color: 0x6b442a, label: 'Pleistocene Barind Clay Hardpan' },
        { y: -2.9, h: 0.9, color: 0x1e607a, label: 'Capillary Fringe & Deep Aquifer (26.4m)' },
      ];

      horizons.forEach((hz, idx) => {
        const geo = new THREE.BoxGeometry(3.4, hz.h, 3.4);
        const mat = new THREE.MeshStandardMaterial({
          color: hz.color,
          roughness: idx === 4 ? 0.25 : 0.78,
          metalness: idx === 4 ? 0.35 : 0.06,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = hz.y;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: 0x7ee7b8, transparent: true, opacity: 0.28 })
        );
        mesh.add(edges);
        if (idx === 0) layerCanopy.add(mesh);
        else if (idx === 1 || idx === 2) layerSurface.add(mesh);
        else layerSubsurface.add(mesh);
      });

      // Dynamic water saturation core inside root zone
      const waterGeo = new THREE.BoxGeometry(3.46, 1.2, 3.46);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.32,
        roughness: 0.2,
      });
      waterPlane = new THREE.Mesh(waterGeo, waterMat);
      waterPlane.position.y = 0.1;
      layerSurface.add(waterPlane);
    } else {
      // ==================== LAYER 3: AGRICULTURAL SURFACE TERRAIN ====================
      const terrainSize = 9.4;
      const segs = 64;
      const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segs, segs);
      terrainGeo.rotateX(-Math.PI / 2);

      const posAttr = terrainGeo.attributes.position;
      const colors = new Float32Array(posAttr.count * 3);
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        const vy = barindHeight(vx, vz);
        posAttr.setY(i, vy);

        // Natural Barind soil & terrace vegetation shading
        const normH = (vy + 1.1) / 2.2;
        const c = new THREE.Color();
        if (normH < 0.38) {
          c.setRGB(0.16, 0.38, 0.27); // lower moist terrace
        } else if (normH < 0.68) {
          c.setRGB(0.22, 0.49, 0.33); // mid terrace agricultural loam
        } else {
          c.setRGB(0.66, 0.44, 0.29); // high Barind terracotta ridge
        }
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      terrainGeo.computeVertexNormals();

      const terrainMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.82,
        metalness: 0.05,
        flatShading: false,
      });
      const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
      terrainMesh.castShadow = true;
      terrainMesh.receiveShadow = true;
      layerSurface.add(terrainMesh);

      // Interactive 3D Field Parcels (PARCEL A-01, PARCEL B-02, PARCEL C-03)
      const parcelSpecs = [
        { id: 'field-a01', code: 'PARCEL A-01', x: -1.9, z: -0.9, w: 3.1, d: 2.5, color: 0x16865b },
        { id: 'field-b02', code: 'PARCEL B-02', x: 1.8, z: -1.0, w: 2.9, d: 2.4, color: 0xd99a36 },
        { id: 'field-c03', code: 'PARCEL C-03', x: 0.1, z: 2.0, w: 3.8, d: 2.2, color: 0x398eaa },
      ];

      parcelSpecs.forEach((sp) => {
        const py = barindHeight(sp.x, sp.z) + 0.12;
        const pGeo = new THREE.BoxGeometry(sp.w, 0.12, sp.d);
        const pMat = new THREE.MeshStandardMaterial({
          color: sp.color,
          transparent: true,
          opacity: 0.72,
          roughness: 0.4,
          metalness: 0.1,
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(sp.x, py, sp.z);
        pMesh.userData = { fieldId: sp.id, code: sp.code };

        const border = new THREE.LineSegments(
          new THREE.EdgesGeometry(pGeo),
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 })
        );
        pMesh.add(border);
        layerSurface.add(pMesh);
        parcelMeshes.push(pMesh);
      });

      // Simulated ESP32 + FDR Sensor Tower at Parcel A-01
      const probeGroup = new THREE.Group();
      const mastGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.15, 12);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5, roughness: 0.3 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.y = 0.58;
      probeGroup.add(mast);

      const beaconGeo = new THREE.SphereGeometry(0.16, 16, 16);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.9,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 1.2;
      probeGroup.add(beacon);

      probeGroup.position.set(-1.9, barindHeight(-1.9, -0.9) + 0.15, -0.9);
      layerSurface.add(probeGroup);

      // Linked Cursor Pin
      const pinGeo = new THREE.CylinderGeometry(0.08, 0.01, 1.4, 12);
      const pinMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.7,
      });
      cursorPin = new THREE.Mesh(pinGeo, pinMat);
      cursorPin.position.set(0, 0.9, 0);
      cursorPin.visible = false;
      layerSurface.add(cursorPin);

      // ==================== LAYER 2: SPECTRAL CANOPY LAYER ====================
      canopyGeo = new THREE.PlaneGeometry(terrainSize * 0.94, terrainSize * 0.94, 44, 44);
      canopyGeo.rotateX(-Math.PI / 2);
      const cPos = canopyGeo.attributes.position;
      const cCols = new Float32Array(cPos.count * 3);
      for (let i = 0; i < cPos.count; i++) {
        const vx = cPos.getX(i);
        const vz = cPos.getZ(i);
        cPos.setY(i, barindHeight(vx, vz) * 0.65);
        cCols[i * 3] = 0.09;
        cCols[i * 3 + 1] = 0.68;
        cCols[i * 3 + 2] = 0.42;
      }
      canopyGeo.setAttribute('color', new THREE.BufferAttribute(cCols, 3));
      canopyGeo.computeVertexNormals();

      const canopyMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.68,
        roughness: 0.45,
        side: THREE.DoubleSide,
      });
      const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
      layerCanopy.add(canopyMesh);

      const canopyWire = new THREE.LineSegments(
        new THREE.WireframeGeometry(canopyGeo),
        new THREE.LineBasicMaterial({ color: 0xa7f3d0, transparent: true, opacity: 0.18 })
      );
      layerCanopy.add(canopyWire);

      // ==================== LAYER 4: SUBSURFACE ROOT ZONE & AQUIFER ====================
      const subGeo = new THREE.BoxGeometry(terrainSize, 1.35, terrainSize);
      const subMat = new THREE.MeshStandardMaterial({
        color: 0x5c3d28,
        roughness: 0.88,
        metalness: 0.05,
      });
      const subMesh = new THREE.Mesh(subGeo, subMat);
      subMesh.position.y = -0.8;
      layerSubsurface.add(subMesh);

      const aquiferGeo = new THREE.BoxGeometry(terrainSize * 0.98, 0.55, terrainSize * 0.98);
      const aquiferMat = new THREE.MeshStandardMaterial({
        color: 0x1d7091,
        transparent: true,
        opacity: 0.78,
        roughness: 0.25,
        metalness: 0.3,
      });
      const aquiferMesh = new THREE.Mesh(aquiferGeo, aquiferMat);
      aquiferMesh.position.y = -1.85;
      layerSubsurface.add(aquiferMesh);

      // ==================== LAYER 1: ATMOSPHERE & SOLAR RADIATION ====================
      const atmGeo = new THREE.PlaneGeometry(terrainSize * 0.92, terrainSize * 0.92, 16, 16);
      atmGeo.rotateX(-Math.PI / 2);
      const atmWire = new THREE.LineSegments(
        new THREE.WireframeGeometry(atmGeo),
        new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.28 })
      );
      layerAtmosphere.add(atmWire);

      // Solar radiation particles / streamlines
      const streamGroup = new THREE.Group();
      for (let i = -3; i <= 3; i += 1.5) {
        for (let j = -3; j <= 3; j += 1.5) {
          const rayGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8);
          const rayMat = new THREE.MeshBasicMaterial({
            color: 0xfde68a,
            transparent: true,
            opacity: 0.55,
          });
          const ray = new THREE.Mesh(rayGeo, rayMat);
          ray.position.set(i, 0.35, j);
          streamGroup.add(ray);
        }
      }
      layerAtmosphere.add(streamGroup);
    }

    // Update spectral colors when mode changes
    const applySpectralColors = (mode) => {
      if (!canopyGeo) return;
      const cPos = canopyGeo.attributes.position;
      const cCols = canopyGeo.attributes.color;
      for (let i = 0; i < cPos.count; i++) {
        const vx = cPos.getX(i);
        const vz = cPos.getZ(i);
        const val = (Math.sin(vx * 0.45) + Math.cos(vz * 0.45) + 2) / 4;
        const c = new THREE.Color();
        if (mode === 'NDMI' || mode === 'NDWI') {
          c.setHSL(0.54 - val * 0.12, 0.78, 0.38 + val * 0.22);
        } else if (mode === 'EVI') {
          c.setHSL(0.36 - val * 0.08, 0.82, 0.34 + val * 0.25);
        } else {
          // NDVI
          c.setHSL(0.28 + val * 0.14, 0.76, 0.32 + val * 0.24);
        }
        cCols.setXYZ(i, c.r, c.g, c.b);
      }
      cCols.needsUpdate = true;
    };

    // Pointer Interaction (Orbit, Hover, Click Parcel Selection)
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

      if (isDragging) {
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;
        stateRef.current.rotY += dx * 0.008;
        stateRef.current.rotX = Math.max(0.18, Math.min(1.25, stateRef.current.rotX + dy * 0.006));
        setCameraHud({
          az: Math.round(((stateRef.current.rotY * 180) / Math.PI) % 360),
          el: Math.round((stateRef.current.rotX * 180) / Math.PI),
          zoom: Number((13.5 / stateRef.current.zoom).toFixed(2)),
        });
        return;
      }

      if (parcelMeshes.length > 0) {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(parcelMeshes, false);
        if (hits.length > 0) {
          const hit = hits[0].object;
          setHoveredParcel(hit.userData.code);
          domElem.style.cursor = 'pointer';
          if (onCursorMove) {
            const pt = hits[0].point;
            const lat = 24.469 - (pt.z / 4.7) * 0.004;
            const lon = 88.33 + (pt.x / 4.7) * 0.004;
            onCursorMove({ lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)) });
          }
        } else {
          setHoveredParcel(null);
          domElem.style.cursor = 'grab';
        }
      }
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const handleClick = (e) => {
      if (parcelMeshes.length === 0 || !onSelectField) return;
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
      e.preventDefault();
      stateRef.current.zoom = Math.max(7.5, Math.min(20, stateRef.current.zoom + e.deltaY * 0.006));
      setCameraHud((prev) => ({
        ...prev,
        zoom: Number((13.5 / stateRef.current.zoom).toFixed(2)),
      }));
    };

    domElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    domElem.addEventListener('click', handleClick);
    domElem.addEventListener('wheel', handleWheel, { passive: false });

    let lastSpectral = stateRef.current.spectralMode;
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const st = stateRef.current;

      if (st.spectralMode !== lastSpectral) {
        applySpectralColors(st.spectralMode);
        lastSpectral = st.spectralMode;
      }

      if (!st.pauseMotion && !isDragging) {
        st.rotY += 0.0014;
      }

      // Smooth stratigraphic layer separation
      const targetSubY = st.exploded ? -1.45 : -0.25;
      const targetSurfY = 0;
      const targetCanopyY = st.exploded ? 1.55 : 0.35;
      const targetAtmY = st.exploded ? 3.1 : 1.25;

      layerSubsurface.position.y += (targetSubY - layerSubsurface.position.y) * 0.08;
      layerSurface.position.y += (targetSurfY - layerSurface.position.y) * 0.08;
      layerCanopy.position.y += (targetCanopyY - layerCanopy.position.y) * 0.08;
      layerAtmosphere.position.y += (targetAtmY + Math.sin(t * 1.5) * 0.06 - layerAtmosphere.position.y) * 0.08;

      // Highlight selected parcel
      parcelMeshes.forEach((pm) => {
        const isSel = pm.userData.fieldId === st.selectedFieldId;
        pm.scale.y = isSel ? 1.85 : 1.0;
        pm.material.opacity = isSel ? 0.92 : 0.62;
      });

      // Linked cursor pin from 2D map
      if (cursorPin) {
        if (st.cursorGeo && st.cursorGeo.lat && st.cursorGeo.lon) {
          const cx = ((st.cursorGeo.lon - 88.33) / 0.004) * 4.7;
          const cz = ((24.469 - st.cursorGeo.lat) / 0.004) * 4.7;
          cursorPin.position.set(
            Math.max(-4.2, Math.min(4.2, cx)),
            barindHeight(cx, cz) + 0.8,
            Math.max(-4.2, Math.min(4.2, cz))
          );
          cursorPin.visible = true;
        } else {
          cursorPin.visible = false;
        }
      }

      if (waterPlane) {
        const normMoist = Math.max(0.12, Math.min(0.45, (st.moisturePct || 25.4) / 100));
        waterPlane.scale.y = 0.5 + normMoist * 1.8;
      }

      // Position camera along spherical orbit
      const dist = st.zoom;
      camera.position.x = dist * Math.sin(st.rotY) * Math.cos(st.rotX);
      camera.position.y = dist * Math.sin(st.rotX);
      camera.position.z = dist * Math.cos(st.rotY) * Math.cos(st.rotX);
      camera.lookAt(0, st.activeLayer === 1 ? 1.5 : st.activeLayer === 4 ? -1.1 : 0, 0);

      renderer.render(scene, camera);
    };

    applySpectralColors(stateRef.current.spectralMode);
    animate();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 720;
      const nh = container.clientHeight || height;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      domElem.removeEventListener('click', handleClick);
      domElem.removeEventListener('wheel', handleWheel);
      renderer.dispose();
    };
  }, [height, variant, onSelectField, onCursorMove]);

  const activeParcelObj = PARCELS.find((p) => p.id === selectedFieldId) || PARCELS[0];

  return (
    <div
      className="stage-dark"
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 25%, #10261D 0%, #081510 62%, #050B08 100%)',
        border: '1px solid rgba(52, 211, 153, 0.26)',
        userSelect: 'none',
      }}
    >
      {/* Top-Left Minimal Stage Telemetry Pill */}
      <div
        style={{
          position: 'absolute',
          top: '0.85rem',
          left: '0.95rem',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          pointerEvents: 'none',
        }}
      >
        <span
          className="mono"
          style={{
            background: 'rgba(9, 22, 16, 0.88)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(52, 211, 153, 0.38)',
            color: '#34D399',
            padding: '0.28rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}
        >
          WEBGL 3D DIGITAL TWIN • {activeParcelObj.code} ({activeParcelObj.crop})
        </span>
        {hoveredParcel && (
          <span
            className="mono"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFFFFF',
              padding: '0.26rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            Click to focus {hoveredParcel}
          </span>
        )}
      </div>

      {/* Top-Right Camera Controls */}
      <div
        style={{
          position: 'absolute',
          top: '0.85rem',
          right: '0.95rem',
          zIndex: 10,
          display: 'flex',
          gap: '0.35rem',
        }}
      >
        <button
          type="button"
          onClick={() => {
            stateRef.current.zoom = Math.max(8, stateRef.current.zoom - 1.5);
          }}
          style={{
            background: 'rgba(9, 22, 16, 0.88)',
            color: '#ECFDF5',
            border: '1px solid rgba(52, 211, 153, 0.24)',
            borderRadius: '8px',
            padding: '0.28rem 0.55rem',
            fontSize: '0.72rem',
            fontWeight: 600,
          }}
          title="Zoom In 3D Scene"
        >
          + Zoom
        </button>
        <button
          type="button"
          onClick={() => {
            stateRef.current.zoom = Math.min(19, stateRef.current.zoom + 1.5);
          }}
          style={{
            background: 'rgba(9, 22, 16, 0.88)',
            color: '#ECFDF5',
            border: '1px solid rgba(52, 211, 153, 0.24)',
            borderRadius: '8px',
            padding: '0.28rem 0.55rem',
            fontSize: '0.72rem',
            fontWeight: 600,
          }}
          title="Zoom Out 3D Scene"
        >
          - Zoom
        </button>
        <button
          type="button"
          onClick={() => {
            stateRef.current.rotY = 0.58;
            stateRef.current.rotX = 0.52;
            stateRef.current.zoom = variant === 'pedon' ? 10.5 : 13.5;
          }}
          style={{
            background: 'rgba(9, 22, 16, 0.88)',
            color: '#ECFDF5',
            border: '1px solid rgba(52, 211, 153, 0.24)',
            borderRadius: '8px',
            padding: '0.28rem 0.55rem',
            fontSize: '0.72rem',
            fontWeight: 600,
          }}
          title="Reset 3D Camera Orbit"
        >
          Reset View
        </button>
      </div>

      {/* WebGL Mount Container or Graceful Fallback */}
      {webglSupported ? (
        <div
          ref={mountRef}
          style={{ width: '100%', height: '100%', cursor: 'grab' }}
          aria-label="Interactive 3D Barind Agricultural Landscape Digital Twin"
          role="img"
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: '#D7E3DC',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.35rem' }}>
            2D Isometric Stratigraphic Fallback Active ({activeParcelObj.code})
          </div>
          <div className="mono" style={{ fontSize: '0.76rem', color: '#9FB3A6' }}>
            Godagari Centroid: 24.469°N, 88.330°E • Spectral Layer: {spectralMode} • Zr = 0.50m
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '0.75rem',
          left: '0.95rem',
          right: '0.95rem',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          pointerEvents: 'none',
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: '0.68rem',
            color: 'rgba(236, 253, 245, 0.86)',
            background: 'rgba(9, 22, 16, 0.88)',
            padding: '0.24rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid rgba(52, 211, 153, 0.22)',
          }}
        >
          Drag to orbit • Scroll to zoom • Click parcel to inspect • Az {cameraHud.az}° El {cameraHud.el}°
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {LAYER_CONFIG.map((ly) => (
            <span
              key={ly.id}
              className="mono"
              style={{
                fontSize: '0.66rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '999px',
                background: activeLayer === ly.id ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(9, 22, 16, 0.85)',
                color: '#FFFFFF',
                border: `1px solid ${activeLayer === ly.id ? '#6EE7B7' : 'rgba(52, 211, 153, 0.24)'}`,
              }}
            >
              {ly.shortName}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
export { LAYER_CONFIG };
