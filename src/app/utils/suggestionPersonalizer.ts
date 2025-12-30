/**
 * Suggestion Personalizer Utilities
 *
 * Functions for personalizing suggestion templates:
 * - Interpolate placeholders with actual data
 * - Rank suggestions by relevance
 * - Generate explanations for why a suggestion was chosen
 */

import type { PersonalizationContext } from '../services/personalizationService';
import type { GiftTemplate } from '../data/giftSuggestionTemplates';
import type { DateTemplate } from '../data/dateSuggestionTemplates';
import type { LoveLanguageSuggestion } from '../data/loveLanguageSuggestions';

type Template = GiftTemplate | DateTemplate | (LoveLanguageSuggestion & { category: string });

export interface ScoredTemplate extends Template {
  score: number;
  reason?: string;
}

/**
 * Interpolate template with personalization data
 * Replaces placeholders like {partner_name} with actual values
 */
export function interpolateTemplate(
  template: Template,
  context: PersonalizationContext
): Template {
  const interpolatedTemplate = { ...template };

  // Replace {partner_name} with actual name
  if (template.title) {
    interpolatedTemplate.title = template.title.replace(
      /\{partner_name\}/g,
      context.partner.name
    );
  }

  if (template.description) {
    let description = template.description.replace(
      /\{partner_name\}/g,
      context.partner.name
    );

    // Replace {favorite_activity} - prioritize onboarding data, fall back to keywords
    const favoriteActivity =
      context.partner.wants_needs.favorite_activities?.[0] ||
      context.insights.keywords.activities?.[0];

    if (favoriteActivity) {
      description = description.replace(
        /\{favorite_activity\}/g,
        favoriteActivity
      );
    }

    // Replace {mentioned_interest} with actual interest
    if (context.insights.keywords.interests?.length > 0) {
      description = description.replace(
        /\{mentioned_interest\}/g,
        context.insights.keywords.interests[0]
      );
    }

    // Replace {favorite_cuisine} - prioritize onboarding data, fall back to keywords
    const favoriteCuisine =
      context.partner.wants_needs.favorite_cuisines?.[0] ||
      context.insights.keywords.foods?.[0];

    if (favoriteCuisine) {
      description = description.replace(
        /\{favorite_cuisine\}/g,
        favoriteCuisine
      );
    }

    // Replace {season} with current season
    const season = getCurrentSeason();
    description = description.replace(/\{season\}/g, season);

    interpolatedTemplate.description = description;
  }

  return interpolatedTemplate;
}

/**
 * Rank templates by relevance to user's partner
 * Returns sorted array with relevance scores
 */
export function rankTemplates(
  templates: Template[],
  context: PersonalizationContext
): ScoredTemplate[] {
  const scoredTemplates = templates.map((template) => ({
    ...template,
    score: calculateRelevanceScore(template, context),
    reason: generateReason(template, context),
  }));

  // Sort by score (highest first)
  return scoredTemplates.sort((a, b) => b.score - a.score);
}

/**
 * Calculate relevance score for a template
 * Higher score = more relevant to the user's partner
 */
function calculateRelevanceScore(
  template: Template,
  context: PersonalizationContext
): number {
  let score = 0;

  // Base score for all suggestions
  score += 10;

  // Love language match (+30 points for primary, +15 for secondary)
  if ('loveLanguage' in template) {
    const loveLanguages = Array.isArray(template.loveLanguage)
      ? template.loveLanguage
      : [template.loveLanguage];

    if (
      context.partner.loveLanguages.primary &&
      loveLanguages.includes(context.partner.loveLanguages.primary)
    ) {
      score += 30;
    } else if (
      context.partner.loveLanguages.secondary &&
      loveLanguages.includes(context.partner.loveLanguages.secondary)
    ) {
      score += 15;
    }
  }

  // Budget match (+20 points)
  if ('budget' in template && context.partner.preferences.gift_budget) {
    if (template.budget === context.partner.preferences.gift_budget) {
      score += 20;
    }
  }

  // Date style match (+25 points)
  if ('dateStyle' in template && context.partner.wants_needs.date_style) {
    const dateStyles = Array.isArray(template.dateStyle)
      ? template.dateStyle
      : [template.dateStyle];

    if (dateStyles.includes(context.partner.wants_needs.date_style)) {
      score += 25;
    }
  }

  // Date type match from preferences (+20 points)
  if ('dateType' in template && context.partner.preferences.date_types) {
    if (context.partner.preferences.date_types.includes(template.dateType)) {
      score += 20;
    }
  }

  // Gift type match (+15 points)
  if ('giftType' in template && context.partner.wants_needs.gift_types) {
    if (context.partner.wants_needs.gift_types.includes(template.giftType)) {
      score += 15;
    }
  }

  // Has required personalization data (+15 points per field)
  if ('requiresData' in template && template.requiresData) {
    const hasAllRequiredData = template.requiresData.every((field) => {
      if (field === 'partner_name') return !!context.partner.name;
      // Check if data exists in keywords
      return Object.values(context.insights.keywords).some((values) =>
        values.length > 0
      );
    });

    if (hasAllRequiredData) {
      score += 15 * template.requiresData.length;
    }
  }

  // Keyword matches in insights (+10 points per match)
  const keywordMatches = countKeywordMatches(template, context);
  score += keywordMatches * 10;

  // Weekly wishes match (+40 points for strong match)
  // This is prioritized highly since it's explicitly what the user wants
  if (context.weeklyWishes.current || context.weeklyWishes.recent.length > 0) {
    const wishMatches = countWishMatches(template, context);
    score += wishMatches * 40; // High weight for explicit wishes
  }

  // Appropriate for personalization tier (+5 points)
  if ('personalizationTier' in template) {
    if (template.personalizationTier <= context.tier) {
      score += 5;
    } else {
      // Penalty for suggestions requiring higher tier
      score -= 10;
    }
  }

  // Respects "avoid" preferences (+25 points for respecting, -100 for violating)
  if ('avoidIf' in template && template.avoidIf) {
    const shouldAvoid = template.avoidIf.some((trigger) =>
      context.partner.wants_needs.avoid?.includes(trigger)
    );

    if (shouldAvoid) {
      score -= 100; // Strong penalty
    } else if (context.partner.wants_needs.avoid?.length > 0) {
      score += 25; // Bonus for being safe
    }
  }

  // Seasonal appropriateness (+10 points)
  if ('bestSeason' in template && template.bestSeason) {
    const currentSeason = getCurrentSeason();
    if (template.bestSeason.includes(currentSeason)) {
      score += 10;
    }
  }

  return Math.max(0, score); // Ensure score doesn't go negative
}

/**
 * Count keyword matches between template and context
 */
function countKeywordMatches(
  template: Template,
  context: PersonalizationContext
): number {
  let matches = 0;
  const description = template.description.toLowerCase();
  const title = template.title.toLowerCase();

  // Check each keyword category
  Object.values(context.insights.keywords).forEach((keywords) => {
    keywords.forEach((keyword) => {
      const keywordLower = keyword.toLowerCase();
      if (description.includes(keywordLower) || title.includes(keywordLower)) {
        matches++;
      }
    });
  });

  return matches;
}

/**
 * Count matches between template and weekly wishes
 * Weekly wishes are what the user explicitly wants their partner to do more of
 */
function countWishMatches(
  template: Template,
  context: PersonalizationContext
): number {
  let matches = 0;
  const description = template.description.toLowerCase();
  const title = template.title.toLowerCase();

  // Combine current and recent wishes
  const allWishes = [
    context.weeklyWishes.current,
    ...context.weeklyWishes.recent
  ].filter(Boolean) as string[];

  // Extract keywords from wishes
  const wishKeywords = extractWishKeywords(allWishes);

  // Check if template matches any wish keywords
  wishKeywords.forEach((keyword) => {
    if (description.includes(keyword) || title.includes(keyword)) {
      matches++;
    }
  });

  return matches;
}

/**
 * Extract meaningful keywords from wish text
 */
function extractWishKeywords(wishes: string[]): string[] {
  const keywords: string[] = [];

  wishes.forEach((wish) => {
    const lowerWish = wish.toLowerCase();

    // Common patterns in wishes
    const patterns = [
      'plan.*date',
      'surprise',
      'cook',
      'note',
      'message',
      'hug',
      'cuddle',
      'quality time',
      'ask about',
      'listen',
      'help',
      'clean',
      'dinner',
      'lunch',
      'breakfast',
      'gift',
      'present',
      'compliment',
      'appreciate',
      'thank',
      'kiss',
      'massage',
      'backrub',
      'back rub',
      'adventure',
      'explore',
      'try new',
      'romantic',
      'thoughtful',
    ];

    patterns.forEach((pattern) => {
      const regex = new RegExp(pattern, 'gi');
      if (regex.test(lowerWish)) {
        keywords.push(pattern.replace(/\.\*/g, ' '));
      }
    });

    // Also extract individual words (3+ chars) excluding common words
    const words = lowerWish.split(/\s+/);
    const commonWords = ['the', 'and', 'or', 'but', 'for', 'with', 'more', 'often', 'would', 'could', 'should', 'like', 'want', 'wish'];
    words.forEach((word) => {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (cleanWord.length >= 3 && !commonWords.includes(cleanWord)) {
        keywords.push(cleanWord);
      }
    });
  });

  return [...new Set(keywords)];
}

/**
 * Generate explanation for why this suggestion was chosen
 */
export function generateReason(
  template: Template,
  context: PersonalizationContext
): string | undefined {
  const reasons: string[] = [];

  // Love language match
  if ('loveLanguage' in template) {
    const loveLanguages = Array.isArray(template.loveLanguage)
      ? template.loveLanguage
      : [template.loveLanguage];

    if (
      context.partner.loveLanguages.primary &&
      loveLanguages.includes(context.partner.loveLanguages.primary)
    ) {
      reasons.push(
        `Matches ${context.partner.name}'s primary love language: ${context.partner.loveLanguages.primary}`
      );
    }
  }

  // Date preference match
  if ('dateType' in template && context.partner.preferences.date_types) {
    if (context.partner.preferences.date_types.includes(template.dateType)) {
      reasons.push(`${context.partner.name} selected this as a favorite date type`);
    }
  }

  // Gift type match
  if ('giftType' in template && context.partner.wants_needs.gift_types) {
    if (context.partner.wants_needs.gift_types.includes(template.giftType)) {
      reasons.push(`${context.partner.name} prefers this type of gift`);
    }
  }

  // Budget match
  if ('budget' in template && context.partner.preferences.gift_budget) {
    if (template.budget === context.partner.preferences.gift_budget) {
      reasons.push(`Fits ${context.partner.name}'s budget comfort level`);
    }
  }

  // Weekly wishes match (high priority!)
  const wishMatches = countWishMatches(template, context);
  if (wishMatches > 0) {
    reasons.push(`Matches what you wished for more of`);
  }

  // Insight keyword matches
  const keywordMatches = countKeywordMatches(template, context);
  if (keywordMatches > 0) {
    reasons.push(`Based on ${context.partner.name}'s saved answers`);
  }

  // Return first 2 reasons, or undefined if none
  if (reasons.length === 0) return undefined;
  return reasons.slice(0, 2).join('; ');
}

/**
 * Get current season
 */
function getCurrentSeason(): string {
  const month = new Date().getMonth();

  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

/**
 * Get week start date (Monday) for grouping suggestions
 */
export function getWeekStartDate(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start of week
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  return monday.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Filter templates by minimum score threshold
 */
export function filterByMinScore(
  scoredTemplates: ScoredTemplate[],
  minScore: number = 30
): ScoredTemplate[] {
  return scoredTemplates.filter((template) => template.score >= minScore);
}
