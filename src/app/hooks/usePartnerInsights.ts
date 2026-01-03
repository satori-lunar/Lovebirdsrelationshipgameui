import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insightsService, SaveInsightParams } from '../services/insightsService';
import { useAuth } from './useAuth';

export function usePartnerInsights() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all saved insights
  const { data: savedInsights, isLoading, error } = useQuery({
    queryKey: ['savedInsights', user?.id],
    queryFn: () => insightsService.getSavedInsights(user!.id),
    enabled: !!user,
  });

  console.log('🔍 usePartnerInsights Debug:', {
    userId: user?.id,
    isLoading,
    savedInsightsCount: savedInsights?.length || 0,
    savedInsights,
    error
  });

  // Save a new insight
  const saveInsightMutation = useMutation({
    mutationFn: (params: SaveInsightParams) => {
      console.log('💾 Saving insight with params:', params);
      return insightsService.saveInsight(user!.id, params);
    },
    onSuccess: (data) => {
      console.log('✅ Insight saved successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['savedInsights'] });
      queryClient.invalidateQueries({ queryKey: ['isInsightSaved'] });
    },
    onError: (error) => {
      console.error('❌ Failed to save insight:', error);
    },
  });

  // Delete an insight
  const deleteInsightMutation = useMutation({
    mutationFn: (insightId: string) => insightsService.deleteInsight(insightId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedInsights'] });
    },
  });

  return {
    savedInsights: savedInsights || [],
    isLoading,
    saveInsight: saveInsightMutation.mutate,
    deleteInsight: deleteInsightMutation.mutate,
    isSaving: saveInsightMutation.isPending,
    isDeleting: deleteInsightMutation.isPending,
  };
}

// Hook to check if a specific question is saved
export function useIsInsightSaved(questionId: string | undefined) {
  const { user } = useAuth();

  const { data: isSaved } = useQuery({
    queryKey: ['isInsightSaved', user?.id, questionId],
    queryFn: () => insightsService.isInsightSaved(user!.id, questionId!),
    enabled: !!user && !!questionId,
  });

  return isSaved || false;
}
