/**
 * Weekly Suggestions Component
 *
 * Personalized weekly suggestions for love language actions, gifts, and dates.
 * Uses the suggestionService to generate and manage AI-powered suggestions.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  ChevronLeft,
  Sparkles,
  Gift,
  Calendar,
  RefreshCw,
  Check,
  Clock,
  DollarSign,
  Star,
  ThumbsUp,
  ThumbsDown,
  Meh
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { suggestionService, type Suggestion, type SuggestionCategory } from '../services/suggestionService';
import { toast } from 'sonner';

interface WeeklySuggestionsProps {
  onBack: () => void;
}

type TabType = 'love_language' | 'gift' | 'date';

const TAB_CONFIG: Record<TabType, { label: string; icon: any; gradient: string; emoji: string }> = {
  love_language: {
    label: 'Love Actions',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-500',
    emoji: '💕',
  },
  gift: {
    label: 'Gift Ideas',
    icon: Gift,
    gradient: 'from-purple-500 to-violet-500',
    emoji: '🎁',
  },
  date: {
    label: 'Date Ideas',
    icon: Calendar,
    gradient: 'from-pink-500 to-rose-500',
    emoji: '💑',
  },
};

const COST_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: 'text-green-600 bg-green-100' },
  low: { label: '$', color: 'text-emerald-600 bg-emerald-100' },
  medium: { label: '$$', color: 'text-amber-600 bg-amber-100' },
  high: { label: '$$$', color: 'text-orange-600 bg-orange-100' },
};

const REACTION_OPTIONS = [
  { value: 'loved_it', icon: ThumbsUp, label: 'Loved it!', color: 'text-green-500' },
  { value: 'liked_it', icon: Star, label: 'Liked it', color: 'text-blue-500' },
  { value: 'neutral', icon: Meh, label: 'Neutral', color: 'text-gray-500' },
  { value: 'not_for_me', icon: ThumbsDown, label: 'Not for me', color: 'text-red-500' },
];

export function WeeklySuggestions({ onBack }: WeeklySuggestionsProps) {
  const { user } = useAuth();
  const { relationship, isLoading: relationshipLoading } = useRelationship();
  const { partnerId } = usePartner(relationship);
  const { partnerName } = usePartnerOnboarding();

  const [activeTab, setActiveTab] = useState<TabType>('love_language');
  const [suggestions, setSuggestions] = useState<Record<TabType, Suggestion[]>>({
    love_language: [],
    gift: [],
    date: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && partnerId) {
      loadAllSuggestions();
    } else if (user?.id && !relationshipLoading && !partnerId) {
      // User has no partner connected
      setIsLoading(false);
      setError('Connect with your partner to get personalized suggestions!');
    }
  }, [user?.id, partnerId, relationshipLoading]);

  const loadAllSuggestions = async () => {
    if (!user?.id || !partnerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [loveLanguage, gifts, dates] = await Promise.all([
        suggestionService.generateSuggestions(user.id, partnerId, 'love_language'),
        suggestionService.generateSuggestions(user.id, partnerId, 'gift'),
        suggestionService.generateSuggestions(user.id, partnerId, 'date'),
      ]);

      setSuggestions({
        love_language: loveLanguage,
        gift: gifts,
        date: dates,
      });
    } catch (err) {
      console.error('Error loading suggestions:', err);
      setError('Failed to load suggestions. Please try again.');
      toast.error('Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!user?.id || !partnerId) return;

    setIsRefreshing(true);
    try {
      const newSuggestions = await suggestionService.forceRefresh(user.id, partnerId, activeTab);
      setSuggestions(prev => ({
        ...prev,
        [activeTab]: newSuggestions,
      }));
      toast.success('New suggestions generated! ✨');
    } catch (err) {
      console.error('Error refreshing suggestions:', err);
      toast.error('Failed to refresh suggestions');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleCompleted = async (suggestion: Suggestion) => {
    try {
      const updated = await suggestionService.updateSuggestion(suggestion.id, {
        completed: !suggestion.completed,
      });
      setSuggestions(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(s => (s.id === suggestion.id ? updated : s)),
      }));
      if (updated.completed) {
        toast.success('Amazing! Keep spreading the love! 🎉');
      }
    } catch (err) {
      console.error('Error updating suggestion:', err);
      toast.error('Failed to update suggestion');
    }
  };

  const currentSuggestions = suggestions[activeTab];
  const tabConfig = TAB_CONFIG[activeTab];
  const TabIcon = tabConfig.icon;

  // Show loading state while checking relationship
  if (relationshipLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 pb-8">
      {/* Custom Styles */}
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        .sparkle { animation: sparkle 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className={`bg-gradient-to-r ${tabConfig.gradient} text-white p-6 pb-16`}>
        <div className="max-w-md mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring' }}
                className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center"
              >
                <Sparkles className="w-7 h-7 sparkle" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold">Weekly Suggestions</h1>
                <p className="text-white/80 text-sm">
                  Personalized for you & {partnerName || 'your partner'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-10">
        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-1 mb-6">
          {(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => {
            const config = TAB_CONFIG[tab];
            const Icon = config.icon;
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-2 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                  isActive
                    ? `bg-gradient-to-r ${config.gradient} text-white shadow-md`
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-6 text-center border-0 shadow-lg mb-6 bg-amber-50 border-amber-200">
            <Heart className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <p className="text-amber-800 font-medium">{error}</p>
          </Card>
        )}

        {/* Refresh Button */}
        {!error && (
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">
              {currentSuggestions.length} suggestions this week
            </p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>New Ideas</span>
            </button>
          </div>
        )}

        {/* Suggestions List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-8 text-center border-0 shadow-lg">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 border-3 border-rose-200 border-t-rose-500 rounded-full mx-auto mb-4"
              />
              <p className="text-gray-500">Generating personalized suggestions...</p>
            </Card>
          ) : !error && currentSuggestions.length === 0 ? (
            <Card className="p-8 text-center border-0 shadow-lg">
              <TabIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No suggestions yet</p>
              <p className="text-sm text-gray-400 mb-4">
                Complete your profile to get personalized suggestions!
              </p>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`bg-gradient-to-r ${tabConfig.gradient}`}
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </Card>
          ) : (
            <AnimatePresence>
              {currentSuggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`p-5 border-0 shadow-lg transition-all ${
                      suggestion.completed
                        ? 'bg-green-50 border-l-4 border-l-green-500'
                        : 'bg-white hover:shadow-xl'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Completion Checkbox */}
                      <button
                        onClick={() => handleToggleCompleted(suggestion)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          suggestion.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-rose-400'
                        }`}
                      >
                        {suggestion.completed && <Check className="w-5 h-5" />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title from metadata if available */}
                        {suggestion.metadata?.title && (
                          <h3
                            className={`font-semibold text-lg mb-1 ${
                              suggestion.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}
                          >
                            {suggestion.metadata.title}
                          </h3>
                        )}

                        {/* Description */}
                        <p
                          className={`mb-3 ${
                            suggestion.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                          }`}
                        >
                          {suggestion.suggestion_text}
                        </p>

                        {/* Metadata Tags */}
                        <div className="flex flex-wrap gap-2">
                          {suggestion.time_estimate && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              <Clock className="w-3 h-3" />
                              {suggestion.time_estimate}
                            </span>
                          )}

                          {suggestion.metadata?.budget && COST_LABELS[suggestion.metadata.budget] && (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${COST_LABELS[suggestion.metadata.budget].color}`}>
                              <DollarSign className="w-3 h-3" />
                              {COST_LABELS[suggestion.metadata.budget].label}
                            </span>
                          )}

                          {suggestion.suggestion_type && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">
                              <Star className="w-3 h-3" />
                              {suggestion.suggestion_type.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Pro Tip Card */}
        {!error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Card className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Pro Tip</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Complete suggestions together for bonus relationship XP! Small gestures make the biggest difference. 💕
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
