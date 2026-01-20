import { useState } from 'react';
import { ChevronLeft, Calendar, Heart, Sparkles, Check, X, MapPin, Navigation, Users2, MapPinned, DollarSign, Star, Clock, Layers, Map } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { dateSuggestionTemplates } from '../data/dateSuggestionTemplates';
import { useLocation } from '../hooks/useLocation';
import { googlePlacesService as placesService } from '../services/googlePlacesService';
import type { Place, PlaceCategory } from '../services/nearbyPlacesService';
import { useAuth } from '../contexts/AuthContext';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { useRelationship } from '../hooks/useRelationship';
import { EnhancedVenueCard } from './EnhancedVenueCard';
import { VenuesMap } from './VenuesMap';
import { getTopDates } from '../services/unifiedDateMatchingService';

interface DatePlannerProps {
  onBack: () => void;
  partnerName: string;
}

type LocationPreference = 'user' | 'partner' | 'middle' | null;
type BudgetLevel = '$' | '$$' | '$$$';
type DurationPreference = 'quick' | 'half-day' | 'full-day';
type VenuePreference = 'single' | 'multiple' | null;
type Step = 'budget' | 'duration' | 'venues' | 'location' | 'loading' | 'results';

export function DatePlanner({ onBack, partnerName }: DatePlannerProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const {
    partnerOnboarding,
    partnerLoveLanguages,
    partnerPreferences,
    partnerWantsNeeds,
  } = usePartnerOnboarding();
  const { userLocation, partnerLocation, getCurrentLocation, shareWithApp } = useLocation();

  const [step, setStep] = useState<Step>('budget');
  const [selectedBudget, setSelectedBudget] = useState<BudgetLevel | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationPreference | null>(null);
  const [venuePreference, setVenuePreference] = useState<VenuePreference>(null);
  const [locationPreference, setLocationPreference] = useState<LocationPreference>(null);
  const [dateOptions, setDateOptions] = useState<Array<{
    date: typeof dateSuggestionTemplates[0];
    venues: Place[];
  }>>([]);
  const [selectedOption, setSelectedOption] = useState<{
    date: typeof dateSuggestionTemplates[0];
    venue: Place;
  } | null>(null);
  const [loadingVenues, setLoadingVenues] = useState(false);

  // NEW: Store all fetched venues (fetched when location is selected)
  const [allNearbyVenues, setAllNearbyVenues] = useState<Place[]>([]);
  const [targetLocation, setTargetLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [fetchingVenues, setFetchingVenues] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Get user's love language from onboarding data
  const userLoveLanguage = user?.onboarding?.love_language_primary;

  // Extract partner preferences for matching
  const partnerInterests = partnerWantsNeeds?.favorite_activities || [];
  const partnerFavoriteFoods = partnerOnboarding?.favorite_activities || []; // Legacy field
  const partnerFavoriteCuisines = partnerWantsNeeds?.favorite_cuisines || [];
  const partnerDateStyles = partnerWantsNeeds?.date_style ? [partnerWantsNeeds.date_style] : [];
  const partnerLoveLanguagePrimary = partnerLoveLanguages?.primary;
  const partnerLoveLanguageSecondary = partnerLoveLanguages?.secondary;

  const budgetOptions = [
    { value: '$' as BudgetLevel, label: 'Budget-Friendly', desc: 'Under $30', icon: DollarSign },
    { value: '$$' as BudgetLevel, label: 'Moderate', desc: '$30-75', icon: DollarSign },
    { value: '$$$' as BudgetLevel, label: 'Special Occasion', desc: '$75+', icon: Star }
  ];

  const durationOptions = [
    { value: 'quick' as DurationPreference, label: 'Quick Date', desc: '1-3 hours', icon: Clock },
    { value: 'half-day' as DurationPreference, label: 'Half Day', desc: '3-5 hours', icon: Clock },
    { value: 'full-day' as DurationPreference, label: 'Full Day', desc: '5+ hours', icon: Star }
  ];

  const venueOptions = [
    { value: 'single' as VenuePreference, label: 'Single Venue', desc: 'Stay at one place', icon: MapPin },
    { value: 'multiple' as VenuePreference, label: 'Multiple Venues', desc: 'Visit 2-3 different spots', icon: Layers }
  ];

  const handleBudgetSelect = (budget: BudgetLevel) => {
    setSelectedBudget(budget);
    setStep('duration');
  };

  const handleDurationSelect = (duration: DurationPreference) => {
    setSelectedDuration(duration);
    setStep('venues');
  };

  const handleVenuePreferenceSelect = (preference: VenuePreference) => {
    setVenuePreference(preference);
    setStep('location');
  };

  const handleLocationSelect = async (preference: LocationPreference) => {
    setLocationPreference(preference);
    setFetchingVenues(true);

    console.log('🌍 Location selected, fetching ALL nearby venues within 10 miles...');

    try {
      // Step 1: Get target location based on preference
      let location;

      if (preference === 'user') {
        if (!shareWithApp) {
          const coords = await getCurrentLocation();
          location = coords;
        } else if (userLocation) {
          location = {
            latitude: Number(userLocation.latitude),
            longitude: Number(userLocation.longitude),
          };
        } else {
          throw new Error('User location not available');
        }
      } else if (preference === 'partner') {
        if (partnerLocation) {
          location = {
            latitude: Number(partnerLocation.latitude),
            longitude: Number(partnerLocation.longitude),
          };
        } else {
          throw new Error('Partner location not available');
        }
      } else if (preference === 'middle') {
        if (userLocation && partnerLocation) {
          location = {
            latitude: (Number(userLocation.latitude) + Number(partnerLocation.latitude)) / 2,
            longitude: (Number(userLocation.longitude) + Number(partnerLocation.longitude)) / 2,
          };
        } else {
          throw new Error('Both user and partner locations required for middle point');
        }
      }

      if (!location) {
        throw new Error('Could not determine target location');
      }

      setTargetLocation(location);
      console.log(`📍 Target location: ${location.latitude}, ${location.longitude}`);

      // Step 2: Fetch ALL venues from all categories within 10 miles
      console.log('🔍 Fetching venues from all categories...');
      const allCategories: PlaceCategory[] = ['restaurant', 'cafe', 'bar', 'park', 'museum', 'theater', 'activity'];
      const allPlaces: Place[] = [];

      const searchRadius = 10; // 10 mile radius
      const maxDistanceMiles = 10;

      for (const category of allCategories) {
        console.log(`  🔎 Fetching ${category} venues...`);
        try {
          const places = await placesService.findNearbyPlaces(location, searchRadius, category, 20);
          if (Array.isArray(places)) {
            allPlaces.push(...places);
            console.log(`  ✓ Found ${places.length} ${category} venues`);
          } else {
            console.warn(`  ⚠️ Invalid response for ${category} venues`);
          }
        } catch (err) {
          console.error(`  ❌ Error fetching ${category} venues:`, err);
        }
      }

      console.log(`📦 Total places fetched (with duplicates): ${allPlaces.length}`);

      // Step 3: Filter and deduplicate using a safer method
      // Avoid using new Map() which might cause constructor issues in minified code
      const seenIds = new Set<string>();
      const uniquePlaces: Place[] = [];

      for (const place of allPlaces) {
        if (place && place.id && !seenIds.has(place.id)) {
          if (place.distance && place.distance <= maxDistanceMiles) {
            // VALIDATE: Filter out venues with suspicious names
            const venueName = (place.name || '').toLowerCase().trim();

            // Check if venue name is a known city/locality (too generic)
            const invalidVenueNames = [
              'guadalajara', 'chapala', 'ajijic', 'san antonio', 'tlaquepaque',
              'mexico', 'jalisco', 'ciudad', 'centro', // Common Mexican location terms
              'downtown', 'city center', 'main street', 'plaza', // Generic terms
            ];

            const isInvalidName = invalidVenueNames.some(invalid => venueName === invalid);

            if (isInvalidName) {
              console.log(`❌ Filtering out venue with invalid name: "${place.name}" (likely a city/locality, not a specific venue)`);
              continue;
            }

            // Additional validation: venue name should be substantive (not just 1-2 characters)
            if (venueName.length < 3) {
              console.log(`❌ Filtering out venue with too-short name: "${place.name}"`);
              continue;
            }

            seenIds.add(place.id);
            uniquePlaces.push(place);
          }
        }
      }

      // Sort by distance
      uniquePlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      console.log(`✅ TOTAL: ${uniquePlaces.length} unique venues fetched within ${maxDistanceMiles} miles`);

      if (uniquePlaces.length === 0) {
        console.warn('⚠️ No venues found in the area');
        setFetchingVenues(false);
        setStep('results');
        setDateOptions([]);
        return;
      }

      console.log(`📊 Breakdown by distance:`);
      console.log(`   - Within 0.5 mi: ${uniquePlaces.filter(p => p.distance <= 0.5).length}`);
      console.log(`   - Within 1 mi: ${uniquePlaces.filter(p => p.distance <= 1).length}`);
      console.log(`   - Within 3 mi: ${uniquePlaces.filter(p => p.distance <= 3).length}`);
      console.log(`   - Within 5 mi: ${uniquePlaces.filter(p => p.distance <= 5).length}`);

      // Store venues for later use
      setAllNearbyVenues([...uniquePlaces]); // Create new array to avoid reference issues
      setFetchingVenues(false);

      // Now generate date options using the pre-fetched venues
      setStep('loading');

      // Pass a clean copy of the array
      await generateDateOptions([...uniquePlaces]);

    } catch (error) {
      console.error('❌ Error in handleLocationSelect:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      setFetchingVenues(false);
      setStep('location'); // Go back to location selection
    }
  };

  const generateDateOptions = async (preFetchedVenues: Place[]) => {
    setLoadingVenues(true);

    try {
      console.log('🎯 NEW UNIFIED MATCHING: Generating date options from pre-fetched venues...');

      // Validate input
      if (!Array.isArray(preFetchedVenues)) {
        console.error('❌ preFetchedVenues is not an array:', typeof preFetchedVenues);
        setStep('results');
        setLoadingVenues(false);
        setDateOptions([]);
        return;
      }

      // Use the venues that were already fetched
      const uniquePlaces = preFetchedVenues.filter(v => v && v.id && v.category);

      console.log(`📊 Using ${uniquePlaces.length} pre-fetched venues`);

      if (uniquePlaces.length === 0) {
        console.warn('⚠️ No valid venues to generate dates from');
        setStep('results');
        setLoadingVenues(false);
        setDateOptions([]);
        return;
      }

      // === NEW SIMPLIFIED LOGIC ===
      // Build user preferences object
      const userPreferences = {
        budget: selectedBudget!,
        duration: selectedDuration!,
        venuePreference: venuePreference!,
        loveLanguages: [
          userLoveLanguage,
          partnerLoveLanguagePrimary,
          partnerLoveLanguageSecondary
        ].filter(Boolean) as string[],
        interests: [...partnerInterests, ...partnerFavoriteFoods].filter(Boolean),
        userLocation: userLocation || undefined,
        partnerLocation: partnerLocation || undefined,
      };

      console.log('🎯 User preferences:', {
        budget: userPreferences.budget,
        duration: userPreferences.duration,
        venuePreference: userPreferences.venuePreference,
        loveLanguages: userPreferences.loveLanguages.length,
        interests: userPreferences.interests.length,
      });

      // Use the new unified matching service
      const scoredDates = getTopDates(
        dateSuggestionTemplates,
        uniquePlaces,
        userPreferences,
        10 // Get top 10 candidates
      );

      console.log(`✅ Unified matching returned ${scoredDates.length} date suggestions`);

      // Transform to the format expected by UI
      const finalDates = scoredDates.map(scored => ({
        date: scored.template,
        venues: scored.matchedVenues,
        matchScore: scored.score,
        matchReasons: [], // We can populate this from scoreBreakdown if needed
        hasNearbyVenues: scored.matchedVenues.length > 0,
        closestVenueDistance: scored.matchedVenues[0]?.distance || Infinity,
        dateStyle: scored.template.dateStyle || [],
      }));

      // Log results
      console.log(`📅 Generated ${finalDates.length} date options:`);
      finalDates.forEach((option, index) => {
        const venueNames = option.venues.map(v => v?.name || 'Unknown').join(', ');
        const distanceStr = option.closestVenueDistance !== Infinity
          ? `${option.closestVenueDistance.toFixed(1)} miles`
          : 'unknown distance';
        console.log(`  ${index + 1}. "${option.date.title}" - Score: ${option.matchScore.toFixed(1)}, Venues: ${venueNames}, Distance: ${distanceStr}`);
        console.log(`     Budget: ${option.date.budget}, Time: ${option.date.timeRequired}`);
      });

      // Set the date options and complete
      setDateOptions(finalDates);
      setStep('results');
      setLoadingVenues(false);
    } catch (error) {
      console.error('Error generating date options:', error);
      setStep('results');
      setLoadingVenues(false);
    }
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

    plan.push(`Arrive at ${venue.name} (${placesService.formatDistance(venue.distance)} away)`);

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
      plan.push('Explore and experience what this place has to offer');
      plan.push('Take your time and enjoy being together');
      plan.push('Share what you\'re both thinking and feeling');
      plan.push('Make the most of this time together');
    }

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
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
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
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl">Plan a Date</h1>
              <p className="text-white/90 text-sm">
                Personalized dates for you and {partnerName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Budget Selection */}
        {step === 'budget' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 border-0 shadow-2xl bg-white overflow-hidden relative">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full opacity-30 -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full opacity-30 -ml-16 -mb-16" />

              <div className="text-center mb-8 relative">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="w-24 h-24 bg-gradient-to-br from-pink-400 via-pink-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                  <DollarSign className="w-12 h-12 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  What's your budget?
                </h2>
                <p className="text-gray-600 text-base">
                  Choose a range that feels comfortable for you
                </p>
              </div>

              <div className="space-y-4 relative">
                {budgetOptions.map((option, index) => {
                  const Icon = option.icon;
                  const colors = [
                    { bg: 'from-green-400 to-emerald-500', hover: 'hover:from-green-500 hover:to-emerald-600', text: 'text-green-700', badge: 'bg-green-100' },
                    { bg: 'from-blue-400 to-indigo-500', hover: 'hover:from-blue-500 hover:to-indigo-600', text: 'text-blue-700', badge: 'bg-blue-100' },
                    { bg: 'from-purple-400 to-pink-500', hover: 'hover:from-purple-500 hover:to-pink-600', text: 'text-purple-700', badge: 'bg-purple-100' }
                  ];
                  const color = colors[index];

                  return (
                    <motion.div
                      key={option.value}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.03, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        onClick={() => handleBudgetSelect(option.value)}
                        className="p-6 border-2 border-transparent hover:border-white cursor-pointer transition-all shadow-lg hover:shadow-2xl bg-gradient-to-r overflow-hidden relative group"
                        style={{
                          background: `linear-gradient(135deg, ${color.bg.includes('green') ? '#34D399' : color.bg.includes('blue') ? '#60A5FA' : '#A78BFA'} 0%, ${color.bg.includes('green') ? '#10B981' : color.bg.includes('blue') ? '#3B82F6' : '#EC4899'} 100%)`
                        }}
                      >
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
                        <div className="relative flex items-center gap-4">
                          <div className="w-16 h-16 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Icon className="w-8 h-8 text-gray-800" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-bold text-xl mb-1 text-white">{option.label}</h3>
                            <p className="text-sm text-white/90 font-medium">
                              {option.desc}
                            </p>
                          </div>
                          <div className="text-white/80 group-hover:text-white transition-colors">
                            <span className="text-2xl">→</span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Duration Selection */}
        {step === 'duration' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 border-0 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3">How long do you have?</h2>
                <p className="text-gray-600">
                  We'll suggest dates that fit your timeframe
                </p>
              </div>

              <div className="space-y-3">
                {durationOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Card
                      key={option.value}
                      onClick={() => handleDurationSelect(option.value)}
                      className="p-5 border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="w-7 h-7 text-purple-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-semibold text-lg mb-1">{option.label}</h3>
                          <p className="text-sm text-gray-600">
                            {option.desc}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <Button
                onClick={() => setStep('budget')}
                variant="outline"
                className="w-full mt-6"
              >
                Back to Budget
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Venue Preference Selection */}
        {step === 'venues' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 border-0 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Layers className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Single or multiple venues?</h2>
                <p className="text-gray-600">
                  Stay at one spot or visit multiple places?
                </p>
              </div>

              <div className="space-y-3">
                {venueOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Card
                      key={option.value}
                      onClick={() => handleVenuePreferenceSelect(option.value)}
                      className="p-5 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="w-7 h-7 text-blue-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-semibold text-lg mb-1">{option.label}</h3>
                          <p className="text-sm text-gray-600">
                            {option.desc}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <Button
                onClick={() => setStep('duration')}
                variant="outline"
                className="w-full mt-6"
              >
                Back to Duration
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Location Selection */}
        {step === 'location' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 border-0 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Where should we look?</h2>
                <p className="text-gray-600">
                  We'll find nearby venues based on your choice
                </p>
              </div>

              <div className="space-y-3">
                <Card
                  onClick={() => handleLocationSelect('user')}
                  className="p-4 border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Navigation className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold mb-1">Near My Location</h3>
                      <p className="text-sm text-gray-600">
                        Find dates close to where you are
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  onClick={() => handleLocationSelect('partner')}
                  className="p-4 border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users2 className="w-6 h-6 text-pink-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold mb-1">Near {partnerName}'s Location</h3>
                      <p className="text-sm text-gray-600">
                        Find dates close to where {partnerName} is
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  onClick={() => handleLocationSelect('middle')}
                  className="p-4 border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 cursor-pointer transition-all group"
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
                onClick={() => setStep('venues')}
                variant="outline"
                className="w-full mt-6"
              >
                Back to Venue Selection
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Loading */}
        {step === 'loading' && (
          <Card className="p-8 text-center border-0 shadow-xl">
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
              className="w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Sparkles className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">Creating Your Perfect Dates...</h2>
            <div className="space-y-2 text-gray-600">
              <p>📊 Analyzing {allNearbyVenues.length} venues in your area</p>
              <p>🎯 Matching to your preferences:</p>
              <ul className="text-sm space-y-1">
                <li>• Budget: {selectedBudget}</li>
                <li>• Duration: {selectedDuration === 'quick' ? '1-3 hours' : selectedDuration === 'half-day' ? '3-5 hours' : '5+ hours'}</li>
                <li>• Venues: {venuePreference === 'single' ? 'Single location' : 'Multiple locations'}</li>
              </ul>
              <p className="text-xs text-gray-500 mt-4">This may take up to 10 seconds for best results...</p>
            </div>
          </Card>
        )}

        {/* Results - 3 Date Options */}
        {step === 'results' && dateOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-16 h-16 bg-gradient-to-br from-pink-400 via-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Your Perfect Dates</h2>
              <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
                {userLoveLanguage && `✨ Curated for your ${userLoveLanguage} love language. `}
                Tap any date to explore the full experience!
              </p>

              {/* Map Button */}
              {allNearbyVenues.length > 0 && targetLocation && (
                <Button
                  onClick={() => setShowMap(true)}
                  variant="outline"
                  className="mx-auto"
                >
                  <Map className="w-4 h-4 mr-2" />
                  View All {allNearbyVenues.length} Venues on Map
                </Button>
              )}
            </div>

            {dateOptions.map((option, index) => {
              const primaryVenue = option.venues[0];
              if (!primaryVenue) return null;

              const categoryColors = {
                restaurant: 'from-orange-400 to-red-400',
                cafe: 'from-amber-400 to-orange-400',
                bar: 'from-purple-400 to-pink-400',
                park: 'from-green-400 to-emerald-400',
                museum: 'from-blue-400 to-indigo-400',
                theater: 'from-pink-400 to-rose-400',
                cinema: 'from-indigo-400 to-purple-400',
                activity: 'from-cyan-400 to-blue-400',
                entertainment: 'from-fuchsia-400 to-pink-400',
              };

              const gradient = categoryColors[primaryVenue.category as keyof typeof categoryColors] || 'from-pink-400 to-purple-400';

              return (
                <motion.div
                  key={option.date.id}
                  initial={{ scale: 0.9, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.15,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    onClick={() => setSelectedOption({ date: option.date, venue: primaryVenue })}
                    className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all cursor-pointer bg-white"
                  >
                    {/* Header with gradient */}
                    <div className={`bg-gradient-to-br ${gradient} p-6 relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center text-2xl shadow-lg">
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
                            }[primaryVenue.category] || '📍'}
                          </div>
                          <div className="text-white flex-1">
                            <p className="text-xs font-medium opacity-90 mb-1">Date #{index + 1}</p>
                            <h3 className="text-xl font-bold leading-tight mb-1">
                              {option.date.title}
                            </h3>
                            {/* Time Duration Badge */}
                            <div className="flex items-center gap-1.5 mt-2">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-sm font-semibold">{option.date.timeRequired}</span>
                            </div>
                          </div>
                        </div>
                        {primaryVenue.rating && (
                          <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg">
                            <span className="text-sm font-bold">⭐ {primaryVenue.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                        {option.date.description.replace(/\{partner_name\}/g, partnerName).substring(0, 110)}...
                      </p>

                      {/* Tags */}
                      <div className="flex items-center gap-2 flex-wrap mb-4">
                        <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-pink-100 to-pink-50 text-pink-700 rounded-full font-medium border border-pink-200">
                          💰 {getBudgetSymbol(option.date.budget)}
                        </span>
                        <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 rounded-full font-medium border border-blue-200 capitalize">
                          {option.date.environment === 'outdoor' ? '🌤️' : '🏠'} {option.date.environment}
                        </span>
                      </div>

                      {/* Venue Info */}
                      <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-pink-500" />
                          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                            Starting Point
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{primaryVenue.name}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              📍 {placesService.formatDistance(primaryVenue.distance)} away
                            </p>
                          </div>
                        </div>
                        {option.venues.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-600">
                              <span className="font-semibold text-purple-600">
                                +{option.venues.length - 1} more venue{option.venues.length - 1 > 1 ? 's' : ''}
                              </span> included in this date
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg">
                        <Calendar className="w-4 h-4" />
                        View Complete Date Plan
                        <span className="text-lg">→</span>
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => {
                  setStep('budget');
                  setSelectedBudget(null);
                  setSelectedDuration(null);
                  setVenuePreference(null);
                  setLocationPreference(null);
                  setDateOptions([]);
                }}
                variant="outline"
                className="w-full mt-6 py-6 text-base font-semibold border-2 border-gray-300 hover:border-pink-400 hover:bg-pink-50 transition-all shadow-md hover:shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Start Over
                </span>
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* No Results */}
        {step === 'results' && dateOptions.length === 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Card className="p-10 text-center border-0 shadow-2xl bg-gradient-to-br from-white to-purple-50 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full opacity-20 -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-200 rounded-full opacity-20 -ml-12 -mb-12" />

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="text-7xl mb-6"
              >
                🔍
              </motion.div>
              <h2 className="text-2xl font-bold mb-3 text-gray-900">Let's Try Something Different</h2>
              <p className="text-gray-600 mb-8 max-w-sm mx-auto leading-relaxed">
                We couldn't find dates matching all your preferences right now. Try adjusting your criteria for better results!
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm mx-auto">
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Try</p>
                  <p className="text-sm font-semibold text-pink-600">Different Budget</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Try</p>
                  <p className="text-sm font-semibold text-purple-600">Different Duration</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Try</p>
                  <p className="text-sm font-semibold text-blue-600">Different Location</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Try</p>
                  <p className="text-sm font-semibold text-indigo-600">More Venues</p>
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => {
                    setStep('budget');
                    setSelectedBudget(null);
                    setSelectedDuration(null);
                    setVenuePreference(null);
                    setLocationPreference(null);
                  }}
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 hover:from-pink-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-xl shadow-xl hover:shadow-2xl transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Start Fresh
                  </span>
                </Button>
              </motion.div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Venue Detail Modal - Same as DateChallenge */}
      <AnimatePresence>
        {selectedOption && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOption(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 rounded-t-2xl">
                <button
                  onClick={() => setSelectedOption(null)}
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
                    }[selectedOption.venue.category] || '📍'}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1">{selectedOption.venue.name}</h2>
                    <div className="flex items-center gap-3 flex-wrap text-sm">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {placesService.formatDistance(selectedOption.venue.distance)}
                      </span>
                      {selectedOption.venue.rating && (
                        <span>⭐ {selectedOption.venue.rating.toFixed(1)}</span>
                      )}
                      {selectedOption.venue.priceLevel && (
                        <span>{selectedOption.venue.priceLevel}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Date Idea Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-600" />
                    Date Idea
                  </h3>
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-2">{selectedOption.date.title}</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      {selectedOption.date.description.replace(/\{partner_name\}/g, partnerName)}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-1 bg-white rounded-full">
                        {getBudgetSymbol(selectedOption.date.budget)} Budget
                      </span>
                      <span className="text-xs px-2 py-1 bg-white rounded-full">
                        {selectedOption.date.timeRequired}
                      </span>
                      <span className="text-xs px-2 py-1 bg-white rounded-full capitalize">
                        {selectedOption.date.effort} Effort
                      </span>
                    </div>
                  </div>
                </div>

                {/* Enhanced Venue Card */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    Featured Venue
                  </h3>
                  <EnhancedVenueCard place={selectedOption.venue} />
                </div>

                {/* Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-purple-600" />
                    Why This Place is Perfect
                  </h3>
                  <p className="text-sm text-gray-700 bg-purple-50 rounded-lg p-4">
                    {getVenueSummary(selectedOption.venue)}
                  </p>
                </div>

                {/* Itemized Date Plan */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Your Date Plan
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Here's a step-by-step plan for your <strong>{selectedOption.date.title}</strong> at {selectedOption.venue.name}:
                  </p>
                  <div className="space-y-2">
                    {generateItemizedPlan(selectedOption.venue, selectedOption.date).map((step, index) => (
                      <div key={index} className="flex items-start gap-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-3">
                        <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
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
                      Based on this venue's price level ({selectedOption.venue.priceLevel || 'Varies'}) and your date
                      budget ({getBudgetSymbol(selectedOption.date.budget)}), expect to spend approximately:
                    </p>
                    <p className="text-2xl font-bold text-purple-600 mt-2">
                      {selectedOption.venue.priceLevel === 'Free' ? 'Free!' :
                       selectedOption.venue.priceLevel === '$' ? '$10-30' :
                       selectedOption.venue.priceLevel === '$$' ? '$30-75' :
                       selectedOption.venue.priceLevel === '$$$' ? '$75-150' :
                       selectedOption.venue.priceLevel === '$$$$' ? '$150+' :
                       getBudgetSymbol(selectedOption.date.budget) === '$' ? '$20 or less' :
                       getBudgetSymbol(selectedOption.date.budget) === '$$' ? '$20-75' :
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
                    onClick={() => setSelectedOption(null)}
                    variant="outline"
                    className="flex-1 h-12"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedOption(null);
                      // Here you could add logic to save/schedule this date
                    }}
                    className="flex-1 h-12 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
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

      {/* Venues Map Modal */}
      {showMap && allNearbyVenues.length > 0 && targetLocation && (
        <VenuesMap
          venues={allNearbyVenues}
          centerLocation={targetLocation}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}
