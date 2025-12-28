import { api, handleSupabaseError } from './api';
import type { Tables, Inserts, Updates } from './api';

export type ImportantDate = Tables<'important_dates'>;

export const trackerService = {
  async getImportantDates(relationshipId: string): Promise<ImportantDate[]> {
    const dates = await handleSupabaseError(
      api.supabase
        .from('important_dates')
        .select('*')
        .eq('relationship_id', relationshipId)
        .order('date', { ascending: true })
    );

    return dates || [];
  },

  async createImportantDate(
    relationshipId: string,
    data: {
      title: string;
      date: string;
      type: 'anniversary' | 'birthday' | 'custom';
      recurring?: boolean;
      userId?: string;
    }
  ): Promise<ImportantDate> {
    const newDate: Inserts<'important_dates'> = {
      relationship_id: relationshipId,
      user_id: data.userId || null,
      title: data.title,
      date: data.date,
      type: data.type,
      recurring: data.recurring ?? true,
    };

    const created = await handleSupabaseError(
      api.supabase
        .from('important_dates')
        .insert(newDate)
        .select()
        .single()
    );

    return created;
  },

  async updateImportantDate(
    dateId: string,
    updates: Partial<Updates<'important_dates'>>
  ): Promise<ImportantDate> {
    const updated = await handleSupabaseError(
      api.supabase
        .from('important_dates')
        .update(updates)
        .eq('id', dateId)
        .select()
        .single()
    );

    return updated;
  },

  async deleteImportantDate(dateId: string): Promise<void> {
    await handleSupabaseError(
      api.supabase
        .from('important_dates')
        .delete()
        .eq('id', dateId)
    );
  },

  getDaysUntil(dateStr: string): number {
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },
};

