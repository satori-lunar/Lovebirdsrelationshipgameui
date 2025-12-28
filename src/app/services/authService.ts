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
    const { data: authData, error: authError } = await api.supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Failed to create user');

    // Create user profile
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
      // Clean up auth user if profile creation fails
      await api.supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(profileError.message);
    }

    return authData;
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

