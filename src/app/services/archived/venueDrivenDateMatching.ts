/**
 * Venue-Driven Date Matching Service
 * Matches dates to what's actually available, prioritizing basic/common dates
 * Only suggests specialized dates if matching venues exist
 */

import { DateTemplate } from '../data/dateSuggestionTemplates';
import { Place, PlaceCategory } from './nearbyPlacesService';
import { detectVenueType } from './venueCategorizationService';

/**
 * Basic/common date template IDs that should be prioritized
 * These are simple, common dates that work with standard venues
 */
const BASIC_DATE_TEMPLATE_IDS = [
  'simple_coffee_date',
  'simple_dinner_date',
  'simple_drinks_at_bar',
  'simple_walk_in_park',
  'simple_museum_visit',
  'simple_movie_date',
  'simple_brunch_date',
  'simple_lunch_date',
  'date_foodie_dinner',
  'date_foodie_brunch',
  'date_culture_museum',
  'date_culture_art_gallery',
  'date_relaxed_coffee',
  'date_relaxed_park_walk',
  'date_generic_21', // Weekend Brunch Date
  'date_generic_71', // Local Coffee Shop
  'date_generic_79', // Local Pizza Place
  'date_generic_92', // Local Park Walk
];

/**
 * Check if a date is an at-home activity that doesn't need venues
 */
export function isAtHomeActivity(template: DateTemplate): boolean {
  const title = (template.title || '').toLowerCase();
  const desc = (template.description || '').toLowerCase();

  // At-home keywords
  const atHomeKeywords = [
    'at home', 'at-home', 'home', 'living room', 'bedroom', 'kitchen',
    'indoor picnic', 'movie night at home', 'game night at home',
    'cook together', 'cooking together', 'bake together', 'baking together',
    'build a fort', 'blanket fort', 'pillow fort',
    'backyard', 'cuddle', 'massage exchange', 'home workout',
    'stargazing from home', 'home concert', 'playlist', 'vision board',
    'love letter', 'memory jar', 'photo album', 'scrapbook',
    'future planning', 'relationship', 'dance party at home',
    'paint night at home', 'diy project', 'craft together',
    'meditation at home', 'yoga at home', 'online course'
  ];

  // Check if it explicitly mentions venues
  const mentionsVenue = title.includes('restaurant') || title.includes('cafe') ||
                        title.includes('bar') || title.includes('park') ||
                        title.includes('museum') || title.includes('theater') ||
                        desc.includes('visit') || desc.includes('go to');

  // If it mentions going somewhere, it's not at-home
  if (mentionsVenue) return false;

  // Check for at-home keywords
  return atHomeKeywords.some(keyword =>
    title.includes(keyword) || desc.includes(keyword)
  );
}

/**
 * Check if a date template is a basic/common date
 */
export function isBasicDate(template: DateTemplate): boolean {
  // Check if it's in the basic list
  if (BASIC_DATE_TEMPLATE_IDS.includes(template.id)) {
    return true;
  }

  const title = (template.title || '').toLowerCase();
  const desc = (template.description || '').toLowerCase();

  // Basic date keywords
  const basicKeywords = [
    'dinner', 'lunch', 'brunch', 'coffee', 'cafe', 'restaurant',
    'museum', 'park', 'walk', 'movie', 'cinema', 'bar', 'drinks',
    'pizza', 'ice cream', 'bakery'
  ];

  // Check if title/desc contains basic keywords
  const hasBasicKeyword = basicKeywords.some(keyword => 
    title.includes(keyword) || desc.includes(keyword)
  );

  // Exclude specialized/unique dates
  const specializedKeywords = [
    'poetry', 'farmers market', 'wine tasting', 'cooking class',
    'spa', 'resort', 'rafting', 'adventure', 'workshop', 'class',
    'tasting', 'brewery', 'winery', 'vineyard', 'float', 'sensory',
    'seafood', 'culinary', 'chef', 'open mic', 'slam'
  ];

  const hasSpecializedKeyword = specializedKeywords.some(keyword =>
    title.includes(keyword) || desc.includes(keyword)
  );

  // It's basic if it has basic keywords and no specialized keywords
  return hasBasicKeyword && !hasSpecializedKeyword;
}

/**
 * Check if a venue actually matches a date template
 * This is stricter than category matching - it checks venue names/descriptions
 */
export function venueActuallyMatchesDate(
  venue: Place,
  template: DateTemplate
): boolean {
  const venueName = (venue.name || '').toLowerCase();
  const venueDesc = (venue.description || '').toLowerCase();
  const venueCategory = venue.category;
  const title = (template.title || '').toLowerCase();
  const desc = (template.description || '').toLowerCase();

  // Detect venue type
  const { detailedType, isActualType } = detectVenueType(venue);

  // For specialized dates, require exact venue type match
  if (title.includes('poetry') || desc.includes('poetry') || 
      title.includes('open mic') || desc.includes('open mic')) {
    // Must be a poetry venue
    return detailedType === 'poetry_venue';
  }

  if (title.includes('farmers market') || desc.includes('farmers market') ||
      title.includes('farmer\'s market') || desc.includes('farmer\'s market')) {
    // Must be a farmers market, reject convenience stores
    if (detailedType === 'convenience_store') return false;
    const isMatch = detailedType === 'farmers_market';
    if (!isMatch) {
      console.log(`❌ Farmers market date requires actual farmers market venue, rejecting ${detailedType}: ${venueName}`);
    }
    return isMatch;
  }

  if (title.includes('wine') || desc.includes('wine') || 
      title.includes('winery') || desc.includes('winery')) {
    // Must be a wine bar/winery
    return detailedType === 'wine_bar' || venueName.includes('wine') || 
           venueName.includes('winery') || venueDesc.includes('wine');
  }

  if (title.includes('spa') || desc.includes('spa') ||
      title.includes('massage') || desc.includes('massage')) {
    // Must be a spa venue
    return venueName.includes('spa') || venueName.includes('massage') ||
           venueDesc.includes('spa') || venueDesc.includes('massage');
  }

  if (title.includes('resort') || desc.includes('resort') ||
      title.includes('hotel') || desc.includes('hotel')) {
    // Must be a resort/hotel
    return venueName.includes('resort') || venueName.includes('hotel') ||
           venueDesc.includes('resort') || venueDesc.includes('hotel');
  }

  // For basic dates, use category matching
  if (isBasicDate(template)) {
    // Coffee/cafe dates
    if (title.includes('coffee') || title.includes('cafe') ||
        desc.includes('coffee') || desc.includes('cafe')) {
      return venueCategory === 'cafe' || detailedType === 'coffee_shop';
    }

    // Restaurant/dinner dates
    if (title.includes('dinner') || title.includes('restaurant') ||
        title.includes('lunch') || title.includes('brunch') ||
        desc.includes('dinner') || desc.includes('restaurant')) {
      // Reject cafes for dinner dates
      if (detailedType === 'coffee_shop' || detailedType === 'convenience_store') {
        return false;
      }
      return venueCategory === 'restaurant' || detailedType === 'restaurant';
    }

    // Bar dates
    if (title.includes('bar') || title.includes('drinks') ||
        desc.includes('bar') || desc.includes('drinks')) {
      // Reject cafes for bar dates
      if (detailedType === 'coffee_shop') return false;
      return venueCategory === 'bar' || detailedType === 'bar' || detailedType === 'wine_bar';
    }

    // Museum dates
    if (title.includes('museum') || title.includes('gallery') ||
        desc.includes('museum') || desc.includes('gallery')) {
      return venueCategory === 'museum' || detailedType === 'museum';
    }

    // Park dates
    if (title.includes('park') || title.includes('walk') ||
        desc.includes('park') || desc.includes('walk')) {
      return venueCategory === 'park' || detailedType === 'park';
    }

    // Theater/movie dates
    if (title.includes('movie') || title.includes('cinema') ||
        title.includes('theater') || desc.includes('movie')) {
      return venueCategory === 'theater' || detailedType === 'theater';
    }
  }

  // Default: use category matching
  const requiredCategories = template.requiredVenues || [];
  if (requiredCategories.length > 0) {
    return requiredCategories.includes(venueCategory);
  }

  // Fallback: check if venue category matches date type
  const dateCategories = getDateCategories(template);
  return dateCategories.includes(venueCategory);
}

/**
 * Get date categories from template
 */
function getDateCategories(template: DateTemplate): PlaceCategory[] {
  const title = (template.title || '').toLowerCase();
  const desc = (template.description || '').toLowerCase();
  const categories: PlaceCategory[] = [];

  if (title.includes('restaurant') || title.includes('dinner') ||
      title.includes('lunch') || desc.includes('restaurant')) {
    categories.push('restaurant');
  }
  if (title.includes('cafe') || title.includes('coffee') ||
      desc.includes('cafe') || desc.includes('coffee')) {
    categories.push('cafe');
  }
  if (title.includes('bar') || title.includes('drinks') ||
      desc.includes('bar') || desc.includes('drinks')) {
    categories.push('bar');
  }
  if (title.includes('park') || desc.includes('park')) {
    categories.push('park');
  }
  if (title.includes('museum') || title.includes('gallery') ||
      desc.includes('museum') || desc.includes('gallery')) {
    categories.push('museum');
  }
  if (title.includes('theater') || title.includes('cinema') ||
      desc.includes('theater') || desc.includes('cinema')) {
    categories.push('theater');
  }
  if (title.includes('activity') || desc.includes('activity')) {
    categories.push('activity');
  }

  return categories.length > 0 ? categories : ['restaurant', 'cafe', 'bar', 'park', 'museum'];
}

/**
 * Match dates to available venues
 * Prioritizes basic dates, only includes specialized dates if venues match
 */
export function matchDatesToVenues(
  templates: DateTemplate[],
  venues: Place[]
): Array<{
  template: DateTemplate;
  matchingVenues: Place[];
  isBasic: boolean;
  matchScore: number;
}> {
  const results: Array<{
    template: DateTemplate;
    matchingVenues: Place[];
    isBasic: boolean;
    matchScore: number;
  }> = [];

  // FILTER OUT at-home activities that don't need venues
  const venueRequiringDates = templates.filter(t => !isAtHomeActivity(t));

  console.log(`🏠 Filtered out ${templates.length - venueRequiringDates.length} at-home activities`);

  // Separate basic and specialized dates
  const basicDates = venueRequiringDates.filter(t => isBasicDate(t));
  const specializedDates = venueRequiringDates.filter(t => !isBasicDate(t));

  console.log(`📊 Matching dates: ${basicDates.length} basic, ${specializedDates.length} specialized`);

  // Process basic dates first (higher priority)
  for (const template of basicDates) {
    const matchingVenues = venues.filter(venue => 
      venueActuallyMatchesDate(venue, template)
    );

    if (matchingVenues.length > 0) {
      results.push({
        template,
        matchingVenues,
        isBasic: true,
        matchScore: 100 + matchingVenues.length, // Higher score for basic dates
      });
    }
  }

  // Process specialized dates (only if they have matching venues)
  for (const template of specializedDates) {
    const matchingVenues = venues.filter(venue => 
      venueActuallyMatchesDate(venue, template)
    );

    // Only include if we have actual matching venues
    if (matchingVenues.length > 0) {
      results.push({
        template,
        matchingVenues,
        isBasic: false,
        matchScore: 50 + matchingVenues.length, // Lower score for specialized dates
      });
    }
  }

  // Sort by score (basic dates first, then by number of matching venues)
  results.sort((a, b) => b.matchScore - a.matchScore);

  console.log(`✅ Matched ${results.length} dates: ${results.filter(r => r.isBasic).length} basic, ${results.filter(r => !r.isBasic).length} specialized`);

  return results;
}

export const venueDrivenDateMatching = {
  isAtHomeActivity,
  isBasicDate,
  venueActuallyMatchesDate,
  matchDatesToVenues,
};
