import { Heart, MessageCircle, Calendar, Gift, Sparkles, Camera, Settings, Mail, HandHeart, Star, Lock, TrendingUp, Bell, ChevronDown, Smartphone } from 'lucide-react';
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

  const partnerName = partnerNameFromOnboarding || partnerNameProp;

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user,
  });

  const upcomingEvents = relationship ? getUpcomingEvents(partnerName, partnerBirthday) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 pb-32">
      {/* Header with decorative elements */}
      <div className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600 text-white px-6 py-8 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -ml-16 -mb-16"></div>

        <div className="max-w-md mx-auto relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-white/80 mb-1">Welcome back,</p>
              <h1 className="text-2xl font-bold">{userName}</h1>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/20"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <PartnerConnection partnerName={partnerName} />
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-6 space-y-6">
        {/* Today's Question - Enhanced */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => onNavigate('daily-question')}
            className="w-full bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all text-left relative overflow-hidden group"
            disabled={!relationship}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity -mr-16 -mt-16"></div>

            <div className="relative flex items-center gap-4 mb-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                canSeeFeedback
                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                  : hasCompletedDailyQuestion
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                  : 'bg-gradient-to-br from-pink-500 to-purple-600'
              }`}>
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Today's Question</h2>
                {canSeeFeedback ? (
                  <p className="text-sm text-emerald-600 font-semibold">Results ready! 🎉</p>
                ) : hasCompletedDailyQuestion ? (
                  <p className="text-sm text-amber-600 font-semibold">Waiting for {partnerName}...</p>
                ) : (
                  <p className="text-sm text-purple-600 font-semibold">Ready to answer</p>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 relative">
              {canSeeFeedback
                ? 'See if you guessed correctly'
                : hasCompletedDailyQuestion
                ? 'We\'ll notify you when they respond'
                : 'Answer and guess each other\'s responses'}
            </p>
          </button>
        </motion.div>

        {/* Stats - Vibrant */}
        {relationship && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-3 gap-3"
          >
            <Card className="p-4 text-center bg-gradient-to-br from-pink-500 via-pink-600 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
              <div className="text-3xl font-bold mb-1">{currentStreak}</div>
              <div className="text-xs text-white/95 font-medium">Day Streak</div>
            </Card>
            <Card className="p-4 text-center bg-white border-0 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">{totalCompleted}</div>
              <div className="text-xs text-gray-600 font-medium">Questions</div>
            </Card>
            <Card className="p-4 text-center bg-white border-0 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
              <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-1">{upcomingEvents[0] ? formatDaysUntil(upcomingEvents[0].daysUntil) : '—'}</div>
              <div className="text-xs text-gray-600 font-medium">Next Event</div>
            </Card>
          </motion.div>
        )}

        {/* Upcoming Events */}
        {relationship && upcomingEvents.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="space-y-3"
          >
            {upcomingEvents.map((event, index) => (
              <button
                key={event.id}
                onClick={() => onNavigate('tracker')}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all text-left relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
                    {event.type === 'birthday' ? '🎂' : '💝'}
                  </div>
                  <div className="flex-1 text-white">
                    <h3 className="font-bold text-sm mb-0.5">{event.title}</h3>
                    <p className="text-xs text-white/90">{formatEventDate(event.date)}</p>
                  </div>
                  <div className="text-sm font-bold text-white/90 bg-white/20 px-3 py-1 rounded-full">
                    {formatDaysUntil(event.daysUntil)}
                  </div>
                </div>
              </button>
            ))}
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
            className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all text-center relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity -mr-10 -mt-10"></div>
            {unreadCount > 0 && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg z-10">
                {unreadCount}
              </div>
            )}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Messages</h3>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} new` : 'Send love'}
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('requests')}
            className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all text-center relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity -mr-10 -mt-10"></div>
            {pendingCount > 0 && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg z-10">
                {pendingCount}
              </div>
            )}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <HandHeart className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Requests</h3>
              <p className="text-xs text-gray-500">
                {pendingCount > 0 ? `${pendingCount} pending` : 'Ask away'}
              </p>
            </div>
          </button>
        </motion.div>

        {/* Collapsible: Explore Together */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <details className="group" open>
            <summary className="cursor-pointer list-none mb-3">
              <div className="flex items-center justify-between px-1 py-2 hover:bg-white/50 rounded-xl transition-colors">
                <h3 className="text-sm font-bold text-gray-800">Explore Together</h3>
                <ChevronDown className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform" />
              </div>
            </summary>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('dates')}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-center group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="w-11 h-11 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Date Ideas</h3>
                </div>
              </button>

              <button
                onClick={() => onNavigate('love-language')}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-center group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="w-11 h-11 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Heart className="w-5 h-5 text-pink-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Love Ideas</h3>
                </div>
              </button>

              <button
                onClick={() => onNavigate('gifts')}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-center group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="w-11 h-11 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Gift className="w-5 h-5 text-pink-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Gift Ideas</h3>
                </div>
              </button>

              <button
                onClick={() => onNavigate('memories')}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all text-center group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="w-11 h-11 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Memories</h3>
                </div>
              </button>
            </div>
          </details>
        </motion.div>

        {/* Collapsible: More Tools */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <details className="group">
            <summary className="cursor-pointer list-none mb-3">
              <div className="flex items-center justify-between px-1 py-2 hover:bg-white/50 rounded-xl transition-colors">
                <h3 className="text-sm font-bold text-gray-800">More Tools</h3>
                <ChevronDown className="w-5 h-5 text-gray-600 group-open:rotate-180 transition-transform" />
              </div>
            </summary>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('tracker')}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5 text-pink-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Calendar</h3>
              </button>

              <button
                onClick={() => onNavigate('insights')}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Insights</h3>
              </button>

              <button
                onClick={() => onNavigate('vault')}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-md">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Vault</h3>
              </button>

              <button
                onClick={() => onNavigate('weekly-wishes')}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Star className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Wishes</h3>
              </button>

              <button
                onClick={() => onNavigate('nudges')}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group col-span-2"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Bell className="w-5 h-5 text-pink-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Love Nudges</h3>
              </button>
            </div>
          </details>
        </motion.div>
      </div>

      {/* Floating Action Button - Send to Widget */}
      {relationship?.partner_b_id && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          onClick={() => onNavigate('send-widget-gift')}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full shadow-xl flex items-center justify-center hover:shadow-2xl hover:scale-110 transition-all z-50 group"
          aria-label="Send to partner's widget"
        >
          <Smartphone className="w-6 h-6 text-white" />
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
          {/* Tooltip */}
          <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Send to their widget
          </div>
        </motion.button>
      )}

      {/* Bottom Navigation - Enhanced */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 px-6 py-3 safe-area-bottom shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 py-2">
            <div className="w-11 h-11 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xs font-semibold text-pink-500">Home</span>
          </button>
          <button
            onClick={() => onNavigate('dates')}
            className="flex flex-col items-center gap-1 py-2 hover:scale-105 transition-transform"
          >
            <div className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Sparkles className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-xs text-gray-600">Dates</span>
          </button>
          <button
            onClick={() => onNavigate('love-language')}
            className="flex flex-col items-center gap-1 py-2 hover:scale-105 transition-transform"
          >
            <div className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Heart className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-xs text-gray-600">Ideas</span>
          </button>
          <button
            onClick={() => onNavigate('memories')}
            className="flex flex-col items-center gap-1 py-2 hover:scale-105 transition-transform"
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
