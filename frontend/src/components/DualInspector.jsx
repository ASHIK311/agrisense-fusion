import React from 'react';
import { Cpu, BookOpen, ArrowUpRight } from 'lucide-react';
import { useAgriSense } from '../context/AgriSenseContext';
import ProvenanceBadge from './ProvenanceBadge';

export default function DualInspector({
  title = 'Physics & Rule Engine vs. Grounded Literature Explanation',
  subtitle = 'Deterministic equations and rules on the left; peer-reviewed literature and RAG context on the right. The AI assistant never overrides deterministic calculations.',
  deterministicTitle = 'Deterministic Engine Execution Trace',
  deterministicBadge = 'MODEL-DERIVED',
  equationOrRule,
  inputs = [],
  outputs = [],
  assumptions = [],
  ragTitle = 'Grounded Literature & Scientific Context',
  ragSummary,
  citations = [],
  suggestedPrompt,
}) {
  const { askAssistantWithPrompt } = useAgriSense();

  return (
    <section
      className="card"
      style={{
        marginTop: '1.5rem',
        background: 'var(--bg-surface)',
      }}
      aria-label={title}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="badge badge-terracotta">Dual-Inspector Verification</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {subtitle}
          </p>
        </div>

        {suggestedPrompt && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => askAssistantWithPrompt(suggestedPrompt)}
          >
            <span>Explore in AgriSense AI</span>
            <ArrowUpRight size={16} />
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.35rem' }}>
        {/* Left Column: Deterministic Physics / Rule Trace */}
        <div
          style={{
            background: 'var(--bg-alt)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <strong style={{ fontSize: '0.88rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <Cpu size={16} />
              <span>{deterministicTitle}</span>
            </strong>
            <ProvenanceBadge type={deterministicBadge} compact />
          </div>

          {equationOrRule && (
            <pre
              className="mono"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                color: 'var(--text-main)',
                overflowX: 'auto',
                marginBottom: '1rem',
                lineHeight: 1.55,
              }}
            >
              {equationOrRule}
            </pre>
          )}

          {inputs.length > 0 && (
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Deterministic Inputs
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                {inputs.map((inp, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-surface)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{inp.label}: </span>
                    <strong className="mono" style={{ color: 'var(--text-main)' }}>{inp.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {outputs.length > 0 && (
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Computed Outputs (Authoritative)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                {outputs.map((out, idx) => (
                  <div key={idx} style={{ background: 'var(--accent-canopy-soft)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-canopy)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{out.label}: </span>
                    <strong className="mono" style={{ color: 'var(--primary)' }}>{out.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assumptions.length > 0 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.65rem', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-main)' }}>Assumptions &amp; Null Flags:</strong>
              <ul style={{ paddingLeft: '1.15rem', marginTop: '0.25rem' }}>
                {assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Grounded Literature & RAG Synthesis */}
        <div
          style={{
            background: 'var(--bg-alt)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <strong style={{ fontSize: '0.88rem', color: 'var(--accent-terracotta)', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <BookOpen size={16} />
                <span>{ragTitle}</span>
              </strong>
              <ProvenanceBadge type="LITERATURE-DERIVED" compact />
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.65, marginBottom: '1rem' }}>
              {ragSummary}
            </p>

            {citations.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                  Verified Literature &amp; DOIs
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {citations.map((cit, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{cit.title}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <span>{cit.authority || 'Peer-Reviewed Source'}</span>
                        {cit.doi && (
                          <a
                            href={cit.doi.startsWith('http') ? cit.doi : `https://doi.org/${cit.doi}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mono"
                            style={{ color: 'var(--accent-water)', textDecoration: 'underline' }}
                          >
                            {cit.doi}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.76rem',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Guardrail: LLM never overrides deterministic physics or rule outputs.</span>
            <span className="mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>83 Chunks Indexed</span>
          </div>
        </div>
      </div>
    </section>
  );
}
