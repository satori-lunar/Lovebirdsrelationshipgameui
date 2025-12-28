import { api, handleSupabaseError } from './api';
import type { OnboardingData, OnboardingResponse } from '../types/onboarding';

export const onboardingService = {
  async saveOnboarding(userId: string, data: OnboardingData): Promise<OnboardingResponse> {
    // First, ensure user exists in users table (required for foreign key)
    // This is critical - onboarding_responses has a foreign key to users
    try {
      const { data: userData, error: userError } = await api.supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create it - this MUST succeed before onboarding
        const { data: authUser, error: authError } = await api.supabase.auth.getUser();
        
        if (authError || !authUser?.user) {
          throw new Error('Unable to get user information. Please sign in again.');
        }

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);
        
        const { error: insertError } = await api.supabase
          .from('users')
          .insert({
            id: userId,
            email: authUser.user.email || '',
            name: data.name || null,
            trial_start_date: new Date().toISOString(),
            trial_end_date: trialEndDate.toISOString(),
          });

        if (insertError) {
          console.error('Failed to create user profile:', insertError);
          throw new Error(`Failed to create user profile: ${insertError.message}. Please ensure database migrations are run.`);
        }

        // Verify user was created
        const { error: verifyError } = await api.supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .single();

        if (verifyError) {
          throw new Error('User profile creation failed. Please try again.');
        }
      } else if (userError) {
        // Some other error occurred
        console.error('Error checking user:', userError);
        throw new Error(`Database error: ${userError.message}`);
      }
    } catch (error: any) {
      // Re-throw with better error message
      if (error.message) {
        throw error;
      }
      throw new Error('Failed to ensure user profile exists. Please try again.');
    }

    // Use upsert (insert or update) to handle existing onboarding
    // At this point, we've verified the user exists, so foreign key should be satisfied
    try {
      const upsertData: any = {
        user_id: userId,
        name: data.name,
        is_private: true, // Sensitive data is private by default
        updated_at: new Date().toISOString(),
      };

      // New onboarding fields
      if (data.birthday) upsertData.birthday = data.birthday;
      if (data.pronouns) upsertData.pronouns = data.pronouns;
      if (data.love_language?.primary) upsertData.love_language_primary = data.love_language.primary;
      if (data.love_language?.secondary) upsertData.love_language_secondary = data.love_language.secondary;
      if (data.wants_needs) upsertData.wants_needs = data.wants_needs;
      if (data.preferences) upsertData.preferences = data.preferences;
      if (data.consent) upsertData.consent = data.consent;

      // Legacy fields for backward compatibility (optional)
      if (data.partnerName) upsertData.partner_name = data.partnerName;
      if (data.livingTogether) upsertData.living_together = data.livingTogether;
      if (data.relationshipDuration) upsertData.relationship_duration = data.relationshipDuration;
      if (data.loveLanguages) upsertData.love_languages = data.loveLanguages;
      if (data.favoriteActivities) upsertData.favorite_activities = data.favoriteActivities;
      if (data.budgetComfort) upsertData.budget_comfort = data.budgetComfort;
      if (data.energyLevel) upsertData.energy_level = data.energyLevel;
      if (data.feelLoved) upsertData.feel_loved = data.feelLoved;
      if (data.wishHappened) upsertData.wish_happened = data.wishHappened;
      if (data.communicationStyle) upsertData.communication_style = data.communicationStyle;
      if (data.fearsTriggers) upsertData.fears_triggers = data.fearsTriggers;
      if (data.healthAccessibility) upsertData.health_accessibility = data.healthAccessibility;
      if (data.relationshipGoals) upsertData.relationship_goals = data.relationshipGoals;

      const { data: result, error } = await api.supabase
        .from('onboarding_responses')
        .upsert(upsertData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23503') {
          // Foreign key constraint violation - user doesn't exist
          throw new Error('User profile not found. Please sign out and sign in again.');
        }
        throw new Error(error.message || 'Failed to save onboarding data');
      }

      return result;
    } catch (error: any) {
      if (error.message) {
        throw error;
      }
      throw new Error('Failed to save onboarding data');
    }
  },

  async getOnboarding(userId: string): Promise<OnboardingResponse | null> {
    try {
      const { data, error } = await api.supabase
        .from('onboarding_responses')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid 406 on empty results

      if (error) {
        // If no rows found, return null (user hasn't completed onboarding)
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          return null;
        }
        // Handle 406 errors specifically
        if (error.status === 406 || error.code === '406') {
          console.warn('406 error fetching onboarding - table might not exist or RLS issue:', error);
          return null;
        }
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      // If table doesn't exist or other error, return null
      console.warn('Error fetching onboarding:', error.message);
      // Don't throw - return null so app can continue
      return null;
    }
  },

  async updateOnboarding(userId: string, data: Partial<OnboardingData>): Promise<OnboardingResponse> {
    const updateData: any = {};
    
    // New onboarding fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.birthday !== undefined) updateData.birthday = data.birthday;
    if (data.pronouns !== undefined) updateData.pronouns = data.pronouns;
    if (data.love_language !== undefined) {
      if (data.love_language.primary) updateData.love_language_primary = data.love_language.primary;
      if (data.love_language.secondary !== undefined) updateData.love_language_secondary = data.love_language.secondary;
    }
    if (data.wants_needs !== undefined) updateData.wants_needs = data.wants_needs;
    if (data.preferences !== undefined) updateData.preferences = data.preferences;
    if (data.consent !== undefined) updateData.consent = data.consent;

    // Legacy fields for backward compatibility
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

    updateData.updated_at = new Date().toISOString();

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

