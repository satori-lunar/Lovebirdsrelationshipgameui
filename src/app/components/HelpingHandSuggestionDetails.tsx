import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Heart, ChevronDown, ChevronUp, Check, Sparkles, User } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { helpingHandService } from '../services/helpingHandService';
import { toast } from 'sonner';
import {
  HelpingHandSuggestionDetailsProps,
  HelpingHandSuggestionWithCategory
} from '../types/helpingHand';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function HelpingHandSuggestionDetails({
  category,
  onBack,
  onSelectSuggestion,
  onSaveForLater,
  weekStartDate
}: HelpingHandSuggestionDetailsProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerLoveLanguages } = usePartnerOnboarding();
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Fetch suggestions for this category
  const { data: suggestionsResponse, isLoading } = useQuery({
    queryKey: ['helping-hand-suggestions', user?.id, weekStartDate, category.id],
    queryFn: () => {
      if (!user) throw new Error('User not found');
      return helpingHandService.getSuggestions({
        userId: user.id,
        weekStartDate,
        categoryId: category.id,
        includeCompleted: false
      });
    },
    enabled: !!user
  });

  // Select suggestion mutation
  const selectMutation = useMutation({
    mutationFn: (params: { suggestionId: string; selected: boolean }) =>
      helpingHandService.selectSuggestion({
        suggestionId: params.suggestionId,
        userId: user!.id,
        selected: params.selected
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helping-hand-suggestions'] });
    }
  });

  const suggestions = suggestionsResponse?.suggestions || [];
  const partnerName = relationship?.partnerName || 'your partner';

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelect = async (suggestion: HelpingHandSuggestionWithCategory) => {
    try {
      await selectMutation.mutateAsync({
        suggestionId: suggestion.id,
        selected: true
      });
      toast.success('Suggestion selected!');
      onSelectSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to select suggestion:', error);
      toast.error('Failed to select suggestion');
    }
  };

  const handleToggleSelect = async (suggestion: HelpingHandSuggestionWithCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await selectMutation.mutateAsync({
        suggestionId: suggestion.id,
        selected: !suggestion.isSelected
      });
      toast.success(suggestion.isSelected ? 'Unselected' : 'Selected!');
    } catch (error) {
      console.error('Failed to toggle selection:', error);
      toast.error('Failed to update selection');
    }
  };

  const getLoveLanguageEmoji = (lang: string): string => {
    const map: Record<string, string> = {
      words: '💬',
      quality_time: '⏰',
      gifts: '🎁',
      acts: '🤝',
      touch: '🤗'
    };
    return map[lang] || '❤️';
  };

  // Map full love language names to short codes
  const mapLoveLanguageToShortCode = (fullName: string | null | undefined): string | null => {
    if (!fullName) return null;
    const mapping: Record<string, string> = {
      'Words of Affirmation': 'words',
      'Quality Time': 'quality_time',
      'Acts of Service': 'acts',
      'Receiving Gifts': 'gifts',
      'Physical Touch': 'touch'
    };
    return mapping[fullName] || null;
  };

  // Check if suggestion matches partner's primary love language
  const isRecommended = (suggestion: HelpingHandSuggestionWithCategory): boolean => {
    if (!partnerLoveLanguages?.primary || !suggestion.loveLanguageAlignment) {
      return false;
    }
    const primaryLoveLang = mapLoveLanguageToShortCode(partnerLoveLanguages.primary);
    if (!primaryLoveLang) {
      return false;
    }
    return suggestion.loveLanguageAlignment.includes(primaryLoveLang);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-warm-cream to-soft-purple-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-warm-pink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-warm-light">Loading suggestions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-cream to-soft-purple-light pb-20">
      {/* Header */}
      <div className="bg-white border-b border-warm-beige/30 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-warm-beige/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-text-warm" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-text-warm">
                {category.displayName}
              </h1>
              <p className="text-sm text-text-warm-light">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Category info card */}
        <Card className="mb-6 border-warm-beige/30 bg-white/80">
          <CardContent className="p-4">
            <p className="text-sm text-text-warm-light mb-2">
              {category.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-text-warm-light">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{category.minTimeRequired}-{category.maxTimeRequired} min</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="capitalize">{category.effortLevel} effort</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions list */}
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => {
            const isExpanded = expandedIds.has(suggestion.id);
            const isAI = suggestion.sourceType === 'ai';

            return (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow border-warm-beige/30">
                  <CardContent className="p-0">
                    {/* Main content - always visible */}
                    <button
                      onClick={() => toggleExpanded(suggestion.id)}
                      className="w-full p-4 text-left hover:bg-warm-beige/5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={(e) => handleToggleSelect(suggestion, e)}
                          className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all mt-0.5 ${
                            suggestion.isSelected
                              ? 'bg-warm-pink border-warm-pink'
                              : 'border-warm-beige hover:border-warm-pink'
                          }`}
                        >
                          {suggestion.isSelected && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Title & badges */}
                          <div className="flex items-start gap-2 mb-1">
                            <h3 className="font-semibold text-text-warm flex-1">
                              {suggestion.title}
                            </h3>
                            <div className="flex items-center gap-2 shrink-0">
                              {isRecommended(suggestion) && (
                                <Badge className="text-xs bg-warm-pink/10 text-warm-pink border-warm-pink/20">
                                  <Heart className="w-3 h-3 mr-1" />
                                  Recommended
                                </Badge>
                              )}
                              {!isAI && (
                                <Badge variant="secondary" className="text-xs">
                                  <User className="w-3 h-3 mr-1" />
                                  Your idea
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-sm text-text-warm-light mb-2 line-clamp-2">
                            {suggestion.description}
                          </p>

                          {/* Meta info */}
                          <div className="flex items-center gap-3 text-xs text-text-warm-light flex-wrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{helpingHandService.formatTimeEstimate(suggestion.timeEstimateMinutes)}</span>
                            </div>
                            {suggestion.loveLanguageAlignment && suggestion.loveLanguageAlignment.length > 0 && (
                              <div className="flex items-center gap-1">
                                {suggestion.loveLanguageAlignment.slice(0, 2).map(lang => (
                                  <span key={lang}>{getLoveLanguageEmoji(lang)}</span>
                                ))}
                              </div>
                            )}
                            {suggestion.bestTiming && (
                              <span className="capitalize">{suggestion.bestTiming}</span>
                            )}
                          </div>
                        </div>

                        {/* Expand icon */}
                        <div className="shrink-0 mt-1">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-text-warm-light" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-text-warm-light" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-2 border-t border-warm-beige/30 bg-warm-beige/5">
                            {/* Why suggested (AI only) */}
                            {isAI && suggestion.whySuggested && (
                              <div className="mb-4 p-3 bg-soft-purple/5 rounded-lg border border-soft-purple/20">
                                <div className="flex items-start gap-2 mb-1">
                                  <Sparkles className="w-4 h-4 text-soft-purple shrink-0 mt-0.5" />
                                  <p className="text-xs font-medium text-soft-purple">
                                    Why this suggestion?
                                  </p>
                                </div>
                                <p className="text-sm text-text-warm-light pl-6">
                                  {suggestion.whySuggested}
                                </p>
                              </div>
                            )}

                            {/* Steps */}
                            {suggestion.detailedSteps && suggestion.detailedSteps.length > 0 && (
                              <div className="mb-4">
                                <h4 className="text-sm font-semibold text-text-warm mb-2">
                                  Steps:
                                </h4>
                                <div className="space-y-2">
                                  {suggestion.detailedSteps.map((step) => (
                                    <div key={step.step} className="flex gap-2">
                                      <div className="shrink-0 w-6 h-6 rounded-full bg-warm-pink/10 flex items-center justify-center text-xs font-semibold text-warm-pink">
                                        {step.step}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm text-text-warm">
                                          {step.action}
                                        </p>
                                        {step.tip && (
                                          <p className="text-xs text-text-warm-light mt-1">
                                            💡 {step.tip}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Partner hint (if available) */}
                            {suggestion.partnerHint && (
                              <div className="mb-4 p-3 bg-warm-pink/5 rounded-lg border border-warm-pink/20">
                                <div className="flex items-start gap-2 mb-1">
                                  <Heart className="w-4 h-4 text-warm-pink shrink-0 mt-0.5" />
                                  <p className="text-xs font-medium text-warm-pink">
                                    Based on {partnerName}'s hint
                                  </p>
                                </div>
                                <p className="text-sm text-text-warm-light pl-6">
                                  {suggestion.partnerHint}
                                </p>
                              </div>
                            )}

                            {/* Action button */}
                            <Button
                              onClick={() => handleSelect(suggestion)}
                              className="w-full bg-warm-pink hover:bg-warm-pink/90 text-white"
                              disabled={suggestion.isSelected}
                            >
                              {suggestion.isSelected ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Selected
                                </>
                              ) : (
                                'Choose This & Set Reminder'
                              )}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Empty state */}
        {suggestions.length === 0 && (
          <Card className="border-warm-beige/30">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-warm-beige/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-text-warm-light" />
              </div>
              <h3 className="text-lg font-semibold text-text-warm mb-2">
                No suggestions yet
              </h3>
              <p className="text-sm text-text-warm-light mb-4">
                Check back later for AI-generated ideas, or create your own!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Bottom tip */}
        {suggestions.length > 0 && (
          <div className="mt-6 text-center text-sm text-text-warm-light">
            <p>
              💡 Select suggestions to set reminders and track progress
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
