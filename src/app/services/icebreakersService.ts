import { api, handleSupabaseError } from './api';

export interface IcebreakerQuestion {
  id: string;
  question_text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_active: boolean;
  created_at: string;
}

export interface IcebreakerResponse {
  id: string;
  question_id: string;
  user_id: string;
  relationship_id: string;
  response_text: string;
  is_private: boolean;
  responded_at: string;
}

export interface IcebreakerWithResponse extends IcebreakerQuestion {
  user_response?: IcebreakerResponse;
  partner_response?: IcebreakerResponse;
}

export const ICEBREAKER_CATEGORIES = [
  { id: 'Fun & Light', label: 'Fun & Light', emoji: '🎉', color: 'from-yellow-400 to-orange-400' },
  { id: 'Getting to Know You', label: 'Getting to Know You', emoji: '👋', color: 'from-blue-400 to-cyan-400' },
  { id: 'My One Thing', label: 'My One Thing', emoji: '⭐', color: 'from-purple-400 to-pink-400' },
  { id: 'Relationship Dynamics', label: 'Relationship Dynamics', emoji: '💑', color: 'from-pink-400 to-rose-400' },
  { id: 'Intimate & Romance', label: 'Intimate & Romance', emoji: '💕', color: 'from-rose-400 to-red-400' },
  { id: 'Life & Future', label: 'Life & Future', emoji: '🌟', color: 'from-indigo-400 to-purple-400' },
  { id: 'Deep Conversations', label: 'Deep Conversations', emoji: '💭', color: 'from-violet-400 to-purple-400' },
  { id: 'Spicy & Sexual', label: 'Spicy & Sexual', emoji: '🔥', color: 'from-red-500 to-pink-500' },
];

export const icebreakersService = {
  /**
   * Get all ice breaker questions
   */
  async getAllQuestions(): Promise<IcebreakerQuestion[]> {
    const questions = await handleSupabaseError(
      api.supabase
        .from('icebreaker_questions')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
    );
    return questions || [];
  },

  /**
   * Get ice breaker questions by category
   */
  async getQuestionsByCategory(category: string): Promise<IcebreakerQuestion[]> {
    const questions = await handleSupabaseError(
      api.supabase
        .from('icebreaker_questions')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
    );
    return questions || [];
  },

  /**
   * Get ice breaker questions by difficulty
   */
  async getQuestionsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<IcebreakerQuestion[]> {
    const questions = await handleSupabaseError(
      api.supabase
        .from('icebreaker_questions')
        .select('*')
        .eq('difficulty', difficulty)
        .eq('is_active', true)
        .order('category', { ascending: true })
    );
    return questions || [];
  },

  /**
   * Get questions with responses for a relationship
   */
  async getQuestionsWithResponses(
    relationshipId: string,
    userId: string,
    partnerId: string,
    category?: string
  ): Promise<IcebreakerWithResponse[]> {
    let query = api.supabase
      .from('icebreaker_questions')
      .select('*')
      .eq('is_active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const questions = await handleSupabaseError(
      query.order('created_at', { ascending: true })
    );

    if (!questions) return [];

    // Get all responses for this relationship
    const responses = await handleSupabaseError(
      api.supabase
        .from('icebreaker_responses')
        .select('*')
        .eq('relationship_id', relationshipId)
    );

    // Combine questions with responses
    return questions.map((question) => {
      const userResponse = responses?.find(
        (r) => r.question_id === question.id && r.user_id === userId
      );
      const partnerResponse = responses?.find(
        (r) => r.question_id === question.id && r.user_id === partnerId
      );

      return {
        ...question,
        user_response: userResponse,
        partner_response: partnerResponse,
      };
    });
  },

  /**
   * Save a response to an ice breaker question
   */
  async saveResponse(
    questionId: string,
    userId: string,
    relationshipId: string,
    responseText: string,
    isPrivate: boolean = false
  ): Promise<IcebreakerResponse> {
    // First, check if a response already exists
    const { data: existingResponse } = await api.supabase
      .from('icebreaker_responses')
      .select('*')
      .eq('question_id', questionId)
      .eq('user_id', userId)
      .eq('relationship_id', relationshipId)
      .maybeSingle();

    if (existingResponse) {
      // Update existing response
      const response = await handleSupabaseError(
        api.supabase
          .from('icebreaker_responses')
          .update({
            response_text: responseText,
            is_private: isPrivate,
            responded_at: new Date().toISOString(),
          })
          .eq('id', existingResponse.id)
          .select()
          .single()
      );
      return response;
    } else {
      // Insert new response
      const response = await handleSupabaseError(
        api.supabase
          .from('icebreaker_responses')
          .insert({
            question_id: questionId,
            user_id: userId,
            relationship_id: relationshipId,
            response_text: responseText,
            is_private: isPrivate,
          })
          .select()
          .single()
      );
      return response;
    }
  },

  /**
   * Delete a response
   */
  async deleteResponse(responseId: string): Promise<void> {
    await handleSupabaseError(
      api.supabase.from('icebreaker_responses').delete().eq('id', responseId)
    );
  },

  /**
   * Get response count by category for a relationship
   */
  async getResponseCountByCategory(
    relationshipId: string,
    userId: string
  ): Promise<Record<string, { answered: number; total: number }>> {
    const questions = await this.getAllQuestions();
    const responses = await handleSupabaseError(
      api.supabase
        .from('icebreaker_responses')
        .select('question_id')
        .eq('relationship_id', relationshipId)
        .eq('user_id', userId)
    );

    const counts: Record<string, { answered: number; total: number }> = {};

    // Count questions per category
    questions.forEach((q) => {
      if (!counts[q.category]) {
        counts[q.category] = { answered: 0, total: 0 };
      }
      counts[q.category].total++;
    });

    // Count answered questions per category
    responses?.forEach((r) => {
      const question = questions.find((q) => q.id === r.question_id);
      if (question && counts[question.category]) {
        counts[question.category].answered++;
      }
    });

    return counts;
  },

  /**
   * Get a random unanswered question from a category
   */
  async getRandomUnansweredQuestion(
    relationshipId: string,
    userId: string,
    category?: string
  ): Promise<IcebreakerQuestion | null> {
    let query = api.supabase
      .from('icebreaker_questions')
      .select('*')
      .eq('is_active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const questions = await handleSupabaseError(query);
    if (!questions || questions.length === 0) return null;

    // Get user's answered questions
    const responses = await handleSupabaseError(
      api.supabase
        .from('icebreaker_responses')
        .select('question_id')
        .eq('relationship_id', relationshipId)
        .eq('user_id', userId)
    );

    const answeredIds = new Set(responses?.map((r) => r.question_id) || []);
    const unanswered = questions.filter((q) => !answeredIds.has(q.id));

    if (unanswered.length === 0) {
      // All questions answered, return a random one from all
      return questions[Math.floor(Math.random() * questions.length)];
    }

    // Return random unanswered question
    return unanswered[Math.floor(Math.random() * unanswered.length)];
  },
};
