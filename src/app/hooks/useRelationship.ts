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
      // If not connected yet (partner_b_id is null), poll every 3 seconds
      // Once connected, stop polling
      const data = query.state.data;
      return data && !data.partner_b_id ? 3000 : false;
    },
    refetchOnWindowFocus: true, // Also refetch when window regains focus
  });

  const createRelationshipMutation = useMutation({
    mutationFn: () => relationshipService.createRelationship(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship'] });
    },
  });

  const connectPartnerMutation = useMutation({
    mutationFn: (inviteCode: string) =>
      relationshipService.connectPartner(inviteCode, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship'] });
    },
  });

  const disconnectPartnerMutation = useMutation({
    mutationFn: () => relationshipService.disconnectPartner(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationship'] });
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

