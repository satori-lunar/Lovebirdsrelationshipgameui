/**
 * Home Screen Component
 *
 * Main dashboard for the Lovebirds app featuring partner status,
 * daily questions, weekly suggestions, and quick navigation.
 * Styled with rose/pink gradients matching the Amora design system.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Sparkles,
  Calendar,
  MessageCircleHeart,
  Gift,
  BookHeart,
  ChevronRight,
  ChevronDown,
  Flame,
  TrendingUp,
  Target,
  Settings,
  Lock,
  Bell,
  Smartphone,
  Menu,
  X,
  History
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { useDailyQuestion } from '../hooks/useDailyQuestion';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { useQuestionStats } from '../hooks/useQuestionStats';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { useQuery } from '@tanstack/react-query';
import { onboardingService } from '../services/onboardingService';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useUnreadRequests } from '../hooks/useUnreadRequests';
import { widgetGiftService } from '../services/widgetGiftService';
import { GiftCelebration } from './GiftCelebration';
import { GiftCarousel } from './GiftCarousel';
import type { WidgetGiftData } from '../types/widget';

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
  const { partnerName: partnerNameFromOnboarding } = usePartnerOnboarding();
  const { unreadCount } = useUnreadMessages();
  const { pendingCount } = useUnreadRequests();
  const hasCompletedDailyQuestion = hasAnswered && hasGuessed;

  const partnerName = partnerNameFromOnboarding || partnerNameProp;

  // Widget gift state
  const [pendingGifts, setPendingGifts] = useState<WidgetGiftData[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [celebrationGift, setCelebrationGift] = useState<WidgetGiftData | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Load pending widget gifts
  useEffect(() => {
    if (!user) return;

    const loadPendingGifts = async () => {
      try {
        const gifts = await widgetGiftService.getPendingGifts(user.id);
        setPendingGifts(gifts);

        // Show celebration for new gifts
        if (gifts.length > 0) {
          const unseenGift = gifts.find(g => g.status === 'delivered');
          if (unseenGift) {
            setCelebrationGift(unseenGift);
            setShowCelebration(true);
            // Mark as seen
            await widgetGiftService.markGiftAsSeen(unseenGift.id);
          }
        }
      } catch (error) {
        console.error('Failed to load pending gifts:', error);
      }
    };

    loadPendingGifts();
  }, [user]);

  const handleDismissGift = async (giftId: string) => {
    try {
      await widgetGiftService.dismissGift(giftId);
      setPendingGifts(prev => prev.filter(g => g.id !== giftId));
    } catch (error) {
      console.error('Failed to dismiss gift:', error);
    }
  };

  const handleCelebrationDismiss = () => {
    setShowCelebration(false);
    setCelebrationGift(null);
    // If there are multiple gifts, show carousel
    if (pendingGifts.length > 1) {
      setShowCarousel(true);
    }
  };

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user,
  });

  // Calculate days together (mock - would come from relationship data)
  const getDaysTogether = () => {
    if (!relationship?.created_at) return null;
    const start = new Date(relationship.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysTogether = getDaysTogether();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Custom Styles */}
      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .heartbeat {
          animation: heartbeat 1.5s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* Animated background hearts */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ opacity: 0.1, scale: 0.5 }}
            animate={{
              y: [-20, 20, -20],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5
            }}
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
            }}
          >
            <Heart className="w-8 h-8 text-rose-200" fill="currentColor" />
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 pt-6 pb-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.8 }}
              className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200"
            >
              <Heart className="w-7 h-7 text-white heartbeat" fill="white" />
            </motion.div>
            <div>
              <span className="font-semibold text-xl bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                Lovebirds
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border border-rose-100 flex items-center justify-center hover:bg-rose-50 transition-colors shadow-sm"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4"
          >
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}, {userName} 💕
            </h1>
            {daysTogether && (
              <p className="text-gray-600 mt-1 flex items-center justify-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                {daysTogether} days together
              </p>
            )}
          </motion.div>

          {/* Partner Status Card */}
          {relationship?.partner_b_id ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-rose-500 to-pink-500 text-white overflow-hidden border-0 shadow-xl shadow-rose-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-sm">Your Partner</p>
                      <h2 className="text-2xl font-bold mt-1">{partnerName}</h2>
                      <p className="text-rose-100 mt-2 text-sm">
                        Streak: <span className="text-white font-medium">{currentStreak} days</span>
                      </p>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center"
                    >
                      <Heart className="w-8 h-8 text-white" fill="white" />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Gift className="w-12 h-12 mx-auto text-amber-500 mb-3" />
                  <h3 className="font-semibold text-gray-900">Waiting for your partner</h3>
                  <p className="text-gray-600 text-sm mt-1">Share your invite code to connect</p>
                  <button
                    onClick={() => onNavigate('settings')}
                    className="mt-4 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-200 hover:shadow-xl transition-all"
                  >
                    Share Invite
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Daily Question Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <button
              onClick={() => onNavigate('daily-question')}
              className="w-full text-left"
              disabled={!relationship}
            >
              <Card className="hover:shadow-xl transition-all cursor-pointer group overflow-hidden border-0 shadow-lg">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-r from-purple-500 to-violet-500 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-lg">Daily Question</span>
                      </div>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    {canSeeFeedback ? (
                      <>
                        <p className="text-gray-800 font-medium">Results are ready! 🎉</p>
                        <p className="text-sm text-gray-500 mt-1">See how well you know each other</p>
                      </>
                    ) : hasCompletedDailyQuestion ? (
                      <>
                        <p className="text-gray-800 font-medium">Waiting for {partnerName}...</p>
                        <p className="text-sm text-gray-500 mt-1">We'll notify you when they respond</p>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-800 font-medium">New question available!</p>
                        <p className="text-sm text-gray-500 mt-1">Answer and guess each other's responses</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          </motion.div>

          {/* Pending Gifts Indicator */}
          {pendingGifts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <button
                onClick={() => setShowCarousel(true)}
                className="w-full"
              >
                <Card className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white overflow-hidden border-0 shadow-xl shadow-rose-200 hover:shadow-2xl transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0"
                      >
                        <Gift className="w-7 h-7 text-white" />
                      </motion.div>
                      <div className="flex-1 text-left">
                        <p className="text-rose-100 text-xs font-medium uppercase tracking-wide">
                          New from {partnerName}
                        </p>
                        <h3 className="font-bold text-lg mt-0.5">
                          {pendingGifts.length} Gift{pendingGifts.length > 1 ? 's' : ''} Waiting! 💝
                        </h3>
                        <p className="text-rose-100 text-sm mt-1">
                          Tap to view your surprise{pendingGifts.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-white/80" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          )}

          {/* Widget Gift Suggestion */}
          {relationship?.partner_b_id && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <motion.div
                      animate={{ y: [-2, 2, -2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-200"
                    >
                      <Smartphone className="w-6 h-6 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <p className="text-xs text-rose-600 font-semibold uppercase tracking-wide">Widget Gift</p>
                      <h3 className="font-semibold text-gray-900 mt-1">Send love to their home screen</h3>
                      <p className="text-sm text-gray-600 mt-1">Share a photo or sweet message that appears on {partnerName}'s widget</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => onNavigate('send-widget-gift')}
                          className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          Send a Gift 💝
                        </button>
                        <button
                          onClick={() => onNavigate('gift-history')}
                          className="px-4 py-2 bg-white border border-rose-200 text-rose-600 text-sm font-medium rounded-xl hover:bg-rose-50 transition-colors flex items-center gap-1.5"
                        >
                          <History className="w-4 h-4" />
                          History
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <button
                onClick={() => onNavigate('messages')}
                className="w-full"
              >
                <Card className="h-full hover:shadow-xl transition-all cursor-pointer group border-0 shadow-lg">
                  <CardContent className="p-5 flex flex-col items-center text-center">
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <MessageCircleHeart className="w-7 h-7 text-blue-500" />
                      </div>
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">Messages</h3>
                    <p className="text-xs text-gray-500 mt-1">Send love notes</p>
                  </CardContent>
                </Card>
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <button
                onClick={() => onNavigate('dates')}
                className="w-full"
              >
                <Card className="h-full hover:shadow-xl transition-all cursor-pointer group border-0 shadow-lg">
                  <CardContent className="p-5 flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Calendar className="w-7 h-7 text-rose-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Plan a Date</h3>
                    <p className="text-xs text-gray-500 mt-1">Curated experiences</p>
                  </CardContent>
                </Card>
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => onNavigate('memories')}
                className="w-full"
              >
                <Card className="h-full hover:shadow-xl transition-all cursor-pointer group border-0 shadow-lg">
                  <CardContent className="p-5 flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <BookHeart className="w-7 h-7 text-amber-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Memories</h3>
                    <p className="text-xs text-gray-500 mt-1">Your love story</p>
                  </CardContent>
                </Card>
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => onNavigate('gifts')}
                className="w-full"
              >
                <Card className="h-full hover:shadow-xl transition-all cursor-pointer group border-0 shadow-lg">
                  <CardContent className="p-5 flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-violet-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Gift className="w-7 h-7 text-purple-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Gift Ideas</h3>
                    <p className="text-xs text-gray-500 mt-1">Perfect presents</p>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          </div>

          {/* More Options - Collapsible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-100 hover:bg-white transition-colors"
            >
              <span className="font-medium text-gray-700">More Options</span>
              <motion.div
                animate={{ rotate: showMoreOptions ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showMoreOptions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-3 pt-4">
                    <button
                      onClick={() => onNavigate('vault')}
                      className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group border border-gray-100"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-md">
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-medium text-gray-900 text-xs">Vault</h3>
                    </button>

                    <button
                      onClick={() => onNavigate('insights')}
                      className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group border border-gray-100"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="font-medium text-gray-900 text-xs">Insights</h3>
                    </button>

                    <button
                      onClick={() => onNavigate('nudges')}
                      className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group border border-gray-100"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                        <Bell className="w-5 h-5 text-rose-500" />
                      </div>
                      <h3 className="font-medium text-gray-900 text-xs">Nudges</h3>
                    </button>

                    <button
                      onClick={() => onNavigate('weekly-suggestions')}
                      className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group border border-gray-100"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                        <Sparkles className="w-5 h-5 text-pink-500" />
                      </div>
                      <h3 className="font-medium text-gray-900 text-xs">Weekly</h3>
                    </button>

                    <button
                      onClick={() => onNavigate('tracker')}
                      className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group border border-gray-100"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                        <Target className="w-5 h-5 text-indigo-500" />
                      </div>
                      <h3 className="font-medium text-gray-900 text-xs">Goals</h3>
                    </button>

                    <button
                      onClick={() => onNavigate('dragon')}
                      className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group border border-gray-100"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                        <span className="text-xl">🐉</span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-xs">Dragon</h3>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Stats Row */}
          {relationship && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Your Journey</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                        {currentStreak}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Day Streak</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent">
                        {totalCompleted}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Questions</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                        {daysTogether || '—'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-rose-100 z-50 shadow-lg">
        <div className="max-w-2xl mx-auto flex justify-around items-center h-16 px-4">
          <button className="flex flex-col items-center gap-1 py-2">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="text-[10px] font-semibold text-rose-500">Home</span>
          </button>

          <button
            onClick={() => onNavigate('daily-question')}
            className="flex flex-col items-center gap-1 py-2"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Sparkles className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-[10px] font-medium text-gray-400">Daily Q</span>
          </button>

          <button
            onClick={() => onNavigate('dates')}
            className="flex flex-col items-center gap-1 py-2"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Calendar className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-[10px] font-medium text-gray-400">Dates</span>
          </button>

          <button
            onClick={() => onNavigate('messages')}
            className="flex flex-col items-center gap-1 py-2 relative"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              <MessageCircleHeart className="w-5 h-5 text-gray-500" />
            </div>
            {unreadCount > 0 && (
              <div className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
            <span className="text-[10px] font-medium text-gray-400">Messages</span>
          </button>

          <button
            onClick={() => onNavigate('memories')}
            className="flex flex-col items-center gap-1 py-2"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              <BookHeart className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-[10px] font-medium text-gray-400">Memories</span>
          </button>
        </div>
      </nav>

      {/* Gift Celebration Modal */}
      <AnimatePresence>
        {showCelebration && celebrationGift && (
          <GiftCelebration
            gift={celebrationGift}
            onDismiss={handleCelebrationDismiss}
            onView={() => {
              handleCelebrationDismiss();
              if (pendingGifts.length > 0) {
                setShowCarousel(true);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Gift Carousel Modal */}
      <AnimatePresence>
        {showCarousel && pendingGifts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCarousel(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GiftCarousel
                gifts={pendingGifts}
                onDismissGift={handleDismissGift}
                onClose={() => setShowCarousel(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
