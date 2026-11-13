import React, { useEffect, useRef } from 'react';
import { X, RefreshCw, Bell, ArrowUpRight, Radio } from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';

const TOAST_ACCENTS = {
  success: '#34d399',
  warning: '#f59e0b',
  error: '#f87171',
  info: '#38bdf8',
};

const AMBIENT_INTERVAL_MS = 180000; // Calm 3-minute cadence so notices never spam the viewport
const NOTICE_DURATION_MS = 4500;

/** Build grounded, real-time structured notices from loaded dashboard & location state. */
function buildAmbientNotices({
  dashboardData,
  selectedLocation,
  selectedParcel,
  isPrimaryGodagari,
  alerts,
  activeAlertCount,
}) {
  const notices = [];
  const district = selectedLocation?.district || 'Godagari';
  const latestWeather = dashboardData?.latestWeather;
  const weatherHistory = dashboardData?.weatherHistory || [];
  const latestRec = weatherHistory[weatherHistory.length - 1] || latestWeather;
  const waterBalance = dashboardData?.waterBalance;
  const latestSensor = dashboardData?.latestSensor;
  const gw = dashboardData?.groundwater;

  const tMax = latestRec?.temp_max_c ?? latestRec?.t2m_max ?? null;
  const rh = latestRec?.relative_humidity_pct ?? latestRec?.rh2m ?? null;
  const precip = latestRec?.precip_mm ?? latestRec?.rainfall ?? null;
  const et0 = waterBalance?.et0_mm_day ?? waterBalance?.reference_et0 ?? null;

  if (tMax !== null && rh !== null) {
    const tNum = Number(tMax);
    const rhNum = Number(rh);
    const pNum = precip !== null ? Number(precip) : 0;
    const isHeatDryStress = tNum >= 35 && rhNum <= 50 && pNum <= 1;
    notices.push({
      kicker: isHeatDryStress ? 'WEATHER STRESS · NASA POWER' : 'WEATHER UPDATE · NASA POWER',
      title: `${district} · ${tNum.toFixed(1)}°C Tmax`,
      text: isHeatDryStress
        ? `Heat-dryness watch · RH ${rhNum.toFixed(0)}% · Rain ${pNum.toFixed(1)} mm`
        : `RH ${rhNum.toFixed(0)}% · Rain ${pNum.toFixed(1)} mm${et0 !== null ? ` · ET₀ ${Number(et0).toFixed(2)} mm/d` : ''}`,
      type: isHeatDryStress ? 'warning' : 'info',
      showActions: true,
    });
  }

  if (isPrimaryGodagari && latestSensor) {
    const vwcPct = Number((Number(latestSensor.soil_moisture_vwc || 0.242) * 100).toFixed(1));
    const dr = Number(waterBalance?.depletion_mm ?? waterBalance?.root_zone_depletion_dr ?? 38.2);
    const taw = Number(waterBalance?.taw_mm ?? waterBalance?.total_available_water_taw ?? 79.0);
    const raw = Number(waterBalance?.raw_mm ?? taw * 0.5);
    const triggerNear = vwcPct <= 24.4 || dr >= raw;
    notices.push({
      kicker: 'LIVE TELEMETRY · ROOT-ZONE',
      title: selectedParcel?.code || 'PARCEL A-01',
      text: `${district} · ${vwcPct}% VWC · Dr ${dr.toFixed(1)}/${taw.toFixed(0)} mm${et0 !== null ? ` · ET₀ ${Number(et0).toFixed(2)}` : ''}`,
      type: triggerNear ? 'warning' : 'success',
      showActions: true,
    });
  }

  if (isPrimaryGodagari && et0 !== null) {
    notices.push({
      kicker: 'AQUIFER & DEMAND · BMDA PROXY',
      title: `Depth ${Number(gw?.depth_below_surface_m ?? 26.4).toFixed(1)} m / 28.0 m limit`,
      text: `FAO-56 ET₀ ${Number(et0).toFixed(2)} mm/day · +0.65 m/yr regional drawdown`,
      type: 'info',
      showActions: false,
    });
  }

  if (activeAlertCount > 0) {
    const topTitle = alerts?.[0]?.title || alerts?.[0]?.alert_type || 'Field advisory pending';
    notices.push({
      kicker: `ACTIVE ALERTS · ${activeAlertCount} PENDING`,
      title: topTitle,
      text: `${district} · Open Alerts drawer to acknowledge or resolve`,
      type: 'warning',
      showActions: true,
    });
  }

  if (isPrimaryGodagari && selectedParcel) {
    notices.push({
      kicker: 'CANOPY & CROP · SENTINEL-2',
      title: `${selectedParcel.code} · NDVI ${Number(selectedParcel.ndvi ?? 0.68).toFixed(2)}`,
      text: `${selectedParcel.crop}`,
      type: 'success',
      showActions: false,
    });
  } else if (!isPrimaryGodagari && selectedLocation) {
    notices.push({
      kicker: 'REGIONAL CONTEXT · NASA POWER',
      title: `${selectedLocation.name}`,
      text: `${selectedLocation.aez} · Meteorological baseline active`,
      type: 'info',
      showActions: true,
    });
  }

  return notices;
}

/**
 * Bottom Floating Notice Island.
 * Appears smoothly for 3 seconds on Welcome and whenever a notice arrives
 * (Weather, Soil, Aquifer, Alerts, NASA Sync, ESP32, Location/Parcel), then hides cleanly.
 */
export default function DynamicIsland({
  onSyncNasa = null,
  syncingNasa = false,
  dashboardData = null,
  isModalBlocked = false,
}) {
  const {
    viewMode,
    activeWorkspace,
    navigateToWorkspace,
    judgeDemoActive,
    alerts,
    activeAlertCount,
    setAlertsDrawerOpen,
    aiDrawerOpen,
    commandPaletteOpen,
    alertsDrawerOpen,
    settingsDrawerOpen,
    selectedLocation,
    selectedParcel,
    isPrimaryGodagari,
    islandToast,
    setIslandHoldOpen,
    notifyIsland,
    dismissIslandToast,
  } = useAgriSense();

  const ambientIdxRef = useRef(0);
  const prevLocationIdRef = useRef(selectedLocation?.id);
  const prevParcelIdRef = useRef(selectedParcel?.id);
  const toastActiveRef = useRef(Boolean(islandToast));
  toastActiveRef.current = Boolean(islandToast);

  const hasOpenOverlay =
    aiDrawerOpen ||
    commandPaletteOpen ||
    alertsDrawerOpen ||
    settingsDrawerOpen ||
    isModalBlocked;

  // Surface a crisp notice when the user changes active region or field parcel
  useEffect(() => {
    const locId = selectedLocation?.id;
    if (prevLocationIdRef.current && locId && prevLocationIdRef.current !== locId) {
      notifyIsland(`${selectedLocation.aez} · Ready for meteorological assessment`, 'info', {
        kicker: 'LOCATION SWITCHED',
        title: `${selectedLocation.name} (${selectedLocation.district})`,
        showActions: true,
        durationMs: NOTICE_DURATION_MS,
      });
    }
    prevLocationIdRef.current = locId;
  }, [selectedLocation?.id, selectedLocation?.name, selectedLocation?.district, selectedLocation?.aez, notifyIsland]);

  useEffect(() => {
    const parcelId = selectedParcel?.id;
    if (prevParcelIdRef.current && parcelId && prevParcelIdRef.current !== parcelId) {
      notifyIsland(`${selectedParcel.crop} · NDVI ${Number(selectedParcel.ndvi ?? 0.68).toFixed(2)}`, 'success', {
        kicker: 'PARCEL SELECTED',
        title: selectedParcel.code,
        showActions: false,
        durationMs: NOTICE_DURATION_MS,
      });
    }
    prevParcelIdRef.current = parcelId;
  }, [selectedParcel?.id, selectedParcel?.code, selectedParcel?.crop, selectedParcel?.ndvi, notifyIsland]);

  // Periodic weather, soil, aquifer & alert notices (only when idle & no modal open)
  useEffect(() => {
    if (hasOpenOverlay) return undefined;
    const id = setInterval(() => {
      if (toastActiveRef.current) return;
      const pool = buildAmbientNotices({
        dashboardData,
        selectedLocation,
        selectedParcel,
        isPrimaryGodagari,
        alerts,
        activeAlertCount,
      });
      if (pool.length === 0) return;
      const nextNotice = pool[ambientIdxRef.current % pool.length];
      ambientIdxRef.current += 1;
      notifyIsland(nextNotice.text, nextNotice.type, {
        kicker: nextNotice.kicker,
        title: nextNotice.title,
        showActions: nextNotice.showActions,
        durationMs: NOTICE_DURATION_MS,
      });
    }, AMBIENT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [
    hasOpenOverlay,
    dashboardData,
    selectedLocation,
    selectedParcel,
    isPrimaryGodagari,
    alerts,
    activeAlertCount,
    notifyIsland,
  ]);

  const isVisible = Boolean(islandToast);
  const accentColor = TOAST_ACCENTS[islandToast?.type] || TOAST_ACCENTS.info;

  const latestSensor = dashboardData?.latestSensor;
  const waterBalance = dashboardData?.waterBalance;
  const vwcStr =
    isPrimaryGodagari && latestSensor?.soil_moisture_vwc !== undefined
      ? `${(Number(latestSensor.soil_moisture_vwc) * 100).toFixed(1)}% VWC`
      : null;
  const et0Str =
    isPrimaryGodagari && (waterBalance?.et0_mm_day ?? waterBalance?.reference_et0) !== undefined
      ? `ET₀ ${Number(waterBalance?.et0_mm_day ?? waterBalance?.reference_et0).toFixed(2)}`
      : null;

  // Enrich Welcome subtitle once dashboard metrics are loaded
  const isWelcomeNotice = islandToast?.kicker?.startsWith('WELCOME');
  const displaySub =
    isWelcomeNotice && vwcStr && et0Str
      ? `${selectedLocation?.district || 'Rajshahi'} · ${vwcStr} · ${et0Str}`
      : islandToast?.text || '';
  const displayKicker = islandToast?.kicker || (islandToast?.type === 'success' ? 'SYSTEM NOTICE' : 'AGRISENSE NOTICE');
  const displayTitle = islandToast?.title || selectedParcel?.code || 'AgriSense Fusion';
  const showHubBtn = viewMode !== 'app' || activeWorkspace !== 'command';

  return (
    <div
      className={`island-anchor island-anchor--bottom no-print${judgeDemoActive ? ' above-judge-bar' : ''}`}
      role="region"
      aria-label="Notifications"
    >
      <span className="visually-hidden" aria-live="polite" aria-atomic="true">
        {islandToast ? `${displayTitle}. ${displaySub}` : ''}
      </span>

      <div
        className={`dynamic-island dynamic-island--card ${isVisible ? 'state-card-open' : 'state-card-idle'}`}
        onMouseEnter={() => setIslandHoldOpen(true)}
        onMouseLeave={() => setIslandHoldOpen(false)}
        onFocus={() => setIslandHoldOpen(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIslandHoldOpen(false);
          }
        }}
        aria-hidden={!isVisible}
      >
        {isVisible && islandToast && (
          <div className="island-card-inner">
            <div className="island-card-top">
              <div className="island-card-main">
                <span
                  className="island-card-icon"
                  style={{
                    background: `${accentColor}1f`,
                    borderColor: `${accentColor}52`,
                  }}
                  aria-hidden="true"
                >
                  <span className="island-card-dot" style={{ background: accentColor }} />
                </span>
                <div className="island-card-copy">
                  <span className="island-card-kicker" style={{ color: accentColor }}>
                    <Radio size={11} aria-hidden="true" />
                    <span>{displayKicker}</span>
                  </span>
                  <strong className="island-card-title">{displayTitle}</strong>
                  <span className="island-card-sub">{displaySub}</span>
                </div>
              </div>

              <button
                type="button"
                className="isl-dismiss-btn"
                onClick={dismissIslandToast}
                aria-label="Dismiss notification"
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>

            {islandToast.showActions && (
              <div className="island-card-actions">
                {onSyncNasa && (
                  <button
                    type="button"
                    className="isl-pill-btn"
                    onClick={onSyncNasa}
                    disabled={syncingNasa}
                  >
                    <RefreshCw size={11} className={syncingNasa ? 'water-spin' : ''} />
                    <span>{syncingNasa ? 'Syncing' : 'Sync NASA'}</span>
                  </button>
                )}
                {activeAlertCount > 0 && (
                  <button
                    type="button"
                    className="isl-pill-btn isl-alert-btn"
                    onClick={() => {
                      dismissIslandToast();
                      setAlertsDrawerOpen(true);
                    }}
                  >
                    <Bell size={11} />
                    <span>{activeAlertCount}</span>
                  </button>
                )}
                {showHubBtn && (
                  <button
                    type="button"
                    className="isl-pill-btn"
                    onClick={() => {
                      dismissIslandToast();
                      navigateToWorkspace('command');
                    }}
                  >
                    <span>Hub</span>
                    <ArrowUpRight size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
