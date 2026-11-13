import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Layers,
  Satellite,
  Cpu,
  Droplets,
  Wheat,
} from 'lucide-react';
import { BANGLADESH_REGIONS, buildCustomLocation } from '../data/regions';
import { useAgriSense } from '../context/AgriSenseContext';

export { BANGLADESH_REGIONS };

export default function BangladeshLocationExplorer({ onSelectLocation = () => {} }) {
  const {
    selectedLocation,
    selectRegion,
    setSelectedLocation,
    navigateToWorkspace,
  } = useAgriSense();

  const [selectedId, setSelectedId] = useState(selectedLocation?.id || 'godagari-rajshahi');
  const [searchQuery, setSearchQuery] = useState('');
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    if (selectedLocation?.id) {
      setSelectedId(selectedLocation.id);
    }
  }, [selectedLocation]);

  const selectedLoc =
    BANGLADESH_REGIONS.find((r) => r.id === selectedId) ||
    (selectedLocation?.isCustomPoint ? selectedLocation : BANGLADESH_REGIONS[0]);

  const filteredRegions = BANGLADESH_REGIONS.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.division.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.aez.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        const { latitude, longitude } = pos.coords;
        const customLoc = buildCustomLocation({
          lat: latitude,
          lon: longitude,
          label: `GPS Location (${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E)`,
        });
        setSelectedId(customLoc.id);
        setSelectedLocation(customLoc);
        onSelectLocation(customLoc);
      },
      (err) => {
        setGeoLocating(false);
        setGeoError(`Location access notice: ${err.message}. Defaulting to Godagari study area.`);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div
      className="bangladesh-explorer-card interactive-glow-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(62% 85% at 92% 8%, rgba(52, 211, 153, 0.12), transparent 62%), radial-gradient(50% 65% at 8% 92%, rgba(251, 191, 36, 0.06), transparent 60%), rgba(7, 20, 15, 0.78)',
        backdropFilter: 'blur(28px) saturate(175%)',
        WebkitBackdropFilter: 'blur(28px) saturate(175%)',
        border: '1px solid rgba(52, 211, 153, 0.28)',
        borderRadius: '26px',
        padding: '2rem',
        color: '#FFFFFF',
        boxShadow: '0 28px 68px rgba(2, 10, 7, 0.66), inset 0 1px 0 rgba(167, 243, 208, 0.12)',
      }}
    >
      <div className="methods-scan-beam" aria-hidden="true" />
      {/* Header and Search Row */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.74rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#34D399',
              marginBottom: '0.4rem',
            }}
          >
            <Compass size={14} /> Future Scalability • Bangladesh Geographic Intelligence
          </div>
          <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            Bangladesh Agricultural Location Explorer
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'rgba(226, 244, 235, 0.78)', maxWidth: '640px', marginTop: '0.28rem' }}>
            Inspect geographic coordinates, AEZ classifications, and verified scientific data coverage across Bangladesh with strict provenance transparency.
          </p>
        </div>

        {/* Browser Geolocation Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geoLocating}
          className="btn btn-glass"
          style={{
            padding: '0.52rem 1.05rem',
            fontSize: '0.8rem',
            borderRadius: '9999px',
            background: 'rgba(13, 34, 25, 0.85)',
            border: '1px solid rgba(52, 211, 153, 0.34)',
            color: '#ECFDF5',
            boxShadow: '0 6px 18px rgba(2, 10, 7, 0.42)',
          }}
        >
          <MapPin size={15} style={{ color: '#FBBF24' }} />
          <span>{geoLocating ? 'Locating...' : 'Use My Location'}</span>
        </button>
      </div>

      {geoError && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            background: 'rgba(251, 191, 36, 0.12)',
            border: '1px solid rgba(251, 191, 36, 0.36)',
            color: '#FEF3C7',
            padding: '0.6rem 0.9rem',
            borderRadius: '12px',
            fontSize: '0.78rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={14} style={{ color: '#FBBF24' }} />
          <span>{geoError}</span>
        </div>
      )}

      {/* Search Input & District Selector Chips */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '1.25rem' }}>
        <div
          style={{
            position: 'relative',
            marginBottom: '0.85rem',
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#34D399',
            }}
          />
          <input
            type="text"
            placeholder="Search district, upazila, division, or AEZ (e.g. Godagari, Dinajpur, Bogura)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.72rem 1rem 0.72rem 2.65rem',
              background: 'rgba(6, 17, 13, 0.84)',
              border: '1px solid rgba(52, 211, 153, 0.26)',
              borderRadius: '9999px',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Horizontal Chips */}
        <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
          {filteredRegions.map((region) => {
            const isSelected = region.id === selectedId;
            return (
              <button
                key={region.id}
                type="button"
                onClick={() => {
                  setSelectedId(region.id);
                  selectRegion(region.id);
                  onSelectLocation(region);
                }}
                className={`glass-pill-tab ${isSelected ? 'active' : ''}`}
                style={{
                  padding: '0.38rem 0.85rem',
                  fontSize: '0.75rem',
                  background: isSelected ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(11, 29, 22, 0.76)',
                  color: isSelected ? '#FFFFFF' : 'rgba(226, 244, 235, 0.84)',
                  border: isSelected ? '1px solid rgba(110, 231, 183, 0.65)' : '1px solid rgba(52, 211, 153, 0.2)',
                  boxShadow: isSelected ? '0 4px 16px rgba(16, 185, 129, 0.35)' : 'none',
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                <span>{region.name}</span>
                {region.isPrimary && (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      background: isSelected ? 'rgba(4, 20, 14, 0.55)' : 'rgba(16, 185, 129, 0.16)',
                      color: isSelected ? '#ECFDF5' : '#34D399',
                      border: '1px solid rgba(52, 211, 153, 0.35)',
                      padding: '0.08rem 0.42rem',
                      borderRadius: '999px',
                      fontWeight: 800,
                    }}
                  >
                    PRIMARY
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Location Details & Scientific Coverage Grid */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'rgba(6, 17, 13, 0.78)',
          border: '1px solid rgba(52, 211, 153, 0.22)',
          borderRadius: '18px',
          padding: '1.3rem 1.45rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingBottom: '0.9rem',
            borderBottom: '1px solid rgba(52, 211, 153, 0.16)',
            marginBottom: '1.05rem',
          }}
        >
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
              {selectedLoc.name} ({selectedLoc.district}, {selectedLoc.division})
            </div>
            <div className="mono" style={{ fontSize: '0.76rem', color: '#34D399', fontWeight: 600, marginTop: '0.18rem' }}>
              {selectedLoc.aez} • Centroid: {selectedLoc.lat.toFixed(4)}°N, {selectedLoc.lon.toFixed(4)}°E • Elevation: {selectedLoc.elevation}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.26rem 0.72rem',
                borderRadius: '999px',
                background: selectedLoc.isPrimary ? 'rgba(16, 185, 129, 0.18)' : 'rgba(251, 191, 36, 0.14)',
                border: selectedLoc.isPrimary ? '1px solid rgba(52, 211, 153, 0.45)' : '1px solid rgba(251, 191, 36, 0.42)',
                color: selectedLoc.isPrimary ? '#34D399' : '#FBBF24',
              }}
            >
              {selectedLoc.coverageStatus}
            </span>

            <button
              type="button"
              onClick={() => navigateToWorkspace('command')}
              className="btn btn-primary"
              style={{
                fontSize: '0.74rem',
                padding: '0.38rem 0.88rem',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: '1px solid rgba(110, 231, 183, 0.45)',
              }}
            >
              Inspect in Command Hub <ExternalLink size={13} />
            </button>
          </div>
        </div>

        {/* 6-Engine Coverage Matrix */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(275px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          {[
            {
              key: 'sentinel2',
              title: 'Sentinel-2 Satellite L2A',
              label: selectedLoc.coverage.sentinel2.label,
              icon: Satellite,
              accent: '#34D399',
            },
            {
              key: 'nasaPower',
              title: 'NASA POWER Agroclimatology',
              label: selectedLoc.coverage.nasaPower.label,
              icon: Compass,
              accent: '#FBBF24',
            },
            {
              key: 'soilIot',
              title: 'Soil & IoT Telemetry',
              label: selectedLoc.coverage.soilIot.label,
              icon: Cpu,
              accent: '#2DD4BF',
            },
            {
              key: 'fao56',
              title: 'FAO-56 Vadose Hydrology',
              label: selectedLoc.coverage.fao56.label,
              icon: Droplets,
              accent: '#38BDF8',
            },
            {
              key: 'barcSuitability',
              title: 'BARC Crop Suitability',
              label: selectedLoc.coverage.barcSuitability.label,
              icon: Wheat,
              accent: '#34D399',
            },
            {
              key: 'pathology',
              title: 'Crop Pathology Matrix',
              label: selectedLoc.coverage.pathology.label,
              icon: CheckCircle2,
              accent: '#6EE7B7',
            },
          ].map((eng) => {
            const Icon = eng.icon;
            return (
              <div
                key={eng.key}
                className="interactive-glow-card tilt-card"
                style={{
                  background: 'rgba(11, 28, 21, 0.82)',
                  border: '1px solid rgba(52, 211, 153, 0.18)',
                  borderTop: `2px solid ${eng.accent}`,
                  padding: '0.85rem 0.98rem',
                  borderRadius: '14px',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(226, 244, 235, 0.72)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Icon size={14} style={{ color: eng.accent }} />
                  <span>{eng.title}</span>
                </div>
                <div style={{ fontSize: '0.79rem', color: '#F8FAFC', marginTop: '0.28rem', lineHeight: 1.45 }}>
                  {eng.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Honest Scientific Disclosure Notice */}
        <div
          style={{
            fontSize: '0.78rem',
            color: 'rgba(226, 244, 235, 0.76)',
            lineHeight: 1.55,
            borderTop: '1px solid rgba(52, 211, 153, 0.16)',
            paddingTop: '0.8rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}
        >
          <Info size={15} style={{ color: '#FBBF24', flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong style={{ color: '#FFFFFF' }}>Scientific Provenance Guarantee:</strong> {selectedLoc.notes}{' '}
            {!selectedLoc.isPrimary && (
              <span style={{ color: '#FCD34D' }}>
                For this location, regional reanalysis and district baselines are ready, while localized vadose-zone moisture requires connected physical field sensor calibration.
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
