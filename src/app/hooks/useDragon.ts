import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { dragonService, Dragon } from '../services/dragonService';
import { dragonGameLogic } from '../services/dragonGameLogic';
import { useEffect } from 'react';
import { api } from '../services/api';

export function useDragon() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's dragon
  const { data: dragon, isLoading, error } = useQuery({
    queryKey: ['dragon', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      let dragon = await dragonService.getDragon(user.id);

      // Auto-create dragon if it doesn't exist
      if (!dragon) {
        dragon = await dragonService.createDragon(user.id);
      }

      // Update stats (apply decay)
      dragon = await dragonGameLogic.updateStats(user.id);

      return dragon;
    },
    enabled: !!user?.id,
  });

  // Real-time subscription to dragon updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = api.supabase
      .channel('dragon_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dragons',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate dragon query when dragon changes
          queryClient.invalidateQueries({ queryKey: ['dragon', user.id] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, queryClient]);

  // Mutation to update dragon name
  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return dragonService.updateDragon(user.id, { name: newName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon'] });
    },
  });

  // Mutation to update dragon color
  const updateColorMutation = useMutation({
    mutationFn: async (newColor: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return dragonService.updateDragon(user.id, { color: newColor });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon'] });
    },
  });

  // Mutation to update dragon accessories
  const updateAccessoriesMutation = useMutation({
    mutationFn: async (accessories: string[]) => {
      if (!user?.id) throw new Error('Not authenticated');
      return dragonService.updateDragon(user.id, { accessories });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon'] });
    },
  });

  // Mutation to feed dragon
  const feedDragonMutation = useMutation({
    mutationFn: async (foodItemId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return dragonGameLogic.feedDragon(user.id, foodItemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon'] });
      queryClient.invalidateQueries({ queryKey: ['dragon-inventory'] });
    },
  });

  // Mutation to play with dragon
  const playWithDragonMutation = useMutation({
    mutationFn: async (toyItemId?: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return dragonGameLogic.playWithDragon(user.id, toyItemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dragon'] });
      if (playWithDragonMutation.variables) {
        queryClient.invalidateQueries({ queryKey: ['dragon-inventory'] });
      }
    },
  });

  // Calculate XP progress
  const xpProgress = dragon
    ? dragonGameLogic.calculateXPForNextStage(dragon.stage, dragon.experience)
    : { required: 0, progress: 0 };

  return {
    dragon,
    isLoading,
    error,
    xpProgress,
    updateName: updateNameMutation.mutate,
    updateColor: updateColorMutation.mutate,
    updateAccessories: updateAccessoriesMutation.mutate,
    feedDragon: feedDragonMutation.mutate,
    playWithDragon: playWithDragonMutation.mutate,
    isUpdating:
      updateNameMutation.isPending ||
      updateColorMutation.isPending ||
      updateAccessoriesMutation.isPending,
    isFeeding: feedDragonMutation.isPending,
      isPlaying: playWithDragonMutation.isPending,
  };
}

export function usePartnerDragon(partnerId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch partner's dragon
  const { data: partnerDragon, isLoading } = useQuery({
    queryKey: ['dragon', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      return dragonService.getPartnerDragon(partnerId);
    },
    enabled: !!partnerId,
  });

  // Real-time subscription to partner's dragon updates
  useEffect(() => {
    if (!partnerId) return;

    const channel = api.supabase
      .channel('partner_dragon_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dragons',
          filter: `user_id=eq.${partnerId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dragon', partnerId] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [partnerId, queryClient]);

  return {
    partnerDragon,
    isLoading,
  };
}
