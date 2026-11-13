import React, { useId } from 'react';

/**
 * Sample #5: Dual-Gyro Sensor Orb with spinning orbital rings,
 * Mint-Emerald core, cursor-tracking blinking eyes, and happy (^ ^) hover/intro eyes.
 */
export default function AiChatbotOrb({
  size = 'docked',
  eyeOffset = { x: 0, y: 0 },
  eyesRef = null,
}) {
  const uid = useId().replace(/:/g, '');
  const gradId = `g-gyro-core-${uid}`;

  return (
    <span className="ai-orb-hop-wrapper" aria-hidden="true">
      <span className={`ai-gyro-orb-wrap size-${size}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="ai-gyro-svg bot-alive-wrapper"
        >
          <defs>
            <radialGradient id={gradId} cx="34%" cy="30%" r="68%">
              <stop offset="0%" stopColor="#ecfdf5" />
              <stop offset="42%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#064e3b" />
            </radialGradient>
          </defs>

          {/* Gyro Ring 1 */}
          <g className="anim-spin-slow">
            <ellipse
              cx="50"
              cy="50"
              rx="44"
              ry="18"
              transform="rotate(32 50 50)"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.2"
              strokeOpacity="0.88"
            />
            <circle cx="88" cy="72" r="3.2" fill="#38bdf8" />
          </g>

          {/* Gyro Ring 2 */}
          <g className="anim-spin-reverse">
            <ellipse
              cx="50"
              cy="50"
              rx="44"
              ry="18"
              transform="rotate(-32 50 50)"
              fill="none"
              stroke="#34d399"
              strokeWidth="2.2"
              strokeOpacity="0.88"
            />
            <circle cx="12" cy="72" r="3.2" fill="#6ee7b7" />
          </g>

          {/* Central Mint-Emerald Core */}
          <circle
            cx="50"
            cy="50"
            r="28"
            fill={`url(#${gradId})`}
            stroke="#a7f3d0"
            strokeWidth="1.2"
          />
          <ellipse
            cx="41"
            cy="36"
            rx="10"
            ry="5.5"
            transform="rotate(-25 41 36)"
            fill="#ffffff"
            fillOpacity="0.45"
          />

          {/* Cursor-Tracking, Blinking & Happy Eyes */}
          <g
            ref={eyesRef}
            className="bot-eyes-track"
            style={{
              transform: `translate(${Number(eyeOffset?.x || 0).toFixed(1)}px, ${Number(eyeOffset?.y || 0).toFixed(1)}px)`,
            }}
          >
            <rect className="eye-pill" x="40.5" y="43" width="4.8" height="14" rx="2.4" fill="#ffffff" />
            <rect className="eye-pill" x="54.7" y="43" width="4.8" height="14" rx="2.4" fill="#ffffff" />
            <path
              className="eye-happy"
              d="M 38.5 51 Q 42.9 44 47.3 51"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              className="eye-happy"
              d="M 52.7 51 Q 57.1 44 61.5 51"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </span>
    </span>
  );
}
