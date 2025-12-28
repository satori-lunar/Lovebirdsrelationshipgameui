import { useState } from 'react';
import { ChevronLeft, Sparkles, User, Users, Heart, X, MapPin, Clock, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion, AnimatePresence } from 'motion/react';

interface DatePlanningProps {
  onBack: () => void;
  partnerName: string;
}

type DateMode = 'select' | 'plan-for-partner' | 'swipe-together';

const dateIdeas = [
  {
    id: 1,
    title: "Sunset Picnic at the Park",
    description: "Pack your favorite snacks, bring a cozy blanket, and watch the sunset together. Bonus: bring a portable speaker for background music.",
    category: "Outdoor",
    duration: "2-3 hours",
    budget: "$",
    location: "Local park",
    image: "🌅"
  },
  {
    id: 2,
    title: "Cook a New Recipe Together",
    description: "Choose a cuisine you've never tried before, shop for ingredients together, and make it an adventure in the kitchen.",
    category: "Indoor",
    duration: "2 hours",
    budget: "$$",
    location: "Home",
    image: "👨‍🍳"
  },
  {
    id: 3,
    title: "Museum & Coffee Date",
    description: "Explore a local museum or art gallery, then discuss your favorite pieces over coffee at a nearby café.",
    category: "Cultural",
    duration: "3-4 hours",
    budget: "$$",
    location: "Downtown",
    image: "🎨"
  },
  {
    id: 4,
    title: "Stargazing Night",
    description: "Drive to a spot away from city lights, bring blankets and hot chocolate, and spend the evening looking at the stars.",
    category: "Outdoor",
    duration: "2-3 hours",
    budget: "$",
    location: "Outside city",
    image: "✨"
  },
  {
    id: 5,
    title: "Spa Night at Home",
    description: "Create a relaxing spa experience with face masks, massage oils, candles, and soothing music.",
    category: "Indoor",
    duration: "2 hours",
    budget: "$",
    location: "Home",
    image: "🧖"
  }
];

export function DatePlanning({ onBack, partnerName }: DatePlanningProps) {
  const [mode, setMode] = useState<DateMode>('select');
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);
  const [userLikes, setUserLikes] = useState<number[]>([]);
  const [matches, setMatches] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);

  const handleSwipe = (liked: boolean) => {
    if (liked) {
      const newLikes = [...userLikes, dateIdeas[currentSwipeIndex].id];
      setUserLikes(newLikes);
      
      // Simulate partner also liked it (for demo)
      if (Math.random() > 0.4) {
        setMatches(prev => [...prev, dateIdeas[currentSwipeIndex].id]);
      }
    }
    
    if (currentSwipeIndex < dateIdeas.length - 1) {
      setCurrentSwipeIndex(currentSwipeIndex + 1);
    } else {
      setIsSwipeComplete(true);
    }
  };

  const selectDateForPartner = (id: number) => {
    setSelectedDate(id);
  };

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
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
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-2xl">Plan a Date</h1>
            </div>
            <p className="text-white/90 text-sm">
              Choose how you'd like to plan your next date
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 -mt-6 space-y-4">
          <button
            onClick={() => setMode('plan-for-partner')}
            className="w-full bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-pink-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Plan for {partnerName}</h3>
                <p className="text-sm text-gray-600">
                  Surprise them with a date tailored to their preferences
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode('swipe-together')}
            className="w-full bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Choose Together</h3>
                <p className="text-sm text-gray-600">
                  Swipe on date ideas and find your perfect match
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                    Recommended
                  </span>
                  <span className="text-xs text-gray-500">No decision fatigue</span>
                </div>
              </div>
            </div>
          </button>

          <Card className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 border-0">
            <p className="text-sm text-center text-gray-600">
              💡 All date ideas are personalized based on your preferences, budget, and location
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === 'plan-for-partner' && !selectedDate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
          <div className="max-w-md mx-auto">
            <button 
              onClick={() => setMode('select')}
              className="flex items-center gap-2 mb-6 hover:opacity-80"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            
            <h1 className="text-2xl mb-2">Date Ideas for {partnerName}</h1>
            <p className="text-white/90 text-sm">
              Based on their preferences and interests
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 -mt-6 space-y-4">
          {dateIdeas.slice(0, 3).map((date) => (
            <Card key={date.id} className="p-6 border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-3">{date.image}</div>
              <h3 className="font-semibold mb-2">{date.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{date.description}</p>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{date.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span>{date.budget}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{date.location}</span>
                </div>
                <div className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-center">
                  {date.category}
                </div>
              </div>

              <Button
                onClick={() => selectDateForPartner(date.id)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                Choose This Date
              </Button>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'plan-for-partner' && selectedDate) {
    const date = dateIdeas.find(d => d.id === selectedDate)!;
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
          <div className="max-w-md mx-auto">
            <button 
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-2 mb-6 hover:opacity-80"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            
            <h1 className="text-2xl mb-2">Date Scheduled! 🎉</h1>
            <p className="text-white/90 text-sm">
              Your surprise date for {partnerName} is ready
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 -mt-6 space-y-4">
          <Card className="p-6 border-0 shadow-lg">
            <div className="text-5xl mb-4 text-center">{date.image}</div>
            <h2 className="text-2xl text-center mb-2">{date.title}</h2>
            <p className="text-sm text-gray-600 text-center mb-6">{date.description}</p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-600">Duration</p>
                  <p className="font-semibold">{date.duration}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-600">Location</p>
                  <p className="font-semibold">{date.location}</p>
                </div>
              </div>
            </div>

            <Button
              onClick={onBack}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            >
              Done
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === 'swipe-together' && !isSwipeComplete) {
    const currentDate = dateIdeas[currentSwipeIndex];
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 pb-8">
          <div className="max-w-md mx-auto">
            <button 
              onClick={() => setMode('select')}
              className="flex items-center gap-2 mb-6 hover:opacity-80"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            
            <h1 className="text-2xl mb-2">Swipe for Dates</h1>
            <p className="text-white/90 text-sm mb-4">
              Swipe right for yes, left for no
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all"
                  style={{ width: `${((currentSwipeIndex + 1) / dateIdeas.length) * 100}%` }}
                />
              </div>
              <span className="text-sm">{currentSwipeIndex + 1}/{dateIdeas.length}</span>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 -mt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSwipeIndex}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-8 border-0 shadow-2xl">
                <div className="text-6xl mb-4 text-center">{currentDate.image}</div>
                <h2 className="text-2xl text-center mb-3">{currentDate.title}</h2>
                <p className="text-sm text-gray-600 text-center mb-6">{currentDate.description}</p>
                
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                    <p className="text-xs text-gray-600">{currentDate.duration}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                    <p className="text-xs text-gray-600">{currentDate.budget}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                    <p className="text-xs text-gray-600">{currentDate.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => handleSwipe(false)}
                    variant="outline"
                    className="flex-1 h-16 border-2 border-gray-300 hover:border-red-500 hover:bg-red-50"
                  >
                    <X className="w-8 h-8 text-red-500" />
                  </Button>
                  <Button
                    onClick={() => handleSwipe(true)}
                    className="flex-1 h-16 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                  >
                    <Heart className="w-8 h-8 fill-white" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (mode === 'swipe-together' && isSwipeComplete) {
    const matchedDates = dateIdeas.filter(d => matches.includes(d.id));
    const winningDate = matchedDates.length > 0 ? matchedDates[0] : null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 pb-12">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl mb-2">You Have {matches.length} Matches! 🎉</h1>
            <p className="text-white/90 text-sm">
              {winningDate ? "Here's your winning date" : "No matches this time, try again!"}
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 -mt-6 space-y-4">
          {winningDate && (
            <Card className="p-8 border-0 shadow-lg">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl mb-2">Your Perfect Date</h2>
              </div>

              <div className="text-6xl mb-4 text-center">{winningDate.image}</div>
              <h3 className="text-xl text-center mb-3">{winningDate.title}</h3>
              <p className="text-sm text-gray-600 text-center mb-6">{winningDate.description}</p>
              
              <Button
                onClick={onBack}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                Schedule This Date
              </Button>
            </Card>
          )}

          {matches.length === 0 && (
            <Card className="p-8 border-0 shadow-lg text-center">
              <p className="text-gray-600 mb-4">No matches this time, but that's okay!</p>
              <Button
                onClick={() => {
                  setIsSwipeComplete(false);
                  setCurrentSwipeIndex(0);
                  setUserLikes([]);
                  setMatches([]);
                }}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                Try Again
              </Button>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return null;
}
