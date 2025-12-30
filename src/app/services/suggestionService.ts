/**
 * Suggestion Service
 *
 * Generates personalized suggestions for love languages, gifts, and dates
 * using the personalization engine and template libraries.
 */

import { api, handleSupabaseError } from './api';
import { personalizationService } from './personalizationService';
import {
  interpolateTemplate,
  rankTemplates,
  getWeekStartDate,
  filterByMinScore,
  type ScoredTemplate,
} from '../utils/suggestionPersonalizer';
import { giftSuggestionTemplates } from '../data/giftSuggestionTemplates';
import { dateSuggestionTemplates } from '../data/dateSuggestionTemplates';
import { loveLanguageSuggestions } from '../data/loveLanguageSuggestions';

export type SuggestionCategory = 'love_language' | 'gift' | 'date';

export interface Suggestion {
  id: string;
  user_id: string;
  category: SuggestionCategory;
  suggestion_text: string;
  suggestion_type: string;
  time_estimate: string;
  difficulty: string;
  week_start_date: string;
  saved: boolean;
  completed: boolean;
  created_at: string;
  data_sources?: any;
  personalization_tier?: number;
  metadata?: any;
}

export const suggestionService = {
  /**
   * Get suggestions for a specific category and week
   */
  async getSuggestions(
    userId: string,
    category: SuggestionCategory,
    weekStart?: string
  ): Promise<Suggestion[]> {
    const weekStartDate = weekStart || getWeekStartDate();

    const suggestions = await handleSupabaseError(
      api.supabase
        .from('suggestions')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('week_start_date', weekStartDate)
        .order('created_at', { ascending: true })
    );

    return suggestions || [];
  },

  /**
   * Generate personalized suggestions for a category
   * Returns existing suggestions if already generated for this week
   */
  async generateSuggestions(
    userId: string,
    partnerId: string,
    category: SuggestionCategory
  ): Promise<Suggestion[]> {
    const weekStart = getWeekStartDate();

    // Check if suggestions already exist for this week
    const existing = await this.getSuggestions(userId, category, weekStart);
    if (existing.length > 0) {
      return existing;
    }

    try {
      // Get personalization context
      const context = await personalizationService.getPersonalizationContext(
        userId,
        partnerId
      );

      // Get appropriate template library
      const templates = this.getTemplatesByCategory(category);

      // Filter templates by category (for mixed libraries)
      const categoryTemplates = templates.filter(
        (t: any) => t.category === category
      );

      // Rank templates by relevance
      const rankedTemplates = rankTemplates(categoryTemplates as any, context);

      // Filter by minimum score (30+)
      const relevantTemplates = filterByMinScore(rankedTemplates, 30);

      // Randomly select 3 from top-scored templates to provide variety
      // Take top 10 (or all if less) and randomly pick 3
      const candidatePool = relevantTemplates.slice(0, Math.min(10, relevantTemplates.length));
      const topSuggestions: any[] = [];

      // Shuffle and pick 3 random suggestions from the pool
      const shuffled = [...candidatePool].sort(() => Math.random() - 0.5);
      topSuggestions.push(...shuffled.slice(0, 3));

      // If less than 3, fill with lower-scored suggestions
      if (topSuggestions.length < 3) {
        const remaining = rankedTemplates
          .filter(t => !topSuggestions.find(s => s.id === t.id))
          .slice(0, 3 - topSuggestions.length);
        topSuggestions.push(...remaining);
      }

      // Interpolate templates with actual data
      const interpolatedSuggestions = topSuggestions.map((template) =>
        interpolateTemplate(template, context)
      );

      // Convert to database format
      const suggestionsToInsert = interpolatedSuggestions.map((template: any, index) => ({
        user_id: userId,
        category,
        suggestion_text: template.description,
        suggestion_type: this.getSuggestionType(template),
        time_estimate: template.timeEstimate || template.timeRequired || 'Varies',
        difficulty: template.difficulty || template.effort || 'Medium',
        week_start_date: weekStart,
        saved: false,
        completed: false,
        data_sources: {
          reason: template.reason,
          score: template.score,
          template_id: template.id,
          keywords_used: Object.keys(context.insights.keywords),
        },
        personalization_tier: context.tier,
        metadata: {
          title: template.title,
          budget: (template as any).budget,
          occasion: (template as any).occasion,
          environment: (template as any).environment,
        },
      }));

      // Insert suggestions into database
      const inserted = await handleSupabaseError(
        api.supabase.from('suggestions').insert(suggestionsToInsert).select()
      );

      // Save generation metadata
      await this.saveGenerationMetadata(userId, category, weekStart, context);

      return inserted || [];
    } catch (error) {
      console.error('Error generating suggestions:', error);
      throw error;
    }
  },

  /**
   * Get template library for a category
   */
  getTemplatesByCategory(category: SuggestionCategory): any[] {
    switch (category) {
      case 'gift':
        return giftSuggestionTemplates;
      case 'date':
        return dateSuggestionTemplates;
      case 'love_language':
        return loveLanguageSuggestions;
      default:
        return [];
    }
  },

  /**
   * Get suggestion type from template
   */
  getSuggestionType(template: any): string {
    if (template.loveLanguage) {
      return Array.isArray(template.loveLanguage)
        ? template.loveLanguage[0]
        : template.loveLanguage;
    }
    if (template.giftType) {
      return template.giftType;
    }
    if (template.dateType) {
      return template.dateType;
    }
    return 'General';
  },

  /**
   * Save metadata about suggestion generation
   */
  async saveGenerationMetadata(
    userId: string,
    category: SuggestionCategory,
    weekStart: string,
    context: any
  ): Promise<void> {
    try {
      await api.supabase.from('suggestion_generation_metadata').upsert({
        user_id: userId,
        category,
        week_start_date: weekStart,
        onboarding_data_version: context.dataSources.onboarding_updated,
        partner_onboarding_data_version:
          context.dataSources.partner_onboarding_updated,
        saved_insights_count: context.dataSources.insights_count,
        daily_answers_count: context.dataSources.answers_count,
        personalization_tier: context.tier,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving generation metadata:', error);
      // Non-critical, don't throw
    }
  },

  /**
   * Update a suggestion (mark as saved, completed, etc.)
   */
  async updateSuggestion(
    suggestionId: string,
    updates: Partial<Suggestion>
  ): Promise<Suggestion> {
    const updated = await handleSupabaseError(
      api.supabase
        .from('suggestions')
        .update(updates)
        .eq('id', suggestionId)
        .select()
        .single()
    );

    return updated;
  },

  /**
   * Force refresh suggestions (delete and regenerate)
   */
  async forceRefresh(
    userId: string,
    partnerId: string,
    category: SuggestionCategory
  ): Promise<Suggestion[]> {
    const weekStart = getWeekStartDate();

    // Delete existing suggestions for this week
    await api.supabase
      .from('suggestions')
      .delete()
      .eq('user_id', userId)
      .eq('category', category)
      .eq('week_start_date', weekStart);

    // Generate new suggestions
    return this.generateSuggestions(userId, partnerId, category);
  },

  /**
   * Get weekly suggestions (backwards compatible)
   * Defaults to love_language category
   */
  async getWeeklySuggestions(userId: string): Promise<Suggestion[]> {
    return this.getSuggestions(userId, 'love_language');
  },

  /**
   * Get all suggestions across all categories
   */
  async getAllSuggestions(userId: string): Promise<{
    love_language: Suggestion[];
    gift: Suggestion[];
    date: Suggestion[];
  }> {
    const weekStart = getWeekStartDate();

    const [loveLanguage, gifts, dates] = await Promise.all([
      this.getSuggestions(userId, 'love_language', weekStart),
      this.getSuggestions(userId, 'gift', weekStart),
      this.getSuggestions(userId, 'date', weekStart),
    ]);

    return {
      love_language: loveLanguage,
      gift: gifts,
      date: dates,
    };
  },

  /**
   * Get personalization tier for a user
   */
  async getPersonalizationTier(
    userId: string,
    partnerId: string
  ): Promise<number> {
    try {
      const context = await personalizationService.getPersonalizationContext(
        userId,
        partnerId
      );
      return context.tier;
    } catch (error) {
      console.error('Error getting personalization tier:', error);
      return 1; // Default to tier 1
    }
  },
};
