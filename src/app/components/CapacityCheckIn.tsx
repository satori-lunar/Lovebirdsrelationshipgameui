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

  const renderMoodStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          My Capacity Today
        </h2>
        <p className="text-gray-600">
          Choose what best describes how you're feeling
        </p>
      </div>

      <div className="space-y-3">
        {moods.map((mood) => (
          <motion.button
            key={mood.id}
            onClick={() => setSelectedMood(mood.id)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full text-left"
          >
            <Card className={`cursor-pointer transition-all border-2 ${
              selectedMood === mood.id
                ? `${mood.borderColor} ring-4 ring-opacity-20 shadow-xl bg-gradient-to-r ${mood.color} bg-opacity-5`
                : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon Section */}
                  <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${mood.color} flex items-center justify-center shadow-md`}>
                    <span className="text-2xl">{mood.icon}</span>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900 text-base">
                        {mood.label}
                      </h3>
                      <span className="text-xs font-medium text-gray-500 ml-2">
                        {mood.capacity}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {mood.description}
                    </p>

                    {/* Capacity Bar */}
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${mood.color} transition-all`}
                        style={{ width: `${mood.capacity}%` }}
                      />
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {selectedMood === mood.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex-shrink-0"
                    >
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${mood.color} flex items-center justify-center`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.button>
        ))}
      </div>

      <Button
        onClick={() => setStep('needs')}
        disabled={!selectedMood}
        className="w-full h-14 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white rounded-xl text-lg font-semibold shadow-lg"
      >
        Continue
      </Button>
    </div>
  );

  const renderNeedsStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">
          {moods.find(m => m.id === selectedMood)?.emoji}
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
          {moods.find(m => m.id === selectedMood)?.emoji}
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
