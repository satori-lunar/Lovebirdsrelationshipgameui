import { api } from './api';

export type NeedType =
  | 'affection'
  | 'dates'
  | 'quality_time'
  | 'compliments'
  | 'appreciation'
  | 'communication'
  | 'intimacy'
  | 'support';

export type NeedIntensity = 'slight' | 'moderate' | 'significant';

export type DurationOfIssue = 'just_started' | 'few_weeks' | 'few_months' | 'several_months' | 'over_a_year';

export interface RelationshipNeed {
  id: string;
  user_id: string;
  relationship_id: string;
  need_type: NeedType;
  intensity: NeedIntensity;
  notes?: string;
  wish_partner_would_do?: string;
  wish_partner_understood?: string;
  duration_of_issue?: DurationOfIssue;
  have_talked_about_it?: boolean;
  conversation_details?: string;
  how_it_affects_me?: string;
  ideal_outcome?: string;
  is_active: boolean;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerSuggestion {
  id: string;
  user_id: string;
  relationship_id: string;
  partner_id: string;
  need_id?: string;
  suggestion_type: string;
  suggestion_text: string;
  shown_at: string;
  dismissed_at?: string;
  completed_at?: string;
  created_at: string;
}

export const needTypeLabels: Record<NeedType, string> = {
  affection: 'Physical Affection',
  dates: 'More Dates',
  quality_time: 'Quality Time',
  compliments: 'Compliments',
  appreciation: 'Feeling Appreciated',
  communication: 'Better Communication',
  intimacy: 'Intimacy',
  support: 'Emotional Support',
};

export const needTypeDescriptions: Record<NeedType, string> = {
  affection: 'Hugs, kisses, cuddling, and physical closeness',
  dates: 'Planned outings and romantic experiences together',
  quality_time: 'Focused, meaningful time without distractions',
  compliments: 'Words of affirmation and positive feedback',
  appreciation: 'Recognition and gratitude for efforts',
  communication: 'Open, honest conversations and emotional sharing',
  intimacy: 'Romantic and sensual connection',
  support: 'Encouragement, help, and being there when needed',
};

export const durationLabels: Record<DurationOfIssue, string> = {
  just_started: 'Just started noticing',
  few_weeks: 'A few weeks',
  few_months: 'A few months',
  several_months: 'Several months',
  over_a_year: 'Over a year',
};

export const relationshipNeedsService = {
  /**
   * Report a need in the relationship
   */
  async reportNeed(
    relationshipId: string,
    userId: string,
    needType: NeedType,
    data: {
      intensity?: NeedIntensity;
      notes?: string;
      wish_partner_would_do?: string;
      wish_partner_understood?: string;
      duration_of_issue?: DurationOfIssue;
      have_talked_about_it?: boolean;
      conversation_details?: string;
      how_it_affects_me?: string;
      ideal_outcome?: string;
    }
  ): Promise<RelationshipNeed> {
    // Check if this need already exists and is active
    const { data: existing } = await api.supabase
      .from('relationship_needs')
      .select('*')
      .eq('user_id', userId)
      .eq('relationship_id', relationshipId)
      .eq('need_type', needType)
      .eq('is_active', true)
      .maybeSingle();

    const updateData = {
      intensity: data.intensity || 'moderate',
      notes: data.notes,
      wish_partner_would_do: data.wish_partner_would_do,
      wish_partner_understood: data.wish_partner_understood,
      duration_of_issue: data.duration_of_issue,
      have_talked_about_it: data.have_talked_about_it,
      conversation_details: data.conversation_details,
      how_it_affects_me: data.how_it_affects_me,
      ideal_outcome: data.ideal_outcome,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing need
      const { data: result, error } = await api.supabase
        .from('relationship_needs')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating need:', error);
        throw new Error(error.message || 'Failed to update need');
      }

      return result;
    } else {
      // Insert new need
      const { data: result, error } = await api.supabase
        .from('relationship_needs')
        .insert({
          user_id: userId,
          relationship_id: relationshipId,
          need_type: needType,
          ...updateData,
        })
        .select()
        .single();

      if (error) {
        console.error('Error reporting need:', error);
        throw new Error(error.message || 'Failed to report need');
      }

      return result;
    }
  },

  /**
   * Get all active needs for a user
   */
  async getActiveNeeds(userId: string, relationshipId: string): Promise<RelationshipNeed[]> {
    const { data, error } = await api.supabase
      .from('relationship_needs')
      .select('*')
      .eq('user_id', userId)
      .eq('relationship_id', relationshipId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching needs:', error);
      throw new Error(error.message || 'Failed to fetch needs');
    }

    return data || [];
  },

  /**
   * Mark a need as resolved
   */
  async resolveNeed(needId: string): Promise<void> {
    const { error } = await api.supabase
      .from('relationship_needs')
      .update({
        is_active: false,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', needId);

    if (error) {
      console.error('Error resolving need:', error);
      throw new Error(error.message || 'Failed to resolve need');
    }
  },

  /**
   * Delete a need
   */
  async deleteNeed(needId: string): Promise<void> {
    const { error } = await api.supabase
      .from('relationship_needs')
      .delete()
      .eq('id', needId);

    if (error) {
      console.error('Error deleting need:', error);
      throw new Error(error.message || 'Failed to delete need');
    }
  },

  /**
   * Get active suggestions for the current user
   */
  async getActiveSuggestions(userId: string): Promise<PartnerSuggestion[]> {
    const { data, error } = await api.supabase
      .from('partner_suggestions')
      .select('*')
      .eq('user_id', userId)
      .is('dismissed_at', null)
      .is('completed_at', null)
      .order('shown_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching suggestions:', error);
      throw new Error(error.message || 'Failed to fetch suggestions');
    }

    return data || [];
  },

  /**
   * Mark a suggestion as dismissed
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    const { error } = await api.supabase
      .from('partner_suggestions')
      .update({
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', suggestionId);

    if (error) {
      console.error('Error dismissing suggestion:', error);
      throw new Error(error.message || 'Failed to dismiss suggestion');
    }
  },

  /**
   * Mark a suggestion as completed
   */
  async completeSuggestion(suggestionId: string): Promise<void> {
    const { error } = await api.supabase
      .from('partner_suggestions')
      .update({
        completed_at: new Date().toISOString(),
      })
      .eq('id', suggestionId);

    if (error) {
      console.error('Error completing suggestion:', error);
      throw new Error(error.message || 'Failed to complete suggestion');
    }
  },

  /**
   * Trigger suggestion generation (calls the database function)
   */
  async generateSuggestions(): Promise<void> {
    const { error } = await api.supabase.rpc('create_partner_suggestions');

    if (error) {
      console.error('Error generating suggestions:', error);
      throw new Error(error.message || 'Failed to generate suggestions');
    }
  },
};
