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
 * Implements multi-stage filtering and scoring system per comprehensive plan
 */
export const dateMatchingService = {
  /**
   * Score and rank date templates based on criteria
   * Implements multi-stage filtering and scoring system
   */
  scoreDateTemplates(
    templates: DateTemplate[],
    criteria: DateMatchCriteria,
    availableVenues: Place[]
  ): ScoredDateTemplate[] {
    // Stage 1: Pre-Filtering (Remove Invalid Templates)
    const preFiltered = templates.filter(template => 
      this.passesPreFiltering(template, criteria, availableVenues)
    );

    // Stage 2: Venue-Based Matching
    const venueMatched = preFiltered
      .map(template => ({
        template,
        venueMatch: this.matchVenuesForTemplate(template, availableVenues),
      }))
      .filter(({ venueMatch }) => venueMatch.hasVenues); // Must have matching venues

    // Stage 3: Preference-Based Scoring
    const scored = venueMatched.map(({ template, venueMatch }) => {
      const scoreResult = this.scoreTemplate(template, criteria, availableVenues, venueMatch);
      return {
        template,
        score: scoreResult.score,
        matchReasons: scoreResult.reasons,
        venueMatch,
      };
    });

    // Stage 4: Ranking & Selection (sorted by score)
    return scored
      .filter(scored => scored.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ template, score, matchReasons }) => ({
        template,
        score,
        matchReasons,
      }));
  },

  /**
   * Stage 1: Pre-Filtering - Remove invalid templates
   */
  passesPreFiltering(
    template: DateTemplate,
    criteria: DateMatchCriteria,
    availableVenues: Place[]
  ): boolean {
    // 1. Filter by venue availability (must have matching venues within maxDistance)
    const maxDistance = template.maxVenueDistance || 5;
    const venueMatch = this.hasMatchingVenues(template, availableVenues, maxDistance);
    if (!venueMatch.hasVenues) {
      return false;
    }

    // 2. Filter by budget compatibility
    if (criteria.budget) {
      if (criteria.budget === '$' && template.budget !== '$') {
        return false;
      }
      if (criteria.budget === '$$' && template.budget === '$$$') {
        return false;
      }
    }

    // 3. Filter by duration compatibility
    if (criteria.duration && template.timeRequired) {
      const timeReq = template.timeRequired.toLowerCase();
      if (!this.matchesDuration(timeReq, criteria.duration)) {
        // Allow templates that are close but not exact matches
        // But reject ones that are clearly incompatible
        if (criteria.duration === 'quick' && (timeReq.includes('4-') || timeReq.includes('6-') || timeReq.includes('full'))) {
          return false;
        }
        if (criteria.duration === 'half-day' && (timeReq.includes('6-') || timeReq.includes('full'))) {
          return false;
        }
        if (criteria.duration === 'full-day' && (timeReq.includes('1-') || timeReq.includes('2-'))) {
          return false;
        }
      }
    }

    // 4. Filter by venue preference (single vs multiple)
    if (criteria.venuePreference) {
      const venueCount = this.getVenueCategoryCount(template);
      if (criteria.venuePreference === 'single' && venueCount > 2) {
        return false;
      }
      if (criteria.venuePreference === 'multiple' && venueCount === 1) {
        // Allow single venue dates even if multiple preferred, but filter out obvious mismatches
      }
    }

    // 5. Filter by avoidIf conditions (if criteria provided)
    // Skip for now as avoidIf is template-specific

    // 6. Filter by seasonal appropriateness (if season info available)
    // Skip for now as we don't have current season in criteria

    return true;
  },

  /**
   * Stage 2: Venue-Based Matching
   * Match templates to actual nearby venues with distance and rating considerations
   */
  matchVenuesForTemplate(
    template: DateTemplate,
    availableVenues: Place[]
  ): {
    hasVenues: boolean;
    matchingVenues: Place[];
    averageDistance: number;
    averageRating: number;
    closeVenuesCount: number; // Venues within 3 miles
  } {
    const maxDistance = template.maxVenueDistance || 5;
    const requiredCategories = this.getRequiredVenueCategories(template);
    const optionalCategories = template.optionalVenues || [];

    // Get venues that match required categories
    let matchingVenues = availableVenues.filter(venue => {
      if (!requiredCategories.includes(venue.category)) {
        return false;
      }
      if (venue.distance > maxDistance) {
        return false;
      }
      // If template requires high rated venues
      if (template.prefersHighRated && venue.rating < 4.5) {
        return false;
      }
      return true;
    });

    // Also consider optional venues if no required venues found
    if (matchingVenues.length === 0 && optionalCategories.length > 0) {
      matchingVenues = availableVenues.filter(venue => {
        if (!optionalCategories.includes(venue.category)) {
          return false;
        }
        if (venue.distance > maxDistance) {
          return false;
        }
        if (template.prefersHighRated && venue.rating < 4.5) {
          return false;
        }
        return true;
      });
    }

    // Sort by distance first, then rating
    matchingVenues.sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      return b.rating - a.rating;
    });

    const closeVenuesCount = matchingVenues.filter(v => v.distance <= 3).length;
    const averageDistance = matchingVenues.length > 0
      ? matchingVenues.reduce((sum, v) => sum + v.distance, 0) / matchingVenues.length
      : Infinity;
    const averageRating = matchingVenues.length > 0
      ? matchingVenues.reduce((sum, v) => sum + v.rating, 0) / matchingVenues.length
      : 0;

    return {
      hasVenues: matchingVenues.length > 0,
      matchingVenues,
      averageDistance,
      averageRating,
      closeVenuesCount,
    };
  },

  /**
   * Stage 3: Preference-Based Scoring
   * Score a single date template against criteria using updated weights from plan
   */
  scoreTemplate(
    template: DateTemplate,
    criteria: DateMatchCriteria,
    availableVenues: Place[],
    venueMatch: {
      hasVenues: boolean;
      matchingVenues: Place[];
      averageDistance: number;
      averageRating: number;
      closeVenuesCount: number;
    }
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Simple templates get a SMALL bonus (10 points), but preferences matter MORE
    // They should be a safe fallback, not always dominant
    const simpleTemplateIds = [
      'simple_coffee_date',
      'simple_dinner_date',
      'simple_drinks_at_bar',
      'simple_walk_in_park',
      'simple_museum_visit',
      'simple_movie_date',
      'simple_brunch_date',
      'simple_lunch_date'
    ];

    if (simpleTemplateIds.includes(template.id)) {
      score += 10; // Small bonus, not overwhelming
      reasons.push('Simple, realistic date');
    }

    // Venue availability: 30 points (CRITICAL)
    if (venueMatch.hasVenues) {
      score += 30;
      reasons.push(`${venueMatch.matchingVenues.length} venue(s) available nearby`);
    } else {
      return { score: 0, reasons: [] }; // Shouldn't happen due to pre-filtering
    }

    // Distance to venue: 20 points (closer = better)
    // Max distance is typically 5 miles, so we score based on how close the average is
    const maxDistance = template.maxVenueDistance || 5;
    const distanceScore = Math.max(0, 20 * (1 - venueMatch.averageDistance / maxDistance));
    score += distanceScore;
    if (venueMatch.closeVenuesCount > 0) {
      reasons.push(`${venueMatch.closeVenuesCount} venue(s) within 3 miles`);
    }

    // Love language match: 20 points (user + partner)
    let loveLanguageScore = 0;
    if (criteria.userLoveLanguage && template.loveLanguage) {
      const userMatch = template.loveLanguage.some(
        ll => this.normalizeLoveLanguage(ll) === this.normalizeLoveLanguage(criteria.userLoveLanguage!)
      );
      if (userMatch) {
        loveLanguageScore += 8; // User match contributes to total 20
        reasons.push(`User love language: ${criteria.userLoveLanguage}`);
      }
    }

    if (criteria.partnerLoveLanguage && template.loveLanguage) {
      const partnerMatch = template.loveLanguage.some(
        ll => this.normalizeLoveLanguage(ll) === this.normalizeLoveLanguage(criteria.partnerLoveLanguage!)
      );
      if (partnerMatch) {
        loveLanguageScore += 12; // Partner match is more important
        reasons.push(`Partner love language: ${criteria.partnerLoveLanguage}`);
      }

      // Secondary love language (bonus)
      if (criteria.partnerLoveLanguageSecondary) {
        const secondaryMatch = template.loveLanguage.some(
          ll => this.normalizeLoveLanguage(ll) === this.normalizeLoveLanguage(criteria.partnerLoveLanguageSecondary!)
        );
        if (secondaryMatch) {
          loveLanguageScore += 5; // Bonus for secondary match
          reasons.push(`Partner secondary love language`);
        }
      }
    }
    score += Math.min(loveLanguageScore, 20); // Cap at 20 points

    // Interest/hobby match: 15 points
    let interestScore = 0;
    if (criteria.partnerInterests && criteria.partnerInterests.length > 0) {
      const interestMatch = this.matchInterests(template, criteria.partnerInterests);
      if (interestMatch.matched) {
        // Cap interest score contribution at 8 points
        interestScore += Math.min(interestMatch.score / 2, 8);
        reasons.push(`Partner interests: ${interestMatch.matchedInterests.join(', ')}`);
      }
    }

    if (criteria.partnerHobbies && criteria.partnerHobbies.length > 0) {
      const hobbyMatch = this.matchHobbies(template, criteria.partnerHobbies);
      if (hobbyMatch.matched) {
        // Cap hobby score contribution at 7 points
        interestScore += Math.min(hobbyMatch.score / 2, 7);
        reasons.push(`Partner hobbies: ${hobbyMatch.matchedHobbies.join(', ')}`);
      }
    }
    score += Math.min(interestScore, 15); // Cap at 15 points

    // Budget match: 15 points
    if (criteria.budget) {
      if (template.budget === criteria.budget) {
        score += 15;
        reasons.push(`Budget match: ${template.budget}`);
      } else if (
        (criteria.budget === '$$$' && template.budget !== '$') ||
        (criteria.budget === '$$' && template.budget === '$')
      ) {
        score += 7; // Partial match
      }
    }

    // Duration match: 15 points (INCREASED - user's time is important!)
    if (criteria.duration && template.timeRequired) {
      const timeReq = template.timeRequired.toLowerCase();
      const matches = this.matchesDuration(timeReq, criteria.duration);
      if (matches) {
        score += 15;
        reasons.push(`Perfect duration match: ${template.timeRequired}`);
      }
    }

    // Venue preference match: 15 points (IMPORTANT - respect single vs multiple choice!)
    if (criteria.venuePreference) {
      const venueCount = this.getVenueCategoryCount(template);
      if (criteria.venuePreference === 'single' && venueCount === 1) {
        score += 15;
        reasons.push('Single venue date (as requested)');
      } else if (criteria.venuePreference === 'multiple' && venueCount >= 2) {
        score += 15;
        reasons.push('Multiple venue date (as requested)');
      } else if (criteria.venuePreference === 'single' && venueCount > 1) {
        score -= 10; // Penalize multi-venue when single requested
      }
    }

    // Food preference match: 10 points (for restaurant dates)
    if (this.isFoodRelatedDate(template)) {
      let foodScore = 0;
      if (criteria.partnerFavoriteFoods && criteria.partnerFavoriteFoods.length > 0) {
        const foodMatch = this.matchFoods(template, criteria.partnerFavoriteFoods);
        if (foodMatch.matched) {
          foodScore += 5;
          reasons.push(`Partner favorite foods`);
        }
      }

      if (criteria.partnerFavoriteCuisines && criteria.partnerFavoriteCuisines.length > 0) {
        const cuisineMatch = this.matchCuisines(template, criteria.partnerFavoriteCuisines);
        if (cuisineMatch.matched) {
          foodScore += 5;
          reasons.push(`Partner favorite cuisines`);
        }
      }
      score += foodScore;
    }

    // Date style match: 10 points
    if (criteria.partnerDateStyles && criteria.partnerDateStyles.length > 0) {
      const styleMatch = this.matchDateStyles(template, criteria.partnerDateStyles);
      if (styleMatch.matched) {
        score += 10;
        reasons.push(`Partner date style preference`);
      }
    }

    // Venue rating: 5 points (if applicable)
    if (venueMatch.averageRating > 0) {
      // Scale rating to 5 points (assuming 5.0 is max rating)
      const ratingScore = (venueMatch.averageRating / 5.0) * 5;
      score += ratingScore;
      if (venueMatch.averageRating >= 4.5) {
        reasons.push(`Highly rated venues (${venueMatch.averageRating.toFixed(1)}/5.0)`);
      }
    }

    // Seasonal match: 5 points (if season info available)
    // Skip for now as we don't have current season in criteria

    // Uniqueness: 3 points
    if (template.uniquenessScore) {
      const uniquenessScore = (template.uniquenessScore / 10) * 3;
      score += uniquenessScore;
    }

    // Venue preference matching (bonus points)
    if (criteria.venuePreference) {
      const venueCount = this.getVenueCategoryCount(template);
      if (criteria.venuePreference === 'single' && venueCount <= 2) {
        score += 2; // Small bonus
        reasons.push('Single venue preference match');
      } else if (criteria.venuePreference === 'multiple' && venueCount >= 2) {
        score += 2; // Small bonus
        reasons.push('Multiple venue preference match');
      }
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
   * Uses new metadata fields if available
   */
  getVenueCategoryCount(template: DateTemplate): number {
    // Use new metadata fields if available
    if (template.requiredVenues && template.requiredVenues.length > 0) {
      const count = template.requiredVenues.length;
      // Add optional venues if they exist
      if (template.optionalVenues && template.optionalVenues.length > 0) {
        // Count unique categories (in case there's overlap)
        const allCategories = new Set([...template.requiredVenues, ...template.optionalVenues]);
        return allCategories.size;
      }
      return count;
    }

    // Fallback to parsing
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
   * Uses new interestTags metadata if available
   */
  matchInterests(template: DateTemplate, interests: string[]): {
    matched: boolean;
    score: number;
    matchedInterests: string[];
  } {
    const lowerInterests = interests.map(i => i.toLowerCase());
    const matchedInterests: string[] = [];

    // Check new interestTags metadata first (more accurate)
    if (template.interestTags && template.interestTags.length > 0) {
      template.interestTags.forEach(tag => {
        const lowerTag = tag.toLowerCase();
        if (lowerInterests.some(interest => 
          interest.includes(lowerTag) || 
          lowerTag.includes(interest) ||
          this.getInterestKeywords(interest).some(keyword => lowerTag.includes(keyword))
        )) {
          matchedInterests.push(tag);
        }
      });
    }

    // Check interestCategories metadata
    if (template.interestCategories && template.interestCategories.length > 0) {
      template.interestCategories.forEach(category => {
        const lowerCategory = category.toLowerCase();
        if (lowerInterests.some(interest => 
          interest.includes(lowerCategory) || 
          lowerCategory.includes(interest)
        )) {
          matchedInterests.push(category);
        }
      });
    }

    // Check template metadata (sharedHobbies)
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
   * Check if venues are available for this template (with distance filtering)
   */
  hasMatchingVenues(
    template: DateTemplate,
    venues: Place[],
    maxDistance?: number
  ): {
    hasVenues: boolean;
    matchingVenues: Place[];
  } {
    const categories = this.getRequiredVenueCategories(template);
    const distanceLimit = maxDistance ?? template.maxVenueDistance ?? 5;
    
    const matchingVenues = venues.filter(v => {
      if (!categories.includes(v.category)) {
        return false;
      }
      if (v.distance > distanceLimit) {
        return false;
      }
      // Check if template requires high rated venues
      if (template.prefersHighRated && v.rating < 4.5) {
        return false;
      }
      return true;
    });

    // If no required venues found, check optional venues
    if (matchingVenues.length === 0 && template.optionalVenues) {
      const optionalMatchingVenues = venues.filter(v => {
        if (!template.optionalVenues!.includes(v.category)) {
          return false;
        }
        if (v.distance > distanceLimit) {
          return false;
        }
        if (template.prefersHighRated && v.rating < 4.5) {
          return false;
        }
        return true;
      });
      return {
        hasVenues: optionalMatchingVenues.length > 0,
        matchingVenues: optionalMatchingVenues,
      };
    }

    return {
      hasVenues: matchingVenues.length > 0,
      matchingVenues,
    };
  },

  /**
   * Get required venue categories for a template
   * Uses new metadata fields if available, otherwise falls back to parsing
   */
  getRequiredVenueCategories(template: DateTemplate): PlaceCategory[] {
    // Use new metadata field if available
    if (template.requiredVenues && template.requiredVenues.length > 0) {
      return template.requiredVenues;
    }

    // Fallback to parsing title/description
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
