interface DragonHatchlingProps {
  color?: string;
  size?: number;
  className?: string;
}

export function DragonHatchling({ color = 'purple', size = 200, className = '' }: DragonHatchlingProps) {
  const colorMap: { [key: string]: { primary: string; secondary: string; accent: string } } = {
    purple: { primary: '#9333ea', secondary: '#a855f7', accent: '#c084fc' },
    red: { primary: '#dc2626', secondary: '#ef4444', accent: '#f87171' },
    blue: { primary: '#2563eb', secondary: '#3b82f6', accent: '#60a5fa' },
    green: { primary: '#16a34a', secondary: '#22c55e', accent: '#4ade80' },
    gold: { primary: '#ca8a04', secondary: '#eab308', accent: '#facc15' },
    silver: { primary: '#64748b', secondary: '#94a3b8', accent: '#cbd5e1' },
    black: { primary: '#1f2937', secondary: '#374151', accent: '#4b5563' },
    white: { primary: '#e5e7eb', secondary: '#f3f4f6', accent: '#ffffff' },
    pink: { primary: '#db2777', secondary: '#ec4899', accent: '#f472b6' },
    teal: { primary: '#0d9488', secondary: '#14b8a6', accent: '#2dd4bf' },
  };

  const colors = colorMap[color] || colorMap.purple;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shadow */}
      <ellipse cx="100" cy="185" rx="40" ry="8" fill="rgba(0,0,0,0.15)" />

      {/* Tail */}
      <path
        d="M 130 160 Q 150 165, 165 155 Q 168 152, 165 148"
        fill={colors.primary}
        stroke={colors.secondary}
        strokeWidth="2"
      />
      {/* Tail spikes */}
      <path d="M 145 160 L 148 155 L 143 157" fill={colors.accent} />
      <path d="M 155 157 L 158 152 L 153 154" fill={colors.accent} />

      {/* Body */}
      <ellipse cx="100" cy="140" rx="35" ry="40" fill={colors.primary} stroke={colors.secondary} strokeWidth="2" />

      {/* Head */}
      <circle cx="85" cy="110" r="28" fill={colors.primary} stroke={colors.secondary} strokeWidth="2" />

      {/* Snout */}
      <ellipse cx="65" cy="115" rx="15" ry="12" fill={colors.secondary} stroke={colors.secondary} strokeWidth="1.5" />

      {/* Horns - small baby horns */}
      <path d="M 80 90 L 78 80 L 82 88" fill={colors.accent} stroke={colors.secondary} strokeWidth="1" />
      <path d="M 95 88 L 98 78 L 93 86" fill={colors.accent} stroke={colors.secondary} strokeWidth="1" />

      {/* Wings - tiny, folded */}
      <g opacity="0.9">
        {/* Left wing */}
        <path
          d="M 75 125 Q 55 120, 50 130 Q 48 135, 52 138 Q 60 132, 75 135"
          fill={colors.accent}
          stroke={colors.secondary}
          strokeWidth="1.5"
          opacity="0.7"
        />
        {/* Right wing */}
        <path
          d="M 125 125 Q 145 120, 150 130 Q 152 135, 148 138 Q 140 132, 125 135"
          fill={colors.accent}
          stroke={colors.secondary}
          strokeWidth="1.5"
          opacity="0.7"
        />
      </g>

      {/* Legs - quadrupedal stance */}
      <g>
        {/* Front left */}
        <rect x="80" y="170" width="8" height="15" rx="2" fill={colors.primary} stroke={colors.secondary} strokeWidth="1" />
        {/* Front right */}
        <rect x="105" y="170" width="8" height="15" rx="2" fill={colors.primary} stroke={colors.secondary} strokeWidth="1" />
        {/* Back left */}
        <rect x="115" y="175" width="8" height="12" rx="2" fill={colors.primary} stroke={colors.secondary} strokeWidth="1" />
        {/* Back right */}
        <rect x="130" y="175" width="8" height="12" rx="2" fill={colors.primary} stroke={colors.secondary} strokeWidth="1" />
      </g>

      {/* Eyes - big cute eyes */}
      <g>
        <circle cx="75" cy="105" r="6" fill="white" />
        <circle cx="75" cy="105" r="4" fill="black">
          <animate attributeName="r" values="4;0.5;4" dur="3s" begin="0s" repeatCount="indefinite" keyTimes="0;0.05;0.15;1" />
        </circle>
      </g>

      {/* Scales pattern */}
      <g opacity="0.2">
        <circle cx="95" cy="115" r="3" fill={colors.accent} />
        <circle cx="105" cy="140" r="3" fill={colors.accent} />
        <circle cx="90" cy="145" r="3" fill={colors.accent} />
        <circle cx="110" cy="150" r="3" fill={colors.accent} />
      </g>

      {/* Nostrils */}
      <circle cx="60" cy="112" r="1.5" fill="#4b5563" />
      <circle cx="60" cy="118" r="1.5" fill="#4b5563" />
    </svg>
  );
}
