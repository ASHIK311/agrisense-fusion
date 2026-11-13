import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Globe,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Satellite,
} from 'lucide-react';
import { PARCELS } from '../context/AgriSenseContext';

export const JOURNEY_STAGES = [
  {
    id: 'orbit',
    number: '01',
    name: 'Earth Orbit',
    shortName: 'Earth Orbit',
    subtitle: 'Global Satellite Perspective',
    center: [21.5, 82.0],
    zoom: 3,
    description: 'Observation satellites in low Earth orbit monitor planetary agroclimatology and atmospheric circulation.',
    badge: 'NASA GIBS • ORBITAL',
  },
  {
    id: 'south-asia',
    number: '02',
    name: 'South Asia & Bay of Bengal',
    shortName: 'South Asia',
    subtitle: 'Monsoonal Climatology',
    center: [22.5, 88.5],
    zoom: 5,
    description: 'The South Asian monsoon system drives annual hydrologic recharge across the Ganges-Brahmaputra basin.',
    badge: 'REGIONAL CIRCULATION',
  },
  {
    id: 'bangladesh',
    number: '03',
    name: 'Bangladesh',
    shortName: 'Bangladesh',
    subtitle: 'Riverine Delta & Agro-Ecological Zones',
    center: [23.85, 89.85],
    zoom: 7,
    description: '30 distinct Agro-Ecological Zones (AEZs) define the agrarian diversity of Bangladesh from floodplains to terraces.',
    badge: 'BARC AEZ FRAMEWORK',
  },
  {
    id: 'rajshahi',
    number: '04',
    name: 'Rajshahi Division',
    shortName: 'Rajshahi',
    subtitle: 'High Barind Tract (AEZ 26)',
    center: [24.45, 88.55],
    zoom: 10,
    description: 'Uplifted Pleistocene red-yellow clay terraces marked by limited surface recharge and intense dry-season pumping.',
    badge: 'AEZ 26 ELEVATED TERRACE',
  },
  {
    id: 'godagari',
    number: '05',
    name: 'Godagari Upazila',
    shortName: 'Godagari',
    subtitle: 'Primary Study Area Centroid',
    center: [24.469, 88.330],
    zoom: 13,
    description: 'Centroid: 24.469°N, 88.330°E. Bordered by the Padma River, facing severe centrifugal suction limits for groundwater.',
    badge: 'STUDY CENTROID • 24.469°N, 88.330°E',
  },
  {
    id: 'parcels',
    number: '06',
    name: 'Agricultural Parcels & NASA Tether',
    shortName: 'Field Parcels',
    subtitle: 'Field Shift Demonstration Sites',
    center: [24.469, 88.330],
    zoom: 16,
    description: 'Demonstration fields Parcel A-01, B-02, and C-03 with the ~34.8 km ESE spatial tether to NASA POWER reanalysis grid point.',
    badge: 'PARCEL VECTORS + 34.8 KM TETHER',
  },
];

const NASA_POWER_COORD = [24.3636, 88.6241];
const GODAGARI_CENTROID = [24.4690, 88.3300];

const SATELLITE_PASS_SVG = `
  <div style="width:88px;height:88px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;">
    <div class="sat-map-beacon" style="position:absolute;width:74px;height:74px;left:7px;top:7px;border-radius:9999px;border:1.5px solid rgba(56,189,248,0.65);background:radial-gradient(circle,rgba(52,211,153,0.24) 0%,rgba(56,189,248,0.08) 55%,transparent 75%);"></div>
    <svg width="78" height="78" viewBox="0 0 120 120" fill="none" style="position:relative;z-index:2;filter:drop-shadow(0 6px 14px rgba(0,0,0,0.72));transform:rotate(-16deg);">
      <defs>
        <linearGradient id="mapSatWing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#38BDF8"/>
          <stop offset="50%" stop-color="#2563EB"/>
          <stop offset="100%" stop-color="#1E3A8A"/>
        </linearGradient>
        <linearGradient id="mapSatGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FEF08A"/>
          <stop offset="55%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#92400E"/>
        </linearGradient>
      </defs>
      <!-- Left Twin Cobalt Solar Wing -->
      <rect x="6" y="45" width="38" height="24" rx="2.5" fill="url(#mapSatWing)" stroke="#BAE6FD" stroke-width="1.3"/>
      <line x1="18" y1="45" x2="18" y2="69" stroke="#BAE6FD" stroke-opacity="0.65" stroke-width="0.9"/>
      <line x1="31" y1="45" x2="31" y2="69" stroke="#BAE6FD" stroke-opacity="0.65" stroke-width="0.9"/>
      <line x1="6" y1="57" x2="44" y2="57" stroke="#BAE6FD" stroke-opacity="0.65" stroke-width="0.9"/>
      <!-- Right Twin Cobalt Solar Wing -->
      <rect x="76" y="45" width="38" height="24" rx="2.5" fill="url(#mapSatWing)" stroke="#BAE6FD" stroke-width="1.3"/>
      <line x1="89" y1="45" x2="89" y2="69" stroke="#BAE6FD" stroke-opacity="0.65" stroke-width="0.9"/>
      <line x1="102" y1="45" x2="102" y2="69" stroke="#BAE6FD" stroke-opacity="0.65" stroke-width="0.9"/>
      <line x1="76" y1="57" x2="114" y2="57" stroke="#BAE6FD" stroke-opacity="0.65" stroke-width="0.9"/>
      <!-- Truss Boom -->
      <rect x="44" y="54" width="32" height="6" rx="1.5" fill="#CBD5E1"/>
      <!-- Spacecraft Gold Foil Bus & Titanium Optics -->
      <rect x="50" y="42" width="20" height="30" rx="4" fill="url(#mapSatGold)" stroke="#FEF3C7" stroke-width="1.2"/>
      <circle cx="60" cy="57" r="5.5" fill="#0F172A" stroke="#38BDF8" stroke-width="1.5"/>
      <circle cx="60" cy="57" r="2.2" fill="#34D399"/>
      <!-- High-Gain Antenna Dish -->
      <ellipse cx="60" cy="34" rx="7" ry="4" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.1"/>
      <line x1="60" y1="38" x2="60" y2="42" stroke="#E2E8F0" stroke-width="1.4"/>
    </svg>
    <div style="margin-top:-6px;background:rgba(6,18,14,0.88);border:1px solid rgba(56,189,248,0.55);color:#BAE6FD;padding:2px 7px;border-radius:9999px;font-size:9px;font-weight:800;letter-spacing:0.06em;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.55);font-family:var(--font-mono);">
      NASA / SENTINEL-2 • 786 KM ORBIT
    </div>
  </div>
`;

export default function EarthGodagariMap({
  selectedFieldId = 'field-godagari-a',
  onSelectField = () => {},
  height = 560,
  className = '',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [basemapMode, setBasemapMode] = useState('satellite'); // 'satellite' | 'gibs' | 'street'
  const [showTether, setShowTether] = useState(true);
  const [showParcels, setShowParcels] = useState(true);
  const [showSatellite, setShowSatellite] = useState(true);
  const [cursorCoords, setCursorCoords] = useState(null);

  const currentStage = JOURNEY_STAGES[currentStageIndex];

  // Initialize Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return undefined;

    const map = L.map(container, {
      center: JOURNEY_STAGES[0].center,
      zoom: JOURNEY_STAGES[0].zoom,
      zoomControl: false,
      attributionControl: true,
      minZoom: 2,
      maxZoom: 19,
      worldCopyJump: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('mousemove', (e) => {
      setCursorCoords({
        lat: Number(e.latlng.lat.toFixed(5)),
        lon: Number(e.latlng.lng.toFixed(5)),
      });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Basemap Tile Layer Management
  const tileLayerRef = useRef(null);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    let attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

    if (basemapMode === 'gibs') {
      // NASA GIBS MODIS Terra True Color (WMTS / EPSG:3857)
      url = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2026-03-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg';
      attribution = 'NASA Global Imagery Browse Services (GIBS) &mdash; Earth Observing System Data and Information System (EOSDIS)';
    } else if (basemapMode === 'street') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }

    const tl = L.tileLayer(url, {
      maxZoom: 19,
      attribution,
    }).addTo(map);

    tileLayerRef.current = tl;
  }, [basemapMode]);

  // Vector Layers (Parcels, NASA POWER Tether, Markers, Orbiting Satellite)
  const vectorLayersRef = useRef({
    polygons: [],
    tetherLine: null,
    nasaMarker: null,
    centroidMarker: null,
    orbitTrack: null,
    swathPolygon: null,
    scanConePoly: null,
    nadirRing: null,
    satMarker: null,
  });

  // Live Animated Satellite & Optical Swath Overlay Directly Inside Leaflet Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return undefined;

    const layers = vectorLayersRef.current;
    const clearSatLayers = () => {
      if (layers.orbitTrack) map.removeLayer(layers.orbitTrack);
      if (layers.swathPolygon) map.removeLayer(layers.swathPolygon);
      if (layers.scanConePoly) map.removeLayer(layers.scanConePoly);
      if (layers.nadirRing) map.removeLayer(layers.nadirRing);
      if (layers.satMarker) map.removeLayer(layers.satMarker);
      layers.orbitTrack = null;
      layers.swathPolygon = null;
      layers.scanConePoly = null;
      layers.nadirRing = null;
      layers.satMarker = null;
    };

    clearSatLayers();
    if (!showSatellite) return undefined;

    const target = JOURNEY_STAGES[currentStageIndex];
    const [cLat, cLon] = target.center;
    const spanLat = Math.max(0.0018, 28 / Math.pow(2, target.zoom - 2));
    const spanLon = spanLat * 0.72;

    // Descending sun-synchronous ground track crossing cleanly over active target & Godagari
    const trackStart = [cLat + spanLat * 0.44, cLon + spanLon * 0.58];
    const trackEnd = [cLat - spanLat * 0.36, cLon - spanLon * 0.38];

    layers.orbitTrack = L.polyline([trackStart, trackEnd], {
      color: '#38BDF8',
      weight: 2,
      dashArray: '7, 6',
      opacity: 0.78,
    }).addTo(map);

    const computeNadirAt = (u) => [
      trackStart[0] + (trackEnd[0] - trackStart[0]) * u,
      trackStart[1] + (trackEnd[1] - trackStart[1]) * u,
    ];

    const halfSwathLat = spanLat * 0.095;
    const halfSwathLon = spanLon * 0.095;
    const altOffsetLat = spanLat * 0.16;
    const altOffsetLon = spanLon * 0.16;

    const getPassCoords = (u) => {
      const nadir = computeNadirAt(u);
      const sat = [nadir[0] + altOffsetLat, nadir[1] + altOffsetLon];
      const nadirPoly = [
        [nadir[0] + halfSwathLat * 0.85, nadir[1] - halfSwathLon * 0.9],
        [nadir[0] + halfSwathLat * 0.85, nadir[1] + halfSwathLon * 0.9],
        [nadir[0] - halfSwathLat * 0.85, nadir[1] + halfSwathLon * 0.9],
        [nadir[0] - halfSwathLat * 0.85, nadir[1] - halfSwathLon * 0.9],
      ];
      const cone = [
        sat,
        [nadir[0] + halfSwathLat * 0.75, nadir[1] - halfSwathLon * 0.8],
        [nadir[0] - halfSwathLat * 0.75, nadir[1] + halfSwathLon * 0.8],
      ];
      return { nadir, sat, nadirPoly, cone };
    };

    const init = getPassCoords(0.42);
    layers.swathPolygon = L.polygon(init.nadirPoly, {
      color: '#34D399',
      weight: 1.5,
      fillColor: '#38BDF8',
      fillOpacity: 0.16,
      dashArray: '4, 3',
    }).addTo(map);

    layers.scanConePoly = L.polygon(init.cone, {
      color: '#38BDF8',
      weight: 1,
      opacity: 0.45,
      fillColor: '#34D399',
      fillOpacity: 0.14,
    }).addTo(map);

    layers.nadirRing = L.circleMarker(init.nadir, {
      radius: 7,
      color: '#34D399',
      weight: 2,
      fillColor: '#38BDF8',
      fillOpacity: 0.45,
    })
      .bindTooltip('<strong>Orbital Nadir Scan Footprint</strong><br/>Copernicus Sentinel-2 MSI / NASA GPM Swath', {
        direction: 'bottom',
        className: 'gis-tooltip',
      })
      .addTo(map);

    const satIcon = L.divIcon({
      className: 'custom-map-satellite',
      html: SATELLITE_PASS_SVG,
      iconSize: [88, 88],
      iconAnchor: [44, 44],
    });
    layers.satMarker = L.marker(init.sat, {
      icon: satIcon,
      zIndexOffset: 900,
      interactive: false,
    }).addTo(map);

    const startTime = performance.now();
    let rafId;
    const stepOrbit = (now) => {
      const sec = (now - startTime) * 0.001;
      const u = 0.44 + Math.sin(sec * 0.55) * 0.24;
      const next = getPassCoords(u);
      layers.satMarker?.setLatLng(next.sat);
      layers.nadirRing?.setLatLng(next.nadir);
      layers.swathPolygon?.setLatLngs(next.nadirPoly);
      layers.scanConePoly?.setLatLngs(next.cone);
      rafId = requestAnimationFrame(stepOrbit);
    };
    rafId = requestAnimationFrame(stepOrbit);

    return () => {
      cancelAnimationFrame(rafId);
      clearSatLayers();
    };
  }, [currentStageIndex, showSatellite]);

  const renderVectors = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const layers = vectorLayersRef.current;

    // Remove existing layers
    layers.polygons.forEach((p) => map.removeLayer(p));
    layers.polygons = [];
    if (layers.tetherLine) map.removeLayer(layers.tetherLine);
    if (layers.nasaMarker) map.removeLayer(layers.nasaMarker);
    if (layers.centroidMarker) map.removeLayer(layers.centroidMarker);

    // Only render parcel vectors if in closer stages
    if (showParcels && currentStageIndex >= 4) {
      PARCELS.forEach((parcel) => {
        const isSelected = parcel.id === selectedFieldId;
        const color = isSelected ? '#D49A3D' : '#2F8F5B';

        const poly = L.polygon(parcel.coords, {
          color,
          weight: isSelected ? 3 : 2,
          fillColor: color,
          fillOpacity: isSelected ? 0.45 : 0.25,
        });

        poly.bindTooltip(
          `<strong>${parcel.code}</strong><br/>${parcel.name}<br/>Area: ${parcel.area_ha} ha • ${parcel.crop}`,
          { permanent: false, direction: 'top', className: 'gis-tooltip' }
        );

        poly.on('click', () => {
          onSelectField(parcel.id);
        });

        poly.addTo(map);
        layers.polygons.push(poly);
      });
    }

    // 34.8 km NASA POWER Offset Tether
    if (showTether && currentStageIndex >= 3) {
      // Geodesic tether line
      const tether = L.polyline([GODAGARI_CENTROID, NASA_POWER_COORD], {
        color: '#D49A3D',
        weight: 2.5,
        dashArray: '6, 6',
        opacity: 0.85,
      });

      tether.bindTooltip(
        '<strong>34.8 km ESE Spatial Tether</strong><br/>From Godagari Centroid (24.469°N) to NASA POWER MERRA-2 Grid (24.3636°N)',
        { permanent: false, direction: 'center', className: 'gis-tooltip' }
      );
      tether.addTo(map);
      layers.tetherLine = tether;

      // NASA POWER extraction marker
      const nasaIcon = L.divIcon({
        className: 'custom-nasa-pin',
        html: `<div style="background:#D49A3D;color:#12100E;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:800;border:1px solid #FFFFFF;box-shadow:0 4px 12px rgba(0,0,0,0.4);white-space:nowrap;display:flex;align-items:center;gap:4px;">
          <span>NASA POWER Grid (34.8km ESE)</span>
        </div>`,
        iconSize: [160, 24],
        iconAnchor: [80, 12],
      });
      const nasaM = L.marker(NASA_POWER_COORD, { icon: nasaIcon }).addTo(map);
      layers.nasaMarker = nasaM;

      // Godagari Primary Centroid Marker
      const centroidIcon = L.divIcon({
        className: 'custom-centroid-pin',
        html: `<div style="background:#123B2A;color:#FFFFFF;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:800;border:1px solid #2F8F5B;box-shadow:0 4px 12px rgba(0,0,0,0.4);white-space:nowrap;display:flex;align-items:center;gap:4px;">
          <span>Godagari Study Area (24.469°N, 88.330°E)</span>
        </div>`,
        iconSize: [180, 24],
        iconAnchor: [90, 12],
      });
      const centM = L.marker(GODAGARI_CENTROID, { icon: centroidIcon }).addTo(map);
      layers.centroidMarker = centM;
    }
  }, [currentStageIndex, selectedFieldId, showParcels, showTether, onSelectField]);

  useEffect(() => {
    renderVectors();
  }, [renderVectors]);

  // Navigate to Stage with Smooth FlyTo
  const flyToStage = useCallback((index) => {
    const map = mapInstanceRef.current;
    if (!map || index < 0 || index >= JOURNEY_STAGES.length) return;

    const target = JOURNEY_STAGES[index];
    setCurrentStageIndex(index);

    map.flyTo(target.center, target.zoom, {
      duration: 1.8,
      easeLinearity: 0.25,
    });
  }, []);

  // Auto-play camera journey loop
  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = setInterval(() => {
      setCurrentStageIndex((prev) => {
        const next = (prev + 1) % JOURNEY_STAGES.length;
        const target = JOURNEY_STAGES[next];
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(target.center, target.zoom, {
            duration: 2.2,
            easeLinearity: 0.25,
          });
        }
        return next;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <div
      className={`earth-godagari-map-wrapper ${className}`}
      style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 235, 210, 0.18)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
        background: '#0B2017',
      }}
    >
      {/* Top Floating Glass HUD Bar: Journey Stages Scrubber */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          right: '1rem',
          zIndex: 800,
          background: 'rgba(18, 59, 42, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: '9999px',
          padding: '0.45rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        {/* Play/Pause & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="btn btn-glass"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', background: isPlaying ? '#D49A3D' : 'rgba(255,255,255,0.1)' }}
            title={isPlaying ? 'Pause Camera Journey' : 'Play Automatic Camera Journey'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? 'Pause Tour' : 'Auto Tour'}</span>
          </button>

          <button
            type="button"
            onClick={() => flyToStage(0)}
            className="btn btn-glass"
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.74rem' }}
            title="Reset to Earth Orbit"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* 6 Stage Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.22rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {JOURNEY_STAGES.map((st, idx) => {
            const isActive = currentStageIndex === idx;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  flyToStage(idx);
                }}
                className={`glass-pill-tab ${isActive ? 'active' : ''}`}
                style={{
                  fontSize: '0.7rem',
                  padding: '0.28rem 0.56rem',
                  background: isActive ? '#34D399' : 'transparent',
                  color: isActive ? '#031912' : 'rgba(255, 255, 255, 0.78)',
                  fontWeight: isActive ? 800 : 500,
                }}
                title={st.name}
              >
                <span>{st.number}.</span>
                <span>{st.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Live Satellite Pass Toggle + Basemap Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={() => setShowSatellite((s) => !s)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: showSatellite ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.08)',
              color: showSatellite ? '#7DD3FC' : 'rgba(255, 255, 255, 0.65)',
              border: `1px solid ${showSatellite ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.16)'}`,
              borderRadius: '9999px',
              padding: '0.26rem 0.6rem',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title="Toggle Live Orbiting Satellite Pass & Scan Swath Inside Map"
          >
            <Satellite size={12} />
            <span>{showSatellite ? 'Satellite: ON' : 'Satellite: OFF'}</span>
          </button>

          <select
            value={basemapMode}
            onChange={(e) => setBasemapMode(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '9999px',
              padding: '0.28rem 0.65rem',
              fontSize: '0.7rem',
              cursor: 'pointer',
            }}
          >
            <option value="satellite" style={{ background: '#123B2A' }}>Esri True Color</option>
            <option value="gibs" style={{ background: '#123B2A' }}>NASA GIBS Terra</option>
            <option value="street" style={{ background: '#123B2A' }}>OpenStreetMap</option>
          </select>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: `${height}px`,
          background: '#0B2017',
        }}
      />

      {/* Bottom Floating Stage Info Card */}
      <div
        style={{
          position: 'absolute',
          bottom: '1.5rem',
          left: '1rem',
          zIndex: 800,
          maxWidth: '410px',
          background: 'rgba(6, 20, 14, 0.84)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(52, 211, 153, 0.28)',
          borderRadius: '16px',
          padding: '0.85rem 1.05rem',
          color: '#FFFFFF',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#34D399',
            }}
          >
            Stage {currentStage.number} • {currentStage.subtitle}
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              background: 'rgba(212, 154, 61, 0.22)',
              border: '1px solid #D49A3D',
              color: '#F59E0B',
              padding: '0.12rem 0.45rem',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
            }}
          >
            {currentStage.badge}
          </span>
        </div>

        <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem', color: '#FFFFFF' }}>
          {currentStage.name}
        </h4>

        <p style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.84)', lineHeight: 1.48, marginBottom: '0.5rem' }}>
          {currentStage.description}
        </p>

        {/* Live Coordinate / Geodetic Telemetry */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.68rem',
            color: 'rgba(255, 255, 255, 0.68)',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            paddingTop: '0.4rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>
            Target: {currentStage.center[0].toFixed(3)}°N, {currentStage.center[1].toFixed(3)}°E
          </span>
          {cursorCoords && (
            <span>
              Cursor: {cursorCoords.lat}°N, {cursorCoords.lon}°E
            </span>
          )}
          <span>Zoom: {currentStage.zoom}x</span>
        </div>
      </div>

      {/* 34.8 km Offset Legend Pill (Clear Above Leaflet Esri Attribution) */}
      <div
        style={{
          position: 'absolute',
          bottom: '2.15rem',
          right: '3.6rem',
          zIndex: 800,
          background: 'rgba(6, 20, 14, 0.86)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(212, 154, 61, 0.45)',
          borderRadius: '9999px',
          padding: '0.3rem 0.78rem',
          fontSize: '0.69rem',
          fontWeight: 600,
          color: '#F5F2E9',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
        }}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D49A3D', display: 'inline-block' }} />
        <span>NASA POWER Tether: ~34.8 km ESE Offset</span>
      </div>
    </div>
  );
}
