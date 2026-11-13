import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { PARCELS } from '../context/AgriSenseContext';

export default function LeafletGisMap({
  selectedFieldId = 'field-a01',
  onSelectField,
  spectralOverlay = 'NDVI',
  showTether = true,
  showSensorNode = true,
  basemapMode = 'satellite', // 'satellite' | 'Topographic'
  cursorGeo = null,
  onCursorMove = null,
  height = 460,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    polygons: [],
    tetherLine: null,
    nasaMarker: null,
    sensorMarker: null,
    cursorMarker: null,
    tileLayer: null,
  });

  const [activeBasemap, setActiveBasemap] = useState(basemapMode);

  useEffect(() => {
    setActiveBasemap(basemapMode);
  }, [basemapMode]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return undefined;

    const map = L.map(container, {
      center: [24.469, 88.33],
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    map.on('mousemove', (e) => {
      if (onCursorMove) {
        onCursorMove({
          lat: Number(e.latlng.lat.toFixed(5)),
          lon: Number(e.latlng.lng.toFixed(5)),
        });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onCursorMove]);

  // Update basemap tile layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.tileLayer) {
      map.removeLayer(layersRef.current.tileLayer);
    }

    const tileUrl =
      activeBasemap === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution =
      activeBasemap === 'satellite'
        ? 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, Sentinel-2 Overlay'
        : '&copy; OpenStreetMap contributors';

    const tl = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution,
    }).addTo(map);

    layersRef.current.tileLayer = tl;
  }, [activeBasemap]);

  // Render parcels, ESP32 node, and 34.8 km NASA POWER tether
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous vector overlays
    layersRef.current.polygons.forEach((p) => map.removeLayer(p));
    layersRef.current.polygons = [];

    if (layersRef.current.tetherLine) {
      map.removeLayer(layersRef.current.tetherLine);
      layersRef.current.tetherLine = null;
    }
    if (layersRef.current.nasaMarker) {
      map.removeLayer(layersRef.current.nasaMarker);
      layersRef.current.nasaMarker = null;
    }
    if (layersRef.current.sensorMarker) {
      map.removeLayer(layersRef.current.sensorMarker);
      layersRef.current.sensorMarker = null;
    }

    // Color palette by spectral mode
    const getParcelColor = (p, isSelected) => {
      if (spectralOverlay === 'NDMI' || spectralOverlay === 'NDWI') {
        return p.ndmi >= 0.2 ? '#0EA5E9' : '#F59E0B';
      }
      if (spectralOverlay === 'EVI') {
        return p.ndvi >= 0.65 ? '#10B981' : '#D97706';
      }
      if (p.ndvi >= 0.65) return isSelected ? '#10B981' : '#16865B';
      if (p.ndvi >= 0.5) return '#F59E0B';
      return '#EF4444';
    };

    PARCELS.forEach((parcel) => {
      const isSelected = parcel.id === selectedFieldId;
      const fillCol = getParcelColor(parcel, isSelected);
      const poly = L.polygon(parcel.coords, {
        color: isSelected ? '#FFFFFF' : fillCol,
        weight: isSelected ? 3 : 2,
        fillColor: fillCol,
        fillOpacity: isSelected ? 0.52 : 0.34,
      }).addTo(map);

      poly.bindTooltip(
        `<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px;">
          <strong>${parcel.code} — ${parcel.name}</strong><br/>
          Crop: ${parcel.crop} (${parcel.area_ha} ha)<br/>
          NDVI: <strong>${parcel.ndvi.toFixed(2)}</strong> • NDMI: <strong>${parcel.ndmi.toFixed(2)}</strong><br/>
          Soil VWC: <strong>${parcel.vwc}%</strong> (Simulated)
        </div>`,
        { sticky: true }
      );

      poly.on('click', () => {
        if (onSelectField) onSelectField(parcel.id);
      });

      layersRef.current.polygons.push(poly);
    });

    // Simulated ESP32 Sensor Node Marker
    if (showSensorNode) {
      const sensorCircle = L.circleMarker([24.4696, 88.3292], {
        radius: 8,
        color: '#FFFFFF',
        weight: 2,
        fillColor: '#0EA5E9',
        fillOpacity: 0.95,
      }).addTo(map);
      sensorCircle.bindPopup(
        `<strong>ESP32 + Capacitive FDR v2 Node</strong><br/>
        Coordinates: 24.4696°N, 88.3292°E<br/>
        Status: <code>is_simulated = true</code> (UNCALIBRATED)`
      );
      layersRef.current.sensorMarker = sensorCircle;
    }

    // 34.8 km NASA POWER Spatial Offset Tether
    if (showTether) {
      const tether = L.polyline(
        [
          [24.469, 88.33],
          [24.3636, 88.6241],
        ],
        {
          color: '#F59E0B',
          weight: 2.5,
          dashArray: '6, 6',
        }
      ).addTo(map);

      const nasaNode = L.circleMarker([24.3636, 88.6241], {
        radius: 7,
        color: '#FFFFFF',
        weight: 2,
        fillColor: '#F59E0B',
        fillOpacity: 0.95,
      }).addTo(map);

      nasaNode.bindTooltip(
        'NASA POWER Reanalysis Grid Cell (24.3636°N, 88.6241°E • ~34.8 km ESE)',
        { permanent: false }
      );

      layersRef.current.tetherLine = tether;
      layersRef.current.nasaMarker = nasaNode;
    }
  }, [selectedFieldId, spectralOverlay, showTether, showSensorNode, onSelectField]);

  // Update Linked Cursor Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.cursorMarker) {
      map.removeLayer(layersRef.current.cursorMarker);
      layersRef.current.cursorMarker = null;
    }

    if (cursorGeo && cursorGeo.lat && cursorGeo.lon) {
      const cm = L.circleMarker([cursorGeo.lat, cursorGeo.lon], {
        radius: 5,
        color: '#F59E0B',
        weight: 2,
        fillColor: '#FDE68A',
        fillOpacity: 0.9,
      }).addTo(map);
      layersRef.current.cursorMarker = cm;
    }
  }, [cursorGeo]);

  const handleFitRegion = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.fitBounds(
      [
        [24.469, 88.33],
        [24.3636, 88.6241],
      ],
      { padding: [36, 36] }
    );
  };

  const handleFitParcels = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([24.469, 88.33], 16);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Top-Left Map Controls */}
      <div
        style={{
          position: 'absolute',
          top: '0.75rem',
          left: '0.75rem',
          zIndex: 500,
          display: 'flex',
          gap: '0.35rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveBasemap((b) => (b === 'satellite' ? 'topo' : 'satellite'))}
          style={{
            background: 'rgba(15, 34, 25, 0.88)',
            color: '#F4F7F5',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '8px',
            padding: '0.32rem 0.65rem',
            fontSize: '0.72rem',
            fontWeight: 600,
          }}
        >
          Basemap: {activeBasemap === 'satellite' ? 'Esri Satellite' : 'OSM Cartographic'}
        </button>
        <button
          type="button"
          onClick={handleFitParcels}
          style={{
            background: 'rgba(15, 34, 25, 0.88)',
            color: '#F4F7F5',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '8px',
            padding: '0.32rem 0.65rem',
            fontSize: '0.72rem',
            fontWeight: 600,
          }}
        >
          Focus Godagari Parcels
        </button>
        {showTether && (
          <button
            type="button"
            onClick={handleFitRegion}
            style={{
              background: 'rgba(5, 150, 105, 0.9)',
              color: '#FFFFFF',
              border: '1px solid rgba(110, 231, 183, 0.48)',
              borderRadius: '8px',
              padding: '0.32rem 0.65rem',
              fontSize: '0.72rem',
              fontWeight: 600,
            }}
          >
            View 34.8 km NASA Tether
          </button>
        )}
      </div>

      {/* Leaflet DOM Container */}
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '100%' }}
        aria-label="Interactive 2D GIS Satellite and Parcel Map of Godagari Upazila"
      />
    </div>
  );
}
