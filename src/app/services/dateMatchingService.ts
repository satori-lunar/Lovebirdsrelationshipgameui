import type { DateTemplate } from '../data/dateSuggestionTemplates';
import type { Place, PlaceCategory } from './nearbyPlacesService';

export interface DateMatchCriteria {
  budget?: '$' | '$$' | '$$$';
  duration?: 'quick' | 'half-day' | 'full-day';
  venuePreference?: 'single' | 'multiple';
  userLoveLanguage?: string;
  partnerLoveLanguage?: string;
  partnerLoveLanguageSecondary?: string;
  userInterests?: string[];
  partnerInterests?: string[];
  partnerHobbies?: string[];
  partnerFavoriteFoods?: string[];
  partnerFavoriteCuisines?: string[];
  partnerDateStyles?: string[];
}

export interface ScoredDateTemplate {
  template: DateTemplate;
  score: number;
  matchReasons: string[];
}

/**
 * Service for intelligently matching date templates with user and partner preferences
 */
export const dateMatchingService = {
  /**
   * Score and rank date templates based on criteria
   */
  scoreDateTemplates(
    templates: DateTemplate[],
    criteria: DateMatchCriteria,
    availableVenues: Place[]
  ): ScoredDateTemplate[] {
    return templates
      .map(template => {
        const result = this.scoreTemplate(template, criteria, availableVenues);
        return {
          template,
          score: result.score,
          matchReasons: result.reasons,
        };
      })
      .filter(scored => scored.score > 0)
      .sort((a, b) => b.score - a.score);
  },

  /**
   * Score a single date template against criteria
   */
  scoreTemplate(
    template: DateTemplate,
    criteria: DateMatchCriteria,
    availableVenues: Place[]
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Budget matching (required filter)
    if (criteria.budget) {
      if (criteria.budget === '$' && template.budget !== '$') {
        return { score: 0, reasons: [] };
      }
      if (criteria.budget === '$$' && template.budget === '$$$') {
        return { score: 0, reasons: [] };
      }
      if (template.budget === criteria.budget) {
        score += 20;
        reasons.push(`Budget match: ${template.budget}`);
      } else if (
        (criteria.budget === '$$$' && template.budget !== '$') ||
        (criteria.budget === '$$' && template.budget === '$')
      ) {
        score += 10;
      }
    }

    // Duration matching
    if (criteria.duration && template.timeRequired) {
      const timeReq = template.timeRequired.toLowerCase();
      const matches = this.matchesDuration(timeReq, criteria.duration);
      if (matches) {
        score += 15;
        reasons.push(`Duration match: ${template.timeRequired}`);
      }
    }

    // Venue preference matching
    if (criteria.venuePreference) {
      const venueCount = this.getVenueCategoryCount(template);
      if (criteria.venuePreference === 'single' && venueCount <= 2) {
        score += 10;
        reasons.push('Single venue preference');
      } else if (criteria.venuePreference === 'multiple' && venueCount >= 2) {
        score += 10;
        reasons.push('Multiple venue preference');
      }
    }

    // Love language matching (user)
    if (criteria.userLoveLanguage && template.loveLanguage) {
      const userMatch = template.loveLanguage.some(
        ll => this.normalizeLoveLanguage(ll) === this.normalizeLoveLanguage(criteria.userLoveLanguage!)
      );
      if (userMatch) {
        score += 15;
        reasons.push(`User love language: ${criteria.userLoveLanguage}`);
      }
    }

    // Love language matching (partner) - higher weight
    if (criteria.partnerLoveLanguage && template.loveLanguage) {
      const partnerMatch = template.loveLanguage.some(
        ll => this.normalizeLoveLanguage(ll) === this.normalizeLoveLanguage(criteria.partnerLoveLanguage!)
      );
      if (partnerMatch) {
        score += 20;
        reasons.push(`Partner love language: ${criteria.partnerLoveLanguage}`);
      }

      // Secondary love language
      if (criteria.partnerLoveLanguageSecondary) {
        const secondaryMatch = template.loveLanguage.some(
          ll => this.normalizeLoveLanguage(ll) === this.normalizeLoveLanguage(criteria.partnerLoveLanguageSecondary!)
        );
        if (secondaryMatch) {
          score += 10;
          reasons.push(`Partner secondary love language`);
        }
      }
    }

    // Interest matching
    if (criteria.partnerInterests && criteria.partnerInterests.length > 0) {
      const interestMatch = this.matchInterests(template, criteria.partnerInterests);
      if (interestMatch.matched) {
        score += interestMatch.score;
        reasons.push(`Partner interests: ${interestMatch.matchedInterests.join(', ')}`);
      }
    }

    // Hobby matching
    if (criteria.partnerHobbies && criteria.partnerHobbies.length > 0) {
      const hobbyMatch = this.matchHobbies(template, criteria.partnerHobbies);
      if (hobbyMatch.matched) {
        score += hobbyMatch.score;
        reasons.push(`Partner hobbies: ${hobbyMatch.matchedHobbies.join(', ')}`);
      }
    }

    // Food/Cuisine matching (for restaurant/cafe dates)
    if (this.isFoodRelatedDate(template)) {
      if (criteria.partnerFavoriteFoods && criteria.partnerFavoriteFoods.length > 0) {
        const foodMatch = this.matchFoods(template, criteria.partnerFavoriteFoods);
        if (foodMatch.matched) {
          score += foodMatch.score;
          reasons.push(`Partner favorite foods`);
        }
      }

      if (criteria.partnerFavoriteCuisines && criteria.partnerFavoriteCuisines.length > 0) {
        const cuisineMatch = this.matchCuisines(template, criteria.partnerFavoriteCuisines);
        if (cuisineMatch.matched) {
          score += cuisineMatch.score;
          reasons.push(`Partner favorite cuisines`);
        }
      }
    }

    // Date style matching
    if (criteria.partnerDateStyles && criteria.partnerDateStyles.length > 0) {
      const styleMatch = this.matchDateStyles(template, criteria.partnerDateStyles);
      if (styleMatch.matched) {
        score += styleMatch.score;
        reasons.push(`Partner date style preference`);
      }
    }

    // Venue availability bonus
    const venueMatch = this.hasMatchingVenues(template, availableVenues);
    if (venueMatch.hasVenues) {
      score += 10;
      reasons.push(`Venues available nearby`);
    } else {
      // Penalty if no venues available
      score = Math.max(0, score - 5);
    }

    return { score, reasons };
  },

  /**
   * Check if duration matches preference
   */
  matchesDuration(timeRequired: string, duration: 'quick' | 'half-day' | 'full-day'): boolean {
    if (duration === 'quick') {
      return timeRequired.includes('1-2') || timeRequired.includes('2-3') || timeRequired.includes('1-3');
    } else if (duration === 'half-day') {
      return timeRequired.includes('2-4') || timeRequired.includes('3-4') || timeRequired.includes('3-5');
    } else if (duration === 'full-day') {
      return timeRequired.includes('4-6') || timeRequired.includes('6-8') || timeRequired.includes('5-') || timeRequired.includes('full');
    }
    return false;
  },

  /**
   * Get number of venue categories needed for this date
   */
  getVenueCategoryCount(template: DateTemplate): number {
    const categories = new Set<PlaceCategory>();
    
    if (template.dateType === 'dinner' || template.dateType === 'cooking') {
      categories.add('restaurant');
      categories.add('cafe');
    } else if (template.dateType === 'picnic' || template.dateType === 'hiking') {
      categories.add('park');
    } else if (template.dateType === 'museum') {
      categories.add('museum');
    } else if (template.dateType === 'movie_concert') {
      categories.add('theater');
    }

    // Check title and description for additional venues
    const title = template.title.toLowerCase();
    const desc = template.description.toLowerCase();

    if (title.includes('restaurant') || desc.includes('restaurant') || desc.includes('dinner')) {
      categories.add('restaurant');
    }
    if (title.includes('cafe') || title.includes('coffee') || desc.includes('coffee')) {
      categories.add('cafe');
    }
    if (title.includes('park') || title.includes('picnic') || desc.includes('park')) {
      categories.add('park');
    }
    if (title.includes('museum') || title.includes('gallery') || desc.includes('museum')) {
      categories.add('museum');
    }
    if (title.includes('bar') || desc.includes('bar') || desc.includes('drinks')) {
      categories.add('bar');
    }
    if (title.includes('movie') || title.includes('theater') || desc.includes('movie')) {
      categories.add('theater');
    }
    if (title.includes('bowling') || title.includes('arcade') || desc.includes('activity')) {
      categories.add('activity');
    }

    return categories.size || 1;
  },

  /**
   * Normalize love language string for comparison
   */
  normalizeLoveLanguage(loveLanguage: string): string {
    return loveLanguage
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace('words_of_affirmation', 'words of affirmation')
      .replace('quality_time', 'quality time')
      .replace('acts_of_service', 'acts of service')
      .replace('receiving_gifts', 'receiving gifts')
      .replace('physical_touch', 'physical touch');
  },

  /**
   * Match interests with template
   */
  matchInterests(template: DateTemplate, interests: string[]): {
    matched: boolean;
    score: number;
    matchedInterests: string[];
  } {
    const lowerInterests = interests.map(i => i.toLowerCase());
    const matchedInterests: string[] = [];

    // Check template metadata
    if (template.sharedHobbies) {
      template.sharedHobbies.forEach(hobby => {
        if (lowerInterests.some(interest => interest.includes(hobby.toLowerCase()) || hobby.toLowerCase().includes(interest))) {
          matchedInterests.push(hobby);
        }
      });
    }

    // Check title and description for interest keywords
    const title = template.title.toLowerCase();
    const desc = template.description.toLowerCase();
    const combined = `${title} ${desc}`;

    interests.forEach(interest => {
      const lowerInterest = interest.toLowerCase();
      if (combined.includes(lowerInterest) || this.getInterestKeywords(lowerInterest).some(keyword => combined.includes(keyword))) {
        matchedInterests.push(interest);
      }
    });

    const score = matchedInterests.length * 8;
    return {
      matched: matchedInterests.length > 0,
      score,
      matchedInterests: Array.from(new Set(matchedInterests)),
    };
  },

  /**
   * Match hobbies with template
   */
  matchHobbies(template: DateTemplate, hobbies: string[]): {
    matched: boolean;
    score: number;
    matchedHobbies: string[];
  } {
    return this.matchInterests(template, hobbies);
  },

  /**
   * Match favorite foods
   */
  matchFoods(template: DateTemplate, foods: string[]): {
    matched: boolean;
    score: number;
  } {
    const lowerFoods = foods.map(f => f.toLowerCase());
    const title = template.title.toLowerCase();
    const desc = template.description.toLowerCase();
    const combined = `${title} ${desc}`;

    const matched = lowerFoods.some(food => {
      return combined.includes(food) || this.getFoodKeywords(food).some(keyword => combined.includes(keyword));
    });

    return {
      matched,
      score: matched ? 12 : 0,
    };
  },

  /**
   * Match favorite cuisines
   */
  matchCuisines(template: DateTemplate, cuisines: string[]): {
    matched: boolean;
    score: number;
  } {
    const lowerCuisines = cuisines.map(c => c.toLowerCase());
    const title = template.title.toLowerCase();
    const desc = template.description.toLowerCase();
    const combined = `${title} ${desc}`;

    const matched = lowerCuisines.some(cuisine => {
      return combined.includes(cuisine.toLowerCase());
    });

    return {
      matched,
      score: matched ? 15 : 0,
    };
  },

  /**
   * Match date styles
   */
  matchDateStyles(template: DateTemplate, styles: string[]): {
    matched: boolean;
    score: number;
  } {
    const lowerStyles = styles.map(s => s.toLowerCase());
    const templateStyles = template.dateStyle.map(s => s.toLowerCase());

    const matched = lowerStyles.some(style => {
      const normalizedStyle = this.normalizeDateStyle(style);
      return templateStyles.some(ts => ts === normalizedStyle || ts.includes(normalizedStyle) || normalizedStyle.includes(ts));
    });

    return {
      matched,
      score: matched ? 10 : 0,
    };
  },

  /**
   * Normalize date style string
   */
  normalizeDateStyle(style: string): string {
    const lower = style.toLowerCase();
    if (lower.includes('relaxed') || lower.includes('cozy')) return 'relaxed';
    if (lower.includes('adventurous') || lower.includes('active')) return 'adventurous';
    if (lower.includes('cultural') || lower.includes('museum') || lower.includes('theater')) return 'cultural';
    if (lower.includes('food') || lower.includes('foodie') || lower.includes('restaurant')) return 'foodie';
    if (lower.includes('home') || lower.includes('at-home')) return 'at_home';
    return lower;
  },

  /**
   * Check if date is food-related
   */
  isFoodRelatedDate(template: DateTemplate): boolean {
    const title = template.title.toLowerCase();
    const desc = template.description.toLowerCase();
    const dateType = template.dateType;

    return (
      dateType === 'dinner' ||
      dateType === 'cooking' ||
      title.includes('restaurant') ||
      title.includes('cafe') ||
      title.includes('dinner') ||
      title.includes('brunch') ||
      title.includes('food') ||
      desc.includes('restaurant') ||
      desc.includes('cafe') ||
      desc.includes('dinner') ||
      desc.includes('food')
    );
  },

  /**
   * Check if venues are available for this template
   */
  hasMatchingVenues(template: DateTemplate, venues: Place[]): {
    hasVenues: boolean;
    matchingVenues: Place[];
  } {
    const categories = this.getRequiredVenueCategories(template);
    const venueCategories = new Set(venues.map(v => v.category));
    
    const hasMatching = categories.some(cat => venueCategories.has(cat));
    const matchingVenues = venues.filter(v => categories.includes(v.category));

    return {
      hasVenues: hasMatching,
      matchingVenues,
    };
  },

  /**
   * Get required venue categories for a template
   */
  getRequiredVenueCategories(template: DateTemplate): PlaceCategory[] {
    const categories: PlaceCategory[] = [];
    const title = template.title.toLowerCase();
    const desc = template.description.toLowerCase();

    if (title.includes('restaurant') || title.includes('dinner') || desc.includes('restaurant') || desc.includes('dinner')) {
      categories.push('restaurant');
    }
    if (title.includes('cafe') || title.includes('coffee') || desc.includes('cafe') || desc.includes('coffee')) {
      categories.push('cafe');
    }
    if (title.includes('park') || title.includes('picnic') || desc.includes('park') || desc.includes('picnic')) {
      categories.push('park');
    }
    if (title.includes('museum') || title.includes('gallery') || desc.includes('museum') || desc.includes('gallery')) {
      categories.push('museum');
    }
    if (title.includes('bar') || desc.includes('bar') || desc.includes('drinks')) {
      categories.push('bar');
    }
    if (title.includes('movie') || title.includes('theater') || title.includes('cinema') || desc.includes('movie')) {
      categories.push('theater');
    }
    if (title.includes('bowling') || title.includes('arcade') || title.includes('activity') || desc.includes('activity')) {
      categories.push('activity');
    }

    // Fallback to date type
    if (categories.length === 0) {
      if (template.dateType === 'dinner' || template.dateType === 'cooking') {
        categories.push('restaurant');
      } else if (template.dateType === 'picnic' || template.dateType === 'hiking') {
        categories.push('park');
      } else if (template.dateType === 'museum') {
        categories.push('museum');
      } else if (template.dateType === 'movie_concert') {
        categories.push('theater');
      }
    }

    return categories.length > 0 ? categories : ['restaurant'];
  },

  /**
   * Get keywords for an interest
   */
  getInterestKeywords(interest: string): string[] {
    const keywords: Record<string, string[]> = {
      music: ['music', 'concert', 'live', 'band', 'song'],
      art: ['art', 'gallery', 'painting', 'artist', 'exhibit'],
      nature: ['nature', 'outdoor', 'park', 'hike', 'trail', 'forest'],
      food: ['food', 'restaurant', 'dining', 'cuisine', 'meal'],
      sports: ['sport', 'athletic', 'fitness', 'exercise', 'gym'],
      reading: ['book', 'library', 'read', 'literature'],
      movies: ['movie', 'cinema', 'film', 'theater'],
      dancing: ['dance', 'dancing', 'club', 'nightclub'],
      gaming: ['game', 'arcade', 'gaming', 'video game'],
    };

    return keywords[interest] || [interest];
  },

  /**
   * Get keywords for a food item
   */
  getFoodKeywords(food: string): string[] {
    const keywords: Record<string, string[]> = {
      pizza: ['pizza', 'italian'],
      sushi: ['sushi', 'japanese'],
      burger: ['burger', 'american'],
      pasta: ['pasta', 'italian'],
      coffee: ['coffee', 'cafe', 'espresso'],
      dessert: ['dessert', 'sweet', 'cake', 'ice cream'],
    };

    return keywords[food] || [food];
  },
};
