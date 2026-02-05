import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationService, type UserLocation, type LocationCoordinates } from '../services/locationService';
import { useAuth } from './useAuth';
import { useRelationship } from './useRelationship';

export function useLocation() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const queryClient = useQueryClient();
  const [shareWithApp, setShareWithApp] = useState(false);
  const [shareWithPartner, setShareWithPartner] = useState(false);
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
      setShareWithApp(userLocation.share_with_app || false);
      setShareWithPartner(userLocation.share_with_partner || false);
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
    mutationFn: async ({ coordinates, app, partner }: { coordinates: LocationCoordinates; app: boolean; partner: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return locationService.updateUserLocation(user.id, coordinates, app, partner);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-location'] });
    },
  });

  // Update user's location in database
  const updateLocation = useCallback(
    async (coordinates?: LocationCoordinates) => {
      try {
        const coords = coordinates || currentCoordinates || await getCurrentLocation();

        await updateLocationMutation.mutateAsync({
          coordinates: coords,
          app: shareWithApp,
          partner: shareWithPartner,
        });
        return true;
      } catch (error) {
        console.error('Error updating location:', error);
        return false;
      }
    },
    [currentCoordinates, shareWithApp, shareWithPartner, getCurrentLocation, updateLocationMutation]
  );

  // Update location sharing settings
  const updateSharingSettings = useCallback(async (app: boolean, partner: boolean) => {
    if (!user?.id) return false;

    try {
      // Get current location if enabling any sharing
      if (app || partner) {
        const coords = await getCurrentLocation();
        await updateLocationMutation.mutateAsync({
          coordinates: coords,
          app,
          partner,
        });
      }

      await locationService.updateLocationSharing(user.id, app, partner);

      setShareWithApp(app);
      setShareWithPartner(partner);
      queryClient.invalidateQueries({ queryKey: ['user-location'] });
      return true;
    } catch (error) {
      console.error('Error updating location sharing:', error);
      return false;
    }
  }, [user, getCurrentLocation, updateLocationMutation, queryClient]);

  // Enable sharing with app only
  const enableAppSharing = useCallback(async () => {
    return updateSharingSettings(true, shareWithPartner);
  }, [updateSharingSettings, shareWithPartner]);

  // Enable sharing with partner
  const enablePartnerSharing = useCallback(async () => {
    return updateSharingSettings(shareWithApp, true);
  }, [updateSharingSettings, shareWithApp]);

  // Disable all location sharing
  const disableAllSharing = useCallback(async () => {
    if (!user?.id) return false;

    try {
      await locationService.disableAllSharing(user.id);
      setShareWithApp(false);
      setShareWithPartner(false);
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
      if (shareWithApp || shareWithPartner) {
        try {
          await getCurrentLocation();
          await updateLocation();
        } catch (error) {
          console.error('Error updating location in background:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, shareWithApp, shareWithPartner, getCurrentLocation, updateLocation]);

  return {
    // Location data
    userLocation,
    partnerLocation,
    currentCoordinates,

    // Sharing state
    shareWithApp,
    shareWithPartner,
    isSharing: shareWithApp || shareWithPartner, // For backward compatibility
    locationPermission,

    // Loading states
    isLoadingUserLocation,
    isLoadingPartnerLocation,
    isUpdating: updateLocationMutation.isPending,

    // Actions
    requestPermission,
    getCurrentLocation,
    updateLocation,
    updateSharingSettings,
    enableAppSharing,
    enablePartnerSharing,
    disableAllSharing,
    distanceToPartner,
    getLocationName,
    startTracking,
  };
}
