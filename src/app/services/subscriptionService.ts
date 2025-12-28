import { api, handleSupabaseError } from './api';
import type { Tables } from './api';

export type Subscription = Tables<'subscriptions'>;

export const subscriptionService = {
  async checkPremiumStatus(userId: string): Promise<boolean> {
    const subscription = await handleSupabaseError(
      api.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_type', 'premium')
        .eq('status', 'active')
        .single()
    );

    if (!subscription) return false;

    // Check if subscription is still valid
    if (subscription.end_date) {
      const endDate = new Date(subscription.end_date);
      if (endDate < new Date()) {
        // Update to expired
        await api.supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('id', subscription.id);
        return false;
      }
    }

    return true;
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

