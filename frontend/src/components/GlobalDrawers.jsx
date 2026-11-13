import React, { useState } from 'react';
import { Bell, CheckCircle2, Lock, Settings, X, RefreshCw } from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';
import AdminSettingsWorkspace from './AdminSettingsWorkspace';

/** Slide-over drawers for Active Alerts Triage (/acknowledge, /resolve) and Settings/Auth. */
export default function GlobalDrawers() {
  const {
    alertsDrawerOpen,
    setAlertsDrawerOpen,
    settingsDrawerOpen,
    setSettingsDrawerOpen,
    alerts,
    alertsLoading,
    refreshAlerts,
    token,
  } = useAgriSense();

  const [actionStatus, setActionStatus] = useState(null);

  const handleAlertAction = async (alertId, action) => {
    setActionStatus(null);
    if (!token) {
      setActionStatus({
        type: 'error',
        text: 'Authentication required to mutate alert status. Open Settings & Account to Sign In.',
      });
      return;
    }
    try {
      const res = await fetch(`/api/v1/alerts/${alertId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus({ type: 'success', text: data.message || `Alert ${action}d.` });
        refreshAlerts();
      } else {
        setActionStatus({ type: 'error', text: data.message || data.error || `Failed (${res.status})` });
      }
    } catch (err) {
      setActionStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <>
      {/* Alerts Triage Slide-Over Drawer */}
      {alertsDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Field and Aquifer Alerts Inbox"
          className="glass-drawer-backdrop no-print"
          onClick={() => setAlertsDrawerOpen(false)}
        >
          <aside
            className="glass-drawer-panel"
            style={{ width: 'min(95vw, 490px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span className="glass-drawer-icon is-amber" aria-hidden="true">
                  <Bell size={16} />
                </span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Active Field &amp; Aquifer Alerts
                  </h2>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Auditable REST lifecycle • /acknowledge &amp; /resolve
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={refreshAlerts}
                  className="btn btn-secondary"
                  style={{ padding: '0.32rem 0.6rem', fontSize: '0.72rem', borderRadius: '999px' }}
                  title="Refresh Alerts"
                >
                  <RefreshCw size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setAlertsDrawerOpen(false)}
                  className="glass-drawer-close"
                  aria-label="Close Alerts Drawer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {!token && (
                <div
                  className="surface"
                  style={{
                    padding: '0.75rem 0.9rem',
                    fontSize: '0.76rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.6rem',
                    borderLeft: '3px solid var(--accent-amber)',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <Lock size={12} style={{ verticalAlign: '-1px', marginRight: '0.3rem' }} />
                    Viewing public/demo alerts. Sign in to acknowledge or resolve.
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.7rem', padding: '0.28rem 0.6rem', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      setAlertsDrawerOpen(false);
                      setSettingsDrawerOpen(true);
                    }}
                  >
                    Sign In
                  </button>
                </div>
              )}

              {actionStatus && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    background: actionStatus.type === 'success' ? 'rgba(22, 134, 91, 0.12)' : 'rgba(214, 95, 88, 0.12)',
                    color: actionStatus.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-danger)',
                    border: `1px solid ${actionStatus.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-danger)'}`,
                  }}
                >
                  {actionStatus.text}
                </div>
              )}

              {alertsLoading ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading alerts...</div>
              ) : alerts.length === 0 ? (
                <div className="surface" style={{ padding: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No active alerts recorded.
                </div>
              ) : (
                alerts.map((alt) => {
                  const statusLabel = alt.is_resolved ? 'RESOLVED' : alt.is_acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE';
                  return (
                    <div
                      key={alt.id}
                      className="surface"
                      style={{
                        padding: '0.9rem 1rem',
                        borderLeft: `4px solid ${
                          alt.is_resolved
                            ? 'var(--accent-primary)'
                            : alt.severity === 'critical' || alt.severity === 'high'
                            ? 'var(--accent-danger)'
                            : 'var(--accent-amber)'
                        }`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>
                          {alt.title || alt.alert_type || 'Advisory Notice'}
                        </strong>
                        <span className={`badge ${alt.is_resolved ? 'badge-live' : 'badge-demo'}`} style={{ fontSize: '0.64rem' }}>
                          {statusLabel}
                        </span>
                      </div>
                      {alt.message && (
                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {alt.message}
                        </p>
                      )}
                      <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Source: {alt.trigger_source || 'ENGINE'} • {new Date(alt.created_at || Date.now()).toLocaleString()}
                      </div>
                      {!alt.is_resolved && (
                        <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.2rem' }}>
                          {!alt.is_acknowledged && (
                            <button
                              type="button"
                              onClick={() => handleAlertAction(alt.id, 'acknowledge')}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.72rem', padding: '0.28rem 0.65rem' }}
                            >
                              Acknowledge
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAlertAction(alt.id, 'resolve')}
                            className="btn btn-primary"
                            style={{ fontSize: '0.72rem', padding: '0.28rem 0.65rem' }}
                          >
                            <CheckCircle2 size={12} /> Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Account, Auth & Preferences Slide-Over Drawer */}
      {settingsDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Account, JWT Security and Interface Settings"
          className="glass-drawer-backdrop no-print"
          onClick={() => setSettingsDrawerOpen(false)}
        >
          <aside
            className="glass-drawer-panel"
            style={{ width: 'min(96vw, 860px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span className="glass-drawer-icon is-emerald" aria-hidden="true">
                  <Settings size={16} />
                </span>
                <div>
                  <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)', display: 'block', lineHeight: 1.2 }}>
                    Account, JWT Authentication &amp; Platform Settings
                  </strong>
                  <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
                    Multi-tenant security, provenance overlays &amp; alert governance
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsDrawerOpen(false)}
                className="glass-drawer-close"
                aria-label="Close Settings Drawer"
              >
                <X size={15} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '1.25rem', flex: 1 }}>
              <AdminSettingsWorkspace />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
