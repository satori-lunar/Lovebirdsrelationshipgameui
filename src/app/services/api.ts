import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleSupabaseError<T>(promise: Promise<{ data: T | null; error: any }>) {
  const { data, error } = await promise;
  if (error) {
    // Handle auth session issues specifically
    if (error.message?.includes('Auth session missing') ||
        error.message?.includes('JWT') ||
        error.code === 'PGRST301' ||
        error.status === 401) {
      throw new ApiError('Your session has expired. Please sign in again.', 401, 'AUTH_SESSION_MISSING');
    }
    throw new ApiError(error.message || 'An error occurred', error.status, error.code);
  }
  return data;
}

// Validate session before making database calls
export async function validateSession(): Promise<{ user: any } | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      // Don't log session errors during signup/initialization as they're expected
      if (!error.message?.includes('Auth session missing') || !window.location.pathname.includes('sign')) {
        console.error('Session validation error:', error);
      }
      return null;
    }
    if (!session?.user) {
      // Don't log missing session during signup
      if (!window.location.pathname.includes('sign')) {
        console.warn('No active session found');
      }
      return null;
    }
    return { user: session.user };
  } catch (error) {
    // Don't log session errors during signup/initialization
    if (!window.location.pathname.includes('sign')) {
      console.error('Failed to validate session:', error);
    }
    return null;
  }
}

export const api = {
  supabase,
};

