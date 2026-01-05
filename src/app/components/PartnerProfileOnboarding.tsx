/**
 * Partner Profile Onboarding
 *
 * Comprehensive onboarding flow with love language quiz and detailed profile setup.
 * For "do it together" mode with full quiz-based approach.
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
  ChevronLeft,
  Music,
  Utensils,
  Dumbbell,
  BookOpen,
  Gamepad2,
  Plane,
  Film,
  Coffee,
  ShoppingBag,
  Plus,
  X,
  Hand,
  Gift,
  User
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import type {
  LoveLanguage,
  CommunicationStyle,
  FrequencyPreference,
  StressNeed,
  CheckinTime,
  RelationshipStatus,
  CohabitationStatus,
  ProximityStatus,
  SeeingFrequency
} from '../types/partnerProfile';
import { partnerProfileService } from '../services/partnerProfileService';
import { PartnerProfileComparison } from './PartnerProfileComparison';
import { api } from '../services/api';

interface PartnerProfileOnboardingProps {
  userId: string;
  coupleId: string;
  partnerName?: string;
  onComplete: () => void;
}

type Step =
  | 'welcome'
  | 'relationship_details'
  | 'basic_info'
  | 'love_language_quiz'
  | 'hobbies'
  | 'favorites'
  | 'likes_dislikes'
  | 'communication_style'
  | 'stress_needs'
  | 'frequency'
  | 'complete';

// Love Language Quiz Questions (10 questions)
const LOVE_LANGUAGE_QUESTIONS = [
  {
    question: "What makes you feel most loved?",
    options: [
      { text: "Hearing 'I love you' and sincere compliments", language: "words" as LoveLanguage, icon: MessageCircle },
      { text: "When someone helps me with tasks or chores", language: "acts" as LoveLanguage, icon: Hand },
      { text: "Receiving thoughtful gifts, big or small", language: "gifts" as LoveLanguage, icon: Gift },
      { text: "Spending uninterrupted time together", language: "quality_time" as LoveLanguage, icon: Clock },
      { text: "Hugs, holding hands, and physical closeness", language: "touch" as LoveLanguage, icon: Heart }
    ]
  },
  {
    question: "When you're feeling down, what helps the most?",
    options: [
      { text: "Words of encouragement and support", language: "words" as LoveLanguage, icon: MessageCircle },
      { text: "Someone taking care of things for me", language: "acts" as LoveLanguage, icon: Hand },
      { text: "A surprise gift to cheer me up", language: "gifts" as LoveLanguage, icon: Gift },
      { text: "Someone just being present with me", language: "quality_time" as LoveLanguage, icon: Clock },
      { text: "A warm hug or comforting touch", language: "touch" as LoveLanguage, icon: Heart }
    ]
  },
  {
    question: "How do you prefer to show love?",
    options: [
      { text: "Expressing my feelings and giving compliments", language: "words" as LoveLanguage, icon: MessageCircle },
      { text: "Doing helpful things for my partner", language: "acts" as LoveLanguage, icon: Hand },
      { text: "Finding and giving perfect gifts", language: "gifts" as LoveLanguage, icon: Gift },
      { text: "Planning special activities together", language: "quality_time" as LoveLanguage, icon: Clock },
      { text: "Physical affection and closeness", language: "touch" as LoveLanguage, icon: Heart }
    ]
  },
  {
    question: "What would hurt you most if it was missing?",
    options: [
      { text: "Not hearing words of appreciation", language: "words" as LoveLanguage, icon: MessageCircle },
      { text: "Partner not helping when I need it", language: "acts" as LoveLanguage, icon: Hand },
      { text: "Never receiving gifts on special occasions", language: "gifts" as LoveLanguage, icon: Gift },
      { text: "Partner always being too busy for me", language: "quality_time" as LoveLanguage, icon: Clock },
      { text: "Lack of physical affection", language: "touch" as LoveLanguage, icon: Heart }
    ]
  },
  {
    question: "What's your ideal date night?",
    options: [
      { text: "Deep conversations and sharing feelings", language: "words" as LoveLanguage, icon: MessageCircle },
      { text: "Partner cooking dinner and pampering me", language: "acts" as LoveLanguage, icon: Hand },
      { text: "Exchanging meaningful presents", language: "gifts" as LoveLanguage, icon: Gift },
      { text: "Undivided attention, phones away", language: "quality_time" as LoveLanguage, icon: Clock },
      { text: "Cuddling and being physically close", language: "touch" as LoveLanguage, icon: Heart }
    ]
  },
  {
    question: "Which gesture would mean the most?",
    options: [
      { text: "A heartfelt love letter", language: "words" as LoveLanguage, icon: MessageCircle },
      { text: "Coming home to a clean house", language: "acts" as LoveLanguage, icon: Hand },
      { text: "A surprise gift 'just because'", language: "gifts" as LoveLanguage, icon: Gift },
      { text: "A whole day planned just for us", language: "quality_time" as LoveLanguage, icon: Clock },
      { text: "A long, tender embrace", language: "touch" as LoveLanguage, icon: Heart }
    ]
  },
  {
    question: "What do you remember most from your best memories?",
    options: [
      { text: "The sweet things that were said", language: "words" as LoveLanguage, icon: MessageCircle },
      { text: "How someone went out of their way for me", language: "acts" as LoveLanguage, icon: Hand },
      { text: "The meaningful gifts I received", language: "gifts" as LoveLanguage, icon: Gift },
      { text: "The quality time we spent together", language: "quality_time" as LoveLanguage, icon: Clock },
      { text: "The warmth and physical connection", language: "touch" as LoveLanguage, icon: Heart }
    ]
  },
  {
    question: "What would be your perfect surprise?",
    options: [
      { text: "A public declaration of love", language: "words" as LoveLanguage, icon: MessageCircle },
      { text: "Partner handling my to-do list", language: "acts" as LoveLanguage, icon: Hand },
      { text: "A beautiful, unexpected present", language: "gifts" as LoveLanguage, icon: Gift },
      { text: "A spontaneous adventure together", language: "quality_time" as LoveLanguage, icon: Clock },
      { text: "A surprise massage or spa day", language: "touch" as LoveLanguage, icon: Heart }
    ]
  },
  {
    question: "What makes your relationship feel strongest?",
    options: [
      { text: "Regular verbal affirmations", language: "words" as LoveLanguage, icon: MessageCircle },
      { text: "When we support each other practically", language: "acts" as LoveLanguage, icon: Hand },
      { text: "Thoughtful gifts that show they know me", language: "gifts" as LoveLanguage, icon: Gift },
      { text: "Making time for each other no matter what", language: "quality_time" as LoveLanguage, icon: Clock },
      { text: "Frequent physical affection", language: "touch" as LoveLanguage, icon: Heart }
    ]
  },
  {
    question: "How do you know your partner truly cares?",
    options: [
      { text: "They tell me in words, often", language: "words" as LoveLanguage, icon: MessageCircle },
      { text: "They notice and do things I need", language: "acts" as LoveLanguage, icon: Hand },
      { text: "They remember and gift me things I love", language: "gifts" as LoveLanguage, icon: Gift },
      { text: "They prioritize time with me", language: "quality_time" as LoveLanguage, icon: Clock },
      { text: "They're always physically affectionate", language: "touch" as LoveLanguage, icon: Heart }
    ]
  }
];

const HOBBY_OPTIONS = [
  { label: "Music", icon: Music },
  { label: "Cooking", icon: Utensils },
  { label: "Fitness", icon: Dumbbell },
  { label: "Reading", icon: BookOpen },
  { label: "Gaming", icon: Gamepad2 },
  { label: "Travel", icon: Plane },
  { label: "Movies", icon: Film },
  { label: "Coffee", icon: Coffee },
  { label: "Shopping", icon: ShoppingBag },
];

const ACTIVITY_OPTIONS = [
  "Hiking", "Beach", "Museums", "Concerts", "Dining Out", "Cooking Together",
  "Movie Nights", "Board Games", "Wine Tasting", "Dancing", "Spa Days",
  "Road Trips", "Picnics", "Stargazing", "Photography", "Art Classes"
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

const RELATIONSHIP_STATUS_OPTIONS: { value: RelationshipStatus; label: string; description: string; icon: string }[] = [
  {
    value: 'dating',
    label: 'Dating',
    description: 'Currently dating, not married',
    icon: '💕'
  },
  {
    value: 'married',
    label: 'Married',
    description: 'Married or in a committed marriage',
    icon: '💍'
  }
];

const COHABITATION_STATUS_OPTIONS: { value: CohabitationStatus; label: string; description: string; icon: string }[] = [
  {
    value: 'living_together',
    label: 'Living Together',
    description: 'We share the same home',
    icon: '🏠'
  },
  {
    value: 'living_apart',
    label: 'Living Apart',
    description: 'We have separate living arrangements',
    icon: '🏘️'
  }
];

const PROXIMITY_STATUS_OPTIONS: { value: ProximityStatus; label: string; description: string; icon: string }[] = [
  {
    value: 'same_city',
    label: 'Same City/Area',
    description: 'We live in the same city or nearby',
    icon: '🏙️'
  },
  {
    value: 'different_cities',
    label: 'Different Cities',
    description: 'Different cities, same state/country',
    icon: '🚗'
  },
  {
    value: 'long_distance',
    label: 'Long Distance',
    description: 'Long distance relationship',
    icon: '✈️'
  }
];

const SEEING_FREQUENCY_OPTIONS: { value: SeeingFrequency; label: string; description: string; icon: string }[] = [
  {
    value: 'daily',
    label: 'Daily',
    description: 'We see each other every day',
    icon: '📅'
  },
  {
    value: 'few_times_week',
    label: 'Few Times a Week',
    description: 'Several times per week',
    icon: '🗓️'
  },
  {
    value: 'once_week',
    label: 'Once a Week',
    description: 'About once per week',
    icon: '📅'
  },
  {
    value: 'few_times_month',
    label: 'Few Times a Month',
    description: 'Several times per month',
    icon: '🗓️'
  },
  {
    value: 'once_month',
    label: 'Once a Month',
    description: 'About once per month',
    icon: '📅'
  },
  {
    value: 'rarely',
    label: 'Rarely',
    description: 'We rarely see each other',
    icon: '🌙'
  }
];

export function PartnerProfileOnboarding({
  userId,
  coupleId,
  partnerName,
  onComplete
}: PartnerProfileOnboardingProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [saving, setSaving] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Relationship details
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus | null>(null);
  const [cohabitationStatus, setCohabitationStatus] = useState<CohabitationStatus | null>(null);
  const [proximityStatus, setProximityStatus] = useState<ProximityStatus | null>(null);
  const [seeingFrequency, setSeeingFrequency] = useState<SeeingFrequency | null>(null);

  // Basic info
  const [displayName, setDisplayName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [personalityType, setPersonalityType] = useState('');

  // Love language quiz
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loveLanguageScores, setLoveLanguageScores] = useState({
    words: 0,
    acts: 0,
    gifts: 0,
    quality_time: 0,
    touch: 0
  });
  const [selectedAnswer, setSelectedAnswer] = useState<LoveLanguage | null>(null);
  const [loveLanguagePrimary, setLoveLanguagePrimary] = useState<LoveLanguage | null>(null);
  const [loveLanguageSecondary, setLoveLanguageSecondary] = useState<LoveLanguage | null>(null);

  // Hobbies and interests
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [favoriteActivities, setFavoriteActivities] = useState<string[]>([]);
  const [customHobby, setCustomHobby] = useState('');

  // Favorites
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>([]);
  const [musicPreferences, setMusicPreferences] = useState<string[]>([]);
  const [customFood, setCustomFood] = useState('');
  const [customMusic, setCustomMusic] = useState('');

  // Likes and dislikes
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [customLike, setCustomLike] = useState('');
  const [customDislike, setCustomDislike] = useState('');

  // Communication and stress
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyle | null>(null);
  const [stressNeeds, setStressNeeds] = useState<StressNeed[]>([]);

  // Frequency
  const [frequencyPreference, setFrequencyPreference] = useState<FrequencyPreference>('moderate');
  const [checkinTimes, setCheckinTimes] = useState<CheckinTime[]>(['evening']);

  const handleLoveLanguageAnswer = (language: LoveLanguage) => {
    setSelectedAnswer(language);
    setLoveLanguageScores(prev => ({
      ...prev,
      [language]: prev[language] + 1
    }));

    setTimeout(() => {
      if (currentQuestion < LOVE_LANGUAGE_QUESTIONS.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        // Calculate top 2 love languages
        const sorted = Object.entries(loveLanguageScores).sort((a, b) => {
          const scoreA = a[0] === language ? a[1] + 1 : a[1];
          const scoreB = b[0] === language ? b[1] + 1 : b[1];
          return scoreB - scoreA;
        });
        setLoveLanguagePrimary(sorted[0][0] as LoveLanguage);
        setLoveLanguageSecondary(sorted[1][0] as LoveLanguage);
        setStep('hobbies');
      }
    }, 500);
  };

  const toggleSelection = (field: string, value: string) => {
    const setters: Record<string, React.Dispatch<React.SetStateAction<string[]>>> = {
      hobbies: setHobbies,
      favoriteActivities: setFavoriteActivities,
      favoriteFoods: setFavoriteFoods,
      musicPreferences: setMusicPreferences,
      likes: setLikes,
      dislikes: setDislikes
    };

    const setter = setters[field];
    if (setter) {
      setter(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    }
  };

  const addCustomItem = (field: string, value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    if (value.trim()) {
      toggleSelection(field, value.trim());
      setter('');
    }
  };

  const removeItem = (field: string, value: string) => {
    const setters: Record<string, React.Dispatch<React.SetStateAction<string[]>>> = {
      hobbies: setHobbies,
      favoriteActivities: setFavoriteActivities,
      favoriteFoods: setFavoriteFoods,
      musicPreferences: setMusicPreferences,
      likes: setLikes,
      dislikes: setDislikes
    };

    const setter = setters[field];
    if (setter) {
      setter(prev => prev.filter(v => v !== value));
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

  const handleComplete = async () => {
    if (!loveLanguagePrimary || !communicationStyle) return;

    setSaving(true);
    try {
      // Save directly to partner_profiles table using direct Supabase insert
      // (bypassing service to avoid mapping issues)
      const profileData = {
        user_id: userId,
        couple_id: null, // Will be set when they join/create a couple
        relationship_status: relationshipStatus,
        cohabitation_status: cohabitationStatus,
        proximity_status: proximityStatus,
        seeing_frequency: seeingFrequency,
        love_language_primary: loveLanguagePrimary,
        love_language_secondary: loveLanguageSecondary || null,
        communication_style: communicationStyle,
        stress_needs: stressNeeds,
        frequency_preference: frequencyPreference,
        daily_checkins_enabled: true,
        preferred_checkin_times: checkinTimes,
        custom_preferences: [
          { key: 'display_name', value: displayName },
          { key: 'birthday', value: birthday },
          { key: 'personality_type', value: personalityType },
          { key: 'hobbies', value: JSON.stringify(hobbies) },
          { key: 'favorite_activities', value: JSON.stringify(favoriteActivities) },
          { key: 'favorite_foods', value: JSON.stringify(favoriteFoods) },
          { key: 'music_preferences', value: JSON.stringify(musicPreferences) },
          { key: 'likes', value: JSON.stringify(likes) },
          { key: 'dislikes', value: JSON.stringify(dislikes) }
        ],
        learned_patterns: {},
        engagement_score: 50
      };

      // Check if profile already exists
      const { data: existing } = await api.supabase
        .from('partner_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing profile
        const { error } = await api.supabase
          .from('partner_profiles')
          .update(profileData)
          .eq('user_id', userId);

        if (error) {
          console.error('Failed to update profile:', error);
          throw error;
        }
      } else {
        // Insert new profile
        const { error } = await api.supabase
          .from('partner_profiles')
          .insert(profileData);

        if (error) {
          console.error('Failed to insert profile:', error);
          throw error;
        }
      }

      // Also save to onboarding_responses for compatibility
      const onboardingData = {
        user_id: userId,
        name: displayName,
        birthday: birthday || null,
        relationship_status: relationshipStatus,
        cohabitation_status: cohabitationStatus,
        proximity_status: proximityStatus,
        seeing_frequency: seeingFrequency,
        love_language_primary: loveLanguagePrimary,
        love_language_secondary: loveLanguageSecondary || null,
        preferences: {
          hobbies,
          favorite_activities: favoriteActivities,
          favorite_foods: favoriteFoods,
          music_preferences: musicPreferences,
          likes,
          dislikes,
          communication_style: communicationStyle,
          stress_needs: stressNeeds,
          frequency_preference: frequencyPreference,
          preferred_checkin_times: checkinTimes,
          personality_type: personalityType
        }
      };

      const { data: existingOnboarding } = await api.supabase
        .from('onboarding_responses')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingOnboarding) {
        await api.supabase
          .from('onboarding_responses')
          .update(onboardingData)
          .eq('user_id', userId);
      } else {
        await api.supabase
          .from('onboarding_responses')
          .insert(onboardingData);
      }

      setStep('complete');

      // Check if partner has a guess about this user (gracefully handle if function doesn't exist)
      let guessData = null;
      try {
        const result = await api.supabase.rpc('get_partner_guess_about_me', { p_user_id: userId });
        guessData = result.data;
      } catch (err) {
        // Function doesn't exist yet - migrations not run
        console.log('Partner guess function not available yet');
      }

      if (guessData && guessData.length > 0) {
        setTimeout(() => {
          setShowComparison(true);
        }, 2000);
      } else {
        setTimeout(() => {
          onComplete();
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      setSaving(false);
    }
  };

  const handleComparisonClose = () => {
    setShowComparison(false);
    onComplete();
  };

  const getStepProgress = () => {
    const steps = ['welcome', 'relationship_details', 'basic_info', 'love_language_quiz', 'hobbies', 'favorites', 'likes_dislikes', 'communication_style', 'stress_needs', 'frequency'];
    const currentIndex = steps.indexOf(step);
    return currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
  };

  const quizProgress = step === 'love_language_quiz'
    ? ((currentQuestion + 1) / LOVE_LANGUAGE_QUESTIONS.length) * 100
    : 0;

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
      <div className="relative z-10 min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          {step !== 'welcome' && step !== 'complete' && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {step === 'love_language_quiz'
                    ? `Question ${currentQuestion + 1} of ${LOVE_LANGUAGE_QUESTIONS.length}`
                    : 'Profile Setup'
                  }
                </span>
                <span className="text-sm text-gray-600">
                  {step === 'love_language_quiz'
                    ? `${Math.round(quizProgress)}%`
                    : `${Math.round(getStepProgress())}%`
                  }
                </span>
              </div>
              <Progress
                value={step === 'love_language_quiz' ? quizProgress : getStepProgress()}
                className="h-2"
              />
            </div>
          )}

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
                  onClick={() => setStep('relationship_details')}
                  className="px-8 py-6 text-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-2xl shadow-lg shadow-rose-200"
                >
                  Let's Begin
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Relationship Details */}
            {step === 'relationship_details' && (
              <motion.div
                key="relationship_details"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">About Your Relationship</h1>
                  <p className="text-gray-600">Help us understand your situation</p>
                </div>

                <div className="space-y-8 bg-white rounded-2xl p-6 shadow-xl">
                  {/* Relationship Status */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                      Are you married or dating?
                    </h3>
                    <div className="grid gap-4">
                      {RELATIONSHIP_STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setRelationshipStatus(option.value)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            relationshipStatus === option.value
                              ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-200'
                              : 'border-gray-200 hover:border-blue-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="text-3xl">{option.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-lg mb-1">
                                {option.label}
                              </h4>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                            {relationshipStatus === option.value && (
                              <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cohabitation Status */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                      Do you live together?
                    </h3>
                    <div className="grid gap-4">
                      {COHABITATION_STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setCohabitationStatus(option.value)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            cohabitationStatus === option.value
                              ? 'border-green-500 bg-green-50 shadow-lg shadow-green-200'
                              : 'border-gray-200 hover:border-green-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="text-3xl">{option.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-lg mb-1">
                                {option.label}
                              </h4>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                            {cohabitationStatus === option.value && (
                              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Proximity Status */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                      How close do you live to each other?
                    </h3>
                    <div className="grid gap-4">
                      {PROXIMITY_STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setProximityStatus(option.value)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            proximityStatus === option.value
                              ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200'
                              : 'border-gray-200 hover:border-purple-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="text-3xl">{option.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-lg mb-1">
                                {option.label}
                              </h4>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                            {proximityStatus === option.value && (
                              <CheckCircle className="w-6 h-6 text-purple-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seeing Frequency */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                      How often do you see each other?
                    </h3>
                    <div className="grid gap-3">
                      {SEEING_FREQUENCY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSeeingFrequency(option.value)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            seeingFrequency === option.value
                              ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-200'
                              : 'border-gray-200 hover:border-orange-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="text-3xl">{option.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-lg mb-1">
                                {option.label}
                              </h4>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                            {seeingFrequency === option.value && (
                              <CheckCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep('welcome')}
                    className="flex-1 h-12"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('basic_info')}
                    disabled={!relationshipStatus || !cohabitationStatus || !proximityStatus || !seeingFrequency}
                    className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Basic Info */}
            {step === 'basic_info' && (
              <motion.div
                key="basic_info"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Let's get to know you</h1>
                  <p className="text-gray-600">Tell us about yourself</p>
                </div>

                <div className="space-y-4 bg-white rounded-2xl p-6 shadow-xl">
                  <div>
                    <Label htmlFor="name">What should we call you?</Label>
                    <Input
                      id="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your nickname"
                      className="mt-2 h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="birthday">When's your birthday?</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="mt-2 h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="personality">Personality Type (optional)</Label>
                    <Input
                      id="personality"
                      value={personalityType}
                      onChange={(e) => setPersonalityType(e.target.value)}
                      placeholder="e.g., ENFP, Type 2, etc."
                      className="mt-2 h-12"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep('relationship_details')}
                    className="flex-1 h-12"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('love_language_quiz')}
                    disabled={!displayName}
                    className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Love Language Quiz */}
            {step === 'love_language_quiz' && (
              <motion.div
                key={`quiz-${currentQuestion}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
                  {LOVE_LANGUAGE_QUESTIONS[currentQuestion].question}
                </h2>

                <div className="space-y-3">
                  {LOVE_LANGUAGE_QUESTIONS[currentQuestion].options.map((option, i) => {
                    const Icon = option.icon;
                    const isSelected = selectedAnswer === option.language;

                    return (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => handleLoveLanguageAnswer(option.language)}
                        disabled={selectedAnswer !== null}
                        className={`w-full p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-4 ${
                          isSelected
                            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg scale-[1.02]'
                            : 'bg-white hover:bg-rose-50 border border-gray-100 hover:border-rose-200 shadow-md'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-white/20' : 'bg-rose-50'
                        }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-rose-500'}`} />
                        </div>
                        <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                          {option.text}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {currentQuestion > 0 && (
                  <div className="mt-6">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setCurrentQuestion(prev => prev - 1);
                        setSelectedAnswer(null);
                      }}
                      className="text-gray-600"
                      disabled={selectedAnswer !== null}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                  </div>
                )}
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
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Interests</h1>
                  <p className="text-gray-600">What do you enjoy?</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-xl space-y-6">
                  <div>
                    <Label className="mb-3 block">Hobbies</Label>
                    <div className="flex flex-wrap gap-2">
                      {HOBBY_OPTIONS.map(hobby => {
                        const Icon = hobby.icon;
                        const isSelected = hobbies.includes(hobby.label);
                        return (
                          <button
                            key={hobby.label}
                            onClick={() => toggleSelection('hobbies', hobby.label)}
                            className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-rose-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {hobby.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Input
                        value={customHobby}
                        onChange={(e) => setCustomHobby(e.target.value)}
                        placeholder="Add custom hobby"
                        className="h-10"
                        onKeyPress={(e) => e.key === 'Enter' && addCustomItem('hobbies', customHobby, setCustomHobby)}
                      />
                      <Button
                        onClick={() => addCustomItem('hobbies', customHobby, setCustomHobby)}
                        size="sm"
                        className="bg-rose-500 hover:bg-rose-600"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {hobbies.filter(h => !HOBBY_OPTIONS.find(o => o.label === h)).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {hobbies.filter(h => !HOBBY_OPTIONS.find(o => o.label === h)).map(hobby => (
                          <Badge key={hobby} variant="secondary" className="bg-rose-100 text-rose-700">
                            {hobby}
                            <button onClick={() => removeItem('hobbies', hobby)} className="ml-1">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="mb-3 block">Favorite Activities</Label>
                    <div className="flex flex-wrap gap-2">
                      {ACTIVITY_OPTIONS.map(activity => {
                        const isSelected = favoriteActivities.includes(activity);
                        return (
                          <button
                            key={activity}
                            onClick={() => toggleSelection('favoriteActivities', activity)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white'
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                            }`}
                          >
                            {activity}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('love_language_quiz');
                      setCurrentQuestion(LOVE_LANGUAGE_QUESTIONS.length - 1);
                    }}
                    className="flex-1 h-12"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('favorites')}
                    className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Favorites */}
            {step === 'favorites' && (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center">
                    <Utensils className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Favorites & Preferences</h1>
                  <p className="text-gray-600">Help us personalize your experience</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-xl space-y-6">
                  <div>
                    <Label className="mb-3 block">Favorite Foods & Cuisines</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={customFood}
                        onChange={(e) => setCustomFood(e.target.value)}
                        placeholder="e.g., Italian, Sushi, Tacos..."
                        className="h-10"
                        onKeyPress={(e) => e.key === 'Enter' && addCustomItem('favoriteFoods', customFood, setCustomFood)}
                      />
                      <Button
                        onClick={() => addCustomItem('favoriteFoods', customFood, setCustomFood)}
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {favoriteFoods.map(food => (
                        <Badge key={food} variant="secondary" className="bg-amber-100 text-amber-700">
                          {food}
                          <button onClick={() => removeItem('favoriteFoods', food)} className="ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block">Music Preferences</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={customMusic}
                        onChange={(e) => setCustomMusic(e.target.value)}
                        placeholder="e.g., R&B, Jazz, Pop..."
                        className="h-10"
                        onKeyPress={(e) => e.key === 'Enter' && addCustomItem('musicPreferences', customMusic, setCustomMusic)}
                      />
                      <Button
                        onClick={() => addCustomItem('musicPreferences', customMusic, setCustomMusic)}
                        size="sm"
                        className="bg-violet-500 hover:bg-violet-600"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {musicPreferences.map(genre => (
                        <Badge key={genre} variant="secondary" className="bg-violet-100 text-violet-700">
                          {genre}
                          <button onClick={() => removeItem('musicPreferences', genre)} className="ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep('hobbies')}
                    className="flex-1 h-12"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('likes_dislikes')}
                    className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                  >
                    Continue
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
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Likes & Dislikes</h1>
                  <p className="text-gray-600">What makes you happy (and not)?</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-xl space-y-6">
                  <div>
                    <Label className="mb-3 block text-emerald-700">Things You Like ❤️</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={customLike}
                        onChange={(e) => setCustomLike(e.target.value)}
                        placeholder="e.g., Surprises, Morning coffee..."
                        className="h-10"
                        onKeyPress={(e) => e.key === 'Enter' && addCustomItem('likes', customLike, setCustomLike)}
                      />
                      <Button
                        onClick={() => addCustomItem('likes', customLike, setCustomLike)}
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {likes.map(like => (
                        <Badge key={like} variant="secondary" className="bg-emerald-100 text-emerald-700">
                          {like}
                          <button onClick={() => removeItem('likes', like)} className="ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block text-rose-700">Things You Dislike 💔</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={customDislike}
                        onChange={(e) => setCustomDislike(e.target.value)}
                        placeholder="e.g., Crowded places, Spicy food..."
                        className="h-10"
                        onKeyPress={(e) => e.key === 'Enter' && addCustomItem('dislikes', customDislike, setCustomDislike)}
                      />
                      <Button
                        onClick={() => addCustomItem('dislikes', customDislike, setCustomDislike)}
                        size="sm"
                        variant="outline"
                        className="border-rose-300 text-rose-600 hover:bg-rose-50"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dislikes.map(dislike => (
                        <Badge key={dislike} variant="secondary" className="bg-rose-100 text-rose-700">
                          {dislike}
                          <button onClick={() => removeItem('dislikes', dislike)} className="ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep('favorites')}
                    className="flex-1 h-12"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('communication_style')}
                    className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                  >
                    Continue
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

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('likes_dislikes')}
                    className="flex-1 h-12"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('stress_needs')}
                    disabled={!communicationStyle}
                    className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-pink-500 text-white"
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

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('communication_style')}
                    className="flex-1 h-12"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('frequency')}
                    className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Frequency */}
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

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('stress_needs')}
                    className="flex-1 h-12"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={saving}
                    className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-pink-500 text-white"
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
        </div>
      </div>

      {/* Partner Profile Comparison Modal */}
      {loveLanguagePrimary && communicationStyle && (
        <PartnerProfileComparison
          isOpen={showComparison}
          onClose={handleComparisonClose}
          userId={userId}
          coupleId={coupleId}
          actualProfile={{
            love_language_primary: loveLanguagePrimary,
            love_language_secondary: loveLanguageSecondary || null,
            communication_style: communicationStyle,
            stress_needs: stressNeeds
          }}
        />
      )}
    </div>
  );
}
