import React, { useState, useEffect } from 'react';
import type { Place } from '../services/nearbyPlacesService';
import { googlePlacesService } from '../services/googlePlacesService';
import { MapPin, Phone, Globe, Clock, Star, Navigation } from 'lucide-react';

interface EnhancedVenueCardProps {
  place: Place;
  showMap?: boolean;
  onViewDetails?: () => void;
}

export const EnhancedVenueCard: React.FC<EnhancedVenueCardProps> = ({
  place,
  showMap = false,
  onViewDetails,
}) => {
  const [details, setDetails] = useState<Partial<Place> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch detailed info when component mounts
  useEffect(() => {
    const fetchDetails = async () => {
      if (place.id && !place.id.startsWith('mock-')) {
        setIsLoading(true);
        const placeDetails = await googlePlacesService.getPlaceDetails(place.id);
        if (placeDetails) {
          setDetails(placeDetails);
        }
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [place.id]);

  const mergedPlace = { ...place, ...details };
  const imageUrl = mergedPlace.photoUrl || mergedPlace.imageUrl || '/placeholder-venue.jpg';
  const hasRating = mergedPlace.rating !== undefined;
  const reviewCount = mergedPlace.userRatingsTotal;

  const formatDistance = (distanceKm: number) => {
    const distanceMiles = distanceKm * 0.621371;
    if (distanceMiles < 0.1) {
      return `${Math.round(distanceMiles * 5280)} ft`;
    }
    return `${distanceMiles.toFixed(1)} mi`;
  };

  const handleGetDirections = () => {
    if (mergedPlace.googleMapsUrl) {
      window.open(mergedPlace.googleMapsUrl, '_blank');
    }
  };

  const handleCall = () => {
    if (mergedPlace.phoneNumber || mergedPlace.formattedPhoneNumber) {
      const phone = (mergedPlace.phoneNumber || mergedPlace.formattedPhoneNumber)!.replace(/\D/g, '');
      window.location.href = `tel:${phone}`;
    }
  };

  const handleWebsite = () => {
    if (mergedPlace.website) {
      window.open(mergedPlace.website, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Image Section */}
      <div className="relative h-48 bg-gray-200">
        <img
          src={imageUrl}
          alt={mergedPlace.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E' + encodeURIComponent(mergedPlace.name) + '%3C/text%3E%3C/svg%3E';
          }}
        />
        {mergedPlace.isOpen !== undefined && (
          <div className="absolute top-3 right-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                mergedPlace.isOpen
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              {mergedPlace.isOpen ? 'Open Now' : 'Closed'}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {mergedPlace.name}
        </h3>

        {/* Rating */}
        {hasRating && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-900">
                {mergedPlace.rating?.toFixed(1)}
              </span>
            </div>
            {reviewCount && (
              <span className="text-gray-600 text-sm">
                ({reviewCount.toLocaleString()} Reviews)
              </span>
            )}
          </div>
        )}

        {/* Address */}
        <div className="flex items-start gap-2 mb-4 text-gray-600">
          <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{mergedPlace.address}</span>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Hours Button */}
          <button
            onClick={onViewDetails}
            className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Clock className="w-5 h-5 text-gray-700 mb-1" />
            <span className="text-xs font-medium text-gray-900">Hours</span>
            <span className="text-xs text-gray-600">
              {mergedPlace.isOpen ? 'Open Now' : 'View'}
            </span>
          </button>

          {/* Call Button */}
          <button
            onClick={handleCall}
            disabled={!mergedPlace.phoneNumber && !mergedPlace.formattedPhoneNumber}
            className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Phone className="w-5 h-5 text-gray-700 mb-1" />
            <span className="text-xs font-medium text-gray-900">Call</span>
            <span className="text-xs text-gray-600 truncate max-w-full">
              {mergedPlace.formattedPhoneNumber?.split(' ')[0] || 'N/A'}
            </span>
          </button>

          {/* Website Button */}
          <button
            onClick={handleWebsite}
            disabled={!mergedPlace.website}
            className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Globe className="w-5 h-5 text-gray-700 mb-1" />
            <span className="text-xs font-medium text-gray-900">Website</span>
            <span className="text-xs text-gray-600">Visit site</span>
          </button>
        </div>

        {/* Estimated Cost */}
        {mergedPlace.priceLevel && (
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Estimated Cost</span>
              <span className="text-lg font-semibold text-gray-900">
                {mergedPlace.priceLevel}
              </span>
            </div>
          </div>
        )}

        {/* Distance */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Distance</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDistance(mergedPlace.distance)}
            </span>
          </div>
        </div>

        {/* Get Directions Button */}
        <button
          onClick={handleGetDirections}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Get Directions
          <Navigation className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default EnhancedVenueCard;
