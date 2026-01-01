/**
 * AI Suggestion Service
 *
 * Provides contextual AI-powered suggestions for goals, secrets, and messages.
 * Uses personalization data to generate relevant suggestions.
 */

import { api } from './api';
import { personalizationService } from './personalizationService';

export type SuggestionType = 'goal' | 'secret' | 'message';

export interface AISuggestion {
  id: string;
  text: string;
  category?: string;
  emoji?: string;
}

// Goal suggestions based on relationship stages and interests
const GOAL_SUGGESTIONS = {
  connection: [
    { text: "Have a weekly date night every Friday", emoji: "🌙", category: "quality_time" },
    { text: "Learn a new skill together (cooking, dancing, etc.)", emoji: "🎨", category: "growth" },
    { text: "Create a couples bucket list with 20 adventures", emoji: "✈️", category: "adventure" },
    { text: "Start a gratitude journal together", emoji: "📝", category: "appreciation" },
    { text: "Plan a surprise trip for your partner", emoji: "🎁", category: "surprises" },
    { text: "Have device-free dinners every night", emoji: "🍽️", category: "presence" },
    { text: "Send each other a love note every week", emoji: "💌", category: "words" },
    { text: "Create monthly photo memories together", emoji: "📸", category: "memories" },
  ],
  health: [
    { text: "Exercise together 3 times a week", emoji: "💪", category: "fitness" },
    { text: "Cook healthy meals together on Sundays", emoji: "🥗", category: "wellness" },
    { text: "Take daily walks together after dinner", emoji: "🚶", category: "movement" },
    { text: "Try couples yoga or meditation", emoji: "🧘", category: "mindfulness" },
  ],
  communication: [
    { text: "Have a weekly check-in conversation", emoji: "💬", category: "communication" },
    { text: "Practice active listening for 10 minutes daily", emoji: "👂", category: "listening" },
    { text: "Share 3 things you appreciate each day", emoji: "🙏", category: "gratitude" },
    { text: "Learn each other's love language deeply", emoji: "❤️", category: "understanding" },
  ],
  growth: [
    { text: "Read a relationship book together", emoji: "📚", category: "learning" },
    { text: "Set financial goals as a couple", emoji: "💰", category: "planning" },
    { text: "Attend a workshop or retreat together", emoji: "🏕️", category: "experiences" },
    { text: "Support each other's personal goals", emoji: "🌟", category: "support" },
  ],
};

// Secret/surprise suggestions
const SECRET_SUGGESTIONS = {
  romantic: [
    { text: "Plan a candlelit dinner at home", emoji: "🕯️", category: "date" },
    { text: "Create a memory scrapbook of your relationship", emoji: "📖", category: "gift" },
    { text: "Write a heartfelt love letter", emoji: "💕", category: "love_language" },
    { text: "Recreate your first date", emoji: "💑", category: "date" },
    { text: "Plan a surprise weekend getaway", emoji: "🏖️", category: "date" },
    { text: "Order their favorite meal delivered", emoji: "🍕", category: "gift" },
  ],
  thoughtful: [
    { text: "Handle a chore they dislike for a week", emoji: "✨", category: "love_language" },
    { text: "Plan a movie marathon of their favorites", emoji: "🎬", category: "date" },
    { text: "Get tickets to a show they've wanted to see", emoji: "🎭", category: "gift" },
    { text: "Create a playlist of 'our songs'", emoji: "🎵", category: "gift" },
    { text: "Set up a spa day at home", emoji: "🧖", category: "date" },
    { text: "Hide love notes around the house", emoji: "💌", category: "love_language" },
  ],
  playful: [
    { text: "Plan a surprise picnic date", emoji: "🧺", category: "date" },
    { text: "Organize a game night with their favorite games", emoji: "🎮", category: "date" },
    { text: "Create a treasure hunt with clues", emoji: "🗺️", category: "date" },
    { text: "Surprise them with breakfast in bed", emoji: "🥐", category: "love_language" },
    { text: "Plan a stargazing night", emoji: "⭐", category: "date" },
  ],
};

// Message suggestions based on context
const MESSAGE_SUGGESTIONS = {
  morning: [
    { text: "Good morning, beautiful! Can't wait to see you later 💕", emoji: "☀️" },
    { text: "Woke up thinking about you. Have an amazing day!", emoji: "🌅" },
    { text: "Hope your day is as wonderful as you are!", emoji: "✨" },
    { text: "Sending you all my love this morning 💗", emoji: "💌" },
  ],
  afternoon: [
    { text: "Just checking in - hope your day is going well!", emoji: "💭" },
    { text: "Taking a break to think about you 💕", emoji: "☕" },
    { text: "Counting down the hours until I see you!", emoji: "⏰" },
    { text: "You've been on my mind all day", emoji: "💝" },
  ],
  evening: [
    { text: "Can't wait to be home with you soon!", emoji: "🏠" },
    { text: "Thinking about cuddling up with you tonight", emoji: "🥰" },
    { text: "You're my favorite part of every day", emoji: "💕" },
    { text: "Miss you! See you soon, love", emoji: "💗" },
  ],
  appreciation: [
    { text: "I'm so grateful to have you in my life", emoji: "🙏" },
    { text: "Thank you for always being there for me", emoji: "💖" },
    { text: "You make everything better just by being you", emoji: "🌟" },
    { text: "I don't say it enough, but I appreciate you so much", emoji: "💕" },
    { text: "You're the best thing that's ever happened to me", emoji: "❤️" },
  ],
  encouragement: [
    { text: "I believe in you! You've got this 💪", emoji: "🌟" },
    { text: "Just wanted you to know I'm proud of you", emoji: "👏" },
    { text: "Whatever happens, I'm here for you", emoji: "🤗" },
    { text: "You're stronger than you know!", emoji: "💪" },
    { text: "Remember how amazing you are!", emoji: "✨" },
  ],
  playful: [
    { text: "Guess who loves you? 😏", emoji: "💕" },
    { text: "On a scale of 1-10, I miss you 100", emoji: "😄" },
    { text: "If you were a vegetable, you'd be a cute-cumber!", emoji: "🥒" },
    { text: "Quick reminder that you're adorable!", emoji: "🥰" },
    { text: "I love you more than pizza... and that's saying a lot!", emoji: "🍕" },
  ],
};

export const aiSuggestionService = {
  /**
   * Get AI suggestions for goals
   */
  async getGoalSuggestions(userId: string, partnerId: string): Promise<AISuggestion[]> {
    try {
      // Try to get personalization context
      let context: any = null;
      try {
        context = await personalizationService.getPersonalizationContext(userId, partnerId);
      } catch (e) {
        console.log('No personalization context available');
      }

      // Collect suggestions from all categories
      const allSuggestions = [
        ...GOAL_SUGGESTIONS.connection,
        ...GOAL_SUGGESTIONS.health,
        ...GOAL_SUGGESTIONS.communication,
        ...GOAL_SUGGESTIONS.growth,
      ];

      // Shuffle and prioritize based on context if available
      let suggestions = [...allSuggestions].sort(() => Math.random() - 0.5);

      // If we have love language info, prioritize relevant suggestions
      if (context?.insights?.loveLanguage) {
        const loveLanguage = context.insights.loveLanguage;
        suggestions = suggestions.sort((a, b) => {
          const aMatch = this.matchesLoveLanguage(a.category, loveLanguage);
          const bMatch = this.matchesLoveLanguage(b.category, loveLanguage);
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
      }

      return suggestions.slice(0, 5).map((s, i) => ({
        id: `goal-${i}-${Date.now()}`,
        ...s,
      }));
    } catch (error) {
      console.error('Error getting goal suggestions:', error);
      // Return fallback suggestions
      return GOAL_SUGGESTIONS.connection.slice(0, 5).map((s, i) => ({
        id: `goal-${i}-${Date.now()}`,
        ...s,
      }));
    }
  },

  /**
   * Get AI suggestions for secrets/surprises
   */
  async getSecretSuggestions(userId: string, partnerId: string): Promise<AISuggestion[]> {
    try {
      let context: any = null;
      try {
        context = await personalizationService.getPersonalizationContext(userId, partnerId);
      } catch (e) {
        console.log('No personalization context available');
      }

      // Collect all suggestions
      const allSuggestions = [
        ...SECRET_SUGGESTIONS.romantic,
        ...SECRET_SUGGESTIONS.thoughtful,
        ...SECRET_SUGGESTIONS.playful,
      ];

      // Shuffle suggestions
      let suggestions = [...allSuggestions].sort(() => Math.random() - 0.5);

      // If we have partner interests, prioritize matching suggestions
      if (context?.insights?.keywords) {
        const keywords = Object.keys(context.insights.keywords);
        suggestions = suggestions.sort((a, b) => {
          const aMatch = keywords.some(k => a.text.toLowerCase().includes(k.toLowerCase()));
          const bMatch = keywords.some(k => b.text.toLowerCase().includes(k.toLowerCase()));
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
      }

      return suggestions.slice(0, 5).map((s, i) => ({
        id: `secret-${i}-${Date.now()}`,
        ...s,
      }));
    } catch (error) {
      console.error('Error getting secret suggestions:', error);
      return SECRET_SUGGESTIONS.romantic.slice(0, 5).map((s, i) => ({
        id: `secret-${i}-${Date.now()}`,
        ...s,
      }));
    }
  },

  /**
   * Get AI suggestions for messages
   */
  async getMessageSuggestions(
    userId: string,
    partnerId: string,
    messageType?: string
  ): Promise<AISuggestion[]> {
    try {
      // Determine time of day
      const hour = new Date().getHours();
      let timeContext: 'morning' | 'afternoon' | 'evening' = 'afternoon';
      if (hour >= 5 && hour < 12) timeContext = 'morning';
      else if (hour >= 12 && hour < 17) timeContext = 'afternoon';
      else timeContext = 'evening';

      // Get suggestions based on message type or time
      let suggestions: { text: string; emoji: string }[] = [];

      if (messageType && messageType in MESSAGE_SUGGESTIONS) {
        suggestions = MESSAGE_SUGGESTIONS[messageType as keyof typeof MESSAGE_SUGGESTIONS];
      } else {
        // Mix time-based and other suggestions
        suggestions = [
          ...MESSAGE_SUGGESTIONS[timeContext].slice(0, 2),
          ...MESSAGE_SUGGESTIONS.appreciation.slice(0, 2),
          ...MESSAGE_SUGGESTIONS.playful.slice(0, 1),
        ];
      }

      // Shuffle a bit for variety
      suggestions = [...suggestions].sort(() => Math.random() - 0.5);

      return suggestions.slice(0, 5).map((s, i) => ({
        id: `msg-${i}-${Date.now()}`,
        ...s,
      }));
    } catch (error) {
      console.error('Error getting message suggestions:', error);
      return MESSAGE_SUGGESTIONS.appreciation.slice(0, 5).map((s, i) => ({
        id: `msg-${i}-${Date.now()}`,
        ...s,
      }));
    }
  },

  /**
   * Refresh suggestions (get new random set)
   */
  async refreshSuggestions(
    type: SuggestionType,
    userId: string,
    partnerId: string,
    messageType?: string
  ): Promise<AISuggestion[]> {
    switch (type) {
      case 'goal':
        return this.getGoalSuggestions(userId, partnerId);
      case 'secret':
        return this.getSecretSuggestions(userId, partnerId);
      case 'message':
        return this.getMessageSuggestions(userId, partnerId, messageType);
      default:
        return [];
    }
  },

  /**
   * Check if a category matches a love language
   */
  matchesLoveLanguage(category: string | undefined, loveLanguage: string): boolean {
    if (!category) return false;

    const mappings: Record<string, string[]> = {
      words_of_affirmation: ['words', 'appreciation', 'gratitude', 'communication'],
      quality_time: ['quality_time', 'presence', 'date', 'experiences'],
      acts_of_service: ['support', 'wellness', 'planning'],
      receiving_gifts: ['surprises', 'gift', 'memories'],
      physical_touch: ['fitness', 'movement', 'mindfulness'],
    };

    const relevantCategories = mappings[loveLanguage] || [];
    return relevantCategories.includes(category);
  },
};
