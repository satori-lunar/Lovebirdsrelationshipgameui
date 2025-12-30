import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Heart, Edit } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { onboardingService } from '../services/onboardingService';
import { toast } from 'sonner';
import type { OnboardingData, LoveLanguage, WantsNeeds, Preferences } from '../types/onboarding';

interface OnboardingProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 6;

const LOVE_LANGUAGES = [
  'Words of Affirmation',
  'Quality Time',
  'Acts of Service',
  'Receiving Gifts',
  'Physical Touch'
] as const;

const PRONOUNS_OPTIONS = [
  'She/Her',
  'He/Him',
  'They/Them',
  'Use my name',
  'Other (type)'
];

const GESTURES_OPTIONS = [
  'A surprise coffee',
  'Help with chores',
  'A thoughtful note',
  'Holding hands',
  'Random hugs',
  'A planned date'
];

const SURPRISE_FREQUENCY_OPTIONS = [
  'Daily small ones',
  'Weekly',
  'Monthly',
  'Not a fan'
];

const DATE_STYLE_OPTIONS = [
  'Relaxed & cozy',
  'Adventurous & active',
  'Cultural (museums/theater)',
  'Food-first (restaurants/foodie)',
  'At-home, sentimental'
];

const GIFT_TYPES_OPTIONS = [
  'Experiences (tickets, trips)',
  'Practical items',
  'Handmade/personal',
  'Jewelry/keepsakes',
  'Books',
  'Something consumable (treats)'
];

const PLANNING_STYLE_OPTIONS = [
  'Spontaneously',
  'Planned in advance',
  'A mix'
];

const AVOID_OPTIONS = [
  'Public attention',
  'Overly physical surprises',
  "Big expensive gifts I'd feel awkward about",
  'None / tell below'
];

const DATE_TYPES_OPTIONS = [
  'Picnic/Outdoors',
  'Dinner out',
  'Movie / Concert',
  'Hiking / Active',
  'Museum / Gallery',
  'Cooking together',
  'Game night',
  'At-home spa'
];

const GIFT_BUDGET_OPTIONS = [
  'Under $25',
  '$25–$75',
  '$75–$200',
  'No limit / special occasions'
];

const NUDGE_FREQUENCY_OPTIONS = [
  'Daily',
  'Weekly',
  'Monthly',
  'Only for milestones'
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const { user, loading: authLoading } = useAuth();

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-lg text-center">
          <Heart className="w-16 h-16 text-pink-500 fill-pink-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold mb-4">Setting up your account...</h2>
          <p className="text-gray-600">Please wait while we get everything ready for you.</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-lg text-center">
          <Heart className="w-16 h-16 text-pink-500 fill-pink-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to complete onboarding.</p>
        </div>
      </div>
    );
  }
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [birthday, setBirthday] = useState<Date | undefined>(undefined);
  const [pronounsOther, setPronounsOther] = useState('');
  const [formData, setFormData] = useState<OnboardingData>({
    name: '',
    birthday: undefined,
    pronouns: undefined,
    love_language: {
      primary: 'Words of Affirmation',
      secondary: undefined
    },
    wants_needs: {},
    preferences: {},
    consent: {
      share_with_partner: false,
      email_opt_in: true
    }
  });

  // Pre-fill name from user metadata if available
  useEffect(() => {
    if (user?.user_metadata?.name && !formData.name) {
      updateField('name', user.user_metadata.name);
    }
  }, [user]);

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      // User is not authenticated, redirect will be handled by App.tsx
      // This component shouldn't render if user is not authenticated
    }
  }, [user, authLoading]);

  const updateField = (field: keyof OnboardingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateWantsNeeds = (field: keyof WantsNeeds, value: any) => {
    setFormData(prev => ({
      ...prev,
      wants_needs: { ...prev.wants_needs, [field]: value }
    }));
  };

  const updatePreferences = (field: keyof Preferences, value: any) => {
    setFormData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [field]: value }
    }));
  };

  const toggleArrayField = (field: 'gestures' | 'gift_types' | 'date_types', value: string) => {
    const currentArray = formData.wants_needs?.[field] || formData.preferences?.[field] || [];
    const newArray = (currentArray as string[]).includes(value)
      ? (currentArray as string[]).filter(v => v !== value)
      : [...(currentArray as string[]), value];
    
    if (field === 'date_types') {
      // Limit date_types to 3
      if (newArray.length > 3) {
        toast.error('Please select up to 3 date types');
        return;
      }
      updatePreferences(field, newArray);
    } else {
      updateWantsNeeds(field, newArray);
    }
  };

  const nextStep = async () => {
    // Validation
    if (step === 1) {
      if (!formData.name) {
        toast.error('Please enter your name');
        return;
      }
    }
    
    if (step === 2) {
      if (!formData.love_language?.primary) {
        toast.error('Please select your primary love language');
        return;
      }
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user || !user.id) {
      toast.error('Please sign in to continue');
      return;
    }

    // Double-check auth session is still valid
    if (authLoading) {
      toast.error('Authenticating... Please wait.');
      return;
    }

    console.log('🎯 Onboarding handleComplete called');
    console.log('👤 User from context:', { id: user?.id, email: user?.email, name: user?.user_metadata?.name });

    setIsSaving(true);
    try {
      // User is authenticated since they reached onboarding
      if (!user?.id) {
        throw new Error('Authentication required. Please sign in again.');
      }
      const userId = user.id;
      console.log('🔄 Starting onboarding save for userId:', userId);

      const dataToSave: OnboardingData = {
        ...formData,
        birthday: birthday ? format(birthday, 'yyyy-MM-dd') : undefined,
        pronouns: formData.pronouns === 'Other (type)' ? pronounsOther : formData.pronouns
      };

      console.log('Saving onboarding data:', dataToSave);

      await onboardingService.saveOnboarding(userId, dataToSave);
      toast.success('Onboarding complete!');
      onComplete();
    } catch (error: any) {
      console.error('Onboarding save error:', error);
      if (error.message?.includes('Auth session missing') || error.message?.includes('Session expired')) {
        toast.error('Your session expired. Please sign in again.');
        // Could redirect to sign in here
      } else {
        toast.error(error.message || 'Failed to save onboarding data');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const goToStep = (targetStep: number) => {
    setStep(targetStep);
  };

  const progress = (step / TOTAL_STEPS) * 100;

  // Summary data for confirm screen
  const summaryData = {
    name: formData.name,
    pronouns: formData.pronouns === 'Other (type)' ? pronounsOther : formData.pronouns,
    loveLanguage: formData.love_language?.primary,
    dateTypes: formData.preferences?.date_types || [],
    giftTypes: formData.wants_needs?.gift_types || []
  };

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
            {/* Screen 1: Welcome */}
            {step === 1 && (
              <div className="space-y-6 flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold">Welcome to Lovebirds 💕</h2>
                  <p className="text-gray-600 text-lg">
                    We'll ask a few quick questions so we can help plan dates, gift ideas, and sweet nudges for your partner.
                  </p>
                </div>

                <div className="space-y-4 w-full max-w-xs">
                  <div className="space-y-2">
                    <Label htmlFor="name">What should we call you?</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Your name"
                      className="text-base text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Screen 2: Basic Info */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Tell us about you</h2>
                  <p className="text-gray-600">We'll use this to personalize your experience</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">What should we call you?</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Your name"
                      className="text-base"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Birthday</Label>
                    <input
                      type="date"
                      value={birthday ? format(birthday, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined;
                        console.log('Birthday input changed:', date);
                        setBirthday(date);
                      }}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500">
                      Helps suggest age-appropriate ideas (only you see this).
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>Pronouns</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRONOUNS_OPTIONS.map(pronoun => (
                        <button
                          key={pronoun}
                          onClick={() => {
                            updateField('pronouns', pronoun);
                            if (pronoun !== 'Other (type)') {
                              setPronounsOther('');
                            }
                          }}
                          className={`p-3 border rounded-lg transition-all text-sm ${
                            formData.pronouns === pronoun
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {pronoun}
                        </button>
                      ))}
                      </div>
                    {formData.pronouns === 'Other (type)' && (
                    <Input
                        value={pronounsOther}
                        onChange={(e) => setPronounsOther(e.target.value)}
                        placeholder="Type your pronouns"
                      className="text-base"
                    />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Screen 3: Love Language */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Which of these best describes how you feel loved?</h2>
                  <p className="text-gray-600">Pick the one that resonates most. You can also add a second preference.</p>
                </div>
                
                <div className="space-y-3">
                  {LOVE_LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      onClick={() => {
                        const currentPrimary = formData.love_language?.primary;
                        const currentSecondary = formData.love_language?.secondary;
                        
                        if (currentPrimary === lang) {
                          // Already primary, do nothing
                          return;
                        } else if (currentSecondary === lang) {
                          // It's secondary, make it primary
                          updateField('love_language', {
                            primary: lang,
                            secondary: currentPrimary
                          });
                        } else {
                          // New selection, make it primary
                          updateField('love_language', {
                            primary: lang,
                            secondary: currentSecondary
                          });
                        }
                      }}
                      className={`w-full text-left p-4 border rounded-xl transition-all ${
                        formData.love_language?.primary === lang
                          ? 'border-pink-500 bg-pink-50 shadow-md'
                          : formData.love_language?.secondary === lang
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{lang}</p>
                        </div>
                        {formData.love_language?.primary === lang && (
                          <Heart className="w-5 h-5 text-pink-500 fill-pink-500 flex-shrink-0 ml-2" />
                        )}
                        {formData.love_language?.secondary === lang && (
                          <span className="text-xs text-purple-600 ml-2">Secondary</span>
                        )}
                      </div>
                    </button>
                  ))}
                  
                  {formData.love_language?.primary && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600 mb-2">Select a second preference (optional):</p>
                      <div className="grid grid-cols-2 gap-2">
                        {LOVE_LANGUAGES.filter(lang => lang !== formData.love_language?.primary).map(lang => (
                          <button
                            key={lang}
                            onClick={() => {
                              updateField('love_language', {
                                ...formData.love_language!,
                                secondary: formData.love_language?.secondary === lang ? undefined : lang
                              });
                            }}
                            className={`p-2 border rounded-lg transition-all text-sm ${
                              formData.love_language?.secondary === lang
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Screen 4: Wants & Needs */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Wants & Needs</h2>
                  <p className="text-gray-600">Quick choices — pick what makes you feel loved</p>
                </div>
                
                <div className="space-y-6 max-h-[500px] overflow-y-auto">
                  {/* Gestures */}
                  <div className="space-y-2">
                    <Label>Which small gestures make you feel cared for? (select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {GESTURES_OPTIONS.map(gesture => (
                    <button
                          key={gesture}
                          onClick={() => toggleArrayField('gestures', gesture)}
                      className={`p-3 border rounded-lg transition-all text-sm ${
                            formData.wants_needs?.gestures?.includes(gesture)
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                          {gesture}
                    </button>
                  ))}
                </div>
              </div>

                  {/* Surprise Frequency */}
                  <div className="space-y-2">
                    <Label>How often do you like surprises?</Label>
                <div className="space-y-2">
                      {SURPRISE_FREQUENCY_OPTIONS.map(option => (
                        <button
                          key={option}
                          onClick={() => updateWantsNeeds('surprise_frequency', option)}
                          className={`w-full p-3 border rounded-lg transition-all text-left ${
                            formData.wants_needs?.surprise_frequency === option
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Style */}
                  <div className="space-y-2">
                    <Label>When planning a date, I prefer:</Label>
                    <div className="space-y-2">
                      {DATE_STYLE_OPTIONS.map(option => (
                        <button
                          key={option}
                          onClick={() => updateWantsNeeds('date_style', option)}
                          className={`w-full p-3 border rounded-lg transition-all text-left ${
                            formData.wants_needs?.date_style === option
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gift Types */}
                  <div className="space-y-2">
                    <Label>Gifts I love (select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {GIFT_TYPES_OPTIONS.map(gift => (
                        <button
                          key={gift}
                          onClick={() => toggleArrayField('gift_types', gift)}
                          className={`p-3 border rounded-lg transition-all text-sm ${
                            formData.wants_needs?.gift_types?.includes(gift)
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {gift}
                        </button>
                      ))}
                </div>
              </div>

                  {/* Planning Style */}
                  <div className="space-y-2">
                    <Label>I prefer planning/doing things:</Label>
                <div className="space-y-2">
                      {PLANNING_STYLE_OPTIONS.map(option => (
                        <button
                          key={option}
                          onClick={() => updateWantsNeeds('planning_style', option)}
                          className={`w-full p-3 border rounded-lg transition-all text-left ${
                            formData.wants_needs?.planning_style === option
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                </div>
                
                  {/* Avoid */}
                  <div className="space-y-2">
                    <Label>Is there anything your partner should never do?</Label>
                    <div className="space-y-2">
                      {AVOID_OPTIONS.map(option => {
                        const isSelected = option === 'None / tell below' 
                          ? (!formData.wants_needs?.avoid || formData.wants_needs.avoid === '')
                          : formData.wants_needs?.avoid === option;
                        
                        return (
                          <button
                            key={option}
                            onClick={() => {
                              if (option === 'None / tell below') {
                                updateWantsNeeds('avoid', '');
                              } else {
                                updateWantsNeeds('avoid', option);
                              }
                            }}
                            className={`w-full p-3 border rounded-lg transition-all text-left ${
                              isSelected
                                ? 'border-pink-500 bg-pink-50 text-pink-700'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    {formData.wants_needs?.avoid && formData.wants_needs.avoid !== '' && (
                    <Textarea
                        value={formData.wants_needs.avoid}
                        onChange={(e) => updateWantsNeeds('avoid', e.target.value)}
                        placeholder="Tell us more..."
                        rows={2}
                      />
                    )}
                  </div>
                  
                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Anything else we should know? (optional)</Label>
                    <Textarea
                      value={formData.wants_needs?.notes || ''}
                      onChange={(e) => updateWantsNeeds('notes', e.target.value)}
                      placeholder="I love small homemade notes…"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Screen 5: Preferences for Dates & Gifts */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Preferences for Dates & Gifts</h2>
                  <p className="text-gray-600">Help us tailor suggestions just for you</p>
                </div>
                
                <div className="space-y-6">
                  {/* Date Types */}
                  <div className="space-y-2">
                    <Label>Pick a few date types you'd enjoy (choose up to 3)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DATE_TYPES_OPTIONS.map(dateType => (
                        <button
                          key={dateType}
                          onClick={() => toggleArrayField('date_types', dateType)}
                          disabled={!formData.preferences?.date_types?.includes(dateType) && (formData.preferences?.date_types?.length || 0) >= 3}
                          className={`p-3 border rounded-lg transition-all text-sm ${
                            formData.preferences?.date_types?.includes(dateType)
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {dateType}
                        </button>
                      ))}
                    </div>
                    {formData.preferences?.date_types && formData.preferences.date_types.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {formData.preferences.date_types.length} of 3 selected
                      </p>
                    )}
                  </div>

                  {/* Gift Budget */}
                  <div className="space-y-2">
                    <Label>Pick gift budgets you're comfortable with</Label>
                    <div className="space-y-2">
                      {GIFT_BUDGET_OPTIONS.map(option => (
                        <button
                          key={option}
                          onClick={() => updatePreferences('gift_budget', option)}
                          className={`w-full p-3 border rounded-lg transition-all text-left ${
                            formData.preferences?.gift_budget === option
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nudge Frequency */}
                  <div className="space-y-2">
                    <Label>How often would you like small nudges or date suggestions from us?</Label>
                    <div className="space-y-2">
                      {NUDGE_FREQUENCY_OPTIONS.map(option => (
                        <button
                          key={option}
                          onClick={() => updatePreferences('nudge_frequency', option)}
                          className={`w-full p-3 border rounded-lg transition-all text-left ${
                            formData.preferences?.nudge_frequency === option
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Screen 6: Confirm */}
            {step === 6 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Confirm & Finish</h2>
                  <p className="text-gray-600">Review your answers. You can change any answer later in Settings.</p>
                </div>
                
                <div className="space-y-4">
                  {/* Name */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Name</h3>
                      <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <p className="text-gray-600">{summaryData.name}</p>
                  </div>

                  {/* Pronouns */}
                  {summaryData.pronouns && (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Pronouns</h3>
                        <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <p className="text-gray-600">{summaryData.pronouns}</p>
                    </div>
                  )}

                  {/* Love Language */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Love Language</h3>
                      <Button variant="ghost" size="sm" onClick={() => goToStep(3)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <p className="text-gray-600">
                      {summaryData.loveLanguage}
                      {formData.love_language?.secondary && `, ${formData.love_language.secondary}`}
                    </p>
                  </div>

                  {/* Date Types */}
                  {summaryData.dateTypes.length > 0 && (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Date Types</h3>
                        <Button variant="ghost" size="sm" onClick={() => goToStep(5)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <p className="text-gray-600">{summaryData.dateTypes.join(', ')}</p>
                    </div>
                  )}

                  {/* Gift Types */}
                  {summaryData.giftTypes.length > 0 && (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Gift Preferences</h3>
                        <Button variant="ghost" size="sm" onClick={() => goToStep(4)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <p className="text-gray-600">{summaryData.giftTypes.join(', ')}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-900">
                    You can change any answer later in Settings.
                  </p>
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
            
            {step === TOTAL_STEPS ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleComplete}
                  disabled={isSaving}
                >
                  Skip & finish later
                </Button>
            <Button
                  onClick={handleComplete}
              disabled={isSaving}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white flex items-center gap-2 px-6"
            >
                  {isSaving ? 'Saving...' : 'Save & Start'}
                </Button>
              </div>
            ) : (
              <Button
                onClick={nextStep}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white flex items-center gap-2 px-6"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
            </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
