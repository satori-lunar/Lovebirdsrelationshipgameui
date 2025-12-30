import { motion } from 'motion/react';
import { Dragon } from '../../services/dragonService';

interface DragonHabitatProps {
  dragon: Dragon;
  onFeedClick: () => void;
  onPlayClick: () => void;
  isFeeding: boolean;
  isPlaying: boolean;
}

// Beautiful Dragon Egg with scale pattern
function BeautifulDragonEgg({ color }: { color: string }) {
  const colorMap: { [key: string]: { base: string; light: string; dark: string; glow: string } } = {
    purple: { base: '#8b5cf6', light: '#a78bfa', dark: '#6d28d9', glow: '#c084fc' },
    red: { base: '#ef4444', light: '#f87171', dark: '#dc2626', glow: '#fca5a5' },
    blue: { base: '#3b82f6', light: '#60a5fa', dark: '#2563eb', glow: '#93c5fd' },
    green: { base: '#10b981', light: '#34d399', dark: '#059669', glow: '#6ee7b7' },
    gold: { base: '#f59e0b', light: '#fbbf24', dark: '#d97706', glow: '#fde047' },
    silver: { base: '#94a3b8', light: '#cbd5e1', dark: '#64748b', glow: '#e2e8f0' },
    black: { base: '#374151', light: '#6b7280', dark: '#1f2937', glow: '#9ca3af' },
    white: { base: '#f3f4f6', light: '#ffffff', dark: '#e5e7eb', glow: '#ffffff' },
    pink: { base: '#ec4899', light: '#f472b6', dark: '#db2777', glow: '#f9a8d4' },
    teal: { base: '#14b8a6', light: '#2dd4bf', dark: '#0d9488', glow: '#5eead4' },
  };

  const colors = colorMap[color] || colorMap.purple;

  return (
    <div className="relative flex items-center justify-center">
      {/* Energy glow effect */}
      <motion.div
        className="absolute w-64 h-64 rounded-full opacity-30 blur-3xl"
        style={{ background: `radial-gradient(circle, ${colors.glow}, transparent)` }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Lightning bolts */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-20 rounded-full"
          style={{
            background: `linear-gradient(to bottom, ${colors.glow}, transparent)`,
            transform: `rotate(${i * 90}deg)`,
            transformOrigin: 'center',
          }}
          animate={{
            opacity: [0, 1, 0],
            scaleY: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
            delay: i * 0.2,
            repeatDelay: 2,
          }}
        />
      ))}

      <svg width="220" height="240" viewBox="0 0 220 240" className="relative z-10">
        <defs>
          {/* Gradient for egg */}
          <radialGradient id="eggGradient" cx="45%" cy="40%">
            <stop offset="0%" stopColor={colors.light} />
            <stop offset="50%" stopColor={colors.base} />
            <stop offset="100%" stopColor={colors.dark} />
          </radialGradient>

          {/* Glow filter */}
          <filter id="eggGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Scale pattern */}
          <pattern id="scales" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <path
              d="M 15,5 Q 5,15 15,25 Q 25,15 15,5"
              fill={colors.light}
              opacity="0.4"
            />
          </pattern>
        </defs>

        {/* Shadow */}
        <ellipse cx="110" cy="220" rx="60" ry="15" fill="rgba(0,0,0,0.2)" />

        {/* Main egg body */}
        <ellipse
          cx="110"
          cy="130"
          rx="75"
          ry="95"
          fill="url(#eggGradient)"
          stroke={colors.light}
          strokeWidth="3"
          filter="url(#eggGlow)"
        />

        {/* Scale pattern overlay */}
        <ellipse
          cx="110"
          cy="130"
          rx="73"
          ry="93"
          fill="url(#scales)"
          opacity="0.6"
        />

        {/* Individual prominent scales */}
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 6 }).map((_, col) => {
            const x = 60 + col * 20;
            const y = 50 + row * 20;
            const inEgg = Math.pow((x - 110) / 75, 2) + Math.pow((y - 130) / 95, 2) < 0.9;

            if (!inEgg) return null;

            return (
              <path
                key={`${row}-${col}`}
                d={`M ${x},${y - 5} Q ${x - 7},${y + 3} ${x},${y + 8} Q ${x + 7},${y + 3} ${x},${y - 5}`}
                fill={colors.light}
                opacity="0.3"
                stroke={colors.dark}
                strokeWidth="0.5"
              />
            );
          })
        )}

        {/* Magical runes/symbols */}
        <g opacity="0.6">
          <circle cx="110" cy="95" r="12" fill="none" stroke={colors.glow} strokeWidth="2">
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
          <path
            d="M 110,85 L 110,105 M 100,95 L 120,95"
            stroke={colors.glow}
            strokeWidth="2"
          >
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Energy cracks */}
        <g opacity="0.8">
          <path
            d="M 110 50 L 115 70 L 112 85"
            stroke={colors.glow}
            strokeWidth="3"
            fill="none"
            filter="url(#eggGlow)"
          >
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
          </path>
          <path
            d="M 115 70 L 135 78"
            stroke={colors.glow}
            strokeWidth="2.5"
            fill="none"
            filter="url(#eggGlow)"
          >
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
          </path>
          <path
            d="M 70 120 L 80 135 L 75 150"
            stroke={colors.glow}
            strokeWidth="2.5"
            fill="none"
            filter="url(#eggGlow)"
          >
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.4s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Sparkles */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <circle
              cx={60 + i * 20}
              cy={50 + (i % 2) * 140}
              r="3"
              fill={colors.glow}
            >
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur={`${2 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </circle>
            <path
              d={`M ${60 + i * 20},${50 + (i % 2) * 140 - 5} L ${60 + i * 20},${50 + (i % 2) * 140 + 5} M ${55 + i * 20},${50 + (i % 2) * 140} L ${65 + i * 20},${50 + (i % 2) * 140}`}
              stroke={colors.glow}
              strokeWidth="1.5"
            >
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur={`${2 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </path>
          </g>
        ))}

        {/* Pulsing outer glow */}
        <ellipse
          cx="110"
          cy="130"
          rx="76"
          ry="96"
          fill="none"
          stroke={colors.glow}
          strokeWidth="3"
          opacity="0.5"
        >
          <animate
            attributeName="opacity"
            values="0.3;0.7;0.3"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="rx"
            values="76;80;76"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="ry"
            values="96;100;96"
            dur="2s"
            repeatCount="indefinite"
          />
        </ellipse>
      </svg>
    </div>
  );
}

export function DragonHabitat({ dragon, onFeedClick, onPlayClick, isFeeding, isPlaying }: DragonHabitatProps) {
  const getStatColor = (value: number) => {
    if (value >= 70) return 'bg-emerald-500';
    if (value >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const needsAttention = dragon.hunger < 40 || dragon.happiness < 40;

  return (
    <div className="relative w-full h-full min-h-[700px] rounded-3xl overflow-hidden shadow-2xl">
      {/* Enchanted forest background */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-200 via-pink-100 to-green-100" />

      {/* Decorative trees with pastel leaves */}
      <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none">
        {/* Left tree */}
        <path d="M 50,0 Q 60,150 50,300 L 70,300 Q 60,150 70,0" fill="#6b5b4a" opacity="0.6"/>
        {/* Pastel leaves */}
        <g>
          {[...Array(15)].map((_, i) => (
            <ellipse
              key={`left-${i}`}
              cx={30 + (i % 3) * 15}
              cy={i * 20}
              rx="12"
              ry="18"
              fill={['#f5c2e7', '#cba6f7', '#b4e4b4', '#fef3c7'][i % 4]}
              opacity="0.7"
            />
          ))}
        </g>

        {/* Right tree */}
        <path d="M 350,0 Q 340,150 350,300 L 330,300 Q 340,150 330,0" fill="#6b5b4a" opacity="0.6"/>
        <g>
          {[...Array(15)].map((_, i) => (
            <ellipse
              key={`right-${i}`}
              cx={350 + (i % 3) * 15}
              cy={i * 20}
              rx="12"
              ry="18"
              fill={['#f5c2e7', '#cba6f7', '#b4e4b4', '#fef3c7'][i % 4]}
              opacity="0.7"
            />
          ))}
        </g>
      </svg>

      {/* Fairy lights on trees */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`light-${i}`}
            className="absolute w-2 h-2 rounded-full bg-yellow-300"
            style={{
              left: `${i < 6 ? 10 + i * 8 : 60 + (i - 6) * 8}%`,
              top: `${10 + (i % 6) * 15}%`,
              boxShadow: '0 0 10px rgba(253, 224, 71, 0.8)',
            }}
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Whimsical mushrooms */}
      <div className="absolute bottom-32 left-8">
        <svg width="80" height="100" viewBox="0 0 80 100">
          {/* Large mushroom */}
          <ellipse cx="40" cy="50" rx="35" ry="20" fill="#f5c2e7" opacity="0.9"/>
          <rect x="32" y="50" width="16" height="45" rx="8" fill="#fef3c7" opacity="0.9"/>
          <circle cx="25" cy="45" r="4" fill="#ffffff" opacity="0.6"/>
          <circle cx="45" cy="40" r="5" fill="#ffffff" opacity="0.6"/>
          <circle cx="35" cy="35" r="3" fill="#ffffff" opacity="0.6"/>
        </svg>
      </div>

      <div className="absolute bottom-32 left-24">
        <svg width="50" height="70" viewBox="0 0 50 70">
          {/* Small mushroom */}
          <ellipse cx="25" cy="35" rx="22" ry="12" fill="#cba6f7" opacity="0.9"/>
          <rect x="20" y="35" width="10" height="30" rx="5" fill="#fef3c7" opacity="0.9"/>
          <circle cx="18" cy="32" r="3" fill="#ffffff" opacity="0.6"/>
          <circle cx="30" cy="30" r="2" fill="#ffffff" opacity="0.6"/>
        </svg>
      </div>

      {/* Cozy stone cave nook */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-80">
        <svg width="320" height="200" viewBox="0 0 320 200">
          {/* Stone arch/cave */}
          <defs>
            <radialGradient id="stoneGrad" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#d4d4d8"/>
              <stop offset="100%" stopColor="#a1a1aa"/>
            </radialGradient>
          </defs>

          {/* Back wall */}
          <ellipse cx="160" cy="100" rx="140" ry="90" fill="url(#stoneGrad)" opacity="0.9"/>

          {/* Stone texture */}
          <g opacity="0.3">
            {[...Array(20)].map((_, i) => (
              <rect
                key={i}
                x={50 + (i % 5) * 50}
                y={30 + Math.floor(i / 5) * 30}
                width={Math.random() * 40 + 20}
                height={Math.random() * 25 + 15}
                rx="4"
                fill="#71717a"
              />
            ))}
          </g>

          {/* Moss patches */}
          <g opacity="0.7">
            <path d="M 50,80 Q 70,70 90,80 Q 80,90 70,85 Q 60,90 50,80" fill="#84cc16"/>
            <path d="M 220,70 Q 240,60 260,70 Q 250,80 240,75 Q 230,80 220,70" fill="#84cc16"/>
            <path d="M 140,40 Q 160,35 180,45 Q 170,52 160,48 Q 150,52 140,40" fill="#65a30d"/>
          </g>

          {/* Vines */}
          <g opacity="0.6">
            <path d="M 280,20 Q 270,60 265,100" stroke="#65a30d" strokeWidth="3" fill="none"/>
            <ellipse cx="275" cy="35" rx="4" ry="6" fill="#84cc16"/>
            <ellipse cx="268" cy="70" rx="4" ry="6" fill="#84cc16"/>
          </g>
        </svg>

        {/* Cushions/pillows */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex items-end justify-center gap-2" style={{ bottom: '-20px' }}>
          <svg width="70" height="40" viewBox="0 0 70 40">
            <ellipse cx="35" cy="30" rx="32" ry="18" fill="#a78bfa" opacity="0.9"/>
            <ellipse cx="35" cy="27" rx="30" ry="15" fill="#c4b5fd" opacity="0.8"/>
          </svg>
          <svg width="80" height="45" viewBox="0 0 80 45">
            <ellipse cx="40" cy="33" rx="37" ry="20" fill="#f9a8d4" opacity="0.9"/>
            <ellipse cx="40" cy="30" rx="35" ry="17" fill="#fbcfe8" opacity="0.8"/>
          </svg>
          <svg width="65" height="38" viewBox="0 0 65 38">
            <ellipse cx="32" cy="28" rx="30" ry="17" fill="#fde047" opacity="0.9"/>
            <ellipse cx="32" cy="25" rx="28" ry="14" fill="#fef08a" opacity="0.8"/>
          </svg>
        </div>
      </div>

      {/* Potted plants */}
      <div className="absolute bottom-32 right-12">
        <svg width="60" height="80" viewBox="0 0 60 80">
          {/* Pot */}
          <path d="M 15,60 L 20,80 L 40,80 L 45,60 Z" fill="#d97706" opacity="0.8"/>
          <ellipse cx="30" cy="60" rx="15" ry="5" fill="#b45309" opacity="0.8"/>
          {/* Succulent */}
          <g>
            <ellipse cx="30" cy="50" rx="8" ry="10" fill="#84cc16" opacity="0.9"/>
            <ellipse cx="25" cy="48" rx="6" ry="8" fill="#a3e635" opacity="0.9"/>
            <ellipse cx="35" cy="48" rx="6" ry="8" fill="#a3e635" opacity="0.9"/>
          </g>
        </svg>
      </div>

      {/* Dragon/Egg in center on cushions */}
      <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 z-20">
        <motion.div
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {dragon.stage === 'egg' ? (
            <BeautifulDragonEgg color={dragon.color} />
          ) : (
            <div className="text-9xl">🐉</div>
          )}
        </motion.div>
      </div>

      {/* Grass/ground */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-b from-green-300/80 to-green-400/80" />
      <div className="absolute bottom-0 left-0 right-0 h-28 opacity-30">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 w-1 bg-green-700"
            style={{
              height: `${10 + Math.random() * 20}px`,
              left: `${i * 2.5}%`,
            }}
          />
        ))}
      </div>

      {/* Decorative bottom UI bar */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-r from-green-600 via-green-500 to-green-600 border-t-4 border-yellow-600/50 shadow-lg z-30">
        {/* Decorative swirls */}
        <svg className="absolute left-2 top-0 w-12 h-full" viewBox="0 0 48 96">
          <path d="M 5,48 Q 15,30 25,48 Q 15,66 5,48" fill="#854d0e" opacity="0.4"/>
        </svg>
        <svg className="absolute right-2 top-0 w-12 h-full" viewBox="0 0 48 96">
          <path d="M 43,48 Q 33,30 23,48 Q 33,66 43,48" fill="#854d0e" opacity="0.4"/>
        </svg>

        {/* Action buttons */}
        <div className="flex items-center justify-center h-full gap-8 px-16">
          <motion.button
            onClick={onFeedClick}
            disabled={isFeeding}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg border-3 border-yellow-300">
              <span className="text-3xl">🍎</span>
            </div>
            <span className="text-white font-bold text-sm drop-shadow-md">FEED</span>
          </motion.button>

          <motion.button
            onClick={onPlayClick}
            disabled={isPlaying}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg border-3 border-yellow-300">
              <span className="text-3xl">▶️</span>
            </div>
            <span className="text-white font-bold text-sm drop-shadow-md">PLAY</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1 group opacity-60 cursor-not-allowed"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg border-3 border-yellow-300">
              <span className="text-3xl">🌍</span>
            </div>
            <span className="text-white font-bold text-sm drop-shadow-md">EXPLORE</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-lg border-3 border-yellow-300">
              <span className="text-3xl">❤️</span>
            </div>
            <span className="text-white font-bold text-sm drop-shadow-md">LOVE</span>
          </motion.button>
        </div>
      </div>

      {/* Stats overlay - top right */}
      <div className="absolute top-6 right-6 z-30">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border-2 border-purple-200 w-48">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">{dragon.name}</h3>
            {needsAttention && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-xl"
              >
                ⚠️
              </motion.div>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">🍎</span>
                <span>{dragon.hunger}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <motion.div
                  className={`h-1.5 rounded-full ${getStatColor(dragon.hunger)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${dragon.hunger}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">😊</span>
                <span>{dragon.happiness}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <motion.div
                  className={`h-1.5 rounded-full ${getStatColor(dragon.happiness)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${dragon.happiness}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">❤️</span>
                <span>{dragon.health}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <motion.div
                  className={`h-1.5 rounded-full ${getStatColor(dragon.health)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${dragon.health}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* XP progress */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-xl border-2 border-purple-200 mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">⭐ XP</span>
            <span>{dragon.experience}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (dragon.experience / 100) * 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Floating hearts if very happy */}
      {dragon.happiness >= 80 && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute text-3xl z-10"
              style={{
                left: `${40 + i * 10}%`,
                bottom: '50%',
              }}
              animate={{
                y: [0, -120],
                opacity: [0, 1, 0],
                rotate: [0, 15, -15, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeOut",
              }}
            >
              💕
            </motion.div>
          ))}
        </>
      )}
    </div>
  );
}
