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

export interface RelationshipNeed {
  id: string;
  user_id: string;
  relationship_id: string;
  need_type: NeedType;
  intensity: NeedIntensity;
  notes?: string;
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

export const relationshipNeedsService = {
  /**
   * Report a need in the relationship
   */
  async reportNeed(
    relationshipId: string,
    userId: string,
    needType: NeedType,
    intensity: NeedIntensity = 'moderate',
    notes?: string
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

    if (existing) {
      // Update existing need
      const { data, error } = await api.supabase
        .from('relationship_needs')
        .update({
          intensity,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating need:', error);
        throw new Error(error.message || 'Failed to update need');
      }

      return data;
    } else {
      // Insert new need
      const { data, error } = await api.supabase
        .from('relationship_needs')
        .insert({
          user_id: userId,
          relationship_id: relationshipId,
          need_type: needType,
          intensity,
          notes,
        })
        .select()
        .single();

      if (error) {
        console.error('Error reporting need:', error);
        throw new Error(error.message || 'Failed to report need');
      }

      return data;
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
