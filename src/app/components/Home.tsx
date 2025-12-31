import { Heart, MessageCircle, Calendar, Gift, Sparkles, Camera, Settings, Lock, Mail, HandHeart, Star, Bookmark, TrendingUp, ChevronRight } from 'lucide-react';
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
import { getUpcomingEvents, formatDaysUntil } from '../utils/upcomingEvents';
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

  const partnerName = partnerNameFromOnboarding || partnerNameProp;

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user,
  });

  const upcomingEvents = relationship ? getUpcomingEvents(partnerName, partnerBirthday) : [];
  const nextEvent = upcomingEvents[0];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-0.5">Good day,</p>
              <h1 className="text-2xl font-bold text-gray-900">{userName}</h1>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Partner Connection */}
          <PartnerConnection partnerName={partnerName} />
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-6 space-y-6">
        {/* Today's Question - Clean Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => onNavigate('daily-question')}
            className="w-full bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left border border-gray-100"
            disabled={!relationship}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                canSeeFeedback
                  ? 'bg-emerald-50'
                  : hasCompletedDailyQuestion
                  ? 'bg-amber-50'
                  : 'bg-purple-50'
              }`}>
                <MessageCircle className={`w-6 h-6 ${
                  canSeeFeedback
                    ? 'text-emerald-600'
                    : hasCompletedDailyQuestion
                    ? 'text-amber-600'
                    : 'text-purple-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">Today's Question</h3>
                {canSeeFeedback ? (
                  <p className="text-sm text-gray-600">Results ready! See if you guessed right</p>
                ) : hasCompletedDailyQuestion ? (
                  <p className="text-sm text-gray-600">Waiting for {partnerName} to answer</p>
                ) : (
                  <p className="text-sm text-gray-600">Answer together and guess each other's responses</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
            </div>
          </button>
        </motion.div>

        {/* Stats - Minimal */}
        {relationship && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="text-center pr-4">
                <div className="text-2xl font-bold text-gray-900 mb-1">{currentStreak}</div>
                <div className="text-xs text-gray-500">Day Streak</div>
              </div>
              <div className="text-center px-4">
                <div className="text-2xl font-bold text-gray-900 mb-1">{totalCompleted}</div>
                <div className="text-xs text-gray-500">Questions</div>
              </div>
              <div className="text-center pl-4">
                <div className="text-2xl font-bold text-gray-900 mb-1">{nextEvent ? formatDaysUntil(nextEvent.daysUntil) : '—'}</div>
                <div className="text-xs text-gray-500">Next Event</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Quick Actions</h2>

          <button
            onClick={() => onNavigate('messages')}
            className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left border border-gray-100 relative"
          >
            {unreadCount > 0 && (
              <div className="absolute top-4 right-4 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {unreadCount}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">Love Messages</h3>
                <p className="text-xs text-gray-500">
                  {unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : 'Send sweet notes'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          <button
            onClick={() => onNavigate('requests')}
            className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left border border-gray-100 relative"
          >
            {pendingCount > 0 && (
              <div className="absolute top-4 right-4 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {pendingCount}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <HandHeart className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">Partner Requests</h3>
                <p className="text-xs text-gray-500">
                  {pendingCount > 0 ? `${pendingCount} pending` : 'Ask for what you need'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        </motion.div>

        {/* Main Features - Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Discover</h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('dates')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-left border border-gray-100"
            >
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-0.5">Date Ideas</h3>
              <p className="text-xs text-gray-500">Plan together</p>
            </button>

            <button
              onClick={() => onNavigate('love-language')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-left border border-gray-100"
            >
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                <Heart className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-0.5">Love Ideas</h3>
              <p className="text-xs text-gray-500">Weekly tips</p>
            </button>

            <button
              onClick={() => onNavigate('gifts')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-left border border-gray-100"
            >
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                <Gift className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-0.5">Gift Ideas</h3>
              <p className="text-xs text-gray-500">Thoughtful</p>
            </button>

            <button
              onClick={() => onNavigate('memories')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-left border border-gray-100"
            >
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                <Camera className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-0.5">Memories</h3>
              <p className="text-xs text-gray-500">Scrapbook</p>
            </button>

            <button
              onClick={() => onNavigate('tracker')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-left border border-gray-100"
            >
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-0.5">Calendar</h3>
              <p className="text-xs text-gray-500">Key dates</p>
            </button>

            <button
              onClick={() => onNavigate('insights')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-left border border-gray-100"
            >
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-0.5">Insights</h3>
              <p className="text-xs text-gray-500">Learn more</p>
            </button>
          </div>
        </motion.div>

        {/* More - Simple List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">More</h2>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            <button
              onClick={() => onNavigate('vault')}
              className="w-full p-4 hover:bg-gray-50 transition-colors text-left first:rounded-t-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">Surprise Vault</h3>
                  <p className="text-xs text-gray-500">Secret plans</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>

            <button
              onClick={() => onNavigate('weekly-wishes')}
              className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">Weekly Wishes</h3>
                  <p className="text-xs text-gray-500">Share your week</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>

            <button
              onClick={() => onNavigate('nudges')}
              className="w-full p-4 hover:bg-gray-50 transition-colors text-left last:rounded-b-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">Love Nudges</h3>
                  <p className="text-xs text-gray-500">Daily reminders</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom Navigation - Clean */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 py-2">
            <Heart className="w-6 h-6 text-purple-600 fill-purple-600" />
            <span className="text-xs font-medium text-purple-600">Home</span>
          </button>
          <button
            onClick={() => onNavigate('dates')}
            className="flex flex-col items-center gap-1 py-2"
          >
            <Sparkles className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400">Dates</span>
          </button>
          <button
            onClick={() => onNavigate('tracker')}
            className="flex flex-col items-center gap-1 py-2"
          >
            <Calendar className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400">Calendar</span>
          </button>
          <button
            onClick={() => onNavigate('memories')}
            className="flex flex-col items-center gap-1 py-2"
          >
            <Camera className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400">Memories</span>
          </button>
        </div>
      </div>
    </div>
  );
}
