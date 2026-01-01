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

// Message suggestions based on context - Amora style romantic messages
const MESSAGE_SUGGESTIONS = {
  morning: [
    { text: "Good morning, my love! 🌅 Waking up knowing you're in my life makes every day brighter", emoji: "☀️" },
    { text: "Rise and shine, beautiful! Can't wait to see your smile today 💕", emoji: "🌸" },
    { text: "Every morning I'm grateful you're mine. Have the most amazing day!", emoji: "✨" },
    { text: "Sending you the biggest virtual hug to start your day 🤗💕", emoji: "💌" },
    { text: "You're the first thing on my mind when I wake up. I love you!", emoji: "💗" },
    { text: "Good morning, gorgeous! Remember: you're capable of amazing things today", emoji: "🌟" },
  ],
  afternoon: [
    { text: "Just taking a moment to tell you I love you 💕 Hope your day is going well!", emoji: "💭" },
    { text: "Random thought: I'm so lucky to be with you. That's all. 🥰", emoji: "☕" },
    { text: "Counting down the minutes until I can see your beautiful face again!", emoji: "⏰" },
    { text: "You've been on my mind all day. Sending you love and good vibes ✨", emoji: "💝" },
    { text: "Quick break to remind you that you're absolutely wonderful 💕", emoji: "🌸" },
    { text: "Thinking about all the reasons I love you... might take a while! 😊", emoji: "💖" },
  ],
  evening: [
    { text: "Can't wait to be in your arms tonight 🥰 Heading home to you!", emoji: "🏠" },
    { text: "The best part of my day is coming home to you 💕", emoji: "🌙" },
    { text: "Looking forward to our evening together. You make everything better", emoji: "💗" },
    { text: "Almost there, my love! Get ready for all the cuddles 🤗", emoji: "✨" },
    { text: "You're my favorite person to come home to. See you soon! 💕", emoji: "💝" },
  ],
  appreciation: [
    { text: "I just want you to know how much I appreciate everything you do 💖", emoji: "🙏" },
    { text: "Thank you for being you. You make my life so much more beautiful", emoji: "💖" },
    { text: "I notice all the little things you do for us. You're amazing 💕", emoji: "🌟" },
    { text: "Feeling so grateful for you today. Thank you for loving me 💗", emoji: "💕" },
    { text: "You're the best thing that's ever happened to me. I mean it.", emoji: "❤️" },
    { text: "I fall more in love with you every single day. Thank you for being mine 💕", emoji: "💖" },
  ],
  encouragement: [
    { text: "Hey love, just wanted to remind you that you've got this! 💪 I believe in you", emoji: "🌟" },
    { text: "Whatever you're facing today, remember I'm always cheering for you 💕", emoji: "👏" },
    { text: "You're so much stronger than you realize. I'm proud of you!", emoji: "🤗" },
    { text: "No matter what happens, I'm here for you. Always. 💗", emoji: "💪" },
    { text: "Remember how amazing you are! You inspire me every day ✨", emoji: "✨" },
    { text: "Tough day? Remember: you've overcome so much. You'll get through this too 💕", emoji: "🌈" },
  ],
  playful: [
    { text: "Hey you! 😏 Just wanted to say... I kinda sorta REALLY love you", emoji: "💕" },
    { text: "On a scale of 1-10, I miss you about a million 😄💕", emoji: "😄" },
    { text: "Do you have a map? Because I just got lost in thoughts of you! 🗺️", emoji: "🥰" },
    { text: "Quick reminder that you're absolutely adorable and I'm obsessed 😍", emoji: "🥰" },
    { text: "I love you more than coffee... and you know that's a BIG deal! ☕💕", emoji: "☕" },
    { text: "Is it weird that I miss you even when we're texting? Asking for a friend 😏", emoji: "💕" },
  ],
  romantic: [
    { text: "I still get butterflies when I think about you 🦋💕", emoji: "🦋" },
    { text: "You're not just my partner, you're my favorite person in the world 💗", emoji: "💗" },
    { text: "Every love song makes sense now that I have you ❤️", emoji: "🎵" },
    { text: "I love the way you love me. You make me feel so special 💕", emoji: "💖" },
    { text: "Being with you is my favorite adventure 🌟", emoji: "✨" },
    { text: "You're my today, my tomorrow, and all my days after 💕", emoji: "💝" },
  ],
  miss_you: [
    { text: "Missing you like crazy right now 💕 Wish you were here", emoji: "💭" },
    { text: "The distance only makes me love you more. Can't wait to see you! 💗", emoji: "💕" },
    { text: "Every moment away from you feels too long. Missing your face 🥺", emoji: "💝" },
    { text: "Counting down until I can hold you again 💕", emoji: "⏰" },
    { text: "You're my favorite hello and my hardest goodbye. Miss you! 💗", emoji: "💖" },
  ],
  goodnight: [
    { text: "Goodnight, my love 🌙 Dream of us and all our adventures to come 💕", emoji: "🌙" },
    { text: "Sweet dreams, beautiful! Can't wait to see you tomorrow ✨", emoji: "💫" },
    { text: "Wishing I could fall asleep in your arms. Sleep tight, my love 💗", emoji: "😴" },
    { text: "Last thought before I sleep: I'm so grateful for you. Goodnight! 💕", emoji: "🌟" },
    { text: "Sending you the coziest goodnight hug through this text 🤗💕", emoji: "💝" },
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
      // Determine time of day for smart suggestions
      const hour = new Date().getHours();
      let timeContext: 'morning' | 'afternoon' | 'evening' | 'goodnight' = 'afternoon';
      if (hour >= 5 && hour < 12) timeContext = 'morning';
      else if (hour >= 12 && hour < 17) timeContext = 'afternoon';
      else if (hour >= 17 && hour < 21) timeContext = 'evening';
      else timeContext = 'goodnight';

      // Get suggestions based on message type or time
      let suggestions: { text: string; emoji: string }[] = [];

      if (messageType && messageType in MESSAGE_SUGGESTIONS) {
        suggestions = MESSAGE_SUGGESTIONS[messageType as keyof typeof MESSAGE_SUGGESTIONS];
      } else {
        // Smart mix based on time of day
        const timeSuggestions = MESSAGE_SUGGESTIONS[timeContext] || MESSAGE_SUGGESTIONS.afternoon;

        // Create a varied mix with time-appropriate and general romantic messages
        suggestions = [
          ...timeSuggestions.slice(0, 2),
          ...MESSAGE_SUGGESTIONS.romantic.slice(0, 1),
          ...MESSAGE_SUGGESTIONS.appreciation.slice(0, 1),
          ...MESSAGE_SUGGESTIONS.playful.slice(0, 1),
          ...MESSAGE_SUGGESTIONS.miss_you.slice(0, 1),
        ];
      }

      // Shuffle for variety
      suggestions = [...suggestions].sort(() => Math.random() - 0.5);

      return suggestions.slice(0, 6).map((s, i) => ({
        id: `msg-${i}-${Date.now()}`,
        ...s,
      }));
    } catch (error) {
      console.error('Error getting message suggestions:', error);
      return MESSAGE_SUGGESTIONS.romantic.slice(0, 5).map((s, i) => ({
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
