/**
 * Unified Date Matching Service - Clean Architecture
 *
 * Simple 3-step process:
 * 1. Score templates based on user preferences (PRIMARY)
 * 2. Match venues with deduplication
 * 3. Return sorted results
 */

import { DateTemplate } from '../data/dateSuggestionTemplates';
import { Place, PlaceCategory } from './googlePlacesService';

// ============================================================================
// TYPES
// ============================================================================

export interface UserPreferences {
  budget: '$' | '$$' | '$$$';
  duration: 'quick' | 'half-day' | 'full-day';
  venuePreference: 'single' | 'multiple';
  loveLanguages?: string[];
  interests?: string[];
  userLocation?: { latitude: number; longitude: number };
  partnerLocation?: { latitude: number; longitude: number };
}

export interface ScoredDateTemplate {
  template: DateTemplate;
  score: number;
  matchedVenues: Place[];
  scoreBreakdown: {
    budgetMatch: number;
    durationMatch: number;
    venuePreferenceMatch: number;
    simpleTemplate: number;
    venueAvailable: number;
    loveLanguageMatch: number;
    interestMatch: number;
    distanceBonus: number;
    varietyBonus: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SCORING_WEIGHTS = {
  BUDGET_MATCH: 40,        // User preference - HIGHEST
  DURATION_MATCH: 40,      // User preference - HIGHEST
  VENUE_PREF_MATCH: 30,    // User preference - HIGH
  SIMPLE_TEMPLATE: 25,     // Simple dates over specialized - HIGH
  VENUE_AVAILABLE: 20,     // Venue match - MEDIUM
  LOVE_LANGUAGE: 15,       // Personalization - MEDIUM
  INTEREST_MATCH: 10,      // Personalization - LOW
  DISTANCE_BONUS: 10,      // Convenience - LOW
  VARIETY_BONUS: 10,       // Diversity - LOW
};

// Categories that should be filtered out (at-home activities)
const AT_HOME_KEYWORDS = [
  'at home',
  'cook together',
  'game night',
  'movie marathon',
  'cuddle',
  'dance party at home',
  'indoor picnic',
  'breakfast in bed',
  'home spa',
];

// ============================================================================
// MAIN MATCHING FUNCTION
// ============================================================================

export function matchDatesWithPreferences(
  templates: DateTemplate[],
  venues: Place[],
  preferences: UserPreferences
): ScoredDateTemplate[] {
  const usedVenueIds = new Set<string>();
  const scoredDates: ScoredDateTemplate[] = [];

  // Filter out at-home activities (don't need venues)
  const templatesNeedingVenues = templates.filter(
    template => !isAtHomeActivity(template)
  );

  for (const template of templatesNeedingVenues) {
    // Step 1: Find matching venues FIRST (before scoring)
    const matchedVenues = findMatchingVenues(template, venues, usedVenueIds);

    // CRITICAL: Skip dates with no matching venues
    if (matchedVenues.length === 0) {
      continue; // Don't include dates without venues
    }

    // Step 2: Score based on user preferences (only for dates with venues)
    const scoreBreakdown = calculateScore(template, venues, preferences, usedVenueIds);
    const totalScore = Object.values(scoreBreakdown).reduce((sum, val) => sum + val, 0);

    // Mark venues as used to prevent repetition
    matchedVenues.forEach(venue => usedVenueIds.add(venue.placeId));

    // Step 3: Add to results
    scoredDates.push({
      template,
      score: totalScore,
      matchedVenues,
      scoreBreakdown,
    });
  }

  // Sort by score (highest first)
  return scoredDates.sort((a, b) => b.score - a.score);
}

// ============================================================================
// SCORING LOGIC
// ============================================================================

function calculateScore(
  template: DateTemplate,
  venues: Place[],
  preferences: UserPreferences,
  usedVenueIds: Set<string>
): ScoredDateTemplate['scoreBreakdown'] {
  return {
    budgetMatch: scoreBudgetMatch(template, preferences.budget),
    durationMatch: scoreDurationMatch(template, preferences.duration),
    venuePreferenceMatch: scoreVenuePreferenceMatch(template, preferences.venuePreference),
    simpleTemplate: scoreSimpleTemplate(template),
    venueAvailable: scoreVenueAvailability(template, venues, usedVenueIds),
    loveLanguageMatch: scoreLoveLanguageMatch(template, preferences.loveLanguages || []),
    interestMatch: scoreInterestMatch(template, preferences.interests || []),
    distanceBonus: scoreDistanceBonus(template, venues, preferences),
    varietyBonus: scoreVarietyBonus(template, usedVenueIds),
  };
}

function scoreBudgetMatch(template: DateTemplate, userBudget: string): number {
  if (!template.budget) return 0;

  // Exact match: full points
  if (template.budget === userBudget) {
    return SCORING_WEIGHTS.BUDGET_MATCH;
  }

  // One level off: half points
  const budgetLevels = ['$', '$$', '$$$'];
  const userIndex = budgetLevels.indexOf(userBudget);
  const templateIndex = budgetLevels.indexOf(template.budget);

  if (Math.abs(userIndex - templateIndex) === 1) {
    return SCORING_WEIGHTS.BUDGET_MATCH * 0.5;
  }

  // Two levels off: no points
  return 0;
}

function scoreDurationMatch(template: DateTemplate, userDuration: string): number {
  if (!template.timeRequired) return 0;

  // Map timeRequired string to duration category
  const timeStr = template.timeRequired.toLowerCase();
  let templateDuration: string;

  if (timeStr.includes('1') || timeStr.includes('2') || timeStr.includes('3') && timeStr.includes('hour')) {
    templateDuration = 'quick'; // 1-3 hours
  } else if (timeStr.includes('4') || timeStr.includes('5') && timeStr.includes('hour')) {
    templateDuration = 'half-day'; // 3-5 hours
  } else if (timeStr.includes('day') || timeStr.includes('6') || timeStr.includes('7') || timeStr.includes('8')) {
    templateDuration = 'full-day'; // 5+ hours or full day
  } else {
    // Default to quick for short activities
    templateDuration = 'quick';
  }

  // Exact match: full points
  if (templateDuration === userDuration) {
    return SCORING_WEIGHTS.DURATION_MATCH;
  }

  // Adjacent duration: half points
  const durations = ['quick', 'half-day', 'full-day'];
  const userIndex = durations.indexOf(userDuration);
  const templateIndex = durations.indexOf(templateDuration);

  if (Math.abs(userIndex - templateIndex) === 1) {
    return SCORING_WEIGHTS.DURATION_MATCH * 0.5;
  }

  return 0;
}

function scoreVenuePreferenceMatch(template: DateTemplate, userPref: string): number {
  const templateVenueCount = template.requiredVenues?.length || 1;
  const templatePref = templateVenueCount > 1 ? 'multiple' : 'single';

  if (templatePref === userPref) {
    return SCORING_WEIGHTS.VENUE_PREF_MATCH;
  }

  // Partial match: if user wants multiple and template has 1, give some points
  if (userPref === 'multiple' && templateVenueCount === 1) {
    return SCORING_WEIGHTS.VENUE_PREF_MATCH * 0.3;
  }

  return 0;
}

function scoreSimpleTemplate(template: DateTemplate): number {
  // Prioritize simple, basic date templates over specialized ones
  // Simple templates have IDs like "simple_coffee_date", "simple_dinner_date"
  const isSimple = template.id.startsWith('simple_');

  if (isSimple) {
    return SCORING_WEIGHTS.SIMPLE_TEMPLATE;
  }

  return 0;
}

function scoreVenueAvailability(
  template: DateTemplate,
  venues: Place[],
  usedVenueIds: Set<string>
): number {
  const requiredCategories = template.requiredVenues || [];

  if (requiredCategories.length === 0) {
    return SCORING_WEIGHTS.VENUE_AVAILABLE; // No venue needed (at-home activities)
  }

  // Count available (unused) venues for each category
  let availableCount = 0;
  for (const category of requiredCategories) {
    const categoryVenues = venues.filter(
      v => v.category === category && !usedVenueIds.has(v.placeId)
    );
    availableCount += categoryVenues.length;
  }

  // CRITICAL: If no venues available, return 0 (not full points!)
  if (availableCount === 0) {
    return 0;
  }

  // Scale: 1 venue = minimum points, 5+ venues = full points
  const ratio = Math.min(availableCount / 5, 1);
  return SCORING_WEIGHTS.VENUE_AVAILABLE * ratio;
}

function scoreLoveLanguageMatch(template: DateTemplate, userLanguages: string[]): number {
  if (!template.loveLanguage || userLanguages.length === 0) {
    return 0;
  }

  const matches = template.loveLanguage.filter(lang =>
    userLanguages.some(userLang =>
      userLang.toLowerCase() === lang.toLowerCase()
    )
  );

  if (matches.length === 0) return 0;

  // Scale by number of matches
  const ratio = matches.length / template.loveLanguage.length;
  return SCORING_WEIGHTS.LOVE_LANGUAGE * ratio;
}

function scoreInterestMatch(template: DateTemplate, userInterests: string[]): number {
  if (userInterests.length === 0) return 0;

  // Combine all tag fields
  const allTags = [
    ...(template.interestTags || []),
    ...(template.activityTags || []),
    ...(template.interestCategories || []),
  ];

  if (allTags.length === 0) return 0;

  // Simple keyword matching
  const matches = allTags.filter(tag =>
    userInterests.some(interest =>
      tag.toLowerCase().includes(interest.toLowerCase()) ||
      interest.toLowerCase().includes(tag.toLowerCase())
    )
  );

  if (matches.length === 0) return 0;

  const ratio = matches.length / allTags.length;
  return SCORING_WEIGHTS.INTEREST_MATCH * ratio;
}

function scoreDistanceBonus(
  template: DateTemplate,
  venues: Place[],
  preferences: UserPreferences
): number {
  const requiredCategories = template.requiredVenues || [];

  if (requiredCategories.length === 0) {
    return SCORING_WEIGHTS.DISTANCE_BONUS; // No venue needed
  }

  // Find closest matching venue
  let closestDistance = Infinity;

  for (const category of requiredCategories) {
    const categoryVenues = venues.filter(v => v.category === category);

    for (const venue of categoryVenues) {
      if (venue.distance !== undefined && venue.distance < closestDistance) {
        closestDistance = venue.distance;
      }
    }
  }

  if (closestDistance === Infinity) return 0;

  // Scale: 0-1 mile = full points, 10+ miles = 0 points
  const ratio = Math.max(0, 1 - closestDistance / 10);
  return SCORING_WEIGHTS.DISTANCE_BONUS * ratio;
}

function scoreVarietyBonus(template: DateTemplate, usedVenueIds: Set<string>): number {
  // Bonus for dates that don't reuse venues (variety)
  // This naturally gives higher scores to dates suggested earlier
  const venueReuseRatio = usedVenueIds.size / 100; // Normalize to 0-1
  return SCORING_WEIGHTS.VARIETY_BONUS * (1 - Math.min(venueReuseRatio, 1));
}

// ============================================================================
// VENUE MATCHING LOGIC
// ============================================================================

function findMatchingVenues(
  template: DateTemplate,
  venues: Place[],
  usedVenueIds: Set<string>
): Place[] {
  const requiredCategories = template.requiredVenues || [];

  if (requiredCategories.length === 0) {
    return []; // At-home or no venue needed
  }

  const matchedVenues: Place[] = [];

  for (const category of requiredCategories) {
    // Find unused venues for this category
    const availableVenues = venues.filter(
      v => v.category === category && !usedVenueIds.has(v.placeId)
    );

    if (availableVenues.length === 0) {
      // No unused venues - try to find any venue (graceful fallback)
      const anyVenue = venues.find(v => v.category === category);
      if (anyVenue) {
        matchedVenues.push(anyVenue);
      }
      continue;
    }

    // Pick the closest unused venue
    const sortedByDistance = availableVenues.sort((a, b) => {
      const distA = a.distance ?? Infinity;
      const distB = b.distance ?? Infinity;
      return distA - distB;
    });

    matchedVenues.push(sortedByDistance[0]);
  }

  return matchedVenues;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isAtHomeActivity(template: DateTemplate): boolean {
  const searchText = `${template.title} ${template.description}`.toLowerCase();

  return AT_HOME_KEYWORDS.some(keyword => searchText.includes(keyword));
}

// ============================================================================
// UTILITY: Get Top Dates
// ============================================================================

export function getTopDates(
  templates: DateTemplate[],
  venues: Place[],
  preferences: UserPreferences,
  limit: number = 3  // Changed default to 3
): ScoredDateTemplate[] {
  const allMatches = matchDatesWithPreferences(templates, venues, preferences);

  // CRITICAL: Deduplicate by venue category - only take the BEST date per category
  const categoryMap = new Map<PlaceCategory, ScoredDateTemplate>();

  for (const match of allMatches) {
    if (match.matchedVenues.length === 0) continue;

    const primaryCategory = match.matchedVenues[0].category;
    const existing = categoryMap.get(primaryCategory);

    // Keep the higher-scored date for this category
    if (!existing || match.score > existing.score) {
      categoryMap.set(primaryCategory, match);
    }
  }

  // Convert back to array and sort by score
  const uniqueDates = Array.from(categoryMap.values())
    .sort((a, b) => b.score - a.score);

  return uniqueDates.slice(0, limit);
}

// ============================================================================
// UTILITY: Debug Scoring
// ============================================================================

export function debugScoring(scored: ScoredDateTemplate): string {
  const { template, score, scoreBreakdown } = scored;

  return `
Date: ${template.title}
Total Score: ${score.toFixed(1)} / ${Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0)}

Breakdown:
  Budget Match:          ${scoreBreakdown.budgetMatch.toFixed(1)} / ${SCORING_WEIGHTS.BUDGET_MATCH}
  Duration Match:        ${scoreBreakdown.durationMatch.toFixed(1)} / ${SCORING_WEIGHTS.DURATION_MATCH}
  Venue Pref Match:      ${scoreBreakdown.venuePreferenceMatch.toFixed(1)} / ${SCORING_WEIGHTS.VENUE_PREF_MATCH}
  Simple Template:       ${scoreBreakdown.simpleTemplate.toFixed(1)} / ${SCORING_WEIGHTS.SIMPLE_TEMPLATE}
  Venue Available:       ${scoreBreakdown.venueAvailable.toFixed(1)} / ${SCORING_WEIGHTS.VENUE_AVAILABLE}
  Love Language Match:   ${scoreBreakdown.loveLanguageMatch.toFixed(1)} / ${SCORING_WEIGHTS.LOVE_LANGUAGE}
  Interest Match:        ${scoreBreakdown.interestMatch.toFixed(1)} / ${SCORING_WEIGHTS.INTEREST_MATCH}
  Distance Bonus:        ${scoreBreakdown.distanceBonus.toFixed(1)} / ${SCORING_WEIGHTS.DISTANCE_BONUS}
  Variety Bonus:         ${scoreBreakdown.varietyBonus.toFixed(1)} / ${SCORING_WEIGHTS.VARIETY_BONUS}

Matched Venues: ${scored.matchedVenues.map(v => v.name).join(', ') || 'None'}
  `.trim();
}
