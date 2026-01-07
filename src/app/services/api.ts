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

// Calendar Event Types
export interface CalendarEvent {
  id?: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_private?: boolean;
  can_share_busy_status?: boolean;
}

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  daily_question_time?: string;
  needs_suggestion_times?: string[];
  date_suggestion_days?: string[];
  date_suggestion_time_preference?: 'morning' | 'afternoon' | 'evening' | 'any';
}

// Calendar API functions
export const calendarApi = {
  // Add a new calendar event
  async addCalendarEvent(event: Omit<CalendarEvent, 'id'>) {
    return handleSupabaseError(
      supabase
        .from('user_calendar_events')
        .insert({
          user_id: event.user_id,
          title: event.title,
          description: event.description || null,
          start_time: event.start_time,
          end_time: event.end_time,
          is_private: event.is_private ?? true,
          can_share_busy_status: event.can_share_busy_status ?? false,
        })
        .select()
        .single()
    );
  },

  // Get calendar events for a user within a date range
  async getCalendarEvents(userId: string, startDate: string, endDate: string) {
    return handleSupabaseError(
      supabase
        .from('user_calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', startDate)
        .lte('end_time', endDate)
        .order('start_time', { ascending: true })
    );
  },

  // Update an existing calendar event
  async updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>) {
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.start_time !== undefined) updateData.start_time = updates.start_time;
    if (updates.end_time !== undefined) updateData.end_time = updates.end_time;
    if (updates.is_private !== undefined) updateData.is_private = updates.is_private;
    if (updates.can_share_busy_status !== undefined) updateData.can_share_busy_status = updates.can_share_busy_status;

    return handleSupabaseError(
      supabase
        .from('user_calendar_events')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single()
    );
  },

  // Delete a calendar event
  async deleteCalendarEvent(eventId: string) {
    return handleSupabaseError(
      supabase
        .from('user_calendar_events')
        .delete()
        .eq('id', eventId)
    );
  },

  // Get partner's busy status (only events where can_share_busy_status is true)
  async getPartnerBusyStatus(userId: string, partnerId: string, startDate: string, endDate: string) {
    return handleSupabaseError(
      supabase
        .from('user_calendar_events')
        .select('start_time, end_time, title')
        .eq('user_id', partnerId)
        .eq('can_share_busy_status', true)
        .gte('start_time', startDate)
        .lte('end_time', endDate)
        .order('start_time', { ascending: true })
    );
  },
};

// Notification Preferences API functions
export const notificationPreferencesApi = {
  // Update notification preferences for a user
  async updateNotificationPreferences(preferences: Omit<NotificationPreferences, 'id'>) {
    const updateData: any = {
      user_id: preferences.user_id,
    };

    if (preferences.daily_question_time !== undefined) {
      updateData.daily_question_time = preferences.daily_question_time;
    }
    if (preferences.needs_suggestion_times !== undefined) {
      updateData.needs_suggestion_times = preferences.needs_suggestion_times;
    }
    if (preferences.date_suggestion_days !== undefined) {
      updateData.date_suggestion_days = preferences.date_suggestion_days;
    }
    if (preferences.date_suggestion_time_preference !== undefined) {
      updateData.date_suggestion_time_preference = preferences.date_suggestion_time_preference;
    }

    // Use upsert to create or update
    return handleSupabaseError(
      supabase
        .from('user_notification_preferences')
        .upsert(updateData, { onConflict: 'user_id' })
        .select()
        .single()
    );
  },

  // Get notification preferences for a user
  async getNotificationPreferences(userId: string) {
    return handleSupabaseError(
      supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()
    );
  },
};

export const api = {
  supabase,
  calendar: calendarApi,
  notifications: notificationPreferencesApi,
};

