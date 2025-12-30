import { motion } from 'motion/react';
import { Dragon } from '../../services/dragonService';

interface DragonHabitatProps {
  dragon: Dragon;
  onFeedClick: () => void;
  onPlayClick: () => void;
  isFeeding: boolean;
  isPlaying: boolean;
}

// Improved Dragon Egg Component - magical and alive
function MagicalDragonEgg({ color }: { color: string }) {
  const colorMap: { [key: string]: { primary: string; glow: string; sparkle: string } } = {
    purple: { primary: '#9333ea', glow: '#c084fc', sparkle: '#fbbf24' },
    red: { primary: '#dc2626', glow: '#f87171', sparkle: '#fbbf24' },
    blue: { primary: '#2563eb', glow: '#60a5fa', sparkle: '#fbbf24' },
    green: { primary: '#16a34a', glow: '#4ade80', sparkle: '#fbbf24' },
    gold: { primary: '#ca8a04', glow: '#facc15', sparkle: '#fff7ed' },
    silver: { primary: '#64748b', glow: '#cbd5e1', sparkle: '#e0f2fe' },
    black: { primary: '#1f2937', glow: '#4b5563', sparkle: '#c084fc' },
    white: { primary: '#f3f4f6', glow: '#ffffff', sparkle: '#fbbf24' },
    pink: { primary: '#db2777', glow: '#f472b6', sparkle: '#fbbf24' },
    teal: { primary: '#0d9488', glow: '#2dd4bf', sparkle: '#fbbf24' },
  };

  const colors = colorMap[color] || colorMap.purple;

  return (
    <div className="relative">
      {/* Magical glow base */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl opacity-40"
        style={{ background: colors.glow }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <svg width="180" height="220" viewBox="0 0 180 220" className="relative z-10">
        {/* Shadow */}
        <ellipse cx="90" cy="200" rx="50" ry="12" fill="rgba(0,0,0,0.15)" />

        {/* Main egg with gradient */}
        <defs>
          <radialGradient id="eggGradient" cx="40%" cy="40%">
            <stop offset="0%" stopColor={colors.glow} stopOpacity="0.9" />
            <stop offset="70%" stopColor={colors.primary} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0.8" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Egg body */}
        <ellipse
          cx="90"
          cy="120"
          rx="65"
          ry="80"
          fill="url(#eggGradient)"
          stroke={colors.glow}
          strokeWidth="3"
          filter="url(#glow)"
        />

        {/* Mystical patterns */}
        <g opacity="0.6">
          <path
            d="M 90 60 Q 70 80, 90 100 Q 110 80, 90 60"
            fill="none"
            stroke={colors.sparkle}
            strokeWidth="2"
          >
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
          </path>
          <circle cx="90" cy="80" r="8" fill={colors.sparkle} opacity="0.5">
            <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Scale/crystal pattern */}
        <g opacity="0.4">
          {[0, 1, 2, 3, 4].map((row) =>
            [0, 1, 2, 3, 4].map((col) => (
              <circle
                key={`${row}-${col}`}
                cx={50 + col * 20}
                cy={70 + row * 20}
                r="5"
                fill={colors.glow}
              />
            ))
          )}
        </g>

        {/* Magical sparkles floating around */}
        {[0, 1, 2, 3, 4].map((i) => (
          <circle
            key={i}
            cx={40 + i * 25}
            cy={50 + (i % 2) * 120}
            r="2"
            fill={colors.sparkle}
          >
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur={`${2 + i * 0.5}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values={`${50 + (i % 2) * 120};${30 + (i % 2) * 120};${50 + (i % 2) * 120}`}
              dur={`${3 + i * 0.3}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Cracks that grow with XP */}
        <g opacity="0.7">
          <path
            d="M 90 50 L 95 65 L 92 75"
            stroke={colors.sparkle}
            strokeWidth="2"
            fill="none"
          >
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
          </path>
          <path
            d="M 95 65 L 110 70"
            stroke={colors.sparkle}
            strokeWidth="2"
            fill="none"
          >
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
          </path>
          <path
            d="M 60 110 L 70 120 L 65 135"
            stroke={colors.sparkle}
            strokeWidth="2"
            fill="none"
          >
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" begin="0.4s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Pulse effect */}
        <ellipse
          cx="90"
          cy="120"
          rx="63"
          ry="78"
          fill="none"
          stroke={colors.glow}
          strokeWidth="2"
          opacity="0.6"
        >
          <animate
            attributeName="opacity"
            values="0.3;0.7;0.3"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="rx"
            values="63;66;63"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="ry"
            values="78;81;78"
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
    if (value >= 70) return 'bg-green-500';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const needsAttention = dragon.hunger < 40 || dragon.happiness < 40;

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gradient-to-b from-purple-100 via-pink-50 to-orange-50 rounded-3xl overflow-hidden shadow-2xl">
      {/* Sky/Background with clouds */}
      <div className="absolute inset-0">
        {/* Animated clouds */}
        <motion.div
          className="absolute top-10 left-0 w-32 h-16 bg-white rounded-full opacity-30 blur-sm"
          animate={{ x: [-50, 400] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-20 right-0 w-40 h-20 bg-white rounded-full opacity-20 blur-sm"
          animate={{ x: [400, -50] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />

        {/* Sun/Moon */}
        <div className="absolute top-8 right-8 w-16 h-16 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full shadow-lg">
          <motion.div
            className="w-full h-full rounded-full"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Floor/Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-green-200 to-green-300 rounded-t-full">
        {/* Grass texture */}
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 w-1 bg-green-600"
              style={{
                height: `${10 + Math.random() * 20}px`,
                left: `${i * 5}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Room items */}
      <div className="absolute bottom-20 left-8 z-20">
        {/* Food bowl */}
        <motion.button
          onClick={onFeedClick}
          disabled={isFeeding}
          className="relative group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-20 h-14 bg-gradient-to-b from-pink-400 to-pink-500 rounded-t-full rounded-b-lg shadow-lg relative">
            <div className="absolute inset-2 bg-pink-300 rounded-t-full rounded-b-md" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">
              🍎
            </div>
          </div>
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Feed
          </div>
        </motion.button>
      </div>

      <div className="absolute bottom-20 right-8 z-20">
        {/* Toy box */}
        <motion.button
          onClick={onPlayClick}
          disabled={isPlaying}
          className="relative group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-20 h-16 bg-gradient-to-b from-purple-400 to-purple-600 rounded-lg shadow-lg relative border-4 border-purple-700">
            <div className="absolute inset-0 flex items-center justify-center text-3xl">
              🎾
            </div>
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-yellow-500 rounded-full" />
          </div>
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Play
          </div>
        </motion.button>
      </div>

      {/* Dragon/Egg in center */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {dragon.stage === 'egg' ? (
            <MagicalDragonEgg color={dragon.color} />
          ) : (
            <div className="text-8xl">🐉</div>
          )}
        </motion.div>
      </div>

      {/* Status bars at top - integrated into environment */}
      <div className="absolute top-6 left-6 right-6 z-30">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border-2 border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-800">{dragon.name}</h3>
            {needsAttention && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-2xl"
              >
                ⚠️
              </motion.div>
            )}
          </div>

          <div className="space-y-2">
            {/* Hunger */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">🍎 Hunger</span>
                <span>{dragon.hunger}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full ${getStatColor(dragon.hunger)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${dragon.hunger}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Happiness */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">😊 Happiness</span>
                <span>{dragon.happiness}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full ${getStatColor(dragon.happiness)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${dragon.happiness}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Health */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">❤️ Health</span>
                <span>{dragon.health}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full ${getStatColor(dragon.health)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${dragon.health}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* XP bar at bottom - integrated */}
      <div className="absolute bottom-6 left-6 right-6 z-30">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3 shadow-lg border-2 border-purple-200">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">⭐ Experience</span>
            <span>{dragon.experience} XP</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div
              className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (dragon.experience / 100) * 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {dragon.experience < 100 ? `${100 - dragon.experience} XP until hatching!` : 'Ready to hatch! 🎉'}
          </p>
        </div>
      </div>

      {/* Floating hearts if happy */}
      {dragon.happiness >= 80 && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute text-2xl"
              style={{
                left: `${30 + i * 20}%`,
                bottom: '40%',
              }}
              animate={{
                y: [0, -100],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
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
