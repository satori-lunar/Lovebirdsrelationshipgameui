import type { LocationCoordinates } from './locationService';
import type { Place, PlaceCategory } from './nearbyPlacesService';

const MILES_TO_METERS = 1609.34;

// Check if we should use Google Places API
// The API key is now stored server-side in the Vercel API proxy
// We'll attempt to use the proxy (which will check for the key server-side)
const USE_GOOGLE_API = true; // Always try to use API proxy (falls back to mock on error)

export const googlePlacesService = {
  /**
   * Find places near a location using Google Places API
   * Falls back to beta/mock data if API key is not configured
   */
  async findNearbyPlaces(
    location: LocationCoordinates,
    radiusMiles: number = 20,
    category: PlaceCategory = 'all',
    limit: number = 20
  ): Promise<Place[]> {
    if (USE_GOOGLE_API) {
      return this.findNearbyPlacesWithGoogle(location, radiusMiles, category, limit);
    } else {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Google Places API key not configured. Using mock data. Add VITE_GOOGLE_PLACES_API_KEY to your .env file for real venues.');
      }
      return this.getMockPlaces(location, category, limit);
    }
  },

  /**
   * Find places using Google Places API Nearby Search
   * Uses our Vercel serverless function proxy to avoid CORS issues
   */
  async findNearbyPlacesWithGoogle(
    location: LocationCoordinates,
    radiusMiles: number,
    category: PlaceCategory,
    limit: number
  ): Promise<Place[]> {
    try {
      const radiusMeters = Math.min(radiusMiles * MILES_TO_METERS, 50000); // Google max is 50km
      const type = this.categoryToGoogleType(category);

      console.log(`🔍 Fetching ${category} venues from Google Places via API proxy...`);

      // Use our Vercel serverless function proxy to avoid CORS issues
      const proxyUrl = new URL('/api/places', window.location.origin);
      proxyUrl.searchParams.append('latitude', location.latitude.toString());
      proxyUrl.searchParams.append('longitude', location.longitude.toString());
      proxyUrl.searchParams.append('radius', (radiusMeters / 1609.34).toString()); // Convert to miles for proxy
      if (type !== 'all') {
        proxyUrl.searchParams.append('type', type);
      }

      const response = await fetch(proxyUrl.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API proxy error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google API returned status: ${data.status}${data.error_message ? `: ${data.error_message}` : ''}`);
      }

      const places = this.parseGoogleResponse(data, location);
      console.log(`✅ Found ${places.length} ${category} venues from Google`);

      return places.slice(0, limit);
    } catch (error) {
      console.error('❌ Google Places API error:', error);
      // Fallback to mock data on error
      return this.getMockPlaces(location, category, limit);
    }
  },

  /**
   * Convert our category types to Google Place types
   * Enhanced with multiple Google Place types for better matching
   */
  categoryToGoogleType(category: PlaceCategory): string {
    const typeMap: Record<PlaceCategory, string> = {
      restaurant: 'restaurant',
      cafe: 'cafe',
      bar: 'bar',
      park: 'park',
      museum: 'museum',
      theater: 'movie_theater',
      cinema: 'movie_theater',
      activity: 'amusement_park', // Can also include: bowling_alley, gym, sports_complex
      shopping: 'shopping_mall',
      entertainment: 'night_club',
      all: 'all',
    };

    return typeMap[category] || 'all';
  },

  /**
   * Get additional Google Place types for a category (for better venue discovery)
   */
  getAdditionalGoogleTypes(category: PlaceCategory): string[] {
    const additionalTypes: Record<PlaceCategory, string[]> = {
      restaurant: ['meal_takeaway', 'food', 'meal_delivery'],
      cafe: ['bakery', 'meal_takeaway'],
      bar: ['night_club', 'liquor_store'],
      park: ['campground', 'rv_park'],
      museum: ['art_gallery', 'library', 'aquarium', 'zoo'],
      theater: ['movie_rental', 'movie_rental'],
      cinema: ['movie_rental'],
      activity: ['bowling_alley', 'gym', 'sports_complex', 'stadium', 'amusement_park', 'aquarium', 'zoo'],
      shopping: ['clothing_store', 'book_store', 'jewelry_store', 'shoe_store'],
      entertainment: ['night_club', 'bar', 'casino'],
      all: [],
    };

    return additionalTypes[category] || [];
  },

  /**
   * Parse Google Places API response into our Place format
   */
  parseGoogleResponse(data: any, userLocation: LocationCoordinates): Place[] {
    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((result: any) => {
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        result.geometry.location.lat,
        result.geometry.location.lng
      );

      // Map Google price level (0-4) to our format
      let priceLevel: string | undefined;
      if (result.price_level !== undefined) {
        const levels = ['Free', '$', '$$', '$$$', '$$$$'];
        priceLevel = levels[result.price_level] || undefined;
      }

      // Determine category from types - enhanced mapping
      let category = 'other';
      if (result.types) {
        const types = result.types.map((t: string) => t.toLowerCase());
        
        // Priority order matters - more specific first
        if (types.some(t => ['restaurant', 'meal_takeaway', 'meal_delivery', 'food'].includes(t))) {
          category = 'restaurant';
        } else if (types.some(t => ['cafe', 'bakery'].includes(t))) {
          category = 'cafe';
        } else if (types.some(t => ['bar', 'night_club', 'liquor_store'].includes(t))) {
          category = 'bar';
        } else if (types.some(t => ['park', 'campground', 'rv_park'].includes(t))) {
          category = 'park';
        } else if (types.some(t => ['museum', 'art_gallery', 'library', 'aquarium', 'zoo'].includes(t))) {
          category = 'museum';
        } else if (types.some(t => ['movie_theater', 'movie_rental'].includes(t))) {
          category = 'theater';
        } else if (types.some(t => ['amusement_park', 'bowling_alley', 'gym', 'sports_complex', 'stadium'].includes(t))) {
          category = 'activity';
        } else if (types.some(t => ['shopping_mall', 'clothing_store', 'book_store'].includes(t))) {
          category = 'shopping';
        }
      }

      // Extract cuisine type if restaurant (for better food matching)
      let cuisineType: string | undefined;
      if (category === 'restaurant' && result.types) {
        const cuisineTypes = [
          'italian', 'chinese', 'japanese', 'mexican', 'indian', 'thai',
          'french', 'american', 'korean', 'vietnamese', 'mediterranean',
          'greek', 'spanish', 'steakhouse', 'seafood', 'pizza', 'sushi'
        ];
        const matchedCuisine = result.types.find((t: string) => {
          const lowerType = t.toLowerCase();
          return cuisineTypes.some(cuisine => lowerType.includes(cuisine));
        });
        if (matchedCuisine) {
          // Extract just the cuisine name from the type (e.g., "italian_restaurant" -> "Italian")
          const cuisineName = matchedCuisine.split('_')[0];
          cuisineType = cuisineName.charAt(0).toUpperCase() + cuisineName.slice(1);
        }
      }

      return {
        id: result.place_id,
        name: result.name,
        category,
        address: result.vicinity || result.formatted_address || 'Address not available',
        distance: parseFloat(distance.toFixed(2)),
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        rating: result.rating,
        priceLevel,
        description: cuisineType 
          ? `${cuisineType} cuisine • ${result.types?.filter((t: string) => !t.toLowerCase().includes(cuisineType.toLowerCase()))?.[0] || 'Restaurant'}`
          : result.types?.slice(0, 2).map((t: string) => t.replace(/_/g, ' ')).join(' • ') || 'Place',
        isOpen: result.opening_hours?.open_now,
        // Photo URLs go through our proxy to avoid CORS and keep API key secure
        photoUrl: result.photos?.[0]?.photo_reference
          ? `/api/places-photo?photo_reference=${result.photos[0].photo_reference}&maxwidth=400`
          : undefined,
      };
    }).filter((place: Place) => place.name && place.name !== '');
  },

  /**
   * Get detailed information for a specific place
   * Fetches phone, website, opening hours, and other details via API proxy
   */
  async getPlaceDetails(placeId: string): Promise<Partial<Place> | null> {
    try {
      if (!USE_GOOGLE_API) {
        console.warn('⚠️ Google Places API key not configured');
        return null;
      }

      // Use our Vercel serverless function proxy to avoid CORS issues
      const proxyUrl = new URL('/api/places-details', window.location.origin);
      proxyUrl.searchParams.append('place_id', placeId);

      const response = await fetch(proxyUrl.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API proxy error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.result) {
        console.error('Failed to fetch place details:', data.status || 'Unknown error');
        return null;
      }

      const result = data.result;
      return {
        formattedPhoneNumber: result.formatted_phone_number,
        phoneNumber: result.international_phone_number || result.formatted_phone_number,
        website: result.website,
        openingHours: result.opening_hours?.weekday_text,
        googleMapsUrl: result.url || result.website,
      };
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  },

  /**
   * Get mock/beta places for testing without API key
   */
  getMockPlaces(location: LocationCoordinates, category: PlaceCategory, limit: number): Place[] {
    const mockPlaces: Place[] = [
      {
        id: 'mock-1',
        name: 'The Romantic Garden',
        category: 'restaurant',
        address: '123 Main St, Your City',
        distance: 0.8,
        latitude: location.latitude + 0.01,
        longitude: location.longitude + 0.01,
        rating: 4.5,
        priceLevel: '$$',
        description: 'Fine Dining • Romantic',
        isOpen: true,
      },
      {
        id: 'mock-2',
        name: 'Cozy Coffee Corner',
        category: 'cafe',
        address: '456 Oak Ave, Your City',
        distance: 1.2,
        latitude: location.latitude + 0.015,
        longitude: location.longitude - 0.01,
        rating: 4.7,
        priceLevel: '$',
        description: 'Coffee Shop • Bakery',
        isOpen: true,
      },
      {
        id: 'mock-3',
        name: 'Sunset Park',
        category: 'park',
        address: '789 Park Dr, Your City',
        distance: 2.0,
        latitude: location.latitude - 0.02,
        longitude: location.longitude + 0.015,
        rating: 4.8,
        priceLevel: 'Free',
        description: 'Public Park • Scenic Views',
        isOpen: true,
      },
      {
        id: 'mock-4',
        name: 'City Art Museum',
        category: 'museum',
        address: '321 Culture St, Your City',
        distance: 1.5,
        latitude: location.latitude + 0.012,
        longitude: location.longitude + 0.018,
        rating: 4.6,
        priceLevel: '$$',
        description: 'Art Museum • Modern Art',
        isOpen: true,
      },
      {
        id: 'mock-5',
        name: 'The Wine Bar',
        category: 'bar',
        address: '654 Vine St, Your City',
        distance: 0.9,
        latitude: location.latitude - 0.008,
        longitude: location.longitude - 0.012,
        rating: 4.4,
        priceLevel: '$$',
        description: 'Wine Bar • Cocktails',
        isOpen: true,
      },
      {
        id: 'mock-6',
        name: 'Downtown Cinema',
        category: 'theater',
        address: '987 Theater Ln, Your City',
        distance: 1.8,
        latitude: location.latitude + 0.016,
        longitude: location.longitude - 0.014,
        rating: 4.3,
        priceLevel: '$$',
        description: 'Movie Theater • IMAX',
        isOpen: true,
      },
      {
        id: 'mock-7',
        name: 'Fun Zone Arcade',
        category: 'activity',
        address: '147 Game St, Your City',
        distance: 2.5,
        latitude: location.latitude - 0.018,
        longitude: location.longitude + 0.02,
        rating: 4.5,
        priceLevel: '$',
        description: 'Arcade • Bowling',
        isOpen: true,
      },
    ];

    // Filter by category
    let filtered = mockPlaces;
    if (category !== 'all') {
      filtered = mockPlaces.filter(place => place.category === category);
    }

    // Sort by distance and limit
    return filtered
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
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
    const R = 6371; // Radius of Earth in kilometers
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

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  },

  /**
   * Format distance for display
   */
  formatDistance(distanceKm: number): string {
    const distanceMiles = distanceKm * 0.621371;

    if (distanceMiles < 0.1) {
      return `${Math.round(distanceMiles * 5280)} ft`;
    } else {
      return `${distanceMiles.toFixed(1)} mi`;
    }
  },

  /**
   * Find midpoint between two locations
   */
  findMidpoint(
    location1: LocationCoordinates,
    location2: LocationCoordinates
  ): LocationCoordinates {
    return {
      latitude: (location1.latitude + location2.latitude) / 2,
      longitude: (location1.longitude + location2.longitude) / 2,
    };
  },
};
