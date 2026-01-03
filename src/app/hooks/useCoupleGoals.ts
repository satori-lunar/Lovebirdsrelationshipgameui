import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsService, CreateGoalParams, CoupleGoal } from '../services/goalsService';
import { useAuth } from './useAuth';

export function useCoupleGoals(coupleId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all goals
  const { data: goals, isLoading } = useQuery({
    queryKey: ['couple-goals', coupleId],
    queryFn: () => goalsService.getGoals(coupleId!),
    enabled: !!coupleId,
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: (params: CreateGoalParams) =>
      goalsService.createGoal(user!.id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-goals'] });
    },
  });

  // Toggle goal mutation
  const toggleGoalMutation = useMutation({
    mutationFn: ({ goalId, completed }: { goalId: string; completed: boolean }) =>
      goalsService.toggleGoal(user!.id, goalId, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-goals'] });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: string) => goalsService.deleteGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple-goals'] });
    },
  });

  return {
    goals: goals || [],
    isLoading,
    createGoal: createGoalMutation.mutateAsync,
    toggleGoal: toggleGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    isCreating: createGoalMutation.isPending,
    isToggling: toggleGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
  };
}
