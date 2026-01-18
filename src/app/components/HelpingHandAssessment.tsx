import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronRight, Loader2, Calendar, Briefcase, Battery, Heart } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { helpingHandService } from '../services/helpingHandService';
import { aiHelpingHandService } from '../services/aiHelpingHandService';
import { toast } from 'sonner';
import {
  HelpingHandAssessmentProps,
  WorkScheduleType,
  AvailableTimeLevel,
  CapacityLevel,
  StressLevel,
  EnergyLevel,
  CurrentChallenge
} from '../types/helpingHand';

const workScheduleOptions = [
  { id: 'full_time' as WorkScheduleType, label: 'Full-time', description: '40+ hours/week', icon: '💼' },
  { id: 'part_time' as WorkScheduleType, label: 'Part-time', description: 'Less than 40 hours', icon: '🕐' },
  { id: 'flexible' as WorkScheduleType, label: 'Flexible', description: 'Variable schedule', icon: '🔄' },
  { id: 'unemployed' as WorkScheduleType, label: 'Not working', description: 'Currently unemployed', icon: '🏠' },
  { id: 'student' as WorkScheduleType, label: 'Student', description: 'In school', icon: '📚' },
  { id: 'shift_work' as WorkScheduleType, label: 'Shift work', description: 'Rotating shifts', icon: '🔄' }
];

const timeLevelOptions = [
  { id: 'very_limited' as AvailableTimeLevel, label: 'Very Limited', description: 'Almost no free time', icon: '⏰', color: 'from-red-400 to-rose-500' },
  { id: 'limited' as AvailableTimeLevel, label: 'Limited', description: 'A little free time', icon: '⏱️', color: 'from-amber-400 to-orange-500' },
  { id: 'moderate' as AvailableTimeLevel, label: 'Moderate', description: 'Some free time', icon: '🕐', color: 'from-blue-400 to-cyan-500' },
  { id: 'plenty' as AvailableTimeLevel, label: 'Plenty', description: 'Lots of free time', icon: '✨', color: 'from-emerald-400 to-green-500' }
];

const emotionalCapacityOptions = [
  { id: 'very_low' as CapacityLevel, label: 'Very Low', description: 'Barely holding on', icon: '😞', color: 'from-red-400 to-rose-500' },
  { id: 'low' as CapacityLevel, label: 'Low', description: 'Running on empty', icon: '😔', color: 'from-amber-400 to-orange-500' },
  { id: 'moderate' as CapacityLevel, label: 'Moderate', description: 'Managing okay', icon: '😐', color: 'from-indigo-400 to-purple-500' },
  { id: 'good' as CapacityLevel, label: 'Good', description: 'Feeling solid', icon: '😊', color: 'from-blue-400 to-cyan-500' },
  { id: 'excellent' as CapacityLevel, label: 'Excellent', description: 'Thriving!', icon: '😄', color: 'from-emerald-400 to-green-500' }
];

const stressLevelOptions = [
  { id: 'very_stressed' as StressLevel, label: 'Very Stressed', icon: '😰', color: 'from-red-400 to-rose-500' },
  { id: 'stressed' as StressLevel, label: 'Stressed', icon: '😟', color: 'from-amber-400 to-orange-500' },
  { id: 'moderate' as StressLevel, label: 'Moderate', icon: '😐', color: 'from-indigo-400 to-purple-500' },
  { id: 'relaxed' as StressLevel, label: 'Relaxed', icon: '😌', color: 'from-blue-400 to-cyan-500' },
  { id: 'very_relaxed' as StressLevel, label: 'Very Relaxed', icon: '😎', color: 'from-emerald-400 to-green-500' }
];

const energyLevelOptions = [
  { id: 'exhausted' as EnergyLevel, label: 'Exhausted', icon: '🔋', color: 'from-red-400 to-rose-500' },
  { id: 'tired' as EnergyLevel, label: 'Tired', icon: '😴', color: 'from-amber-400 to-orange-500' },
  { id: 'moderate' as EnergyLevel, label: 'Moderate', icon: '⚡', color: 'from-indigo-400 to-purple-500' },
  { id: 'energized' as EnergyLevel, label: 'Energized', icon: '✨', color: 'from-blue-400 to-cyan-500' },
  { id: 'very_energized' as EnergyLevel, label: 'Very Energized', icon: '🚀', color: 'from-emerald-400 to-green-500' }
];

const challengeOptions = [
  { id: 'work_deadline' as CurrentChallenge, label: 'Work Deadline', icon: '📅' },
  { id: 'family_issue' as CurrentChallenge, label: 'Family Issue', icon: '👨‍👩‍👧' },
  { id: 'health_concern' as CurrentChallenge, label: 'Health Concern', icon: '🏥' },
  { id: 'financial_stress' as CurrentChallenge, label: 'Financial Stress', icon: '💰' },
  { id: 'travel' as CurrentChallenge, label: 'Travel', icon: '✈️' },
  { id: 'moving' as CurrentChallenge, label: 'Moving', icon: '📦' },
  { id: 'studying' as CurrentChallenge, label: 'Studying', icon: '📚' },
  { id: 'other' as CurrentChallenge, label: 'Other', icon: '❓' }
];

export default function HelpingHandAssessment({ onBack, onComplete, existingStatus }: HelpingHandAssessmentProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [workSchedule, setWorkSchedule] = useState<WorkScheduleType>(existingStatus?.workScheduleType || 'full_time');
  const [workHours, setWorkHours] = useState<number | undefined>(existingStatus?.workHoursPerWeek);
  const [timeLevel, setTimeLevel] = useState<AvailableTimeLevel>(existingStatus?.availableTimeLevel || 'moderate');
  const [emotionalCapacity, setEmotionalCapacity] = useState<CapacityLevel>(existingStatus?.emotionalCapacity || 'moderate');
  const [stressLevel, setStressLevel] = useState<StressLevel>(existingStatus?.stressLevel || 'moderate');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(existingStatus?.energyLevel || 'moderate');
  const [challenges, setChallenges] = useState<CurrentChallenge[]>(existingStatus?.currentChallenges || []);
  const [notes, setNotes] = useState(existingStatus?.notes || '');

  const weekStartDate = helpingHandService.getWeekStartDate();
  const partnerName = relationship?.partnerName || 'your partner';

  const handleChallengeToggle = (challenge: CurrentChallenge) => {
    setChallenges(prev =>
      prev.includes(challenge)
        ? prev.filter(c => c !== challenge)
        : [...prev, challenge]
    );
  };

  const handleSubmit = async () => {
    if (!user || !relationship) {
      toast.error('Please sign in to continue');
      return;
    }

    try {
      setIsGenerating(true);

      // Save user status
      const status = await helpingHandService.upsertUserStatus({
        userId: user.id,
        weekStartDate,
        status: {
          workScheduleType: workSchedule,
          workHoursPerWeek: workHours,
          availableTimeLevel: timeLevel,
          emotionalCapacity,
          stressLevel,
          energyLevel,
          currentChallenges: challenges,
          notes
        }
      });

      toast.success('Your week has been saved!');

      // Generate suggestions
      toast.loading('Creating personalized suggestions...');

      const result = await aiHelpingHandService.generateSuggestions({
        userId: user.id,
        relationshipId: relationship.id,
        weekStartDate,
        regenerate: false
      });

      toast.dismiss();
      const suggestionCount = result.suggestions?.length || 0;
      toast.success(`Generated ${suggestionCount} suggestions for you!`);

      onComplete(status);
    } catch (error) {
      console.error('Failed to save status:', error);
      toast.error('Failed to save your status. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalSteps = 5;

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-cream to-soft-purple-light pb-20">
      {/* Header */}
      <div className="bg-white border-b border-warm-beige/30 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 hover:bg-warm-beige/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-text-warm" />
            </button>
            <div className="flex-1 mx-4">
              <h1 className="text-lg font-bold text-text-warm text-center">
                Plan Your Week
              </h1>
              <p className="text-sm text-text-warm-light text-center">
                For {partnerName}
              </p>
            </div>
            <div className="text-sm text-text-warm-light font-medium">
              {step}/{totalSteps}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2 bg-warm-beige/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-warm-pink to-soft-purple"
              initial={{ width: 0 }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Work Schedule */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-6 h-6 text-warm-pink" />
                  <h2 className="text-2xl font-bold text-text-warm">
                    How's your work schedule this week?
                  </h2>
                </div>
                <p className="text-text-warm-light">
                  This helps us suggest things that fit your availability
                </p>
              </div>

              <div className="space-y-3">
                {workScheduleOptions.map(option => (
                  <Card
                    key={option.id}
                    className={`cursor-pointer transition-all ${
                      workSchedule === option.id
                        ? 'ring-2 ring-warm-pink bg-warm-pink/5'
                        : 'hover:bg-warm-beige/20'
                    }`}
                    onClick={() => setWorkSchedule(option.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{option.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-text-warm">
                            {option.label}
                          </div>
                          <div className="text-sm text-text-warm-light">
                            {option.description}
                          </div>
                        </div>
                        {workSchedule === option.id && (
                          <div className="w-6 h-6 rounded-full bg-warm-pink flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full mt-6 bg-warm-pink hover:bg-warm-pink/90 text-white"
                size="lg"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Available Time */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-6 h-6 text-warm-pink" />
                  <h2 className="text-2xl font-bold text-text-warm">
                    How much free time do you have?
                  </h2>
                </div>
                <p className="text-text-warm-light">
                  We'll match suggestions to your available time
                </p>
              </div>

              <div className="space-y-3">
                {timeLevelOptions.map(option => (
                  <Card
                    key={option.id}
                    className={`cursor-pointer transition-all ${
                      timeLevel === option.id
                        ? 'ring-2 ring-warm-pink bg-warm-pink/5'
                        : 'hover:bg-warm-beige/20'
                    }`}
                    onClick={() => setTimeLevel(option.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl bg-gradient-to-r ${option.color} bg-clip-text text-transparent`}>
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-text-warm">
                            {option.label}
                          </div>
                          <div className="text-sm text-text-warm-light">
                            {option.description}
                          </div>
                        </div>
                        {timeLevel === option.id && (
                          <div className="w-6 h-6 rounded-full bg-warm-pink flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-warm-pink hover:bg-warm-pink/90 text-white"
                  size="lg"
                >
                  Next
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Emotional Capacity & Energy */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Emotional Capacity */}
              <div>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-6 h-6 text-warm-pink" />
                    <h2 className="text-2xl font-bold text-text-warm">
                      How's your emotional capacity?
                    </h2>
                  </div>
                  <p className="text-text-warm-light">
                    Be honest - we'll adjust our suggestions
                  </p>
                </div>

                <div className="space-y-2">
                  {emotionalCapacityOptions.map(option => (
                    <Card
                      key={option.id}
                      className={`cursor-pointer transition-all ${
                        emotionalCapacity === option.id
                          ? 'ring-2 ring-warm-pink bg-warm-pink/5'
                          : 'hover:bg-warm-beige/20'
                      }`}
                      onClick={() => setEmotionalCapacity(option.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{option.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium text-text-warm text-sm">
                              {option.label}
                            </div>
                            <div className="text-xs text-text-warm-light">
                              {option.description}
                            </div>
                          </div>
                          {emotionalCapacity === option.id && (
                            <div className="w-5 h-5 rounded-full bg-warm-pink flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Energy Level */}
              <div>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Battery className="w-6 h-6 text-soft-purple" />
                    <h3 className="text-xl font-bold text-text-warm">
                      Your energy level?
                    </h3>
                  </div>
                </div>

                <div className="space-y-2">
                  {energyLevelOptions.map(option => (
                    <Card
                      key={option.id}
                      className={`cursor-pointer transition-all ${
                        energyLevel === option.id
                          ? 'ring-2 ring-soft-purple bg-soft-purple/5'
                          : 'hover:bg-warm-beige/20'
                      }`}
                      onClick={() => setEnergyLevel(option.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{option.icon}</span>
                          <div className="flex-1 font-medium text-text-warm text-sm">
                            {option.label}
                          </div>
                          {energyLevel === option.id && (
                            <div className="w-5 h-5 rounded-full bg-soft-purple flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-warm-pink hover:bg-warm-pink/90 text-white"
                  size="lg"
                >
                  Next
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Current Challenges */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-warm mb-2">
                  What's on your plate this week?
                </h2>
                <p className="text-text-warm-light">
                  Select any challenges you're dealing with (optional)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {challengeOptions.map(option => (
                  <Card
                    key={option.id}
                    className={`cursor-pointer transition-all ${
                      challenges.includes(option.id)
                        ? 'ring-2 ring-warm-pink bg-warm-pink/5'
                        : 'hover:bg-warm-beige/20'
                    }`}
                    onClick={() => handleChallengeToggle(option.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl mb-2">{option.icon}</div>
                      <div className="text-sm font-medium text-text-warm">
                        {option.label}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setStep(3)}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(5)}
                  className="flex-1 bg-warm-pink hover:bg-warm-pink/90 text-white"
                  size="lg"
                >
                  Next
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Notes & Review */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-warm mb-2">
                  Anything else we should know?
                </h2>
                <p className="text-text-warm-light">
                  Add any notes about your week (optional)
                </p>
              </div>

              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., 'Working late on Tuesday and Thursday' or 'Feeling extra stressed about a project deadline'"
                className="min-h-32 resize-none"
                maxLength={500}
              />
              <div className="text-sm text-text-warm-light text-right mt-2">
                {notes.length}/500
              </div>

              {/* Summary Card */}
              <Card className="mt-6 border-warm-pink/30 bg-warm-pink/5">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-text-warm mb-3">Your Week Summary:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-warm-light">Work:</span>
                      <span className="font-medium text-text-warm">
                        {workScheduleOptions.find(o => o.id === workSchedule)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-warm-light">Free Time:</span>
                      <span className="font-medium text-text-warm">
                        {timeLevelOptions.find(o => o.id === timeLevel)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-warm-light">Emotional Capacity:</span>
                      <span className="font-medium text-text-warm">
                        {emotionalCapacityOptions.find(o => o.id === emotionalCapacity)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-warm-light">Energy:</span>
                      <span className="font-medium text-text-warm">
                        {energyLevelOptions.find(o => o.id === energyLevel)?.label}
                      </span>
                    </div>
                    {challenges.length > 0 && (
                      <div className="flex justify-between items-start">
                        <span className="text-text-warm-light">Challenges:</span>
                        <span className="font-medium text-text-warm text-right">
                          {challenges.length} selected
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setStep(4)}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                  disabled={isGenerating}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-gradient-to-r from-warm-pink to-soft-purple hover:opacity-90 text-white"
                  size="lg"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Suggestions...
                    </>
                  ) : (
                    'Generate Suggestions'
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
