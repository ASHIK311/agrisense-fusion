import React from 'react';
import { ChevronLeft, ChevronRight, X, Compass } from 'lucide-react';
import { useAgriSense, JUDGE_DEMO_STEPS } from '../context/AgriSenseContext';

export default function JudgeDemoBar() {
  const {
    judgeDemoActive,
    judgeDemoStep,
    goToJudgeStep,
    stopJudgeDemo,
  } = useAgriSense();

  if (!judgeDemoActive) return null;

  const currentStep = JUDGE_DEMO_STEPS.find((s) => s.step === judgeDemoStep) || JUDGE_DEMO_STEPS[0];

  return (
    <aside
      className="no-print"
      aria-label="Guided 3-Minute Judge Presentation Mode"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1200,
        width: 'min(95vw, 1080px)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.1rem 1.4rem',
        boxShadow: 'var(--shadow-stage)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span className="badge badge-terracotta">
            <Compass size={13} />
            <span>Guided Walkthrough</span>
          </span>
          <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>
            {currentStep.title}
          </strong>
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
            {currentStep.highlightMetric}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            disabled={judgeDemoStep <= 1}
            onClick={() => goToJudgeStep(judgeDemoStep - 1)}
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>

          {JUDGE_DEMO_STEPS.map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => goToJudgeStep(s.step)}
              aria-label={`Jump to Judge Demo Step ${s.step}`}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: s.step === judgeDemoStep ? 'var(--primary)' : 'var(--bg-alt)',
                color: s.step === judgeDemoStep ? '#FFFFFF' : 'var(--text-muted)',
                border: `1px solid ${s.step === judgeDemoStep ? 'var(--primary)' : 'var(--border-subtle)'}`,
              }}
            >
              {s.step}
            </button>
          ))}

          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
            disabled={judgeDemoStep >= JUDGE_DEMO_STEPS.length}
            onClick={() => goToJudgeStep(judgeDemoStep + 1)}
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
            onClick={stopJudgeDemo}
            aria-label="Exit Judge Tour"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
        {currentStep.summary}
      </p>
    </aside>
  );
}
