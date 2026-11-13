import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Lock,
  Eye,
  Sliders,
  Sparkles,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';

export default function AdminSettingsWorkspace() {
  const {
    token,
    user,
    saveAuthSession,
    logout,
    xRayMode,
    setXRayMode,
    pauseMotion,
    setPauseMotion,
    density,
    setDensity,
  } = useAgriSense();

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authMessage, setAuthMessage] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState(null);

  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/v1/alerts', { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.alerts)) {
        setAlerts(data.alerts);
      }
    } catch (_) {
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [token]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthMessage(null);
    const endpoint = authMode === 'register' ? '/api/v1/auth/register' : '/api/v1/auth/login';
    const body = authMode === 'register' ? { fullName: name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        saveAuthSession(data.token, data.user);
        setAuthMessage({ type: 'success', text: `Authenticated as ${data.user?.email || email}` });
        setPassword('');
      } else {
        setAuthMessage({ type: 'error', text: data.error || 'Authentication failed' });
      }
    } catch (err) {
      setAuthMessage({ type: 'error', text: err.message });
    }
  };

  const handleAlertAction = async (alertId, action) => {
    setAlertFeedback(null);
    if (!token) {
      setAlertFeedback({ type: 'error', text: 'Sign in above (JWT required) to acknowledge or resolve alerts.' });
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
        setAlertFeedback({ type: 'success', text: data.message || `Alert ${action}d.` });
        fetchAlerts();
      } else {
        setAlertFeedback({ type: 'error', text: data.message || data.error || `Failed to ${action} alert.` });
      }
    } catch (err) {
      setAlertFeedback({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="settings-shell">
      {/* Compact Glassy Intro Banner */}
      <div className="card settings-hero-card">
        <div className="settings-hero-meta">
          <span className="badge badge-terracotta">
            <Settings size={12} />
            <span>Subsystem Governance</span>
          </span>
          <span className="mono settings-workspace-tag">
            Workspace 14 · Multi-Tenant Admin &amp; Session
          </span>
        </div>
        <h1 className="font-display settings-hero-title">
          Account, Security &amp; Platform Governance
        </h1>
      </div>

      <div className="settings-two-col">
        {/* Left: Multi-Tenant JWT Authentication */}
        <div className="card settings-card">
          <div className="settings-card-head">
            <h2 className="settings-card-title">Multi-Tenant JWT Session</h2>
            <span className={`badge ${user ? 'badge-live' : 'badge-demo'}`}>
              {user ? `SIGNED IN (${user.role || 'researcher'})` : 'GUEST SESSION'}
            </span>
          </div>

          {user ? (
            <div className="surface settings-auth-box">
              <div className="settings-user-row">
                <span className="settings-user-avatar" aria-hidden="true">
                  <User size={18} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="settings-user-name">{user.name || user.email}</div>
                  <div className="mono settings-user-role">
                    Role: {user.role?.toUpperCase()} · Godagari AEZ-26
                  </div>
                </div>
              </div>

              <p className="settings-user-note">
                Signed in with JWT authorization. All state mutations (simulated readings, alert acknowledgments) are cryptographically validated.
              </p>

              <button
                type="button"
                onClick={logout}
                className="btn btn-secondary settings-full-btn"
              >
                <LogOut size={14} />
                <span>Sign Out to Public Session</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="settings-auth-form">
              <div className="seg-group settings-seg-group" role="tablist" aria-label="Authentication Mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'login'}
                  onClick={() => setAuthMode('login')}
                  className={`seg-btn settings-seg-btn ${authMode === 'login' ? 'active' : ''}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'register'}
                  onClick={() => setAuthMode('register')}
                  className={`seg-btn settings-seg-btn ${authMode === 'register' ? 'active' : ''}`}
                >
                  Register Farmer
                </button>
              </div>

              {authMessage && (
                <div className={`settings-inline-notice ${authMessage.type === 'success' ? 'is-success' : 'is-error'}`}>
                  {authMessage.text}
                </div>
              )}

              {authMode === 'register' && (
                <div className="settings-field">
                  <label htmlFor="settings-auth-name">Full Name</label>
                  <input
                    id="settings-auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Md. Rahman (Barind Farmer)"
                    className="form-control glassy-input"
                  />
                </div>
              )}

              <div className="settings-field">
                <label htmlFor="settings-auth-email">Email Address</label>
                <input
                  id="settings-auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  className="form-control glassy-input"
                />
              </div>

              <div className="settings-field">
                <label htmlFor="settings-auth-password">Password</label>
                <input
                  id="settings-auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-control glassy-input"
                />
              </div>

              <button type="submit" className="btn btn-primary glassy-primary-btn settings-full-btn">
                <Lock size={14} />
                <span>{authMode === 'login' ? 'Authenticate Session' : 'Create Farmer Account'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right: Accessibility & Provenance Controls */}
        <div className="card settings-card">
          <div className="settings-card-head">
            <h2 className="settings-card-title">Accessibility &amp; Provenance</h2>
            <span className="badge badge-live">CLIENT SETTINGS</span>
          </div>

          <div className="settings-pref-list">
            <div className="surface settings-pref-row">
              <div className="settings-pref-copy">
                <div className="settings-pref-title">X-Ray Scientific Provenance</div>
                <div className="settings-pref-desc">
                  Highlight data sources, equations, and calibration status
                </div>
              </div>
              <button
                type="button"
                onClick={() => setXRayMode((x) => !x)}
                aria-pressed={xRayMode}
                className={`btn settings-toggle-pill ${xRayMode ? 'btn-primary glassy-primary-btn' : 'btn-secondary'}`}
              >
                <Eye size={13} />
                <span>{xRayMode ? 'X-Ray On' : 'X-Ray Off'}</span>
              </button>
            </div>

            <div className="surface settings-pref-row">
              <div className="settings-pref-copy">
                <div className="settings-pref-title">3D &amp; Canvas Motion</div>
                <div className="settings-pref-desc">
                  Reduce animations for accessibility or lower CPU usage
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPauseMotion((m) => !m)}
                aria-pressed={!pauseMotion}
                className={`btn settings-toggle-pill ${pauseMotion ? 'btn-secondary' : 'btn-primary glassy-primary-btn'}`}
              >
                <Sparkles size={13} />
                <span>{pauseMotion ? 'Paused' : 'Active'}</span>
              </button>
            </div>

            <div className="surface settings-pref-row">
              <div className="settings-pref-copy">
                <div className="settings-pref-title">Interface Density</div>
                <div className="settings-pref-desc">
                  Adjust spacing and padding across cards and tables
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDensity((d) => (d === 'compact' ? 'spacious' : 'compact'))}
                className="btn btn-secondary settings-toggle-pill"
              >
                <Sliders size={13} />
                <span>{density === 'compact' ? 'Compact' : 'Spacious'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Governance List */}
      <div className="card settings-card">
        <div className="settings-card-head">
          <h2 className="settings-card-title">Field &amp; Aquifer Alert Governance ({alerts.length})</h2>
          <span className="badge badge-demo">AUDITABLE LOG</span>
        </div>

        {alertFeedback && (
          <div className={`settings-inline-notice ${alertFeedback.type === 'success' ? 'is-success' : 'is-error'}`}>
            {alertFeedback.text}
          </div>
        )}

        {loadingAlerts ? (
          <div className="settings-empty-note">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="settings-empty-note">
            No active alerts recorded. System operating within normal physiological boundaries.
          </div>
        ) : (
          <div className="settings-alerts-list">
            {alerts.map((alt) => {
              const statusLabel = alt.is_resolved ? 'resolved' : alt.is_acknowledged ? 'acknowledged' : 'active';
              const isHigh = alt.severity === 'critical' || alt.severity === 'high';
              return (
                <div
                  key={alt.id}
                  className="surface settings-alert-row"
                  style={{
                    borderLeft: `3.5px solid ${alt.is_resolved ? 'var(--accent-primary)' : isHigh ? 'var(--accent-danger)' : 'var(--accent-amber)'}`,
                  }}
                >
                  <div className="settings-alert-copy">
                    <div className="settings-alert-top">
                      <strong className="settings-alert-title">{alt.title || alt.message}</strong>
                      <span className={`badge ${alt.is_resolved ? 'badge-live' : 'badge-demo'}`} style={{ fontSize: '0.62rem' }}>
                        {statusLabel.toUpperCase()}
                      </span>
                    </div>
                    {alt.title && alt.message && (
                      <div className="settings-alert-msg">{alt.message}</div>
                    )}
                    <div className="mono settings-alert-meta">
                      {alt.alert_type || alt.type || 'notice'} · {new Date(alt.created_at || Date.now()).toLocaleString()}
                    </div>
                  </div>

                  {!alt.is_resolved && (
                    <div className="settings-alert-actions">
                      {!alt.is_acknowledged && (
                        <button
                          type="button"
                          onClick={() => handleAlertAction(alt.id, 'acknowledge')}
                          className="btn btn-secondary settings-mini-pill"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAlertAction(alt.id, 'resolve')}
                        className="btn btn-primary glassy-primary-btn settings-mini-pill"
                      >
                        <CheckCircle2 size={12} />
                        <span>Resolve</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
