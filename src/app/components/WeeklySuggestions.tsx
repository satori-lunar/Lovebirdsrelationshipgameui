/**
 * Weekly Suggestions Component - Amora Style
 *
 * Personalized weekly suggestions for dates, gifts, and love language
 * actions based on user preferences and relationship data.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  ChevronLeft,
  Sparkles,
  Gift,
  Calendar,
  MessageCircleHeart,
  RefreshCw,
  Check,
  Bookmark,
  Clock,
  Star,
  Flame
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

export function WeeklySuggestions({ onBack }: WeeklySuggestionsProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
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

  useEffect(() => {
    if (user?.id && partnerId) {
      loadAllSuggestions();
    }
  }, [user?.id, partnerId]);

  const loadAllSuggestions = async () => {
    if (!user?.id || !partnerId) return;

    setIsLoading(true);
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
    } catch (error) {
      console.error('Error loading suggestions:', error);
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
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
      toast.error('Failed to refresh suggestions');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleSaved = async (suggestion: Suggestion) => {
    try {
      const updated = await suggestionService.updateSuggestion(suggestion.id, {
        saved: !suggestion.saved,
      });
      setSuggestions(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(s => (s.id === suggestion.id ? updated : s)),
      }));
      toast.success(updated.saved ? 'Saved! 💕' : 'Removed from saved');
    } catch (error) {
      console.error('Error updating suggestion:', error);
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
    } catch (error) {
      console.error('Error updating suggestion:', error);
    }
  };

  const currentSuggestions = suggestions[activeTab];
  const tabConfig = TAB_CONFIG[activeTab];
  const TabIcon = tabConfig.icon;

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
                <p className="text-white/80 text-sm">Personalized for you & {partnerName || 'your partner'}</p>
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

        {/* Refresh Button */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            {currentSuggestions.length} suggestions this week
          </p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>New Ideas</span>
          </button>
        </div>

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
          ) : currentSuggestions.length === 0 ? (
            <Card className="p-8 text-center border-0 shadow-lg">
              <TabIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No suggestions yet</p>
              <p className="text-sm text-gray-400 mb-4">
                Complete your profile to get personalized suggestions!
              </p>
              <Button
                onClick={handleRefresh}
                className={`bg-gradient-to-r ${tabConfig.gradient}`}
              >
                Generate Suggestions
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
                        <p
                          className={`font-medium mb-2 ${
                            suggestion.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                          }`}
                        >
                          {suggestion.suggestion_text}
                        </p>

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {suggestion.time_estimate && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              <Clock className="w-3 h-3" />
                              {suggestion.time_estimate}
                            </span>
                          )}
                          {suggestion.difficulty && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-600 text-xs rounded-full">
                              <Flame className="w-3 h-3" />
                              {suggestion.difficulty}
                            </span>
                          )}
                          {suggestion.suggestion_type && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">
                              <Star className="w-3 h-3" />
                              {suggestion.suggestion_type}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleSaved(suggestion)}
                            className={`flex items-center gap-1 text-sm transition-colors ${
                              suggestion.saved
                                ? 'text-rose-500'
                                : 'text-gray-400 hover:text-rose-500'
                            }`}
                          >
                            <Bookmark
                              className="w-4 h-4"
                              fill={suggestion.saved ? 'currentColor' : 'none'}
                            />
                            <span>{suggestion.saved ? 'Saved' : 'Save'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Tip Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <Card className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircleHeart className="w-5 h-5 text-rose-500" />
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
      </div>
    </div>
  );
}
