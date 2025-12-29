import { api, handleSupabaseError } from './api';
import type { Tables } from './api';

export type DailyQuestion = Tables<'daily_questions'>;
export type QuestionAnswer = Tables<'question_answers'>;
export type QuestionGuess = Tables<'question_guesses'>;

export const questionService = {
  async getTodayQuestion(relationshipId: string): Promise<DailyQuestion | null> {
    const today = new Date().toISOString().split('T')[0];
    console.log('getTodayQuestion called with:', { relationshipId, today });

    try {
      const { data, error } = await api.supabase
        .from('daily_questions')
        .select('*')
        .eq('relationship_id', relationshipId)
        .eq('question_date', today)
        .single();

      console.log('getTodayQuestion result:', { data, error });

      if (error) {
        // If no rows found (PGRST116) or table doesn't exist, that's OK
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.log('No question found for today or table issue, will generate new one');
          return null;
        }
        // For other errors, log and return null (don't throw)
        console.error('getTodayQuestion error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('getTodayQuestion exception, returning null:', error);
      return null; // Don't throw, just return null so generation can proceed
    }
  },

  async generateDailyQuestion(relationshipId: string, context?: any): Promise<DailyQuestion> {
    const today = new Date().toISOString().split('T')[0];
    console.log('Generating daily question for relationship:', relationshipId, 'date:', today);

    // Check if question already exists for today
    const existing = await this.getTodayQuestion(relationshipId);
    console.log('Existing question:', existing);
    if (existing) {
      return existing;
    }

    // First, try a simple query to check if table exists
    try {
      const { data: testQuery, error: testError } = await api.supabase
        .from('daily_questions')
        .select('id')
        .limit(1);

      console.log('Table existence test:', { testQuery, testError });
    } catch (tableError) {
      console.error('Table access error:', tableError);
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
      console.log('Global questions query result:', { questions: questions?.length, error });
    } catch (queryError) {
      console.error('Query failed completely:', queryError);
      error = queryError;
    }

    // If database query fails, fall back to hardcoded questions
    if (error || !questions || questions.length === 0) {
      console.warn('Using fallback questions due to database issue:', error?.message);

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

      console.log('Using fallback questions, count:', fallbackQuestions.length);

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
    console.log('Selected random question:', randomQuestion.question_text);

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

      console.log('Insert result:', { question, error });

      if (error) {
        console.error('Failed to insert question:', error);
        // If insert fails, return a mock question object
        console.warn('Returning mock question due to insert failure');
        return {
          id: 'mock-' + Date.now(),
          question_text: randomQuestion.question_text,
          question_date: today,
          relationship_id: relationshipId,
          created_at: new Date().toISOString()
        };
      }

      console.log('Created new question:', question);
      return question;
    } catch (insertError) {
      console.error('Insert exception:', insertError);
      // Return mock question if database operations fail
      console.warn('Returning mock question due to database issues');
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

