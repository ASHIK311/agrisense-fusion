import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BANGLADESH_REGIONS, buildCustomLocation } from '../data/regions';
import { useAgriSense } from '../context/AgriSenseContext';

export default function LocationMapPickerModal({ isOpen, onClose }) {
  const { selectedLocation, setSelectedLocation, setLocationAssessment } = useAgriSense();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const pinRef = useRef(null);

  const [draftLoc, setDraftLoc] = useState(selectedLocation || BANGLADESH_REGIONS[0]);

  useEffect(() => {
    if (isOpen) {
      setDraftLoc(selectedLocation || BANGLADESH_REGIONS[0]);
    }
  }, [isOpen, selectedLocation]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const container = mapContainerRef.current;
    if (!container) return undefined;

    const map = L.map(container, {
      center: [draftLoc.lat || 24.469, draftLoc.lon || 88.33],
      zoom: draftLoc.isPrimary ? 11 : 8,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Draw reference study stations
    BANGLADESH_REGIONS.forEach((reg) => {
      const m = L.circleMarker([reg.lat, reg.lon], {
        radius: reg.isPrimary ? 9 : 6,
        color: reg.isPrimary ? '#10B981' : '#38BDF8',
        fillColor: reg.isPrimary ? '#34D399' : '#38BDF8',
        fillOpacity: 0.75,
        weight: 2,
      }).addTo(map);
      m.bindTooltip(`${reg.name} (${reg.coverageStatus})`, { direction: 'top' });
      m.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        setDraftLoc(reg);
      });
    });

    const activePin = L.circleMarker([draftLoc.lat, draftLoc.lon], {
      radius: 10,
      color: '#F59E0B',
      fillColor: '#F59E0B',
      fillOpacity: 0.4,
      weight: 3,
    }).addTo(map);
    pinRef.current = activePin;

    map.on('click', (e) => {
      const next = buildCustomLocation({ lat: e.latlng.lat, lon: e.latlng.lng });
      setDraftLoc(next);
      activePin.setLatLng([e.latlng.lat, e.latlng.lng]);
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
      pinRef.current = null;
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pinRef.current && draftLoc) {
      pinRef.current.setLatLng([draftLoc.lat, draftLoc.lon]);
    }
  }, [draftLoc]);

  if (!isOpen) return null;

  const handleApply = () => {
    setSelectedLocation(draftLoc);
    setLocationAssessment(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick Bangladesh Map Location"
      className="no-print"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1380,
        background: 'rgba(6, 10, 9, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(96vw, 760px)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div>
            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
              BANGLADESH GEOGRAPHIC POINT PICKER
            </div>
            <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Click Any Location on the Map or Select Reference AEZ Station
            </h3>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div ref={mapContainerRef} style={{ width: '100%', height: '360px', background: '#0B1210' }} />

        <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <MapPin size={15} style={{ color: 'var(--accent-terracotta)' }} />
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{draftLoc.name}</strong>
              <span className={`badge ${draftLoc.isPrimary ? 'badge-live' : 'badge-demo'}`} style={{ fontSize: '0.64rem' }}>
                {draftLoc.isPrimary ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                {draftLoc.coverageStatus}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {draftLoc.aez} • {draftLoc.lat.toFixed(4)}°N, {draftLoc.lon.toFixed(4)}°E
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
              Cancel
            </button>
            <button type="button" onClick={handleApply} className="btn btn-primary" style={{ fontSize: '0.78rem' }}>
              <Navigation size={14} /> Apply Selected Point
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
