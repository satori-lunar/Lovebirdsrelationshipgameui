import { useState } from 'react';
import { ChevronLeft, Calendar, Heart, Sparkles, Check, X, MapPin, Navigation, Users2, MapPinned, DollarSign, Star, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { dateSuggestionTemplates } from '../data/dateSuggestionTemplates';
import { useLocation } from '../hooks/useLocation';
import { googlePlacesService as placesService } from '../services/googlePlacesService';
import type { Place, PlaceCategory } from '../services/nearbyPlacesService';
import { useAuth } from '../contexts/AuthContext';
import { usePartner } from '../hooks/usePartner';

interface DatePlannerProps {
  onBack: () => void;
  partnerName: string;
}

type LocationPreference = 'user' | 'partner' | 'middle' | null;
type BudgetLevel = '$' | '$$' | '$$$';
type DurationPreference = 'quick' | 'half-day' | 'full-day';
type Step = 'budget' | 'duration' | 'location' | 'loading' | 'results';

export function DatePlanner({ onBack, partnerName }: DatePlannerProps) {
  const { user } = useAuth();
  const { partnerOnboarding } = usePartner();
  const { userLocation, partnerLocation, getCurrentLocation, shareWithApp } = useLocation();

  const [step, setStep] = useState<Step>('budget');
  const [selectedBudget, setSelectedBudget] = useState<BudgetLevel | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationPreference | null>(null);
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

  // Get user's love language from onboarding data
  const userLoveLanguage = user?.onboarding?.love_language_primary;

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

  const handleBudgetSelect = (budget: BudgetLevel) => {
    setSelectedBudget(budget);
    setStep('duration');
  };

  const handleDurationSelect = (duration: DurationPreference) => {
    setSelectedDuration(duration);
    setStep('location');
  };

  const handleLocationSelect = async (preference: LocationPreference) => {
    setLocationPreference(preference);
    setStep('loading');
    await generateDateOptions(preference);
  };

  const generateDateOptions = async (preference: LocationPreference) => {
    setLoadingVenues(true);

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
        setStep('results');
        setLoadingVenues(false);
        return;
      }

      // Step 2: Fetch venues from all categories
      console.log('🔍 Starting venue search for date planning...');
      const allCategories: PlaceCategory[] = ['restaurant', 'cafe', 'bar', 'park', 'museum', 'theater', 'activity'];
      const allPlaces: Place[] = [];

      for (const category of allCategories) {
        const places = await placesService.findNearbyPlaces(targetLocation, 15, category, 5);
        allPlaces.push(...places);
      }

      const uniquePlaces = Array.from(new Map(allPlaces.map(place => [place.id, place])).values())
        .sort((a, b) => a.distance - b.distance);

      console.log(`📍 Total unique venues found: ${uniquePlaces.length}`);

      // Step 3: Filter dates based on budget, duration, and love language
      const filteredDates = dateSuggestionTemplates.filter(date => {
        // Filter by budget
        if (selectedBudget === '$' && date.budget !== '$') return false;
        if (selectedBudget === '$$' && (date.budget === '$$$')) return false;
        // $$$ shows all budgets

        // Filter by duration
        if (selectedDuration) {
          const timeReq = date.timeRequired.toLowerCase();
          if (selectedDuration === 'quick') {
            // 1-3 hours: matches "1-2 hours", "2-3 hours"
            if (!timeReq.includes('1-2') && !timeReq.includes('2-3')) return false;
          } else if (selectedDuration === 'half-day') {
            // 3-5 hours: matches "2-4 hours", "3-4 hours", "3-5 hours"
            if (!timeReq.includes('2-4') && !timeReq.includes('3-4') && !timeReq.includes('3-5')) return false;
          } else if (selectedDuration === 'full-day') {
            // 5+ hours: matches "4-6 hours", "6-8 hours", etc.
            if (!timeReq.includes('4-6') && !timeReq.includes('6-8') && !timeReq.includes('5-')) return false;
          }
        }

        // Filter by love language if available
        if (userLoveLanguage && date.loveLanguage && date.loveLanguage.length > 0) {
          const hasMatchingLoveLanguage = date.loveLanguage.includes(userLoveLanguage as any);
          if (!hasMatchingLoveLanguage) return false;
        }

        // Only include outdoor/both dates since we're finding venues
        return date.environment === 'outdoor' || date.environment === 'both';
      });

      // Step 4: Match dates to available venues and pick top 3
      const availableCategories = new Set(uniquePlaces.map(p => p.category));
      const matchedDateOptions = filteredDates
        .filter(date => {
          const primaryVenue = getPrimaryVenueCategory(date);
          return primaryVenue && availableCategories.has(primaryVenue);
        })
        .slice(0, 10) // Get more than 3 to have variety
        .map(date => {
          const dateCategories = getDateCategories(date);
          const primaryVenue = getPrimaryVenueCategory(date);

          // Get relevant venues for this date
          const relevantVenues = uniquePlaces.filter(place =>
            dateCategories.includes(place.category as PlaceCategory) ||
            (primaryVenue && place.category === primaryVenue)
          ).slice(0, 3); // Get top 3 venues per date

          return {
            date,
            venues: relevantVenues
          };
        })
        .filter(option => option.venues.length > 0)
        .slice(0, 3); // Final 3 options

      setDateOptions(matchedDateOptions);
      setStep('results');
      setLoadingVenues(false);
    } catch (error) {
      console.error('Error generating date options:', error);
      setStep('results');
      setLoadingVenues(false);
    }
  };

  const getPrimaryVenueCategory = (dateIdea: typeof dateSuggestionTemplates[0]): PlaceCategory | null => {
    const title = dateIdea.title?.toLowerCase() || '';
    const desc = dateIdea.description?.toLowerCase() || '';
    const dateType = dateIdea.dateType?.toLowerCase() || '';

    if (title.includes('beach') || title.includes('sunset stroll') || title.includes('nature') ||
        title.includes('hike') || title.includes('hiking') || title.includes('trail') ||
        title.includes('picnic') || title.includes('park walk') ||
        desc.includes('beach') || desc.includes('shore') || desc.includes('hiking') ||
        desc.includes('trail') || desc.includes('nature') || desc.includes('picnic')) {
      return 'park';
    }

    if (title.includes('dinner') || title.includes('restaurant') || title.includes('brunch') ||
        title.includes('lunch') || title.includes('dine') || title.includes('meal') ||
        desc.includes('restaurant') || (desc.includes('dinner') && !desc.includes('cook at home'))) {
      return 'restaurant';
    }

    if (title.includes('museum') || title.includes('gallery') || title.includes('exhibit') ||
        title.includes('art show') || desc.includes('museum') || desc.includes('gallery') ||
        desc.includes('exhibit')) {
      return 'museum';
    }

    if (title.includes('movie') || title.includes('cinema') || title.includes('theater') ||
        title.includes('show') || title.includes('concert') ||
        desc.includes('movie theater') || desc.includes('cinema') || desc.includes('live show')) {
      return 'theater';
    }

    if (title.includes('bar') || title.includes('pub') || title.includes('drinks') ||
        title.includes('cocktail') || desc.includes('bar') || desc.includes('pub')) {
      return 'bar';
    }

    if (title.includes('bowling') || title.includes('arcade') || title.includes('mini golf') ||
        title.includes('escape room') || desc.includes('bowling') || desc.includes('arcade')) {
      return 'activity';
    }

    if (title.includes('coffee') || title.includes('cafe') || title.includes('coffee shop') ||
        (desc.includes('coffee') && desc.includes('shop'))) {
      return 'cafe';
    }

    if (dateType === 'picnic' || dateType === 'hiking') return 'park';
    if (dateType === 'dinner') return 'restaurant';
    if (dateType === 'museum') return 'museum';
    if (dateType === 'movie_concert') return 'theater';

    return null;
  };

  const getDateCategories = (dateIdea: typeof dateSuggestionTemplates[0]): PlaceCategory[] => {
    const dateType = dateIdea.dateType?.toLowerCase() || '';
    const styles = dateIdea.dateStyle?.map(s => s.toLowerCase()) || [];
    const title = dateIdea.title?.toLowerCase() || '';
    const desc = dateIdea.description?.toLowerCase() || '';

    const categories: PlaceCategory[] = [];

    const needsRestaurant = title.includes('dinner') || title.includes('restaurant') || title.includes('meal') ||
                           desc.includes('dinner') || desc.includes('restaurant') || desc.includes('eat') || desc.includes('food');
    const needsCafe = title.includes('cafe') || title.includes('coffee') || title.includes('brunch') || title.includes('breakfast') ||
                     desc.includes('coffee') || desc.includes('cafe');
    const needsPark = title.includes('park') || title.includes('outdoor') || title.includes('picnic') || title.includes('nature') || title.includes('walk') ||
                     desc.includes('park') || desc.includes('outdoor') || desc.includes('nature') || desc.includes('walk');
    const needsMuseum = title.includes('museum') || title.includes('gallery') || title.includes('art') || title.includes('cultural') || title.includes('exhibit') ||
                       desc.includes('museum') || desc.includes('gallery') || desc.includes('art') || desc.includes('cultural');
    const needsBar = title.includes('bar') || title.includes('pub') || title.includes('drinks') || title.includes('cocktail') ||
                    desc.includes('bar') || desc.includes('drinks');
    const needsActivity = title.includes('bowling') || title.includes('arcade') || title.includes('activity') || title.includes('sport') ||
                         desc.includes('bowling') || desc.includes('arcade') || desc.includes('activity');
    const needsTheater = title.includes('movie') || title.includes('cinema') || title.includes('theater') || title.includes('show') ||
                        desc.includes('movie') || desc.includes('cinema') || desc.includes('show');

    if (needsRestaurant) categories.push('restaurant');
    if (needsCafe) categories.push('cafe');
    if (needsPark) categories.push('park');
    if (needsMuseum) categories.push('museum');
    if (needsBar) categories.push('bar');
    if (needsActivity) categories.push('activity');
    if (needsTheater) categories.push('theater', 'cinema');

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

    if (styles.includes('foodie')) {
      if (!categories.includes('restaurant')) categories.push('restaurant');
      if (!categories.includes('cafe')) categories.push('cafe');
    }
    if (styles.includes('cultural')) {
      if (!categories.includes('museum')) categories.push('museum');
      if (!categories.includes('theater')) categories.push('theater');
    }
    if (styles.includes('romantic')) {
      if (!categories.includes('restaurant')) categories.push('restaurant');
      if (!categories.includes('park')) categories.push('park');
    }
    if (styles.includes('adventurous')) {
      if (!categories.includes('park')) categories.push('park');
      if (!categories.includes('activity')) categories.push('activity');
    }
    if (styles.includes('relaxed')) {
      if (!categories.includes('cafe')) categories.push('cafe');
      if (!categories.includes('park')) categories.push('park');
    }

    const uniqueCategories = Array.from(new Set(categories));

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
            <Card className="p-8 border-0 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <DollarSign className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3">What's your budget?</h2>
                <p className="text-gray-600">
                  We'll find dates that fit your comfort zone
                </p>
              </div>

              <div className="space-y-3">
                {budgetOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Card
                      key={option.value}
                      onClick={() => handleBudgetSelect(option.value)}
                      className="p-5 border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-pink-100 to-pink-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="w-7 h-7 text-pink-600" />
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
                onClick={() => setStep('duration')}
                variant="outline"
                className="w-full mt-6"
              >
                Back to Duration
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
            <h2 className="text-2xl font-bold mb-2">Finding Perfect Dates...</h2>
            <p className="text-gray-600">Looking for venues near you</p>
          </Card>
        )}

        {/* Results - 3 Date Options */}
        {step === 'results' && dateOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Your Personalized Dates</h2>
              <p className="text-sm text-gray-600">
                {userLoveLanguage && `Based on your ${userLoveLanguage} love language. `}
                Click any date to see the full plan!
              </p>
            </div>

            {dateOptions.map((option, index) => {
              const primaryVenue = option.venues[0];
              if (!primaryVenue) return null;

              return (
                <motion.div
                  key={option.date.id}
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    onClick={() => setSelectedOption({ date: option.date, venue: primaryVenue })}
                    className="p-6 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-pink-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">
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
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {option.date.title}
                        </h3>
                        <p className="text-sm text-gray-700 mb-3">
                          {option.date.description.replace(/\{partner_name\}/g, partnerName).substring(0, 120)}...
                        </p>

                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                            {getBudgetSymbol(option.date.budget)}
                          </span>
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                            {option.date.timeRequired}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full capitalize">
                            {option.date.environment}
                          </span>
                        </div>

                        <div className="border-t pt-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">
                            📍 Primary Venue
                          </p>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{primaryVenue.name}</p>
                              <p className="text-xs text-gray-600">{placesService.formatDistance(primaryVenue.distance)} away</p>
                            </div>
                            {primaryVenue.rating && (
                              <span className="text-sm">⭐ {primaryVenue.rating.toFixed(1)}</span>
                            )}
                          </div>
                          {option.venues.length > 1 && (
                            <p className="text-xs text-gray-500 mt-2">
                              +{option.venues.length - 1} more nearby option{option.venues.length - 1 > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>

                        <button className="text-sm text-pink-600 font-medium hover:text-pink-700 flex items-center gap-1 mt-3">
                          <Calendar className="w-4 h-4" />
                          View Full Date Plan →
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}

            <Button
              onClick={() => {
                setStep('budget');
                setSelectedBudget(null);
                setSelectedDuration(null);
                setLocationPreference(null);
                setDateOptions([]);
              }}
              variant="outline"
              className="w-full mt-6"
            >
              Start Over
            </Button>
          </motion.div>
        )}

        {/* No Results */}
        {step === 'results' && dateOptions.length === 0 && (
          <Card className="p-8 text-center border-0 shadow-xl">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-xl font-bold mb-2">No Dates Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find any venues nearby that match your preferences. Try adjusting your budget, duration, or location.
            </p>
            <Button
              onClick={() => {
                setStep('budget');
                setSelectedBudget(null);
                setSelectedDuration(null);
                setLocationPreference(null);
              }}
              className="bg-gradient-to-r from-pink-500 to-purple-500"
            >
              Try Again
            </Button>
          </Card>
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

                {/* Venue Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    Venue Information
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Address</p>
                      <p className="text-sm text-gray-900">{selectedOption.venue.address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Category</p>
                      <p className="text-sm text-gray-900 capitalize">{selectedOption.venue.category}</p>
                    </div>
                    {selectedOption.venue.description && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Details</p>
                        <p className="text-sm text-gray-900">{selectedOption.venue.description}</p>
                      </div>
                    )}
                    {selectedOption.venue.isOpen !== undefined && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Status</p>
                        <p className={`text-sm font-medium ${selectedOption.venue.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedOption.venue.isOpen ? '✓ Currently Open' : '✗ Currently Closed'}
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
    </div>
  );
}
