/**
 * Partner Profile Comparison Component
 *
 * Shows "What they think vs What you said" comparison when User B joins
 * and completes their profile. Creates fun "How well do you know each other?" insight.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, CheckCircle, XCircle, TrendingUp, Sparkles, Award } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { api } from '../api';

interface PartnerGuess {
  guesser_name: string;
  love_language_primary: string;
  love_language_secondary: string | null;
  communication_style: string;
  stress_needs: string[];
  hobbies: string;
  likes: string;
  dislikes: string;
}

interface ActualProfile {
  love_language_primary: string;
  love_language_secondary: string | null;
  communication_style: string;
  stress_needs: string[];
}

interface ComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  coupleId: string;
  actualProfile: ActualProfile;
}

const LOVE_LANGUAGE_LABELS: Record<string, string> = {
  words: 'Words of Affirmation',
  quality_time: 'Quality Time',
  gifts: 'Receiving Gifts',
  acts: 'Acts of Service',
  touch: 'Physical Touch'
};

const COMMUNICATION_STYLE_LABELS: Record<string, string> = {
  direct: 'Direct & Straightforward',
  gentle: 'Gentle & Nurturing',
  playful: 'Playful & Light',
  reserved: 'Reserved & Thoughtful'
};

const STRESS_NEED_LABELS: Record<string, string> = {
  space: 'Space to process alone',
  reassurance: 'Reassurance & comfort',
  distraction: 'Distraction & fun',
  practical_help: 'Practical help & solutions'
};

export function PartnerProfileComparison({ isOpen, onClose, userId, coupleId, actualProfile }: ComparisonProps) {
  const [partnerGuess, setPartnerGuess] = useState<PartnerGuess | null>(null);
  const [loading, setLoading] = useState(true);
  const [accuracy, setAccuracy] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadComparison();
    }
  }, [isOpen, userId]);

  const loadComparison = async () => {
    try {
      // Get partner's guess about current user
      const { data: guessData, error: guessError } = await api.supabase
        .rpc('get_partner_guess_about_me', { p_user_id: userId });

      if (guessError) throw guessError;

      if (guessData && guessData.length > 0) {
        setPartnerGuess(guessData[0]);
        calculateAccuracy(guessData[0]);
      }
    } catch (error) {
      console.error('Failed to load partner guess:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAccuracy = (guess: PartnerGuess) => {
    let correct = 0;
    let total = 3; // primary love language, communication style, and secondary love language

    // Check primary love language
    if (guess.love_language_primary === actualProfile.love_language_primary) {
      correct++;
    }

    // Check communication style
    if (guess.communication_style === actualProfile.communication_style) {
      correct++;
    }

    // Check secondary love language
    if (guess.love_language_secondary === actualProfile.love_language_secondary ||
        (guess.love_language_secondary === null && actualProfile.love_language_secondary === null)) {
      correct++;
    }

    const percentage = Math.round((correct / total) * 100);
    setAccuracy(percentage);
  };

  if (!isOpen || !partnerGuess) return null;

  const isMatch = (guessValue: string | null, actualValue: string | null): boolean => {
    return guessValue === actualValue;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <Award className="w-7 h-7" />
                <h2 className="text-2xl font-bold">How Well Do They Know You?</h2>
              </div>

              {/* Accuracy Score */}
              <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-100">Accuracy Score</span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="text-3xl font-bold"
                  >
                    {accuracy}%
                  </motion.span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${accuracy}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                  />
                </div>
                <p className="text-xs text-purple-100 mt-2">
                  {accuracy >= 75 ? "They know you really well! 🎉" :
                   accuracy >= 50 ? "They're getting to know you!" :
                   "Still learning about each other 💕"}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-600 text-sm mb-4">
                Here's what {partnerGuess.guesser_name} said about you, compared to what you actually selected:
              </p>

              {/* Love Language Primary */}
              <ComparisonCard
                title="Primary Love Language"
                theyThink={LOVE_LANGUAGE_LABELS[partnerGuess.love_language_primary]}
                youSaid={LOVE_LANGUAGE_LABELS[actualProfile.love_language_primary]}
                isMatch={isMatch(partnerGuess.love_language_primary, actualProfile.love_language_primary)}
              />

              {/* Love Language Secondary */}
              {(partnerGuess.love_language_secondary || actualProfile.love_language_secondary) && (
                <ComparisonCard
                  title="Secondary Love Language"
                  theyThink={partnerGuess.love_language_secondary ? LOVE_LANGUAGE_LABELS[partnerGuess.love_language_secondary] : 'None'}
                  youSaid={actualProfile.love_language_secondary ? LOVE_LANGUAGE_LABELS[actualProfile.love_language_secondary] : 'None'}
                  isMatch={isMatch(partnerGuess.love_language_secondary, actualProfile.love_language_secondary)}
                />
              )}

              {/* Communication Style */}
              <ComparisonCard
                title="Communication Style"
                theyThink={COMMUNICATION_STYLE_LABELS[partnerGuess.communication_style]}
                youSaid={COMMUNICATION_STYLE_LABELS[actualProfile.communication_style]}
                isMatch={isMatch(partnerGuess.communication_style, actualProfile.communication_style)}
              />

              {/* Stress Needs */}
              <Card className="border-2 border-gray-200">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">What You Need When Stressed</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-purple-600 mb-1">They think:</p>
                      <div className="flex flex-wrap gap-2">
                        {partnerGuess.stress_needs && partnerGuess.stress_needs.length > 0 ? (
                          partnerGuess.stress_needs.map((need: string) => (
                            <span key={need} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                              {STRESS_NEED_LABELS[need] || need}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">Not specified</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">You said:</p>
                      <div className="flex flex-wrap gap-2">
                        {actualProfile.stress_needs && actualProfile.stress_needs.length > 0 ? (
                          actualProfile.stress_needs.map((need: string) => (
                            <span key={need} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                              {STRESS_NEED_LABELS[need] || need}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">Not specified</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hobbies */}
              {partnerGuess.hobbies && (
                <Card className="border-2 border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Your Hobbies
                    </h3>
                    <p className="text-sm text-gray-700 italic">"{partnerGuess.hobbies}"</p>
                  </CardContent>
                </Card>
              )}

              {/* Likes */}
              {partnerGuess.likes && (
                <Card className="border-2 border-gray-200 bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-green-600" fill="currentColor" />
                      Things You Love
                    </h3>
                    <p className="text-sm text-gray-700 italic">"{partnerGuess.likes}"</p>
                  </CardContent>
                </Card>
              )}

              {/* Dislikes */}
              {partnerGuess.dislikes && (
                <Card className="border-2 border-gray-200 bg-gradient-to-br from-rose-50 to-pink-50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      Things You Avoid
                    </h3>
                    <p className="text-sm text-gray-700 italic">"{partnerGuess.dislikes}"</p>
                  </CardContent>
                </Card>
              )}

              {/* Encouragement */}
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl">
                <p className="text-sm text-gray-700 text-center">
                  <strong className="text-purple-600">Keep learning about each other!</strong><br />
                  These insights help us personalize suggestions that resonate with both of you.
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper component for side-by-side comparison cards
function ComparisonCard({
  title,
  theyThink,
  youSaid,
  isMatch
}: {
  title: string;
  theyThink: string;
  youSaid: string;
  isMatch: boolean;
}) {
  return (
    <Card className={`border-2 ${isMatch ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-gray-200'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {isMatch ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.6 }}
            >
              <CheckCircle className="w-5 h-5 text-green-600" />
            </motion.div>
          ) : (
            <XCircle className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* They Think */}
          <div className="bg-purple-100 rounded-xl p-3">
            <p className="text-xs font-medium text-purple-600 mb-1">They think:</p>
            <p className="text-sm text-gray-900 font-medium">{theyThink}</p>
          </div>

          {/* You Said */}
          <div className="bg-green-100 rounded-xl p-3">
            <p className="text-xs font-medium text-green-600 mb-1">You said:</p>
            <p className="text-sm text-gray-900 font-medium">{youSaid}</p>
          </div>
        </div>

        {isMatch && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-green-600 mt-2 text-center font-medium"
          >
            ✓ Perfect match!
          </motion.p>
        )}
      </CardContent>
    </Card>
  );
}
