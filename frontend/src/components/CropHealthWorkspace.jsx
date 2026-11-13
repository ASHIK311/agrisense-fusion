import React from 'react';
import { Microscope, ShieldAlert, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';
import ProvenanceBadge from './ProvenanceBadge';
import DualInspector from './DualInspector';
import DiseasePanel from './DiseasePanel';

export default function CropHealthWorkspace({ latestWeather, latestSensor }) {
  const { askAssistantWithPrompt } = useAgriSense();

  const tempC = latestWeather?.t2m ?? 29.4;
  const rhPct = latestWeather?.rh2m ?? 82.0;
  const soilPh = latestSensor?.soil_ph ?? 6.4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
      {/* Mandatory Scientific Disclaimer Banner */}
      <div
        className="surface"
        style={{
          padding: '1.15rem 1.4rem',
          borderLeft: '4px solid var(--accent-danger)',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <ShieldAlert size={22} style={{ color: 'var(--accent-danger)', flexShrink: 0, marginTop: '0.15rem' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <strong className="mono" style={{ color: 'var(--accent-danger)', fontSize: '0.88rem' }}>
                ENVIRONMENTAL SUSCEPTIBILITY SCREENING — NOT CONFIRMED DIAGNOSIS
              </strong>
              <ProvenanceBadge
                type="LITERATURE-DERIVED"
                label="17 DISEASES • 60 DOI PAPERS (48 FULL-TEXT / 5 ABSTRACT / 7 METADATA)"
                source="Member 6 Literature-Grounded Plant Pathology Matrix"
                missingVariables="leaf_wetness_hours = null (unmeasured); spore_trap_count = null"
                compact
              />
            </div>
            <p style={{ marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.6', margin: '0.35rem 0 0' }}>
              This engine screens microclimatic and edaphic susceptibility windows across 17 Bangladesh crop diseases. Because physical leaf-wetness duration sensors (<code>leaf_wetness_hours = null</code>) and spore traps are not deployed in the field, outputs represent <strong>environmental risk screening only</strong> and require visual canopy scouting or laboratory confirmation before fungicide application.
            </p>
          </div>
        </div>
      </div>

      {/* Explainable 5-Stage Rule Tree & Corpus Verification Breakdown */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div className="card-title" style={{ marginBottom: '1rem' }}>
          <span>Explainable Epidemiological Rule Tree &amp; 60-Paper Corpus Verification Tiers</span>
          <ProvenanceBadge type="LITERATURE-DERIVED" compact />
        </div>

        {/* 5-Stage Rule Tree Pipeline */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div className="surface" style={{ padding: '0.85rem', borderLeft: '3px solid var(--accent-water)' }}>
            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-water)', fontWeight: 700 }}>
              1. ENVIRONMENTAL INPUT
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              T = {tempC}°C, RH = {rhPct}%, pH = {soilPh}
            </div>
            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', marginTop: '0.15rem' }}>
              leaf_wetness_hours = null
            </div>
          </div>

          <div className="surface" style={{ padding: '0.85rem', borderLeft: '3px solid var(--accent-amber)' }}>
            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', fontWeight: 700 }}>
              2. RULE CONDITION
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              Temp 24–30°C &amp; RH ≥ 80%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              + Soil pH 5.5–7.0 window
            </div>
          </div>

          <div className="surface" style={{ padding: '0.85rem', borderLeft: '3px solid var(--accent-terracotta)' }}>
            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-terracotta)', fontWeight: 700 }}>
              3. EVIDENCE TIER (60 DOIS)
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              48 Full-Text • 5 Abstract
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              7 Metadata-Only Disclosed
            </div>
          </div>

          <div className="surface" style={{ padding: '0.85rem', borderLeft: '3px solid var(--accent-danger)' }}>
            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-danger)', fontWeight: 700 }}>
              4. SCREENING OUTPUT
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              Susceptibility Index
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Capped when leaf wetness is null
            </div>
          </div>

          <div className="surface" style={{ padding: '0.85rem', borderLeft: '3px solid var(--accent-primary)' }}>
            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
              5. MANAGEMENT GUIDANCE
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              Cultural &amp; IPM First
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              BRRI / BARI scouting protocol
            </div>
          </div>
        </div>
      </div>

      {/* Interactive DiseasePanel */}
      <DiseasePanel latestWeather={latestWeather} latestSensor={latestSensor} />

      {/* Epidemiological Rule Engine vs RAG AI Dual-Inspector */}
      <DualInspector
        title="Epidemiological Rule Engine vs. Grounded Pathology RAG Dual-Inspector"
        deterministicTitle="Member 6 Epidemiological Susceptibility Rule Trace"
        deterministicBadge="LITERATURE-DERIVED"
        equationOrRule="IF (T_opt_min <= AirTemp <= T_opt_max) AND (RH >= RH_threshold) -> Trigger Microclimatic Susceptibility&#10;IF (leaf_wetness_hours == null) -> Flag Missing Input & Require Visual Canopy Scouting"
        inputs={[
          { label: 'Ambient Temp', value: `${tempC}°C` },
          { label: 'Relative Humidity', value: `${rhPct}%` },
          { label: 'Soil pH', value: String(soilPh) },
          { label: 'Leaf Wetness', value: 'null (Unmeasured)' },
        ]}
        outputs={[
          { label: 'Evaluated Diseases', value: '17 Bangladesh Diseases' },
          { label: 'Corpus DOIs', value: '60 Peer-Reviewed Papers' },
          { label: 'Full-Text Verified', value: '48 Papers (80.0%)' },
          { label: 'Abstract / Meta', value: '5 Abstract / 7 Metadata-Only' },
        ]}
        assumptions={[
          'Environmental susceptibility indicates favorable pathogen growth windows, NOT confirmed physical presence of spores or lesions.',
          'Leaf wetness sensors and spore traps are not installed; risk scores are conservative upper-bound microclimate indicators.',
          'All chemical fungicides require visual field confirmation and adherence to DAE (Department of Agricultural Extension) thresholds.',
        ]}
        ragTitle="Bangladesh Plant Pathology Literature Synthesis"
        ragSummary="According to Bangladesh Rice Research Institute (BRRI) and Bangladesh Agricultural Research Institute (BARI) literature across 60 DOI publications, high relative humidity (RH ≥ 80%) coupled with temperatures between 25°C and 30°C creates high environmental pressure for fungal blast (Magnaporthe oryzae) and sheath blight (Rhizoctonia solani). However, actual disease incidence depends on host resistance, nitrogen fertilizer over-application, and canopy microclimate."
        citations={[
          {
            title: 'Epidemiology and Management of Rice Blast Disease in Bangladesh',
            authority: 'BRRI Pathology Division',
            doi: '10.1007/s10658-019-01823-1',
          },
          {
            title: 'Wheat Blast in Bangladesh: Challenges and Management Strategies',
            authority: 'Islam et al., 2020',
            doi: '10.1094/PDIS-04-19-0742-FE',
          },
        ]}
        suggestedPrompt="Explain the environmental conditions that trigger rice blast and sheath blight susceptibility in Godagari Upazila, and explain why leaf_wetness_hours is reported as null."
      />
    </div>
  );
}
