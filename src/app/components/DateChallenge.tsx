import { useState, useEffect } from 'react';
import { ChevronLeft, Zap, Check, X, RefreshCw, Calendar, DollarSign, Clock, MapPin, Navigation, Users2, MapPinned, Home, Palmtree, Heart, Bookmark } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { dateSuggestionTemplates, type BudgetLevel } from '../data/dateSuggestionTemplates';
import { useLocation } from '../hooks/useLocation';
import { googlePlacesService as placesService } from '../services/googlePlacesService';
import type { Place, PlaceCategory } from '../services/nearbyPlacesService';
import { usePartnerInsights } from '../hooks/usePartnerInsights';
import { useRelationship } from '../hooks/useRelationship';
import { useAuth } from '../hooks/useAuth';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { dateMatchingService } from '../services/dateMatchingService';
import { onboardingService } from '../services/onboardingService';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DateChallengeProps {
  onBack: () => void;
  partnerName: string;
}

type LocationPreference = 'user' | 'partner' | 'middle' | null;
type DateEnvironment = 'at_home' | 'going_out' | null;

export function DateChallenge({ onBack, partnerName }: DateChallengeProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedDate, setSelectedDate] = useState<typeof dateSuggestionTemplates[0] | null>(null);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [showEnvironmentSelect, setShowEnvironmentSelect] = useState(false);
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [dateEnvironment, setDateEnvironment] = useState<DateEnvironment>(null);
  const [locationPreference, setLocationPreference] = useState<LocationPreference>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [venueFetchError, setVenueFetchError] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Place | null>(null);
  const [goingOutRetryCount, setGoingOutRetryCount] = useState(0);

  const { userLocation, partnerLocation, getCurrentLocation, shareWithApp } = useLocation();
  const { relationship } = useRelationship();
  const { saveChallengeInsight: saveInsight, isSaving } = usePartnerInsights();
  const { user } = useAuth();
  const {
    partnerOnboarding,
    partnerLoveLanguages,
    partnerPreferences,
    partnerWantsNeeds,
  } = usePartnerOnboarding();

  // Fetch user's onboarding data
  const { data: userOnboarding } = useQuery({
    queryKey: ['userOnboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Get user's love language from onboarding data
  const userLoveLanguage = userOnboarding?.love_language_primary || user?.onboarding?.love_language_primary;

  // Extract partner preferences for matching
  const partnerInterests = partnerWantsNeeds?.favorite_activities || [];
  const partnerFavoriteFoods = partnerOnboarding?.favorite_activities || []; // Legacy field
  const partnerFavoriteCuisines = partnerWantsNeeds?.favorite_cuisines || [];
  const partnerDateStyles = partnerWantsNeeds?.date_style ? [partnerWantsNeeds.date_style] : [];
  const partnerLoveLanguagePrimary = partnerLoveLanguages?.primary;
  const partnerLoveLanguageSecondary = partnerLoveLanguages?.secondary;

  const MAX_GOING_OUT_RETRIES = 2;

  const handleChallengeStart = () => {
    // Show environment selection first
    setShowEnvironmentSelect(true);
    // Reset retry count when starting fresh
    setGoingOutRetryCount(0);
  };

  const handleEnvironmentSelect = (environment: DateEnvironment) => {
    setDateEnvironment(environment);
    setShowEnvironmentSelect(false);
    // Reset retry count when selecting environment
    setGoingOutRetryCount(0);

    if (environment === 'at_home') {
      // Skip location selection and go straight to spinning
      spinForDateWithEnvironment(environment, null);
    } else {
      // Show location preference for going out
      setShowLocationSelect(true);
    }
  };

  const handleLocationSelect = async (preference: LocationPreference) => {
    setLocationPreference(preference);
    setShowLocationSelect(false);
    spinForDateWithEnvironment('going_out', preference);
  };

  const spinForDateWithEnvironment = async (environment: DateEnvironment, preference: LocationPreference) => {
    setIsSpinning(true);
    setHasAccepted(false);
    setLoadingPlaces(true);

    // Animate for 2 seconds then show result
    setTimeout(async () => {
      if (environment === 'at_home') {
        // Filter to indoor dates only
        const datePool = dateSuggestionTemplates.filter(
          date => date.environment === 'indoor'
        );
        const randomDate = datePool.length > 0
          ? datePool[Math.floor(Math.random() * datePool.length)]
          : dateSuggestionTemplates[Math.floor(Math.random() * dateSuggestionTemplates.length)];

        setSelectedDate(randomDate);
        setIsSpinning(false);
        setLoadingPlaces(false);
      } else {
        // For going out: FIRST fetch venues, THEN pick date based on what's available
        if (preference) {
          await fetchVenuesFirstThenPickDate(preference);
        } else {
          // Fallback if no preference somehow
          const datePool = dateSuggestionTemplates.filter(
            date => date.environment === 'outdoor' || date.environment === 'both'
          );
          const randomDate = datePool.length > 0
            ? datePool[Math.floor(Math.random() * datePool.length)]
            : dateSuggestionTemplates[Math.floor(Math.random() * dateSuggestionTemplates.length)];

          setSelectedDate(randomDate);
          setIsSpinning(false);
          setLoadingPlaces(false);
        }
      }
    }, 2000);
  };

  const fetchVenuesFirstThenPickDate = async (preference: LocationPreference) => {
    try {
      // Step 1: Get target location
      let targetLocation;

      if (preference === 'user') {
        if (!shareWithApp) {
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
        if (userLocation && partnerLocation) {
          targetLocation = placesService.findMidpoint(
            { latitude: Number(userLocation.latitude), longitude: Number(userLocation.longitude) },
            { latitude: Number(partnerLocation.latitude), longitude: Number(partnerLocation.longitude) }
          );
        } else if (!shareWithApp) {
          const coords = await getCurrentLocation();
          if (partnerLocation) {
            targetLocation = placesService.findMidpoint(
              coords,
              { latitude: Number(partnerLocation.latitude), longitude: Number(partnerLocation.longitude) }
            );
          }
        }
      }

      if (!targetLocation) {
        console.error('Could not determine target location');
        // Fallback to random outdoor date without venues
        const datePool = dateSuggestionTemplates.filter(
          date => date.environment === 'outdoor' || date.environment === 'both'
        );
        const randomDate = datePool[Math.floor(Math.random() * datePool.length)];
        setSelectedDate(randomDate);
        setIsSpinning(false);
        setLoadingPlaces(false);
        return;
      }

      // Step 2: Fetch a diverse mix of nearby venues WITH DETAILED INFORMATION
      console.log('🔍 Starting venue search for location:', targetLocation);
      const allCategories: PlaceCategory[] = ['restaurant', 'cafe', 'bar', 'park', 'museum', 'theater', 'activity'];
      const allPlaces: Place[] = [];

      // Fetch places for each category
      for (const category of allCategories) {
        const places = await placesService.findNearbyPlaces(targetLocation, 15, category, 5);
        allPlaces.push(...places);
      }

      // Remove duplicates and sort by distance
      const uniquePlaces = Array.from(new Map(allPlaces.map(place => [place.id, place])).values())
        .sort((a, b) => a.distance - b.distance);

      console.log(`📍 Total unique venues found: ${uniquePlaces.length}`);

      // If no venues found at all, set error state
      if (uniquePlaces.length === 0) {
        console.warn('⚠️ No venues found - API may be down or location has no venues');
        setVenueFetchError(true);
        // Still show a date, just without venues
        const datePool = dateSuggestionTemplates.filter(
          date => date.environment === 'outdoor' || date.environment === 'both'
        );
        const randomDate = datePool[Math.floor(Math.random() * datePool.length)];
        setSelectedDate(randomDate);
        setIsSpinning(false);
        setLoadingPlaces(false);
        return;
      }

      setVenueFetchError(false);

      // Step 3: Analyze ACTUAL venue types by examining names and descriptions
      // This helps us match more accurately (e.g., "wine bar" should match wine tasting, not cafe)
      const analyzeVenueTypes = (place: Place): {
        primaryCategory: PlaceCategory;
        isWineBar: boolean;
        isBrewery: boolean;
        isCocktailBar: boolean;
        isRestaurant: boolean;
        isCafe: boolean;
        isPark: boolean;
        priceLevel: BudgetLevel | null;
      } => {
        const name = (place.name || '').toLowerCase();
        const desc = (place.description || '').toLowerCase();
        const category = place.category as PlaceCategory;

        // Check for specific venue types in name/description - PRIORITY ORDER MATTERS
        // Wine bars/wineries - MUST check before generic bars or restaurants
        // Check name and description first (most reliable)
        const hasWineInName = name.includes('wine') || name.includes('winery') || name.includes('vineyard');
        const hasWineInDesc = desc.includes('wine') || desc.includes('winery') || desc.includes('vineyard');
        const isWineBar = hasWineInName || hasWineInDesc || 
                         (category === 'bar' && (hasWineInName || hasWineInDesc));
        
        const isBrewery = name.includes('brewery') || name.includes('brew') || name.includes('beer') ||
                         desc.includes('brewery') || desc.includes('brew') || desc.includes('beer');
        
        const isCocktailBar = name.includes('cocktail') || desc.includes('cocktail');
        
        const isRestaurant = (category === 'restaurant') || 
                            name.includes('restaurant') || name.includes('dining') ||
                            name.includes('bistro') || name.includes('eatery') ||
                            name.includes('steakhouse') || name.includes('trattoria');
        
        // Cafes - must be explicit cafe/coffee, NOT wine bars or restaurants
        // Check for both English and Spanish keywords - "café" means coffee shop in Spanish
        // "Olor a café" means "smell of coffee" - this is a coffee shop name
        const hasCafeInName = name.includes('cafe') || name.includes('coffee') || 
                             name.includes('café') || name.includes('olor a café') ||
                             name.includes('cafeteria');
        const hasCafeInDesc = desc.includes('cafe') || desc.includes('coffee') || 
                             desc.includes('café') || desc.includes('olor a café') ||
                             desc.includes('cafeteria');
        const isCafe = !isWineBar && !isBrewery && !isCocktailBar && 
                      ((category === 'cafe') || 
                       (hasCafeInName && !hasWineInName && !name.includes('bar') && !name.includes('restaurant')) ||
                       (hasCafeInDesc && !hasWineInDesc && !desc.includes('bar') && !desc.includes('restaurant')));
        
        const isPark = category === 'park' || 
                      name.includes('park') || name.includes('garden') ||
                      desc.includes('park');

        // Map price level
        let priceLevel: BudgetLevel | null = null;
        if (place.priceLevel) {
          if (place.priceLevel === '$' || place.priceLevel === 'Free') {
            priceLevel = '$';
          } else if (place.priceLevel === '$$') {
            priceLevel = '$$';
          } else if (place.priceLevel === '$$$' || place.priceLevel === '$$$$') {
            priceLevel = '$$$';
          }
        }

        // Determine primary category based on analysis - PRIORITY ORDER MATTERS
        let primaryCategory: PlaceCategory = category;
        
        // Wine bars/wineries get bar category (highest priority)
        if (isWineBar || isBrewery || isCocktailBar) {
          primaryCategory = 'bar';
        } 
        // Restaurants only if not a bar type
        else if (isRestaurant && category !== 'bar') {
          primaryCategory = 'restaurant';
        } 
        // Cafes only if not a bar or restaurant
        else if (isCafe && !isWineBar && !isBrewery && !isCocktailBar && !isRestaurant) {
          primaryCategory = 'cafe';
        } 
        // Parks
        else if (isPark) {
          primaryCategory = 'park';
        }

        return {
          primaryCategory,
          isWineBar,
          isBrewery,
          isCocktailBar,
          isRestaurant,
          isCafe,
          isPark,
          priceLevel,
        };
      };

      // Analyze all venues with detailed logging
      console.log('🔍 Analyzing venue types...');
      const analyzedVenues = uniquePlaces.map(place => {
        const analysis = analyzeVenueTypes(place);
        if (analysis.isWineBar || place.name?.toLowerCase().includes('wine')) {
          console.log(`🍷 Found wine-related venue: "${place.name}" - Category: ${place.category}, isWineBar: ${analysis.isWineBar}`);
        }
        if (analysis.isCafe) {
          console.log(`☕ Found cafe: "${place.name}" - Category: ${place.category}`);
        }
        return { place, analysis };
      });

      // Group venues by what they actually are
      const venuesByType = {
        wineBars: analyzedVenues.filter(v => v.analysis.isWineBar),
        breweries: analyzedVenues.filter(v => v.analysis.isBrewery),
        cocktailBars: analyzedVenues.filter(v => v.analysis.isCocktailBar),
        bars: analyzedVenues.filter(v => v.analysis.primaryCategory === 'bar' && !v.analysis.isWineBar && !v.analysis.isBrewery),
        restaurants: analyzedVenues.filter(v => v.analysis.isRestaurant && 
                                                 v.analysis.primaryCategory === 'restaurant' && 
                                                 !v.analysis.isCafe), // Exclude cafes even if categorized as restaurants
        cafes: analyzedVenues.filter(v => v.analysis.isCafe),
        parks: analyzedVenues.filter(v => v.analysis.isPark),
        museums: analyzedVenues.filter(v => v.place.category === 'museum'),
        theaters: analyzedVenues.filter(v => v.place.category === 'theater'),
        activities: analyzedVenues.filter(v => v.place.category === 'activity'),
      };

      console.log('🏪 Available venue types:', {
        wineBars: venuesByType.wineBars.length,
        breweries: venuesByType.breweries.length,
        cocktailBars: venuesByType.cocktailBars.length,
        bars: venuesByType.bars.length,
        restaurants: venuesByType.restaurants.length,
        cafes: venuesByType.cafes.length,
        parks: venuesByType.parks.length,
        museums: venuesByType.museums.length,
        theaters: venuesByType.theaters.length,
        activities: venuesByType.activities.length,
      });

      // Log sample venues for debugging
      if (venuesByType.wineBars.length > 0) {
        console.log('🍷 Wine bars found:', venuesByType.wineBars.map(v => v.place.name));
      }
      if (venuesByType.cafes.length > 0) {
        console.log('☕ Cafes found:', venuesByType.cafes.map(v => v.place.name));
      }

      // Step 4: Match dates based on ACTUAL available venues
      const matchingDates: Array<{
        template: typeof dateSuggestionTemplates[0];
        matchingVenues: typeof analyzedVenues;
        matchScore: number;
      }> = [];

      for (const dateTemplate of dateSuggestionTemplates) {
        const title = (dateTemplate.title || '').toLowerCase();
        const desc = (dateTemplate.description || '').toLowerCase();
        let matchingVenues: typeof analyzedVenues = [];
        let matchScore = 0;

        // Wine tasting / Wine bar dates - must match wine bars or breweries
        if (title.includes('wine') || title.includes('winery') || title.includes('wine tasting') ||
            desc.includes('wine') || desc.includes('winery') || desc.includes('wine tasting')) {
          console.log(`🍷 Wine tasting template found: "${dateTemplate.title}" - Checking for wine bars...`);
          if (venuesByType.wineBars.length > 0) {
            matchingVenues = venuesByType.wineBars;
            matchScore = 100;
            console.log(`✅ Matched "${dateTemplate.title}" with ${venuesByType.wineBars.length} wine bars`);
          } else if (venuesByType.breweries.length > 0) {
            matchingVenues = venuesByType.breweries;
            matchScore = 80;
            console.log(`⚠️ Matched "${dateTemplate.title}" with ${venuesByType.breweries.length} breweries (fallback)`);
          } else {
            console.log(`❌ Skipping "${dateTemplate.title}" - No wine bars or breweries found`);
            continue; // Skip if no wine bars or breweries
          }
        }
        // Beer tasting / Brewery dates
        else if (title.includes('beer tasting') || title.includes('brewery') ||
                 desc.includes('beer tasting') || desc.includes('brewery')) {
          if (venuesByType.breweries.length > 0) {
            matchingVenues = venuesByType.breweries;
            matchScore = 100;
          } else if (venuesByType.bars.length > 0) {
            matchingVenues = venuesByType.bars;
            matchScore = 70;
          } else {
            continue;
          }
        }
        // Cocktail dates
        else if (title.includes('cocktail') || desc.includes('cocktail')) {
          if (venuesByType.cocktailBars.length > 0) {
            matchingVenues = venuesByType.cocktailBars;
            matchScore = 100;
          } else if (venuesByType.bars.length > 0) {
            matchingVenues = venuesByType.bars;
            matchScore = 80;
          } else {
            continue;
          }
        }
        // Coffee / Cafe dates - must match cafes, NOT bars
        else if (title.includes('coffee') || title.includes('cafe') || title.includes('coffee shop') ||
                 desc.includes('coffee') || desc.includes('cafe') || desc.includes('coffee shop')) {
          console.log(`☕ Coffee template found: "${dateTemplate.title}" - Checking for cafes...`);
          if (venuesByType.cafes.length > 0) {
            matchingVenues = venuesByType.cafes;
            matchScore = 100;
            console.log(`✅ Matched "${dateTemplate.title}" with ${venuesByType.cafes.length} cafes`);
          } else {
            console.log(`❌ Skipping "${dateTemplate.title}" - No cafes found`);
            continue; // Skip if no cafes
          }
        }
        // Restaurant / Dining dates - EXPLICITLY exclude cafes
        else if (title.includes('restaurant') || title.includes('dinner') || title.includes('brunch') ||
                 title.includes('lunch') || title.includes('dining') || desc.includes('restaurant') ||
                 (desc.includes('dinner') && !desc.includes('home'))) {
          // Only match restaurants, explicitly exclude cafes
          const restaurantsOnly = venuesByType.restaurants.filter(v => !v.analysis.isCafe);
          if (restaurantsOnly.length > 0) {
            matchingVenues = restaurantsOnly;
            matchScore = 100;
            console.log(`✅ Matched "${dateTemplate.title}" with ${restaurantsOnly.length} restaurants (cafes excluded)`);
          } else {
            console.log(`❌ Skipping "${dateTemplate.title}" - No restaurants found (cafes excluded)`);
            continue;
          }
        }
        // Picnic / Park dates
        else if (title.includes('picnic') || title.includes('park') || title.includes('hike') ||
                 desc.includes('picnic') || desc.includes('park')) {
          if (venuesByType.parks.length > 0) {
            matchingVenues = venuesByType.parks;
            matchScore = 100;
          } else {
            continue;
          }
        }
        // Museum dates
        else if (title.includes('museum') || title.includes('gallery') || desc.includes('museum')) {
          if (venuesByType.museums.length > 0) {
            matchingVenues = venuesByType.museums;
            matchScore = 100;
          } else {
            continue;
          }
        }
        // Movie / Theater dates
        else if (title.includes('movie') || title.includes('cinema') || desc.includes('movie')) {
          if (venuesByType.theaters.length > 0) {
            matchingVenues = venuesByType.theaters;
            matchScore = 100;
          } else {
            continue;
          }
        }
        // Activity dates
        else if (title.includes('bowling') || title.includes('arcade') || title.includes('activity') ||
                 desc.includes('bowling') || desc.includes('arcade')) {
          if (venuesByType.activities.length > 0) {
            matchingVenues = venuesByType.activities;
            matchScore = 100;
          } else {
            continue;
          }
        }
        // Generic bar dates (not wine/beer specific)
        else if (title.includes('bar') || title.includes('drinks') || desc.includes('bar')) {
          if (venuesByType.bars.length > 0 || venuesByType.wineBars.length > 0) {
            matchingVenues = [...venuesByType.bars, ...venuesByType.wineBars];
            matchScore = 90;
          } else {
            continue;
          }
        }

        // If we found matching venues, add this date template
        if (matchingVenues.length > 0) {
          // Check budget compatibility
          if (dateTemplate.budget) {
            const venuePrices = matchingVenues.map(v => v.analysis.priceLevel).filter(p => p !== null);
            if (venuePrices.length > 0) {
              const avgPrice = venuePrices.reduce((sum, p) => {
                const val = p === '$' ? 1 : p === '$$' ? 2 : 3;
                return sum + val;
              }, 0) / venuePrices.length;
              const templatePrice = dateTemplate.budget === '$' ? 1 : dateTemplate.budget === '$$' ? 2 : 3;
              // Allow some flexibility (±1 price level)
              if (Math.abs(avgPrice - templatePrice) > 1) {
                matchScore -= 20; // Penalize budget mismatch but don't exclude
              }
            }
          }

          matchingDates.push({
            template: dateTemplate,
            matchingVenues,
            matchScore,
          });
        }
      }

      console.log(`📋 Found ${matchingDates.length} date templates with matching venues`);
      
      // Log what templates matched
      if (matchingDates.length > 0) {
        console.log('📅 Matched date templates:', matchingDates.map(m => ({
          title: m.template.title,
          venues: m.matchingVenues.length,
          score: m.matchScore
        })));
      } else {
        console.warn('⚠️ WARNING: No date templates matched available venues!');
        console.log('Available venues:', uniquePlaces.slice(0, 10).map(p => ({
          name: p.name,
          category: p.category
        })));
      }

      // Step 5: Score dates with onboarding preferences (bonus on top of venue match)
      const scoredDates = matchingDates.map(({ template, matchingVenues, matchScore }) => {
        let preferenceScore = 0;
        const reasons: string[] = [];

        // Love language matches
        if (userLoveLanguage && template.loveLanguage?.some(ll => ll === userLoveLanguage)) {
          preferenceScore += 10;
          reasons.push(`User love language: ${userLoveLanguage}`);
        }
        if (partnerLoveLanguagePrimary && template.loveLanguage?.some(ll => ll === partnerLoveLanguagePrimary)) {
          preferenceScore += 15;
          reasons.push(`Partner love language: ${partnerLoveLanguagePrimary}`);
        }

        // Interest matches
        if (partnerInterests.length > 0) {
          const titleLower = (template.title || '').toLowerCase();
          const descLower = (template.description || '').toLowerCase();
          const matchedInterests = partnerInterests.filter(interest => 
            titleLower.includes(interest.toLowerCase()) || descLower.includes(interest.toLowerCase())
          );
          if (matchedInterests.length > 0) {
            preferenceScore += matchedInterests.length * 5;
            reasons.push(`Partner interests: ${matchedInterests.join(', ')}`);
          }
        }

        const totalScore = matchScore + preferenceScore;
        return {
          template,
          matchingVenues,
          score: totalScore,
          matchScore,
          preferenceScore,
          reasons,
        };
      }).sort((a, b) => b.score - a.score);

      console.log(`✨ Scored ${scoredDates.length} date templates`);

      // Step 6: Pick from top-scored templates
      let selectedDateIdea: typeof dateSuggestionTemplates[0];
      let relevantPlaces: Place[] = [];

      if (scoredDates.length > 0) {
        // Get top 3 for variety
        const topTemplates = scoredDates.slice(0, Math.min(3, scoredDates.length));
        const selected = topTemplates[Math.floor(Math.random() * topTemplates.length)];
        selectedDateIdea = selected.template;
        relevantPlaces = selected.matchingVenues
          .slice(0, 5)
          .map(v => v.place)
          .sort((a, b) => a.distance - b.distance); // Closest first

        console.log(`✅ Selected date: "${selectedDateIdea.title}" with ${relevantPlaces.length} venues`);
        console.log(`   Venue match score: ${selected.matchScore}, Preference score: ${selected.preferenceScore}`);
        console.log(`   Reasons: ${selected.reasons.join(', ') || 'Venue match'}`);
      } else {
        // Fallback: pick a date that matches any available venue category
        console.warn('⚠️ No perfect matches found, using fallback');
        const availableCategories = new Set(uniquePlaces.map(p => p.category));
        const fallbackDates = dateSuggestionTemplates.filter(date => {
          const primaryVenue = getPrimaryVenueCategory(date);
          return primaryVenue && availableCategories.has(primaryVenue);
        });

        if (fallbackDates.length > 0) {
          selectedDateIdea = fallbackDates[Math.floor(Math.random() * fallbackDates.length)];
          const primaryVenue = getPrimaryVenueCategory(selectedDateIdea);
          relevantPlaces = uniquePlaces
            .filter(p => p.category === primaryVenue)
            .slice(0, 5);
        } else {
          // Last resort: any date
          selectedDateIdea = dateSuggestionTemplates[Math.floor(Math.random() * dateSuggestionTemplates.length)];
          relevantPlaces = uniquePlaces.slice(0, 5);
        }
      }

      // Set the results
      setSelectedDate(selectedDateIdea);
      setNearbyPlaces(relevantPlaces);
      setIsSpinning(false);
      setLoadingPlaces(false);
    } catch (error) {
      console.error('Error in fetchVenuesFirstThenPickDate:', error);
      // Fallback to random outdoor date
      const datePool = dateSuggestionTemplates.filter(
        date => date.environment === 'outdoor' || date.environment === 'both'
      );
      const randomDate = datePool[Math.floor(Math.random() * datePool.length)];
      setSelectedDate(randomDate);
      setIsSpinning(false);
      setLoadingPlaces(false);
    }
  };

  const spinForDate = () => {
    // For at-home dates: unlimited retries, just re-spin
    if (dateEnvironment === 'at_home') {
      spinForDateWithEnvironment('at_home', null);
      return;
    }

    // For going-out dates: check retry limit
    if (dateEnvironment === 'going_out' && goingOutRetryCount >= MAX_GOING_OUT_RETRIES) {
      // Already at limit, don't allow more retries
      return;
    }

    // Increment retry count for going-out dates
    if (dateEnvironment === 'going_out') {
      setGoingOutRetryCount(prev => prev + 1);
      // Re-spin with same location preference
      if (locationPreference) {
        spinForDateWithEnvironment('going_out', locationPreference);
      }
    }
  };

  const getPrimaryVenueCategory = (dateIdea: typeof dateSuggestionTemplates[0]): PlaceCategory | null => {
    // Identify the PRIMARY venue need for a date (not secondary/optional venues)
    const title = dateIdea.title?.toLowerCase() || '';
    const desc = dateIdea.description?.toLowerCase() || '';
    const dateType = dateIdea.dateType?.toLowerCase() || '';

    // Check title and description for PRIMARY venue indicators
    // Beach/outdoor/nature activities
    if (title.includes('beach') || title.includes('sunset stroll') || title.includes('nature') ||
        title.includes('hike') || title.includes('hiking') || title.includes('trail') ||
        title.includes('picnic') || title.includes('park walk') ||
        desc.includes('beach') || desc.includes('shore') || desc.includes('hiking') ||
        desc.includes('trail') || desc.includes('nature') || desc.includes('picnic')) {
      return 'park';
    }

    // Wine/bar/drinks dates - MUST check before restaurant to avoid misclassification
    if (title.includes('wine') || title.includes('winery') || title.includes('wine bar') ||
        title.includes('wine tasting') || title.includes('beer tasting') || title.includes('brewery') ||
        title.includes('cocktail') || title.includes('bar') || title.includes('pub') || 
        title.includes('drinks') || title.includes('tasting') ||
        desc.includes('wine') || desc.includes('winery') || desc.includes('wine bar') ||
        desc.includes('wine tasting') || desc.includes('beer tasting') || desc.includes('brewery') ||
        desc.includes('cocktail') || desc.includes('bar') || desc.includes('pub') ||
        desc.includes('drinks') || desc.includes('tasting')) {
      return 'bar';
    }

    // Restaurant/dining dates
    if (title.includes('dinner') || title.includes('restaurant') || title.includes('brunch') ||
        title.includes('lunch') || title.includes('dine') || title.includes('meal') ||
        desc.includes('restaurant') || (desc.includes('dinner') && !desc.includes('cook at home'))) {
      return 'restaurant';
    }

    // Museum/cultural dates
    if (title.includes('museum') || title.includes('gallery') || title.includes('exhibit') ||
        title.includes('art show') || desc.includes('museum') || desc.includes('gallery') ||
        desc.includes('exhibit')) {
      return 'museum';
    }

    // Theater/cinema dates
    if (title.includes('movie') || title.includes('cinema') || title.includes('theater') ||
        title.includes('show') || title.includes('concert') ||
        desc.includes('movie theater') || desc.includes('cinema') || desc.includes('live show')) {
      return 'theater';
    }


    // Activity/entertainment dates
    if (title.includes('bowling') || title.includes('arcade') || title.includes('mini golf') ||
        title.includes('escape room') || desc.includes('bowling') || desc.includes('arcade')) {
      return 'activity';
    }

    // Coffee/cafe dates
    if (title.includes('coffee') || title.includes('cafe') || title.includes('coffee shop') ||
        (desc.includes('coffee') && desc.includes('shop'))) {
      return 'cafe';
    }

    // Check date type as fallback
    if (dateType === 'picnic' || dateType === 'hiking') return 'park';
    if (dateType === 'dinner') return 'restaurant';
    if (dateType === 'museum') return 'museum';
    if (dateType === 'movie_concert') return 'theater';

    // No clear primary venue identified
    return null;
  };

  const getDateCategories = (dateIdea: typeof dateSuggestionTemplates[0]): PlaceCategory[] => {
    // Map date type and style to place categories
    const dateType = dateIdea.dateType?.toLowerCase() || '';
    const styles = dateIdea.dateStyle?.map(s => s.toLowerCase()) || [];
    const title = dateIdea.title?.toLowerCase() || '';
    const desc = dateIdea.description?.toLowerCase() || '';

    const categories: PlaceCategory[] = [];

    // Check for specific keywords in title and description that indicate venue needs
    // Wine/bar/drinks - MUST check before restaurant to avoid misclassification
    const needsBar = title.includes('wine') || title.includes('winery') || title.includes('wine bar') ||
                     title.includes('wine tasting') || title.includes('beer tasting') || title.includes('brewery') ||
                     title.includes('cocktail') || title.includes('bar') || title.includes('pub') || 
                     title.includes('drinks') || title.includes('tasting') ||
                     desc.includes('wine') || desc.includes('winery') || desc.includes('wine bar') ||
                     desc.includes('wine tasting') || desc.includes('beer tasting') || desc.includes('brewery') ||
                     desc.includes('cocktail') || desc.includes('bar') || desc.includes('pub') ||
                     desc.includes('drinks') || desc.includes('tasting');
    const needsRestaurant = title.includes('dinner') || title.includes('restaurant') || title.includes('meal') ||
                           desc.includes('dinner') || desc.includes('restaurant') || desc.includes('eat') || desc.includes('food');
    const needsCafe = title.includes('cafe') || title.includes('coffee') || title.includes('brunch') || title.includes('breakfast') ||
                     desc.includes('coffee') || desc.includes('cafe');
    const needsPark = title.includes('park') || title.includes('outdoor') || title.includes('picnic') || title.includes('nature') || title.includes('walk') ||
                     desc.includes('park') || desc.includes('outdoor') || desc.includes('nature') || desc.includes('walk');
    const needsMuseum = title.includes('museum') || title.includes('gallery') || title.includes('art') || title.includes('cultural') || title.includes('exhibit') ||
                       desc.includes('museum') || desc.includes('gallery') || desc.includes('art') || desc.includes('cultural');
    const needsActivity = title.includes('bowling') || title.includes('arcade') || title.includes('activity') || title.includes('sport') ||
                         desc.includes('bowling') || desc.includes('arcade') || desc.includes('activity');
    const needsTheater = title.includes('movie') || title.includes('cinema') || title.includes('theater') || title.includes('show') ||
                        desc.includes('movie') || desc.includes('cinema') || desc.includes('show');

    // Add categories based on explicit mentions
    if (needsRestaurant) categories.push('restaurant');
    if (needsCafe) categories.push('cafe');
    if (needsPark) categories.push('park');
    if (needsMuseum) categories.push('museum');
    if (needsBar) categories.push('bar');
    if (needsActivity) categories.push('activity');
    if (needsTheater) categories.push('theater', 'cinema');

    // Check date type
    if (dateType === 'dinner' || dateType === 'cooking') {
      if (!categories.includes('restaurant')) categories.push('restaurant');
      if (!categories.includes('cafe')) categories.push('cafe');
    }
    if (dateType === 'picnic') {
      if (!categories.includes('park')) categories.push('park');
    }
    if (dateType === 'museum') {
      if (!categories.includes('museum')) categories.push('museum');
    }
    if (dateType === 'movie_concert') {
      if (!categories.includes('theater')) categories.push('theater');
      if (!categories.includes('cinema')) categories.push('cinema');
    }
    if (dateType === 'hiking') {
      if (!categories.includes('park')) categories.push('park');
    }

    // Check date styles to add complementary categories
    if (styles.includes('foodie')) {
      if (!categories.includes('restaurant')) categories.push('restaurant');
      if (!categories.includes('cafe')) categories.push('cafe');
    }
    if (styles.includes('cultural')) {
      if (!categories.includes('museum')) categories.push('museum');
      if (!categories.includes('theater')) categories.push('theater');
    }
    if (styles.includes('romantic')) {
      // Romantic dates benefit from restaurants and parks
      if (!categories.includes('restaurant')) categories.push('restaurant');
      if (!categories.includes('park')) categories.push('park');
    }
    if (styles.includes('adventurous')) {
      if (!categories.includes('park')) categories.push('park');
      if (!categories.includes('activity')) categories.push('activity');
    }
    if (styles.includes('relaxed')) {
      // Relaxed dates often work well with cafes and parks
      if (!categories.includes('cafe')) categories.push('cafe');
      if (!categories.includes('park')) categories.push('park');
    }

    // Remove duplicates
    const uniqueCategories = Array.from(new Set(categories));

    // If no specific categories matched, return a diverse mix of popular date spots
    if (uniqueCategories.length === 0) {
      return ['restaurant', 'cafe', 'park', 'museum'];
    }

    return uniqueCategories;
  };

  const generateItemizedPlan = (venue: Place, dateIdea: typeof dateSuggestionTemplates[0]): string[] => {
    const plan: string[] = [];
    const category = venue.category;
    const isRestaurant = category === 'restaurant' || category === 'cafe';
    const isPark = category === 'park';
    const isMuseum = category === 'museum';
    const isActivity = category === 'activity' || category === 'entertainment';
    const isBar = category === 'bar';
    const isTheater = category === 'theater' || category === 'cinema';

    // Start with arrival
    plan.push(`Arrive at ${venue.name} (${placesService.formatDistance(venue.distance)} away)`);

    // Add venue-specific activities based on category and date type
    if (isRestaurant) {
      if (dateIdea.title.toLowerCase().includes('breakfast') || dateIdea.title.toLowerCase().includes('brunch')) {
        plan.push('Order your favorite breakfast items or try something new');
        plan.push('Enjoy a leisurely meal together while chatting about your plans for the day');
        plan.push('Share a dessert or specialty coffee');
      } else if (dateIdea.title.toLowerCase().includes('dinner')) {
        plan.push('Browse the menu together and share what sounds good');
        plan.push('Order appetizers to share (great for trying new things!)');
        plan.push('Enjoy your main courses and talk about your week');
        plan.push('Share a dessert if you\'re still hungry');
      } else {
        plan.push('Browse the menu and pick something you\'ll both enjoy');
        plan.push('Order and find a cozy spot to sit');
        plan.push('Enjoy your food while having great conversation');
      }
      plan.push('Take a photo together before you leave');
    } else if (isPark) {
      plan.push('Take a leisurely walk through the park together');
      if (dateIdea.title.toLowerCase().includes('picnic')) {
        plan.push('Find a perfect spot to lay out your picnic blanket');
        plan.push('Enjoy the food you brought while taking in the scenery');
        plan.push('Play a simple game or just relax and talk');
      } else {
        plan.push('Explore different paths and areas you haven\'t seen before');
        plan.push('Take photos of beautiful spots or fun moments');
        plan.push('Find a bench or nice area to sit and just enjoy each other\'s company');
      }
      plan.push('Take a selfie to remember the moment');
    } else if (isMuseum) {
      plan.push('Get tickets and grab a map of the exhibits');
      plan.push('Explore the galleries together, discussing your favorite pieces');
      plan.push('Take turns picking which exhibits to visit next');
      plan.push('Share what you each found most interesting or surprising');
      plan.push('Visit the gift shop and find a small memento');
      plan.push('Take a photo in front of your favorite exhibit');
    } else if (isActivity) {
      plan.push('Get oriented and understand how everything works');
      plan.push('Jump into the fun together!');
      plan.push('Challenge each other or work together depending on the activity');
      plan.push('Take breaks to laugh about funny moments');
      plan.push('Grab refreshments if available');
      plan.push('Take photos or videos to capture the memories');
    } else if (isBar) {
      plan.push('Browse the drink menu together');
      plan.push('Order your first round and find a comfortable spot');
      plan.push('Try each other\'s drinks if you\'re feeling adventurous');
      plan.push('Enjoy deep conversation or play bar games if available');
      plan.push('Order appetizers to share if you\'re hungry');
    } else if (isTheater) {
      plan.push('Arrive early to get tickets and snacks');
      plan.push('Pick your favorite movie snacks together');
      plan.push('Find your seats and get comfortable');
      plan.push('Enjoy the movie!');
      plan.push('Discuss your favorite parts afterward');
    } else {
      // Generic plan for other venues
      plan.push('Explore and experience what this place has to offer');
      plan.push('Take your time and enjoy being together');
      plan.push('Share what you\'re both thinking and feeling');
      plan.push('Make the most of this time together');
    }

    // Add closing
    if (!plan.some(item => item.includes('photo') || item.includes('selfie'))) {
      plan.push('Take a photo together to remember the date');
    }
    plan.push(`Head home or continue the date at another location nearby`);

    return plan;
  };

  const getVenueSummary = (venue: Place): string => {
    const summaries: Record<string, string> = {
      restaurant: 'A great spot for dining together with delicious food and good atmosphere.',
      cafe: 'Perfect for coffee, conversation, and a relaxed vibe.',
      bar: 'Enjoy drinks, good music, and quality time in a social setting.',
      park: 'Beautiful outdoor space perfect for walking, picnics, and enjoying nature together.',
      museum: 'Explore art, culture, and history while spending quality time together.',
      theater: 'Entertainment and shared experiences watching shows or movies.',
      cinema: 'Watch the latest movies together in a comfortable theater setting.',
      activity: 'Fun and engaging activities perfect for creating memorable moments together.',
      entertainment: 'Exciting entertainment options for a fun date experience.',
      shopping: 'Browse shops together and enjoy a day of retail therapy.',
    };

    return summaries[venue.category] || 'A great location for your date!';
  };

  const acceptChallenge = () => {
    setHasAccepted(true);
  };

  const handleSaveInsight = () => {
    if (!selectedDate || !relationship) return;

    const partnerId = relationship.partner_a_id === relationship.user_id
      ? relationship.partner_b_id
      : relationship.partner_a_id;

    saveInsight(
      {
        partnerId,
        title: `Challenge: ${selectedDate.title}`,
        content: `We took on the challenge "${selectedDate.title}" - ${selectedDate.description}. This was a fun way to spice things up!`
      },
      {
        onSuccess: () => {
          toast.success('Challenge insight saved!');
        },
        onError: (error: any) => {
          toast.error('Failed to save insight');
        },
      }
    );
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
        {!selectedDate && !isSpinning && !showEnvironmentSelect && !showLocationSelect && (
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

        {showEnvironmentSelect && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 border-0 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3">What kind of date?</h2>
                <p className="text-gray-600">
                  Choose between staying cozy at home or going out
                </p>
              </div>

              <div className="space-y-3">
                <Card
                  onClick={() => handleEnvironmentSelect('at_home')}
                  className="p-5 border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-rose-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Home className="w-7 h-7 text-rose-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-lg mb-1">At Home</h3>
                      <p className="text-sm text-gray-600">
                        Cozy indoor dates like cooking, games, movie nights
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  onClick={() => handleEnvironmentSelect('going_out')}
                  className="p-5 border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Palmtree className="w-7 h-7 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-lg mb-1">Going Out</h3>
                      <p className="text-sm text-gray-600">
                        Explore restaurants, parks, museums, and more
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <Button
                onClick={() => setShowEnvironmentSelect(false)}
                variant="outline"
                className="w-full mt-6"
              >
                Cancel
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

                      {venueFetchError && !loadingPlaces && nearbyPlaces.length === 0 && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
                          <p className="text-sm text-amber-900 font-semibold mb-2">
                            ⚠️ Unable to load nearby venues
                          </p>
                          <p className="text-xs text-amber-800">
                            The venue search service is temporarily unavailable. You can still do this date - just search online for places in your area!
                          </p>
                        </div>
                      )}

                      {nearbyPlaces.length > 0 && !loadingPlaces && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <MapPin className="w-5 h-5 text-purple-600" />
                            <h4 className="font-semibold text-gray-800">Nearby Venues</h4>
                            <span className="text-xs text-gray-500">({nearbyPlaces.length} found)</span>
                          </div>
                          <div className="space-y-3">
                            {nearbyPlaces.map((place) => {
                              const categoryEmoji = {
                                restaurant: '🍽️',
                                cafe: '☕',
                                bar: '🍺',
                                park: '🌳',
                                museum: '🎨',
                                theater: '🎭',
                                cinema: '🎬',
                                activity: '🎯',
                                entertainment: '🎪',
                              }[place.category] || '📍';

                              return (
                                <div
                                  key={place.id}
                                  onClick={() => setSelectedVenue(place)}
                                  className="bg-white rounded-lg p-4 text-left shadow-sm hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-purple-300"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="text-2xl">{categoryEmoji}</div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <h5 className="font-semibold text-sm text-gray-900">{place.name}</h5>
                                        <span className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                                          <MapPin className="w-3 h-3" />
                                          {placesService.formatDistance(place.distance)}
                                        </span>
                                      </div>

                                      {place.address && place.address !== 'Address not available' ? (
                                        <p className="text-xs text-gray-600 mb-2">{place.address}</p>
                                      ) : (
                                        <p className="text-xs text-gray-400 mb-2 italic">Address details not available</p>
                                      )}

                                      <div className="flex items-center gap-3 flex-wrap mb-2">
                                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full capitalize">
                                          {place.category}
                                        </span>
                                        {place.rating && (
                                          <span className="text-xs text-yellow-600 font-medium">⭐ {place.rating.toFixed(1)}</span>
                                        )}
                                        {place.priceLevel && (
                                          <span className="text-xs text-gray-600">{place.priceLevel}</span>
                                        )}
                                        {place.description && (
                                          <span className="text-xs text-gray-500">{place.description}</span>
                                        )}
                                      </div>

                                      <button className="text-xs text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        View Date Plan →
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-500 mt-3 text-center">
                            💡 Tip: Search for these venues online for more details, menus, and hours
                          </p>
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

                      <div className="space-y-3">
                        {/* Show retry info for going-out dates */}
                        {dateEnvironment === 'going_out' && goingOutRetryCount > 0 && (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
                            <p className="text-xs text-blue-900">
                              {goingOutRetryCount >= MAX_GOING_OUT_RETRIES ? (
                                <>
                                  <strong>⚠️ No more retries left.</strong> Time to commit to a date! You can accept this one or start over by going back.
                                </>
                              ) : (
                                <>
                                  <strong>Retries used:</strong> {goingOutRetryCount}/{MAX_GOING_OUT_RETRIES}
                                  {' '}• {MAX_GOING_OUT_RETRIES - goingOutRetryCount} {MAX_GOING_OUT_RETRIES - goingOutRetryCount === 1 ? 'retry' : 'retries'} remaining
                                </>
                              )}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <Button
                            onClick={spinForDate}
                            variant="outline"
                            className="flex-1 h-12"
                            disabled={dateEnvironment === 'going_out' && goingOutRetryCount >= MAX_GOING_OUT_RETRIES}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {dateEnvironment === 'at_home'
                              ? 'Try Again'
                              : goingOutRetryCount >= MAX_GOING_OUT_RETRIES
                                ? 'No More Retries'
                                : `Try Again (${MAX_GOING_OUT_RETRIES - goingOutRetryCount} left)`
                            }
                          </Button>
                          <Button
                            onClick={acceptChallenge}
                            className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Accept Challenge!
                          </Button>
                        </div>
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
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={handleSaveInsight}
                            disabled={isSaving}
                            variant="outline"
                            className="h-12 border-purple-200 text-purple-600 hover:bg-purple-50"
                          >
                            <Bookmark className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Insight'}
                          </Button>
                          <Button
                            onClick={onBack}
                            className="h-12 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
                          >
                            Done - Let's Do This!
                          </Button>
                        </div>
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

        {/* Venue Detail Modal */}
        <AnimatePresence>
          {selectedVenue && selectedDate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedVenue(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-t-2xl">
                  <button
                    onClick={() => setSelectedVenue(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">
                      {{
                        restaurant: '🍽️',
                        cafe: '☕',
                        bar: '🍺',
                        park: '🌳',
                        museum: '🎨',
                        theater: '🎭',
                        cinema: '🎬',
                        activity: '🎯',
                        entertainment: '🎪',
                      }[selectedVenue.category] || '📍'}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-1">{selectedVenue.name}</h2>
                      <div className="flex items-center gap-3 flex-wrap text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {placesService.formatDistance(selectedVenue.distance)}
                        </span>
                        {selectedVenue.rating && (
                          <span>⭐ {selectedVenue.rating.toFixed(1)}</span>
                        )}
                        {selectedVenue.priceLevel && (
                          <span>{selectedVenue.priceLevel}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Venue Info */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-purple-600" />
                      Venue Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Address</p>
                        <p className="text-sm text-gray-900">{selectedVenue.address}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Category</p>
                        <p className="text-sm text-gray-900 capitalize">{selectedVenue.category}</p>
                      </div>
                      {selectedVenue.description && (
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Details</p>
                          <p className="text-sm text-gray-900">{selectedVenue.description}</p>
                        </div>
                      )}
                      {selectedVenue.isOpen !== undefined && (
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Status</p>
                          <p className={`text-sm font-medium ${selectedVenue.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedVenue.isOpen ? '✓ Currently Open' : '✗ Currently Closed'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-purple-600" />
                      Why This Place is Perfect
                    </h3>
                    <p className="text-sm text-gray-700 bg-purple-50 rounded-lg p-4">
                      {getVenueSummary(selectedVenue)}
                    </p>
                  </div>

                  {/* Itemized Date Plan */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      Your Date Plan
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Here's a step-by-step plan for your <strong>{selectedDate.title}</strong> at {selectedVenue.name}:
                    </p>
                    <div className="space-y-2">
                      {generateItemizedPlan(selectedVenue, selectedDate).map((step, index) => (
                        <div key={index} className="flex items-start gap-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3">
                          <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          <p className="text-sm text-gray-800 flex-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cost Estimate */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-purple-600" />
                      Estimated Cost
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">
                        Based on this venue's price level ({selectedVenue.priceLevel || 'Varies'}) and your date
                        budget ({getBudgetSymbol(selectedDate.budget)}), expect to spend approximately:
                      </p>
                      <p className="text-2xl font-bold text-purple-600 mt-2">
                        {selectedVenue.priceLevel === 'Free' ? 'Free!' :
                         selectedVenue.priceLevel === '$' ? '$10-30' :
                         selectedVenue.priceLevel === '$$' ? '$30-75' :
                         selectedVenue.priceLevel === '$$$' ? '$75-150' :
                         selectedVenue.priceLevel === '$$$$' ? '$150+' :
                         getBudgetSymbol(selectedDate.budget) === '$' ? '$20 or less' :
                         getBudgetSymbol(selectedDate.budget) === '$$' ? '$20-75' :
                         '$75+'}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        *Actual cost may vary based on your choices and local pricing
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => setSelectedVenue(null)}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedVenue(null);
                        acceptChallenge();
                      }}
                      className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Plan This Date!
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
