import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Send, Check, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { NEED_CATEGORIES, NeedCategory, Urgency } from '../types/needs';
import { needsService } from '../services/needsService';

const moods = [
  {
    id: 'energized',
    label: 'Energized & Full',
    description: 'Feeling great with plenty to give',
    capacity: 95,
    color: 'from-emerald-400 to-green-500',
    bgGradient: 'from-emerald-500 via-green-500 to-teal-500',
    glowColor: 'rgba(52, 211, 153, 0.5)',
    borderColor: 'border-emerald-400',
    icon: '⚡',
    category: 'high'
  },
  {
    id: 'good',
    label: 'Good & Steady',
    description: 'Balanced and feeling positive',
    capacity: 80,
    color: 'from-blue-400 to-cyan-500',
    bgGradient: 'from-blue-500 via-cyan-500 to-sky-500',
    glowColor: 'rgba(96, 165, 250, 0.5)',
    borderColor: 'border-blue-400',
    icon: '☀️',
    category: 'high'
  },
  {
    id: 'okay',
    label: 'Okay, Managing',
    description: 'Doing alright, coasting along',
    capacity: 60,
    color: 'from-indigo-400 to-purple-500',
    bgGradient: 'from-indigo-500 via-purple-500 to-violet-500',
    glowColor: 'rgba(129, 140, 248, 0.5)',
    borderColor: 'border-indigo-400',
    icon: '🌤️',
    category: 'medium'
  },
  {
    id: 'stretched',
    label: 'Stretched Thin',
    description: 'Running on limited energy',
    capacity: 40,
    color: 'from-amber-400 to-orange-500',
    bgGradient: 'from-amber-500 via-orange-500 to-yellow-500',
    glowColor: 'rgba(251, 191, 36, 0.5)',
    borderColor: 'border-amber-400',
    icon: '⚠️',
    category: 'medium'
  },
  {
    id: 'low',
    label: 'Low & Tired',
    description: 'Energy depleted, need rest',
    capacity: 25,
    color: 'from-slate-400 to-gray-500',
    bgGradient: 'from-slate-500 via-gray-500 to-zinc-500',
    glowColor: 'rgba(148, 163, 184, 0.5)',
    borderColor: 'border-slate-400',
    icon: '🌧️',
    category: 'low'
  },
  {
    id: 'overwhelmed',
    label: 'Overwhelmed',
    description: 'Everything feels like too much',
    capacity: 15,
    color: 'from-red-400 to-rose-500',
    bgGradient: 'from-red-500 via-rose-500 to-pink-500',
    glowColor: 'rgba(248, 113, 113, 0.5)',
    borderColor: 'border-red-400',
    icon: '🌊',
    category: 'low'
  },
  {
    id: 'struggling',
    label: 'Really Struggling',
    description: 'Having a very hard time today',
    capacity: 10,
    color: 'from-purple-500 to-violet-600',
    bgGradient: 'from-purple-600 via-violet-600 to-fuchsia-600',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    borderColor: 'border-purple-500',
    icon: '⛈️',
    category: 'low'
  },
  {
    id: 'numb',
    label: 'Numb & Disconnected',
    description: 'Feeling emotionally flat or distant',
    capacity: 5,
    color: 'from-gray-500 to-slate-600',
    bgGradient: 'from-gray-600 via-slate-600 to-stone-600',
    glowColor: 'rgba(107, 114, 128, 0.5)',
    borderColor: 'border-gray-500',
    icon: '🌫️',
    category: 'low'
  },
];

// Using detailed need categories from the "What Feels Missing?" system
const needs = NEED_CATEGORIES.filter(c => c.category !== 'other'); // Exclude 'other' for now

interface CapacityCheckInProps {
  onComplete?: () => void;
  onBack?: () => void;
}

export default function CapacityCheckIn({ onComplete, onBack }: CapacityCheckInProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [step, setStep] = useState<'mood' | 'needs' | 'urgency' | 'context'>('mood');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedNeeds, setSelectedNeeds] = useState<NeedCategory[]>([]);
  const [urgency, setUrgency] = useState<Urgency>('would_help');
  const [context, setContext] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Mood selection state (moved from renderMoodStep)
  const [currentMoodIndex, setCurrentMoodIndex] = React.useState(0);
  const [holdProgress, setHoldProgress] = React.useState(0);
  const [isHolding, setIsHolding] = React.useState(false);
  const holdTimerRef = React.useRef<number | null>(null);
  const progressIntervalRef = React.useRef<number | null>(null);

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const toggleNeed = (needCategory: NeedCategory) => {
    setSelectedNeeds(prev =>
      prev.includes(needCategory)
        ? prev.filter(id => id !== needCategory)
        : [...prev, needCategory]
    );
  };

  const handleSubmit = async () => {
    if (!user?.id || !relationship?.id || !selectedMood) return;

    setSubmitting(true);
    try {
      // Save capacity check-in
      const { error } = await api.supabase
        .from('capacity_checkins')
        .insert({
          user_id: user.id,
          couple_id: relationship.id,
          mood: selectedMood,
          needs: selectedNeeds,
          context: context.trim() || null,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // If needs were selected, also submit them through the needs service
      if (selectedNeeds.length > 0) {
        for (const needCategory of selectedNeeds) {
          await needsService.submitNeed({
            coupleId: relationship.id,
            requesterId: user.id,
            needCategory,
            context: context.trim() || undefined,
            urgency
          });
        }
      }

      setSubmitted(true);
      if (onComplete) {
        setTimeout(() => onComplete(), 1500);
      }
    } catch (error) {
      console.error('Error saving capacity check-in:', error);
      alert(`Error saving check-in: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Set capacity and move to needs step - capacity will be saved when user completes
  const handleCapacitySelected = (moodId: string) => {
    setSelectedMood(moodId);
    setStep('needs');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full"
        >
          <Card className="bg-white shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Capacity Shared ✨
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Your partner knows how you're feeling. Now let's see if there's anything you need...
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const renderMoodStep = () => {
    const currentMood = moods[currentMoodIndex];

    const handleDragEnd = (event: any, info: any) => {
      const threshold = 50;
      if (info.offset.x > threshold && currentMoodIndex > 0) {
        setCurrentMoodIndex(currentMoodIndex - 1);
      } else if (info.offset.x < -threshold && currentMoodIndex < moods.length - 1) {
        setCurrentMoodIndex(currentMoodIndex + 1);
      }
    };

    const startHold = () => {
      setIsHolding(true);
      const startTime = Date.now();
      const holdDuration = 1500; // 1.5 seconds

      progressIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / holdDuration) * 100, 100);
        setHoldProgress(progress);
      }, 16);

      holdTimerRef.current = window.setTimeout(() => {
        setHoldProgress(100);
        setIsHolding(false);
        // Capacity selected - move to needs step
        setTimeout(() => {
          handleCapacitySelected(currentMood.id);
        }, 300);
      }, holdDuration);
    };

    const cancelHold = () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setIsHolding(false);
      setHoldProgress(0);
    };

    // Convert Tailwind gradient to CSS gradient
    const getGradientStyle = (colorClass: string) => {
      const matches = colorClass.match(/from-([\w-]+)-(\d+)/);
      const matches2 = colorClass.match(/to-([\w-]+)-(\d+)/);
      if (matches && matches2) {
        const fromColor = `${matches[1]}-${matches[2]}`;
        const toColor = `${matches2[1]}-${matches2[2]}`;
        const colorMap: Record<string, string> = {
          'emerald-400': '#34d399',
          'green-500': '#22c55e',
          'blue-400': '#60a5fa',
          'cyan-500': '#06b6d4',
          'indigo-400': '#818cf8',
          'purple-500': '#a855f7',
          'amber-400': '#fbbf24',
          'orange-500': '#f97316',
          'slate-400': '#94a3b8',
          'gray-500': '#6b7280',
          'red-400': '#f87171',
          'rose-500': '#f43f5e',
          'violet-600': '#7c3aed',
          'slate-600': '#475569',
        };
        return `linear-gradient(135deg, ${colorMap[fromColor] || '#6366f1'} 0%, ${colorMap[toColor] || '#8b5cf6'} 100%)`;
      }
      return 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
    };

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-between py-12 overflow-hidden z-50">
        {/* Animated Background Gradient */}
        <motion.div
          key={currentMoodIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className={`absolute inset-0 bg-gradient-to-br ${currentMood.bgGradient}`}
        />

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight
              }}
              animate={{
                y: [null, Math.random() * -100 - 50],
                x: [null, Math.random() * 40 - 20],
                opacity: [0.2, 0.5, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="relative z-10 text-center px-6"
        >
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">How are you feeling?</h1>
          <p className="text-white/90 drop-shadow-md">Swipe to browse • Hold to select</p>
        </motion.div>

        {/* Card Container */}
        <div className="relative w-full flex-1 flex items-center justify-center px-4 z-10">
          <motion.div
            key={currentMoodIndex}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-sm"
          >
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                filter: `drop-shadow(0 20px 60px ${currentMood.glowColor})`
              }}
            >
              <motion.div
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                onTouchCancel={cancelHold}
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative w-full h-[70vh] max-h-[600px] rounded-[3rem] overflow-hidden cursor-pointer touch-none"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </div>

                {/* Hold Progress Overlay */}
                {isHolding && (
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
                      backdropFilter: 'blur(10px)',
                      clipPath: `circle(${holdProgress}% at 50% 50%)`,
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1.2 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                )}

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                    className="text-center"
                  >
                    {/* Icon with Pulse */}
                    <motion.div
                      className="text-7xl mb-4"
                      animate={{
                        scale: isHolding ? [1, 1.1, 1] : 1,
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: isHolding ? Infinity : 0,
                      }}
                    >
                      {currentMood.icon}
                    </motion.div>

                    {/* Mood Name */}
                    <motion.h1
                      className="text-white mb-2 text-4xl font-bold drop-shadow-lg"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      {currentMood.label}
                    </motion.h1>

                    {/* Description */}
                    <motion.p
                      className="text-white/95 text-lg mb-5 drop-shadow-md px-4"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                      {currentMood.description}
                    </motion.p>

                    {/* Capacity Indicator */}
                    <motion.div
                      className="flex items-center justify-center gap-3 mb-5"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4, type: "spring" }}
                    >
                      <div className="w-40 h-3 bg-white/25 rounded-full overflow-hidden backdrop-blur-sm border border-white/30">
                        <motion.div
                          className="h-full bg-gradient-to-r from-white via-white/90 to-white rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${currentMood.capacity}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                        />
                      </div>
                      <span className="text-white font-bold text-lg drop-shadow-md">{currentMood.capacity}%</span>
                    </motion.div>
                  </motion.div>

                  {/* Hold Progress Circle */}
                  {isHolding && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="w-36 h-36 relative mt-2"
                    >
                      {/* Glow */}
                      <div
                        className="absolute inset-0 rounded-full blur-xl opacity-60"
                        style={{ background: currentMood.glowColor }}
                      />
                      <svg className="w-full h-full -rotate-90 relative">
                        <circle
                          cx="72"
                          cy="72"
                          r="62"
                          stroke="rgba(255, 255, 255, 0.2)"
                          strokeWidth="10"
                          fill="none"
                        />
                        <motion.circle
                          cx="72"
                          cy="72"
                          r="62"
                          stroke="white"
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray={389}
                          strokeDashoffset={389 - (389 * holdProgress) / 100}
                          strokeLinecap="round"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8))' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.span
                          className="text-white text-2xl font-bold drop-shadow-lg"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          {Math.round(holdProgress)}%
                        </motion.span>
                      </div>
                    </motion.div>
                  )}

                  {/* Hold Prompt */}
                  {!isHolding && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-center mt-2"
                    >
                      <motion.div
                        className="w-20 h-20 rounded-full border-4 border-white/60 flex items-center justify-center mb-3 mx-auto backdrop-blur-sm"
                        animate={{
                          scale: [1, 1.05, 1],
                          borderColor: ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)'],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="w-12 h-12 rounded-full bg-white/40" />
                      </motion.div>
                      <p className="text-white/95 text-lg font-semibold drop-shadow-md">
                        Hold to select
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Mood Indicators */}
        <motion.div
          className="flex gap-2.5 px-6 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {moods.map((mood, index) => (
            <motion.div
              key={mood.id}
              className={`h-2.5 rounded-full transition-all duration-500 ${
                index === currentMoodIndex
                  ? 'w-10 bg-white shadow-lg'
                  : 'w-2.5 bg-white/50'
              }`}
              whileHover={{ scale: 1.2 }}
              animate={{
                scale: index === currentMoodIndex ? 1 : 1,
              }}
            />
          ))}
        </motion.div>
      </div>
    );
  };

  const renderNeedsStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">
          {moods.find(m => m.id === selectedMood)?.icon}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What feels missing right now?
        </h2>
        <p className="text-gray-600 text-sm">
          Optional • Select all that apply
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {needs.map((need) => (
          <motion.button
            key={need.category}
            onClick={() => toggleNeed(need.category)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full"
          >
            <Card className={`cursor-pointer transition-all ${
              selectedNeeds.includes(need.category)
                ? 'ring-2 ring-purple-400 bg-purple-50'
                : 'hover:shadow-md'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{need.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900 font-medium">{need.label}</span>
                      {selectedNeeds.includes(need.category) && (
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{need.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          variant="outline"
          className="flex-1"
        >
          Skip & Finish
        </Button>
        <Button
          onClick={() => setStep('urgency')}
          disabled={selectedNeeds.length === 0}
          className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500"
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderUrgencyStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">
          {moods.find(m => m.id === selectedMood)?.icon}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          How urgent is this?
        </h2>
        <p className="text-gray-600 text-sm">
          Help your partner understand the priority
        </p>
      </div>

      <div className="space-y-3">
        {[
          { value: 'not_urgent', label: 'Not Urgent', desc: 'Can wait, no rush', color: 'blue' },
          { value: 'would_help', label: 'Would Help', desc: 'Would improve things', color: 'yellow' },
          { value: 'important', label: 'Important', desc: 'Needs attention soon', color: 'red' }
        ].map((option) => (
          <motion.button
            key={option.value}
            onClick={() => setUrgency(option.value as Urgency)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              urgency === option.value
                ? option.color === 'blue'
                  ? 'border-blue-500 bg-blue-50'
                  : option.color === 'yellow'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold text-gray-900">{option.label}</div>
            <div className="text-sm text-gray-500">{option.desc}</div>
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => setStep('needs')}
          variant="outline"
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={() => setStep('context')}
          className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500"
        >
          Add Context
        </Button>
      </div>
    </div>
  );

  const renderContextStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">
          {moods.find(m => m.id === selectedMood)?.icon}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Anything you want them to know?
        </h2>
        <p className="text-gray-600 text-sm">
          Optional • Keep it brief (140 characters)
        </p>
      </div>

      <Textarea
        value={context}
        onChange={(e) => setContext(e.target.value.slice(0, 140))}
        placeholder="No pressure to explain everything..."
        rows={4}
        className="resize-none"
      />
      <p className="text-xs text-right text-gray-500">
        {context.length}/140
      </p>

      <div className="flex gap-3">
        <Button
          onClick={() => setStep('urgency')}
          variant="outline"
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
        >
          {submitting ? 'Sharing...' : 'Share with Partner'}
          <Send className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full text-sm text-gray-500 hover:text-gray-700"
      >
        Skip and share
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
        )}

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['mood', 'needs', 'urgency', 'context'].map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step
                  ? 'w-12 bg-gradient-to-r from-purple-500 to-violet-500'
                  : ['mood', 'needs', 'urgency'].indexOf(s) < ['mood', 'needs', 'urgency', 'context'].indexOf(step)
                  ? 'w-8 bg-purple-300'
                  : 'w-8 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {step === 'mood' && renderMoodStep()}
          {step === 'needs' && renderNeedsStep()}
          {step === 'urgency' && renderUrgencyStep()}
          {step === 'context' && renderContextStep()}
        </div>
      </div>
    </div>
  );
}
