import { useQuery } from '@tanstack/react-query';
import { relationshipService } from '../services/relationshipService';
import { useAuth } from './useAuth';
import type { Relationship } from '../services/relationshipService';

export function usePartner(relationship: Relationship | null | undefined) {
  const { user } = useAuth();

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

