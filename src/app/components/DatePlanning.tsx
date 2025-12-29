import { useState } from 'react';
import { ChevronLeft, Sparkles, Heart, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { dateIdeas } from '../data/dateIdeas';

interface DatePlanningProps {
  onBack: () => void;
  partnerName: string;
}

// Transform the imported date ideas to match the expected format
const mockDateIdeas = dateIdeas.map(idea => ({
  id: idea.id,
  title: idea.title,
  description: idea.description,
  category: idea.category.charAt(0).toUpperCase() + idea.category.slice(1),
  duration: "2-3 hours",
  budget: idea.category === 'food' ? "$$" : idea.category === 'adventure' ? "$$$" : "$",
  location: "TBD",
  image: idea.image,
  color: getColorForCategory(idea.category)
}));

const getColorForCategory = (category: string) => {
  const colors = {
    adventure: "from-orange-400 to-pink-500",
    romantic: "from-pink-400 to-rose-500",
    cultural: "from-purple-400 to-pink-500",
    fun: "from-yellow-400 to-orange-500",
    relaxing: "from-green-400 to-emerald-500",
    food: "from-red-400 to-pink-500"
  };
  return colors[category as keyof typeof colors] || "from-gray-400 to-gray-500";
};

export function DatePlanning({ onBack, partnerName }: DatePlanningProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedDates, setSavedDates] = useState<number[]>([]);

  const currentDate = mockDateIdeas[currentIndex];

  const nextDate = () => {
    setCurrentIndex((prev) => (prev + 1) % mockDateIdeas.length);
  };

  const prevDate = () => {
    setCurrentIndex((prev) => (prev - 1 + mockDateIdeas.length) % mockDateIdeas.length);
  };

  const saveDate = (id: number) => {
    setSavedDates(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-16">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Date Ideas</h1>
              <p className="text-sm opacity-90">Find the perfect date for you two</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-10 pb-24">
        {/* Date Card */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6 mb-6 shadow-xl border-0 bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16"></div>

            <div className="relative">
              {/* Image */}
              <div className="w-full h-48 mb-4 rounded-2xl overflow-hidden">
                <img
                  src={currentDate.image}
                  alt={currentDate.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback for broken images
                    const target = e.target as HTMLImageElement;
                    target.src = `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400`;
                  }}
                />
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{currentDate.title}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${currentDate.color}`}>
                      {currentDate.category}
                    </span>
                  </div>
                  <button
                    onClick={() => saveDate(currentDate.id)}
                    className={`p-2 rounded-full transition-colors ${
                      savedDates.includes(currentDate.id)
                        ? 'bg-pink-100 text-pink-600'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${savedDates.includes(currentDate.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <p className="text-gray-600 text-sm leading-relaxed">{currentDate.description}</p>

                {/* Details */}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Sparkles className="w-3 h-3" />
                    {currentDate.duration}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="font-medium">{currentDate.budget}</span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={prevDate}
                  className="flex-1 mr-2"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500 px-2">
                  {currentIndex + 1} / {mockDateIdeas.length}
                </span>
                <Button
                  onClick={nextDate}
                  className="flex-1 ml-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Saved Dates Summary */}
        {savedDates.length > 0 && (
          <Card className="p-4 mb-6 border-0 shadow-md bg-gradient-to-r from-pink-50 to-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-pink-600" />
              <span className="text-sm font-semibold">Saved Dates ({savedDates.length})</span>
            </div>
            <p className="text-xs text-gray-600">
              You've saved {savedDates.length} date idea{savedDates.length !== 1 ? 's' : ''} to try with {partnerName}!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

export function DatePlanning({ onBack, partnerName }: DatePlanningProps) {
  const [mode, setMode] = useState<DateMode>('select');
  const [swipeStage, setSwipeStage] = useState<SwipeStage>('welcome');
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);
  const [partner1Likes, setPartner1Likes] = useState<number[]>([]);
  const [partner2Likes, setPartner2Likes] = useState<number[]>([]);
  const [matches, setMatches] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [finalDate, setFinalDate] = useState<number | null>(null);
  const [decisionMethod, setDecisionMethod] = useState<'coin' | 'dice' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSwipe = (liked: boolean) => {
    const currentDateId = dateIdeas[currentSwipeIndex].id;

    if (swipeStage === 'partner1') {
      if (liked) {
        setPartner1Likes(prev => [...prev, currentDateId]);
      }

      if (currentSwipeIndex < dateIdeas.length - 1) {
        setCurrentSwipeIndex(currentSwipeIndex + 1);
      } else {
        // Partner 1 done, move to partner 2
        setCurrentSwipeIndex(0);
        setSwipeStage('partner2');
      }
    } else if (swipeStage === 'partner2') {
      if (liked) {
        setPartner2Likes(prev => [...prev, currentDateId]);
      }

      if (currentSwipeIndex < dateIdeas.length - 1) {
        setCurrentSwipeIndex(currentSwipeIndex + 1);
      } else {
        // Partner 2 done, calculate matches
        const p2Likes = liked ? [...partner2Likes, currentDateId] : partner2Likes;
        const matchedDates = partner1Likes.filter(id => p2Likes.includes(id));
        setMatches(matchedDates);
        setSwipeStage('matches');
      }
    }
  };

  const handleDecision = (method: 'coin' | 'dice') => {
    setDecisionMethod(method);
    setIsAnimating(true);

    // Simulate decision animation
    setTimeout(() => {
      const randomMatch = matches[Math.floor(Math.random() * matches.length)];
      setFinalDate(randomMatch);
      setIsAnimating(false);
      setSwipeStage('final');
    }, 2000);
  };

  const resetSwipeFlow = () => {
    setSwipeStage('welcome');
    setCurrentSwipeIndex(0);
    setPartner1Likes([]);
    setPartner2Likes([]);
    setMatches([]);
    setFinalDate(null);
    setDecisionMethod(null);
    setIsAnimating(false);
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
            onClick={() => {
              setMode('swipe-together');
              setSwipeStage('welcome');
            }}
            className="w-full bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Choose Together</h3>
                <p className="text-sm text-gray-600">
                  Both swipe on date ideas and find your perfect match
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

  // Swipe Together Flow
  if (mode === 'swipe-together') {
    // Welcome Screen
    if (swipeStage === 'welcome') {
      return (
        <WelcomeScreen
          partnerName={partnerName}
          onStart={() => setSwipeStage('partner1')}
          onBack={() => setMode('select')}
        />
      );
    }

    // Partner 1 or Partner 2 Swiping
    if (swipeStage === 'partner1' || swipeStage === 'partner2') {
      const currentDate = dateIdeas[currentSwipeIndex];
      const isPartner1 = swipeStage === 'partner1';

      return (
        <SwipeableDateCard
          date={currentDate}
          onSwipe={handleSwipe}
          onBack={() => {
            resetSwipeFlow();
            setMode('select');
          }}
          currentIndex={currentSwipeIndex}
          totalCount={dateIdeas.length}
          partnerName={isPartner1 ? 'You' : partnerName}
          isPartner1={isPartner1}
        />
      );
    }

    // Matches Screen
    if (swipeStage === 'matches') {
      return (
        <MatchesView
          matches={matches}
          dateIdeas={dateIdeas}
          onContinue={() => setSwipeStage('decision')}
          onTryAgain={resetSwipeFlow}
        />
      );
    }

    // Decision Maker Screen
    if (swipeStage === 'decision') {
      return (
        <DecisionMaker
          onDecide={handleDecision}
          isAnimating={isAnimating}
          decisionMethod={decisionMethod}
        />
      );
    }

    // Final Result Screen
    if (swipeStage === 'final' && finalDate) {
      const date = dateIdeas.find(d => d.id === finalDate)!;
      return (
        <FinalDateScreen
          date={date}
          onDone={onBack}
          onTryAgain={() => {
            resetSwipeFlow();
          }}
        />
      );
    }
  }

  return null;
}

// Welcome Screen Component
function WelcomeScreen({
  partnerName,
  onStart,
  onBack
}: {
  partnerName: string;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 pb-12">
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
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <h1 className="text-2xl">Date Night Swipe</h1>
          </div>
          <p className="text-white/90 text-sm">
            Like Tinder, but for finding your perfect date together!
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6 space-y-6">
        <Card className="p-8 border-0 shadow-lg">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">💑</div>
            <h2 className="text-2xl mb-3">How It Works</h2>
            <p className="text-gray-600">
              Both you and {partnerName} will swipe through date ideas separately, then we'll show you the matches!
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
              <div className="w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">You Swipe First</h3>
                <p className="text-sm text-gray-600">Swipe right on dates you like, left on ones you don't</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
              <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Pass to {partnerName}</h3>
                <p className="text-sm text-gray-600">Then {partnerName} swipes through the same dates</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">See Your Matches</h3>
                <p className="text-sm text-gray-600">We'll show you dates you both liked!</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Pick the Winner</h3>
                <p className="text-sm text-gray-600">Use a coin flip or dice roll to choose your final date</p>
              </div>
            </div>
          </div>

          <Button
            onClick={onStart}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white h-14 text-lg"
          >
            Start Swiping
          </Button>
        </Card>
      </div>
    </div>
  );
}

// Swipeable Date Card Component
function SwipeableDateCard({
  date,
  onSwipe,
  onBack,
  currentIndex,
  totalCount,
  partnerName,
  isPartner1
}: {
  date: typeof dateIdeas[0];
  onSwipe: (liked: boolean) => void;
  onBack: () => void;
  currentIndex: number;
  totalCount: number;
  partnerName: string;
  isPartner1: boolean;
}) {
  const [exitX, setExitX] = useState<number | string>('100%');
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  const likeOpacity = useTransform(x, [0, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-150, 0], [1, 0]);

  const handleDragEnd = (_event: any, info: any) => {
    const threshold = 100;
    
    if (Math.abs(info.offset.x) > threshold) {
      const liked = info.offset.x > 0;
      setExitX(info.offset.x > 0 ? '100%' : '-100%');
      setTimeout(() => {
        onSwipe(liked);
        x.set(0);
      }, 100);
    } else {
      // Spring back to center
      x.set(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
      <div className={`bg-gradient-to-r ${isPartner1 ? 'from-purple-500 to-pink-500' : 'from-pink-500 to-purple-500'} text-white p-6 pb-8`}>
        <div className="max-w-md mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <h1 className="text-2xl">{partnerName}'s Turn</h1>
          </div>
          <p className="text-white/90 text-sm mb-4">
            Swipe right ❤️ for yes, left ✕ for no
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-sm">{currentIndex + 1}/{totalCount}</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-2 relative" style={{ height: '600px' }}>
        {/* Like overlay */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        >
          <div className="bg-green-500/20 border-4 border-green-500 rounded-3xl p-8 w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Heart className="w-20 h-20 text-green-500 fill-green-500 mx-auto mb-4" />
              <p className="text-3xl font-bold text-green-500">LIKE</p>
            </div>
          </div>
        </motion.div>

        {/* Nope overlay */}
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        >
          <div className="bg-red-500/20 border-4 border-red-500 rounded-3xl p-8 w-full h-full flex items-center justify-center">
            <div className="text-center">
              <X className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <p className="text-3xl font-bold text-red-500">NOPE</p>
            </div>
          </div>
        </motion.div>

        {/* Swipeable Card */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          style={{ 
            x, 
            rotate,
            opacity,
            cursor: 'grab'
          }}
          whileDrag={{ cursor: 'grabbing' }}
          className="absolute inset-0"
        >
          <Card className="border-0 shadow-2xl h-full flex flex-col overflow-hidden relative">
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${date.color || 'from-pink-400 to-purple-500'} opacity-10`} />
            
            {/* Content */}
            <div className="relative z-10 p-8 flex flex-col h-full">
              {/* Emoji Icon */}
              <div className="text-8xl mb-6 text-center drop-shadow-lg">
                {date.image}
              </div>
              
              {/* Title */}
              <h2 className="text-3xl font-bold text-center mb-4 text-gray-800">
                {date.title}
              </h2>
              
              {/* Description */}
              <p className="text-base text-gray-700 text-center mb-8 flex-1 leading-relaxed">
                {date.description}
              </p>
              
              {/* Info Cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <p className="text-xs font-semibold text-gray-700">{date.duration}</p>
                </div>
                <div className="text-center p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-pink-600" />
                  <p className="text-xs font-semibold text-gray-700">{date.budget}</p>
                </div>
                <div className="text-center p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50">
                  <MapPin className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-xs font-semibold text-gray-700">{date.location}</p>
                </div>
              </div>

              {/* Category Badge */}
              <div className="mb-6 text-center">
                <span className="inline-block px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700 shadow-sm">
                  {date.category}
                </span>
              </div>

              {/* Button fallback for non-touch devices */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => {
                    setExitX('-100%');
                    setTimeout(() => onSwipe(false), 100);
                  }}
                  variant="outline"
                  className="flex-1 h-16 border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 transition-all"
                >
                  <X className="w-8 h-8 text-red-500" />
                </Button>
                <Button
                  onClick={() => {
                    setExitX('100%');
                    setTimeout(() => onSwipe(true), 100);
                  }}
                  className="flex-1 h-16 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg transition-all"
                >
                  <Heart className="w-8 h-8 fill-white" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// Matches View Component
function MatchesView({
  matches,
  dateIdeas,
  onContinue,
  onTryAgain
}: {
  matches: number[];
  dateIdeas: typeof dateIdeas;
  onContinue: () => void;
  onTryAgain: () => void;
}) {
  const matchedDates = dateIdeas.filter(d => matches.includes(d.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl mb-2">It's a Match!</h1>
            <p className="text-white/90 text-lg">
              You both liked {matches.length} {matches.length === 1 ? 'date' : 'dates'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6 space-y-4">
        {matchedDates.length === 0 ? (
          <Card className="p-8 border-0 shadow-lg text-center">
            <div className="text-5xl mb-4">😅</div>
            <h2 className="text-2xl mb-3">No Matches This Time</h2>
            <p className="text-gray-600 mb-6">
              You didn't both like any of the same dates. Try again with more open minds!
            </p>
            <Button
              onClick={onTryAgain}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
            >
              Try Again
            </Button>
          </Card>
        ) : (
          <>
            {matchedDates.map((date) => (
              <Card key={date.id} className="p-6 border-0 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="text-5xl">{date.image}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2 text-lg">{date.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{date.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-3 py-1 bg-pink-100 text-pink-700 rounded-full">
                        {date.category}
                      </span>
                      <span className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                        {date.duration}
                      </span>
                      <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {date.budget}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {matchedDates.length > 1 && (
              <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-pink-50 to-purple-50">
                <p className="text-center text-sm text-gray-700 mb-4">
                  💡 Can't decide? Let fate choose your perfect date!
                </p>
                <Button
                  onClick={onContinue}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                >
                  Let Fate Decide
                </Button>
              </Card>
            )}

            {matchedDates.length === 1 && (
              <Button
                onClick={onContinue}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              >
                Choose This Date
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Decision Maker Component
function DecisionMaker({
  onDecide,
  isAnimating,
  decisionMethod
}: {
  onDecide: (method: 'coin' | 'dice') => void;
  isAnimating: boolean;
  decisionMethod: 'coin' | 'dice' | null;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">🎲</div>
          <h1 className="text-3xl mb-2">Decision Time!</h1>
          <p className="text-white/90 text-lg">
            Choose how to pick your final date
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6 space-y-4">
        {!isAnimating ? (
          <>
            <button
              onClick={() => onDecide('coin')}
              className="w-full bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all text-left border-2 border-transparent hover:border-pink-500"
            >
              <div className="flex items-center gap-4">
                <div className="text-6xl">🪙</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold mb-2">Coin Flip</h3>
                  <p className="text-gray-600">
                    Classic 50/50 decision - heads or tails?
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => onDecide('dice')}
              className="w-full bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all text-left border-2 border-transparent hover:border-purple-500"
            >
              <div className="flex items-center gap-4">
                <div className="text-6xl">🎲</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold mb-2">Roll the Dice</h3>
                  <p className="text-gray-600">
                    Let the dice decide your destiny!
                  </p>
                </div>
              </div>
            </button>
          </>
        ) : (
          <Card className="p-12 border-0 shadow-lg text-center">
            <motion.div
              animate={{
                rotate: [0, 360, 720, 1080],
                scale: [1, 1.2, 0.8, 1.2, 1]
              }}
              transition={{
                duration: 2,
                ease: "easeInOut"
              }}
              className="text-8xl mb-6"
            >
              {decisionMethod === 'coin' ? '🪙' : '🎲'}
            </motion.div>
            <h2 className="text-2xl font-semibold mb-2">
              {decisionMethod === 'coin' ? 'Flipping...' : 'Rolling...'}
            </h2>
            <p className="text-gray-600">Making your decision...</p>
          </Card>
        )}
      </div>
    </div>
  );
}

// Final Date Screen Component
function FinalDateScreen({
  date,
  onDone,
  onTryAgain
}: {
  date: typeof dateIdeas[0];
  onDone: () => void;
  onTryAgain: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">✨</div>
          <h1 className="text-3xl mb-2">Your Perfect Date!</h1>
          <p className="text-white/90 text-lg">
            Time to make some memories together
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6 space-y-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <Card className="p-8 border-0 shadow-2xl overflow-hidden relative">
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${date.color || 'from-pink-400 to-purple-500'} opacity-10`} />

            {/* Content */}
            <div className="relative z-10">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>

              <div className="text-8xl mb-6 text-center drop-shadow-lg">
                {date.image}
              </div>

              <h2 className="text-3xl font-bold text-center mb-4 text-gray-800">
                {date.title}
              </h2>

              <p className="text-base text-gray-700 text-center mb-8 leading-relaxed">
                {date.description}
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                  <Clock className="w-6 h-6 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Duration</p>
                    <p className="font-semibold text-gray-800">{date.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                  <MapPin className="w-6 h-6 text-pink-600" />
                  <div>
                    <p className="text-xs text-gray-600">Location</p>
                    <p className="font-semibold text-gray-800">{date.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Budget</p>
                    <p className="font-semibold text-gray-800">{date.budget}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={onDone}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white h-14 text-lg"
                >
                  Schedule This Date
                </Button>
                <Button
                  onClick={onTryAgain}
                  variant="outline"
                  className="w-full h-12"
                >
                  Choose Different Date
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
