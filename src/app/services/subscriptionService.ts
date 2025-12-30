import { api, handleSupabaseError } from './api';
import type { Tables } from './api';

export type Subscription = Tables<'subscriptions'>;

export const subscriptionService = {
  async checkPremiumStatus(userId: string): Promise<boolean> {
    // First check if user has their own subscription
    const userSubscription = await handleSupabaseError(
      api.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_type', 'premium')
        .eq('status', 'active')
        .single()
    );

    if (userSubscription) {
      // Check if subscription is still valid
      if (userSubscription.end_date) {
        const endDate = new Date(userSubscription.end_date);
        if (endDate < new Date()) {
          // Update to expired
          await api.supabase
            .from('subscriptions')
            .update({ status: 'expired' })
            .eq('id', userSubscription.id);
          // Continue to check partner subscription
        } else {
          return true; // User's subscription is active
        }
      }
    }

    // Check if user's partner has an active subscription (covers both partners)
    try {
      const relationship = await handleSupabaseError(
        api.supabase
          .from('relationships')
          .select('partner_a_id, partner_b_id')
          .or(`partner_a_id.eq.${userId},partner_b_id.eq.${userId}`)
          .single()
      );

      if (relationship) {
        const partnerId = relationship.partner_a_id === userId
          ? relationship.partner_b_id
          : relationship.partner_a_id;

        if (partnerId) {
          const partnerSubscription = await handleSupabaseError(
            api.supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', partnerId)
              .eq('plan_type', 'premium')
              .eq('status', 'active')
              .single()
          );

          if (partnerSubscription && partnerSubscription.end_date) {
            const endDate = new Date(partnerSubscription.end_date);
            if (endDate > new Date()) {
              return true; // Partner's subscription covers this user
            }
          }
        }
      }
    } catch (error) {
      // If relationship query fails, just continue (user might not be in a relationship yet)
      console.warn('Failed to check partner subscription:', error);
    }

    return false;
  },

  async checkTrialStatus(userId: string): Promise<{ isTrial: boolean; trialEndDate: Date | null }> {
    const user = await handleSupabaseError(
      api.supabase
        .from('users')
        .select('trial_start_date, trial_end_date')
        .eq('id', userId)
        .single()
    );

    if (!user || !user.trial_end_date) {
      return { isTrial: false, trialEndDate: null };
    }

    const trialEndDate = new Date(user.trial_end_date);
    const isTrial = trialEndDate > new Date();

    return { isTrial, trialEndDate };
  },

  async createSubscription(
    userId: string,
    planType: 'premium' = 'premium',
    durationMonths: number = 1
  ): Promise<Subscription> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const subscription = await handleSupabaseError(
      api.supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planType,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        })
        .select()
        .single()
    );

    return subscription;
  },
};

