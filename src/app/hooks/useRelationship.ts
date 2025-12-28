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

  return {
    relationship,
    isLoading,
    createRelationship: createRelationshipMutation.mutate,
    connectPartner: connectPartnerMutation.mutate,
    isCreating: createRelationshipMutation.isPending,
    isConnecting: connectPartnerMutation.isPending,
  };
}

