import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationService, type UserLocation, type LocationCoordinates } from '../services/locationService';
import { useAuth } from './useAuth';
import { useRelationship } from './useRelationship';

export function useLocation() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const queryClient = useQueryClient();
  const [isSharing, setIsSharing] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [currentCoordinates, setCurrentCoordinates] = useState<LocationCoordinates | null>(null);

  // Get partner's user ID
  const partnerId = relationship && user ? (
    relationship.partner_a_id === user.id ? relationship.partner_b_id : relationship.partner_a_id
  ) : null;

  // Fetch user's location from database
  const { data: userLocation, isLoading: isLoadingUserLocation } = useQuery({
    queryKey: ['user-location', user?.id],
    queryFn: () => locationService.getUserLocation(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch partner's location from database
  const { data: partnerLocation, isLoading: isLoadingPartnerLocation } = useQuery({
    queryKey: ['partner-location', partnerId],
    queryFn: () => locationService.getPartnerLocation(partnerId!),
    enabled: !!partnerId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update sharing state when user location is loaded
  useEffect(() => {
    if (userLocation) {
      setIsSharing(userLocation.is_sharing_enabled);
    }
  }, [userLocation]);

  // Request location permission
  const requestPermission = useCallback(async () => {
    try {
      const granted = await locationService.requestPermission();
      setLocationPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
      return false;
    }
  }, []);

  // Get current device location
  const getCurrentLocation = useCallback(async () => {
    try {
      const coords = await locationService.getCurrentLocation();
      setCurrentCoordinates(coords);
      return coords;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }, []);

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ coordinates, sharing }: { coordinates: LocationCoordinates; sharing: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return locationService.updateUserLocation(user.id, coordinates, sharing);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-location'] });
    },
  });

  // Update user's location in database
  const updateLocation = useCallback(
    async (coordinates?: LocationCoordinates, sharing?: boolean) => {
      try {
        const coords = coordinates || currentCoordinates || await getCurrentLocation();
        const sharingEnabled = sharing !== undefined ? sharing : isSharing;

        await updateLocationMutation.mutateAsync({ coordinates: coords, sharing: sharingEnabled });
        return true;
      } catch (error) {
        console.error('Error updating location:', error);
        return false;
      }
    },
    [currentCoordinates, isSharing, getCurrentLocation, updateLocationMutation]
  );

  // Enable location sharing
  const enableSharing = useCallback(async () => {
    if (!user?.id) return false;

    try {
      // Get current location first
      const coords = await getCurrentLocation();

      // Update location with sharing enabled
      await updateLocation(coords, true);
      await locationService.enableLocationSharing(user.id);

      setIsSharing(true);
      queryClient.invalidateQueries({ queryKey: ['user-location'] });
      return true;
    } catch (error) {
      console.error('Error enabling location sharing:', error);
      return false;
    }
  }, [user, getCurrentLocation, updateLocation, queryClient]);

  // Disable location sharing
  const disableSharing = useCallback(async () => {
    if (!user?.id) return false;

    try {
      await locationService.disableLocationSharing(user.id);
      setIsSharing(false);
      queryClient.invalidateQueries({ queryKey: ['user-location'] });
      return true;
    } catch (error) {
      console.error('Error disabling location sharing:', error);
      return false;
    }
  }, [user, queryClient]);

  // Calculate distance between user and partner
  const distanceToPartner = useCallback(() => {
    if (!userLocation || !partnerLocation) return null;

    const distance = locationService.calculateDistance(
      Number(userLocation.latitude),
      Number(userLocation.longitude),
      Number(partnerLocation.latitude),
      Number(partnerLocation.longitude)
    );

    return {
      kilometers: distance,
      formatted: locationService.formatDistance(distance),
    };
  }, [userLocation, partnerLocation]);

  // Get location name from coordinates
  const getLocationName = useCallback(async (latitude: number, longitude: number) => {
    return locationService.getLocationName(latitude, longitude);
  }, []);

  // Start location tracking (update every 5 minutes)
  const startTracking = useCallback(() => {
    if (!user?.id) return null;

    const interval = setInterval(async () => {
      if (isSharing) {
        try {
          await getCurrentLocation();
          await updateLocation();
        } catch (error) {
          console.error('Error updating location in background:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, isSharing, getCurrentLocation, updateLocation]);

  return {
    // Location data
    userLocation,
    partnerLocation,
    currentCoordinates,

    // Sharing state
    isSharing,
    locationPermission,

    // Loading states
    isLoadingUserLocation,
    isLoadingPartnerLocation,
    isUpdating: updateLocationMutation.isPending,

    // Actions
    requestPermission,
    getCurrentLocation,
    updateLocation,
    enableSharing,
    disableSharing,
    distanceToPartner,
    getLocationName,
    startTracking,
  };
}
