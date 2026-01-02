/**
 * Partner Profile Form (for Solo Mode)
 *
 * When User A is in solo mode, they can fill out what they THINK
 * about their partner's preferences. When User B joins, they'll see
 * what User A said and can confirm/correct.
 *
 * Creates a great relationship insight: "How well do you know each other?"
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  MessageCircle,
  Brain,
  Sparkles,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Send,
  Users
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import type {
  LoveLanguage,
  CommunicationStyle,
  FrequencyPreference,
  StressNeed,
  CheckinTime
} from '../types/partnerProfile';
import { api } from '../services/api';

interface PartnerProfileFormProps {
  userId: string;
  coupleId: string;
  partnerName: string;
  onComplete: () => void;
}

type Step =
  | 'intro'
  | 'love_language_primary'
  | 'love_language_secondary'
  | 'communication_style'
  | 'stress_needs'
  | 'hobbies'
  | 'likes_dislikes'
  | 'review';

const LOVE_LANGUAGES: { value: LoveLanguage; label: string; description: string; icon: string }[] = [
  {
    value: 'words',
    label: 'Words of Affirmation',
    description: 'Compliments, "I love you", verbal encouragement',
    icon: '💬'
  },
  {
    value: 'quality_time',
    label: 'Quality Time',
    description: 'Undivided attention, meaningful conversations',
    icon: '⏰'
  },
  {
    value: 'gifts',
    label: 'Receiving Gifts',
    description: 'Thoughtful presents, visual symbols of love',
    icon: '🎁'
  },
  {
    value: 'acts',
    label: 'Acts of Service',
    description: 'Doing things to help, actions over words',
    icon: '✨'
  },
  {
    value: 'touch',
    label: 'Physical Touch',
    description: 'Hugs, hand-holding, physical closeness',
    icon: '🤗'
  }
];

const COMMUNICATION_STYLES: { value: CommunicationStyle; label: string; description: string }[] = [
  {
    value: 'direct',
    label: 'Direct',
    description: 'Clear and straightforward communication'
  },
  {
    value: 'gentle',
    label: 'Gentle',
    description: 'Soft and considerate approach'
  },
  {
    value: 'playful',
    label: 'Playful',
    description: 'Light and fun communication'
  },
  {
    value: 'reserved',
    label: 'Reserved',
    description: 'Brief and understated'
  }
];

const STRESS_NEEDS_OPTIONS: { value: StressNeed; label: string; description: string; icon: string }[] = [
  {
    value: 'space',
    label: 'Space',
    description: 'Time alone to process',
    icon: '🌙'
  },
  {
    value: 'reassurance',
    label: 'Reassurance',
    description: 'Affirmation that things are okay',
    icon: '🤗'
  },
  {
    value: 'distraction',
    label: 'Distraction',
    description: 'Help think about something else',
    icon: '🎮'
  },
  {
    value: 'practical_help',
    label: 'Practical Help',
    description: 'Do something concrete to help',
    icon: '🛠️'
  }
];

export function PartnerProfileForm({
  userId,
  coupleId,
  partnerName,
  onComplete
}: PartnerProfileFormProps) {
  const [step, setStep] = useState<Step>('intro');
  const [saving, setSaving] = useState(false);

  // Form state (what User A thinks about User B)
  const [loveLanguagePrimary, setLoveLanguagePrimary] = useState<LoveLanguage | null>(null);
  const [loveLanguageSecondary, setLoveLanguageSecondary] = useState<LoveLanguage | null>(null);
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyle | null>(null);
  const [stressNeeds, setStressNeeds] = useState<StressNeed[]>([]);
  const [hobbies, setHobbies] = useState('');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');

  const handleNext = () => {
    const stepOrder: Step[] = [
      'intro',
      'love_language_primary',
      'love_language_secondary',
      'communication_style',
      'stress_needs',
      'hobbies',
      'likes_dislikes',
      'review'
    ];

    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex < stepOrder.length - 1) {
      setStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: Step[] = [
      'intro',
      'love_language_primary',
      'love_language_secondary',
      'communication_style',
      'stress_needs',
      'hobbies',
      'likes_dislikes',
      'review'
    ];

    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!loveLanguagePrimary || !communicationStyle) return;

    setSaving(true);
    try {
      // Store as a "partner profile guess" - when partner joins, they'll see this
      await api.supabase
        .from('partner_profile_guesses')
        .insert({
          couple_id: coupleId,
          guesser_id: userId,
          love_language_primary: loveLanguagePrimary,
          love_language_secondary: loveLanguageSecondary,
          communication_style: communicationStyle,
          stress_needs: stressNeeds,
          hobbies: hobbies.trim(),
          likes: likes.trim(),
          dislikes: dislikes.trim(),
          created_at: new Date().toISOString()
        });

      onComplete();
    } catch (error) {
      console.error('Failed to save partner profile form:', error);
      setSaving(false);
    }
  };

  const toggleStressNeed = (need: StressNeed) => {
    if (stressNeeds.includes(need)) {
      setStressNeeds(stressNeeds.filter(n => n !== need));
    } else {
      setStressNeeds([...stressNeeds, need]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ opacity: 0.1 }}
            animate={{
              y: [-20, 20, -20],
              rotate: [0, 10, -10, 0]
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5
            }}
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`
            }}
          >
            <Heart className="w-8 h-8 text-rose-200" fill="currentColor" />
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Intro */}
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.8 }}
                  className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-violet-500 rounded-3xl flex items-center justify-center shadow-2xl"
                >
                  <Users className="w-12 h-12 text-white" />
                </motion.div>

                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Tell us about {partnerName}
                </h1>
                <p className="text-lg text-gray-600 mb-2">
                  Share what you know about how they feel loved
                </p>
                <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
                  When {partnerName} joins, they'll see what you said and can confirm or correct.
                  This helps you see how well you know each other!
                </p>

                <Card className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 shadow-xl mb-8">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 text-left">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          How well do you know {partnerName}?
                        </h3>
                        <p className="text-sm text-gray-600">
                          Answer based on what you think. When they join, you'll discover
                          how accurate you were. It's a fun way to learn more about each other!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleNext}
                  className="px-8 py-6 text-lg bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white rounded-2xl shadow-lg shadow-purple-200"
                >
                  Start
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Love Language Primary */}
            {step === 'love_language_primary' && (
              <motion.div
                key="love_language_primary"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {partnerName}'s Primary Love Language
                  </h2>
                  <p className="text-gray-600">
                    How do you think {partnerName} most feels loved?
                  </p>
                </div>

                <div className="grid gap-4 mb-8">
                  {LOVE_LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setLoveLanguagePrimary(lang.value)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        loveLanguagePrimary === lang.value
                          ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200'
                          : 'border-gray-200 hover:border-purple-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{lang.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {lang.label}
                          </h3>
                          <p className="text-sm text-gray-600">{lang.description}</p>
                        </div>
                        {loveLanguagePrimary === lang.value && (
                          <CheckCircle className="w-6 h-6 text-purple-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 py-6 rounded-xl"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!loveLanguagePrimary}
                    className="flex-1 py-6 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Love Language Secondary */}
            {step === 'love_language_secondary' && (
              <motion.div
                key="love_language_secondary"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Secondary Love Language
                  </h2>
                  <p className="text-gray-600">
                    What's their second way of feeling loved? (Optional)
                  </p>
                </div>

                <div className="grid gap-4 mb-8">
                  {LOVE_LANGUAGES.filter(l => l.value !== loveLanguagePrimary).map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setLoveLanguageSecondary(lang.value)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        loveLanguageSecondary === lang.value
                          ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200'
                          : 'border-gray-200 hover:border-purple-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{lang.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {lang.label}
                          </h3>
                          <p className="text-sm text-gray-600">{lang.description}</p>
                        </div>
                        {loveLanguageSecondary === lang.value && (
                          <CheckCircle className="w-6 h-6 text-purple-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 py-6 rounded-xl"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 py-6 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl"
                  >
                    {loveLanguageSecondary ? 'Next' : 'Skip'}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Communication Style */}
            {step === 'communication_style' && (
              <motion.div
                key="communication_style"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {partnerName}'s Communication Style
                  </h2>
                  <p className="text-gray-600">
                    How do you think they prefer to communicate?
                  </p>
                </div>

                <div className="grid gap-4 mb-8">
                  {COMMUNICATION_STYLES.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setCommunicationStyle(style.value)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        communicationStyle === style.value
                          ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200'
                          : 'border-gray-200 hover:border-purple-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <MessageCircle className={`w-8 h-8 ${
                          communicationStyle === style.value ? 'text-purple-500' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {style.label}
                          </h3>
                          <p className="text-sm text-gray-600">{style.description}</p>
                        </div>
                        {communicationStyle === style.value && (
                          <CheckCircle className="w-6 h-6 text-purple-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 py-6 rounded-xl"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!communicationStyle}
                    className="flex-1 py-6 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Stress Needs */}
            {step === 'stress_needs' && (
              <motion.div
                key="stress_needs"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    When {partnerName} is Stressed
                  </h2>
                  <p className="text-gray-600">
                    What do you think they need? (Select all that apply)
                  </p>
                </div>

                <div className="grid gap-4 mb-8">
                  {STRESS_NEEDS_OPTIONS.map((need) => (
                    <button
                      key={need.value}
                      onClick={() => toggleStressNeed(need.value)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        stressNeeds.includes(need.value)
                          ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200'
                          : 'border-gray-200 hover:border-purple-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{need.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {need.label}
                          </h3>
                          <p className="text-sm text-gray-600">{need.description}</p>
                        </div>
                        {stressNeeds.includes(need.value) && (
                          <CheckCircle className="w-6 h-6 text-purple-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 py-6 rounded-xl"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 py-6 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Hobbies */}
            {step === 'hobbies' && (
              <motion.div
                key="hobbies"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {partnerName}'s Hobbies & Interests
                  </h2>
                  <p className="text-gray-600">
                    What do they enjoy doing?
                  </p>
                </div>

                <Card className="bg-white shadow-xl mb-8">
                  <CardContent className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hobbies, interests, activities they love
                    </label>
                    <textarea
                      value={hobbies}
                      onChange={(e) => setHobbies(e.target.value)}
                      placeholder="E.g., Reading sci-fi, hiking, playing guitar, cooking Italian food..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </CardContent>
                </Card>

                <div className="flex gap-4">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 py-6 rounded-xl"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 py-6 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Likes & Dislikes */}
            {step === 'likes_dislikes' && (
              <motion.div
                key="likes_dislikes"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Likes & Dislikes
                  </h2>
                  <p className="text-gray-600">
                    Help us understand {partnerName} better
                  </p>
                </div>

                <div className="space-y-6 mb-8">
                  <Card className="bg-white shadow-xl">
                    <CardContent className="p-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Things {partnerName} loves
                      </label>
                      <textarea
                        value={likes}
                        onChange={(e) => setLikes(e.target.value)}
                        placeholder="E.g., Surprises, deep conversations, spontaneous adventures..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-white shadow-xl">
                    <CardContent className="p-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Things {partnerName} dislikes
                      </label>
                      <textarea
                        value={dislikes}
                        onChange={(e) => setDislikes(e.target.value)}
                        placeholder="E.g., Being late, loud places, spicy food..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 py-6 rounded-xl"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 py-6 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl"
                  >
                    Review
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Review */}
            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Review & Send
                  </h2>
                  <p className="text-gray-600">
                    When {partnerName} joins, they'll see this and can confirm or correct
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <Card className="bg-white shadow-lg">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-gray-900 mb-2">Primary Love Language</h3>
                      <p className="text-gray-600">
                        {LOVE_LANGUAGES.find(l => l.value === loveLanguagePrimary)?.label}
                      </p>
                    </CardContent>
                  </Card>

                  {loveLanguageSecondary && (
                    <Card className="bg-white shadow-lg">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-gray-900 mb-2">Secondary Love Language</h3>
                        <p className="text-gray-600">
                          {LOVE_LANGUAGES.find(l => l.value === loveLanguageSecondary)?.label}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="bg-white shadow-lg">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-gray-900 mb-2">Communication Style</h3>
                      <p className="text-gray-600">
                        {COMMUNICATION_STYLES.find(s => s.value === communicationStyle)?.label}
                      </p>
                    </CardContent>
                  </Card>

                  {stressNeeds.length > 0 && (
                    <Card className="bg-white shadow-lg">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-gray-900 mb-2">Stress Needs</h3>
                        <p className="text-gray-600">
                          {stressNeeds.map(n => STRESS_NEEDS_OPTIONS.find(o => o.value === n)?.label).join(', ')}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {hobbies.trim() && (
                    <Card className="bg-white shadow-lg">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-gray-900 mb-2">Hobbies</h3>
                        <p className="text-gray-600">{hobbies}</p>
                      </CardContent>
                    </Card>
                  )}

                  {likes.trim() && (
                    <Card className="bg-white shadow-lg">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-gray-900 mb-2">Likes</h3>
                        <p className="text-gray-600">{likes}</p>
                      </CardContent>
                    </Card>
                  )}

                  {dislikes.trim() && (
                    <Card className="bg-white shadow-lg">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-gray-900 mb-2">Dislikes</h3>
                        <p className="text-gray-600">{dislikes}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 py-6 rounded-xl"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex-1 py-6 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl"
                  >
                    {saving ? 'Saving...' : 'Send to ' + partnerName}
                    <Send className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Indicator */}
          {step !== 'intro' && step !== 'review' && (
            <div className="mt-8">
              <div className="flex items-center justify-center gap-2">
                {['love_language_primary', 'love_language_secondary', 'communication_style', 'stress_needs', 'hobbies', 'likes_dislikes'].map((s, i) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all ${
                      s === step ? 'w-8 bg-purple-500' :
                      ['love_language_primary', 'love_language_secondary', 'communication_style', 'stress_needs', 'hobbies', 'likes_dislikes'].indexOf(step) > i
                        ? 'w-2 bg-purple-300'
                        : 'w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
