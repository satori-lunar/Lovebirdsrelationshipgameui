import type { LocationCoordinates } from './locationService';

export interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  distance: number; // in kilometers
  latitude: number;
  longitude: number;
  rating?: number;
  priceLevel?: string;
  description?: string;
  imageUrl?: string;
  isOpen?: boolean;
}

export type PlaceCategory =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'park'
  | 'museum'
  | 'theater'
  | 'cinema'
  | 'activity'
  | 'shopping'
  | 'entertainment'
  | 'all';

const MILES_TO_KM = 1.60934;

export const nearbyPlacesService = {
  /**
   * Find places near a location using Overpass API (OpenStreetMap)
   * This is a free alternative to Google Places API
   */
  async findNearbyPlaces(
    location: LocationCoordinates,
    radiusMiles: number = 20,
    category: PlaceCategory = 'all',
    limit: number = 20
  ): Promise<Place[]> {
    try {
      const radiusMeters = radiusMiles * MILES_TO_KM * 1000;

      // Build Overpass query based on category
      const amenityTags = this.getCategoryTags(category);
      const query = this.buildOverpassQuery(location, radiusMeters, amenityTags);

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch nearby places');
      }

      const data = await response.json();
      const places = this.parseOverpassResponse(data, location);

      // Sort by distance and limit results
      return places
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching nearby places:', error);
      return [];
    }
  },

  /**
   * Get OpenStreetMap tags for different categories
   */
  getCategoryTags(category: PlaceCategory): string[] {
    const categoryMap: Record<PlaceCategory, string[]> = {
      restaurant: ['restaurant', 'fast_food', 'food_court'],
      cafe: ['cafe', 'coffee_shop'],
      bar: ['bar', 'pub', 'nightclub'],
      park: ['park', 'garden', 'nature_reserve'],
      museum: ['museum', 'gallery', 'arts_centre'],
      theater: ['theatre', 'cinema'],
      cinema: ['cinema'],
      activity: ['sports_centre', 'swimming_pool', 'ice_rink', 'bowling_alley', 'amusement_arcade'],
      shopping: ['shopping_centre', 'mall', 'marketplace'],
      entertainment: ['theatre', 'cinema', 'nightclub', 'casino', 'amusement_arcade'],
      all: [
        'restaurant', 'cafe', 'bar', 'pub', 'park', 'museum',
        'theatre', 'cinema', 'shopping_centre', 'arts_centre'
      ],
    };

    return categoryMap[category] || categoryMap.all;
  },

  /**
   * Build Overpass API query
   */
  buildOverpassQuery(
    location: LocationCoordinates,
    radiusMeters: number,
    amenityTags: string[]
  ): string {
    const tagQuery = amenityTags.map(tag => `node["amenity"="${tag}"](around:${radiusMeters},${location.latitude},${location.longitude});`).join('\n');

    return `
      [out:json][timeout:25];
      (
        ${tagQuery}
      );
      out body;
      >;
      out skel qt;
    `;
  },

  /**
   * Parse Overpass API response into Place objects
   */
  parseOverpassResponse(data: any, userLocation: LocationCoordinates): Place[] {
    if (!data.elements || data.elements.length === 0) {
      return [];
    }

    return data.elements
      .filter((element: any) => element.type === 'node' && element.tags)
      .map((element: any) => {
        const tags = element.tags;
        const distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          element.lat,
          element.lon
        );

        return {
          id: element.id.toString(),
          name: tags.name || 'Unnamed Place',
          category: tags.amenity || 'other',
          address: this.buildAddress(tags),
          distance: parseFloat(distance.toFixed(2)),
          latitude: element.lat,
          longitude: element.lon,
          rating: tags.stars ? parseFloat(tags.stars) : undefined,
          priceLevel: this.mapPriceLevel(tags),
          description: tags.description || tags.cuisine || undefined,
          isOpen: this.determineIfOpen(tags),
        };
      })
      .filter((place: Place) => place.name !== 'Unnamed Place'); // Filter out unnamed places
  },

  /**
   * Build address string from OSM tags
   */
  buildAddress(tags: any): string {
    const parts = [];

    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);

    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  },

  /**
   * Map price information to a simple level
   */
  mapPriceLevel(tags: any): string | undefined {
    if (tags.payment || tags.fee) {
      return tags.fee === 'no' ? 'Free' : 'Paid';
    }
    return undefined;
  },

  /**
   * Determine if place is currently open (basic check)
   */
  determineIfOpen(tags: any): boolean | undefined {
    if (tags.opening_hours) {
      // Simple check - in production, you'd want to parse opening_hours properly
      return !tags.opening_hours.includes('closed');
    }
    return undefined;
  },

  /**
   * Calculate distance between two coordinates in kilometers
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Convert degrees to radians
   */
  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  },

  /**
   * Format distance for display
   */
  formatDistance(distanceKm: number): string {
    const distanceMiles = distanceKm / MILES_TO_KM;

    if (distanceMiles < 0.1) {
      return `${Math.round(distanceMiles * 5280)} ft`;
    } else if (distanceMiles < 1) {
      return `${distanceMiles.toFixed(1)} mi`;
    } else {
      return `${distanceMiles.toFixed(1)} mi`;
    }
  },

  /**
   * Get popular date spot categories
   */
  getDateCategories(): Array<{ value: PlaceCategory; label: string; emoji: string }> {
    return [
      { value: 'restaurant', label: 'Restaurants', emoji: '🍽️' },
      { value: 'cafe', label: 'Cafes', emoji: '☕' },
      { value: 'bar', label: 'Bars & Pubs', emoji: '🍺' },
      { value: 'park', label: 'Parks', emoji: '🌳' },
      { value: 'museum', label: 'Museums', emoji: '🎨' },
      { value: 'theater', label: 'Theaters', emoji: '🎭' },
      { value: 'cinema', label: 'Cinemas', emoji: '🎬' },
      { value: 'activity', label: 'Activities', emoji: '🎯' },
      { value: 'entertainment', label: 'Entertainment', emoji: '🎪' },
      { value: 'all', label: 'All Places', emoji: '📍' },
    ];
  },

  /**
   * Get romantic date suggestions based on nearby places
   */
  async getRomanticDateSuggestions(
    location: LocationCoordinates,
    radiusMiles: number = 20
  ): Promise<{ category: string; places: Place[] }[]> {
    const romanticCategories: PlaceCategory[] = ['restaurant', 'cafe', 'park', 'museum', 'theater'];

    const suggestions = await Promise.all(
      romanticCategories.map(async (category) => {
        const places = await this.findNearbyPlaces(location, radiusMiles, category, 5);
        return {
          category: category.charAt(0).toUpperCase() + category.slice(1),
          places,
        };
      })
    );

    return suggestions.filter(s => s.places.length > 0);
  },

  /**
   * Find midpoint between two locations for couple meetups
   */
  findMidpoint(
    location1: LocationCoordinates,
    location2: LocationCoordinates
  ): LocationCoordinates {
    const lat = (location1.latitude + location2.latitude) / 2;
    const lon = (location1.longitude + location2.longitude) / 2;

    return {
      latitude: lat,
      longitude: lon,
    };
  },

  /**
   * Find places between two locations (for couple meetups)
   */
  async findPlacesBetween(
    location1: LocationCoordinates,
    location2: LocationCoordinates,
    category: PlaceCategory = 'all',
    radiusMiles: number = 10
  ): Promise<Place[]> {
    const midpoint = this.findMidpoint(location1, location2);
    return this.findNearbyPlaces(midpoint, radiusMiles, category);
  },
};
