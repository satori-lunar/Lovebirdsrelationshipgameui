/**
 * Partner Profile Onboarding
 *
 * Collects partner profile data for AI-powered personalization.
 * Educational and engaging flow to set up the relationship intelligence system.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  MessageCircle,
  Brain,
  Sparkles,
  Battery,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronLeft
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
import { partnerProfileService } from '../services/partnerProfileService';

interface PartnerProfileOnboardingProps {
  userId: string;
  coupleId: string;
  partnerName?: string;
  onComplete: () => void;
}

type Step =
  | 'welcome'
  | 'love_language_primary'
  | 'love_language_secondary'
  | 'communication_style'
  | 'stress_needs'
  | 'frequency'
  | 'checkin_times'
  | 'complete';

const LOVE_LANGUAGES: { value: LoveLanguage; label: string; description: string; icon: string }[] = [
  {
    value: 'words',
    label: 'Words of Affirmation',
    description: 'Verbal compliments, "I love you", encouragement',
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
    description: 'Doing things to help, taking tasks off their plate',
    icon: '✨'
  },
  {
    value: 'touch',
    label: 'Physical Touch',
    description: 'Hugs, hand-holding, physical closeness',
    icon: '🤗'
  }
];

const COMMUNICATION_STYLES: { value: CommunicationStyle; label: string; description: string; example: string }[] = [
  {
    value: 'direct',
    label: 'Direct',
    description: 'Clear and straightforward',
    example: '"I need reassurance about us."'
  },
  {
    value: 'gentle',
    label: 'Gentle',
    description: 'Soft and considerate',
    example: '"I could use some extra support right now."'
  },
  {
    value: 'playful',
    label: 'Playful',
    description: 'Light and fun',
    example: '"Missing my favorite person 💛"'
  },
  {
    value: 'reserved',
    label: 'Reserved',
    description: 'Brief and understated',
    example: '"Need you."'
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
    description: 'Help me think about something else',
    icon: '🎮'
  },
  {
    value: 'practical_help',
    label: 'Practical Help',
    description: 'Do something concrete to help',
    icon: '🛠️'
  }
];

const FREQUENCY_OPTIONS: { value: FrequencyPreference; label: string; description: string }[] = [
  {
    value: 'high_touch',
    label: 'High Touch',
    description: 'Daily check-ins and frequent prompts'
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: '3-4 times per week (recommended)'
  },
  {
    value: 'low_touch',
    label: 'Low Touch',
    description: '1-2 times per week, minimal prompts'
  }
];

const CHECKIN_TIMES_OPTIONS: { value: CheckinTime; label: string; time: string }[] = [
  { value: 'morning', label: 'Morning', time: '6am - 12pm' },
  { value: 'afternoon', label: 'Afternoon', time: '12pm - 5pm' },
  { value: 'evening', label: 'Evening', time: '5pm - 10pm' }
];

export function PartnerProfileOnboarding({
  userId,
  coupleId,
  partnerName,
  onComplete
}: PartnerProfileOnboardingProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [saving, setSaving] = useState(false);

  // Form state
  const [loveLanguagePrimary, setLoveLanguagePrimary] = useState<LoveLanguage | null>(null);
  const [loveLanguageSecondary, setLoveLanguageSecondary] = useState<LoveLanguage | null>(null);
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyle | null>(null);
  const [stressNeeds, setStressNeeds] = useState<StressNeed[]>([]);
  const [frequencyPreference, setFrequencyPreference] = useState<FrequencyPreference>('moderate');
  const [checkinTimes, setCheckinTimes] = useState<CheckinTime[]>(['evening']);

  const handleNext = () => {
    const stepOrder: Step[] = [
      'welcome',
      'love_language_primary',
      'love_language_secondary',
      'communication_style',
      'stress_needs',
      'frequency',
      'checkin_times',
      'complete'
    ];

    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex < stepOrder.length - 1) {
      setStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: Step[] = [
      'welcome',
      'love_language_primary',
      'love_language_secondary',
      'communication_style',
      'stress_needs',
      'frequency',
      'checkin_times',
      'complete'
    ];

    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleComplete = async () => {
    if (!loveLanguagePrimary || !communicationStyle) return;

    setSaving(true);
    try {
      await partnerProfileService.createProfile({
        userId,
        coupleId,
        loveLanguagePrimary,
        loveLanguageSecondary: loveLanguageSecondary || undefined,
        communicationStyle,
        stressNeeds,
        frequencyPreference,
        dailyCheckinsEnabled: true,
        preferredCheckinTimes: checkinTimes,
        customPreferences: [],
        learnedPatterns: {},
        engagementScore: 50
      });

      setStep('complete');
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
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

  const toggleCheckinTime = (time: CheckinTime) => {
    if (checkinTimes.includes(time)) {
      if (checkinTimes.length > 1) {
        setCheckinTimes(checkinTimes.filter(t => t !== time));
      }
    } else {
      setCheckinTimes([...checkinTimes, time]);
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
            {/* Welcome */}
            {step === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.8 }}
                  className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-rose-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl"
                >
                  <Brain className="w-12 h-12 text-white" />
                </motion.div>

                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Let's learn about you
                </h1>
                <p className="text-lg text-gray-600 mb-2">
                  Help us understand how you feel loved
                </p>
                <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
                  We'll use this to give {partnerName || 'your partner'} personalized suggestions
                  on how to support you in ways that matter most to you.
                </p>

                <Card className="bg-white/80 backdrop-blur-sm border-2 border-rose-200 shadow-xl mb-8">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 text-left">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          Why we ask these questions
                        </h3>
                        <p className="text-sm text-gray-600">
                          Everyone feels loved differently. By understanding your preferences,
                          we can help your partner show up for you in meaningful ways - and teach
                          you both to need this app less over time.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleNext}
                  className="px-8 py-6 text-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-2xl shadow-lg shadow-rose-200"
                >
                  Let's Begin
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
                    Your Primary Love Language
                  </h2>
                  <p className="text-gray-600">
                    How do you most feel loved?
                  </p>
                </div>

                <div className="grid gap-4 mb-8">
                  {LOVE_LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setLoveLanguagePrimary(lang.value)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        loveLanguagePrimary === lang.value
                          ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-200'
                          : 'border-gray-200 hover:border-rose-300 bg-white'
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
                          <CheckCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
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
                    className="flex-1 py-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl"
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
                    Your Secondary Love Language
                  </h2>
                  <p className="text-gray-600">
                    What's your second way of feeling loved? (Optional)
                  </p>
                </div>

                <div className="grid gap-4 mb-8">
                  {LOVE_LANGUAGES.filter(l => l.value !== loveLanguagePrimary).map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setLoveLanguageSecondary(lang.value)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        loveLanguageSecondary === lang.value
                          ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-200'
                          : 'border-gray-200 hover:border-rose-300 bg-white'
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
                          <CheckCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
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
                    className="flex-1 py-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl"
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
                    Your Communication Style
                  </h2>
                  <p className="text-gray-600">
                    How do you prefer to communicate?
                  </p>
                </div>

                <div className="grid gap-4 mb-8">
                  {COMMUNICATION_STYLES.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setCommunicationStyle(style.value)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        communicationStyle === style.value
                          ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-200'
                          : 'border-gray-200 hover:border-rose-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <MessageCircle className={`w-8 h-8 ${
                          communicationStyle === style.value ? 'text-rose-500' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {style.label}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">{style.description}</p>
                          <p className="text-xs text-gray-500 italic">
                            Example: {style.example}
                          </p>
                        </div>
                        {communicationStyle === style.value && (
                          <CheckCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
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
                    className="flex-1 py-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl"
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
                    When You're Stressed
                  </h2>
                  <p className="text-gray-600">
                    What do you need most? (Select all that apply)
                  </p>
                </div>

                <div className="grid gap-4 mb-8">
                  {STRESS_NEEDS_OPTIONS.map((need) => (
                    <button
                      key={need.value}
                      onClick={() => toggleStressNeed(need.value)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        stressNeeds.includes(need.value)
                          ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-200'
                          : 'border-gray-200 hover:border-rose-300 bg-white'
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
                          <CheckCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
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
                    className="flex-1 py-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Frequency Preference */}
            {step === 'frequency' && (
              <motion.div
                key="frequency"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    How Often Should We Check In?
                  </h2>
                  <p className="text-gray-600">
                    We'll reduce this over time as you grow more independent
                  </p>
                </div>

                <div className="grid gap-4 mb-8">
                  {FREQUENCY_OPTIONS.map((freq) => (
                    <button
                      key={freq.value}
                      onClick={() => setFrequencyPreference(freq.value)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        frequencyPreference === freq.value
                          ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-200'
                          : 'border-gray-200 hover:border-rose-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <Clock className={`w-8 h-8 ${
                          frequencyPreference === freq.value ? 'text-rose-500' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {freq.label}
                          </h3>
                          <p className="text-sm text-gray-600">{freq.description}</p>
                        </div>
                        {frequencyPreference === freq.value && (
                          <CheckCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
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
                    className="flex-1 py-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Check-in Times */}
            {step === 'checkin_times' && (
              <motion.div
                key="checkin_times"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Best Times to Check In
                  </h2>
                  <p className="text-gray-600">
                    When do you prefer to see prompts? (Select at least one)
                  </p>
                </div>

                <div className="grid gap-4 mb-8">
                  {CHECKIN_TIMES_OPTIONS.map((time) => (
                    <button
                      key={time.value}
                      onClick={() => toggleCheckinTime(time.value)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        checkinTimes.includes(time.value)
                          ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-200'
                          : 'border-gray-200 hover:border-rose-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <Battery className={`w-8 h-8 ${
                          checkinTimes.includes(time.value) ? 'text-rose-500' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {time.label}
                          </h3>
                          <p className="text-sm text-gray-600">{time.time}</p>
                        </div>
                        {checkinTimes.includes(time.value) && (
                          <CheckCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
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
                    onClick={handleComplete}
                    disabled={saving || checkinTimes.length === 0}
                    className="flex-1 py-6 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl"
                  >
                    {saving ? 'Saving...' : 'Complete'}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Complete */}
            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl"
                >
                  <CheckCircle className="w-12 h-12 text-white" />
                </motion.div>

                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  All Set! 🎉
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  We'll use this to help {partnerName || 'your partner'} love you better.
                  Let's start your journey together!
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Indicator */}
          {step !== 'welcome' && step !== 'complete' && (
            <div className="mt-8">
              <div className="flex items-center justify-center gap-2">
                {['love_language_primary', 'love_language_secondary', 'communication_style', 'stress_needs', 'frequency', 'checkin_times'].map((s, i) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all ${
                      s === step ? 'w-8 bg-rose-500' :
                      ['love_language_primary', 'love_language_secondary', 'communication_style', 'stress_needs', 'frequency', 'checkin_times'].indexOf(step) > i
                        ? 'w-2 bg-rose-300'
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
