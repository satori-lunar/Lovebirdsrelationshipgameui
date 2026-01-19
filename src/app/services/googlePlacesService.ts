import type { LocationCoordinates } from './locationService';
import type { Place, PlaceCategory } from './nearbyPlacesService';

const MILES_TO_METERS = 1609.34;

// Check if Google Places API key is configured
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
const USE_GOOGLE_API = GOOGLE_API_KEY.length > 0;

// Track if Google Maps script is loaded
let googleMapsLoaded = false;
let googleMapsLoadPromise: Promise<void> | null = null;

/**
 * Dynamically load Google Maps JavaScript library
 */
function loadGoogleMapsScript(): Promise<void> {
  if (googleMapsLoaded) {
    return Promise.resolve();
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Cannot load Google Maps in server environment'));
      return;
    }

    // Check if already loaded
    if (window.google?.maps?.places) {
      googleMapsLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    // Set up callback
    (window as any).initGoogleMaps = () => {
      googleMapsLoaded = true;
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
}

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
      console.log('🧪 Using beta venue data (Google API key not configured)');
      return this.getMockPlaces(location, category, limit);
    }
  },

  /**
   * Find places using Google Places API Nearby Search
   */
  async findNearbyPlacesWithGoogle(
    location: LocationCoordinates,
    radiusMiles: number,
    category: PlaceCategory,
    limit: number
  ): Promise<Place[]> {
    try {
      // Load Google Maps script if not already loaded
      await loadGoogleMapsScript();

      const radiusMeters = Math.min(radiusMiles * MILES_TO_METERS, 50000); // Google max is 50km
      const type = this.categoryToGoogleType(category);

      console.log(`🔍 Fetching ${category} venues from Google Places...`);

      // Create a map element (required for PlacesService, but can be hidden)
      const mapDiv = document.createElement('div');
      const map = new google.maps.Map(mapDiv);
      const service = new google.maps.places.PlacesService(map);

      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(location.latitude, location.longitude),
        radius: radiusMeters,
      };

      // Only add type if it's not 'all'
      if (type !== 'all') {
        request.type = type;
      }

      // Wrap the callback-based API in a Promise
      const results = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
        service.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
          } else {
            reject(new Error(`Google Places API returned status: ${status}`));
          }
        });
      });

      const places = this.parseGooglePlacesServiceResponse(results, location);
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
      activity: 'amusement_park',
      shopping: 'shopping_mall',
      entertainment: 'night_club',
      all: 'all',
    };

    return typeMap[category] || 'all';
  },

  /**
   * Parse Google Places Service response into our Place format
   */
  parseGooglePlacesServiceResponse(results: google.maps.places.PlaceResult[], userLocation: LocationCoordinates): Place[] {
    if (!results || results.length === 0) {
      return [];
    }

    return results.map((result) => {
      const lat = result.geometry?.location?.lat();
      const lng = result.geometry?.location?.lng();

      if (!lat || !lng) {
        return null;
      }

      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        lat,
        lng
      );

      // Map Google price level (0-4) to our format
      let priceLevel: string | undefined;
      if (result.price_level !== undefined) {
        const levels = ['Free', '$', '$$', '$$$', '$$$$'];
        priceLevel = levels[result.price_level] || undefined;
      }

      // Determine category from types
      let category = 'other';
      if (result.types) {
        if (result.types.includes('restaurant')) category = 'restaurant';
        else if (result.types.includes('cafe')) category = 'cafe';
        else if (result.types.includes('bar')) category = 'bar';
        else if (result.types.includes('park')) category = 'park';
        else if (result.types.includes('museum')) category = 'museum';
        else if (result.types.includes('movie_theater')) category = 'theater';
      }

      // Get photo URL if available
      let photoUrl: string | undefined;
      if (result.photos && result.photos.length > 0) {
        photoUrl = result.photos[0].getUrl({ maxWidth: 400 });
      }

      return {
        id: result.place_id || `place-${Math.random()}`,
        name: result.name || 'Unknown',
        category,
        address: result.vicinity || 'Address not available',
        distance: parseFloat(distance.toFixed(2)),
        latitude: lat,
        longitude: lng,
        rating: result.rating,
        priceLevel,
        description: result.types?.slice(0, 2).join(' • '),
        isOpen: result.opening_hours?.open_now,
        photoUrl,
      };
    }).filter((place): place is Place => place !== null && place.name !== 'Unknown');
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
