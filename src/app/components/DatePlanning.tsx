import React, { useState, useEffect } from 'react';
import { ChevronLeft, Sparkles, Heart, X, Users, CheckCircle, Clock, Zap, Dices } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { dateIdeas } from '../data/dateIdeas';
import { useAuth } from '../contexts/AuthContext';
import { useRelationship } from '../hooks/useRelationship';
import { dateService, type DateIdea, type DateMatch } from '../services/dateService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DatePlanningProps {
  onBack: () => void;
  partnerName: string;
  initialMode?: DateMode;
}

type DateMode = 'select' | 'plan-for-partner' | 'swipe-together' | 'random-challenge';
type SwipeStage = 'welcome' | 'swiping' | 'matches' | 'decision' | 'final';

// Import types that are needed for the component
import { User, Users, Clock, DollarSign, MapPin } from 'lucide-react';
export function DatePlanning({ onBack, partnerName, initialMode = 'select' }: DatePlanningProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<DateMode>(initialMode);
  const [swipeStage, setSwipeStage] = useState<SwipeStage>('welcome');
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<number | string | null>(null);
  const [finalDate, setFinalDate] = useState<number | string | null>(null);
  const [decisionMethod, setDecisionMethod] = useState<'coin' | 'dice' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [challengeDate, setChallengeDate] = useState<typeof dateIdeas[0] | null>(null);

  // Local state for tracking likes when no relationship exists
  const [localLikes, setLocalLikes] = useState<Set<number | string>>(new Set());

  // Determine if current user is partner A
  const isPartnerA = relationship ? user?.id === relationship.partner_a_id : true;

  // Fetch swipe date ideas - get or create database records for relationship
  const { data: swipeDateIdeas = [], isLoading: swipeIdeasLoading } = useQuery({
    queryKey: ['swipe-date-ideas', relationship?.id],
    queryFn: async () => {
      if (!relationship?.id) {
        // If no relationship, return static date ideas
        return dateIdeas;
      }
      // Get or create date ideas in the database for this relationship
      return dateService.getOrCreateSwipeDateIdeas(relationship.id);
    },
    enabled: swipeStage === 'swiping',
  });

  // Fetch date matches (real-time updates)
  const { data: dateMatches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['date-matches', relationship?.id],
    queryFn: async () => {
      if (!relationship?.id) return [];
      return dateService.getMatches(relationship.id);
    },
    enabled: !!relationship?.id,
    refetchInterval: swipeStage === 'swiping' ? 2000 : false, // Poll every 2 seconds during swiping
  });

  // Like/Unlike date idea mutation
  const likeDateMutation = useMutation({
    mutationFn: async ({ dateIdeaId, liked }: { dateIdeaId: string; liked: boolean }) => {
      if (!relationship?.id || !user?.id) throw new Error('Missing relationship or user');

      if (liked) {
        return dateService.likeDateIdea(dateIdeaId, relationship.id, user.id, isPartnerA);
      } else {
        // For unliking, we would need to update the match record
        // For now, we'll just skip to next card
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['date-matches'] });
    },
  });

  // Calculate user's progress (use local state if no relationship)
  const userProgress = relationship?.id
    ? dateMatches.filter(match => {
        return isPartnerA ? match.partner_a_liked : match.partner_b_liked;
      }).length
    : currentSwipeIndex;

  const partnerProgress = relationship?.id
    ? dateMatches.filter(match => {
        return isPartnerA ? match.partner_b_liked : match.partner_a_liked;
      }).length
    : 0; // No partner without relationship

  // Check if user is done swiping
  const isUserDone = currentSwipeIndex >= swipeDateIdeas.length;
  const bothPartnersDone = relationship?.id
    ? (userProgress >= swipeDateIdeas.length && partnerProgress >= swipeDateIdeas.length)
    : isUserDone;

  // Auto-advance to matches when both partners are done
  useEffect(() => {
    if (swipeStage === 'swiping' && bothPartnersDone && swipeDateIdeas.length > 0) {
      // Small delay to show the completion state
      setTimeout(() => {
        setSwipeStage('matches');
      }, 1500);
    }
  }, [swipeStage, bothPartnersDone, swipeDateIdeas.length]);

  const handleSwipe = (liked: boolean) => {
    if (!swipeDateIdeas[currentSwipeIndex]) return;

    const currentDateId = swipeDateIdeas[currentSwipeIndex].id;

    // Record the swipe
    if (liked) {
      // Add to local likes
      setLocalLikes(prev => new Set([...prev, currentDateId]));

      // Also record in database if relationship exists
      if (relationship?.id && user?.id) {
        likeDateMutation.mutate({ dateIdeaId: String(currentDateId), liked: true });
      }
    }

    // Move to next card
    if (currentSwipeIndex < swipeDateIdeas.length - 1) {
      setCurrentSwipeIndex(currentSwipeIndex + 1);
    } else {
      // User is done swiping - go to matches
      setSwipeStage('matches');
    }
  };

  const handleDecision = (method: 'coin' | 'dice') => {
    setDecisionMethod(method);
    setIsAnimating(true);

    // Simulate decision animation
    setTimeout(() => {
      // Get matches from local likes or database
      const matchedIds = relationship?.id
        ? dateMatches.map(match => match.date_idea_id)
        : Array.from(localLikes);

      const randomMatchId = matchedIds[Math.floor(Math.random() * matchedIds.length)];
      setFinalDate(randomMatchId);
      setIsAnimating(false);
      setSwipeStage('final');
    }, 2000);
  };

  const resetSwipeFlow = () => {
    setSwipeStage('welcome');
    setCurrentSwipeIndex(0);
    setSelectedDate(null);
    setFinalDate(null);
    setDecisionMethod(null);
    setIsAnimating(false);
    setLocalLikes(new Set());
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

          <button
            onClick={() => {
              // Generate random date
              const randomDate = dateIdeas[Math.floor(Math.random() * dateIdeas.length)];
              setChallengeDate(randomDate);
              setMode('random-challenge');
            }}
            className="w-full bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-left border-2 border-orange-200 hover:border-orange-400"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  Random Challenge
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                    Dare!
                  </span>
                </h3>
                <p className="text-sm text-gray-600">
                  Feeling spontaneous? Let us pick a random date for you to do!
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-orange-600 font-medium">⚡ No overthinking required</span>
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
          onStart={() => setSwipeStage('swiping')}
          onBack={() => setMode('select')}
        />
      );
    }

    // Simultaneous Swiping
    if (swipeStage === 'swiping') {
      if (swipeIdeasLoading) {
        return (
          <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center">
            <Card className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-pink-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl mb-2">Loading Date Ideas...</h2>
              <p className="text-gray-600">Getting the perfect dates ready for you both!</p>
            </Card>
          </div>
        );
      }

      const currentDate = swipeDateIdeas[currentSwipeIndex];
      const isUserDone = userProgress >= swipeDateIdeas.length;
      const isPartnerDone = partnerProgress >= swipeDateIdeas.length;

      return (
        <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
          {/* Header with Progress */}
          <div className="bg-white shadow-sm">
            <div className="max-w-md mx-auto px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    resetSwipeFlow();
                    setMode('select');
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                <div className="text-sm text-gray-500">
                  {currentSwipeIndex + 1} of {swipeDateIdeas.length}
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">You</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(userProgress / swipeDateIdeas.length) * 100}%` }}
                    />
                  </div>
                  {isUserDone && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-pink-500" />
                  <span className="text-sm font-medium">{partnerName}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(partnerProgress / swipeDateIdeas.length) * 100}%` }}
                    />
                  </div>
                  {isPartnerDone && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
              </div>

              {/* Status Message */}
              <div className="mt-4 text-center">
                {isUserDone && isPartnerDone ? (
                  <div className="text-green-600 font-medium">
                    🎉 Both done! Let's see your matches!
                  </div>
                ) : isUserDone && !isPartnerDone ? (
                  <div className="text-blue-600">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Waiting for {partnerName} to finish...
                  </div>
                ) : !isUserDone && isPartnerDone ? (
                  <div className="text-pink-600">
                    {partnerName} is done! Keep swiping to find matches.
                  </div>
                ) : (
                  <div className="text-gray-600">
                    Swipe right for dates you like! 💕
                  </div>
                )}
              </div>

              {/* Continue Button */}
              {isUserDone && isPartnerDone && (
                <Button
                  onClick={() => setSwipeStage('matches')}
                  className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                >
                  See Our Matches! 💕
                </Button>
              )}
            </div>
          </div>

          {/* Swipe Card */}
          {!isUserDone && (
            <AnimatePresence mode="wait">
              {currentDate && (
                <SwipeableDateCard
                  key={currentSwipeIndex}
                  date={currentDate}
                  onSwipe={handleSwipe}
                  onBack={() => {
                    resetSwipeFlow();
                    setMode('select');
                  }}
                  currentIndex={currentSwipeIndex}
                  totalCount={swipeDateIdeas.length}
                  partnerName="You"
                  isPartner1={true}
                />
              )}
            </AnimatePresence>
          )}

          {/* Waiting State */}
          {isUserDone && !isPartnerDone && (
            <div className="flex-1 flex items-center justify-center p-6">
              <Card className="p-8 text-center max-w-sm">
                <Heart className="w-16 h-16 text-pink-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">You're all done!</h2>
                <p className="text-gray-600 mb-4">
                  Great job swiping through all the dates. Now let's wait for {partnerName} to finish their swipes.
                </p>
                <div className="text-sm text-gray-500">
                  {partnerName} has swiped through {partnerProgress} of {swipeDateIdeas.length} dates
                </div>
              </Card>
            </div>
          )}
        </div>
      );
    }

    // Matches Screen
    if (swipeStage === 'matches') {
      // Get matched date ideas (use local likes if no relationship)
      const matchedDateIds = relationship?.id
        ? dateMatches.map(match => match.date_idea_id) // UUIDs from database
        : Array.from(localLikes);

      const matchedDateIdeas = swipeDateIdeas.filter(idea =>
        matchedDateIds.includes(idea.id as any)
      );

      return (
        <MatchesView
          matches={matchedDateIds}
          dateIdeas={swipeDateIdeas}
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
      const date = swipeDateIdeas.find(d => (d.id as any) === finalDate)!;
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

  // Random Challenge Mode
  if (mode === 'random-challenge' && challengeDate) {
    return (
      <RandomChallengeScreen
        date={challengeDate}
        onAccept={onBack}
        onReroll={() => {
          const randomDate = dateIdeas[Math.floor(Math.random() * dateIdeas.length)];
          setChallengeDate(randomDate);
        }}
        onBack={() => setMode('select')}
      />
    );
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
  const [isExiting, setIsExiting] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-30, 30]);
  const scale = useTransform(x, [-300, -100, 0, 100, 300], [0.8, 0.95, 1, 0.95, 0.8]);
  const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0, 1, 1, 1, 0]);

  const likeOpacity = useTransform(x, [0, 120, 200], [0, 0.8, 1]);
  const likeScale = useTransform(x, [0, 120, 200], [0.8, 1.1, 1.2]);
  const nopeOpacity = useTransform(x, [-200, -120, 0], [1, 0.8, 0]);
  const nopeScale = useTransform(x, [-200, -120, 0], [1.2, 1.1, 0.8]);

  // Reset motion values when component mounts (new card)
  useEffect(() => {
    x.set(0);
    y.set(0);
    setIsExiting(false);
  }, [currentIndex, x, y]);

  const handleDragEnd = (_event: any, info: any) => {
    const threshold = 120;

    if (Math.abs(info.offset.x) > threshold) {
      const liked = info.offset.x > 0;
      setIsExiting(true);

      // Trigger callback immediately for better responsiveness
      onSwipe(liked);
    } else {
      // Spring back to center with smooth animation
      x.set(0, { type: "spring", stiffness: 300, damping: 30 });
      y.set(0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 pt-4 relative" style={{ height: '600px' }}>
        {/* Like overlay */}
        <motion.div
          style={{
            opacity: likeOpacity,
            scale: likeScale
          }}
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        >
          <motion.div
            className="bg-green-500/20 border-4 border-green-500 rounded-3xl p-8 w-full h-full flex items-center justify-center"
            animate={{ scale: likeOpacity.get() > 0.5 ? 1.05 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: likeOpacity.get() > 0.5 ? 1.2 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Heart className="w-20 h-20 text-green-500 fill-green-500 mx-auto mb-4" />
                <p className="text-3xl font-bold text-green-500">LIKE</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Nope overlay */}
        <motion.div
          style={{
            opacity: nopeOpacity,
            scale: nopeScale
          }}
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        >
          <motion.div
            className="bg-red-500/20 border-4 border-red-500 rounded-3xl p-8 w-full h-full flex items-center justify-center"
            animate={{ scale: nopeOpacity.get() > 0.5 ? 1.05 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: nopeOpacity.get() > 0.5 ? 1.2 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <X className="w-20 h-20 text-red-500 mx-auto mb-4" />
                <p className="text-3xl font-bold text-red-500">NOPE</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Swipeable Card */}
        <motion.div
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
          style={{
            x,
            y,
            rotate,
            scale,
            opacity,
            cursor: 'grab'
          }}
          whileDrag={{
            cursor: 'grabbing',
            scale: 1.05
          }}
          exit={{
            x: isExiting ? (x.get() > 0 ? 500 : -500) : 0,
            opacity: 0,
            transition: { duration: 0.3, ease: "easeOut" }
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
          className="absolute inset-0"
        >
          <Card className="border-0 shadow-2xl h-full flex flex-col overflow-hidden relative">
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${date.color || 'from-pink-400 to-purple-500'}`} />

            {/* Content */}
            <div className="relative z-10 p-8 flex flex-col h-full">
              {/* Emoji Icon */}
              <div className="text-8xl mb-6 text-center drop-shadow-lg">
                {date.image}
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-center mb-4 text-white drop-shadow-lg">
                {date.title}
              </h2>

              {/* Description */}
              <p className="text-base text-white text-center mb-8 flex-1 leading-relaxed drop-shadow-md">
                {date.description}
              </p>

              {/* Info Cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <p className="text-xs font-semibold text-gray-900">{date.duration}</p>
                </div>
                <div className="text-center p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-pink-600" />
                  <p className="text-xs font-semibold text-gray-900">{date.budget}</p>
                </div>
                <div className="text-center p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                  <MapPin className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-xs font-semibold text-gray-900">{date.location}</p>
                </div>
              </div>

              {/* Category Badge */}
              <div className="mb-6 text-center">
                <span className="inline-block px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-900 shadow-lg">
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
            <div className={`absolute inset-0 bg-gradient-to-br ${date.color || 'from-pink-400 to-purple-500'}`} />

            {/* Content */}
            <div className="relative z-10">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>

              <div className="text-8xl mb-6 text-center drop-shadow-lg">
                {date.image}
              </div>

              <h2 className="text-3xl font-bold text-center mb-4 text-white drop-shadow-lg">
                {date.title}
              </h2>

              <p className="text-base text-white text-center mb-8 leading-relaxed drop-shadow-md">
                {date.description}
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-700">Duration</p>
                    <p className="font-semibold text-gray-900">{date.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                  <MapPin className="w-6 h-6 text-pink-600" />
                  <div>
                    <p className="text-xs text-gray-700">Location</p>
                    <p className="font-semibold text-gray-900">{date.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-700">Budget</p>
                    <p className="font-semibold text-gray-900">{date.budget}</p>
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

// Random Challenge Screen Component
function RandomChallengeScreen({
  date,
  onAccept,
  onReroll,
  onBack
}: {
  date: typeof dateIdeas[0];
  onAccept: () => void;
  onReroll: () => void;
  onBack: () => void;
}) {
  const [isRolling, setIsRolling] = useState(false);

  const handleReroll = () => {
    setIsRolling(true);
    setTimeout(() => {
      onReroll();
      setIsRolling(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-yellow-50 pb-8">
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="text-center">
            <div className="text-6xl mb-4">⚡</div>
            <h1 className="text-3xl mb-2 font-bold">Your Random Challenge!</h1>
            <p className="text-white/90 text-lg">
              We dare you to do this date together!
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6 space-y-4">
        <motion.div
          key={date.id}
          initial={{ scale: 0.9, opacity: 0, rotateY: -90 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          transition={{
            duration: 0.6,
            type: "spring",
            stiffness: 200,
            damping: 20
          }}
        >
          <Card className="p-8 border-0 shadow-2xl overflow-hidden relative">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-yellow-400 to-pink-400" />

            {/* Content */}
            <div className="relative z-10">
              {/* Challenge Badge */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white font-bold text-sm shadow-lg">
                  <Zap className="w-4 h-4" />
                  <span>CHALLENGE ACCEPTED?</span>
                  <Zap className="w-4 h-4" />
                </div>
              </div>

              <div className="text-8xl mb-6 text-center drop-shadow-lg">
                {date.image}
              </div>

              <h2 className="text-3xl font-bold text-center mb-4 text-white drop-shadow-lg">
                {date.title}
              </h2>

              <p className="text-base text-white text-center mb-8 leading-relaxed drop-shadow-md">
                {date.description}
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                  <div>
                    <p className="text-xs text-gray-700">Duration</p>
                    <p className="font-semibold text-gray-900">{date.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                  <MapPin className="w-6 h-6 text-yellow-600" />
                  <div>
                    <p className="text-xs text-gray-700">Location</p>
                    <p className="font-semibold text-gray-900">{date.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                  <DollarSign className="w-6 h-6 text-pink-600" />
                  <div>
                    <p className="text-xs text-gray-700">Budget</p>
                    <p className="font-semibold text-gray-900">{date.budget}</p>
                  </div>
                </div>
              </div>

              {/* Challenge Details */}
              <Card className="p-4 bg-white/20 backdrop-blur-sm border-white/40 mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🎯</div>
                  <div>
                    <h3 className="font-bold text-white mb-1">The Challenge</h3>
                    <p className="text-sm text-white/90">
                      Complete this date within the next week for maximum relationship points!
                    </p>
                  </div>
                </div>
              </Card>

              <div className="space-y-3">
                <Button
                  onClick={onAccept}
                  disabled={isRolling}
                  className="w-full bg-white hover:bg-white/90 text-orange-600 h-14 text-lg font-bold shadow-xl"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Accept Challenge!
                </Button>
                <Button
                  onClick={handleReroll}
                  disabled={isRolling}
                  variant="outline"
                  className="w-full h-12 bg-white/20 backdrop-blur-sm border-white/40 text-white hover:bg-white/30"
                >
                  {isRolling ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.6, ease: "linear" }}
                        className="mr-2"
                      >
                        <Dices className="w-5 h-5" />
                      </motion.div>
                      Rolling...
                    </>
                  ) : (
                    <>
                      <Dices className="w-5 h-5 mr-2" />
                      Different Challenge
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Fun Stats Card */}
        <Card className="p-4 bg-white border-0 shadow-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">💡 <strong>Pro Tip:</strong> Random dates often lead to the best memories!</p>
            <p className="text-xs text-gray-500">Couples who try random dates report 40% more fun and spontaneity! ✨</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
