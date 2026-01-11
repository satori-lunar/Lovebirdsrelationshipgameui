import { api, handleSupabaseError } from './api';
import type { Tables } from './api';

export type DailyQuestion = Tables<'daily_questions'>;
export type QuestionAnswer = Tables<'question_answers'>;
export type QuestionGuess = Tables<'question_guesses'>;

export const questionService = {
  async getTodayQuestion(relationshipId: string): Promise<DailyQuestion | null> {
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await api.supabase
        .from('daily_questions')
        .select('*')
        .eq('relationship_id', relationshipId)
        .eq('question_date', today)
        .maybeSingle(); // Use maybeSingle to handle 0 or 1 rows without 406 error

      if (error) {
        console.error('Error getting today question:', error);
        return null;
      }

      return data;
    } catch (error) {
      return null; // Don't throw, just return null so generation can proceed
    }
  },

  async generateDailyQuestion(relationshipId: string, context?: any): Promise<DailyQuestion> {
    const today = new Date().toISOString().split('T')[0];

    // Check if question already exists for today
    const existing = await this.getTodayQuestion(relationshipId);
    if (existing) {
      return existing;
    }

    // Get recently used questions for this relationship (last 14 days) to avoid repeats
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

    const { data: recentQuestions } = await api.supabase
      .from('daily_questions')
      .select('question_text')
      .eq('relationship_id', relationshipId)
      .gte('question_date', fourteenDaysAgoStr);

    const recentlyUsedTexts = recentQuestions?.map(q => q.question_text) || [];

    // Get a random question from the global question bank
    let questions: any[] | null = null;
    let error: any = null;

    try {
      const result = await api.supabase
        .from('daily_questions')
        .select('*')
        .is('relationship_id', null); // Get global questions (relationship_id is NULL)

      questions = result.data;
      error = result.error;
    } catch (queryError) {
      error = queryError;
    }

    // If database query fails, fall back to hardcoded questions
    if (error || !questions || questions.length === 0) {

      // Fallback questions from the original implementation
      const fallbackQuestions = [
        "What is your favorite movie?",
        "What's your ideal way to spend a rainy day?",
        "What's something you've always wanted to try but haven't yet?",
        "What makes you feel most loved?",
        "What's your favorite childhood memory?",
        "What's something your partner does that makes you smile?",
        "What's your favorite way to relax after a long day?",
        "What's a small gesture that means a lot to you?",
        "What's your favorite thing about your partner?",
        "What's something you'd love to do together this month?",
        "What's your go-to comfort food?",
        "What's a book that changed your perspective?",
        "What's your favorite way to exercise or stay active?",
        "What's a skill you'd love to learn?",
        "What's your favorite season and why?",
        "What's a tradition you cherish?",
        "What's something that always makes you laugh?",
        "What's your favorite way to spend time alone?",
        "What's a place you've always wanted to visit?",
        "What's your favorite type of music and why?",
      ];

      // Filter out recently used questions
      const availableFallbacks = fallbackQuestions.filter(q => !recentlyUsedTexts.includes(q));

      // Create a mock question object from available questions
      const selectedQuestion = availableFallbacks.length > 0
        ? availableFallbacks[Math.floor(Math.random() * availableFallbacks.length)]
        : fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)]; // Fallback to any if all used

      questions = [{
        id: 'fallback-' + Date.now(),
        question_text: selectedQuestion,
        question_date: today,
        relationship_id: null,
        created_at: new Date().toISOString()
      }];
    } else {
      // Filter out recently used questions from database questions
      const availableQuestions = questions.filter(q => !recentlyUsedTexts.includes(q.question_text));

      // If we have available questions that haven't been used recently, use those
      // Otherwise, fall back to all questions (to prevent getting stuck)
      const questionsToChooseFrom = availableQuestions.length > 0 ? availableQuestions : questions;

      // Create a mock question object from available questions
      const randomQuestion = questionsToChooseFrom[Math.floor(Math.random() * questionsToChooseFrom.length)];
      questions = [randomQuestion];
    }

    // Select the question (now filtered)
    const selectedQuestion = questions[0];

    // Create a new daily question for this relationship
    try {
      const { data: question, error } = await api.supabase
        .from('daily_questions')
        .insert({
          question_text: selectedQuestion.question_text,
          question_date: today,
          relationship_id: relationshipId,
        })
        .select()
        .single();

      if (error) {
        // If insert fails, return a mock question object
        return {
          id: 'mock-' + Date.now(),
          question_text: selectedQuestion.question_text,
          question_date: today,
          relationship_id: relationshipId,
          created_at: new Date().toISOString()
        };
      }

      return question;
    } catch (insertError) {
      // Return mock question if database operations fail
      return {
        id: 'mock-' + Date.now(),
        question_text: selectedQuestion.question_text,
        question_date: today,
        relationship_id: relationshipId,
        created_at: new Date().toISOString()
      };
    }
  },

  /**
   * Get question usage analytics to help prevent repeats
   */
  async getQuestionUsageStats(relationshipId: string): Promise<{ question_text: string; last_used: string }[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await api.supabase
      .from('daily_questions')
      .select('question_text, question_date')
      .eq('relationship_id', relationshipId)
      .gte('question_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('question_date', { ascending: false });

    return data || [];
  },

  async saveAnswer(questionId: string, userId: string, answerText: string): Promise<QuestionAnswer> {
    const answer = await handleSupabaseError(
      api.supabase
        .from('question_answers')
        .upsert({
          question_id: questionId,
          user_id: userId,
          answer_text: answerText,
        }, {
          onConflict: 'question_id,user_id',
        })
        .select()
        .single()
    );

    return answer;
  },

  async saveGuess(questionId: string, userId: string, guessText: string): Promise<QuestionGuess> {
    const guess = await handleSupabaseError(
      api.supabase
        .from('question_guesses')
        .upsert({
          question_id: questionId,
          user_id: userId,
          guess_text: guessText,
        }, {
          onConflict: 'question_id,user_id',
        })
        .select()
        .single()
    );

    return guess;
  },

  async getPartnerAnswer(questionId: string, partnerId: string): Promise<QuestionAnswer | null> {
    const answer = await handleSupabaseError(
      api.supabase
        .from('question_answers')
        .select('*')
        .eq('question_id', questionId)
        .eq('user_id', partnerId)
        .single()
    );

    return answer;
  },

  async getUserAnswer(questionId: string, userId: string): Promise<QuestionAnswer | null> {
    const answer = await handleSupabaseError(
      api.supabase
        .from('question_answers')
        .select('*')
        .eq('question_id', questionId)
        .eq('user_id', userId)
        .single()
    );

    return answer;
  },

  async getUserGuess(questionId: string, userId: string): Promise<QuestionGuess | null> {
    const guess = await handleSupabaseError(
      api.supabase
        .from('question_guesses')
        .select('*')
        .eq('question_id', questionId)
        .eq('user_id', userId)
        .single()
    );

    return guess;
  },
};

