import { api, handleSupabaseError } from './api';
import type { Inserts } from './api';

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export const authService = {
  async signUp(email: string, password: string, name?: string) {
    try {
      // Log the attempt
      console.log('Attempting sign up with email:', email);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) || 'NOT SET');

      const { data: authData, error: authError } = await api.supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('Sign up error:', authError);

        // Better error messages for common issues
        if (authError.message.includes('fetch') || authError.message.includes('network') || authError.message.includes('Failed to fetch')) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          if (!supabaseUrl) {
            throw new Error('Supabase is not configured. Please check environment variables in Vercel.');
          }
          throw new Error(`Cannot connect to Supabase at ${supabaseUrl}. Please verify:\n1. Supabase project is active\n2. Environment variables are set correctly\n3. Network connection is working`);
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Try to create user profile (don't fail signup if table doesn't exist yet)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      const { error: profileError } = await api.supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          name: name || null,
          trial_start_date: new Date().toISOString(),
          trial_end_date: trialEndDate.toISOString(),
        });

      if (profileError) {
        // Log but don't fail - user can complete profile later
        console.warn('Failed to create user profile (this is okay if migrations are not run yet):', profileError);
        // Don't throw - auth was successful, profile can be created later
      }

      // Note: Partner connection with invite code is now handled at the component level
      // after the auth session is fully established

      return authData;
    } catch (error: any) {
      // Catch network errors and provide better messages
      if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
        throw new Error('Unable to connect to Supabase. Please check:\n1. Your internet connection\n2. Supabase project is active\n3. Environment variables are set correctly');
      }
      throw error;
    }
  },

  async signIn({ email, password }: SignInData) {
    const { data, error } = await api.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    
    // Ensure user profile exists after sign in
    if (data.user) {
      try {
        const { data: userData, error: userError } = await api.supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (userError && userError.code === 'PGRST116') {
          // User profile doesn't exist, create it
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 7);
          
          await api.supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              name: null,
              trial_start_date: new Date().toISOString(),
              trial_end_date: trialEndDate.toISOString(),
            });
        }
      } catch (profileError) {
        // Log but don't fail sign in
        console.warn('Failed to ensure user profile exists:', profileError);
      }
    }
    
    return data;
  },

  async signOut() {
    const { error } = await api.supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getCurrentUser() {
    const { data: { user }, error } = await api.supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return user;
  },

  async getSession() {
    const { data: { session }, error } = await api.supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return session;
  },

  async getUserProfile(userId: string) {
    return handleSupabaseError(
      api.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
    );
  },

  async deleteUserData(userId: string): Promise<void> {
    try {
      // Delete in order to handle foreign key constraints

      // 1. Delete memories (references user_id)
      await api.supabase
        .from('memories')
        .delete()
        .eq('user_id', userId);

      // 2. Delete subscriptions (references user_id)
      await api.supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', userId);

      // 3. Delete important dates (references user_id)
      await api.supabase
        .from('important_dates')
        .delete()
        .eq('user_id', userId);

      // 4. Delete date ideas (references user_id, but can be null)
      await api.supabase
        .from('date_ideas')
        .delete()
        .eq('user_id', userId);

      // 5. Delete love language suggestions (references user_id)
      await api.supabase
        .from('love_language_suggestions')
        .delete()
        .eq('user_id', userId);

      // 6. Delete question answers (references user_id)
      await api.supabase
        .from('question_answers')
        .delete()
        .eq('user_id', userId);

      // 7. Delete question guesses (references user_id)
      await api.supabase
        .from('question_guesses')
        .delete()
        .eq('user_id', userId);

      // 8. Delete onboarding responses (references user_id)
      await api.supabase
        .from('onboarding_responses')
        .delete()
        .eq('user_id', userId);

      // 9. Handle relationships - need to be careful here
      // First, get the relationship for this user
      const relationship = await api.supabase
        .from('relationships')
        .select('*')
        .or(`partner_a_id.eq.${userId},partner_b_id.eq.${userId}`)
        .single();

      if (relationship) {
        // If user is partner A and there's a partner B, just remove partner A
        // If user is partner B, just remove partner B
        // If user is the only partner, delete the entire relationship
        if (relationship.partner_a_id === userId && relationship.partner_b_id) {
          // User is partner A, partner B exists - just remove partner A
          await api.supabase
            .from('relationships')
            .update({ partner_a_id: null })
            .eq('id', relationship.id);
        } else if (relationship.partner_b_id === userId) {
          // User is partner B - just remove partner B
          await api.supabase
            .from('relationships')
            .update({ partner_b_id: null })
            .eq('id', relationship.id);
        } else {
          // User is the only partner, delete the entire relationship
          // But first delete related data that references the relationship
          await api.supabase
            .from('date_matches')
            .delete()
            .eq('relationship_id', relationship.id);

          await api.supabase
            .from('daily_questions')
            .delete()
            .eq('relationship_id', relationship.id);

          await api.supabase
            .from('relationships')
            .delete()
            .eq('id', relationship.id);
        }
      }

      // 10. Finally, delete the user profile
      await api.supabase
        .from('users')
        .delete()
        .eq('id', userId);

      // Note: Supabase Auth user deletion would need to be handled separately
      // This only deletes the app data, not the auth user

    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  },

  onAuthStateChange(callback: (user: any) => void) {
    return api.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  },
};

