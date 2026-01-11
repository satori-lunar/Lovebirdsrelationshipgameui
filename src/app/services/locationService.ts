import { api, handleSupabaseError } from './api';
import type { Tables } from './api';

export type UserLocation = Tables<'user_locations'>;

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export const locationService = {
  /**
   * Request location permission from the user
   */
  async requestPermission(): Promise<boolean> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    try {
      // Try to get permission by requesting location once
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 0,
        });
      });

      return true;
    } catch (error: any) {
      if (error.code === 1) {
        // Permission denied
        return false;
      }
      throw error;
    }
  },

  /**
   * Get current device location
   */
  async getCurrentLocation(): Promise<LocationCoordinates> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(new Error(error.message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // Cache for 1 minute
        }
      );
    });
  },

  /**
   * Update user's location in the database
   */
  async updateUserLocation(
    userId: string,
    location: LocationCoordinates,
    isSharingEnabled: boolean = false
  ): Promise<UserLocation> {
    const { data, error } = await api.supabase
      .from('user_locations')
      .upsert(
        {
          user_id: userId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || null,
          is_sharing_enabled: isSharingEnabled,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update location');
    }

    return data;
  },

  /**
   * Get user's location from database
   */
  async getUserLocation(userId: string): Promise<UserLocation | null> {
    const { data, error } = await api.supabase
      .from('user_locations')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user location:', error);
      return null;
    }

    return data;
  },

  /**
   * Get partner's location if they are sharing
   */
  async getPartnerLocation(partnerId: string): Promise<UserLocation | null> {
    const { data, error } = await api.supabase
      .from('user_locations')
      .select('*')
      .eq('user_id', partnerId)
      .eq('is_sharing_enabled', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching partner location:', error);
      return null;
    }

    return data;
  },

  /**
   * Enable location sharing
   */
  async enableLocationSharing(userId: string): Promise<void> {
    const { error } = await api.supabase
      .from('user_locations')
      .update({ is_sharing_enabled: true })
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to enable location sharing');
    }
  },

  /**
   * Disable location sharing
   */
  async disableLocationSharing(userId: string): Promise<void> {
    const { error } = await api.supabase
      .from('user_locations')
      .update({ is_sharing_enabled: false })
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to disable location sharing');
    }
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
    const distance = R * c; // Distance in kilometers
    return distance;
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
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m away`;
    } else if (distanceKm < 100) {
      return `${distanceKm.toFixed(1)}km away`;
    } else {
      return `${Math.round(distanceKm)}km away`;
    }
  },

  /**
   * Get location name from coordinates (reverse geocoding)
   * Note: This uses a free public API. For production, consider using Google Maps or similar
   */
  async getLocationName(latitude: number, longitude: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'LovebirdsApp/1.0',
          },
        }
      );

      if (!response.ok) {
        return 'Unknown location';
      }

      const data = await response.json();

      // Try to get a meaningful location name
      if (data.address) {
        const parts = [];
        if (data.address.amenity) parts.push(data.address.amenity);
        if (data.address.road) parts.push(data.address.road);
        if (data.address.suburb || data.address.neighbourhood) {
          parts.push(data.address.suburb || data.address.neighbourhood);
        }
        if (data.address.city || data.address.town || data.address.village) {
          parts.push(data.address.city || data.address.town || data.address.village);
        }

        if (parts.length > 0) {
          return parts.slice(0, 2).join(', '); // Return first 2 parts
        }
      }

      return data.display_name?.split(',').slice(0, 2).join(',') || 'Unknown location';
    } catch (error) {
      console.error('Error getting location name:', error);
      return 'Unknown location';
    }
  },
};
