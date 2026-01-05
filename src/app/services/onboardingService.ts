import { api, handleSupabaseError, validateSession } from './api';
import type { OnboardingData, OnboardingResponse } from '../types/onboarding';

export const onboardingService = {
  async saveOnboarding(userId: string, data: OnboardingData): Promise<OnboardingResponse> {
    // Note: Session validation is handled at the component level
    // to avoid timing issues with auth state updates

    // Helper function to retry operations if session isn't immediately available
    const retryWithSession = async <T>(
      operation: () => Promise<T>,
      maxRetries = 3,
      delayMs = 1000
    ): Promise<T> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error: any) {
          const isAuthError = error.code === 'PGRST301' ||
                            error.status === 401 ||
                            error.message?.includes('JWT') ||
                            error.message?.includes('session');

          if (isAuthError && attempt < maxRetries) {
            console.warn(`Attempt ${attempt} failed with auth error, retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          throw error;
        }
      }
      throw new Error('Max retries exceeded');
    };

    // Ensure user profile exists before saving onboarding data
    console.log('🔄 Creating user profile for userId:', userId, 'with name:', data.name);
    try {
      await retryWithSession(async () => {
        const { data: upsertResult, error: upsertError } = await api.supabase
          .from('users')
          .upsert({
            id: userId,
            email: '', // Will be updated if available
            name: data.name || null,
          }, {
            onConflict: 'id'
          })
          .select();

        console.log('✅ User profile upsert completed:', {
          success: !upsertError,
          result: upsertResult,
          error: upsertError
        });

        if (upsertError) {
          // Only throw if it's not a conflict error (409 means user already exists, which is fine)
          if (upsertError.code !== '23505' && upsertError.status !== 409) {
            throw upsertError;
          }
        }

        return upsertResult;
      });
    } catch (error) {
      console.error('❌ User profile upsert failed after retries:', error);
      // Continue with onboarding anyway - profile might already exist
    }

    // Use upsert (insert or update) to handle existing onboarding
    // At this point, we've verified the user exists, so foreign key should be satisfied
    console.log('Attempting onboarding upsert...');

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
    if (data.userPhotoUrl !== undefined) upsertData.user_photo_url = data.userPhotoUrl;
    if (data.partnerPhotoUrl !== undefined) upsertData.partner_photo_url = data.partnerPhotoUrl;
    if (data.relationshipStatus !== undefined) upsertData.relationship_status = data.relationshipStatus;
    if (data.dateFrequency !== undefined) upsertData.date_frequency = data.dateFrequency;
    if (data.wantMoreDates !== undefined) upsertData.want_more_dates = data.wantMoreDates;

    // Legacy fields for backward compatibility (optional)
    upsertData.partner_name = data.partnerName || ''; // Provide empty string for NOT NULL constraint
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

    // Retry the onboarding upsert in case session isn't immediately available
    return await retryWithSession(async () => {
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
    });
  },

  async getOnboarding(userId: string): Promise<OnboardingResponse | null> {
    // Note: Session validation is handled at the component level

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
    if (data.userPhotoUrl !== undefined) updateData.user_photo_url = data.userPhotoUrl;
    if (data.partnerPhotoUrl !== undefined) updateData.partner_photo_url = data.partnerPhotoUrl;
    if (data.relationshipStatus !== undefined) updateData.relationship_status = data.relationshipStatus;
    if (data.dateFrequency !== undefined) updateData.date_frequency = data.dateFrequency;
    if (data.wantMoreDates !== undefined) updateData.want_more_dates = data.wantMoreDates;

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

