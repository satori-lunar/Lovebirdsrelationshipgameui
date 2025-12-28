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
  async signUp({ email, password, name }: SignUpData) {
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

  onAuthStateChange(callback: (user: any) => void) {
    return api.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  },
};

