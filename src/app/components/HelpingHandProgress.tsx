import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Circle, Clock, Calendar, MoreVertical, Trash2, Bell, BellOff } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { helpingHandService } from '../services/helpingHandService';
import { toast } from 'sonner';
import {
  HelpingHandProgressProps,
  HelpingHandSuggestionWithCategory,
  HelpingHandReminder
} from '../types/helpingHand';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function HelpingHandProgress({ onBack, onViewSuggestion, weekStartDate }: HelpingHandProgressProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const queryClient = useQueryClient();

  // Fetch selected suggestions
  const { data: suggestionsResponse, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['helping-hand-selected-suggestions', user?.id, weekStartDate],
    queryFn: async () => {
      if (!user) throw new Error('User not found');
      const result = await helpingHandService.getSuggestions({
        userId: user.id,
        weekStartDate,
        includeCompleted: true
      });
      // Filter to only selected suggestions
      return {
        ...result,
        suggestions: result.suggestions.filter(s => s.isSelected)
      };
    },
    enabled: !!user
  });

  // Fetch reminders
  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: ['helping-hand-reminders', user?.id],
    queryFn: () => {
      if (!user) throw new Error('User not found');
      return helpingHandService.getReminders(user.id);
    },
    enabled: !!user
  });

  // Complete suggestion mutation
  const completeMutation = useMutation({
    mutationFn: (params: { suggestionId: string; completed: boolean }) =>
      params.completed
        ? helpingHandService.completeSuggestion({
            suggestionId: params.suggestionId,
            userId: user!.id
          })
        : Promise.resolve(), // Uncomplete not implemented yet
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helping-hand-selected-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['helping-hand-suggestions'] });
    }
  });

  // Cancel reminder mutation
  const cancelReminderMutation = useMutation({
    mutationFn: (reminderId: string) =>
      helpingHandService.cancelReminder(reminderId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helping-hand-reminders'] });
      toast.success('Reminder cancelled');
    }
  });

  const suggestions = suggestionsResponse?.suggestions || [];
  const partnerName = relationship?.partnerName || 'your partner';

  const completedCount = suggestions.filter(s => s.isCompleted).length;
  const totalCount = suggestions.length;

  const getReminderForSuggestion = (suggestionId: string): HelpingHandReminder | undefined => {
    return reminders?.find(r => r.suggestionId === suggestionId && r.isActive);
  };

  const handleToggleComplete = async (suggestion: HelpingHandSuggestionWithCategory) => {
    try {
      await completeMutation.mutateAsync({
        suggestionId: suggestion.id,
        completed: !suggestion.isCompleted
      });
      toast.success(suggestion.isCompleted ? 'Marked as incomplete' : 'Marked as complete! 🎉');
    } catch (error) {
      console.error('Failed to toggle completion:', error);
      toast.error('Failed to update');
    }
  };

  const handleCancelReminder = async (reminderId: string) => {
    try {
      await cancelReminderMutation.mutateAsync(reminderId);
    } catch (error) {
      console.error('Failed to cancel reminder:', error);
      toast.error('Failed to cancel reminder');
    }
  };

  const formatNextReminder = (reminder: HelpingHandReminder): string => {
    if (!reminder.nextScheduledAt) return 'Not scheduled';

    const next = new Date(reminder.nextScheduledAt);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (next.toDateString() === today.toDateString()) {
      return `Today at ${next.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } else if (next.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${next.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return next.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const isLoading = suggestionsLoading || remindersLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-warm-cream to-soft-purple-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-warm-pink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-warm-light">Loading your progress...</p>
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
                Your Progress
              </h1>
              <p className="text-sm text-text-warm-light">
                {completedCount} of {totalCount} completed
              </p>
            </div>
            {totalCount > 0 && (
              <div className="text-right">
                <div className="text-3xl font-bold text-warm-pink">
                  {Math.round((completedCount / totalCount) * 100)}%
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mt-3 h-2 bg-warm-beige/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-warm-pink to-soft-purple"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {suggestions.length === 0 ? (
          /* Empty state */
          <Card className="border-warm-beige/30">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-warm-beige/20 flex items-center justify-center mx-auto mb-4">
                <Circle className="w-8 h-8 text-text-warm-light" />
              </div>
              <h3 className="text-lg font-semibold text-text-warm mb-2">
                No selected suggestions yet
              </h3>
              <p className="text-sm text-text-warm-light mb-4">
                Browse categories and select suggestions to track your progress
              </p>
              <Button
                onClick={onBack}
                className="bg-warm-pink hover:bg-warm-pink/90 text-white"
              >
                Browse Suggestions
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Suggestions list */
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => {
              const reminder = getReminderForSuggestion(suggestion.id);

              return (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`overflow-hidden border-warm-beige/30 ${
                    suggestion.isCompleted ? 'bg-warm-beige/10' : 'bg-white'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Completion checkbox */}
                        <button
                          onClick={() => handleToggleComplete(suggestion)}
                          className="shrink-0 mt-1"
                        >
                          {suggestion.isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-warm-pink" />
                          ) : (
                            <Circle className="w-6 h-6 text-warm-beige hover:text-warm-pink transition-colors" />
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Title & category */}
                          <div className="flex items-start gap-2 mb-1">
                            <h3 className={`font-semibold flex-1 ${
                              suggestion.isCompleted
                                ? 'text-text-warm-light line-through'
                                : 'text-text-warm'
                            }`}>
                              {suggestion.title}
                            </h3>
                            <Badge
                              variant="secondary"
                              className="text-xs shrink-0"
                              style={{ backgroundColor: `var(--${suggestion.categoryColorClass})` }}
                            >
                              {suggestion.categoryDisplayName}
                            </Badge>
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
                            {suggestion.sourceType === 'user_created' && (
                              <Badge variant="outline" className="text-xs">
                                Your idea
                              </Badge>
                            )}
                            {suggestion.completedAt && (
                              <div className="flex items-center gap-1 text-warm-pink">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>
                                  {new Date(suggestion.completedAt).toLocaleDateString([], {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Reminder info */}
                          {reminder && !suggestion.isCompleted && (
                            <div className="mt-2 p-2 bg-soft-blue/10 rounded-lg border border-soft-blue/20">
                              <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-soft-blue" />
                                <span className="text-xs text-text-warm font-medium">
                                  {formatNextReminder(reminder)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="shrink-0 p-1 hover:bg-warm-beige/20 rounded transition-colors">
                              <MoreVertical className="w-5 h-5 text-text-warm-light" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewSuggestion(suggestion)}>
                              View Details
                            </DropdownMenuItem>
                            {reminder && (
                              <DropdownMenuItem
                                onClick={() => handleCancelReminder(reminder.id)}
                                className="text-red-600"
                              >
                                <BellOff className="w-4 h-4 mr-2" />
                                Cancel Reminder
                              </DropdownMenuItem>
                            )}
                            {suggestion.sourceType === 'user_created' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  // TODO: Implement delete
                                  toast('Delete feature coming soon');
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Encouragement message */}
        {totalCount > 0 && completedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <Card className="border-warm-pink/20 bg-gradient-to-r from-warm-pink/5 to-soft-purple/5">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-text-warm">
                  {completedCount === totalCount ? (
                    <>
                      🎉 Amazing work! You've completed all your suggestions for {partnerName} this week!
                    </>
                  ) : completedCount >= totalCount / 2 ? (
                    <>
                      Great progress! You're more than halfway there. {partnerName} is lucky to have you! 💝
                    </>
                  ) : (
                    <>
                      Keep going! Every small gesture makes a big difference to {partnerName}. ❤️
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
