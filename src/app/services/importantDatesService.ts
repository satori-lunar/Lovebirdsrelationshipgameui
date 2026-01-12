import { api, handleSupabaseError } from './api';

export interface ImportantDate {
  id: string;
  relationship_id: string;
  user_id: string | null;
  title: string;
  date: string;
  type: 'anniversary' | 'birthday' | 'custom';
  recurring: boolean;
  reminder_sent_1week: boolean;
  reminder_sent_3days: boolean;
  reminder_sent_dayof: boolean;
  photo_url: string | null;
  created_at: string;
}

// Helper to parse date string without timezone conversion
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const importantDatesService = {
  /**
   * Get all important dates for a relationship
   */
  async getDatesForRelationship(relationshipId: string): Promise<ImportantDate[]> {
    console.log('📅 importantDatesService: Fetching dates for relationship', relationshipId);
    try {
      const dates = await handleSupabaseError(
        api.supabase
          .from('important_dates')
          .select('*')
          .eq('relationship_id', relationshipId)
          .order('date', { ascending: true })
      );
      console.log('📅 importantDatesService: Fetched dates', dates);
      return dates || [];
    } catch (error) {
      console.error('📅 importantDatesService: Error fetching dates', error);
      return [];
    }
  },

  /**
   * Create a new important date
   */
  async createDate(
    relationshipId: string,
    userId: string,
    title: string,
    date: string,
    type: 'anniversary' | 'birthday' | 'custom',
    recurring: boolean = true,
    photoUrl: string | null = null
  ): Promise<ImportantDate> {
    const newDate = await handleSupabaseError(
      api.supabase
        .from('important_dates')
        .insert({
          relationship_id: relationshipId,
          user_id: userId,
          title,
          date,
          type,
          recurring,
          photo_url: photoUrl,
        })
        .select()
        .single()
    );
    return newDate;
  },

  /**
   * Update an existing important date
   */
  async updateDate(
    dateId: string,
    updates: {
      title?: string;
      date?: string;
      type?: 'anniversary' | 'birthday' | 'custom';
      recurring?: boolean;
      photo_url?: string | null;
    }
  ): Promise<ImportantDate> {
    const updatedDate = await handleSupabaseError(
      api.supabase
        .from('important_dates')
        .update(updates)
        .eq('id', dateId)
        .select()
        .single()
    );
    return updatedDate;
  },

  /**
   * Delete an important date
   */
  async deleteDate(dateId: string): Promise<void> {
    await handleSupabaseError(
      api.supabase.from('important_dates').delete().eq('id', dateId)
    );
  },

  /**
   * Get upcoming dates (next 90 days)
   */
  async getUpcomingDates(relationshipId: string): Promise<ImportantDate[]> {
    const today = new Date().toISOString().split('T')[0];
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    const futureDate = ninetyDaysFromNow.toISOString().split('T')[0];

    const dates = await handleSupabaseError(
      api.supabase
        .from('important_dates')
        .select('*')
        .eq('relationship_id', relationshipId)
        .gte('date', today)
        .lte('date', futureDate)
        .order('date', { ascending: true })
    );
    return dates || [];
  },

  /**
   * Calculate days until a date
   */
  daysUntil(dateString: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = parseLocalDate(dateString);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  /**
   * Calculate days since a date
   */
  daysSince(dateString: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastDate = parseLocalDate(dateString);
    pastDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - pastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  /**
   * Format time duration (days to years/months/days)
   */
  formatDuration(days: number): string {
    if (days < 0) return '0 days';

    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    const months = Math.floor(remainingDays / 30);
    const finalDays = remainingDays % 30;

    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
    if (finalDays > 0 || parts.length === 0) parts.push(`${finalDays} ${finalDays === 1 ? 'day' : 'days'}`);

    return parts.join(', ');
  },

  /**
   * Get next occurrence of a recurring date
   */
  getNextOccurrence(dateString: string): string {
    const date = parseLocalDate(dateString);
    const today = new Date();

    // Set to this year
    date.setFullYear(today.getFullYear());

    // If the date has passed this year, set to next year
    if (date < today) {
      date.setFullYear(today.getFullYear() + 1);
    }

    return date.toISOString().split('T')[0];
  },
};
