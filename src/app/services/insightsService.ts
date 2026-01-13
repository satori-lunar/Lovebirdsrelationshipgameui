import { api } from './api';

export type InsightType = 'daily_question' | 'couple_challenge' | 'icebreaker' | 'manual_note';

export interface SavedInsight {
  id: string;
  user_id: string;
  question_id: string | null;
  partner_id: string | null;
  question_text: string | null;
  partner_answer: string | null;
  user_guess: string | null;
  insight_type: InsightType;
  title: string | null;
  content: string | null;
  saved_at: string;
  created_at: string;
}

export interface SaveInsightParams {
  insightType: InsightType;
  title?: string;
  content?: string;
  // For daily questions
  questionId?: string;
  partnerId?: string;
  questionText?: string;
  partnerAnswer?: string;
  userGuess?: string;
}

class InsightsService {
  /**
   * Save an insight (daily question, challenge, icebreaker, or manual note)
   */
  async saveInsight(userId: string, params: SaveInsightParams): Promise<SavedInsight> {
    const insertData: any = {
      user_id: userId,
      insight_type: params.insightType,
    };

    // Add type-specific fields
    if (params.insightType === 'daily_question') {
      insertData.question_id = params.questionId;
      insertData.partner_id = params.partnerId;
      insertData.question_text = params.questionText;
      insertData.partner_answer = params.partnerAnswer;
      insertData.user_guess = params.userGuess || null;
    } else if (params.insightType === 'manual_note') {
      insertData.title = params.title;
      insertData.content = params.content;
    } else if (params.insightType === 'couple_challenge' || params.insightType === 'icebreaker') {
      insertData.title = params.title;
      insertData.content = params.content;
      insertData.partner_id = params.partnerId;
    }

    const { data, error } = await api.supabase
      .from('saved_partner_insights')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // If it's a unique constraint violation, the user already saved this
      if (error.code === '23505') {
        throw new Error('You already saved this insight');
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
    console.log('📚 Fetching saved insights for user:', userId);

    const { data, error } = await api.supabase
      .from('saved_partner_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching saved insights:', error);
      // Return empty array instead of throwing - let the UI show "no insights" state
      return [];
    }

    console.log(`✅ Found ${data?.length || 0} saved insights`);
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
   * Create a manual note about partner interactions
   */
  async createManualNote(userId: string, title: string, content: string): Promise<SavedInsight> {
    return this.saveInsight(userId, {
      insightType: 'manual_note',
      title,
      content,
    });
  }

  /**
   * Save insight from a couple challenge
   */
  async saveChallengeInsight(userId: string, partnerId: string, title: string, content: string): Promise<SavedInsight> {
    return this.saveInsight(userId, {
      insightType: 'couple_challenge',
      partnerId,
      title,
      content,
    });
  }

  /**
   * Save insight from an icebreaker
   */
  async saveIcebreakerInsight(userId: string, partnerId: string, title: string, content: string): Promise<SavedInsight> {
    return this.saveInsight(userId, {
      insightType: 'icebreaker',
      partnerId,
      title,
      content,
    });
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
