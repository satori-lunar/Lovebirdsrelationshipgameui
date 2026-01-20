/**
 * Venue Categorization Service
 * Provides detailed categorization, icons, and titles for venues
 * Groups venues by type for better organization
 */

import { Place, PlaceCategory } from './nearbyPlacesService';

export interface VenueCategoryInfo {
  title: string;
  icon: string;
  emoji: string;
  description: string;
  group: string; // For grouping similar venues
}

export interface CategorizedVenue extends Place {
  categoryInfo: VenueCategoryInfo;
  detailedType: string; // More specific type (e.g., "wine_bar", "coffee_shop", "farmers_market")
  isActualType: boolean; // Whether this venue actually matches its claimed type
}

/**
 * Venue type detection - checks if venue name/description matches its category
 */
export function detectVenueType(place: Place): {
  detailedType: string;
  isActualType: boolean;
  categoryInfo: VenueCategoryInfo;
} {
  const name = (place.name || '').toLowerCase();
  const desc = (place.description || '').toLowerCase();
  const category = place.category;

  // Farmers Market / Market detection
  if (name.includes('farmers market') || name.includes('farmer\'s market') ||
      name.includes('farmers\' market') || desc.includes('farmers market') ||
      name.includes('market') && (name.includes('farm') || desc.includes('produce') || desc.includes('fresh'))) {
    return {
      detailedType: 'farmers_market',
      isActualType: true,
      categoryInfo: {
        title: 'Farmers Market',
        icon: '🛒',
        emoji: '🛒',
        description: 'Local farmers market with fresh produce',
        group: 'markets'
      }
    };
  }

  // Reject convenience stores for market dates
  if (name.includes('convenience') || name.includes('store') && 
      (name.includes('gas') || name.includes('mini') || name.includes('corner'))) {
    return {
      detailedType: 'convenience_store',
      isActualType: false,
      categoryInfo: {
        title: 'Convenience Store',
        icon: '🏪',
        emoji: '🏪',
        description: 'Convenience store',
        group: 'stores'
      }
    };
  }

  // Poetry / Open Mic venues
  if (name.includes('poetry') || name.includes('open mic') || name.includes('open-mic') ||
      desc.includes('poetry') || desc.includes('open mic') || desc.includes('spoken word') ||
      desc.includes('poetry reading') || desc.includes('slam poetry')) {
    return {
      detailedType: 'poetry_venue',
      isActualType: true,
      categoryInfo: {
        title: 'Poetry Venue',
        icon: '📖',
        emoji: '📖',
        description: 'Venue hosting poetry readings or open mic',
        group: 'cultural_venues'
      }
    };
  }

  // Regular bars (not poetry venues)
  if (category === 'bar' && !name.includes('poetry') && !desc.includes('poetry') &&
      !name.includes('open mic') && !desc.includes('open mic')) {
    return {
      detailedType: 'bar',
      isActualType: true,
      categoryInfo: {
        title: 'Bar',
        icon: '🍺',
        emoji: '🍺',
        description: 'Bar or pub',
        group: 'nightlife'
      }
    };
  }

  // Wine bars
  if (name.includes('wine') || name.includes('winery') || name.includes('vineyard') ||
      desc.includes('wine') || desc.includes('winery')) {
    return {
      detailedType: 'wine_bar',
      isActualType: true,
      categoryInfo: {
        title: 'Wine Bar',
        icon: '🍷',
        emoji: '🍷',
        description: 'Wine bar or winery',
        group: 'nightlife'
      }
    };
  }

  // Coffee shops / Cafes
  if (category === 'cafe' || name.includes('cafe') || name.includes('coffee') ||
      name.includes('café') || desc.includes('coffee') || desc.includes('cafe')) {
    return {
      detailedType: 'coffee_shop',
      isActualType: true,
      categoryInfo: {
        title: 'Coffee Shop',
        icon: '☕',
        emoji: '☕',
        description: 'Coffee shop or cafe',
        group: 'cafes'
      }
    };
  }

  // Restaurants
  if (category === 'restaurant' || name.includes('restaurant') || name.includes('dining') ||
      desc.includes('restaurant') || desc.includes('dining')) {
    return {
      detailedType: 'restaurant',
      isActualType: true,
      categoryInfo: {
        title: 'Restaurant',
        icon: '🍽️',
        emoji: '🍽️',
        description: 'Restaurant',
        group: 'dining'
      }
    };
  }

  // Parks
  if (category === 'park' || name.includes('park') || name.includes('garden') ||
      desc.includes('park')) {
    return {
      detailedType: 'park',
      isActualType: true,
      categoryInfo: {
        title: 'Park',
        icon: '🌳',
        emoji: '🌳',
        description: 'Park or garden',
        group: 'outdoor'
      }
    };
  }

  // Museums
  if (category === 'museum' || name.includes('museum') || name.includes('gallery') ||
      desc.includes('museum') || desc.includes('gallery')) {
    return {
      detailedType: 'museum',
      isActualType: true,
      categoryInfo: {
        title: 'Museum',
        icon: '🎨',
        emoji: '🎨',
        description: 'Museum or art gallery',
        group: 'cultural_venues'
      }
    };
  }

  // Theaters
  if (category === 'theater' || name.includes('theater') || name.includes('theatre') ||
      name.includes('cinema') || desc.includes('theater') || desc.includes('cinema')) {
    return {
      detailedType: 'theater',
      isActualType: true,
      categoryInfo: {
        title: 'Theater',
        icon: '🎭',
        emoji: '🎭',
        description: 'Theater or cinema',
        group: 'cultural_venues'
      }
    };
  }

  // Activities
  if (category === 'activity' || name.includes('activity') || desc.includes('activity')) {
    return {
      detailedType: 'activity',
      isActualType: true,
      categoryInfo: {
        title: 'Activity Venue',
        icon: '🎯',
        emoji: '🎯',
        description: 'Activity or entertainment venue',
        group: 'activities'
      }
    };
  }

  // Default fallback
  return {
    detailedType: category || 'unknown',
    isActualType: true,
    categoryInfo: getDefaultCategoryInfo(category)
  };
}

/**
 * Get default category info for a place category
 */
function getDefaultCategoryInfo(category: PlaceCategory | string): VenueCategoryInfo {
  const categoryMap: Record<string, VenueCategoryInfo> = {
    restaurant: {
      title: 'Restaurant',
      icon: '🍽️',
      emoji: '🍽️',
      description: 'Restaurant',
      group: 'dining'
    },
    cafe: {
      title: 'Coffee Shop',
      icon: '☕',
      emoji: '☕',
      description: 'Coffee shop or cafe',
      group: 'cafes'
    },
    bar: {
      title: 'Bar',
      icon: '🍺',
      emoji: '🍺',
      description: 'Bar or pub',
      group: 'nightlife'
    },
    park: {
      title: 'Park',
      icon: '🌳',
      emoji: '🌳',
      description: 'Park or garden',
      group: 'outdoor'
    },
    museum: {
      title: 'Museum',
      icon: '🎨',
      emoji: '🎨',
      description: 'Museum or gallery',
      group: 'cultural_venues'
    },
    theater: {
      title: 'Theater',
      icon: '🎭',
      emoji: '🎭',
      description: 'Theater or cinema',
      group: 'cultural_venues'
    },
    activity: {
      title: 'Activity',
      icon: '🎯',
      emoji: '🎯',
      description: 'Activity venue',
      group: 'activities'
    }
  };

  return categoryMap[category] || {
    title: 'Venue',
    icon: '📍',
    emoji: '📍',
    description: 'Venue',
    group: 'other'
  };
}

/**
 * Categorize a list of venues
 */
export function categorizeVenues(venues: Place[]): CategorizedVenue[] {
  return venues.map(venue => {
    const { detailedType, isActualType, categoryInfo } = detectVenueType(venue);
    return {
      ...venue,
      categoryInfo,
      detailedType,
      isActualType
    };
  });
}

/**
 * Group venues by type
 */
export function groupVenuesByType(venues: CategorizedVenue[]): Record<string, CategorizedVenue[]> {
  const grouped: Record<string, CategorizedVenue[]> = {};

  venues.forEach(venue => {
    const group = venue.categoryInfo.group;
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(venue);
  });

  return grouped;
}

/**
 * Group venues by detailed type
 */
export function groupVenuesByDetailedType(venues: CategorizedVenue[]): Record<string, CategorizedVenue[]> {
  const grouped: Record<string, CategorizedVenue[]> = {};

  venues.forEach(venue => {
    const type = venue.detailedType;
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(venue);
  });

  return grouped;
}

export const venueCategorizationService = {
  detectVenueType,
  categorizeVenues,
  groupVenuesByType,
  groupVenuesByDetailedType,
  getDefaultCategoryInfo
};
