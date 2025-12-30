import { DragonEgg } from './DragonEgg';
import { DragonHatchling } from './DragonHatchling';

interface DragonVisualizationProps {
  stage: 'egg' | 'hatchling' | 'young' | 'teen' | 'adult';
  color?: string;
  size?: number;
  className?: string;
  accessories?: string[];
}

// Young Dragon - bigger wings, more pronounced features
function DragonYoung({ color = 'purple', size = 200, className = '' }) {
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
    <svg width={size} height={size} viewBox="0 0 200 200" className={className}>
      {/* Shadow */}
      <ellipse cx="100" cy="190" rx="50" ry="10" fill="rgba(0,0,0,0.2)" />

      {/* Tail with spikes */}
      <path
        d="M 140 165 Q 170 160, 185 145"
        fill="none"
        stroke={colors.primary}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path d="M 150 160 L 155 150 L 148 158" fill={colors.accent} />
      <path d="M 165 155 L 170 145 L 163 153" fill={colors.accent} />
      <path d="M 178 148 L 183 138 L 176 146" fill={colors.accent} />

      {/* Wings - can flutter */}
      <g>
        {/* Left wing */}
        <path
          d="M 70 110 Q 30 90, 25 120 Q 20 135, 30 145 Q 50 130, 75 130"
          fill={colors.accent}
          stroke={colors.secondary}
          strokeWidth="2"
          opacity="0.8"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 70 110; -5 70 110; 0 70 110"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>
        {/* Wing membrane lines */}
        <path d="M 40 110 L 50 130" stroke={colors.secondary} strokeWidth="1" opacity="0.5" />
        <path d="M 50 105 L 60 125" stroke={colors.secondary} strokeWidth="1" opacity="0.5" />

        {/* Right wing */}
        <path
          d="M 130 110 Q 170 90, 175 120 Q 180 135, 170 145 Q 150 130, 125 130"
          fill={colors.accent}
          stroke={colors.secondary}
          strokeWidth="2"
          opacity="0.8"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 130 110; 5 130 110; 0 130 110"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>
        <path d="M 160 110 L 150 130" stroke={colors.secondary} strokeWidth="1" opacity="0.5" />
        <path d="M 150 105 L 140 125" stroke={colors.secondary} strokeWidth="1" opacity="0.5" />
      </g>

      {/* Body */}
      <ellipse cx="100" cy="135" rx="40" ry="50" fill={colors.primary} stroke={colors.secondary} strokeWidth="2" />

      {/* Head */}
      <ellipse cx="80" cy="95" rx="32" ry="30" fill={colors.primary} stroke={colors.secondary} strokeWidth="2" />

      {/* Snout */}
      <ellipse cx="55" cy="100" rx="18" ry="15" fill={colors.secondary} />

      {/* Horns - more prominent */}
      <path d="M 75 70 L 70 50 L 78 68" fill={colors.accent} stroke={colors.secondary} strokeWidth="1.5" />
      <path d="M 95 68 L 100 48 L 93 66" fill={colors.accent} stroke={colors.secondary} strokeWidth="1.5" />

      {/* Back spikes */}
      <path d="M 95 115 L 100 105 L 93 113" fill={colors.accent} />
      <path d="M 105 125 L 110 115 L 103 123" fill={colors.accent} />
      <path d="M 115 140 L 120 130 L 113 138" fill={colors.accent} />

      {/* Legs */}
      <rect x="70" y="175" width="12" height="20" rx="3" fill={colors.primary} stroke={colors.secondary} strokeWidth="1.5" />
      <rect x="110" y="175" width="12" height="20" rx="3" fill={colors.primary} stroke={colors.secondary} strokeWidth="1.5" />
      <rect x="120" y="178" width="12" height="18" rx="3" fill={colors.primary} stroke={colors.secondary} strokeWidth="1.5" />

      {/* Eyes */}
      <circle cx="70" cy="90" r="7" fill="white" />
      <circle cx="70" cy="90" r="5" fill="black">
        <animate attributeName="r" values="5;0.5;5" dur="4s" repeatCount="indefinite" keyTimes="0;0.05;0.15;1" />
      </circle>

      {/* Scales */}
      <g opacity="0.25">
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <circle
              key={`${row}-${col}`}
              cx={85 + col * 12}
              cy={120 + row * 18}
              r="5"
              fill={colors.accent}
            />
          ))
        )}
      </g>

      {/* Nostrils */}
      <circle cx="48" cy="97" r="2" fill="#1f2937" />
      <circle cx="48" cy="103" r="2" fill="#1f2937" />
    </svg>
  );
}

// Teen Dragon - can fly, more mature
function DragonTeen({ color = 'purple', size = 200, className = '' }) {
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
    <svg width={size} height={size} viewBox="0 0 200 200" className={className}>
      {/* Shadow */}
      <ellipse cx="105" cy="192" rx="55" ry="8" fill="rgba(0,0,0,0.25)" />

      {/* Tail with prominent spikes */}
      <path
        d="M 145 155 Q 185 140, 195 120"
        fill="none"
        stroke={colors.primary}
        strokeWidth="14"
        strokeLinecap="round"
      />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M ${155 + i * 12} ${150 - i * 8} L ${160 + i * 12} ${135 - i * 8} L ${153 + i * 12} ${147 - i * 8}`}
          fill={colors.accent}
        />
      ))}

      {/* Large wings - flight capable */}
      <g>
        {/* Left wing */}
        <path
          d="M 60 100 Q 10 70, 5 110 Q 0 135, 15 155 Q 45 135, 70 125"
          fill={colors.accent}
          stroke={colors.secondary}
          strokeWidth="2.5"
          opacity="0.85"
        />
        <path d="M 25 95 L 40 125" stroke={colors.secondary} strokeWidth="1.5" opacity="0.6" />
        <path d="M 35 90 L 50 120" stroke={colors.secondary} strokeWidth="1.5" opacity="0.6" />
        <path d="M 45 88 L 60 118" stroke={colors.secondary} strokeWidth="1.5" opacity="0.6" />

        {/* Right wing */}
        <path
          d="M 140 100 Q 190 70, 195 110 Q 200 135, 185 155 Q 155 135, 130 125"
          fill={colors.accent}
          stroke={colors.secondary}
          strokeWidth="2.5"
          opacity="0.85"
        />
        <path d="M 175 95 L 160 125" stroke={colors.secondary} strokeWidth="1.5" opacity="0.6" />
        <path d="M 165 90 L 150 120" stroke={colors.secondary} strokeWidth="1.5" opacity="0.6" />
        <path d="M 155 88 L 140 118" stroke={colors.secondary} strokeWidth="1.5" opacity="0.6" />
      </g>

      {/* Body - more athletic */}
      <ellipse cx="100" cy="130" rx="45" ry="55" fill={colors.primary} stroke={colors.secondary} strokeWidth="2.5" />

      {/* Neck */}
      <path
        d="M 80 100 Q 75 110, 80 125"
        fill={colors.primary}
        stroke={colors.secondary}
        strokeWidth="2"
      />

      {/* Head - more elongated */}
      <ellipse cx="75" cy="85" rx="35" ry="32" fill={colors.primary} stroke={colors.secondary} strokeWidth="2.5" />

      {/* Snout - more defined */}
      <ellipse cx="48" cy="92" rx="22" ry="18" fill={colors.secondary} />

      {/* Large horns */}
      <path d="M 70 58 L 62 35 L 72 56" fill={colors.accent} stroke={colors.secondary} strokeWidth="2" />
      <path d="M 92 56 L 100 33 L 90 54" fill={colors.accent} stroke={colors.secondary} strokeWidth="2" />

      {/* Prominent back spikes */}
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M ${88 + i * 10} ${105 + i * 12} L ${93 + i * 10} ${90 + i * 12} L ${86 + i * 10} ${103 + i * 12}`}
          fill={colors.accent}
          stroke={colors.secondary}
          strokeWidth="1"
        />
      ))}

      {/* Legs - can stand bipedal */}
      <rect x="75" y="175" width="14" height="22" rx="4" fill={colors.primary} stroke={colors.secondary} strokeWidth="2" />
      <rect x="115" y="175" width="14" height="22" rx="4" fill={colors.primary} stroke={colors.secondary} strokeWidth="2" />

      {/* Arms */}
      <ellipse cx="65" cy="120" rx="10" ry="18" fill={colors.primary} stroke={colors.secondary} strokeWidth="1.5" />
      <ellipse cx="135" cy="120" rx="10" ry="18" fill={colors.primary} stroke={colors.secondary} strokeWidth="1.5" />

      {/* Eyes - piercing */}
      <ellipse cx="65" cy="80" rx="8" ry="10" fill="white" />
      <ellipse cx="65" cy="80" rx="5" ry="7" fill="#fbbf24">
        <animate attributeName="opacity" values="1;0.3;1" dur="5s" repeatCount="indefinite" keyTimes="0;0.05;0.1;1" />
      </ellipse>
      <ellipse cx="65" cy="80" rx="3" ry="5" fill="black" />

      {/* Scales pattern */}
      <g opacity="0.3">
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <circle
              key={`${row}-${col}`}
              cx={80 + col * 10}
              cy={115 + row * 14}
              r="4"
              fill={colors.accent}
            />
          ))
        )}
      </g>

      {/* Nostrils with smoke */}
      <circle cx="40" cy="88" r="2.5" fill="#1f2937" />
      <circle cx="40" cy="96" r="2.5" fill="#1f2937" />
      <g opacity="0.4">
        <circle cx="35" cy="85" r="3" fill="#9ca3af">
          <animate attributeName="cy" values="85;75;65" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.1;0" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}

// Adult Dragon - majestic and powerful
function DragonAdult({ color = 'purple', size = 200, className = '' }) {
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
    <svg width={size} height={size} viewBox="0 0 220 220" className={className}>
      {/* Shadow */}
      <ellipse cx="110" cy="210" rx="70" ry="10" fill="rgba(0,0,0,0.3)" />

      {/* Massive tail with spikes */}
      <path
        d="M 155 150 Q 200 130, 210 100"
        fill="none"
        stroke={colors.primary}
        strokeWidth="18"
        strokeLinecap="round"
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M ${162 + i * 10} ${145 - i * 10} L ${168 + i * 10} ${125 - i * 10} L ${160 + i * 10} ${142 - i * 10}`}
          fill={colors.accent}
          stroke={colors.secondary}
          strokeWidth="1"
        />
      ))}

      {/* Massive wings */}
      <g>
        {/* Left wing */}
        <path
          d="M 50 95 Q -5 55, 0 105 Q -5 140, 15 165 Q 50 140, 75 125"
          fill={colors.accent}
          stroke={colors.secondary}
          strokeWidth="3"
          opacity="0.9"
        />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M ${20 + i * 15} ${90 + i * 5} L ${45 + i * 10} ${125 + i * 5}`}
            stroke={colors.secondary}
            strokeWidth="2"
            opacity="0.6"
          />
        ))}

        {/* Right wing */}
        <path
          d="M 170 95 Q 225 55, 220 105 Q 225 140, 205 165 Q 170 140, 145 125"
          fill={colors.accent}
          stroke={colors.secondary}
          strokeWidth="3"
          opacity="0.9"
        />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M ${200 - i * 15} ${90 + i * 5} L ${175 - i * 10} ${125 + i * 5}`}
            stroke={colors.secondary}
            strokeWidth="2"
            opacity="0.6"
          />
        ))}
      </g>

      {/* Powerful body - bipedal stance */}
      <ellipse cx="110" cy="130" rx="50" ry="60" fill={colors.primary} stroke={colors.secondary} strokeWidth="3" />

      {/* Muscular neck */}
      <path
        d="M 85 95 Q 75 105, 75 120 L 90 125"
        fill={colors.primary}
        stroke={colors.secondary}
        strokeWidth="2.5"
      />

      {/* Majestic head */}
      <ellipse cx="70" cy="75" rx="38" ry="35" fill={colors.primary} stroke={colors.secondary} strokeWidth="3" />

      {/* Long snout */}
      <ellipse cx="40" cy="82" rx="25" ry="20" fill={colors.secondary} />

      {/* Impressive horns */}
      <path
        d="M 65 45 L 55 15 L 68 43"
        fill={colors.accent}
        stroke={colors.secondary}
        strokeWidth="2.5"
      />
      <path
        d="M 90 43 L 100 13 L 88 41"
        fill={colors.accent}
        stroke={colors.secondary}
        strokeWidth="2.5"
      />

      {/* Massive back spikes */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M ${88 + i * 12} ${100 + i * 10} L ${95 + i * 12} ${78 + i * 10} L ${86 + i * 12} ${98 + i * 10}`}
          fill={colors.accent}
          stroke={colors.secondary}
          strokeWidth="1.5"
        />
      ))}

      {/* Strong legs */}
      <g>
        <rect x="85" y="180" width="18" height="30" rx="5" fill={colors.primary} stroke={colors.secondary} strokeWidth="2.5" />
        <rect x="125" y="180" width="18" height="30" rx="5" fill={colors.primary} stroke={colors.secondary} strokeWidth="2.5" />
        {/* Claws */}
        <path d="M 85 210 L 82 215 M 95 210 L 98 215 M 103 210 L 106 215" stroke={colors.accent} strokeWidth="2" />
        <path d="M 125 210 L 122 215 M 135 210 L 138 215 M 143 210 L 146 215" stroke={colors.accent} strokeWidth="2" />
      </g>

      {/* Powerful arms */}
      <ellipse cx="60" cy="120" rx="12" ry="25" fill={colors.primary} stroke={colors.secondary} strokeWidth="2" />
      <ellipse cx="160" cy="120" rx="12" ry="25" fill={colors.primary} stroke={colors.secondary} strokeWidth="2" />

      {/* Wise eyes */}
      <ellipse cx="60" cy="70" rx="10" ry="12" fill="white" />
      <ellipse cx="60" cy="70" rx="6" ry="9" fill="#fbbf24" />
      <ellipse cx="60" cy="70" rx="4" ry="7" fill="black">
        <animate attributeName="opacity" values="1;0.2;1" dur="6s" repeatCount="indefinite" keyTimes="0;0.03;0.08;1" />
      </ellipse>

      {/* Detailed scales */}
      <g opacity="0.35">
        {[0, 1, 2, 3, 4].map((row) =>
          [0, 1, 2, 3, 4].map((col) => (
            <circle
              key={`${row}-${col}`}
              cx={85 + col * 10}
              cy={110 + row * 12}
              r="4"
              fill={colors.accent}
            />
          ))
        )}
      </g>

      {/* Fire breath */}
      <g opacity="0.5">
        <path
          d="M 20 78 Q 10 75, 5 80"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" />
        </path>
        <circle cx="8" cy="78" r="4" fill="#fbbf24">
          <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Nostrils */}
      <circle cx="30" cy="78" r="3" fill="#1f2937" />
      <circle cx="30" cy="86" r="3" fill="#1f2937" />
    </svg>
  );
}

export function DragonVisualization({
  stage,
  color = 'purple',
  size = 200,
  className = '',
  accessories = [],
}: DragonVisualizationProps) {
  const renderDragon = () => {
    switch (stage) {
      case 'egg':
        return <DragonEgg color={color} size={size} className={className} />;
      case 'hatchling':
        return <DragonHatchling color={color} size={size} className={className} />;
      case 'young':
        return <DragonYoung color={color} size={size} className={className} />;
      case 'teen':
        return <DragonTeen color={color} size={size} className={className} />;
      case 'adult':
        return <DragonAdult color={color} size={size} className={className} />;
      default:
        return <DragonEgg color={color} size={size} className={className} />;
    }
  };

  return (
    <div className="relative inline-block">
      {renderDragon()}
      {/* TODO: Render accessories overlay based on accessories array */}
    </div>
  );
}
