import { Heart, MessageCircle, Calendar, Gift, Sparkles, Camera, Settings, Mail, HandHeart } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-white/80 mb-1">Welcome back,</p>
              <h1 className="text-2xl font-bold">{userName}</h1>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <PartnerConnection partnerName={partnerName} />
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-6 space-y-6">
        {/* Today's Question - Main Focus */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => onNavigate('daily-question')}
            className="w-full bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all text-left"
            disabled={!relationship}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                canSeeFeedback
                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                  : hasCompletedDailyQuestion
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                  : 'bg-gradient-to-br from-pink-500 to-purple-500'
              }`}>
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Today's Question</h2>
                {canSeeFeedback ? (
                  <p className="text-sm text-emerald-600 font-medium">Results ready! 🎉</p>
                ) : hasCompletedDailyQuestion ? (
                  <p className="text-sm text-amber-600 font-medium">Waiting for {partnerName}...</p>
                ) : (
                  <p className="text-sm text-purple-600 font-medium">Ready to answer</p>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {canSeeFeedback
                ? 'See if you guessed correctly'
                : hasCompletedDailyQuestion
                ? 'We\'ll notify you when they respond'
                : 'Answer and guess each other\'s responses'}
            </p>
          </button>
        </motion.div>

        {/* Stats */}
        {relationship && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-3 gap-3"
          >
            <Card className="p-4 text-center bg-gradient-to-br from-pink-500 to-purple-500 text-white border-0 shadow-md">
              <div className="text-2xl font-bold mb-1">{currentStreak}</div>
              <div className="text-xs text-white/90">Day Streak</div>
            </Card>
            <Card className="p-4 text-center bg-white border-0 shadow-md">
              <div className="text-2xl font-bold text-purple-600 mb-1">{totalCompleted}</div>
              <div className="text-xs text-gray-600">Questions</div>
            </Card>
            <Card className="p-4 text-center bg-white border-0 shadow-md">
              <div className="text-2xl font-bold text-pink-600 mb-1">{nextEvent ? formatDaysUntil(nextEvent.daysUntil) : '—'}</div>
              <div className="text-xs text-gray-600">Next Event</div>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            onClick={() => onNavigate('messages')}
            className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-center relative"
          >
            {unreadCount > 0 && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </div>
            )}
            <div className="w-11 h-11 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Mail className="w-5 h-5 text-pink-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-0.5">Messages</h3>
            <p className="text-xs text-gray-500">
              {unreadCount > 0 ? `${unreadCount} new` : 'Send love'}
            </p>
          </button>

          <button
            onClick={() => onNavigate('requests')}
            className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-center relative"
          >
            {pendingCount > 0 && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pendingCount}
              </div>
            )}
            <div className="w-11 h-11 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <HandHeart className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-0.5">Requests</h3>
            <p className="text-xs text-gray-500">
              {pendingCount > 0 ? `${pendingCount} pending` : 'Ask away'}
            </p>
          </button>
        </motion.div>

        {/* Discover - Main Features */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-gray-700 px-1">Explore Together</h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('dates')}
              className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-center"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Date Ideas</h3>
            </button>

            <button
              onClick={() => onNavigate('love-language')}
              className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-center"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Love Ideas</h3>
            </button>

            <button
              onClick={() => onNavigate('memories')}
              className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-center"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Camera className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Memories</h3>
            </button>

            <button
              onClick={() => onNavigate('tracker')}
              className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-center"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Calendar</h3>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 safe-area-bottom shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 py-2">
            <div className="w-11 h-11 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xs font-semibold text-pink-500">Home</span>
          </button>
          <button
            onClick={() => onNavigate('dates')}
            className="flex flex-col items-center gap-1 py-2"
          >
            <div className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Sparkles className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-xs text-gray-600">Dates</span>
          </button>
          <button
            onClick={() => onNavigate('love-language')}
            className="flex flex-col items-center gap-1 py-2"
          >
            <div className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Gift className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-xs text-gray-600">Ideas</span>
          </button>
          <button
            onClick={() => onNavigate('memories')}
            className="flex flex-col items-center gap-1 py-2"
          >
            <div className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Camera className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-xs text-gray-600">Memories</span>
          </button>
        </div>
      </div>
    </div>
  );
}
