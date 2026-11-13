import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Lock, Plus, Save, Trash2, X, Layers } from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';

/** Compute rough planar polygon area (m^2) using projected degree-to-meter scaling around 24.5N */
function estimatePolygonAreaM2(latLngs) {
  if (!Array.isArray(latLngs) || latLngs.length < 3) return 0;
  const meanLatRad = (latLngs[0][0] * Math.PI) / 180;
  const kx = 111320 * Math.cos(meanLatRad);
  const ky = 110574;
  let area = 0;
  for (let i = 0; i < latLngs.length; i += 1) {
    const [lat1, lon1] = latLngs[i];
    const [lat2, lon2] = latLngs[(i + 1) % latLngs.length];
    area += lon1 * kx * (lat2 * ky) - lon2 * kx * (lat1 * ky);
  }
  return Math.round(Math.abs(area) / 2);
}

/**
 * Verified CRUD Modal wired directly to server/routes/farmRoutes.js:
 * - POST /api/v1/farms | PUT /api/v1/farms/:id
 * - POST /api/v1/fields | PUT /api/v1/fields/:id
 */
export default function FarmFieldCrudModal({
  isOpen,
  mode = 'create-farm', // 'create-farm' | 'edit-farm' | 'create-field' | 'edit-field'
  initialFarm = null,
  initialField = null,
  farms = [],
  onClose,
  onSaved,
}) {
  const { token, selectedLocation, selectedFarmId, setSettingsDrawerOpen } = useAgriSense();

  const isFarmMode = mode === 'create-farm' || mode === 'edit-farm';
  const isEdit = mode === 'edit-farm' || mode === 'edit-field';

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Farm state
  const [farmName, setFarmName] = useState('');
  const [district, setDistrict] = useState('Rajshahi');
  const [division, setDivision] = useState('Rajshahi');
  const [upazila, setUpazila] = useState('Godagari');
  const [aezCode, setAezCode] = useState('AEZ-26');
  const [latitude, setLatitude] = useState('24.4690');
  const [longitude, setLongitude] = useState('88.3300');
  const [elevationM, setElevationM] = useState('28.0');

  // Field state
  const [targetFarmId, setTargetFarmId] = useState(selectedFarmId || 'farm-barind-01');
  const [fieldName, setFieldName] = useState('');
  const [areaM2, setAreaM2] = useState('12000');
  const [soilType, setSoilType] = useState('silty_clay_loam');
  const [thetaFc, setThetaFc] = useState('0.323');
  const [thetaWp, setThetaWp] = useState('0.165');
  const [rootDepthM, setRootDepthM] = useState('0.50');
  const [currentCrop, setCurrentCrop] = useState('Mustard');
  const [polyPoints, setPolyPoints] = useState([]);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const polyLayerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setStatusMsg(null);
    if (mode === 'create-farm') {
      setFarmName('');
      setDistrict(selectedLocation?.district || 'Rajshahi');
      setDivision(selectedLocation?.division || 'Rajshahi');
      setUpazila(selectedLocation?.isPrimary ? 'Godagari' : selectedLocation?.name?.split(' ')[0] || 'Upazila');
      setAezCode(selectedLocation?.aez?.split('•')[0]?.trim() || 'AEZ-26');
      setLatitude(String(selectedLocation?.lat ?? 24.469));
      setLongitude(String(selectedLocation?.lon ?? 88.33));
      setElevationM('28.0');
    } else if (mode === 'edit-farm' && initialFarm) {
      setFarmName(initialFarm.name || '');
      setDistrict(initialFarm.district || 'Rajshahi');
      setDivision(initialFarm.division || 'Rajshahi');
      setUpazila(initialFarm.upazila || 'Godagari');
      setAezCode(initialFarm.aez_code || 'AEZ-26');
      setLatitude(String(initialFarm.latitude ?? 24.469));
      setLongitude(String(initialFarm.longitude ?? 88.33));
      setElevationM(String(initialFarm.elevation_m ?? 28.0));
    } else if (mode === 'create-field') {
      setTargetFarmId(selectedFarmId || farms[0]?.id || 'farm-barind-01');
      setFieldName('');
      setAreaM2('12000');
      setSoilType('silty_clay_loam');
      setThetaFc('0.323');
      setThetaWp('0.165');
      setRootDepthM('0.50');
      setCurrentCrop('Mustard');
      setPolyPoints([]);
    } else if (mode === 'edit-field' && initialField) {
      setTargetFarmId(initialField.farm_id || selectedFarmId);
      setFieldName(initialField.name || '');
      setAreaM2(String(initialField.area_m2 || 12000));
      setSoilType(initialField.soil_type || 'silty_clay_loam');
      setThetaFc(String(initialField.theta_fc ?? 0.323));
      setThetaWp(String(initialField.theta_wp ?? 0.165));
      setRootDepthM(String(initialField.root_depth_m ?? 0.50));
      setCurrentCrop(initialField.current_crop || 'Mustard');
      const ring = initialField.boundary_geojson?.coordinates?.[0];
      if (Array.isArray(ring) && ring.length >= 3) {
        setPolyPoints(ring.slice(0, -1).map(([lon, lat]) => [lat, lon]));
      } else {
        setPolyPoints([]);
      }
    }
  }, [isOpen, mode, initialFarm, initialField, selectedLocation, selectedFarmId, farms]);

  // Mini Leaflet Polygon Drawer for Fields
  useEffect(() => {
    if (!isOpen || isFarmMode) return undefined;
    const container = mapContainerRef.current;
    if (!container) return undefined;

    const farmObj = farms.find((f) => f.id === targetFarmId);
    const centerLat = farmObj?.latitude || selectedLocation?.lat || 24.469;
    const centerLon = farmObj?.longitude || selectedLocation?.lon || 88.33;

    const map = L.map(container, { center: [centerLat, centerLon], zoom: 16 });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Esri Satellite',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    polyLayerRef.current = layerGroup;

    map.on('click', (e) => {
      const pt = [Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))];
      setPolyPoints((prev) => {
        const next = [...prev, pt];
        if (next.length >= 3) {
          const est = estimatePolygonAreaM2(next);
          if (est > 0) setAreaM2(String(est));
        }
        return next;
      });
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
      polyLayerRef.current = null;
    };
  }, [isOpen, isFarmMode, targetFarmId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const grp = polyLayerRef.current;
    if (!grp) return;
    grp.clearLayers();
    if (polyPoints.length > 0) {
      polyPoints.forEach((pt, idx) => {
        L.circleMarker(pt, { radius: 5, color: '#34D399', fillColor: '#34D399', fillOpacity: 1 })
          .bindTooltip(`V${idx + 1}`, { permanent: false })
          .addTo(grp);
      });
      if (polyPoints.length >= 2) {
        L.polygon(polyPoints, { color: '#34D399', fillColor: '#34D399', fillOpacity: 0.25, weight: 2 }).addTo(grp);
      }
    }
  }, [polyPoints]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!token) {
      setStatusMsg({ type: 'error', text: 'JWT Authentication required to create or update farms/fields.' });
      return;
    }

    const boundaryGeojson =
      polyPoints.length >= 3
        ? {
            type: 'Polygon',
            coordinates: [[...polyPoints.map(([lat, lon]) => [lon, lat]), [polyPoints[0][1], polyPoints[0][0]]]],
          }
        : null;

    let url = '';
    let method = 'POST';
    let body = {};

    if (isFarmMode) {
      method = isEdit ? 'PUT' : 'POST';
      url = isEdit ? `/api/v1/farms/${encodeURIComponent(initialFarm.id)}` : '/api/v1/farms';
      body = {
        name: farmName.trim(),
        district: district.trim(),
        division: division.trim(),
        upazila: upazila.trim(),
        aez_code: aezCode.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        elevation_m: Number(elevationM),
      };
    } else {
      const fc = Number(thetaFc);
      const wp = Number(thetaWp);
      const areaVal = Number(areaM2);
      if (!(areaVal > 0)) {
        setStatusMsg({ type: 'error', text: 'Field area (m²) must be greater than 0.' });
        return;
      }
      if (!(fc > wp && fc <= 1 && wp >= 0)) {
        setStatusMsg({ type: 'error', text: 'Field capacity (theta_fc) must strictly exceed wilting point (theta_wp) within [0, 1].' });
        return;
      }
      method = isEdit ? 'PUT' : 'POST';
      url = isEdit ? `/api/v1/fields/${encodeURIComponent(initialField.id)}` : '/api/v1/fields';
      body = {
        farm_id: targetFarmId,
        name: fieldName.trim(),
        area_m2: areaVal,
        soil_type: soilType,
        theta_fc: fc,
        theta_wp: wp,
        root_depth_m: Number(rootDepthM),
        current_crop: currentCrop,
        ...(boundaryGeojson ? { boundary_geojson: boundaryGeojson } : {}),
      };
    }

    setSubmitting(true);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: data.message || 'Saved cleanly to backend store.' });
        if (onSaved) onSaved(data);
        setTimeout(() => onClose(), 550);
      } else {
        setStatusMsg({ type: 'error', text: data.message || data.error || `Request failed (HTTP ${res.status})` });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const titleMap = {
    'create-farm': 'Register New Agricultural Farm (POST /api/v1/farms)',
    'edit-farm': 'Edit Owned Farm (PUT /api/v1/farms/:id)',
    'create-field': 'Create Field Plot & Boundary (POST /api/v1/fields)',
    'edit-field': 'Edit Owned Field Plot (PUT /api/v1/fields/:id)',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titleMap[mode]}
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
          width: 'min(96vw, 720px)',
          maxHeight: '90dvh',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: '18px',
          padding: '1.35rem 1.5rem',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
              SRS MODULE 1 • VERIFIED FARM &amp; FIELD CRUD
            </div>
            <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {titleMap[mode]}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ padding: '0.35rem' }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!token && (
          <div
            className="surface"
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              borderLeft: '3px solid var(--accent-amber)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
              fontSize: '0.78rem',
            }}
          >
            <span>
              <Lock size={13} style={{ verticalAlign: '-2px', marginRight: '0.35rem' }} />
              Mutations require a signed JWT Researcher/Farmer session (demo farms remain immutable HTTP 403).
            </span>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.72rem', padding: '0.32rem 0.75rem' }}
              onClick={() => {
                onClose();
                setSettingsDrawerOpen(true);
              }}
            >
              Sign In / Register
            </button>
          </div>
        )}

        {statusMsg && (
          <div
            style={{
              padding: '0.65rem 0.9rem',
              borderRadius: '10px',
              marginBottom: '1rem',
              fontSize: '0.78rem',
              background: statusMsg.type === 'success' ? 'rgba(22, 134, 91, 0.14)' : 'rgba(214, 95, 88, 0.14)',
              color: statusMsg.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-danger)',
              border: `1px solid ${statusMsg.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-danger)'}`,
            }}
          >
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {isFarmMode ? (
            <>
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                  Farm Name *
                </label>
                <input className="form-control" required value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="e.g. Rajshahi Terrace Research Block 2" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Upazila</label>
                  <input className="form-control" value={upazila} onChange={(e) => setUpazila(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>District</label>
                  <input className="form-control" value={district} onChange={(e) => setDistrict(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Division</label>
                  <input className="form-control" value={division} onChange={(e) => setDivision(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>AEZ Code</label>
                  <input className="form-control" value={aezCode} onChange={(e) => setAezCode(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Latitude *</label>
                  <input className="form-control" type="number" step="0.0001" required value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Longitude *</label>
                  <input className="form-control" type="number" step="0.0001" required value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Elevation (m)</label>
                  <input className="form-control" type="number" step="0.1" value={elevationM} onChange={(e) => setElevationM(e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Parent Farm *</label>
                  <select className="form-control" value={targetFarmId} onChange={(e) => setTargetFarmId(e.target.value)} disabled={isEdit}>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.is_demo ? '(Immutable Demo)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Field Name *</label>
                  <input className="form-control" required value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="e.g. North Plot D-1" />
                </div>
              </div>

              {/* Interactive GeoJSON Polygon Drawer */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                    <Layers size={12} style={{ verticalAlign: '-1px', marginRight: '0.3rem' }} />
                    Optional Field Polygon (Click map corners to compute GeoJSON &amp; planar area)
                  </span>
                  {polyPoints.length > 0 && (
                    <button type="button" onClick={() => setPolyPoints([])} className="btn btn-secondary" style={{ fontSize: '0.68rem', padding: '0.2rem 0.55rem' }}>
                      <Trash2 size={11} /> Clear ({polyPoints.length} pts)
                    </button>
                  )}
                </div>
                <div ref={mapContainerRef} style={{ width: '100%', height: '190px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.7rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Area (m²) *</label>
                  <input className="form-control" type="number" min="1" required value={areaM2} onChange={(e) => setAreaM2(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Soil Texture</label>
                  <select className="form-control" value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                    <option value="silty_clay_loam">Barind Silty Clay Loam (Saxton &amp; Rawls)</option>
                    <option value="clay_loam">Barind Clay Loam</option>
                    <option value="silt_loam">Floodplain Silt Loam</option>
                    <option value="sandy_loam">Piedmont Sandy Loam</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Active Crop</label>
                  <input className="form-control" value={currentCrop} onChange={(e) => setCurrentCrop(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.7rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>θ_FC (Field Cap.)</label>
                  <input className="form-control" type="number" step="0.001" min="0.05" max="0.95" value={thetaFc} onChange={(e) => setThetaFc(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>θ_WP (Wilting Pt.)</label>
                  <input className="form-control" type="number" step="0.001" min="0.01" max="0.9" value={thetaWp} onChange={(e) => setThetaWp(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Root Depth (m)</label>
                  <input className="form-control" type="number" step="0.05" min="0.1" max="2.5" value={rootDepthM} onChange={(e) => setRootDepthM(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', marginTop: '0.35rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ fontSize: '0.78rem' }}>
              {isEdit ? <Save size={14} /> : <Plus size={14} />}
              <span>{submitting ? 'Saving...' : isEdit ? 'Save Changes (PUT)' : 'Create Record (POST)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
