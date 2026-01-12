import { supabase } from '../utils/supabaseClient';
import { RelationshipNeedsService } from './relationshipNeedsService';
import { generateContextualSuggestions, generateProgressiveSuggestions } from './suggestionGeneratorService';

export interface PartnerSuggestion {
  id: string;
  user_id: string;
  relationship_id: string;
  partner_id: string;
  need_id: string;
  suggestion_type: string;
  suggestion_text: string;
  shown_at: string;
  dismissed_at?: string;
  completed_at?: string;
  created_at: string;
}

export class PartnerSuggestionsService {
  private needsService: RelationshipNeedsService;

  constructor() {
    this.needsService = new RelationshipNeedsService();
  }

  /**
   * Generate and store smart suggestions for a partner based on active needs
   * This replaces the random database function with intelligent, context-aware suggestions
   */
  async generateSuggestionsForPartner(
    userId: string,
    relationshipId: string
  ): Promise<PartnerSuggestion[]> {
    try {
      // Get the relationship to find the partner
      const { data: relationship, error: relError } = await supabase
        .from('relationships')
        .select('partner_a_id, partner_b_id')
        .eq('id', relationshipId)
        .single();

      if (relError || !relationship) {
        throw new Error('Relationship not found');
      }

      // Determine partner ID
      const partnerId = relationship.partner_a_id === userId
        ? relationship.partner_b_id
        : relationship.partner_a_id;

      // Get all active needs from the partner
      const partnerNeeds = await this.needsService.getActiveNeeds(partnerId, relationshipId);

      const newSuggestions: PartnerSuggestion[] = [];

      for (const need of partnerNeeds) {
        // Check if we've shown a suggestion for this need recently (within 3 days)
        const { data: recentSuggestions } = await supabase
          .from('partner_suggestions')
          .select('*')
          .eq('user_id', userId)
          .eq('need_id', need.id)
          .gte('shown_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

        if (recentSuggestions && recentSuggestions.length > 0) {
          continue; // Skip this need, already showed suggestion recently
        }

        // Generate smart, contextual suggestions using our AI-powered service
        const suggestions = generateContextualSuggestions(need, 1);

        if (suggestions.length > 0) {
          const topSuggestion = suggestions[0];

          // Insert the suggestion into the database
          const { data: newSuggestion, error: insertError } = await supabase
            .from('partner_suggestions')
            .insert({
              user_id: userId,
              relationship_id: relationshipId,
              partner_id: partnerId,
              need_id: need.id,
              suggestion_type: need.need_type,
              suggestion_text: topSuggestion.text,
              shown_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!insertError && newSuggestion) {
            newSuggestions.push(newSuggestion);
          }
        }
      }

      return newSuggestions;
    } catch (error) {
      console.error('Error generating partner suggestions:', error);
      throw error;
    }
  }

  /**
   * Generate progressive suggestions (gentle → direct) for a specific need
   */
  async generateProgressiveSuggestionsForNeed(
    userId: string,
    needId: string
  ): Promise<PartnerSuggestion[]> {
    try {
      // Get the need
      const { data: need, error: needError } = await supabase
        .from('relationship_needs')
        .select('*')
        .eq('id', needId)
        .single();

      if (needError || !need) {
        throw new Error('Need not found');
      }

      // Get relationship to find partner
      const { data: relationship, error: relError } = await supabase
        .from('relationships')
        .select('partner_a_id, partner_b_id')
        .eq('id', need.relationship_id)
        .single();

      if (relError || !relationship) {
        throw new Error('Relationship not found');
      }

      const partnerId = relationship.partner_a_id === need.user_id
        ? relationship.partner_b_id
        : relationship.partner_a_id;

      // Generate progressive suggestions (4 levels: gentle → direct)
      const progressiveSuggestions = generateProgressiveSuggestions(need);

      const insertedSuggestions: PartnerSuggestion[] = [];

      // Insert all progressive suggestions
      for (const suggestion of progressiveSuggestions) {
        const { data: newSuggestion, error: insertError } = await supabase
          .from('partner_suggestions')
          .insert({
            user_id: userId,
            relationship_id: need.relationship_id,
            partner_id: partnerId,
            need_id: need.id,
            suggestion_type: need.need_type,
            suggestion_text: suggestion.text,
            shown_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!insertError && newSuggestion) {
          insertedSuggestions.push(newSuggestion);
        }
      }

      return insertedSuggestions;
    } catch (error) {
      console.error('Error generating progressive suggestions:', error);
      throw error;
    }
  }

  /**
   * Get active suggestions for the current user
   */
  async getActiveSuggestions(userId: string): Promise<PartnerSuggestion[]> {
    try {
      const { data, error } = await supabase
        .from('partner_suggestions')
        .select('*')
        .eq('user_id', userId)
        .is('dismissed_at', null)
        .is('completed_at', null)
        .order('shown_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active suggestions:', error);
      throw error;
    }
  }

  /**
   * Mark a suggestion as completed
   */
  async completeSuggestion(suggestionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('partner_suggestions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', suggestionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error completing suggestion:', error);
      throw error;
    }
  }

  /**
   * Mark a suggestion as dismissed
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('partner_suggestions')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', suggestionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
      throw error;
    }
  }

  /**
   * Get suggestion history for a relationship
   */
  async getSuggestionHistory(
    relationshipId: string,
    userId: string
  ): Promise<PartnerSuggestion[]> {
    try {
      const { data, error } = await supabase
        .from('partner_suggestions')
        .select('*')
        .eq('relationship_id', relationshipId)
        .eq('user_id', userId)
        .order('shown_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching suggestion history:', error);
      throw error;
    }
  }

  /**
   * Check if we should generate new suggestions for a user
   * Called when partner logs in or periodically
   */
  async checkAndGenerateSuggestions(
    userId: string,
    relationshipId: string
  ): Promise<PartnerSuggestion[]> {
    try {
      // Check if user has any active (unhandled) suggestions
      const activeSuggestions = await this.getActiveSuggestions(userId);

      // If user has 3+ active suggestions, don't generate more (avoid overwhelming)
      if (activeSuggestions.length >= 3) {
        return activeSuggestions;
      }

      // Generate new suggestions if needed
      const newSuggestions = await this.generateSuggestionsForPartner(
        userId,
        relationshipId
      );

      // Return all active suggestions (old + new)
      return [...activeSuggestions, ...newSuggestions];
    } catch (error) {
      console.error('Error checking and generating suggestions:', error);
      throw error;
    }
  }
}
