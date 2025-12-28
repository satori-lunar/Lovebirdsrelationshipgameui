import { api, handleSupabaseError } from './api';
import type { OnboardingData, OnboardingResponse } from '../types/onboarding';

export const onboardingService = {
  async saveOnboarding(userId: string, data: OnboardingData): Promise<OnboardingResponse> {
    // First, ensure user exists in users table (required for foreign key)
    try {
      const { data: userData, error: userError } = await api.supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create it
        const { data: authUser } = await api.supabase.auth.getUser();
        if (authUser?.user) {
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 7);
          
          await api.supabase
            .from('users')
            .insert({
              id: userId,
              email: authUser.user.email || '',
              name: data.name || null,
              trial_start_date: new Date().toISOString(),
              trial_end_date: trialEndDate.toISOString(),
            });
        }
      }
    } catch (error) {
      console.warn('Error ensuring user exists:', error);
    }

    // Use upsert (insert or update) to handle existing onboarding
    const response = await handleSupabaseError(
      api.supabase
        .from('onboarding_responses')
        .upsert({
          user_id: userId,
          name: data.name,
          partner_name: data.partnerName,
          living_together: data.livingTogether || null,
          relationship_duration: data.relationshipDuration || null,
          love_languages: data.loveLanguages || [],
          favorite_activities: data.favoriteActivities || [],
          budget_comfort: data.budgetComfort || null,
          energy_level: data.energyLevel || null,
          feel_loved: data.feelLoved || null,
          wish_happened: data.wishHappened || null,
          communication_style: data.communicationStyle || null,
          fears_triggers: data.fearsTriggers || null,
          health_accessibility: data.healthAccessibility || null,
          relationship_goals: data.relationshipGoals || null,
          is_private: true, // Sensitive data is private by default
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single()
    );

    return response;
  },

  async getOnboarding(userId: string): Promise<OnboardingResponse | null> {
    try {
      const { data, error } = await api.supabase
        .from('onboarding_responses')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no rows found, return null (user hasn't completed onboarding)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      // If table doesn't exist or other error, return null
      console.warn('Error fetching onboarding:', error.message);
      return null;
    }
  },

  async updateOnboarding(userId: string, data: Partial<OnboardingData>): Promise<OnboardingResponse> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.partnerName !== undefined) updateData.partner_name = data.partnerName;
    if (data.livingTogether !== undefined) updateData.living_together = data.livingTogether;
    if (data.relationshipDuration !== undefined) updateData.relationship_duration = data.relationshipDuration;
    if (data.loveLanguages !== undefined) updateData.love_languages = data.loveLanguages;
    if (data.favoriteActivities !== undefined) updateData.favorite_activities = data.favoriteActivities;
    if (data.budgetComfort !== undefined) updateData.budget_comfort = data.budgetComfort;
    if (data.energyLevel !== undefined) updateData.energy_level = data.energyLevel;
    if (data.feelLoved !== undefined) updateData.feel_loved = data.feelLoved;
    if (data.wishHappened !== undefined) updateData.wish_happened = data.wishHappened;
    if (data.communicationStyle !== undefined) updateData.communication_style = data.communicationStyle;
    if (data.fearsTriggers !== undefined) updateData.fears_triggers = data.fearsTriggers;
    if (data.healthAccessibility !== undefined) updateData.health_accessibility = data.healthAccessibility;
    if (data.relationshipGoals !== undefined) updateData.relationship_goals = data.relationshipGoals;

    const response = await handleSupabaseError(
      api.supabase
        .from('onboarding_responses')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single()
    );

    return response;
  },
};

