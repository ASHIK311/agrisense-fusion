/**
 * Verified Bangladesh Agro-Ecological Zones & Data Availability Registry.
 * Strictly separates Godagari AEZ-26 pilot study coverage from regional provisional districts.
 */
export const BANGLADESH_REGIONS = [
  {
    id: 'godagari-rajshahi',
    name: 'Godagari Upazila (Primary Study Area)',
    district: 'Rajshahi',
    division: 'Rajshahi',
    aez: 'AEZ 26 • High Barind Tract',
    lat: 24.469,
    lon: 88.33,
    elevation: '37.5 m',
    coverageStatus: 'FULL SCIENTIFIC COVERAGE',
    isPrimary: true,
    coverage: {
      sentinel2: { status: 'COMPLETE', label: '12 cloud-screened passes • 10m/20m L2A • 84.63% ± 3.81% 5-fold CV' },
      nasaPower: { status: 'TETHERED', label: 'MERRA-2/CERES grid (24.3636°N, 88.6241°E) • ~34.8 km ESE offset' },
      soilIot: { status: 'SIMULATED', label: '5,760 simulated records (500 fast-cache) • UNCALIBRATED FDR v2' },
      fao56: { status: 'CALIBRATED', label: 'FAO-56 Penman-Monteith • Provisional Barind TAW • Parity < 1e-6' },
      barcSuitability: { status: 'VALIDATED', label: 'BARC AEZ-26 baseline (Aman 78.92%, Maize 73.44%, Boro 40.51%)' },
      groundwater: { status: 'PROXY', label: 'Synthetic regional proxy (26.4 m vs 28.0 m suction limit, 0.65 m/yr)' },
      pathology: { status: 'COMPLETE', label: '17 Bangladesh diseases • 60 DOI peer-reviewed papers (48 full-text)' },
    },
    notes: 'Godagari Upazila represents the primary benchmark study centroid for NASA Space Apps Challenge 2026: Field Shift.',
  },
  {
    id: 'dinajpur-sadar',
    name: 'Dinajpur Sadar',
    district: 'Dinajpur',
    division: 'Rangpur',
    aez: 'AEZ 1 • Old Himalayan Piedmont Plain',
    lat: 25.6279,
    lon: 88.6332,
    elevation: '34.0 m',
    coverageStatus: 'REGIONAL PROVISIONAL',
    isPrimary: false,
    coverage: {
      sentinel2: { status: 'REGIONAL', label: 'Regional Sentinel-2 tile pass available (species gated HTTP 422)' },
      nasaPower: { status: 'AVAILABLE', label: 'Live NASA POWER daily coordinate query available (~18 km cell)' },
      soilIot: { status: 'NOT DEPLOYED', label: 'Physical ESP32 hardware not deployed — local field calibration required' },
      fao56: { status: 'FORMULA READY', label: 'Deterministic ET0 available; soil theta_fc/theta_wp require local lab cores' },
      barcSuitability: { status: 'REGIONAL BASELINE', label: 'BARC AEZ-1 regional guideline available (distinct from Godagari)' },
      groundwater: { status: 'UNAVAILABLE', label: 'Barind BMDA synthetic drawdown proxy does not apply to AEZ-1' },
      pathology: { status: 'APPLICABLE', label: '17 Bangladesh crop diseases screening matrix applicable' },
    },
    notes: 'Piedmont alluvial soils with higher permeability; Godagari Barind soil & simulated sensor curves are strictly excluded.',
  },
  {
    id: 'bogura-shibganj',
    name: 'Shibganj Upazila',
    district: 'Bogura',
    division: 'Rajshahi',
    aez: 'AEZ 25 • Level Barind Tract',
    lat: 24.9833,
    lon: 89.3167,
    elevation: '21.0 m',
    coverageStatus: 'REGIONAL PROVISIONAL',
    isPrimary: false,
    coverage: {
      sentinel2: { status: 'REGIONAL', label: 'Regional Sentinel-2 tile pass available (species gated HTTP 422)' },
      nasaPower: { status: 'AVAILABLE', label: 'Live NASA POWER daily coordinate query available (~22 km cell)' },
      soilIot: { status: 'NOT DEPLOYED', label: 'Physical ESP32 hardware not deployed — local field calibration required' },
      fao56: { status: 'FORMULA READY', label: 'Deterministic ET0 available; local soil hydraulics not yet sampled' },
      barcSuitability: { status: 'REGIONAL BASELINE', label: 'BARC AEZ-25 Level Barind suitability curve (unverified locally)' },
      groundwater: { status: 'UNAVAILABLE', label: 'Godagari DTW well proxy not applicable to Bogura sub-basin' },
      pathology: { status: 'APPLICABLE', label: '17 Bangladesh crop diseases screening matrix applicable' },
    },
    notes: 'Level Barind clay loam vegetable & potato hub; requires field-calibrated Kc and local ESP32 deployment.',
  },
  {
    id: 'mymensingh-sadar',
    name: 'Mymensingh Sadar',
    district: 'Mymensingh',
    division: 'Mymensingh',
    aez: 'AEZ 9 • Old Brahmaputra Floodplain',
    lat: 24.7471,
    lon: 90.4203,
    elevation: '18.0 m',
    coverageStatus: 'REGIONAL PROVISIONAL',
    isPrimary: false,
    coverage: {
      sentinel2: { status: 'REGIONAL', label: 'Regional Sentinel-2 tile pass available (species gated HTTP 422)' },
      nasaPower: { status: 'AVAILABLE', label: 'Live NASA POWER daily coordinate query available (~26 km cell)' },
      soilIot: { status: 'NOT DEPLOYED', label: 'Physical ESP32 hardware not deployed — local field calibration required' },
      fao56: { status: 'FORMULA READY', label: 'Deterministic ET0 available; floodplain percolation differs from AEZ-26' },
      barcSuitability: { status: 'REGIONAL BASELINE', label: 'BARC AEZ-9 historical baseline (distinct from High Barind)' },
      groundwater: { status: 'UNAVAILABLE', label: 'Floodplain piezometer network not integrated' },
      pathology: { status: 'APPLICABLE', label: '17 Bangladesh crop diseases screening matrix applicable' },
    },
    notes: 'Floodplain silt-loam with shallow aquifer; Godagari Barind clay loam parameters are not transferred here.',
  },
  {
    id: 'jashore-sadar',
    name: 'Jashore Sadar',
    district: 'Jashore',
    division: 'Khulna',
    aez: 'AEZ 11 • High Ganges River Floodplain',
    lat: 23.1667,
    lon: 89.2167,
    elevation: '11.0 m',
    coverageStatus: 'REGIONAL PROVISIONAL',
    isPrimary: false,
    coverage: {
      sentinel2: { status: 'REGIONAL', label: 'Regional Sentinel-2 tile pass available (species gated HTTP 422)' },
      nasaPower: { status: 'AVAILABLE', label: 'Live NASA POWER daily coordinate query available (~19 km cell)' },
      soilIot: { status: 'NOT DEPLOYED', label: 'Physical ESP32 hardware not deployed — local field calibration required' },
      fao56: { status: 'FORMULA READY', label: 'Deterministic ET0 available; calcareous silt soils require local sampling' },
      barcSuitability: { status: 'REGIONAL BASELINE', label: 'BARC AEZ-11 winter pulse baseline (distinct from AEZ-26)' },
      groundwater: { status: 'UNAVAILABLE', label: 'Ganges floodplain piezometric telemetry not integrated' },
      pathology: { status: 'APPLICABLE', label: '17 Bangladesh crop diseases screening matrix applicable' },
    },
    notes: 'Ganges calcareous alluvium; Godagari Barind simulated sensors & BARC AEZ-26 rankings are hidden to prevent cross-zone misuse.',
  },
];

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestRegion(lat, lon) {
  let nearest = BANGLADESH_REGIONS[0];
  let minKm = Infinity;
  BANGLADESH_REGIONS.forEach((r) => {
    const km = haversineKm(lat, lon, r.lat, r.lon);
    if (km < minKm) {
      minKm = km;
      nearest = r;
    }
  });
  return { region: nearest, distanceKm: Math.round(minKm * 10) / 10 };
}

export function buildCustomLocation({ lat, lon, label = null }) {
  const godagariDistKm = haversineKm(lat, lon, 24.469, 88.33);
  const withinGodagariPilot = godagariDistKm <= 15;
  const { region: nearest, distanceKm } = findNearestRegion(lat, lon);

  if (withinGodagariPilot) {
    return {
      ...BANGLADESH_REGIONS[0],
      id: 'godagari-custom-point',
      name: label || `Godagari Pilot Point (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`,
      lat: Number(lat.toFixed(5)),
      lon: Number(lon.toFixed(5)),
      isCustomPoint: true,
      distanceToNearestKm: Math.round(godagariDistKm * 10) / 10,
    };
  }

  return {
    id: `custom-${lat.toFixed(3)}-${lon.toFixed(3)}`,
    name: label || `Custom Pin (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`,
    district: `Near ${nearest.district}`,
    division: nearest.division,
    aez: `${nearest.aez} (Nearest · ${distanceKm} km)`,
    lat: Number(lat.toFixed(5)),
    lon: Number(lon.toFixed(5)),
    elevation: 'Approx.',
    coverageStatus: 'REGIONAL PROVISIONAL',
    isPrimary: false,
    isCustomPoint: true,
    distanceToNearestKm: distanceKm,
    coverage: {
      sentinel2: { status: 'REGIONAL', label: 'Regional Sentinel-2 optical footprint only (species gated HTTP 422)' },
      nasaPower: { status: 'AVAILABLE', label: `Live NASA POWER point reanalysis available at (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E)` },
      soilIot: { status: 'NOT DEPLOYED', label: 'No ESP32 probe deployed at this coordinate' },
      fao56: { status: 'FORMULA READY', label: 'ET0 from NASA POWER available; soil hydraulics UNVERIFIED at this point' },
      barcSuitability: { status: 'UNVERIFIED', label: 'Outside Godagari AEZ-26 pilot boundary — local BARC verification required' },
      groundwater: { status: 'UNAVAILABLE', label: 'No piezometric well proxy verified for this coordinate' },
      pathology: { status: 'APPLICABLE', label: 'Macro-climate screening possible via NASA POWER; no local soil telemetry' },
    },
    notes: `Custom coordinate ${Math.round(godagariDistKm)} km from Godagari study centroid. Local Godagari soil, sensor, and crop suitability data are strictly withheld.`,
  };
}
