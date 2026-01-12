import { useState, useEffect } from 'react';
import { ChevronLeft, Zap, Check, X, RefreshCw, Calendar, DollarSign, Clock, MapPin, Navigation, Users2, MapPinned } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { dateSuggestionTemplates } from '../data/dateSuggestionTemplates';
import { useLocation } from '../hooks/useLocation';
import { nearbyPlacesService, type Place, type PlaceCategory } from '../services/nearbyPlacesService';

interface DateChallengeProps {
  onBack: () => void;
  partnerName: string;
}

type LocationPreference = 'user' | 'partner' | 'middle' | null;

export function DateChallenge({ onBack, partnerName }: DateChallengeProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedDate, setSelectedDate] = useState<typeof dateSuggestionTemplates[0] | null>(null);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [locationPreference, setLocationPreference] = useState<LocationPreference>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const { userLocation, partnerLocation, getCurrentLocation, shareWithApp } = useLocation();

  const handleChallengeStart = () => {
    // Show location preference selection
    setShowLocationSelect(true);
  };

  const handleLocationSelect = async (preference: LocationPreference) => {
    setLocationPreference(preference);
    setShowLocationSelect(false);
    setIsSpinning(true);
    setHasAccepted(false);

    // Animate for 2 seconds then show result
    setTimeout(async () => {
      // Filter to outdoor/both dates since we're looking for venue-based dates
      const goingOutDates = dateSuggestionTemplates.filter(
        date => date.environment === 'outdoor' || date.environment === 'both'
      );

      // If no outdoor dates found (shouldn't happen), fall back to all dates
      const datePool = goingOutDates.length > 0 ? goingOutDates : dateSuggestionTemplates;
      const randomDate = datePool[Math.floor(Math.random() * datePool.length)];

      setSelectedDate(randomDate);
      setIsSpinning(false);

      // Fetch nearby places based on location preference
      await fetchNearbyPlaces(preference, randomDate);
    }, 2000);
  };

  const spinForDate = () => {
    // Reset and start over
    setShowLocationSelect(true);
    setHasAccepted(false);
    setNearbyPlaces([]);
  };

  const fetchNearbyPlaces = async (preference: LocationPreference, dateIdea: typeof dateSuggestionTemplates[0]) => {
    if (!preference) return;

    // Skip venue search for purely indoor/at-home dates
    if (dateIdea.environment === 'indoor') {
      setLoadingPlaces(false);
      return;
    }

    setLoadingPlaces(true);

    try {
      let targetLocation;

      // Determine which location to use
      if (preference === 'user') {
        if (!shareWithApp) {
          // Need to get current location
          const coords = await getCurrentLocation();
          targetLocation = coords;
        } else if (userLocation) {
          targetLocation = {
            latitude: Number(userLocation.latitude),
            longitude: Number(userLocation.longitude),
          };
        }
      } else if (preference === 'partner') {
        if (partnerLocation) {
          targetLocation = {
            latitude: Number(partnerLocation.latitude),
            longitude: Number(partnerLocation.longitude),
          };
        }
      } else if (preference === 'middle') {
        // Calculate midpoint
        if (userLocation && partnerLocation) {
          targetLocation = nearbyPlacesService.findMidpoint(
            { latitude: Number(userLocation.latitude), longitude: Number(userLocation.longitude) },
            { latitude: Number(partnerLocation.latitude), longitude: Number(partnerLocation.longitude) }
          );
        } else if (!shareWithApp) {
          // Get user's current location and partner's location
          const coords = await getCurrentLocation();
          if (partnerLocation) {
            targetLocation = nearbyPlacesService.findMidpoint(
              coords,
              { latitude: Number(partnerLocation.latitude), longitude: Number(partnerLocation.longitude) }
            );
          }
        }
      }

      if (!targetLocation) {
        console.error('Could not determine target location');
        setLoadingPlaces(false);
        return;
      }

      // Determine appropriate place categories based on date type
      const categories = getDateCategories(dateIdea);

      // Fetch places for each category
      const allPlaces: Place[] = [];
      for (const category of categories) {
        const places = await nearbyPlacesService.findNearbyPlaces(targetLocation, 10, category, 3);
        allPlaces.push(...places);
      }

      // Remove duplicates and limit to 5 places
      const uniquePlaces = Array.from(new Map(allPlaces.map(place => [place.id, place])).values()).slice(0, 5);
      setNearbyPlaces(uniquePlaces);
    } catch (error) {
      console.error('Error fetching nearby places:', error);
    } finally {
      setLoadingPlaces(false);
    }
  };

  const getDateCategories = (dateIdea: typeof dateSuggestionTemplates[0]): PlaceCategory[] => {
    // Map date type and style to place categories
    const dateType = dateIdea.dateType?.toLowerCase() || '';
    const styles = dateIdea.dateStyle?.map(s => s.toLowerCase()) || [];
    const title = dateIdea.title?.toLowerCase() || '';
    const desc = dateIdea.description?.toLowerCase() || '';

    const categories: PlaceCategory[] = [];

    // Check date type first
    if (dateType === 'dinner' || dateType === 'cooking') {
      categories.push('restaurant', 'cafe');
    }
    if (dateType === 'picnic') {
      categories.push('park');
    }
    if (dateType === 'museum') {
      categories.push('museum');
    }
    if (dateType === 'movie_concert') {
      categories.push('theater', 'cinema');
    }
    if (dateType === 'hiking') {
      categories.push('park');
    }

    // Check date styles
    if (styles.includes('foodie')) {
      categories.push('restaurant', 'cafe');
    }
    if (styles.includes('cultural')) {
      categories.push('museum', 'theater');
    }
    if (styles.includes('adventurous')) {
      categories.push('park', 'activity');
    }

    // Check title and description for keywords
    if (title.includes('restaurant') || desc.includes('restaurant') || desc.includes('dinner')) {
      categories.push('restaurant');
    }
    if (title.includes('cafe') || title.includes('coffee') || desc.includes('coffee')) {
      categories.push('cafe');
    }
    if (title.includes('park') || title.includes('outdoor') || desc.includes('park')) {
      categories.push('park');
    }
    if (title.includes('museum') || title.includes('gallery') || desc.includes('museum')) {
      categories.push('museum');
    }
    if (title.includes('bar') || title.includes('pub') || desc.includes('bar')) {
      categories.push('bar');
    }
    if (title.includes('bowling') || title.includes('arcade') || desc.includes('activity')) {
      categories.push('activity');
    }
    if (title.includes('movie') || title.includes('theater') || title.includes('cinema')) {
      categories.push('theater', 'cinema');
    }

    // Remove duplicates
    const uniqueCategories = Array.from(new Set(categories));

    // If no specific categories matched, return a mix of popular date spots
    if (uniqueCategories.length === 0) {
      return ['restaurant', 'cafe', 'park', 'museum'];
    }

    return uniqueCategories;
  };

  const acceptChallenge = () => {
    setHasAccepted(true);
  };

  const getBudgetSymbol = (budget: string) => {
    switch (budget) {
      case 'free':
        return 'Free';
      case '$':
        return '$';
      case '$$':
        return '$$';
      case '$$$':
        return '$$$';
      default:
        return budget;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-yellow-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl">Challenge Us!</h1>
              <p className="text-white/90 text-sm">
                Ready for a spontaneous date adventure?
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {!selectedDate && !isSpinning && !showLocationSelect && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 border-0 shadow-xl text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-2xl font-bold mb-3">Are You Ready?</h2>
              <p className="text-gray-600 mb-6">
                We'll randomly pick a date for you and {partnerName}.
                Once you see it, <strong>you have to do it</strong>! No backing out! 😄
              </p>

              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 text-left">
                <p className="text-sm text-orange-900">
                  <strong>The Rules:</strong>
                </p>
                <ul className="text-sm text-orange-800 mt-2 space-y-1 list-disc list-inside">
                  <li>No complaining about the date picked!</li>
                  <li>You must do it within the next week</li>
                  <li>Make it fun no matter what!</li>
                  <li>Take a photo together as proof 📸</li>
                </ul>
              </div>

              <Button
                onClick={handleChallengeStart}
                size="lg"
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white h-14 text-lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Challenge Us!
              </Button>
            </Card>
          </motion.div>
        )}

        {showLocationSelect && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 border-0 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Where should we look for dates?</h2>
                <p className="text-gray-600">
                  We'll find nearby venues based on your choice
                </p>
              </div>

              <div className="space-y-3">
                <Card
                  onClick={() => handleLocationSelect('user')}
                  className="p-4 border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Navigation className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold mb-1">Close to My Location</h3>
                      <p className="text-sm text-gray-600">
                        Find dates near where you are
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  onClick={() => handleLocationSelect('partner')}
                  className="p-4 border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users2 className="w-6 h-6 text-pink-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold mb-1">Close to {partnerName}'s Location</h3>
                      <p className="text-sm text-gray-600">
                        Find dates near where {partnerName} is
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  onClick={() => handleLocationSelect('middle')}
                  className="p-4 border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MapPinned className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold mb-1">Somewhere in the Middle</h3>
                      <p className="text-sm text-gray-600">
                        Meet halfway between both locations
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <Button
                onClick={() => setShowLocationSelect(false)}
                variant="outline"
                className="w-full mt-6"
              >
                Cancel
              </Button>
            </Card>
          </motion.div>
        )}

        {isSpinning && (
          <Card className="p-12 border-0 shadow-xl text-center">
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: "linear"
              }}
              className="w-24 h-24 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Zap className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">Picking Your Date...</h2>
            <p className="text-gray-600">Get ready for an adventure!</p>
          </Card>
        )}

        <AnimatePresence>
          {selectedDate && !isSpinning && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <Card className="p-6 border-0 shadow-2xl overflow-hidden relative">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-yellow-100 opacity-30" />

                {/* Content */}
                <div className="relative z-10">
                  {!hasAccepted ? (
                    <>
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Zap className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Your Challenge!</h2>
                      </div>

                      <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
                        <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">
                          {selectedDate.title}
                        </h3>

                        <p className="text-gray-700 text-center mb-6 leading-relaxed">
                          {selectedDate.description.replace(/\{partner_name\}/g, partnerName)}
                        </p>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <Clock className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                            <p className="text-xs text-gray-600">Duration</p>
                            <p className="font-semibold text-sm">{selectedDate.timeRequired}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <DollarSign className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                            <p className="text-xs text-gray-600">Budget</p>
                            <p className="font-semibold text-sm">{getBudgetSymbol(selectedDate.budget)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <MapPin className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                            <p className="text-xs text-gray-600">Setting</p>
                            <p className="font-semibold text-sm capitalize">{selectedDate.environment}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <Zap className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                            <p className="text-xs text-gray-600">Effort</p>
                            <p className="font-semibold text-sm">{selectedDate.effort}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-center flex-wrap">
                          {selectedDate.dateStyle.map((style) => (
                            <span key={style} className="text-xs px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
                              {style}
                            </span>
                          ))}
                        </div>
                      </div>

                      {loadingPlaces && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                          <p className="text-sm text-blue-900 text-center">
                            🔍 Finding nearby venues for your date...
                          </p>
                        </div>
                      )}

                      {nearbyPlaces.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <MapPin className="w-5 h-5 text-purple-600" />
                            <h4 className="font-semibold text-gray-800">Nearby Venues</h4>
                          </div>
                          <div className="space-y-2">
                            {nearbyPlaces.map((place) => (
                              <div key={place.id} className="bg-white rounded-lg p-3 text-left">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-sm text-gray-800">{place.name}</h5>
                                    <p className="text-xs text-gray-600 mt-1">{place.address}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                      <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {nearbyPlacesService.formatDistance(place.distance)}
                                      </span>
                                      {place.rating && (
                                        <span className="text-xs text-yellow-600">⭐ {place.rating}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
                        <p className="text-sm text-orange-900 font-semibold mb-2">
                          ⚡ Remember: Once you accept, there's no backing out!
                        </p>
                        <p className="text-xs text-orange-800">
                          You have to complete this date within the next week and share a photo!
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          onClick={spinForDate}
                          variant="outline"
                          className="flex-1 h-12"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Try Again
                        </Button>
                        <Button
                          onClick={acceptChallenge}
                          className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Accept Challenge!
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center mb-6">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.5, type: "spring" }}
                          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                          <Check className="w-10 h-10 text-white" />
                        </motion.div>
                        <h2 className="text-3xl font-bold mb-2">Challenge Accepted! 🎉</h2>
                        <p className="text-gray-600">
                          You're committed to: <strong>{selectedDate.title}</strong>
                        </p>
                      </div>

                      <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
                        <h3 className="font-bold mb-3">Your Mission:</h3>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                              1
                            </div>
                            <p className="text-sm text-gray-700">
                              Complete this date with {partnerName} within the next 7 days
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                              2
                            </div>
                            <p className="text-sm text-gray-700">
                              Take a photo together during the date
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                              3
                            </div>
                            <p className="text-sm text-gray-700">
                              Have fun and make it memorable - no matter what!
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Button
                          onClick={onBack}
                          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white h-12"
                        >
                          Done - Let's Do This!
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedDate(null);
                            setHasAccepted(false);
                          }}
                          variant="outline"
                          className="w-full h-12"
                        >
                          Actually... Try Another Challenge
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
