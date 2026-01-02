/**
 * Submit Need Modal
 *
 * "What feels missing?" input for relationship needs.
 * Routes through AI to generate partner-specific suggestions.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageCircle, Clock, Sparkles, Space, ThumbsUp, Users, Target, Zap, PartyPopper } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { NeedCategory, NEED_CATEGORIES, Urgency } from '../types/needs';
import { needsService } from '../services/needsService';

interface SubmitNeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  coupleId: string;
  partnerName: string;
}

export function SubmitNeedModal({
  isOpen,
  onClose,
  userId,
  coupleId,
  partnerName
}: SubmitNeedModalProps) {
  const [step, setStep] = useState<'category' | 'context' | 'urgency' | 'submitting' | 'success'>('category');
  const [selectedCategory, setSelectedCategory] = useState<NeedCategory | null>(null);
  const [context, setContext] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('would_help');
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setStep('category');
    setSelectedCategory(null);
    setContext('');
    setUrgency('would_help');
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCategorySelect = (category: NeedCategory) => {
    setSelectedCategory(category);
    if (category === 'space') {
      // Space is special - skip to urgency
      setStep('urgency');
    } else {
      setStep('context');
    }
  };

  const handleContextNext = () => {
    setStep('urgency');
  };

  const handleSubmit = async () => {
    if (!selectedCategory) return;

    setStep('submitting');
    setError(null);

    try {
      await needsService.submitNeed({
        coupleId,
        requesterId: userId,
        needCategory: selectedCategory,
        context: context.trim() || undefined,
        urgency
      });

      setStep('success');

      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      console.error('Failed to submit need:', err);
      setError('Failed to submit. Please try again.');
      setStep('urgency');
    }
  };

  const selectedCategoryInfo = NEED_CATEGORIES.find(c => c.category === selectedCategory);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-6 text-white relative">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <Heart className="w-6 h-6" fill="white" />
                <h2 className="text-2xl font-bold">What feels missing?</h2>
              </div>
              <p className="text-rose-100 text-sm">
                We'll help {partnerName} understand how to support you
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Step: Category Selection */}
              {step === 'category' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-gray-700 mb-4 text-sm">
                    Select what you're missing right now:
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {NEED_CATEGORIES.filter(c => c.category !== 'other').map((category) => (
                      <button
                        key={category.category}
                        onClick={() => handleCategorySelect(category.category)}
                        className="p-4 rounded-2xl border-2 border-gray-200 hover:border-rose-300 hover:bg-rose-50 transition-all text-left group"
                      >
                        <div className="text-3xl mb-2">{category.icon}</div>
                        <h3 className="font-semibold text-gray-900 text-sm group-hover:text-rose-600 transition-colors">
                          {category.label}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step: Context (Optional) */}
              {step === 'context' && selectedCategoryInfo && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-rose-600 mb-2">
                      <span className="text-2xl">{selectedCategoryInfo.icon}</span>
                      <h3 className="font-semibold">{selectedCategoryInfo.label}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{selectedCategoryInfo.description}</p>
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add context? (Optional)
                  </label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="E.g., 'We haven't had a real conversation in days' or leave blank"
                    maxLength={300}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">{context.length}/300 characters</p>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setStep('category')}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleContextNext}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium hover:from-rose-600 hover:to-pink-600 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step: Urgency */}
              {step === 'urgency' && selectedCategoryInfo && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-rose-600 mb-2">
                      <span className="text-2xl">{selectedCategoryInfo.icon}</span>
                      <h3 className="font-semibold">{selectedCategoryInfo.label}</h3>
                    </div>
                    {context && (
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{context}</p>
                    )}
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    How urgent is this?
                  </label>

                  <div className="space-y-3">
                    {[
                      { value: 'not_urgent', label: 'Not Urgent', desc: 'Can wait, no rush', color: 'blue' },
                      { value: 'would_help', label: 'Would Help', desc: 'Would improve things', color: 'yellow' },
                      { value: 'important', label: 'Important', desc: 'Needs attention soon', color: 'red' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setUrgency(option.value as Urgency)}
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
                        <div className="text-xs text-gray-500">{option.desc}</div>
                      </button>
                    ))}
                  </div>

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setStep(selectedCategory === 'space' ? 'category' : 'context')}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium hover:from-rose-600 hover:to-pink-600 transition-colors shadow-lg shadow-rose-200"
                    >
                      Submit
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step: Submitting */}
              {step === 'submitting' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 mx-auto mb-4"
                  >
                    <Sparkles className="w-16 h-16 text-rose-500" />
                  </motion.div>
                  <p className="text-gray-700 font-medium">Creating suggestion for {partnerName}...</p>
                </motion.div>
              )}

              {/* Step: Success */}
              {step === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.6 }}
                    className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center"
                  >
                    <Heart className="w-10 h-10 text-green-600" fill="currentColor" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Sent to {partnerName}!</h3>
                  <p className="text-gray-600 text-sm">
                    We've created a personalized suggestion based on how they feel loved.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
