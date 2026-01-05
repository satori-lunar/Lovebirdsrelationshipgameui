/**
 * ProfileSetup Component - Amora Style
 *
 * Beautiful multi-step profile setup with rose/pink gradients,
 * smooth animations, and intuitive form flow.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  ChevronRight,
  ChevronLeft,
  User,
  Calendar,
  Sparkles,
  Gift,
  Coffee,
  Music,
  Camera,
  Book,
  Utensils,
  Plane,
  Palette,
  Gamepad2,
  Dumbbell,
  Mountain,
  Check
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { useAuth } from '../hooks/useAuth';
import { onboardingService } from '../services/onboardingService';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ProfileSetupProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 6;

const INTEREST_OPTIONS = [
  { id: 'music', label: 'Music', icon: Music },
  { id: 'photography', label: 'Photography', icon: Camera },
  { id: 'reading', label: 'Reading', icon: Book },
  { id: 'cooking', label: 'Cooking', icon: Utensils },
  { id: 'travel', label: 'Travel', icon: Plane },
  { id: 'art', label: 'Art', icon: Palette },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'nature', label: 'Nature', icon: Mountain },
  { id: 'coffee', label: 'Coffee', icon: Coffee },
];

const DATE_PREFERENCES = [
  { id: 'romantic_dinner', label: 'Romantic Dinner', emoji: '🍷' },
  { id: 'movie_night', label: 'Movie Night', emoji: '🎬' },
  { id: 'outdoor_adventure', label: 'Outdoor Adventure', emoji: '🏕️' },
  { id: 'cooking_together', label: 'Cooking Together', emoji: '👩‍🍳' },
  { id: 'spa_day', label: 'Spa Day', emoji: '💆' },
  { id: 'game_night', label: 'Game Night', emoji: '🎮' },
  { id: 'concert', label: 'Concert', emoji: '🎵' },
  { id: 'picnic', label: 'Picnic', emoji: '🧺' },
];

const GIFT_PREFERENCES = [
  { id: 'experiences', label: 'Experiences', emoji: '🎟️' },
  { id: 'handmade', label: 'Handmade', emoji: '🎨' },
  { id: 'practical', label: 'Practical', emoji: '🛠️' },
  { id: 'luxury', label: 'Luxury', emoji: '💎' },
  { id: 'books', label: 'Books', emoji: '📚' },
  { id: 'tech', label: 'Tech', emoji: '📱' },
  { id: 'fashion', label: 'Fashion', emoji: '👗' },
  { id: 'food', label: 'Food & Treats', emoji: '🍫' },
];

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    partnerName: '',
    birthday: '',
    anniversaryDate: '',
    relationshipStatus: '' as 'married' | 'cohabitating' | 'living_separately' | '',
    dateFrequency: '' as 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'rarely' | 'never' | '',
    wantMoreDates: null as boolean | null,
    interests: [] as string[],
    datePreferences: [] as string[],
    giftPreferences: [] as string[],
    bio: '',
  });

  // Pre-fill name from user metadata
  useEffect(() => {
    if (user?.user_metadata?.name && !formData.name) {
      setFormData(prev => ({ ...prev, name: user.user_metadata.name }));
    }
  }, [user]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'interests' | 'datePreferences' | 'giftPreferences', item: string, max: number = 5) => {
    const current = formData[field];
    if (current.includes(item)) {
      updateField(field, current.filter(i => i !== item));
    } else if (current.length < max) {
      updateField(field, [...current, item]);
    } else {
      toast.error(`You can select up to ${max} options`);
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (step === 2) {
      if (!formData.relationshipStatus) {
        toast.error('Please select your living situation');
        return;
      }
      if (!formData.dateFrequency) {
        toast.error('Please select how often you go on dates');
        return;
      }
      if (formData.wantMoreDates === null) {
        toast.error('Please indicate if you want to go on dates more often');
        return;
      }
    }
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    if (!user?.id) {
      toast.error('Please sign in to continue');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        name: formData.name,
        partnerName: formData.partnerName,
        birthday: formData.birthday || undefined,
        relationshipStatus: formData.relationshipStatus || undefined,
        dateFrequency: formData.dateFrequency || undefined,
        wantMoreDates: formData.wantMoreDates,
        love_language: { primary: 'Quality Time' }, // Default, will be set in quiz
        wants_needs: {
          favorite_activities: formData.interests,
          date_types: formData.datePreferences,
          gift_types: formData.giftPreferences,
        },
        preferences: {
          date_types: formData.datePreferences,
        },
        consent: {
          share_with_partner: true,
          email_opt_in: true,
        },
      };

      await onboardingService.saveOnboarding(user.id, dataToSave);
      toast.success('Profile saved! 💕');
      onComplete();
    } catch (error: any) {
      console.error('Profile save error:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Custom Styles */}
      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .heartbeat { animation: heartbeat 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-rose-100">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500 heartbeat" fill="currentColor" />
              <span className="font-semibold text-rose-600">Profile Setup</span>
            </div>
            <span className="text-sm text-gray-500">Step {step} of {TOTAL_STEPS}</span>
          </div>
          {/* Progress Bar */}
          <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-200"
                >
                  <User className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900">Let's get to know you</h2>
                <p className="text-gray-600 mt-1">Tell us a bit about yourself</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Your Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="What should we call you?"
                    className="h-12 text-base border-rose-200 focus:border-rose-400 focus:ring-rose-400 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Partner's Name</Label>
                  <Input
                    value={formData.partnerName}
                    onChange={(e) => updateField('partnerName', e.target.value)}
                    placeholder="Your partner's name"
                    className="h-12 text-base border-rose-200 focus:border-rose-400 focus:ring-rose-400 rounded-xl"
                  />
                  <p className="text-xs text-gray-500">We'll use this to personalize suggestions</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Your Birthday</Label>
                  <Input
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => updateField('birthday', e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="h-12 text-base border-rose-200 focus:border-rose-400 focus:ring-rose-400 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Anniversary Date (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.anniversaryDate}
                    onChange={(e) => updateField('anniversaryDate', e.target.value)}
                    className="h-12 text-base border-rose-200 focus:border-rose-400 focus:ring-rose-400 rounded-xl"
                  />
                  <p className="text-xs text-gray-500">We'll remind you when it's coming up!</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Relationship Questions */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200"
                >
                  <Heart className="w-10 h-10 text-white" fill="white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900">Tell us about your relationship</h2>
                <p className="text-gray-600 mt-1">Help us personalize your experience</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-gray-700 font-medium">What's your living situation?</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { value: 'married', label: 'Married', emoji: '💍' },
                      { value: 'cohabitating', label: 'Living together', emoji: '🏠' },
                      { value: 'living_separately', label: 'Living separately', emoji: '🏙️' },
                    ].map((option) => (
                      <motion.button
                        key={option.value}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updateField('relationshipStatus', option.value)}
                        className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3 ${
                          formData.relationshipStatus === option.value
                            ? 'border-blue-400 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-blue-200'
                        }`}
                      >
                        <span className="text-2xl">{option.emoji}</span>
                        <span className={`font-medium ${formData.relationshipStatus === option.value ? 'text-blue-600' : 'text-gray-700'}`}>
                          {option.label}
                        </span>
                        {formData.relationshipStatus === option.value && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                          >
                            <Check className="w-4 h-4 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-gray-700 font-medium">How often do you go on dates?</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { value: 'daily', label: 'Daily', emoji: '🌅' },
                      { value: 'weekly', label: 'Weekly', emoji: '📅' },
                      { value: 'bi-weekly', label: 'Every 2 weeks', emoji: '📆' },
                      { value: 'monthly', label: 'Monthly', emoji: '🗓️' },
                      { value: 'rarely', label: 'Rarely', emoji: '🌙' },
                      { value: 'never', label: 'Never', emoji: '❄️' },
                    ].map((option) => (
                      <motion.button
                        key={option.value}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updateField('dateFrequency', option.value)}
                        className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3 ${
                          formData.dateFrequency === option.value
                            ? 'border-indigo-400 bg-indigo-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-indigo-200'
                        }`}
                      >
                        <span className="text-2xl">{option.emoji}</span>
                        <span className={`font-medium ${formData.dateFrequency === option.value ? 'text-indigo-600' : 'text-gray-700'}`}>
                          {option.label}
                        </span>
                        {formData.dateFrequency === option.value && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center"
                          >
                            <Check className="w-4 h-4 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-gray-700 font-medium">Would you like to go on dates more often?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: true, label: 'Yes', emoji: '✅' },
                      { value: false, label: 'No', emoji: '❌' },
                    ].map((option) => (
                      <motion.button
                        key={option.value.toString()}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updateField('wantMoreDates', option.value)}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                          formData.wantMoreDates === option.value
                            ? 'border-purple-400 bg-purple-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-purple-200'
                        }`}
                      >
                        <span className="text-2xl">{option.emoji}</span>
                        <span className={`font-medium ${formData.wantMoreDates === option.value ? 'text-purple-600' : 'text-gray-700'}`}>
                          {option.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Interests */}
          {step === 3 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-200"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900">What do you love?</h2>
                <p className="text-gray-600 mt-1">Select up to 5 interests</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {INTEREST_OPTIONS.map((interest) => {
                  const Icon = interest.icon;
                  const isSelected = formData.interests.includes(interest.id);
                  return (
                    <motion.button
                      key={interest.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleArrayItem('interests', interest.id, 5)}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        isSelected
                          ? 'border-rose-400 bg-rose-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-rose-200'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-rose-500' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-rose-600' : 'text-gray-600'}`}>
                        {interest.label}
                      </span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-center text-sm text-gray-500">
                {formData.interests.length}/5 selected
              </p>
            </motion.div>
          )}

          {/* Step 4: Date Preferences */}
          {step === 4 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className="w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200"
                >
                  <Calendar className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900">Ideal date nights?</h2>
                <p className="text-gray-600 mt-1">Pick your favorite date activities</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {DATE_PREFERENCES.map((pref) => {
                  const isSelected = formData.datePreferences.includes(pref.id);
                  return (
                    <motion.button
                      key={pref.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleArrayItem('datePreferences', pref.id, 4)}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        isSelected
                          ? 'border-purple-400 bg-purple-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-purple-200'
                      }`}
                    >
                      <span className="text-2xl">{pref.emoji}</span>
                      <span className={`text-sm font-medium ${isSelected ? 'text-purple-600' : 'text-gray-600'}`}>
                        {pref.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-center text-sm text-gray-500">
                {formData.datePreferences.length}/4 selected
              </p>
            </motion.div>
          )}

          {/* Step 5: Gift Preferences */}
          {step === 5 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className="w-20 h-20 bg-gradient-to-br from-violet-500 to-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200"
                >
                  <Gift className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900">Gift preferences?</h2>
                <p className="text-gray-600 mt-1">What kinds of gifts do you love?</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {GIFT_PREFERENCES.map((pref) => {
                  const isSelected = formData.giftPreferences.includes(pref.id);
                  return (
                    <motion.button
                      key={pref.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleArrayItem('giftPreferences', pref.id, 4)}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        isSelected
                          ? 'border-violet-400 bg-violet-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-violet-200'
                      }`}
                    >
                      <span className="text-2xl">{pref.emoji}</span>
                      <span className={`text-sm font-medium ${isSelected ? 'text-violet-600' : 'text-gray-600'}`}>
                        {pref.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-center text-sm text-gray-500">
                {formData.giftPreferences.length}/4 selected
              </p>
            </motion.div>
          )}

          {/* Step 6: Bio / Final */}
          {step === 6 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-200"
                >
                  <Heart className="w-10 h-10 text-white" fill="white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900">Almost done!</h2>
                <p className="text-gray-600 mt-1">Anything else you'd like to share?</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">About You (Optional)</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Share what makes your relationship special, your dreams together, or anything your partner should know..."
                    rows={4}
                    className="text-base border-rose-200 focus:border-rose-400 focus:ring-rose-400 rounded-xl resize-none"
                  />
                </div>

                {/* Summary Card */}
                <Card className="p-5 bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Your Profile Summary</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Name:</span> <span className="font-medium">{formData.name || '—'}</span></p>
                    <p><span className="text-gray-500">Partner:</span> <span className="font-medium">{formData.partnerName || '—'}</span></p>
                    <p><span className="text-gray-500">Living situation:</span> <span className="font-medium">
                      {formData.relationshipStatus === 'married' ? 'Married' :
                       formData.relationshipStatus === 'cohabitating' ? 'Living together' :
                       formData.relationshipStatus === 'living_separately' ? 'Living separately' : '—'}
                    </span></p>
                    <p><span className="text-gray-500">Date frequency:</span> <span className="font-medium">
                      {formData.dateFrequency === 'daily' ? 'Daily' :
                       formData.dateFrequency === 'weekly' ? 'Weekly' :
                       formData.dateFrequency === 'bi-weekly' ? 'Every 2 weeks' :
                       formData.dateFrequency === 'monthly' ? 'Monthly' :
                       formData.dateFrequency === 'rarely' ? 'Rarely' :
                       formData.dateFrequency === 'never' ? 'Never' : '—'}
                    </span></p>
                    <p><span className="text-gray-500">Wants more dates:</span> <span className="font-medium">
                      {formData.wantMoreDates === true ? 'Yes' :
                       formData.wantMoreDates === false ? 'No' : '—'}
                    </span></p>
                    <p><span className="text-gray-500">Interests:</span> <span className="font-medium">{formData.interests.length} selected</span></p>
                    <p><span className="text-gray-500">Date ideas:</span> <span className="font-medium">{formData.datePreferences.length} selected</span></p>
                    <p><span className="text-gray-500">Gift style:</span> <span className="font-medium">{formData.giftPreferences.length} selected</span></p>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button
              onClick={prevStep}
              variant="outline"
              className="flex-1 h-12 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
          )}
          <Button
            onClick={nextStep}
            disabled={isSaving}
            className={`${step > 1 ? 'flex-1' : 'w-full'} h-12 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg shadow-rose-200`}
          >
            {isSaving ? (
              'Saving...'
            ) : step === TOTAL_STEPS ? (
              <>
                Complete Setup
                <Sparkles className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
