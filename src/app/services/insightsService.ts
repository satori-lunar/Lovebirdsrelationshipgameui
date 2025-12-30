import { api } from './api';

export interface SavedInsight {
  id: string;
  user_id: string;
  question_id: string;
  partner_id: string;
  question_text: string;
  partner_answer: string;
  user_guess: string | null;
  saved_at: string;
  created_at: string;
}

export interface SaveInsightParams {
  questionId: string;
  partnerId: string;
  questionText: string;
  partnerAnswer: string;
  userGuess?: string;
}

class InsightsService {
  /**
   * Save a partner's answer as an insight
   */
  async saveInsight(userId: string, params: SaveInsightParams): Promise<SavedInsight> {
    const { data, error } = await api.supabase
      .from('saved_partner_insights')
      .insert({
        user_id: userId,
        question_id: params.questionId,
        partner_id: params.partnerId,
        question_text: params.questionText,
        partner_answer: params.partnerAnswer,
        user_guess: params.userGuess || null,
      })
      .select()
      .single();

    if (error) {
      // If it's a unique constraint violation, the user already saved this
      if (error.code === '23505') {
        throw new Error('You already saved this answer');
      }
      console.error('Error saving insight:', error);
      throw new Error('Failed to save insight');
    }

    return data;
  }

  /**
   * Get all saved insights for a user
   */
  async getSavedInsights(userId: string): Promise<SavedInsight[]> {
    const { data, error } = await api.supabase
      .from('saved_partner_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved insights:', error);
      throw new Error('Failed to fetch saved insights');
    }

    return data || [];
  }

  /**
   * Check if a question has been saved
   */
  async isInsightSaved(userId: string, questionId: string): Promise<boolean> {
    const { data, error } = await api.supabase
      .from('saved_partner_insights')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (error) {
      console.error('Error checking if insight is saved:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Delete a saved insight
   */
  async deleteInsight(insightId: string): Promise<void> {
    const { error } = await api.supabase
      .from('saved_partner_insights')
      .delete()
      .eq('id', insightId);

    if (error) {
      console.error('Error deleting insight:', error);
      throw new Error('Failed to delete insight');
    }
  }
}

export const insightsService = new InsightsService();
