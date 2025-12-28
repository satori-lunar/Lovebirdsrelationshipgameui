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
    // This would typically call an AI service to generate questions
    // For now, we'll use a fallback question bank
    const questionBank = [
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

    const randomQuestion = questionBank[Math.floor(Math.random() * questionBank.length)];
    const today = new Date().toISOString().split('T')[0];

    // Check if question already exists for today
    const existing = await this.getTodayQuestion(relationshipId);
    if (existing) {
      return existing;
    }

    const question = await handleSupabaseError(
      api.supabase
        .from('daily_questions')
        .insert({
          relationship_id: relationshipId,
          question_text: randomQuestion,
          question_date: today,
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

