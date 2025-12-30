/**
 * Love Nudges Service
 *
 * Generates gentle reminders and suggestions for thoughtful actions
 * based on partner's love language, preferences, and saved suggestions.
 */

import { api } from './api';
import { onboardingService } from './onboardingService';
import { addDays, differenceInDays, format, startOfDay } from 'date-fns';

export interface LoveNudge {
  id: string;
  type: 'suggestion' | 'reminder' | 'milestone';
  category: 'love_language' | 'saved_item' | 'upcoming_event' | 'general';
  title: string;
  message: string;
  actionText?: string;
  actionRoute?: string;
  priority: 'low' | 'medium' | 'high';
  loveLanguage?: string;
  expiresAt?: Date;
}

export const loveNudgesService = {
  /**
   * Get today's love nudges for a user
   */
  async getTodaysNudges(userId: string, partnerId: string): Promise<LoveNudge[]> {
    try {
      const [partnerOnboarding, savedSuggestions, completedSuggestions] = await Promise.all([
        onboardingService.getOnboarding(partnerId),
        this.getSavedButNotCompleted(userId),
        this.getRecentlyCompleted(userId),
      ]);

      const nudges: LoveNudge[] = [];

      // 1. Love Language Nudges
      if (partnerOnboarding?.love_language_primary) {
        const loveLanguageNudge = this.generateLoveLanguageNudge(
          partnerOnboarding.love_language_primary,
          partnerOnboarding.name || 'your partner'
        );
        if (loveLanguageNudge) nudges.push(loveLanguageNudge);
      }

      // 2. Saved Items Reminder
      if (savedSuggestions.length > 0) {
        const savedItemNudge = this.generateSavedItemNudge(
          savedSuggestions,
          partnerOnboarding?.name || 'your partner'
        );
        if (savedItemNudge) nudges.push(savedItemNudge);
      }

      // 3. Upcoming Events
      if (partnerOnboarding?.birthday) {
        const birthdayNudge = this.generateBirthdayNudge(
          partnerOnboarding.birthday,
          partnerOnboarding.name || 'your partner'
        );
        if (birthdayNudge) nudges.push(birthdayNudge);
      }

      // 4. Encouragement (if completed something recently)
      if (completedSuggestions.length > 0) {
        const encouragementNudge = this.generateEncouragementNudge(
          completedSuggestions.length,
          partnerOnboarding?.name || 'your partner'
        );
        if (encouragementNudge) nudges.push(encouragementNudge);
      }

      // 5. General Relationship Nudges
      const generalNudge = this.generateGeneralNudge(
        partnerOnboarding?.name || 'your partner',
        partnerOnboarding?.wants_needs
      );
      if (generalNudge) nudges.push(generalNudge);

      // Sort by priority
      return nudges.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      console.error('Error getting love nudges:', error);
      return [];
    }
  },

  /**
   * Generate a love language-specific nudge
   */
  generateLoveLanguageNudge(loveLanguage: string, partnerName: string): LoveNudge | null {
    const nudgesByLanguage: Record<string, string[]> = {
      'Words of Affirmation': [
        `Send ${partnerName} a text telling them why you appreciate them`,
        `Leave ${partnerName} a sticky note with a compliment somewhere they'll find it`,
        `Tell ${partnerName} something specific you love about them today`,
        `Write down 3 things ${partnerName} does well and share them tonight`,
      ],
      'Quality Time': [
        `Put your phone away and have a 20-minute conversation with ${partnerName}`,
        `Plan a device-free hour together with ${partnerName} tonight`,
        `Ask ${partnerName} about their day and really listen`,
        `Suggest a short walk together after dinner with ${partnerName}`,
      ],
      'Acts of Service': [
        `Do one of ${partnerName}'s chores without being asked`,
        `Prepare ${partnerName}'s favorite drink/snack and bring it to them`,
        `Handle something on ${partnerName}'s to-do list today`,
        `Make ${partnerName}'s morning easier by preparing something they need`,
      ],
      'Receiving Gifts': [
        `Pick up ${partnerName}'s favorite treat on your way home`,
        `Surprise ${partnerName} with something small that reminded you of them`,
        `Check out gift ideas for ${partnerName} - their birthday/anniversary is coming up!`,
        `Order something ${partnerName} mentioned wanting`,
      ],
      'Physical Touch': [
        `Give ${partnerName} a long hug when you see them today`,
        `Offer ${partnerName} a shoulder massage this evening`,
        `Hold ${partnerName}'s hand during your next conversation`,
        `Cuddle with ${partnerName} for 10 minutes before bed`,
      ],
    };

    const messages = nudgesByLanguage[loveLanguage];
    if (!messages || messages.length === 0) return null;

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    return {
      id: `ll-${Date.now()}`,
      type: 'suggestion',
      category: 'love_language',
      title: `${loveLanguage} Nudge`,
      message: randomMessage,
      priority: 'medium',
      loveLanguage,
    };
  },

  /**
   * Generate nudge for saved but not completed items
   */
  generateSavedItemNudge(savedSuggestions: any[], partnerName: string): LoveNudge | null {
    if (savedSuggestions.length === 0) return null;

    const randomItem = savedSuggestions[Math.floor(Math.random() * savedSuggestions.length)];
    const categoryName = randomItem.category === 'love_language' ? 'love language action'
      : randomItem.category === 'gift' ? 'gift idea'
      : 'date idea';

    return {
      id: `saved-${randomItem.id}`,
      type: 'reminder',
      category: 'saved_item',
      title: 'You saved this!',
      message: `Remember: "${randomItem.metadata?.title || randomItem.suggestion_text}". Ready to make it happen for ${partnerName}?`,
      actionText: `View ${categoryName}`,
      actionRoute: randomItem.category === 'love_language' ? 'love-language'
        : randomItem.category === 'gift' ? 'gifts'
        : 'dates',
      priority: 'high',
    };
  },

  /**
   * Generate birthday/anniversary nudges
   */
  generateBirthdayNudge(birthday: string, partnerName: string): LoveNudge | null {
    try {
      const birthdayDate = new Date(birthday);
      const today = startOfDay(new Date());

      // Get this year's birthday
      const thisYearBirthday = new Date(
        today.getFullYear(),
        birthdayDate.getMonth(),
        birthdayDate.getDate()
      );

      // If birthday already passed this year, check next year
      const nextBirthday = thisYearBirthday < today
        ? addDays(thisYearBirthday, 365)
        : thisYearBirthday;

      const daysUntil = differenceInDays(nextBirthday, today);

      // Show nudges at specific intervals
      if (daysUntil === 7) {
        return {
          id: 'bday-7',
          type: 'milestone',
          category: 'upcoming_event',
          title: '1 Week Until Birthday! 🎂',
          message: `${partnerName}'s birthday is in one week! Time to start planning something special.`,
          actionText: 'Browse gifts',
          actionRoute: 'gifts',
          priority: 'high',
          expiresAt: nextBirthday,
        };
      } else if (daysUntil === 3) {
        return {
          id: 'bday-3',
          type: 'milestone',
          category: 'upcoming_event',
          title: '3 Days Until Birthday!',
          message: `${partnerName}'s birthday is in 3 days. Have you finalized your plans?`,
          actionText: 'View saved gifts',
          actionRoute: 'gifts',
          priority: 'high',
          expiresAt: nextBirthday,
        };
      } else if (daysUntil === 0) {
        return {
          id: 'bday-today',
          type: 'milestone',
          category: 'upcoming_event',
          title: `🎉 Today is ${partnerName}'s Birthday!`,
          message: 'Make today special! Don\'t forget to show them how much you care.',
          priority: 'high',
          expiresAt: nextBirthday,
        };
      }

      return null;
    } catch (error) {
      console.error('Error generating birthday nudge:', error);
      return null;
    }
  },

  /**
   * Generate encouragement nudge for completed actions
   */
  generateEncouragementNudge(completedCount: number, partnerName: string): LoveNudge | null {
    const messages = [
      `You've completed ${completedCount} thoughtful action(s) recently! ${partnerName} is lucky to have you. 💕`,
      `Amazing! You've done ${completedCount} thing(s) for ${partnerName} this week. Keep up the great work!`,
      `${completedCount} completed! You're being an incredible partner to ${partnerName}. 🌟`,
    ];

    return {
      id: `encourage-${Date.now()}`,
      type: 'suggestion',
      category: 'general',
      title: 'You\'re doing great!',
      message: messages[Math.floor(Math.random() * messages.length)],
      priority: 'low',
    };
  },

  /**
   * Generate general relationship nudge
   */
  generateGeneralNudge(partnerName: string, wantsNeeds?: any): LoveNudge | null {
    const generalNudges = [
      {
        title: 'Check In',
        message: `When's the last time you asked ${partnerName} how they're really feeling?`,
        priority: 'medium' as const,
      },
      {
        title: 'Date Night',
        message: `It's been a while! Plan a date night with ${partnerName} this week.`,
        actionText: 'Browse dates',
        actionRoute: 'dates',
        priority: 'medium' as const,
      },
      {
        title: 'Express Gratitude',
        message: `Tell ${partnerName} one thing you're grateful for about them today.`,
        priority: 'low' as const,
      },
    ];

    // Add wishes-based nudge if available
    if (wantsNeeds?.wishes) {
      generalNudges.push({
        title: 'Remember Their Wish',
        message: `${partnerName} mentioned wanting: "${wantsNeeds.wishes.substring(0, 60)}..."`,
        priority: 'high' as const,
      });
    }

    const nudge = generalNudges[Math.floor(Math.random() * generalNudges.length)];

    return {
      id: `general-${Date.now()}`,
      type: 'suggestion',
      category: 'general',
      ...nudge,
    };
  },

  /**
   * Get saved suggestions that haven't been completed
   */
  async getSavedButNotCompleted(userId: string): Promise<any[]> {
    try {
      const { data, error } = await api.supabase
        .from('suggestions')
        .select('*')
        .eq('user_id', userId)
        .eq('saved', true)
        .eq('completed', false)
        .limit(5);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting saved suggestions:', error);
      return [];
    }
  },

  /**
   * Get recently completed suggestions (last 7 days)
   */
  async getRecentlyCompleted(userId: string): Promise<any[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await api.supabase
        .from('suggestions')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('updated_at', sevenDaysAgo.toISOString());

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting completed suggestions:', error);
      return [];
    }
  },
};
