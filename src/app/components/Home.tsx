import { Heart, MessageCircle, Calendar, Gift, Sparkles, Camera, Settings, Lock, Mail, HandHeart, Star, Bookmark, TrendingUp, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion } from 'motion/react';
import { PartnerConnection } from './PartnerConnection';
import { useDailyQuestion } from '../hooks/useDailyQuestion';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { useQuestionStats } from '../hooks/useQuestionStats';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { useQuery } from '@tanstack/react-query';
import { onboardingService } from '../services/onboardingService';
import { getUpcomingEvents, formatDaysUntil, formatEventDate } from '../utils/upcomingEvents';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useUnreadRequests } from '../hooks/useUnreadRequests';

interface HomeProps {
  userName: string;
  partnerName: string;
  onNavigate: (page: string) => void;
}

export function Home({ userName, partnerName: partnerNameProp, onNavigate }: HomeProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { hasAnswered, hasGuessed, canSeeFeedback } = useDailyQuestion();
  const { totalCompleted, currentStreak } = useQuestionStats();
  const { partnerName: partnerNameFromOnboarding, partnerBirthday } = usePartnerOnboarding();
  const { unreadCount } = useUnreadMessages();
  const { pendingCount } = useUnreadRequests();
  const hasCompletedDailyQuestion = hasAnswered && hasGuessed;

  // Use partner's actual name from their onboarding, fallback to prop
  const partnerName = partnerNameFromOnboarding || partnerNameProp;

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user,
  });

  // Get upcoming events
  const upcomingEvents = relationship ? getUpcomingEvents(partnerName, partnerBirthday) : [];
  const nextEvent = upcomingEvents[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-24">
      {/* Simplified Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Welcome back,</p>
              <h1 className="text-2xl font-bold">{userName}</h1>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-4">
        {/* Partner Connection - Compact */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <PartnerConnection partnerName={partnerName} />
        </motion.div>

        {/* Stats Row - Only show when connected */}
        {relationship && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-3 gap-3 mb-6 mt-6"
          >
            <Card className="p-3 text-center border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <div className="text-xl font-bold text-pink-600">{currentStreak}</div>
              <div className="text-xs text-gray-600">Day Streak</div>
            </Card>
            <Card className="p-3 text-center border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <div className="text-xl font-bold text-purple-600">{totalCompleted}</div>
              <div className="text-xs text-gray-600">Questions</div>
            </Card>
            <Card className="p-3 text-center border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <div className="text-xl font-bold text-pink-600">{nextEvent ? formatDaysUntil(nextEvent.daysUntil) : '—'}</div>
              <div className="text-xs text-gray-600">Next Event</div>
            </Card>
          </motion.div>
        )}

        {/* Today's Focus - Compact */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Today's Question</h2>
          <Card className="border-0 shadow-md bg-white overflow-hidden">
            <button
              onClick={() => onNavigate('daily-question')}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              disabled={!relationship}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  hasCompletedDailyQuestion
                    ? 'bg-gradient-to-br from-green-400 to-green-500'
                    : canSeeFeedback
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse'
                    : 'bg-gradient-to-br from-pink-500 to-purple-500'
                }`}>
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  {canSeeFeedback ? (
                    <>
                      <h3 className="font-semibold text-sm">Results Ready! 🎉</h3>
                      <p className="text-xs text-gray-600">See if you got it right</p>
                    </>
                  ) : hasCompletedDailyQuestion ? (
                    <>
                      <h3 className="font-semibold text-sm">Waiting for {partnerName}</h3>
                      <p className="text-xs text-gray-600">We'll notify you!</p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-sm">Answer & Guess</h3>
                      <p className="text-xs text-gray-600">How well do you know each other?</p>
                    </>
                  )}
                </div>
                {hasAnswered && !hasGuessed && (
                  <div className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                    {partnerName} answered
                  </div>
                )}
              </div>
            </button>
          </Card>
        </motion.div>

        {/* Quick Actions - Compact */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('messages')}
              className="relative bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-left"
            >
              {unreadCount > 0 && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                  {unreadCount}
                </div>
              )}
              <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center mb-2">
                <Mail className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="font-semibold text-sm">Messages</h3>
              <p className="text-xs text-gray-600">
                {unreadCount > 0 ? `${unreadCount} new` : 'Send love'}
              </p>
            </button>

            <button
              onClick={() => onNavigate('requests')}
              className="relative bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-left"
            >
              {pendingCount > 0 && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                  {pendingCount}
                </div>
              )}
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center mb-2">
                <HandHeart className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-sm">Requests</h3>
              <p className="text-xs text-gray-600">
                {pendingCount > 0 ? `${pendingCount} pending` : 'Ask away'}
              </p>
            </button>
          </div>
        </motion.div>

        {/* Discover - Organized Categories */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Discover</h2>

          {/* Featured: Dragon Pet */}
          <button
            onClick={() => onNavigate('dragon')}
            className="w-full bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-2xl shadow-md hover:shadow-lg transition-all text-left mb-3 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">Dragon Pet 🐉</h3>
                <p className="text-xs text-white/90">Grow together with activities</p>
              </div>
              <div className="text-xs text-white/80 font-medium">NEW</div>
            </div>
          </button>

          {/* Grid of Features */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => onNavigate('dates')}
              className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-xs">Dates</h3>
            </button>

            <button
              onClick={() => onNavigate('love-language')}
              className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="font-semibold text-xs">Love Ideas</h3>
            </button>

            <button
              onClick={() => onNavigate('gifts')}
              className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Gift className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="font-semibold text-xs">Gifts</h3>
            </button>

            <button
              onClick={() => onNavigate('insights')}
              className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-xs">Insights</h3>
            </button>

            <button
              onClick={() => onNavigate('memories')}
              className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Camera className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="font-semibold text-xs">Memories</h3>
            </button>

            <button
              onClick={() => onNavigate('vault')}
              className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-center"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-xs text-white">Vault</h3>
            </button>
          </div>
        </motion.div>

        {/* More Tools - Collapsible */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mb-6"
        >
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between px-1 py-2">
                <h2 className="text-sm font-semibold text-gray-700">More Tools</h2>
                <Zap className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
              </div>
            </summary>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <button
                onClick={() => onNavigate('tracker')}
                className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-center"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-5 h-5 text-pink-600" />
                </div>
                <h3 className="font-semibold text-xs">Dates</h3>
              </button>

              <button
                onClick={() => onNavigate('weekly-wishes')}
                className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-center"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Star className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-xs">Wishes</h3>
              </button>

              <button
                onClick={() => onNavigate('nudges')}
                className="bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition-all text-center"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Bookmark className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-xs">Nudges</h3>
              </button>
            </div>
          </details>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 px-6 py-3 safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-pink-500">
            <Heart className="w-6 h-6 fill-pink-500" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button
            onClick={() => onNavigate('dates')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-xs">Dates</span>
          </button>
          <button
            onClick={() => onNavigate('dragon')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="text-xl">🐉</span>
            <span className="text-xs">Dragon</span>
          </button>
          <button
            onClick={() => onNavigate('memories')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs">Memories</span>
          </button>
        </div>
      </div>
    </div>
  );
}
