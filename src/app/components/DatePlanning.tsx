import { useState } from 'react';
import { ChevronLeft, Sparkles, User, Users, Heart, X, MapPin, Clock, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';

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
    image: "🌅",
    color: "from-orange-400 to-pink-500"
  },
  {
    id: 2,
    title: "Cook a New Recipe Together",
    description: "Choose a cuisine you've never tried before, shop for ingredients together, and make it an adventure in the kitchen.",
    category: "Indoor",
    duration: "2 hours",
    budget: "$$",
    location: "Home",
    image: "👨‍🍳",
    color: "from-amber-400 to-orange-500"
  },
  {
    id: 3,
    title: "Museum & Coffee Date",
    description: "Explore a local museum or art gallery, then discuss your favorite pieces over coffee at a nearby café.",
    category: "Cultural",
    duration: "3-4 hours",
    budget: "$$",
    location: "Downtown",
    image: "🎨",
    color: "from-purple-400 to-pink-500"
  },
  {
    id: 4,
    title: "Stargazing Night",
    description: "Drive to a spot away from city lights, bring blankets and hot chocolate, and spend the evening looking at the stars.",
    category: "Outdoor",
    duration: "2-3 hours",
    budget: "$",
    location: "Outside city",
    image: "✨",
    color: "from-indigo-500 to-purple-600"
  },
  {
    id: 5,
    title: "Spa Night at Home",
    description: "Create a relaxing spa experience with face masks, massage oils, candles, and soothing music.",
    category: "Indoor",
    duration: "2 hours",
    budget: "$",
    location: "Home",
    image: "🧖",
    color: "from-rose-400 to-pink-500"
  },
  {
    id: 6,
    title: "Farmers Market Adventure",
    description: "Browse local produce, sample fresh foods, pick ingredients for a meal you'll cook together later.",
    category: "Outdoor",
    duration: "2-3 hours",
    budget: "$$",
    location: "Farmers market",
    image: "🥬",
    color: "from-green-400 to-emerald-500"
  },
  {
    id: 7,
    title: "Bookstore & Tea Date",
    description: "Browse books together, share your favorite reads, then enjoy tea and pastries at a cozy café.",
    category: "Indoor",
    duration: "2-3 hours",
    budget: "$",
    location: "Bookstore",
    image: "📚",
    color: "from-amber-500 to-yellow-600"
  },
  {
    id: 8,
    title: "Karaoke Night",
    description: "Sing your hearts out at a karaoke bar or rent a private room. Bonus points for duets!",
    category: "Entertainment",
    duration: "2-3 hours",
    budget: "$$",
    location: "Karaoke bar",
    image: "🎤",
    color: "from-pink-500 to-rose-600"
  },
  {
    id: 9,
    title: "Beach Day & Bonfire",
    description: "Spend the day at the beach, build sandcastles, swim, then end with a cozy bonfire as the sun sets.",
    category: "Outdoor",
    duration: "4-6 hours",
    budget: "$$",
    location: "Beach",
    image: "🏖️",
    color: "from-blue-400 to-cyan-500"
  },
  {
    id: 10,
    title: "Wine & Paint Night",
    description: "Get creative together with a paint-and-sip session. No artistic skills required - just fun!",
    category: "Creative",
    duration: "2-3 hours",
    budget: "$$",
    location: "Art studio or home",
    image: "🎨",
    color: "from-purple-500 to-indigo-600"
  },
  {
    id: 11,
    title: "Thrift Store Challenge",
    description: "Give each other a $20 budget and find the most interesting or fun items. Winner buys dinner!",
    category: "Adventure",
    duration: "2-3 hours",
    budget: "$$",
    location: "Thrift stores",
    image: "🛍️",
    color: "from-yellow-400 to-orange-500"
  },
  {
    id: 12,
    title: "Hiking & Waterfall",
    description: "Explore a scenic trail together and discover a hidden waterfall. Pack a picnic for the top!",
    category: "Outdoor",
    duration: "3-4 hours",
    budget: "$",
    location: "Hiking trail",
    image: "⛰️",
    color: "from-green-500 to-emerald-600"
  },
  {
    id: 13,
    title: "Comedy Show Night",
    description: "Laugh together at a local comedy club or open mic night. Shared laughter is the best medicine.",
    category: "Entertainment",
    duration: "2-3 hours",
    budget: "$$",
    location: "Comedy club",
    image: "😂",
    color: "from-yellow-500 to-amber-600"
  },
  {
    id: 14,
    title: "Breakfast in Bed",
    description: "Wake up early, make breakfast together (or surprise them!), and enjoy it cozied up in bed.",
    category: "Indoor",
    duration: "1-2 hours",
    budget: "$",
    location: "Home",
    image: "🍳",
    color: "from-orange-400 to-yellow-500"
  },
  {
    id: 15,
    title: "Arcade & Pizza",
    description: "Relive childhood fun at an arcade, compete for high scores, then share a pizza and talk about your favorite games.",
    category: "Entertainment",
    duration: "2-3 hours",
    budget: "$$",
    location: "Arcade",
    image: "🎮",
    color: "from-blue-500 to-purple-600"
  },
  {
    id: 16,
    title: "Botanical Garden Stroll",
    description: "Wander through beautiful gardens, take photos, and enjoy the peaceful atmosphere together.",
    category: "Outdoor",
    duration: "2-3 hours",
    budget: "$$",
    location: "Botanical garden",
    image: "🌺",
    color: "from-pink-400 to-rose-500"
  },
  {
    id: 17,
    title: "Pottery Making Class",
    description: "Get your hands dirty and create something together. Take home your masterpieces as keepsakes.",
    category: "Creative",
    duration: "2-3 hours",
    budget: "$$",
    location: "Pottery studio",
    image: "🏺",
    color: "from-amber-600 to-orange-700"
  },
  {
    id: 18,
    title: "Food Truck Festival",
    description: "Sample different cuisines from food trucks, share bites, and discover new favorite foods together.",
    category: "Food",
    duration: "2-3 hours",
    budget: "$$",
    location: "Food truck park",
    image: "🍕",
    color: "from-red-400 to-orange-500"
  },
  {
    id: 19,
    title: "Sunrise Yoga & Brunch",
    description: "Start the day with outdoor yoga, then treat yourselves to a delicious brunch at a local spot.",
    category: "Wellness",
    duration: "3-4 hours",
    budget: "$$",
    location: "Park + Brunch spot",
    image: "🧘",
    color: "from-green-300 to-teal-400"
  },
  {
    id: 20,
    title: "Escape Room Challenge",
    description: "Work together to solve puzzles and escape before time runs out. Teamwork makes the dream work!",
    category: "Adventure",
    duration: "1-2 hours",
    budget: "$$",
    location: "Escape room",
    image: "🔐",
    color: "from-gray-600 to-slate-700"
  },
  {
    id: 21,
    title: "Drive-In Movie",
    description: "Cozy up in the car with blankets and snacks, and watch a movie under the stars.",
    category: "Entertainment",
    duration: "2-3 hours",
    budget: "$$",
    location: "Drive-in theater",
    image: "🎬",
    color: "from-indigo-600 to-purple-700"
  },
  {
    id: 22,
    title: "Bike Ride & Ice Cream",
    description: "Rent bikes and explore your city, then stop for ice cream at a local shop.",
    category: "Outdoor",
    duration: "2-3 hours",
    budget: "$",
    location: "City trails",
    image: "🚲",
    color: "from-cyan-400 to-blue-500"
  },
  {
    id: 23,
    title: "Cooking Class Together",
    description: "Learn to make pasta, sushi, or another cuisine from a professional chef. Then enjoy your creation!",
    category: "Food",
    duration: "2-3 hours",
    budget: "$$",
    location: "Cooking school",
    image: "🍝",
    color: "from-red-500 to-pink-600"
  },
  {
    id: 24,
    title: "Antique Shopping",
    description: "Browse antique shops and flea markets, hunt for treasures, and share stories about interesting finds.",
    category: "Shopping",
    duration: "2-3 hours",
    budget: "$$",
    location: "Antique district",
    image: "🕰️",
    color: "from-amber-600 to-yellow-700"
  },
  {
    id: 25,
    title: "Sunset Kayaking",
    description: "Paddle together as the sun sets, enjoy the peaceful water, and maybe spot some wildlife.",
    category: "Outdoor",
    duration: "2-3 hours",
    budget: "$$",
    location: "Lake or river",
    image: "🛶",
    color: "from-blue-400 to-cyan-500"
  },
  {
    id: 26,
    title: "Game Night at Home",
    description: "Break out board games, card games, or video games. Make snacks and compete for bragging rights!",
    category: "Indoor",
    duration: "3-4 hours",
    budget: "$",
    location: "Home",
    image: "🎲",
    color: "from-purple-500 to-indigo-600"
  },
  {
    id: 27,
    title: "Rooftop Bar & City Views",
    description: "Enjoy cocktails with stunning city views, watch the sunset, and have deep conversations.",
    category: "Nightlife",
    duration: "2-3 hours",
    budget: "$$",
    location: "Rooftop bar",
    image: "🍸",
    color: "from-purple-600 to-pink-700"
  },
  {
    id: 28,
    title: "Volunteer Together",
    description: "Give back to your community by volunteering at an animal shelter, food bank, or community garden.",
    category: "Meaningful",
    duration: "2-3 hours",
    budget: "Free",
    location: "Volunteer location",
    image: "❤️",
    color: "from-red-500 to-pink-600"
  },
  {
    id: 29,
    title: "Photography Walk",
    description: "Take a walk with cameras (or phones) and capture interesting moments, architecture, and each other.",
    category: "Creative",
    duration: "2-3 hours",
    budget: "$",
    location: "City or nature",
    image: "📸",
    color: "from-gray-500 to-slate-600"
  },
  {
    id: 30,
    title: "Dance Class",
    description: "Learn salsa, swing, or ballroom dancing together. Laugh at mistakes and enjoy the connection.",
    category: "Active",
    duration: "1-2 hours",
    budget: "$$",
    location: "Dance studio",
    image: "💃",
    color: "from-pink-500 to-rose-600"
  },
  {
    id: 31,
    title: "Farm Visit & Petting Zoo",
    description: "Visit a local farm, interact with animals, pick fresh produce, and enjoy the countryside.",
    category: "Outdoor",
    duration: "3-4 hours",
    budget: "$$",
    location: "Farm",
    image: "🐑",
    color: "from-green-400 to-lime-500"
  },
  {
    id: 32,
    title: "Concert Under the Stars",
    description: "Attend an outdoor concert or music festival. Bring blankets and enjoy live music together.",
    category: "Entertainment",
    duration: "3-4 hours",
    budget: "$$",
    location: "Outdoor venue",
    image: "🎵",
    color: "from-indigo-500 to-purple-600"
  },
  {
    id: 33,
    title: "DIY Craft Night",
    description: "Pick a craft project - make candles, tie-dye shirts, or create something unique together.",
    category: "Creative",
    duration: "2-3 hours",
    budget: "$$",
    location: "Home",
    image: "🕯️",
    color: "from-yellow-400 to-orange-500"
  },
  {
    id: 34,
    title: "Ghost Tour",
    description: "Take a spooky walking tour of your city's haunted spots. Hold hands if you get scared!",
    category: "Adventure",
    duration: "1-2 hours",
    budget: "$$",
    location: "Historic district",
    image: "👻",
    color: "from-gray-700 to-slate-800"
  },
  {
    id: 35,
    title: "Beach Volleyball & Smoothies",
    description: "Play beach volleyball, work up a sweat, then cool down with fresh smoothies.",
    category: "Active",
    duration: "2-3 hours",
    budget: "$",
    location: "Beach",
    image: "🏐",
    color: "from-blue-400 to-teal-500"
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
      <SwipeableDateCard
        date={currentDate}
        onSwipe={handleSwipe}
        onBack={() => setMode('select')}
        currentIndex={currentSwipeIndex}
        totalCount={dateIdeas.length}
      />
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

// Swipeable Date Card Component
function SwipeableDateCard({ 
  date, 
  onSwipe, 
  onBack,
  currentIndex,
  totalCount 
}: { 
  date: typeof dateIdeas[0]; 
  onSwipe: (liked: boolean) => void;
  onBack: () => void;
  currentIndex: number;
  totalCount: number;
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
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 pb-8">
        <div className="max-w-md mx-auto">
          <button 
            onClick={onBack}
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
