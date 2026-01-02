import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Send, Check } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';

const moods = [
  {
    id: 'energized',
    label: 'Energized & Full',
    description: 'Feeling great with plenty to give',
    capacity: 95,
    color: 'from-emerald-400 to-green-500',
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
    borderColor: 'border-gray-500',
    icon: '🌫️',
    category: 'low'
  },
];

const needs = [
  { id: 'comfort', label: 'I want comfort' },
  { id: 'distraction', label: 'I want distraction' },
  { id: 'encouragement', label: 'I want encouragement' },
  { id: 'space', label: 'I want space' },
  { id: 'no_talk', label: "I don't want to talk about it" },
  { id: 'open_to_talk', label: "I'm open to talking" },
  { id: 'check_in', label: 'Just check in on me' },
  { id: 'be_close', label: 'Be physically close' },
  { id: 'be_present_virtual', label: 'Be present virtually' },
];

interface CapacityCheckInProps {
  onComplete?: () => void;
  onBack?: () => void;
}

export default function CapacityCheckIn({ onComplete, onBack }: CapacityCheckInProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [step, setStep] = useState<'mood' | 'needs' | 'context'>('mood');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [context, setContext] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleNeed = (needId: string) => {
    setSelectedNeeds(prev =>
      prev.includes(needId)
        ? prev.filter(id => id !== needId)
        : [...prev, needId]
    );
  };

  const handleSubmit = async () => {
    if (!user?.id || !relationship?.id || !selectedMood) return;

    setSubmitting(true);
    try {
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
                Shared ✨
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Your partner will be notified about how you're feeling today.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const renderMoodStep = () => {
    const [currentMoodIndex, setCurrentMoodIndex] = React.useState(0);
    const [holdProgress, setHoldProgress] = React.useState(0);
    const [isHolding, setIsHolding] = React.useState(false);
    const holdTimerRef = React.useRef<number | null>(null);
    const progressIntervalRef = React.useRef<number | null>(null);

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
        setSelectedMood(currentMood.id);
        setIsHolding(false);
        // Automatically advance to next step
        setTimeout(() => setStep('needs'), 300);
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

    // Convert Tailwind gradient to CSS gradient
    const getGradientStyle = (colorClass: string) => {
      const colors = colorClass.match(/([\w-]+)-(\d+)/g) || [];
      if (colors.length >= 2) {
        const fromColor = colors[0];
        const toColor = colors[1];
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
      <div
        className="fixed inset-0 flex flex-col items-center justify-between py-12 overflow-hidden z-50"
        style={{ background: getGradientStyle(currentMood.color) }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-6"
        >
          <h1 className="text-3xl font-bold text-white mb-2">How are you feeling?</h1>
          <p className="text-white/80">Swipe to browse • Hold to select</p>
        </motion.div>

        <div className="relative w-full flex-1 flex items-center justify-center px-4">
          <motion.div
            key={currentMoodIndex}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-sm"
          >
            <motion.div
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              onTouchCancel={cancelHold}
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              whileTap={{ scale: 0.98 }}
              className="relative w-full h-[70vh] max-h-[600px] rounded-[3rem] shadow-2xl overflow-hidden cursor-pointer touch-none bg-white/10 backdrop-blur-sm border-2 border-white/20"
            >
              {/* Hold Progress Overlay */}
              {isHolding && (
                <motion.div
                  className="absolute inset-0 bg-white/30 backdrop-blur-sm"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.5 }}
                  style={{
                    clipPath: `circle(${holdProgress}% at 50% 50%)`,
                  }}
                />
              )}

              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  {/* Icon */}
                  <div className="text-7xl mb-6">
                    {currentMood.icon}
                  </div>

                  {/* Mood Name */}
                  <h1 className="text-white mb-3 text-4xl font-bold">
                    {currentMood.label}
                  </h1>

                  {/* Description */}
                  <p className="text-white/90 text-xl mb-8">
                    {currentMood.description}
                  </p>

                  {/* Capacity Indicator */}
                  <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-48 h-3 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all rounded-full"
                        style={{ width: `${currentMood.capacity}%` }}
                      />
                    </div>
                    <span className="text-white font-semibold text-lg">{currentMood.capacity}%</span>
                  </div>
                </motion.div>

                {/* Hold Progress Circle */}
                {isHolding && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-40 h-40 relative"
                  >
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="rgba(255, 255, 255, 0.3)"
                        strokeWidth="10"
                        fill="none"
                      />
                      <motion.circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="white"
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * holdProgress) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">{Math.round(holdProgress)}%</span>
                    </div>
                  </motion.div>
                )}

                {!isHolding && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-full border-4 border-white/50 flex items-center justify-center mb-4 mx-auto">
                      <div className="w-12 h-12 rounded-full bg-white/30" />
                    </div>
                    <p className="text-white/90 text-lg font-medium">
                      Hold to select
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Mood Indicators */}
        <div className="flex gap-2 px-6">
          {moods.map((mood, index) => (
            <div
              key={mood.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentMoodIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'
              }`}
            />
          ))}
        </div>
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
          What do you need right now?
        </h2>
        <p className="text-gray-600 text-sm">
          Select all that apply
        </p>
      </div>

      <div className="space-y-3">
        {needs.map((need) => (
          <motion.button
            key={need.id}
            onClick={() => toggleNeed(need.id)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full"
          >
            <Card className={`cursor-pointer transition-all ${
              selectedNeeds.includes(need.id)
                ? 'ring-2 ring-purple-400 bg-purple-50'
                : 'hover:shadow-md'
            }`}>
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-gray-900 font-medium">{need.label}</span>
                {selectedNeeds.includes(need.id) && (
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => setStep('mood')}
          variant="outline"
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={() => setStep('context')}
          disabled={selectedNeeds.length === 0}
          className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500"
        >
          Continue
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
          onClick={() => setStep('needs')}
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
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['mood', 'needs', 'context'].map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step
                  ? 'w-12 bg-gradient-to-r from-purple-500 to-violet-500'
                  : ['mood', 'needs'].indexOf(s) < ['mood', 'needs', 'context'].indexOf(step)
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
          {step === 'context' && renderContextStep()}
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="mt-6 w-full text-center text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
