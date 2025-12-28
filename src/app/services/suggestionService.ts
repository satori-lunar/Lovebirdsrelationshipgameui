import { api, handleSupabaseError } from './api';
import type { Tables, Updates } from './api';

export type LoveLanguageSuggestion = Tables<'love_language_suggestions'>;

export const suggestionService = {
  async getWeeklySuggestions(userId: string): Promise<LoveLanguageSuggestion[]> {
    // Get Monday of current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toISOString().split('T')[0];

    const suggestions = await handleSupabaseError(
      api.supabase
        .from('love_language_suggestions')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStart)
        .order('created_at', { ascending: true })
    );

    return suggestions || [];
  },

  async generateSuggestions(userId: string, partnerData: any): Promise<LoveLanguageSuggestion[]> {
    // Get Monday of current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toISOString().split('T')[0];

    // Check if suggestions already exist for this week
    const existing = await this.getWeeklySuggestions(userId);
    if (existing.length > 0) {
      return existing;
    }

    // Generate suggestions based on love language
    const loveLanguages = partnerData.love_languages || [];
    const suggestions: any[] = [];

    if (loveLanguages.includes('words')) {
      suggestions.push({
        user_id: userId,
        suggestion_text: "Write a short love letter and leave it somewhere they'll find it - in their bag, on the mirror, or their pillow.",
        suggestion_type: "Words of Affirmation",
        time_estimate: "15 minutes",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Create an affirmation scavenger hunt with 5-7 notes, each highlighting something you love about them.",
        suggestion_type: "Words of Affirmation",
        time_estimate: "30 minutes",
        difficulty: "Medium",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Pick up their favorite flowers and attach a handwritten note thanking them for specific things they've done recently.",
        suggestion_type: "Words of Affirmation",
        time_estimate: "20 minutes",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
    } else if (loveLanguages.includes('quality-time')) {
      suggestions.push({
        user_id: userId,
        suggestion_text: "Plan a device-free evening together - no phones, no distractions, just focused time together.",
        suggestion_type: "Quality Time",
        time_estimate: "2-3 hours",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Take a walk together and ask meaningful questions about their day, dreams, or feelings.",
        suggestion_type: "Quality Time",
        time_estimate: "30 minutes",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Cook a meal together and make it an experience - try a new recipe, play music, and enjoy the process.",
        suggestion_type: "Quality Time",
        time_estimate: "1-2 hours",
        difficulty: "Medium",
        week_start_date: weekStart,
      });
    } else if (loveLanguages.includes('gifts')) {
      suggestions.push({
        user_id: userId,
        suggestion_text: "Surprise them with a small, thoughtful gift that shows you've been paying attention to what they need or want.",
        suggestion_type: "Receiving Gifts",
        time_estimate: "30 minutes",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Create a personalized gift that represents a special memory or inside joke between you two.",
        suggestion_type: "Receiving Gifts",
        time_estimate: "1-2 hours",
        difficulty: "Medium",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Pick up something small 'just because' - their favorite snack, a book they mentioned, or a small trinket.",
        suggestion_type: "Receiving Gifts",
        time_estimate: "15 minutes",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
    } else if (loveLanguages.includes('acts')) {
      suggestions.push({
        user_id: userId,
        suggestion_text: "Take on one of their regular chores or tasks without being asked - do the dishes, take out the trash, or handle something they usually do.",
        suggestion_type: "Acts of Service",
        time_estimate: "15-30 minutes",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Prepare their favorite meal or bring them breakfast in bed.",
        suggestion_type: "Acts of Service",
        time_estimate: "30-45 minutes",
        difficulty: "Medium",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Help them with a project or task they've been putting off - offer your time and assistance.",
        suggestion_type: "Acts of Service",
        time_estimate: "1-2 hours",
        difficulty: "Medium",
        week_start_date: weekStart,
      });
    } else if (loveLanguages.includes('touch')) {
      suggestions.push({
        user_id: userId,
        suggestion_text: "Give them a long, meaningful hug when they least expect it - hold it for at least 20 seconds.",
        suggestion_type: "Physical Touch",
        time_estimate: "1 minute",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Offer a back or shoulder massage after a long day - no expectations, just care.",
        suggestion_type: "Physical Touch",
        time_estimate: "15-20 minutes",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Hold their hand, put your arm around them, or sit close while watching TV or talking.",
        suggestion_type: "Physical Touch",
        time_estimate: "Ongoing",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
    } else {
      // Default suggestions
      suggestions.push({
        user_id: userId,
        suggestion_text: "Write a short note expressing appreciation for something specific they did recently.",
        suggestion_type: "General",
        time_estimate: "5 minutes",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Plan a surprise date or activity based on their interests.",
        suggestion_type: "General",
        time_estimate: "1-2 hours",
        difficulty: "Medium",
        week_start_date: weekStart,
      });
      suggestions.push({
        user_id: userId,
        suggestion_text: "Do something thoughtful that shows you've been listening to their needs.",
        suggestion_type: "General",
        time_estimate: "30 minutes",
        difficulty: "Easy",
        week_start_date: weekStart,
      });
    }

    // Insert suggestions
    const inserted = await handleSupabaseError(
      api.supabase
        .from('love_language_suggestions')
        .insert(suggestions)
        .select()
    );

    return inserted || [];
  },

  async updateSuggestion(
    suggestionId: string,
    updates: Partial<Updates<'love_language_suggestions'>>
  ): Promise<LoveLanguageSuggestion> {
    const updated = await handleSupabaseError(
      api.supabase
        .from('love_language_suggestions')
        .update(updates)
        .eq('id', suggestionId)
        .select()
        .single()
    );

    return updated;
  },
};

