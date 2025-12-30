interface DragonEggProps {
  color?: string;
  size?: number;
  className?: string;
}

export function DragonEgg({ color = 'purple', size = 200, className = '' }: DragonEggProps) {
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
      {/* Egg shadow */}
      <ellipse cx="100" cy="180" rx="50" ry="10" fill="rgba(0,0,0,0.1)" />

      {/* Main egg body */}
      <ellipse
        cx="100"
        cy="120"
        rx="60"
        ry="75"
        fill={colors.primary}
        stroke={colors.secondary}
        strokeWidth="3"
      />

      {/* Scale texture - overlapping circles */}
      <g opacity="0.3">
        {[0, 1, 2, 3, 4].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <circle
              key={`${row}-${col}`}
              cx={70 + col * 15}
              cy={70 + row * 20}
              r="8"
              fill={colors.accent}
              opacity="0.4"
            />
          ))
        )}
      </g>

      {/* Cracks - appears as XP increases */}
      <g stroke={colors.accent} strokeWidth="2" fill="none" opacity="0.6">
        <path d="M 100 50 L 110 70 L 105 85" />
        <path d="M 110 70 L 125 75" />
        <path d="M 70 100 L 80 110 L 75 125" />
      </g>

      {/* Glow effect */}
      <ellipse
        cx="100"
        cy="120"
        rx="58"
        ry="73"
        fill="none"
        stroke={colors.accent}
        strokeWidth="2"
        opacity="0.5"
      >
        <animate
          attributeName="opacity"
          values="0.3;0.6;0.3"
          dur="2s"
          repeatCount="indefinite"
        />
      </ellipse>
    </svg>
  );
}
