import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { nearbyPlacesService, type Place, type PlaceCategory } from '../services/nearbyPlacesService';
import { useLocation } from './useLocation';

export function useNearbyPlaces() {
  const { userLocation, partnerLocation, shareWithApp } = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory>('all');
  const [radiusMiles, setRadiusMiles] = useState(20);

  // Get user's coordinates
  const userCoords = userLocation ? {
    latitude: Number(userLocation.latitude),
    longitude: Number(userLocation.longitude),
  } : null;

  // Get partner's coordinates
  const partnerCoords = partnerLocation ? {
    latitude: Number(partnerLocation.latitude),
    longitude: Number(partnerLocation.longitude),
  } : null;

  // Fetch places near user
  const {
    data: nearbyPlaces,
    isLoading: isLoadingPlaces,
    error: placesError,
    refetch: refetchPlaces,
  } = useQuery({
    queryKey: ['nearby-places', userCoords, selectedCategory, radiusMiles],
    queryFn: () =>
      nearbyPlacesService.findNearbyPlaces(userCoords!, radiusMiles, selectedCategory),
    enabled: !!userCoords && shareWithApp, // Only fetch if location sharing with app is enabled
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch romantic date suggestions
  const {
    data: dateSuggestions,
    isLoading: isLoadingSuggestions,
    refetch: refetchSuggestions,
  } = useQuery({
    queryKey: ['date-suggestions', userCoords, radiusMiles],
    queryFn: () =>
      nearbyPlacesService.getRomanticDateSuggestions(userCoords!, radiusMiles),
    enabled: !!userCoords && shareWithApp,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Fetch places between user and partner (meetup spots)
  const {
    data: midpointPlaces,
    isLoading: isLoadingMidpoint,
    refetch: refetchMidpoint,
  } = useQuery({
    queryKey: ['midpoint-places', userCoords, partnerCoords, selectedCategory],
    queryFn: () =>
      nearbyPlacesService.findPlacesBetween(userCoords!, partnerCoords!, selectedCategory, 10),
    enabled: !!userCoords && !!partnerCoords && shareWithApp,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate midpoint between user and partner
  const getMidpoint = useCallback(() => {
    if (!userCoords || !partnerCoords) return null;
    return nearbyPlacesService.findMidpoint(userCoords, partnerCoords);
  }, [userCoords, partnerCoords]);

  // Format distance for display
  const formatDistance = useCallback((distanceKm: number) => {
    return nearbyPlacesService.formatDistance(distanceKm);
  }, []);

  // Get available categories
  const categories = nearbyPlacesService.getDateCategories();

  return {
    // Data
    nearbyPlaces: nearbyPlaces || [],
    dateSuggestions: dateSuggestions || [],
    midpointPlaces: midpointPlaces || [],
    categories,

    // State
    selectedCategory,
    radiusMiles,
    hasLocation: !!userCoords,
    hasPartnerLocation: !!partnerCoords,
    isLocationSharingEnabled: shareWithApp,

    // Loading states
    isLoadingPlaces,
    isLoadingSuggestions,
    isLoadingMidpoint,
    isLoading: isLoadingPlaces || isLoadingSuggestions || isLoadingMidpoint,

    // Error
    error: placesError,

    // Actions
    setSelectedCategory,
    setRadiusMiles,
    refetchPlaces,
    refetchSuggestions,
    refetchMidpoint,
    getMidpoint,
    formatDistance,
  };
}
