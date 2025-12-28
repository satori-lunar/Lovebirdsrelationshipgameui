import { useState } from 'react';
import { ChevronRight, ChevronLeft, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Progress } from './ui/progress';
import { useAuth } from '../hooks/useAuth';
import { onboardingService } from '../services/onboardingService';
import { toast } from 'sonner';

interface OnboardingProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 9;

export function Onboarding({ onComplete }: OnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    partnerName: '',
    relationship: '',
    livingTogether: '',
    duration: '',
    relationshipGoals: '',
    loveLanguage: [] as string[],
    favoriteActivities: [] as string[],
    budget: '',
    energy: '',
    feelLoved: '',
    wishHappened: '',
    communicationStyle: '',
    fearsTriggers: '',
    healthAccessibility: '',
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).includes(value)
        ? (prev[field as keyof typeof prev] as string[]).filter(v => v !== value)
        : [...(prev[field as keyof typeof prev] as string[]), value]
    }));
  };

  const nextStep = async () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user) {
      toast.error('Please sign in to continue');
      return;
    }

    setIsSaving(true);
    try {
      await onboardingService.saveOnboarding(user.id, {
        name: formData.name,
        partnerName: formData.partnerName,
        livingTogether: formData.livingTogether,
        relationshipDuration: formData.duration,
        relationshipGoals: formData.relationshipGoals,
        loveLanguages: formData.loveLanguage,
        favoriteActivities: formData.favoriteActivities,
        budgetComfort: formData.budget,
        energyLevel: formData.energy,
        feelLoved: formData.feelLoved,
        wishHappened: formData.wishHappened,
        communicationStyle: formData.communicationStyle,
        fearsTriggers: formData.fearsTriggers,
        healthAccessibility: formData.healthAccessibility,
      });
      toast.success('Onboarding complete!');
      onComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save onboarding data');
    } finally {
      setIsSaving(false);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
            <span className="text-sm text-gray-600">Step {step} of {TOTAL_STEPS}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-3xl p-8 shadow-lg min-h-[500px] flex flex-col">
          <div className="flex-1">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl">Welcome! 💛</h2>
                  <p className="text-gray-600">Let's get to know you better</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">What's your name?</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Your name"
                      className="text-base"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="partnerName">What's your partner's name?</Label>
                    <Input
                      id="partnerName"
                      value={formData.partnerName}
                      onChange={(e) => updateField('partnerName', e.target.value)}
                      placeholder="Partner's name"
                      className="text-base"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl">Your Relationship</h2>
                  <p className="text-gray-600">Help us personalize your experience</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Are you living together?</Label>
                    <RadioGroup value={formData.livingTogether} onValueChange={(v) => updateField('livingTogether', v)}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="yes" id="living-yes" />
                        <Label htmlFor="living-yes" className="flex-1 cursor-pointer">Yes, we live together</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="same-city" id="living-same" />
                        <Label htmlFor="living-same" className="flex-1 cursor-pointer">Same city, different homes</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="long-distance" id="living-ld" />
                        <Label htmlFor="living-ld" className="flex-1 cursor-pointer">Long distance</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="duration">How long have you been together?</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => updateField('duration', e.target.value)}
                      placeholder="e.g., 2 years, 6 months"
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="relationshipGoals">What do you want to get out of this relationship right now?</Label>
                    <Textarea
                      id="relationshipGoals"
                      value={formData.relationshipGoals}
                      onChange={(e) => updateField('relationshipGoals', e.target.value)}
                      placeholder="e.g., Build deeper connection, plan more dates, improve communication..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl">Love Languages</h2>
                  <p className="text-gray-600">How do you prefer to give and receive love? (Select all that apply)</p>
                </div>
                
                <div className="space-y-3">
                  {[
                    { id: 'words', label: 'Words of Affirmation', desc: 'Compliments, encouragement, kind words' },
                    { id: 'quality-time', label: 'Quality Time', desc: 'Focused attention, meaningful conversations' },
                    { id: 'gifts', label: 'Receiving Gifts', desc: 'Thoughtful presents, tangible symbols' },
                    { id: 'acts', label: 'Acts of Service', desc: 'Helpful actions, doing things for each other' },
                    { id: 'touch', label: 'Physical Touch', desc: 'Hugs, kisses, holding hands' }
                  ].map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => toggleArrayField('loveLanguage', lang.id)}
                      className={`w-full text-left p-4 border rounded-lg transition-all ${
                        formData.loveLanguage.includes(lang.id)
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{lang.label}</p>
                          <p className="text-sm text-gray-600">{lang.desc}</p>
                        </div>
                        {formData.loveLanguage.includes(lang.id) && (
                          <Heart className="w-5 h-5 text-pink-500 fill-pink-500 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl">Activities You Love</h2>
                  <p className="text-gray-600">What do you enjoy doing? (Select all that apply)</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Dining out', 'Cooking together', 'Movies', 'Live music',
                    'Outdoor adventures', 'Museums', 'Sports', 'Gaming',
                    'Reading', 'Arts & crafts', 'Dancing', 'Traveling',
                    'Coffee dates', 'Shopping', 'Spa days', 'Fitness'
                  ].map(activity => (
                    <button
                      key={activity}
                      onClick={() => toggleArrayField('favoriteActivities', activity)}
                      className={`p-3 border rounded-lg transition-all text-sm ${
                        formData.favoriteActivities.includes(activity)
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {activity}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl">Preferences</h2>
                  <p className="text-gray-600">Help us tailor suggestions to your style</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Budget comfort level for dates</Label>
                    <RadioGroup value={formData.budget} onValueChange={(v) => updateField('budget', v)}>
                      {[
                        { id: 'free', label: 'Free or very low cost', emoji: '💸' },
                        { id: 'low', label: 'Under $50', emoji: '💵' },
                        { id: 'medium', label: '$50-$150', emoji: '💳' },
                        { id: 'high', label: '$150+', emoji: '✨' }
                      ].map(opt => (
                        <div key={opt.id} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <RadioGroupItem value={opt.id} id={`budget-${opt.id}`} />
                          <Label htmlFor={`budget-${opt.id}`} className="flex-1 cursor-pointer">
                            {opt.emoji} {opt.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>Energy level preference</Label>
                    <RadioGroup value={formData.energy} onValueChange={(v) => updateField('energy', v)}>
                      {[
                        { id: 'low', label: 'Low-key & relaxing' },
                        { id: 'balanced', label: 'A mix of both' },
                        { id: 'high', label: 'Active & adventurous' }
                      ].map(opt => (
                        <div key={opt.id} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <RadioGroupItem value={opt.id} id={`energy-${opt.id}`} />
                          <Label htmlFor={`energy-${opt.id}`} className="flex-1 cursor-pointer">{opt.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl">Understanding You</h2>
                  <p className="text-gray-600">These answers help us give better suggestions</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feelLoved">What makes you feel most loved?</Label>
                    <Textarea
                      id="feelLoved"
                      value={formData.feelLoved}
                      onChange={(e) => updateField('feelLoved', e.target.value)}
                      placeholder="Share what really makes you feel loved and appreciated..."
                      rows={4}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wishHappened">What do you wish happened more in your relationship?</Label>
                    <Textarea
                      id="wishHappened"
                      value={formData.wishHappened}
                      onChange={(e) => updateField('wishHappened', e.target.value)}
                      placeholder="Be honest - this is private and helps us personalize..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl">Communication Style</h2>
                  <p className="text-gray-600">How do you prefer to communicate?</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>How do you prefer to communicate during conflicts?</Label>
                    <RadioGroup value={formData.communicationStyle} onValueChange={(v) => updateField('communicationStyle', v)}>
                      {[
                        { id: 'immediate', label: 'Talk it out immediately' },
                        { id: 'space', label: 'Need some space first' },
                        { id: 'written', label: 'Prefer written communication' },
                        { id: 'depends', label: 'It depends on the situation' }
                      ].map(opt => (
                        <div key={opt.id} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <RadioGroupItem value={opt.id} id={`comm-${opt.id}`} />
                          <Label htmlFor={`comm-${opt.id}`} className="flex-1 cursor-pointer">{opt.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>
            )}

            {step === 8 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl">Fears & Triggers</h2>
                  <p className="text-gray-600">Optional - Help us avoid sensitive topics</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fearsTriggers">Things that shut you down emotionally or topics to avoid</Label>
                    <Textarea
                      id="fearsTriggers"
                      value={formData.fearsTriggers}
                      onChange={(e) => updateField('fearsTriggers', e.target.value)}
                      placeholder="This is completely optional and private. Share anything that helps us personalize suggestions..."
                      rows={4}
                    />
                  </div>

                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-900">
                      🔒 <span className="font-semibold">Privacy Note:</span> This information is completely private and used only to avoid suggesting things that might be triggering.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 9 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl">Health & Accessibility</h2>
                  <p className="text-gray-600">Optional - Help us plan accessible dates</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="healthAccessibility">Any mobility limitations, chronic illness, sensory sensitivities, or other considerations?</Label>
                    <Textarea
                      id="healthAccessibility"
                      value={formData.healthAccessibility}
                      onChange={(e) => updateField('healthAccessibility', e.target.value)}
                      placeholder="This is completely optional and private. Share anything that helps us suggest appropriate dates and activities..."
                      rows={4}
                    />
                  </div>

                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-900">
                      🔒 <span className="font-semibold">Privacy Note:</span> This information is completely private and used only to personalize date and activity suggestions.
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg">
                    <p className="text-sm">
                      🎉 <span className="font-semibold">Almost Done!</span> Your 7-day free trial starts now. All your answers are private by default.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={step === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            
            <Button
              onClick={nextStep}
              disabled={isSaving}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white flex items-center gap-2 px-6"
            >
              {isSaving ? 'Saving...' : step === TOTAL_STEPS ? 'Complete' : 'Continue'}
              {step !== TOTAL_STEPS && !isSaving && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
