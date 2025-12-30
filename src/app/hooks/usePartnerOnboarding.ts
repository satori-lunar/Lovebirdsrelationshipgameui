import { useQuery } from '@tanstack/react-query';
import { onboardingService } from '../services/onboardingService';
import { usePartner } from './usePartner';
import { useRelationship } from './useRelationship';
import { useEffect } from 'react';

/**
 * Hook to fetch partner's onboarding data
 * This includes their name, birthday, love languages, preferences, etc.
 */
export function usePartnerOnboarding() {
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);

  const { data: partnerOnboarding, isLoading, error } = useQuery({
    queryKey: ['partnerOnboarding', partnerId],
    queryFn: () => onboardingService.getOnboarding(partnerId!),
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Debug logging
  useEffect(() => {
    console.log('🔍 usePartnerOnboarding Debug:', {
      partnerId,
      hasPartnerOnboarding: !!partnerOnboarding,
      birthday: partnerOnboarding?.birthday,
      fullData: partnerOnboarding,
      isLoading,
      error,
    });
  }, [partnerId, partnerOnboarding, isLoading, error]);

  return {
    partnerOnboarding,
    isLoading,
    error,
    partnerName: partnerOnboarding?.name || 'your partner',
    partnerBirthday: partnerOnboarding?.birthday,
    partnerLoveLanguages: {
      primary: partnerOnboarding?.love_language_primary,
      secondary: partnerOnboarding?.love_language_secondary,
      all: partnerOnboarding?.love_languages || [],
    },
    partnerPreferences: partnerOnboarding?.preferences,
    partnerWantsNeeds: partnerOnboarding?.wants_needs,
  };
}
