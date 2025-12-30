/**
 * useSuggestions Hook
 *
 * React Query hook for fetching and managing personalized suggestions
 * Supports love_language, gift, and date categories
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { usePartner } from './usePartner';
import { useRelationship } from './useRelationship';
import {
  suggestionService,
  type SuggestionCategory,
  type Suggestion,
} from '../services/suggestionService';

export interface UseSuggestionsOptions {
  category: SuggestionCategory;
  enabled?: boolean;
}

export function useSuggestions(options: UseSuggestionsOptions) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);
  const queryClient = useQueryClient();

  const { category, enabled = true } = options;

  // Fetch suggestions for the category
  const {
    data: suggestions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['suggestions', category, user?.id],
    queryFn: async () => {
      if (!user || !partnerId) return [];

      // This will check cache first, then generate if needed
      return await suggestionService.generateSuggestions(
        user.id,
        partnerId,
        category
      );
    },
    enabled: enabled && !!user && !!partnerId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - suggestions are weekly
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Get personalization tier
  const { data: personalizationTier } = useQuery({
    queryKey: ['personalizationTier', user?.id, partnerId],
    queryFn: async () => {
      if (!user || !partnerId) return 1;
      return await suggestionService.getPersonalizationTier(user.id, partnerId);
    },
    enabled: !!user && !!partnerId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Mutation to update a suggestion
  const updateMutation = useMutation({
    mutationFn: ({
      suggestionId,
      updates,
    }: {
      suggestionId: string;
      updates: Partial<Suggestion>;
    }) => suggestionService.updateSuggestion(suggestionId, updates),
    onSuccess: () => {
      // Invalidate suggestions query to refetch
      queryClient.invalidateQueries({
        queryKey: ['suggestions', category, user?.id],
      });
    },
  });

  // Mutation to force refresh suggestions
  const refreshMutation = useMutation({
    mutationFn: () => {
      if (!user || !partnerId) throw new Error('User or partner not found');
      return suggestionService.forceRefresh(user.id, partnerId, category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['suggestions', category, user?.id],
      });
    },
  });

  // Helper functions
  const markAsSaved = (suggestionId: string) => {
    updateMutation.mutate({ suggestionId, updates: { saved: true } });
  };

  const markAsCompleted = (suggestionId: string) => {
    updateMutation.mutate({ suggestionId, updates: { completed: true } });
  };

  const unmarkAsSaved = (suggestionId: string) => {
    updateMutation.mutate({ suggestionId, updates: { saved: false } });
  };

  const unmarkAsCompleted = (suggestionId: string) => {
    updateMutation.mutate({ suggestionId, updates: { completed: false } });
  };

  const refresh = () => {
    refreshMutation.mutate();
  };

  return {
    suggestions: suggestions || [],
    isLoading,
    error,
    personalizationTier: personalizationTier || 1,

    // Mutations
    markAsSaved,
    markAsCompleted,
    unmarkAsSaved,
    unmarkAsCompleted,
    refresh,

    // Mutation states
    isUpdating: updateMutation.isPending,
    isRefreshing: refreshMutation.isPending,
    updateError: updateMutation.error,
    refreshError: refreshMutation.error,

    // Manual refetch
    refetch,
  };
}

/**
 * Hook to get all suggestions across categories
 */
export function useAllSuggestions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['allSuggestions', user?.id],
    queryFn: async () => {
      if (!user) return null;
      return await suggestionService.getAllSuggestions(user.id);
    },
    enabled: !!user,
    staleTime: 24 * 60 * 60 * 1000,
  });

  return {
    loveLanguageSuggestions: data?.love_language || [],
    giftSuggestions: data?.gift || [],
    dateSuggestions: data?.date || [],
    isLoading,
    error,
  };
}
