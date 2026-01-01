/**
 * Love Language Quiz Component - Amora Style
 *
 * Interactive quiz to discover your love language with beautiful
 * rose/pink gradients and smooth animations.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  MessageCircle,
  Clock,
  HandHeart,
  Gift,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  RotateCcw
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { useAuth } from '../hooks/useAuth';
import { onboardingService } from '../services/onboardingService';
import { toast } from 'sonner';

interface LoveLanguageQuizProps {
  onComplete: (result: string) => void;
  onBack?: () => void;
}

type LoveLanguage = 'words_of_affirmation' | 'quality_time' | 'acts_of_service' | 'receiving_gifts' | 'physical_touch';

interface Question {
  id: number;
  text: string;
  options: {
    text: string;
    language: LoveLanguage;
  }[];
}

const LOVE_LANGUAGE_INFO: Record<LoveLanguage, { name: string; icon: any; color: string; description: string }> = {
  words_of_affirmation: {
    name: 'Words of Affirmation',
    icon: MessageCircle,
    color: 'from-rose-500 to-pink-500',
    description: 'You feel most loved when your partner expresses love through verbal compliments, encouragement, and appreciation.',
  },
  quality_time: {
    name: 'Quality Time',
    icon: Clock,
    color: 'from-pink-500 to-purple-500',
    description: 'You feel most loved when your partner gives you their undivided attention and spends meaningful time together.',
  },
  acts_of_service: {
    name: 'Acts of Service',
    icon: HandHeart,
    color: 'from-purple-500 to-violet-500',
    description: 'You feel most loved when your partner does helpful things for you, like chores, errands, or making your life easier.',
  },
  receiving_gifts: {
    name: 'Receiving Gifts',
    icon: Gift,
    color: 'from-violet-500 to-indigo-500',
    description: 'You feel most loved when your partner gives you thoughtful gifts that show they were thinking of you.',
  },
  physical_touch: {
    name: 'Physical Touch',
    icon: Heart,
    color: 'from-indigo-500 to-rose-500',
    description: 'You feel most loved through physical affection like hugs, kisses, holding hands, and cuddling.',
  },
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'After a long day, what would make you feel most loved?',
    options: [
      { text: 'Hearing "I\'m so proud of you and all you do"', language: 'words_of_affirmation' },
      { text: 'My partner putting away their phone to listen to me', language: 'quality_time' },
      { text: 'Coming home to find dinner already made', language: 'acts_of_service' },
      { text: 'A surprise gift waiting for me', language: 'receiving_gifts' },
      { text: 'A long, warm hug', language: 'physical_touch' },
    ],
  },
  {
    id: 2,
    text: 'What type of anniversary celebration would mean the most?',
    options: [
      { text: 'A heartfelt love letter', language: 'words_of_affirmation' },
      { text: 'A full day spent together doing favorite activities', language: 'quality_time' },
      { text: 'My partner handling all the planning and details', language: 'acts_of_service' },
      { text: 'A meaningful, thoughtful gift', language: 'receiving_gifts' },
      { text: 'Lots of cuddles and affection', language: 'physical_touch' },
    ],
  },
  {
    id: 3,
    text: 'When you\'re feeling down, what helps most?',
    options: [
      { text: 'Words of encouragement and support', language: 'words_of_affirmation' },
      { text: 'My partner dropping everything to be with me', language: 'quality_time' },
      { text: 'My partner taking care of my responsibilities', language: 'acts_of_service' },
      { text: 'A small "thinking of you" gift', language: 'receiving_gifts' },
      { text: 'Being held close', language: 'physical_touch' },
    ],
  },
  {
    id: 4,
    text: 'In public, what makes you feel most connected to your partner?',
    options: [
      { text: 'When they compliment me to others', language: 'words_of_affirmation' },
      { text: 'When they focus on me and not their phone', language: 'quality_time' },
      { text: 'When they offer to help with something', language: 'acts_of_service' },
      { text: 'When they surprise me with something', language: 'receiving_gifts' },
      { text: 'When they hold my hand or put their arm around me', language: 'physical_touch' },
    ],
  },
  {
    id: 5,
    text: 'What\'s the most meaningful way to say "I love you"?',
    options: [
      { text: 'Actually saying "I love you" with feeling', language: 'words_of_affirmation' },
      { text: 'Planning a special date just for us', language: 'quality_time' },
      { text: 'Doing something helpful without being asked', language: 'acts_of_service' },
      { text: 'Giving a gift that shows you really know me', language: 'receiving_gifts' },
      { text: 'A passionate kiss or tight embrace', language: 'physical_touch' },
    ],
  },
  {
    id: 6,
    text: 'What would hurt you most in a relationship?',
    options: [
      { text: 'Harsh criticism or put-downs', language: 'words_of_affirmation' },
      { text: 'Being constantly busy with no time for me', language: 'quality_time' },
      { text: 'Never helping out or making things harder', language: 'acts_of_service' },
      { text: 'Forgetting important dates or occasions', language: 'receiving_gifts' },
      { text: 'Rarely showing physical affection', language: 'physical_touch' },
    ],
  },
  {
    id: 7,
    text: 'What makes you feel most appreciated?',
    options: [
      { text: 'Genuine verbal recognition', language: 'words_of_affirmation' },
      { text: 'Undivided attention during conversations', language: 'quality_time' },
      { text: 'Help with daily tasks', language: 'acts_of_service' },
      { text: 'Thoughtful presents', language: 'receiving_gifts' },
      { text: 'Physical closeness', language: 'physical_touch' },
    ],
  },
];

export function LoveLanguageQuiz({ onComplete, onBack }: LoveLanguageQuizProps) {
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<LoveLanguage[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<LoveLanguage | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  const handleAnswer = (language: LoveLanguage) => {
    const newAnswers = [...answers, language];
    setAnswers(newAnswers);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate result
      const counts: Record<LoveLanguage, number> = {
        words_of_affirmation: 0,
        quality_time: 0,
        acts_of_service: 0,
        receiving_gifts: 0,
        physical_touch: 0,
      };

      newAnswers.forEach(lang => {
        counts[lang]++;
      });

      const topLanguage = Object.entries(counts).reduce((a, b) =>
        counts[a[0] as LoveLanguage] > counts[b[0] as LoveLanguage] ? a : b
      )[0] as LoveLanguage;

      setResult(topLanguage);
      setShowResult(true);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setAnswers(answers.slice(0, -1));
    } else if (onBack) {
      onBack();
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResult(false);
    setResult(null);
  };

  const handleSaveAndContinue = async () => {
    if (!user?.id || !result) return;

    setIsSaving(true);
    try {
      // Update onboarding with love language
      const existing = await onboardingService.getOnboarding(user.id);
      await onboardingService.saveOnboarding(user.id, {
        ...existing,
        love_language: {
          primary: LOVE_LANGUAGE_INFO[result].name,
        },
      });

      toast.success('Love language saved! 💕');
      onComplete(LOVE_LANGUAGE_INFO[result].name);
    } catch (error) {
      console.error('Error saving love language:', error);
      toast.error('Failed to save, but continuing...');
      onComplete(LOVE_LANGUAGE_INFO[result].name);
    } finally {
      setIsSaving(false);
    }
  };

  const question = QUESTIONS[currentQuestion];
  const resultInfo = result ? LOVE_LANGUAGE_INFO[result] : null;
  const ResultIcon = resultInfo?.icon || Heart;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Custom Styles */}
      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .heartbeat { animation: heartbeat 1.5s ease-in-out infinite; }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .float { animation: float 3s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-rose-100">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500" fill="currentColor" />
              <span className="font-semibold text-rose-600">Love Language Quiz</span>
            </div>
            {!showResult && (
              <span className="text-sm text-gray-500">
                {currentQuestion + 1} / {QUESTIONS.length}
              </span>
            )}
          </div>
          {!showResult && (
            <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {!showResult ? (
            /* Question View */
            <motion.div
              key={`question-${currentQuestion}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-200"
                >
                  <Heart className="w-8 h-8 text-white heartbeat" />
                </motion.div>
                <h2 className="text-xl font-bold text-gray-900 leading-relaxed">
                  {question.text}
                </h2>
              </div>

              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(option.language)}
                    className="w-full p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-rose-300 hover:shadow-md transition-all text-left"
                  >
                    <p className="text-gray-700">{option.text}</p>
                  </motion.button>
                ))}
              </div>

              {/* Back Button */}
              {(currentQuestion > 0 || onBack) && (
                <Button
                  onClick={handleBack}
                  variant="ghost"
                  className="w-full mt-4 text-gray-500"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
            </motion.div>
          ) : (
            /* Result View */
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className={`w-24 h-24 bg-gradient-to-br ${resultInfo?.color} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl`}
                >
                  <ResultIcon className="w-12 h-12 text-white float" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-rose-500 font-medium mb-2">Your Love Language is</p>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-4">
                    {resultInfo?.name}
                  </h2>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="p-6 bg-white border-rose-200 shadow-lg">
                  <p className="text-gray-600 leading-relaxed">
                    {resultInfo?.description}
                  </p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <Button
                  onClick={handleSaveAndContinue}
                  disabled={isSaving}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-lg shadow-lg shadow-rose-200"
                >
                  {isSaving ? 'Saving...' : 'Continue'}
                  <Sparkles className="w-5 h-5 ml-2" />
                </Button>

                <Button
                  onClick={handleRestart}
                  variant="ghost"
                  className="w-full text-gray-500"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Take Quiz Again
                </Button>
              </motion.div>

              {/* All Love Languages Overview */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="pt-6"
              >
                <p className="text-sm text-gray-500 text-center mb-4">All Love Languages</p>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(LOVE_LANGUAGE_INFO).map(([key, info]) => {
                    const Icon = info.icon;
                    const isResult = key === result;
                    return (
                      <div
                        key={key}
                        className={`p-2 rounded-xl text-center ${
                          isResult ? 'bg-rose-100' : 'bg-gray-50'
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 mx-auto mb-1 ${
                            isResult ? 'text-rose-500' : 'text-gray-400'
                          }`}
                        />
                        <p className={`text-[10px] ${isResult ? 'text-rose-600 font-medium' : 'text-gray-400'}`}>
                          {info.name.split(' ')[0]}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
