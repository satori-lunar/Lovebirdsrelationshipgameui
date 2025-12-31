import { Heart, MessageCircle, Calendar, Gift, Sparkles, Camera, Settings, Lock, Mail, HandHeart, Star, Bookmark, TrendingUp, Bell } from 'lucide-react';
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
  const nextEvent = upcomingEvents[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 pb-20">
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 text-white px-6 pt-8 pb-24 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-24 -mb-24"></div>

        <div className="max-w-md mx-auto relative">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-white/80 mb-1">Welcome back</p>
              <h1 className="text-3xl font-bold">{userName}</h1>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md border border-white/20"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Partner Connection */}
          <PartnerConnection partnerName={partnerName} />
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-16 relative z-10">
        {/* Today's Question - Hero Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-2xl bg-white overflow-hidden">
            <div className="relative">
              {/* Gradient accent */}
              <div className={`h-2 ${
                canSeeFeedback
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                  : hasCompletedDailyQuestion
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : 'bg-gradient-to-r from-pink-400 to-purple-500'
              }`}></div>

              <button
                onClick={() => onNavigate('daily-question')}
                className="w-full p-6 text-left hover:bg-gray-50/50 transition-colors"
                disabled={!relationship}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                    hasCompletedDailyQuestion
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                      : canSeeFeedback
                      ? 'bg-gradient-to-br from-emerald-400 to-teal-500 animate-pulse'
                      : 'bg-gradient-to-br from-pink-500 to-purple-600'
                  }`}>
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">Today's Question</h3>
                      {hasAnswered && !hasGuessed && (
                        <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">
                          {partnerName} answered
                        </span>
                      )}
                    </div>
                    {canSeeFeedback ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Results are ready! 🎉</p>
                        <p className="text-xs text-gray-500">See if you guessed correctly</p>
                      </div>
                    ) : hasCompletedDailyQuestion ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Waiting for {partnerName}</p>
                        <p className="text-xs text-gray-500">We'll notify you when they answer</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-700 mb-1">Answer and guess their response</p>
                        <p className="text-xs text-gray-500">Test how well you know each other</p>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Stats - Beautiful gradient cards */}
        {relationship && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white p-4 text-center">
              <div className="text-3xl font-bold mb-1">{currentStreak}</div>
              <div className="text-xs text-white/90 font-medium">Day Streak</div>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white p-4 text-center">
              <div className="text-3xl font-bold mb-1">{totalCompleted}</div>
              <div className="text-xs text-white/90 font-medium">Questions</div>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white p-4 text-center">
              <div className="text-2xl font-bold mb-1">{nextEvent ? formatDaysUntil(nextEvent.daysUntil) : '—'}</div>
              <div className="text-xs text-white/90 font-medium">Next Event</div>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate('messages')}
              className="group relative bg-white p-5 rounded-3xl shadow-lg hover:shadow-xl transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity -mr-12 -mt-12"></div>
              {unreadCount > 0 && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-gradient-to-br from-red-500 to-pink-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg z-10">
                  {unreadCount}
                </div>
              )}
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="font-bold text-sm mb-1">Love Messages</h3>
                <p className="text-xs text-gray-600">
                  {unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : 'Send sweet notes'}
                </p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('requests')}
              className="group relative bg-white p-5 rounded-3xl shadow-lg hover:shadow-xl transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity -mr-12 -mt-12"></div>
              {pendingCount > 0 && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg z-10">
                  {pendingCount}
                </div>
              )}
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <HandHeart className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-sm mb-1">Requests</h3>
                <p className="text-xs text-gray-600">
                  {pendingCount > 0 ? `${pendingCount} pending` : 'Ask for what you need'}
                </p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Relationship Tools */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Strengthen Your Bond</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate('dates')}
              className="group relative bg-white p-5 rounded-3xl shadow-lg hover:shadow-xl transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity -mr-12 -mt-12"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-sm mb-1">Date Ideas</h3>
                <p className="text-xs text-gray-600">Personalized plans</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('love-language')}
              className="group relative bg-white p-5 rounded-3xl shadow-lg hover:shadow-xl transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity -mr-12 -mt-12"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Heart className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="font-bold text-sm mb-1">Love Language</h3>
                <p className="text-xs text-gray-600">Weekly suggestions</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('gifts')}
              className="group relative bg-white p-5 rounded-3xl shadow-lg hover:shadow-xl transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity -mr-12 -mt-12"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Gift className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="font-bold text-sm mb-1">Gift Ideas</h3>
                <p className="text-xs text-gray-600">Thoughtful picks</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('insights')}
              className="group relative bg-white p-5 rounded-3xl shadow-lg hover:shadow-xl transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity -mr-12 -mt-12"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-bold text-sm mb-1">Insights</h3>
                <p className="text-xs text-gray-600">Learn together</p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Capture & Remember */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Capture & Remember</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate('memories')}
              className="group relative bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 p-5 rounded-3xl shadow-lg hover:shadow-xl transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-white">Memories</h3>
                <p className="text-xs text-white/90">Your scrapbook</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('tracker')}
              className="group relative bg-white p-5 rounded-3xl shadow-lg hover:shadow-xl transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity -mr-12 -mt-12"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="font-bold text-sm mb-1">Important Dates</h3>
                <p className="text-xs text-gray-600">Never forget</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('vault')}
              className="group relative bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-3xl shadow-lg hover:shadow-xl transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-2xl -mr-12 -mt-12"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-white">Surprise Vault</h3>
                <p className="text-xs text-gray-400">Secret plans</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('weekly-wishes')}
              className="group relative bg-white p-5 rounded-3xl shadow-lg hover:shadow-xl transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity -mr-12 -mt-12"></div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-sm mb-1">Weekly Wishes</h3>
                <p className="text-xs text-gray-600">Share your week</p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* More Tools - Clean expandable */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <details className="group mb-6">
            <summary className="cursor-pointer list-none">
              <Card className="p-4 border-0 shadow-md bg-white hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                      <Bookmark className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">More Tools</h3>
                      <p className="text-xs text-gray-500">Additional features</p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-open:rotate-180 transition-transform">
                    <Bell className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </Card>
            </summary>
            <div className="mt-4 px-1">
              <button
                onClick={() => onNavigate('nudges')}
                className="w-full bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition-all text-left mb-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Love Nudges</h3>
                    <p className="text-xs text-gray-600">Daily reminders</p>
                  </div>
                </div>
              </button>
            </div>
          </details>
        </motion.div>
      </div>

      {/* Bottom Navigation - Modern */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 px-6 py-4 safe-area-bottom shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xs font-semibold text-pink-600">Home</span>
          </button>
          <button
            onClick={() => onNavigate('dates')}
            className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-gray-500" />
            </div>
            <span className="text-xs font-medium text-gray-500">Dates</span>
          </button>
          <button
            onClick={() => onNavigate('tracker')}
            className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-500" />
            </div>
            <span className="text-xs font-medium text-gray-500">Calendar</span>
          </button>
          <button
            onClick={() => onNavigate('memories')}
            className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Camera className="w-6 h-6 text-gray-500" />
            </div>
            <span className="text-xs font-medium text-gray-500">Memories</span>
          </button>
        </div>
      </div>
    </div>
  );
}
