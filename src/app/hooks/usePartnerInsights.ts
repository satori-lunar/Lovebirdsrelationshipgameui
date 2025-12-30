import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insightsService, SaveInsightParams } from '../services/insightsService';
import { useAuth } from './useAuth';

export function usePartnerInsights() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all saved insights
  const { data: savedInsights, isLoading } = useQuery({
    queryKey: ['savedInsights', user?.id],
    queryFn: () => insightsService.getSavedInsights(user!.id),
    enabled: !!user,
  });

  // Save a new insight
  const saveInsightMutation = useMutation({
    mutationFn: (params: SaveInsightParams) =>
      insightsService.saveInsight(user!.id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedInsights'] });
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
