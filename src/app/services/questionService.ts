import { api, handleSupabaseError } from './api';
import type { Tables } from './api';

export type DailyQuestion = Tables<'daily_questions'>;
export type QuestionAnswer = Tables<'question_answers'>;
export type QuestionGuess = Tables<'question_guesses'>;

export const questionService = {
  async getTodayQuestion(relationshipId: string): Promise<DailyQuestion | null> {
    const today = new Date().toISOString().split('T')[0];
    
    const question = await handleSupabaseError(
      api.supabase
        .from('daily_questions')
        .select('*')
        .eq('relationship_id', relationshipId)
        .eq('question_date', today)
        .single()
    );

    return question;
  },

  async generateDailyQuestion(relationshipId: string, context?: any): Promise<DailyQuestion> {
    const today = new Date().toISOString().split('T')[0];

    // Check if question already exists for today
    const existing = await this.getTodayQuestion(relationshipId);
    if (existing) {
      return existing;
    }

    // Get a random question from the global question bank
    const { data: questions, error } = await api.supabase
      .from('daily_questions')
      .select('*')
      .is('relationship_id', null); // Get global questions (relationship_id is NULL)

    if (error || !questions || questions.length === 0) {
      throw new Error('No questions available');
    }

    // Select a random question
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

    // Create a new daily question for this relationship
    const question = await handleSupabaseError(
      api.supabase
        .from('daily_questions')
        .insert({
          question_text: randomQuestion.question_text,
          question_date: today,
          relationship_id: relationshipId,
        })
        .select()
        .single()
    );

    return question;
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

