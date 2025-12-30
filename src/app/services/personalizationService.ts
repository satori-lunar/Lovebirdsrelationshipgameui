/**
 * Personalization Service
 *
 * Aggregates user data from multiple sources to enable personalized suggestions:
 * - User and partner onboarding data
 * - Saved partner insights
 * - Daily question answers
 *
 * Calculates personalization tier and provides context for suggestion generation.
 */

import { api } from './api';
import { onboardingService } from './onboardingService';
import { insightsService } from './insightsService';

export interface PersonalizationContext {
  tier: 1 | 2 | 3 | 4;
  partner: {
    name: string;
    birthday?: string;
    loveLanguages: {
      primary?: string;
      secondary?: string;
      all: string[];
    };
    preferences: {
      date_types?: string[];
      gift_budget?: string;
      nudge_frequency?: string;
    };
    wants_needs: {
      gestures?: string[];
      surprise_frequency?: string;
      date_style?: string;
      gift_types?: string[];
      planning_style?: string;
      avoid?: string[];
      notes?: string;
    };
  };
  insights: {
    saved: any[];
    keywords: Record<string, string[]>;
    themes: Record<string, any[]>;
    count: number;
  };
  dataSources: {
    onboarding_updated?: string;
    partner_onboarding_updated?: string;
    insights_count: number;
    answers_count: number;
  };
}

export const personalizationService = {
  /**
   * Get comprehensive personalization context for a user
   */
  async getPersonalizationContext(
    userId: string,
    partnerId: string
  ): Promise<PersonalizationContext> {
    try {
      // Fetch all data in parallel
      const [userOnboarding, partnerOnboarding, savedInsights, recentAnswers] =
        await Promise.all([
          onboardingService.getOnboarding(userId),
          onboardingService.getOnboarding(partnerId),
          insightsService.getSavedInsights(userId),
          this.getRecentAnswersCount(userId),
        ]);

      // Calculate personalization tier
      const tier = this.calculateTier(
        !!partnerOnboarding,
        savedInsights.length,
        recentAnswers
      );

      // Extract keywords and themes from insights
      const keywords = this.extractKeywords(savedInsights);
      const themes = this.groupByTheme(savedInsights);

      // Build context object
      const context: PersonalizationContext = {
        tier,
        partner: {
          name: partnerOnboarding?.name || 'your partner',
          birthday: partnerOnboarding?.birthday,
          loveLanguages: {
            primary: partnerOnboarding?.love_language_primary,
            secondary: partnerOnboarding?.love_language_secondary,
            all: partnerOnboarding?.love_languages || [],
          },
          preferences: {
            date_types: partnerOnboarding?.preferences?.date_types || [],
            gift_budget: partnerOnboarding?.preferences?.gift_budget,
            nudge_frequency: partnerOnboarding?.preferences?.nudge_frequency,
          },
          wants_needs: {
            gestures: partnerOnboarding?.wants_needs?.gestures || [],
            surprise_frequency:
              partnerOnboarding?.wants_needs?.surprise_frequency,
            date_style: partnerOnboarding?.wants_needs?.date_style,
            gift_types: partnerOnboarding?.wants_needs?.gift_types || [],
            planning_style: partnerOnboarding?.wants_needs?.planning_style,
            avoid: partnerOnboarding?.wants_needs?.avoid || [],
            notes: partnerOnboarding?.wants_needs?.notes,
          },
        },
        insights: {
          saved: savedInsights,
          keywords,
          themes,
          count: savedInsights.length,
        },
        dataSources: {
          onboarding_updated: userOnboarding?.updated_at,
          partner_onboarding_updated: partnerOnboarding?.updated_at,
          insights_count: savedInsights.length,
          answers_count: recentAnswers,
        },
      };

      return context;
    } catch (error) {
      console.error('Error getting personalization context:', error);
      throw error;
    }
  },

  /**
   * Calculate personalization tier based on available data
   *
   * Tier 1: Basic (just partner name, no onboarding)
   * Tier 2: Partner onboarding data available
   * Tier 3: Has saved insights (1-4)
   * Tier 4: Rich data (5+ insights or 30+ answers)
   */
  calculateTier(
    hasPartnerOnboarding: boolean,
    insightsCount: number,
    answersCount: number
  ): 1 | 2 | 3 | 4 {
    // Tier 4: Rich personalization data
    if (insightsCount >= 5 || answersCount >= 30) {
      return 4;
    }

    // Tier 3: Has some saved insights or many answers
    if (insightsCount >= 1 || answersCount >= 10) {
      return 3;
    }

    // Tier 2: Has partner onboarding data
    if (hasPartnerOnboarding) {
      return 2;
    }

    // Tier 1: Basic (only partner name)
    return 1;
  },

  /**
   * Extract keywords from saved insights
   * Groups by category: dates, gifts, interests, dislikes, etc.
   */
  extractKeywords(insights: any[]): Record<string, string[]> {
    const keywords: Record<string, string[]> = {
      dates: [],
      gifts: [],
      interests: [],
      dislikes: [],
      favorites: [],
      activities: [],
      places: [],
      foods: [],
    };

    insights.forEach((insight) => {
      const text = insight.partner_answer?.toLowerCase() || '';
      const question = insight.question_text?.toLowerCase() || '';

      // Date-related keywords
      if (
        question.includes('date') ||
        question.includes('activity') ||
        question.includes('do together')
      ) {
        keywords.dates.push(insight.partner_answer);
      }

      // Gift-related keywords
      if (
        question.includes('gift') ||
        question.includes('present') ||
        question.includes('receive')
      ) {
        keywords.gifts.push(insight.partner_answer);
      }

      // Interest keywords
      if (
        question.includes('hobby') ||
        question.includes('interest') ||
        question.includes('passion') ||
        question.includes('enjoy')
      ) {
        keywords.interests.push(insight.partner_answer);
      }

      // Dislikes
      if (
        question.includes('dislike') ||
        question.includes('hate') ||
        question.includes('avoid') ||
        text.includes("don't like") ||
        text.includes('not a fan')
      ) {
        keywords.dislikes.push(insight.partner_answer);
      }

      // Favorites
      if (
        question.includes('favorite') ||
        question.includes('prefer') ||
        text.includes('love') ||
        text.includes('favorite')
      ) {
        keywords.favorites.push(insight.partner_answer);
      }

      // Activities
      if (
        text.includes('hiking') ||
        text.includes('cooking') ||
        text.includes('reading') ||
        text.includes('watching') ||
        text.includes('playing')
      ) {
        keywords.activities.push(insight.partner_answer);
      }

      // Places
      if (
        text.includes('beach') ||
        text.includes('mountain') ||
        text.includes('park') ||
        text.includes('restaurant') ||
        text.includes('museum')
      ) {
        keywords.places.push(insight.partner_answer);
      }

      // Foods
      if (
        question.includes('food') ||
        question.includes('meal') ||
        question.includes('eat') ||
        text.includes('pizza') ||
        text.includes('coffee') ||
        text.includes('dessert')
      ) {
        keywords.foods.push(insight.partner_answer);
      }
    });

    // Remove duplicates and empty arrays
    Object.keys(keywords).forEach((key) => {
      keywords[key] = [...new Set(keywords[key].filter(Boolean))];
      if (keywords[key].length === 0) {
        delete keywords[key];
      }
    });

    return keywords;
  },

  /**
   * Group insights by theme for better suggestion matching
   */
  groupByTheme(insights: any[]): Record<string, any[]> {
    const themes: Record<string, any[]> = {
      relationship: [],
      future: [],
      past: [],
      preferences: [],
      emotions: [],
    };

    insights.forEach((insight) => {
      const question = insight.question_text?.toLowerCase() || '';

      if (
        question.includes('relationship') ||
        question.includes('together') ||
        question.includes('us')
      ) {
        themes.relationship.push(insight);
      }

      if (
        question.includes('future') ||
        question.includes('dream') ||
        question.includes('hope') ||
        question.includes('someday')
      ) {
        themes.future.push(insight);
      }

      if (
        question.includes('memory') ||
        question.includes('remember') ||
        question.includes('first') ||
        question.includes('past')
      ) {
        themes.past.push(insight);
      }

      if (
        question.includes('prefer') ||
        question.includes('favorite') ||
        question.includes('like') ||
        question.includes('choose')
      ) {
        themes.preferences.push(insight);
      }

      if (
        question.includes('feel') ||
        question.includes('emotion') ||
        question.includes('happy') ||
        question.includes('sad') ||
        question.includes('stress')
      ) {
        themes.emotions.push(insight);
      }
    });

    // Remove empty themes
    Object.keys(themes).forEach((key) => {
      if (themes[key].length === 0) {
        delete themes[key];
      }
    });

    return themes;
  },

  /**
   * Get count of recent daily question answers
   */
  async getRecentAnswersCount(userId: string): Promise<number> {
    try {
      const { count, error } = await api.supabase
        .from('question_answers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error counting answers:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getRecentAnswersCount:', error);
      return 0;
    }
  },

  /**
   * Get data sources summary for tracking what data was used
   */
  getDataSourcesSummary(context: PersonalizationContext): Record<string, any> {
    return {
      tier: context.tier,
      has_partner_onboarding: !!context.dataSources.partner_onboarding_updated,
      insights_count: context.dataSources.insights_count,
      answers_count: context.dataSources.answers_count,
      has_keywords: Object.keys(context.insights.keywords).length > 0,
      keyword_categories: Object.keys(context.insights.keywords),
      theme_categories: Object.keys(context.insights.themes),
      partner_preferences: {
        has_date_types: (context.partner.preferences.date_types?.length || 0) > 0,
        has_gift_budget: !!context.partner.preferences.gift_budget,
        has_love_languages:
          !!context.partner.loveLanguages.primary ||
          !!context.partner.loveLanguages.secondary,
        has_avoid_list: (context.partner.wants_needs.avoid?.length || 0) > 0,
      },
    };
  },

  /**
   * Check if a suggestion should be avoided based on partner preferences
   */
  shouldAvoidSuggestion(
    avoidIf: string[],
    partnerAvoidList: string[]
  ): boolean {
    if (!avoidIf || avoidIf.length === 0) return false;
    if (!partnerAvoidList || partnerAvoidList.length === 0) return false;

    // Check if any of the suggestion's avoid triggers match partner's avoid list
    return avoidIf.some((trigger) => partnerAvoidList.includes(trigger));
  },
};
