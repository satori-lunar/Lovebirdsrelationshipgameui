import React from 'react';
import { MapPin, Navigation, Heart, Star, Clock } from 'lucide-react';
import { useNearbyPlaces } from '../hooks/useNearbyPlaces';
import type { Place } from '../services/nearbyPlacesService';
import { EnhancedVenueCard } from './EnhancedVenueCard';

interface NearbyPlacesProps {
  onBack: () => void;
}

export function NearbyPlaces({ onBack }: NearbyPlacesProps) {
  const {
    nearbyPlaces,
    dateSuggestions,
    categories,
    selectedCategory,
    radiusMiles,
    hasLocation,
    isLocationSharingEnabled,
    isLoadingPlaces,
    setSelectedCategory,
    setRadiusMiles,
    formatDistance,
  } = useNearbyPlaces();

  if (!hasLocation || !isLocationSharingEnabled) {
    return (
      <div className="bg-[#F5F0F6] flex flex-col h-screen w-full max-w-[430px] mx-auto p-5">
        <button onClick={onBack} className="mb-4 text-[#2c2c2c]">
          ← Back
        </button>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 bg-white/70 backdrop-blur-lg rounded-3xl shadow-md border border-white/60">
            <MapPin className="w-16 h-16 text-[#06B6D4] mx-auto mb-4" />
            <h2 className="font-['Nunito_Sans',sans-serif] text-[20px] text-[#2c2c2c] mb-2 font-semibold">
              Location Required
            </h2>
            <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-[#6d6d6d] mb-4">
              Enable location sharing to see nearby places and date spots around you.
            </p>
            <button
              onClick={onBack}
              className="bg-gradient-to-br from-[#06B6D4] to-[#3B82F6] text-white px-6 py-3 rounded-xl font-['Nunito_Sans',sans-serif]"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F0F6] flex flex-col h-screen w-full max-w-[430px] mx-auto">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl p-5 shadow-md">
        <button onClick={onBack} className="mb-4 text-[#2c2c2c]">
          ← Back
        </button>
        <h1 className="font-['Nunito_Sans',sans-serif] text-[24px] text-[#2c2c2c] font-bold">
          Nearby Places
        </h1>
        <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-[#6d6d6d]">
          Discover date spots within {radiusMiles} miles
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Radius Selector */}
        <div className="mb-5">
          <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-[#2c2c2c] mb-2 font-semibold">
            Search Radius
          </p>
          <div className="flex gap-2">
            {[5, 10, 20, 50].map((miles) => (
              <button
                key={miles}
                onClick={() => setRadiusMiles(miles)}
                className={`px-4 py-2 rounded-xl font-['Nunito_Sans',sans-serif] text-[14px] transition-all ${
                  radiusMiles === miles
                    ? 'bg-[#06B6D4] text-white'
                    : 'bg-white/70 text-[#6d6d6d] border border-gray-200'
                }`}
              >
                {miles} mi
              </button>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-5">
          <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-[#2c2c2c] mb-2 font-semibold">
            Category
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-['Nunito_Sans',sans-serif] text-[14px] whitespace-nowrap transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-gradient-to-br from-[#FF2D55] to-[#FF6B9D] text-white'
                    : 'bg-white/70 text-[#6d6d6d] border border-gray-200'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoadingPlaces && (
          <div className="flex justify-center py-8">
            <div className="w-12 h-12 border-4 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Places List */}
        {!isLoadingPlaces && nearbyPlaces.length > 0 && (
          <div className="space-y-5">
            {nearbyPlaces.map((place) => (
              <EnhancedVenueCard
                key={place.id}
                place={place}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoadingPlaces && nearbyPlaces.length === 0 && (
          <div className="text-center py-8">
            <MapPin className="w-16 h-16 text-[#6d6d6d] mx-auto mb-4 opacity-50" />
            <p className="font-['Nunito_Sans',sans-serif] text-[16px] text-[#6d6d6d]">
              No places found nearby. Try increasing the search radius or changing the category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface PlaceCardProps {
  place: Place;
  formatDistance: (distanceKm: number) => string;
}

function PlaceCard({ place, formatDistance }: PlaceCardProps) {
  const categoryEmoji = {
    restaurant: '🍽️',
    cafe: '☕',
    bar: '🍺',
    park: '🌳',
    museum: '🎨',
    theatre: '🎭',
    cinema: '🎬',
  }[place.category] || '📍';

  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-4 shadow-md border border-white/60">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#06B6D4] to-[#3B82F6] flex items-center justify-center text-2xl flex-shrink-0">
          {categoryEmoji}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-['Nunito_Sans',sans-serif] text-[16px] text-[#2c2c2c] font-semibold mb-1">
            {place.name}
          </h3>

          {place.description && (
            <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-[#6d6d6d] mb-2">
              {place.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-[12px] text-[#6d6d6d]">
            {/* Distance */}
            <div className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              <span>{formatDistance(place.distance)}</span>
            </div>

            {/* Rating */}
            {place.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                <span>{place.rating.toFixed(1)}</span>
              </div>
            )}

            {/* Price Level */}
            {place.priceLevel && (
              <div className="px-2 py-0.5 bg-[#8B5CF6]/10 rounded-md text-[#8B5CF6]">
                {place.priceLevel}
              </div>
            )}

            {/* Open Status */}
            {place.isOpen !== undefined && (
              <div className={`flex items-center gap-1 ${place.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                <Clock className="w-3 h-3" />
                <span>{place.isOpen ? 'Open' : 'Closed'}</span>
              </div>
            )}
          </div>

          {/* Address */}
          {place.address && place.address !== 'Address not available' && (
            <p className="font-['Nunito_Sans',sans-serif] text-[11px] text-[#9CA3AF] mt-2">
              {place.address}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
