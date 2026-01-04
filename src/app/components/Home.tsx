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
  MessageCircleHeart,
  Gift,
  BookHeart,
  ChevronRight,
  ChevronDown,
  Flame,
  Settings,
  Calendar,
  Bookmark
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
import { api } from '../services/api';
import PartnerFormInvite from './PartnerFormInvite';
import WeeklyRhythm from './WeeklyRhythm';
import PartnerCapacityView from './PartnerCapacityView';
import { SubmitNeedModal } from './SubmitNeedModal';

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

  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showNeedModal, setShowNeedModal] = useState(false);

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user,
  });

  // Query couple data (relationship contains couple data)
  const couple = relationship;

  // Query partner profile data
  const { data: partnerProfile } = useQuery({
    queryKey: ['partnerProfile', relationship?.id, user?.id],
    queryFn: async () => {
      if (!relationship?.id || !user?.id) return null;
      try {
        // Determine partner's user_id from relationship
        const partnerId = relationship.partner_a_id === user.id
          ? relationship.partner_b_id
          : relationship.partner_a_id;

        if (!partnerId) {
          console.log('No partner connected yet');
          return null;
        }

        // Fetch partner's onboarding data directly
        const partnerData = await onboardingService.getOnboarding(partnerId);
        console.log('✅ Partner profile data:', partnerData);
        return partnerData;
      } catch (error) {
        console.error('Failed to fetch partner profile:', error);
        return null;
      }
    },
    enabled: !!relationship?.id && !!user?.id && !!relationship?.partner_b_id,
  });

  // Query partner's latest capacity check-in
  const { data: partnerCapacity } = useQuery({
    queryKey: ['partnerCapacity', relationship?.id, user?.id],
    queryFn: async () => {
      if (!relationship?.id || !user?.id) return null;
      try {
        // Determine partner's user_id from relationship
        const partnerId = relationship.partner_a_id === user.id
          ? relationship.partner_b_id
          : relationship.partner_a_id;

        if (!partnerId) {
          console.log('No partner connected yet');
          return null;
        }

        // Get partner's latest capacity check-in from today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await api.supabase
          .from('capacity_checkins')
          .select('*')
          .eq('couple_id', relationship.id)
          .eq('user_id', partnerId) // Filter by partner's user_id
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle to handle no results gracefully

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Failed to fetch partner capacity:', error);
          return null;
        }

        console.log('✅ Partner capacity check-in:', data);
        return data;
      } catch (error) {
        console.error('Failed to fetch partner capacity:', error);
        return null;
      }
    },
    enabled: !!relationship?.id && !!user?.id && !!relationship?.partner_b_id,
    refetchInterval: 30000, // Refresh every 30 seconds to catch new check-ins quickly
  });

  // Query user's own latest capacity check-in
  const { data: myCapacity } = useQuery({
    queryKey: ['myCapacity', relationship?.id, user?.id],
    queryFn: async () => {
      if (!relationship?.id || !user?.id) return null;
      try {
        // Get user's latest capacity check-in from today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await api.supabase
          .from('capacity_checkins')
          .select('*')
          .eq('couple_id', relationship.id)
          .eq('user_id', user.id) // Filter by current user's ID
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle to handle no results gracefully

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Failed to fetch my capacity:', error);
          return null;
        }

        return data;
      } catch (error) {
        console.error('Failed to fetch my capacity:', error);
        return null;
      }
    },
    enabled: !!relationship?.id && !!user?.id && !!relationship?.partner_b_id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate time together - uses actual relationship start date from onboarding if available
  const getTimeTogether = () => {
    // Use relationship_start_date (actual anniversary) if available, otherwise fall back to connected_at or created_at
    const startDate = relationship?.relationship_start_date || relationship?.connected_at || relationship?.created_at;
    if (!startDate) return null;

    const start = new Date(startDate);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Calculate years, months, days
    const years = Math.floor(diffDays / 365);
    const remainingDays = diffDays % 365;
    const months = Math.floor(remainingDays / 30);
    const days = remainingDays % 30;

    // Format the display
    if (years > 0) {
      if (months > 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}, ${months} ${months === 1 ? 'month' : 'months'}`;
      }
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    } else if (months > 0) {
      if (days > 0) {
        return `${months} ${months === 1 ? 'month' : 'months'}, ${days} ${days === 1 ? 'day' : 'days'}`;
      }
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    } else {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
    }
  };

  const timeTogether = getTimeTogether();

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
            {timeTogether && (
              <p className="text-gray-600 mt-1 flex items-center justify-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Together {timeTogether}
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

          {/* Partner Capacity Check-In */}
          {partnerCapacity && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.17 }}
            >
              <PartnerCapacityView
                checkin={partnerCapacity}
                partnerName={partnerName}
                isLongDistance={couple?.is_long_distance || false}
              />
            </motion.div>
          )}

          {/* My Capacity Today - Always visible to allow updates throughout the day */}
          {relationship?.partner_b_id && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.23 }}
            >
              <button
                onClick={() => onNavigate('capacity-checkin')}
                className="w-full text-left"
              >
                <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 shadow-lg hover:shadow-xl transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <motion.div
                        animate={{ y: [-2, 2, -2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-200"
                      >
                        <Heart className="w-6 h-6 text-white" fill="white" />
                      </motion.div>
                      <div className="flex-1">
                        <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide">My Capacity Today</p>
                        <h3 className="font-semibold text-gray-900 mt-1">
                          {myCapacity ? 'Update how you\'re feeling' : 'Share how you\'re feeling'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {myCapacity
                            ? `Moods change throughout the day - let ${partnerName} know how you're doing now`
                            : `Let ${partnerName} know your mood and what you need - it helps them show up better for you`
                          }
                        </p>
                        {myCapacity && (
                          <p className="text-xs text-purple-600 mt-2">
                            Current: {myCapacity.mood_label || 'Shared earlier today'}
                          </p>
                        )}
                        <div className="mt-3">
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white text-sm font-medium rounded-xl shadow-md">
                            <span>{myCapacity ? 'Update Your Capacity' : 'Share Your Capacity'}</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          )}

          {/* What Feels Missing? */}
          {relationship?.partner_b_id && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
            >
              <button
                onClick={() => setShowNeedModal(true)}
                className="w-full text-left"
              >
                <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg hover:shadow-xl transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-200"
                      >
                        <Heart className="w-6 h-6 text-white" fill="white" />
                      </motion.div>
                      <div className="flex-1">
                        <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">What Feels Missing?</p>
                        <h3 className="font-semibold text-gray-900 mt-1">Tell us what you need</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          We'll help {partnerName} know how to support you in a way that feels right to them
                        </p>
                        <div className="mt-3">
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl shadow-md">
                            <span>Share What's Missing</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          )}

          {/* Solo Mode - Partner Form Invite */}
          {couple?.relationship_mode === 'solo' && !couple?.partner_form_completed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <PartnerFormInvite couple={couple} />
            </motion.div>
          )}

          {/* Long Distance Features */}
          {couple?.is_long_distance && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <WeeklyRhythm couple={couple} user={user} />
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
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Calendar className="w-7 h-7 text-purple-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Plan a Date</h3>
                    <p className="text-xs text-gray-500 mt-1">Date ideas</p>
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
                onClick={() => onNavigate('weekly-suggestions')}
                className="w-full"
              >
                <Card className="h-full hover:shadow-xl transition-all cursor-pointer group border-0 shadow-lg">
                  <CardContent className="p-5 flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-7 h-7 text-pink-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Weekly</h3>
                    <p className="text-xs text-gray-500 mt-1">AI suggestions</p>
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
                      onClick={() => onNavigate('things-to-remember')}
                      className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all text-center group border border-gray-100"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-md">
                        <Bookmark className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-medium text-gray-900 text-xs">Remember</h3>
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
                      <div className="text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                        {timeTogether || '—'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Together</p>
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

      {/* Submit Need Modal */}
      {user && relationship && (
        <SubmitNeedModal
          isOpen={showNeedModal}
          onClose={() => setShowNeedModal(false)}
          userId={user.id}
          coupleId={relationship.id}
          partnerName={partnerName}
        />
      )}
    </div>
  );
}
