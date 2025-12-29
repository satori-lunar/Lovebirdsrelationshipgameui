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
      ];


      // Create a mock question object
      questions = [{
        id: 'fallback-' + Date.now(),
        question_text: fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)],
        question_date: today,
        relationship_id: null,
        created_at: new Date().toISOString()
      }];
    }

    // Select a random question
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

    // Create a new daily question for this relationship
    try {
      const { data: question, error } = await api.supabase
        .from('daily_questions')
        .insert({
          question_text: randomQuestion.question_text,
          question_date: today,
          relationship_id: relationshipId,
        })
        .select()
        .single();

      if (error) {
        // If insert fails, return a mock question object
        return {
          id: 'mock-' + Date.now(),
          question_text: randomQuestion.question_text,
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
        question_text: randomQuestion.question_text,
        question_date: today,
        relationship_id: relationshipId,
        created_at: new Date().toISOString()
      };
    }
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

