import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, ArrowRight, ArrowLeft, Lock, Check, Sparkles } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { helpingHandService } from '../services/helpingHandService';
import { toast } from 'sonner';
import { HelpingHandHintModalProps, HintType } from '../types/helpingHand';

const hintTypes: { id: HintType; emoji: string; label: string; description: string; placeholder: string }[] = [
  {
    id: 'what_makes_me_happy',
    emoji: '😊',
    label: 'What Makes Me Happy',
    description: 'Share what brings you joy and makes you feel loved',
    placeholder: 'I love it when you...\nIt makes me happy when we...\nI feel special when you...'
  },
  {
    id: 'what_id_appreciate',
    emoji: '💝',
    label: 'What I\'d Appreciate',
    description: 'Tell them what gestures or actions you\'d appreciate',
    placeholder: 'I would really appreciate if...\nIt would mean a lot if you could...\nI\'ve been hoping we could...'
  },
  {
    id: 'recent_stress',
    emoji: '😔',
    label: 'What\'s Stressing Me',
    description: 'Share current challenges so they can support you better',
    placeholder: 'I\'ve been stressed about...\nI\'m feeling overwhelmed by...\nWhat would help me is...'
  },
  {
    id: 'upcoming_important',
    emoji: '📅',
    label: 'Something Important Coming Up',
    description: 'Mention upcoming events or dates that matter to you',
    placeholder: 'I have an important...\nComing up soon is...\nI\'m nervous/excited about...'
  },
  {
    id: 'love_language_preference',
    emoji: '❤️',
    label: 'How I Like to Receive Love',
    description: 'Share your love language preferences',
    placeholder: 'I feel most loved when...\nWhat really touches my heart is...\nI prefer...'
  },
  {
    id: 'general_feedback',
    emoji: '💬',
    label: 'General Feedback',
    description: 'Any other thoughts or hints you want to share',
    placeholder: 'I wanted to mention...\nLately I\'ve noticed...\nI think it would be great if...'
  }
];

export default function HelpingHandHintModal({ isOpen, onClose }: HelpingHandHintModalProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<HintType | null>(null);
  const [hintText, setHintText] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const partnerName = relationship?.partnerName || 'your partner';
  const maxChars = 500;
  const selectedHintType = hintTypes.find(t => t.id === selectedType);

  const handleClose = () => {
    setStep(1);
    setSelectedType(null);
    setHintText('');
    setIsPrivate(true);
    onClose();
  };

  const handleTypeSelect = (type: HintType) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 1) {
      handleClose();
    } else {
      setStep(step - 1);
    }
  };

  const handleNext = () => {
    if (step === 2 && hintText.trim().length < 10) {
      toast.error('Please write at least 10 characters');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!user || !relationship || !selectedType) {
      toast.error('Missing required information');
      return;
    }

    if (hintText.trim().length < 10) {
      toast.error('Please write at least 10 characters');
      return;
    }

    try {
      setIsSubmitting(true);

      await helpingHandService.addPartnerHint({
        userId: user.id,
        relationshipId: relationship.id,
        hintType: selectedType,
        hintText: hintText.trim(),
        isVisibleToPartner: !isPrivate
      });

      toast.success('Hint saved! 💝');
      handleClose();
    } catch (error) {
      console.error('Failed to save hint:', error);
      toast.error('Failed to save hint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg max-h-[90vh] overflow-hidden"
        >
          <Card className="border-warm-pink/30 shadow-2xl">
            <CardContent className="p-0">
              {/* Header */}
              <div className="bg-gradient-to-r from-warm-pink to-soft-purple p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={handleBack}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-2">
                    <Heart className="w-6 h-6 fill-white" />
                    <h2 className="text-xl font-bold">Send a Hint</h2>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-sm text-white/90 text-center">
                  Help {partnerName} know what would make you happy
                </p>
              </div>

              {/* Progress indicator */}
              <div className="flex gap-1 px-4 py-3 bg-warm-beige/10">
                {[1, 2, 3, 4].map(s => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      s <= step ? 'bg-warm-pink' : 'bg-warm-beige/30'
                    }`}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* Step 1: Select hint type */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3 className="text-lg font-semibold text-text-warm mb-3">
                      What kind of hint would you like to share?
                    </h3>
                    <div className="space-y-2">
                      {hintTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => handleTypeSelect(type.id)}
                          className="w-full p-4 text-left rounded-lg border-2 border-warm-beige hover:border-warm-pink hover:bg-warm-pink/5 transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-3xl shrink-0 group-hover:scale-110 transition-transform">
                              {type.emoji}
                            </span>
                            <div className="flex-1">
                              <div className="font-semibold text-text-warm mb-1">
                                {type.label}
                              </div>
                              <div className="text-sm text-text-warm-light">
                                {type.description}
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-text-warm-light group-hover:text-warm-pink group-hover:translate-x-1 transition-all" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Write hint details */}
                {step === 2 && selectedHintType && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl">{selectedHintType.emoji}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-text-warm">
                          {selectedHintType.label}
                        </h3>
                        <p className="text-sm text-text-warm-light">
                          {selectedHintType.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hint-text" className="text-base font-semibold text-text-warm">
                        Share your thoughts
                      </Label>
                      <Textarea
                        id="hint-text"
                        value={hintText}
                        onChange={(e) => setHintText(e.target.value)}
                        placeholder={selectedHintType.placeholder}
                        className="min-h-[200px] resize-none"
                        maxLength={maxChars}
                      />
                      <div className="flex justify-between text-xs text-text-warm-light">
                        <span>Be specific and honest</span>
                        <span>{hintText.length}/{maxChars}</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleNext}
                      disabled={hintText.trim().length < 10}
                      className="w-full mt-6 bg-warm-pink hover:bg-warm-pink/90 text-white"
                      size="lg"
                    >
                      Next
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 3: Privacy settings */}
                {step === 3 && selectedHintType && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-soft-purple/10 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-soft-purple" />
                      </div>
                      <h3 className="text-lg font-semibold text-text-warm mb-2">
                        Privacy Settings
                      </h3>
                      <p className="text-sm text-text-warm-light">
                        Choose how this hint will be used
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* Private option (recommended) */}
                      <button
                        onClick={() => setIsPrivate(true)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          isPrivate
                            ? 'border-warm-pink bg-warm-pink/5'
                            : 'border-warm-beige hover:border-warm-pink/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            isPrivate ? 'border-warm-pink bg-warm-pink' : 'border-warm-beige'
                          }`}>
                            {isPrivate && <div className="w-3 h-3 bg-white rounded-full" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-text-warm">
                                Private Hint
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                Recommended
                              </Badge>
                            </div>
                            <p className="text-sm text-text-warm-light">
                              Only visible to AI for generating suggestions. {partnerName} won't see the exact text.
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Shared option */}
                      <button
                        onClick={() => setIsPrivate(false)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          !isPrivate
                            ? 'border-warm-pink bg-warm-pink/5'
                            : 'border-warm-beige hover:border-warm-pink/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            !isPrivate ? 'border-warm-pink bg-warm-pink' : 'border-warm-beige'
                          }`}>
                            {!isPrivate && <div className="w-3 h-3 bg-white rounded-full" />}
                          </div>
                          <div className="flex-1">
                            <span className="font-semibold text-text-warm block mb-1">
                              Shared Hint
                            </span>
                            <p className="text-sm text-text-warm-light">
                              {partnerName} can see this hint in their suggestions. More direct communication.
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    <Button
                      onClick={handleNext}
                      className="w-full mt-6 bg-warm-pink hover:bg-warm-pink/90 text-white"
                      size="lg"
                    >
                      Next
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 4: Confirmation */}
                {step === 4 && selectedHintType && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-warm-pink/10 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-warm-pink" />
                      </div>
                      <h3 className="text-lg font-semibold text-text-warm mb-2">
                        Review Your Hint
                      </h3>
                      <p className="text-sm text-text-warm-light">
                        Make sure everything looks good
                      </p>
                    </div>

                    {/* Summary */}
                    <div className="space-y-4 mb-6">
                      {/* Type */}
                      <div className="p-4 bg-warm-beige/10 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{selectedHintType.emoji}</span>
                          <div>
                            <p className="text-xs text-text-warm-light mb-1">Type</p>
                            <p className="font-semibold text-text-warm">
                              {selectedHintType.label}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Hint text */}
                      <div className="p-4 bg-warm-beige/10 rounded-lg">
                        <p className="text-xs text-text-warm-light mb-2">Your Hint</p>
                        <p className="text-sm text-text-warm whitespace-pre-wrap">
                          {hintText}
                        </p>
                      </div>

                      {/* Privacy */}
                      <div className="p-4 bg-warm-beige/10 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Lock className="w-5 h-5 text-soft-purple shrink-0" />
                          <div>
                            <p className="text-xs text-text-warm-light mb-1">Privacy</p>
                            <p className="font-semibold text-text-warm">
                              {isPrivate ? 'Private Hint' : 'Shared Hint'}
                            </p>
                            <p className="text-xs text-text-warm-light mt-1">
                              {isPrivate
                                ? `Only AI can see this. ${partnerName} will get suggestions based on it.`
                                : `${partnerName} can see this hint directly in their suggestions.`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-warm-pink to-soft-purple hover:opacity-90 text-white"
                        size="lg"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Sending Hint...
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5 mr-2" />
                            Send Hint to {partnerName}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setStep(2)}
                        variant="outline"
                        className="w-full"
                      >
                        Edit Hint
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
