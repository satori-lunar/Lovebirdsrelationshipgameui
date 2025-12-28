import { useQuery } from '@tanstack/react-query';
import { relationshipService } from '../services/relationshipService';
import { useRelationship } from './useRelationship';
import { useAuth } from './useAuth';

export function usePartner() {
  const { user } = useAuth();
  const { relationship } = useRelationship();

  const { data: partnerId } = useQuery({
    queryKey: ['partnerId', relationship?.id, user?.id],
    queryFn: async () => {
      if (!relationship || !user) return null;
      return relationshipService.getPartnerId(user.id, relationship.id);
    },
    enabled: !!relationship && !!user,
  });

  return {
    partnerId,
    isConnected: !!relationship?.partner_b_id,
    inviteCode: relationship?.invite_code,
  };
}

