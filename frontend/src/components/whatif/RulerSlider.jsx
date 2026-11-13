import React, { useRef } from 'react';

/**
 * Tactile dual-purpose ruler slider with 3-grip white thumb, progress track,
 * 21 graduated ruler tick marks, pointer-capture drag, and keyboard Arrow support.
 */
export default function RulerSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit = null,
  displayValue,
  badgeText = '',
  badgeColor = 'var(--text-muted)',
  fillColor = '#10b981',
}) {
  const sliderRef = useRef(null);
  const latestValRef = useRef(value);
  latestValRef.current = value;
  const ratio = Math.min(1, Math.max(0, (value - min) / Math.max(0.0001, max - min)));
  const pct = ratio * 100;

  const snapValue = (raw) => {
    const clamped = Math.min(max, Math.max(min, raw));
    const snapped = Math.round((clamped - min) / step) * step + min;
    const decimals = step < 1 ? String(step).split('.')[1]?.length || 1 : 0;
    return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals));
  };

  const updateFromClientX = (clientX) => {
    const el = sliderRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const r = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
    const next = snapValue(min + r * (max - min));
    latestValRef.current = next;
    onChange(next);
    return next;
  };

  const handlePointerDown = (e) => {
    const el = sliderRef.current;
    if (!el) return;
    el.setPointerCapture?.(e.pointerId);
    updateFromClientX(e.pointerX ?? e.clientX);

    const onMove = (ev) => updateFromClientX(ev.clientX);
    const onUp = () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      onCommit?.(latestValRef.current);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = snapValue(value + step);
      latestValRef.current = next;
      onChange(next);
      onCommit?.(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = snapValue(value - step);
      latestValRef.current = next;
      onChange(next);
      onCommit?.(next);
    }
  };

  return (
    <div className="whatif-slider-block">
      <span className="whatif-slider-label">{label}</span>
      <div className="whatif-slider-value-row">
        <span className="whatif-slider-val mono">{displayValue ?? value}</span>
        {badgeText && (
          <span className="whatif-slider-badge mono" style={{ color: badgeColor }}>
            {badgeText}
          </span>
        )}
      </div>

      <div
        ref={sliderRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className="ruler-slider"
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      >
        <div className="ruler-track">
          <div
            className="ruler-fill"
            style={{ width: `${pct}%`, background: fillColor }}
          />
          <div className="ruler-thumb" style={{ left: `${pct}%` }}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <div className="ruler-ticks" aria-hidden="true">
        {Array.from({ length: 21 }, (_, idx) => (
          <i key={idx} />
        ))}
      </div>
    </div>
  );
}
