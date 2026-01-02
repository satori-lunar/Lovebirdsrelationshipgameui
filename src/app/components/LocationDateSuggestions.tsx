import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  MapPin,
  Coffee,
  Utensils,
  Trees,
  Music,
  Camera,
  Heart,
  Star,
  DollarSign,
  Sun,
  Cloud,
  Snowflake,
  Zap
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// Date categories with icon mapping
const categoryIcons = {
  restaurant: Utensils,
  cafe: Coffee,
  park: Trees,
  event: Music,
  activity: Camera,
  romantic: Heart,
  budget: DollarSign
};

// Weather-based suggestions
const weatherActivities = {
  sunny: [
    { title: "Picnic in the Park", icon: Sun, budget: "low" },
    { title: "Outdoor Photography Walk", icon: Camera, budget: "low" },
    { title: "Farmers Market Visit", icon: Trees, budget: "moderate" }
  ],
  cloudy: [
    { title: "Museum Visit", icon: Camera, budget: "moderate" },
    { title: "Cozy Bookstore Browse", icon: Coffee, budget: "low" },
    { title: "Art Gallery Date", icon: Star, budget: "low" }
  ],
  rainy: [
    { title: "Indoor Rock Climbing", icon: Zap, budget: "moderate" },
    { title: "Cooking Class Together", icon: Utensils, budget: "high" },
    { title: "Board Game Café", icon: Coffee, budget: "moderate" }
  ],
  cold: [
    { title: "Ice Skating", icon: Snowflake, budget: "moderate" },
    { title: "Cozy Wine Tasting", icon: Heart, budget: "high" },
    { title: "Hot Chocolate & Movie", icon: Coffee, budget: "low" }
  ]
};

export default function LocationDateSuggestions({ couple, partnerProfile }) {
  const [suggestions, setSuggestions] = useState([]);
  const [weather, setWeather] = useState('sunny');
  const [loading, setLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState(couple.budget_preference || 'moderate');

  useEffect(() => {
    generateSuggestions();
  }, [couple.location, selectedBudget, partnerProfile]);

  const generateSuggestions = async () => {
    setLoading(true);

    // Simulate weather detection (in production, use weather API)
    const weatherCondition = detectWeather();
    setWeather(weatherCondition);

    // Generate personalized suggestions
    const generated = [];

    // 1. Weather-appropriate activities
    const weatherSuggestions = weatherActivities[weatherCondition] || weatherActivities.sunny;
    generated.push(...weatherSuggestions.filter(s => matchesBudget(s.budget, selectedBudget)));

    // 2. Interest-based suggestions
    if (partnerProfile?.interests) {
      const interestSuggestions = generateInterestBasedDates(partnerProfile.interests);
      generated.push(...interestSuggestions);
    }

    // 3. Love language-based suggestions
    if (partnerProfile?.love_language_primary) {
      const loveLangSuggestions = generateLoveLanguageDates(partnerProfile.love_language_primary);
      generated.push(...loveLangSuggestions);
    }

    // 4. Location-specific (simulated - in production use location API)
    const locationSuggestions = generateLocationSpecificDates(couple.location);
    generated.push(...locationSuggestions);

    // Filter by budget and shuffle
    const filtered = generated.filter(s => matchesBudget(s.budget, selectedBudget));
    const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, 6);

    setSuggestions(shuffled);
    setLoading(false);
  };

  const detectWeather = () => {
    // Simulated - in production, use weather API based on couple.location
    const conditions = ['sunny', 'cloudy', 'rainy', 'cold'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  };

  const matchesBudget = (activityBudget, userBudget) => {
    const budgetLevels = { low: 1, moderate: 2, high: 3 };
    return budgetLevels[activityBudget] <= budgetLevels[userBudget];
  };

  const generateInterestBasedDates = (interests) => {
    const interestDates = [];

    if (interests.includes('music') || interests.includes('concerts')) {
      interestDates.push({
        title: "Live Music Night",
        description: "Check out a local band or open mic night",
        icon: Music,
        budget: "moderate",
        category: "event"
      });
    }

    if (interests.includes('food') || interests.includes('cooking')) {
      interestDates.push({
        title: "Cook a New Recipe Together",
        description: "Try making a cuisine you've never cooked before",
        icon: Utensils,
        budget: "moderate",
        category: "activity"
      });
    }

    if (interests.includes('nature') || interests.includes('outdoors')) {
      interestDates.push({
        title: "Sunrise Hike",
        description: "Wake up early and watch the sunrise from a viewpoint",
        icon: Trees,
        budget: "low",
        category: "park"
      });
    }

    if (interests.includes('art') || interests.includes('photography')) {
      interestDates.push({
        title: "Street Art Tour",
        description: "Explore local murals and take photos together",
        icon: Camera,
        budget: "low",
        category: "activity"
      });
    }

    return interestDates;
  };

  const generateLoveLanguageDates = (loveLanguage) => {
    const loveLangDates = {
      quality_time: [
        {
          title: "Uninterrupted Conversation Date",
          description: "No phones, just deep conversation over coffee",
          icon: Coffee,
          budget: "low",
          category: "cafe"
        }
      ],
      receiving_gifts: [
        {
          title: "Create Something Together",
          description: "Make handmade gifts for each other",
          icon: Heart,
          budget: "low",
          category: "activity"
        }
      ],
      words_of_affirmation: [
        {
          title: "Love Letter Exchange",
          description: "Write letters to each other at a café",
          icon: Heart,
          budget: "low",
          category: "romantic"
        }
      ],
      acts_of_service: [
        {
          title: "Surprise Breakfast Prep",
          description: "Wake up early and make their favorite breakfast",
          icon: Utensils,
          budget: "low",
          category: "activity"
        }
      ],
      physical_touch: [
        {
          title: "Partner Dance Class",
          description: "Learn salsa, swing, or ballroom dancing",
          icon: Music,
          budget: "moderate",
          category: "event"
        }
      ]
    };

    return loveLangDates[loveLanguage] || [];
  };

  const generateLocationSpecificDates = (location) => {
    // Simulated - in production, use location APIs like Yelp, Google Places
    return [
      {
        title: `Best Café in ${location}`,
        description: "Try the highest-rated coffee shop in your area",
        icon: Coffee,
        budget: "low",
        category: "cafe",
        isLocationSpecific: true
      },
      {
        title: `${location} Hidden Gem Restaurant`,
        description: "Explore a local favorite you haven't tried",
        icon: Utensils,
        budget: "moderate",
        category: "restaurant",
        isLocationSpecific: true
      },
      {
        title: `${location} Park Exploration`,
        description: "Visit a park or nature spot you've never been to",
        icon: Trees,
        budget: "low",
        category: "park",
        isLocationSpecific: true
      }
    ];
  };

  const budgetOptions = [
    { value: 'low', label: 'Budget-Friendly', desc: 'Under $20', icon: DollarSign },
    { value: 'moderate', label: 'Moderate', desc: '$20-$75', icon: DollarSign },
    { value: 'high', label: 'Special Occasion', desc: '$75+', icon: Star }
  ];

  const getWeatherIcon = () => {
    const icons = {
      sunny: Sun,
      cloudy: Cloud,
      rainy: Cloud,
      cold: Snowflake
    };
    return icons[weather] || Sun;
  };

  const WeatherIcon = getWeatherIcon();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Heart className="w-8 h-8 text-rose-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">
            Dates Near You
          </h2>
        </div>
        <p className="text-gray-600">
          Personalized suggestions for {couple.location}
        </p>
      </div>

      {/* Weather Info */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="p-4 flex items-center gap-3">
          <WeatherIcon className="w-8 h-8 text-blue-600" />
          <div>
            <p className="font-medium text-gray-900">
              Perfect weather for {weather === 'rainy' ? 'indoor' : 'outdoor'} dates
            </p>
            <p className="text-sm text-gray-600">
              Suggestions updated based on current conditions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Budget Filter */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Budget Preference</p>
        <div className="grid grid-cols-3 gap-3">
          {budgetOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all ${
                  selectedBudget === option.value
                    ? 'ring-2 ring-purple-400 bg-purple-50'
                    : 'hover:shadow-md'
                }`}
                onClick={() => {
                  setSelectedBudget(option.value);
                  generateSuggestions();
                }}
              >
                <CardContent className="p-3 text-center">
                  <Icon className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                  <p className="text-xs font-medium text-gray-900">{option.label}</p>
                  <p className="text-xs text-gray-600">{option.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Suggestions */}
      <div className="grid md:grid-cols-2 gap-4">
        {suggestions.map((suggestion, i) => {
          const Icon = suggestion.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-all h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {suggestion.title}
                        </h3>
                        {suggestion.isLocationSpecific && (
                          <Badge variant="secondary" className="ml-2">
                            <MapPin className="w-3 h-3 mr-1" />
                            Local
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {suggestion.budget === 'low' && '$ Budget-Friendly'}
                          {suggestion.budget === 'moderate' && '$$ Moderate'}
                          {suggestion.budget === 'high' && '$$$ Special'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Refresh Button */}
      <Button
        onClick={generateSuggestions}
        variant="outline"
        className="w-full"
      >
        <Zap className="w-4 h-4 mr-2" />
        Get More Suggestions
      </Button>
    </div>
  );
}
