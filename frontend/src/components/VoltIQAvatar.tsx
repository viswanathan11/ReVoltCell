import React from 'react';

export interface VoltIQAvatarProps {
  size?: number;
  mode?: 'dashboard' | 'passport';
  glow?: boolean;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * VoltIQBotAvatar: Custom designed futuristic & friendly robot profile avatar for VoltIQ.
 * Features an energy antenna, cyber visor with expressive glowing eyes, and ReVoltCell battery lightning spark.
 */
export const VoltIQAvatar: React.FC<VoltIQAvatarProps> = ({
  size = 40,
  mode = 'dashboard',
  glow = false,
  animate = true,
  className = '',
  style,
}) => {
  const isPassport = mode === 'passport';
  const primaryColor = isPassport ? '#10b981' : '#38bdf8'; // Emerald for passport, Cyan for dashboard
  const secondaryColor = isPassport ? '#059669' : '#0284c7';
  const glowShadow = isPassport
    ? '0 0 16px rgba(16, 185, 129, 0.45)'
    : '0 0 16px rgba(56, 189, 248, 0.45)';

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: glow ? glowShadow : undefined,
        borderRadius: '50%',
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Cyber metallic gradients */}
          <linearGradient id={`bot-chassis-${mode}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id={`bot-visor-${mode}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#050811" />
            <stop offset="100%" stopColor="#0b1329" />
          </linearGradient>
          <linearGradient id={`bot-glow-${mode}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
        </defs>

        {/* Circular Ambient Aura */}
        <circle
          cx="24"
          cy="24"
          r="23"
          fill={isPassport ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)'}
          stroke={primaryColor}
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />

        {/* Antenna Stem */}
        <line
          x1="24"
          y1="8"
          x2="24"
          y2="13"
          stroke="#94a3b8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Antenna Beacon Orb with Pulse */}
        <circle cx="24" cy="7" r="3.5" fill={primaryColor}>
          {animate && (
            <animate
              attributeName="opacity"
              values="0.6;1;0.6"
              dur="1.8s"
              repeatCount="indefinite"
            />
          )}
        </circle>
        <circle cx="24" cy="7" r="1.5" fill="#ffffff" />

        {/* Left & Right Ear Nodules / Sensor Bolts */}
        <rect x="7" y="21" width="3.5" height="8" rx="1.75" fill="#475569" stroke="#334155" strokeWidth="0.8" />
        <rect x="37.5" y="21" width="3.5" height="8" rx="1.75" fill="#475569" stroke="#334155" strokeWidth="0.8" />
        {/* Ear Energy Indicators */}
        <line x1="8.75" y1="23" x2="8.75" y2="27" stroke={primaryColor} strokeWidth="1" strokeLinecap="round" />
        <line x1="39.25" y1="23" x2="39.25" y2="27" stroke={primaryColor} strokeWidth="1" strokeLinecap="round" />

        {/* Main Robot Head Chassis */}
        <rect
          x="10"
          y="13"
          width="28"
          height="24"
          rx="7"
          fill={`url(#bot-chassis-${mode})`}
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Forehead Energy Lightning Bolt Accent */}
        <path
          d="M23.5 15.2 L22 17.5 H24.5 L23.5 20"
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Visor Display Screen */}
        <rect
          x="13.5"
          y="19"
          width="21"
          height="12"
          rx="4.5"
          fill={`url(#bot-visor-${mode})`}
          stroke={primaryColor}
          strokeWidth="1"
          strokeOpacity="0.6"
        />

        {/* Glowing Expressive Eyes */}
        <g fill={primaryColor}>
          {/* Left Eye */}
          <rect x="17" y="22.5" width="4.5" height="5" rx="2">
            {animate && (
              <animate
                attributeName="height"
                values="5;1;5"
                keyTimes="0;0.5;1"
                dur="3.8s"
                repeatCount="indefinite"
              />
            )}
          </rect>
          {/* Right Eye */}
          <rect x="26.5" y="22.5" width="4.5" height="5" rx="2">
            {animate && (
              <animate
                attributeName="height"
                values="5;1;5"
                keyTimes="0;0.5;1"
                dur="3.8s"
                repeatCount="indefinite"
              />
            )}
          </rect>
        </g>

        {/* Visor Eye Glares / Highlights */}
        <circle cx="18" cy="23.5" r="0.8" fill="#ffffff" />
        <circle cx="27.5" cy="23.5" r="0.8" fill="#ffffff" />

        {/* Cheerful Robot Smile / Energy Arc */}
        <path
          d="M21 32 Q24 34.5 27 32"
          stroke={primaryColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Chin Trim Detail */}
        <line x1="21" y1="36" x2="27" y2="36" stroke="#334155" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
};
