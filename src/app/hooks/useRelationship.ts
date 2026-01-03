import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relationshipService } from '../services/relationshipService';
import { useAuth } from './useAuth';

export function useRelationship() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: relationship, isLoading } = useQuery({
    queryKey: ['relationship', user?.id],
    queryFn: () => relationshipService.getRelationship(user!.id),
    enabled: !!user,
    refetchInterval: (query) => {
      // Poll every 3 seconds if:
      // 1. No relationship exists yet, OR
      // 2. Relationship exists but partner_b_id is null (waiting for partner)
      const data = query.state.data;
      const shouldPoll = !data || !data.partner_b_id;
      console.log('🔄 Polling check:', { hasData: !!data, partner_b_id: data?.partner_b_id, shouldPoll });
      return shouldPoll ? 3000 : false;
    },
    refetchOnWindowFocus: true, // Also refetch when window regains focus
    refetchOnMount: true, // Always refetch on mount
    staleTime: 0, // Consider data stale immediately, so refetch happens
  });

  const createRelationshipMutation = useMutation({
    mutationFn: () => relationshipService.createRelationship(user!.id),
    onSuccess: () => {
      console.log('✅ Create relationship success - invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['relationship'] });
    },
  });

  const connectPartnerMutation = useMutation({
    mutationFn: (inviteCode: string) =>
      relationshipService.connectPartner(inviteCode, user!.id),
    onSuccess: () => {
      console.log('✅ Connect partner success - invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['relationship'] });
      // Force an immediate refetch
      queryClient.refetchQueries({ queryKey: ['relationship'] });
    },
  });

  const disconnectPartnerMutation = useMutation({
    mutationFn: () => relationshipService.disconnectPartner(user!.id),
    onSuccess: () => {
      console.log('✅ Disconnect partner success - invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['relationship'] });
      // Force an immediate refetch
      queryClient.refetchQueries({ queryKey: ['relationship'] });
    },
  });

  return {
    relationship,
    isLoading,
    createRelationship: createRelationshipMutation.mutateAsync,
    connectPartner: connectPartnerMutation.mutateAsync,
    disconnectPartner: disconnectPartnerMutation.mutateAsync,
    isCreating: createRelationshipMutation.isPending,
    isConnecting: connectPartnerMutation.isPending,
    isDisconnecting: disconnectPartnerMutation.isPending,
  };
}

