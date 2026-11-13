import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, Bot, CheckCircle2, Cpu } from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';
import ProvenanceBadge from './ProvenanceBadge';
import AnimatedChartCard, { AnimatedCounter } from './charts/AnimatedChartCard';
import ArchitectureView from './ArchitectureView';
import { AuditChecklistPill, BackToTopRing, EditorialSectionHeader, MagneticButton, WordMaskHeadline } from './methods/MethodsKit';
import SubsystemFactorCards from './methods/SubsystemFactorCards';
import StickyFieldStory from './methods/StickyFieldStory';
import EquationStepExplorer from './methods/EquationStepExplorer';
import HonestLimitsAndDatasets from './methods/HonestLimitsAndDatasets';
import LearnSection from './methods/LearnSection';
import MethodsGraphsGallery from './methods/MethodsGraphsGallery';

const CHAPTERS = [
  { id: 'methods-subsystems', label: '01 Subsystems' },
  { id: 'methods-walkthrough', label: '02 Field Story' },
  { id: 'methods-validation', label: '03 Validation' },
  { id: 'methods-equations', label: '04 Equations & Parity' },
  { id: 'methods-architecture', label: '05 Architecture' },
  { id: 'methods-limits', label: '06 Limits & Datasets' },
  { id: 'methods-learn', label: '07 Learn & Quiz' },
];

const BLOCK_C_CLASSES = [
  { cls: 'Cropland', precision: 77.2, recall: 86.2, f1: 81.4, support: '957 px' },
  { cls: 'Tree_Cover', precision: 80.0, recall: 68.1, f1: 73.6, support: '1,242 px' },
  { cls: 'Permanent_Water', precision: 98.7, recall: 92.1, f1: 95.3, support: '2,746 px' },
  { cls: 'Built_Up', precision: 72.2, recall: 89.7, f1: 80.0, support: '1,055 px' },
];

export default function MethodsValidationWorkspace({ dashboardData, initialFocusSection = 'validation' }) {
  const { askAssistantWithPrompt, navigateToWorkspace } = useAgriSense();
  const [activeChapterId, setActiveChapterId] = useState(CHAPTERS[0].id);
  const [auditChecks, setAuditChecks] = useState({
    subsystems: false,
    equations: false,
    parity: false,
    architecture: false,
    learn: false,
  });

  const markInspected = (key) => {
    setAuditChecks((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  useEffect(() => {
    let rafId = 0;
    const syncActiveChapter = () => {
      rafId = 0;
      const probeY = (window.scrollY || 0) + window.innerHeight * 0.35;
      let current = CHAPTERS[0].id;
      for (let i = 0; i < CHAPTERS.length; i += 1) {
        const el = document.getElementById(CHAPTERS[i].id);
        if (el && el.offsetTop <= probeY) {
          current = CHAPTERS[i].id;
        }
      }
      setActiveChapterId(current);
    };
    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(syncActiveChapter);
    };
    syncActiveChapter();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (initialFocusSection === 'architecture') {
      const target = document.getElementById('methods-architecture');
      if (target) {
        setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      }
    }
  }, [initialFocusSection]);

  const jumpTo = (id) => {
    setActiveChapterId(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const blockCCols = useMemo(
    () => [
      { key: 'cls', label: 'Land-Cover Class (Block C)' },
      { key: 'precision', label: 'Precision (%)', align: 'right', format: (v) => `${Number(v).toFixed(1)}%` },
      { key: 'recall', label: 'Recall (%)', align: 'right', format: (v) => `${Number(v).toFixed(1)}%` },
      { key: 'f1', label: 'F1-Score (%)', align: 'right', format: (v) => `${Number(v).toFixed(1)}%` },
      { key: 'support', label: 'Support', align: 'right' },
    ],
    []
  );

  return (
    <div className="methods-shell">
      {/* Sticky Chapter Jump Bar + Judge Audit Progress */}
      <nav aria-label="Methods and Learn Sections" className="methods-jump-rail no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          {CHAPTERS.map((ch) => {
            const isCurrent = activeChapterId === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => jumpTo(ch.id)}
                className={isCurrent ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{
                  padding: '0.26rem 0.65rem',
                  fontSize: '0.69rem',
                  borderRadius: '999px',
                  boxShadow: isCurrent ? '0 0 12px rgba(52, 211, 153, 0.35)' : 'none',
                }}
              >
                {ch.label}
              </button>
            );
          })}
        </div>
        <AuditChecklistPill checkedMap={auditChecks} total={5} />
      </nav>

      {/* Editorial Hero Band */}
      <section id="methods-hero" className="methods-hero-band">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '780px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              <span className="badge badge-terracotta">
                <CheckCircle2 size={13} /> Scientific Methodology &amp; Open Governance
              </span>
              <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Godagari AEZ-26 Pilot · NASA Space Apps Challenge 2026
              </span>
            </div>

            <h1
              className="font-display"
              style={{
                fontSize: 'clamp(2rem, 4.2vw, 3.35rem)',
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: '-0.04em',
                margin: 0,
                color: 'var(--text-main)',
              }}
            >
              <WordMaskHeadline text="Spaceborne Data In." />
              <br />
              <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: 'var(--m-flare)' }}>
                <WordMaskHeadline text="Honest Physics Out." baseDelay={0.18} />
              </span>
            </h1>

            <p style={{ marginTop: '0.9rem', fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '640px' }}>
              Every number inside AgriSense Fusion carries its exact provenance: spaceborne NASA POWER &amp; Sentinel-2 observations, deterministic FAO-56 Penman-Monteith equations, simulated ESP32 edge telemetry, and explicit HTTP 422/501 boundaries where field evidence does not yet exist.
            </p>

            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '1.25rem' }}>
              <MagneticButton onClick={() => jumpTo('methods-subsystems')} className="btn btn-primary" style={{ padding: '0.52rem 1.05rem', fontSize: '0.8rem', borderRadius: '999px' }}>
                <span>Explore M1–M6</span>
                <ArrowDown size={14} />
              </MagneticButton>
              <button
                type="button"
                onClick={() => jumpTo('methods-equations')}
                className="btn btn-secondary"
                style={{ padding: '0.52rem 1rem', fontSize: '0.8rem', borderRadius: '999px' }}
              >
                <span>Live Parity &amp; Equations</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() =>
                  askAssistantWithPrompt(
                    'Summarize all validated scientific metrics, parity residuals, and honest limitations (HTTP 422 / 501 / null fields) across Subsystems M1–M6 in AgriSense Fusion.'
                  )
                }
                className="btn btn-secondary"
                style={{ padding: '0.52rem 1rem', fontSize: '0.8rem', borderRadius: '999px' }}
              >
                <Bot size={14} />
                <span>Ask AI Summary</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(135px, 1fr))', gap: '0.75rem', flex: '1 1 290px', maxWidth: '380px' }}>
            {[
              { val: 84.63, dec: 2, suf: '%', label: '5-Fold Spatial CV (±3.81%)', color: 'var(--m-emerald)' },
              { val: 1827, dec: 0, suf: '', label: 'NASA POWER Daily Rows', color: 'var(--m-flare)' },
              { val: 60, dec: 0, suf: ' DOIs', label: '17 Pathology Rules', color: 'var(--m-sky)' },
              { val: 5760, dec: 0, suf: '', label: 'Simulated ESP32 Records', color: 'var(--m-terracotta)' },
            ].map((stat) => (
              <div key={stat.label} className="surface" style={{ padding: '0.85rem 0.95rem', borderRadius: '14px' }}>
                <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: stat.color, lineHeight: 1.1 }}>
                  <AnimatedCounter value={stat.val} decimals={stat.dec} suffix={stat.suf} />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.28rem', lineHeight: 1.35 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chapter 01: Six Scientific Subsystems */}
      <section id="methods-subsystems">
        <EditorialSectionHeader
          num="01"
          kicker="Six Subsystems"
          title="Every observation measured,"
          accentPhrase="never extrapolated blindly."
          subtitle="Each subsystem pairs a live animated telemetry visual with expandable mathematical formulas and explicit API boundary gates."
          accent="var(--m-emerald)"
        />
        <SubsystemFactorCards dashboardData={dashboardData} onInspect={markInspected} />
      </section>

      {/* Chapter 02: Sticky Scrollytelling Field Walkthrough */}
      <section id="methods-walkthrough">
        <EditorialSectionHeader
          num="02"
          kicker="Orbit to Root Zone"
          title="Follow one Barind field"
          accentPhrase="through all six layers."
          subtitle="Scroll through the 6 pipeline stages on the left while the sticky stratigraphic field twin isolates each active scientific layer."
          accent="var(--m-sky)"
        />
        <StickyFieldStory />
      </section>

      {/* Chapter 03: Validation Proof & Reconciled Ledger */}
      <section id="methods-validation" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <EditorialSectionHeader
          num="03"
          kicker="The Proof"
          title="Reconciled metrics,"
          accentPhrase="audited across partitions."
          subtitle="Authoritative Sentinel-2 Block C per-class scores (N = 6,000) and unified M1–M6 validation ledger."
          accent="var(--m-flare)"
        />

        {/* Per-Class Block C Chart (Chart <-> Table Toggle) */}
        <AnimatedChartCard
          title="Sentinel-2 Block C Per-Class Classification Performance (N = 6,000)"
          subtitle="Precision, Recall & F1-Score across the 4 broad land-cover classes (Cropland, Tree_Cover, Permanent_Water, Built_Up)"
          unit="%"
          badgeType="SATELLITE-DERIVED"
          badgeLabel="BLOCK C HOLDOUT (85.77%)"
          source="Member 1 Forensic Reconciliation"
          provenanceNote="Block C is a southern latitudinal development holdout (<= 24.42°N); Pure Interior accuracy is 90.64% (3,639/4,015) and Mixed Boundary is 75.92% (1,507/1,985)."
          tableColumns={blockCCols}
          tableRows={BLOCK_C_CLASSES}
        >
          {() => (
            <div className="surface" style={{ padding: '0.95rem 1.05rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {BLOCK_C_CLASSES.map((row) => (
                <div key={row.cls} style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 165px) 1fr 76px', gap: '0.8rem', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>{row.cls}</div>
                    <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{row.support}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.26rem' }}>
                    {[
                      { k: 'Precision', v: row.precision, c: '#38bdf8' },
                      { k: 'Recall', v: row.recall, c: '#34d399' },
                      { k: 'F1-Score', v: row.f1, c: '#f2c879' },
                    ].map((m) => (
                      <div key={m.k} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 44px', alignItems: 'center', gap: '0.4rem', fontSize: '0.67rem' }}>
                        <span className="mono" style={{ color: 'var(--text-muted)' }}>{m.k}</span>
                        <div style={{ height: '6px', borderRadius: '999px', background: 'var(--bg-alt)', overflow: 'hidden' }}>
                          <div style={{ width: `${m.v}%`, height: '100%', background: m.c, borderRadius: '999px' }} />
                        </div>
                        <span className="mono" style={{ textAlign: 'right', color: m.c, fontWeight: 700 }}>{m.v}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mono" style={{ textAlign: 'right', fontSize: '0.86rem', fontWeight: 800, color: '#f2c879' }}>
                    {(row.f1 / 100).toFixed(3)} F1
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatedChartCard>

        {/* Reconciled M1-M6 Ledger Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: '2px solid var(--m-flare)' }}>
          <div className="methods-card-band">
            <strong className="font-display" style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>
              Reconciled Subsystem Validation &amp; Provenance Ledger (M1–M6)
            </strong>
            <ProvenanceBadge type="MODEL-DERIVED" label="FORENSIC AUDIT RECONCILED" compact />
          </div>
          <div className="table-container" style={{ padding: '1rem 1.25rem' }}>
            <table>
              <caption className="visually-hidden">Reconciled Subsystem Validation Metrics and Limitations</caption>
              <thead>
                <tr>
                  <th scope="col">Module</th>
                  <th scope="col">Algorithm / Physical Law</th>
                  <th scope="col">Primary Validation Metric</th>
                  <th scope="col">Holdout / Secondary Metric</th>
                  <th scope="col">Explicit Limitation / Gate</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong style={{ color: 'var(--m-emerald)' }}>M1 • Satellite LULC</strong></td>
                  <td className="mono">21-Feature Random Forest (RandomForest_21Feat_Deep)</td>
                  <td className="mono" style={{ color: 'var(--m-emerald)', fontWeight: 700 }}>
                    84.63% ± 3.81% (5-fold spatial CV, N=20,000)
                  </td>
                  <td className="mono">85.77% Block C (90.64% interior; 75.92% boundary; Macro-F1 0.8257)</td>
                  <td><span className="badge badge-blocked">HTTP 422: Crop Species Blocked</span></td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--m-flare)' }}>M2 • NASA POWER</strong></td>
                  <td className="mono">MERRA-2 (0.5°×0.625°) + CERES (1.0°×1.0°)</td>
                  <td className="mono">Point: 24.3636°N, 88.6241°E (~34.8 km ESE)</td>
                  <td className="mono">Screening: Tmax≥35°C, RH≤50%, Rain≤1mm</td>
                  <td><span className="badge badge-unavailable">HTTP 501: Forecast Not Implemented</span></td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--m-terracotta)' }}>M3 • Soil &amp; IoT</strong></td>
                  <td className="mono">Simulated ESP32 + Capacitive FDR v2</td>
                  <td className="mono">5,760 source records (CSV)</td>
                  <td className="mono">500 fast-cache seed + dynamic store</td>
                  <td><span className="badge badge-uncalibrated">is_simulated: true • UNCALIBRATED</span></td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--m-emerald)' }}>M4 • Crop MCDA</strong></td>
                  <td className="mono">BARC AEZ-26 Baseline + 4-Slider MCDA</td>
                  <td className="mono">Aman 78.92% | Maize 73.44% | Wheat 57.41%</td>
                  <td className="mono">Aus 40.98% | Boro 40.51% (HTTP 501 ML Yield)</td>
                  <td><span className="badge badge-baseline">Historical Suitability ≠ Yield</span></td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--m-sky)' }}>M5 • FAO-56 Physics</strong></td>
                  <td className="mono">Penman-Monteith ET₀ &amp; Root-Zone Balance</td>
                  <td className="mono" style={{ color: 'var(--m-sky)', fontWeight: 700 }}>
                    Python / JS Parity Δ &lt; 1e-6
                  </td>
                  <td className="mono">Sat 43.5%, FC 32.3%, Trig 24.4%, PWP 16.5%</td>
                  <td><span className="badge badge-assumption">Es = null (Single-Kc Mode)</span></td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--m-rose)' }}>M6 • Crop Pathology</strong></td>
                  <td className="mono">Epidemiological &amp; Edaphic Rule Engine</td>
                  <td className="mono">17 Crop Diseases • 60 DOI Papers</td>
                  <td className="mono">48 Full-Text • 5 Abstract • 7 Metadata</td>
                  <td><span className="badge badge-danger">leaf_wetness_hours = null</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Cross-Subsystem Interactive Graphs Gallery */}
        <MethodsGraphsGallery dashboardData={dashboardData} />
      </section>

      {/* Chapter 04: Interactive Equation Trace & Live Parity Verifier */}
      <section id="methods-equations">
        <EditorialSectionHeader
          num="04"
          kicker="Deterministic Physics"
          title="Click any step in the"
          accentPhrase="Penman-Monteith chain."
          subtitle="Inspect the exact FAO-56 equation, units, live active inputs, and execute the real Node-vs-Python parity benchmark."
          accent="var(--m-sky)"
        />
        <EquationStepExplorer dashboardData={dashboardData} onInspect={markInspected} />
      </section>

      {/* Chapter 05: System Architecture Animated Pipeline */}
      <section id="methods-architecture">
        <EditorialSectionHeader
          num="05"
          kicker="System Topology"
          title="End-to-end architecture"
          accentPhrase="with live packet flow."
          subtitle="Trace telemetry from edge probes and NASA Earth observations through Express validation gates into physics and MCDA engines."
          accent="var(--m-violet)"
        />
        <ArchitectureView embedded onInspect={markInspected} />
      </section>

      {/* Chapter 06: Honest Limits, Calibration Roadmap & Dataset Matrix */}
      <section id="methods-limits" style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
        <EditorialSectionHeader
          num="06"
          kicker="Limits, Datasets & Full Stack"
          title="Where the system stops,"
          accentPhrase="and how it calibrates forward."
          subtitle="Every blocked endpoint, unmeasured sensor variable, calibration tier, upstream dataset, and security/AI layer documented openly."
          accent="var(--m-rose)"
        />
        <HonestLimitsAndDatasets />

        {/* Full Project Engineering, Security & AI RAG Stack Matrix */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: '2px solid var(--m-violet)' }}>
          <div className="methods-card-band">
            <strong className="font-display" style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>
              Full Platform Engineering, Security &amp; AI Copilot Stack (AgriSense Fusion)
            </strong>
            <ProvenanceBadge type="MODEL-DERIVED" label="78 / 78 TESTS VERIFIED" compact />
          </div>
          <div className="methods-bento-grid" style={{ border: 'none', borderRadius: 0 }}>
            {[
              {
                title: 'Express 5 REST & Idempotency',
                metric: '30+ Endpoints',
                desc: 'Strict schema validation, physical VWC [0.0–1.0] bounds, UUID event deduplication (HTTP 409), and explicit HTTP 422 / 501 scientific gates.',
                color: '#34d399',
              },
              {
                title: 'PostgreSQL 16 & Atomic Store',
                metric: '7 Relational Tables',
                desc: 'Production DDL in database/schema.sql (farms, fields, sensor_readings, nasa_daily_weather, crop_catalog, model_runs, recommendations) + atomic .bak recovery.',
                color: '#818cf8',
              },
              {
                title: 'Multi-Tenant Auth & Device Keys',
                metric: 'JWT + x-device-key',
                desc: 'bcryptjs password hashing, rate-limited auth, immutable demo farm protection (HTTP 403), and strict ESP32 device key verification (HTTP 401 on forgery).',
                color: '#fb923c',
              },
              {
                title: 'Hybrid RAG AI & 9 Live Tools',
                metric: '83 KB Chunks · SSE',
                desc: 'Grounded bilingual (EN / বাংলা) assistant with 9 deterministic tools (ET₀, water balance, rotation compare, pathology screen) and inline DOI citations.',
                color: '#38bdf8',
              },
              {
                title: '3D WebGL & GIS Visualization',
                metric: 'Three.js + Leaflet',
                desc: '4-layer Barind stratigraphic twin, Draco-compressed GPM satellite GLB, 60fps canvas weather overlays, and WCAG-aware Dark/Light + Pause Motion modes.',
                color: '#fbbf24',
              },
              {
                title: 'Automated Verification Suite',
                metric: '7 Suites · 78 Tests',
                desc: 'Covers API integration, RAG accuracy regressions, hardware key bypass checks, FAO-56 Python↔JS parity, DEM PNG decoding, persistence safety, and security.',
                color: '#22c55e',
              },
            ].map((item) => (
              <div key={item.title} className="methods-bento-cell" style={{ borderTop: `2.5px solid ${item.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)' }}>{item.title}</strong>
                  <span
                    className="mono"
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: item.color,
                      padding: '0.14rem 0.45rem',
                      borderRadius: '999px',
                      background: `${item.color}18`,
                      border: `1px solid ${item.color}38`,
                    }}
                  >
                    {item.metric}
                  </span>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chapter 07: Bilingual Learn, District Readiness Checker & Quiz */}
      <section id="methods-learn">
        <EditorialSectionHeader
          num="07"
          kicker="Learn · English & বাংলা"
          title="Classroom & farmer guide,"
          accentPhrase="backed by real data."
          subtitle="Switch between English and বাংলা, query readiness for any Bangladesh district, take the 5-question check, or print a field worksheet."
          accent="var(--m-terracotta)"
        />
        <LearnSection onInspect={markInspected} />
      </section>

      {/* Closing CTA */}
      <section className="card methods-closing-cta" style={{ padding: '1.85rem 1.5rem', textAlign: 'center' }}>
        <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--m-flare)', fontWeight: 700, marginBottom: '0.35rem' }}>
          READY TO TEST IN OPERATION
        </div>
        <h3 className="font-display" style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.85rem)', fontWeight: 800, margin: '0 0 0.85rem 0' }}>
          Inspect the live crop rotation weights or print a synthesis dossier.
        </h3>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
          <MagneticButton onClick={() => navigateToWorkspace('agronomy', 'crops')} className="btn btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.8rem', borderRadius: '999px' }}>
            <span>Open Crops &amp; Disease</span>
            <ArrowRight size={14} />
          </MagneticButton>
          <button type="button" onClick={() => navigateToWorkspace('simulator')} className="btn btn-secondary" style={{ padding: '0.5rem 1.05rem', fontSize: '0.8rem', borderRadius: '999px' }}>
            <Cpu size={14} />
            <span>Open What-If Lab</span>
          </button>
        </div>
      </section>

      <BackToTopRing />
    </div>
  );
}
