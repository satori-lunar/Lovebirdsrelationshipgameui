/**
 * Home Screen Component
 *
 * An emotionally intelligent space for couples to understand each other's
 * current state and receive one clear, appropriate way to support each other.
 * Designed with restraint, warmth, and progressive disclosure.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Sparkles,
  MessageCircleHeart,
  ChevronDown,
  ChevronUp,
  Settings,
  Clock,
  Smile,
  Meh,
  Frown,
  BookHeart,
  Flame,
  Gift,
  ChevronRight,
  Calendar,
  Bookmark
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { useQuery } from '@tanstack/react-query';
import { onboardingService } from '../services/onboardingService';
import { api } from '../services/api';
import { useSharedCalendar } from '../hooks/useSharedCalendar';
import { useAdaptiveNotifications } from '../services/adaptiveNotifications';
import { ProfilePhotos } from './ProfilePhotos';
import PartnerCapacityView from './PartnerCapacityView';
import { PartnerNeedsView } from './PartnerNeedsView';
import PartnerFormInvite from './PartnerFormInvite';
import WeeklyRhythm from './WeeklyRhythm';

interface HomeProps {
  userName: string;
  partnerName: string;
  onNavigate: (page: string, data?: any) => void;
  showWelcomeFlow?: boolean;
}

interface EmotionalState {
  mood: 'great' | 'good' | 'okay' | 'challenging' | 'tough';
  energy: 'high' | 'medium' | 'low';
  lastUpdated: Date;
}

export function Home({ userName, partnerName: partnerNameProp, onNavigate, showWelcomeFlow = false }: HomeProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { insights: calendarInsights } = useSharedCalendar();
  const { scheduleNotification, getOptimalTiming } = useAdaptiveNotifications();
  const [showDetails, setShowDetails] = useState(false);
  const [currentSupportAction, setCurrentSupportAction] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [canSeeFeedback, setCanSeeFeedback] = useState(false);
  const [hasCompletedDailyQuestion, setHasCompletedDailyQuestion] = useState(false);
  // Check if user has completed the welcome flow
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    return localStorage.getItem('lovebirds-has-seen-welcome') === 'true';
  });

  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'capacity' | 'home'>('welcome');

  // Determine initial screen based on user state
  useEffect(() => {
    if (myCapacity) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const capacityDate = new Date(myCapacity.created_at);
      capacityDate.setHours(0, 0, 0, 0);

      // If user has shared capacity today, show home screen
      if (capacityDate.getTime() === today.getTime()) {
        setCurrentScreen('home');
        return;
      }
    }

    // If user has seen welcome and has capacity data, show home
    if (hasSeenWelcome && myCapacity) {
      setCurrentScreen('home');
      return;
    }

    // Otherwise show welcome
    setCurrentScreen('welcome');
  }, [myCapacity, hasSeenWelcome]);

  // Mark welcome as seen when user navigates to capacity
  useEffect(() => {
    if (currentScreen === 'capacity') {
      setHasSeenWelcome(true);
      localStorage.setItem('lovebirds-has-seen-welcome', 'true');
    }
  }, [currentScreen]);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Get partner information
  const { data: partnerProfile } = useQuery({
    queryKey: ['partnerProfile', relationship?.id, user?.id],
    queryFn: async () => {
      if (!relationship?.id || !user?.id) return null;
      try {
        const partnerId = relationship.partner_a_id === user.id
          ? relationship.partner_b_id
          : relationship.partner_a_id;

        if (!partnerId) return null;

        const partnerData = await onboardingService.getOnboarding(partnerId);
        return partnerData;
      } catch (error) {
        return null;
      }
    },
    enabled: !!relationship?.id && !!user?.id,
  });

  // Get partner's recent capacity check-in
  const { data: partnerCapacity } = useQuery({
    queryKey: ['partnerCapacity', relationship?.id],
    queryFn: async () => {
      if (!relationship?.id || !user?.id) return null;
      try {
        const partnerId = relationship.partner_a_id === user.id
          ? relationship.partner_b_id
          : relationship.partner_a_id;

        if (!partnerId) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data } = await api.supabase
          .from('capacity_checkins')
          .select('*')
          .eq('couple_id', relationship.id)
          .eq('user_id', partnerId)
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return data;
      } catch (error) {
        return null;
      }
    },
    enabled: !!relationship?.id && !!user?.id,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Get user's recent capacity check-in
  const { data: userCapacity } = useQuery({
    queryKey: ['userCapacity', relationship?.id, user?.id],
    queryFn: async () => {
      if (!relationship?.id || !user?.id) return null;
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data } = await api.supabase
          .from('capacity_checkins')
          .select('*')
          .eq('couple_id', relationship.id)
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return data;
      } catch (error) {
        return null;
      }
    },
    enabled: !!relationship?.id && !!user?.id,
    refetchInterval: 300000,
  });

  // Get time together
  const getTimeTogether = () => {
    if (!relationship?.relationship_start_date) return null;
    const start = new Date(relationship.relationship_start_date);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);

    if (years > 0) {
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    } else if (months > 0) {
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    return `${diffDays} days`;
  };

  const timeTogether = getTimeTogether();
  const partnerName = partnerProfile?.name || partnerNameProp;

  // Determine primary support action based on partner state and shared context
  useEffect(() => {
    if (partnerCapacity && userCapacity) {
      const partnerEnergy = partnerCapacity.energy_level;
      const partnerMood = partnerCapacity.mood;
      const userEnergy = userCapacity.energy_level;
      const hasSharedTime = calendarInsights?.overlapHours > 1;
      const hasPotentialDateTime = calendarInsights?.suggestedDateTimes.length > 0;

      // Intelligent support action selection based on emotional intelligence principles
      if (partnerEnergy <= 3 && partnerMood <= 3) {
        // Low mood + low energy = gentle, non-demanding support
        setCurrentSupportAction('gentle_check_in');
      } else if (partnerEnergy >= 8 && partnerMood >= 7) {
        // High energy + good mood = celebratory support
        setCurrentSupportAction('celebrate_energy');
      } else if (hasSharedTime && userEnergy >= 6 && partnerEnergy >= 5 && hasPotentialDateTime) {
        // Good shared availability + decent energy levels + potential date times
        setCurrentSupportAction('quality_time');
      } else if (partnerMood <= 5 && userEnergy >= 4) {
        // Partner could use a lift, user has capacity to help
        setCurrentSupportAction('thoughtful_message');
      } else {
        // Default to checking in together
        setCurrentSupportAction('check_in');
      }
    } else {
      setCurrentSupportAction('check_in');
    }
  }, [partnerCapacity, userCapacity, calendarInsights]);

  const getSupportAction = () => {
    const hasSharedTime = calendarInsights?.overlapHours > 1;

    switch (currentSupportAction) {
      case 'gentle_check_in':
        return {
          title: "A gentle check-in might help",
          description: hasSharedTime
            ? "They seem to need some quiet care right now"
            : "A soft message when they're ready",
          icon: Heart,
          action: () => onNavigate('messages'),
          color: "text-rose-600",
          bgColor: "bg-rose-50"
        };
      case 'celebrate_energy':
        return {
          title: "Celebrate their good energy",
          description: hasSharedTime
            ? "They're feeling great - share in their joy"
            : "Acknowledge their positive moment",
          icon: Sparkles,
          action: () => onNavigate('messages'),
          color: "text-amber-600",
          bgColor: "bg-amber-50"
        };
      case 'quality_time':
        return {
          title: "Share some quality time",
          description: calendarInsights?.suggestedDateTimes.length
            ? "You both have time this evening"
            : "You both seem available for connection",
          icon: Clock,
          action: () => onNavigate('dates'),
          color: "text-blue-600",
          bgColor: "bg-blue-50"
        };
      case 'thoughtful_message':
        return {
          title: "Send a thoughtful message",
          description: "A kind note can brighten their day",
          icon: MessageCircleHeart,
          action: () => onNavigate('messages'),
          color: "text-pink-600",
          bgColor: "bg-pink-50"
        };
      default:
        return {
          title: "Check in with each other",
          description: "See how you're both doing today",
          icon: Heart,
          action: () => onNavigate('capacity-checkin'),
          color: "text-indigo-600",
          bgColor: "bg-indigo-50"
        };
    }
  };

  const supportAction = getSupportAction();

  const getMoodIcon = (mood?: number) => {
    if (!mood) return Meh;
    if (mood >= 7) return Smile;
    if (mood <= 3) return Frown;
    return Meh;
  };

  const getEnergyColor = (energy?: number) => {
    if (!energy) return "text-gray-400";
    if (energy >= 7) return "text-green-600";
    if (energy <= 3) return "text-red-500";
    return "text-yellow-600";
  };

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => onboardingService.getOnboarding(user!.id),
    enabled: !!user,
  });

  // Query couple data (relationship contains couple data)
  const couple = relationship;

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

  // Handler for starting need plans
  const handleStartNeedPlan = (needId: string) => {
    onNavigate('need-plan', { needId });
  };

  // Swipe handling
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;

    if (isUpSwipe && currentScreen === 'welcome') {
      setCurrentScreen('capacity');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AnimatePresence mode="wait">
      {currentScreen === 'welcome' ? (
        // Welcome Screen with Photo and Relationship Info
        // Welcome Screen - Hero with Photo and Relationship Info
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen relative overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Hero Background Image */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-400 via-pink-500 to-purple-600">
            {/* User's chosen photo would go here - for now using a gradient overlay */}
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          {/* Relationship Info Overlay */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-white text-center">
            {/* Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold mb-2">
                {getGreeting()}, {userName} 💕
              </h1>
              <p className="text-rose-100 text-lg">
                How are you feeling today?
              </p>
            </motion.div>

            {/* Relationship Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 max-w-sm"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Heart className="w-6 h-6 text-pink-200" fill="currentColor" />
                <span className="text-xl font-semibold">Together</span>
                <Heart className="w-6 h-6 text-pink-200" fill="currentColor" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1">
                    {timeTogether || '—'}
                  </div>
                  <div className="text-sm text-rose-100">
                    Time Together
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1">
                    {currentStreak || 0}
                  </div>
                  <div className="text-sm text-rose-100">
                    Day Streak
                  </div>
                </div>
              </div>

              {/* Anniversary Date */}
              {relationship?.relationship_start_date && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="text-sm text-rose-100 mb-1">
                    Anniversary
                  </div>
                  <div className="text-lg font-semibold">
                    {new Date(relationship.relationship_start_date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Swipe Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center"
            >
              <div className="text-rose-100 text-sm mb-3">
                Swipe up to share your capacity
              </div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-8 h-8 mx-auto bg-white/20 rounded-full flex items-center justify-center"
              >
                <ChevronUp className="w-5 h-5 text-white" />
              </motion.div>
            </motion.div>

            {/* Settings button */}
            <button
              onClick={() => onNavigate('settings')}
              className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
          {/* Hero Background Image */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-400 via-pink-500 to-purple-600">
            {/* User's chosen photo would go here - for now using a gradient overlay */}
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          {/* Relationship Info Overlay */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-white text-center">
            {/* Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold mb-2">
                {getGreeting()}, {userName} 💕
              </h1>
              <p className="text-rose-100 text-lg">
                How are you feeling today?
              </p>
            </motion.div>

            {/* Relationship Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 max-w-sm"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Heart className="w-6 h-6 text-pink-200" fill="currentColor" />
                <span className="text-xl font-semibold">Together</span>
                <Heart className="w-6 h-6 text-pink-200" fill="currentColor" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1">
                    {timeTogether || '—'}
                  </div>
                  <div className="text-sm text-rose-100">
                    Time Together
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1">
                    {currentStreak || 0}
                  </div>
                  <div className="text-sm text-rose-100">
                    Day Streak
                  </div>
                </div>
              </div>

              {/* Anniversary Date */}
              {relationship?.relationship_start_date && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="text-sm text-rose-100 mb-1">
                    Anniversary
                  </div>
                  <div className="text-lg font-semibold">
                    {new Date(relationship.relationship_start_date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Swipe Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center"
            >
              <div className="text-rose-100 text-sm mb-3">
                Swipe up to share your capacity
              </div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-8 h-8 mx-auto bg-white/20 rounded-full flex items-center justify-center"
              >
                <ChevronUp className="w-5 h-5 text-white" />
              </motion.div>
            </motion.div>

            {/* Settings button */}
            <button
              onClick={() => onNavigate('settings')}
              className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </motion.div>
      ) : currentScreen === 'capacity' ? (
        // Capacity Screen - Full screen capacity sharing
        <motion.div
          key="capacity"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentScreen('home')}
                className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
              >
                <ChevronDown className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Share Your Capacity
              </h1>
              <div className="w-10"></div> {/* Spacer for centering */}
            </div>
          </div>

          {/* Capacity Sharing Interface */}
          <div className="px-6 pb-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Current capacity display */}
              {myCapacity && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center`}>
                      {myCapacity.energy_level >= 7 ? 'ðŸ˜Š' :
                       myCapacity.energy_level >= 4 ? 'ðŸ˜' : 'ðŸ˜ž'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Current: {myCapacity.mood_label || 'Not shared'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Energy level: {myCapacity.energy_level}/10
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Capacity check-in button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <button
                  onClick={() => onNavigate('capacity-checkin')}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-center gap-4">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center"
                    >
                      <Heart className="w-8 h-8 text-white" fill="white" />
                    </motion.div>
                    <div className="text-left">
                      <h2 className="text-2xl font-bold mb-1">
                        {myCapacity ? 'Update Your Capacity' : 'Share Your Capacity'}
                      </h2>
                      <p className="text-lg opacity-90">
                        {myCapacity
                          ? `Let ${partnerName} know how you're doing now`
                          : `Help ${partnerName} show up better for you`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-center">
                    <div className="bg-white/20 rounded-full px-6 py-2">
                      <span className="text-sm font-medium">Tap to share</span>
                    </div>
                  </div>
                </button>
              </motion.div>

              {/* Partner's capacity if available */}
              {partnerCapacity && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50"
                >
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {partnerName}'s capacity today
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center`}>
                      {partnerCapacity.energy_level >= 7 ? 'ðŸ˜Š' :
                       partnerCapacity.energy_level >= 4 ? 'ðŸ˜' : 'ðŸ˜ž'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {partnerCapacity.mood_label || 'Shared'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Energy: {partnerCapacity.energy_level}/10
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(partnerCapacity.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quick actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-4"
              >
                <button
                  onClick={() => onNavigate('messages')}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 hover:bg-white transition-colors"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <MessageCircleHeart className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Send Message</h3>
                  <p className="text-sm text-gray-600">Share what's on your mind</p>
                </button>

                <button
                  onClick={() => onNavigate('daily-question')}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 hover:bg-white transition-colors"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Daily Question</h3>
                  <p className="text-sm text-gray-600">Connect deeper today</p>
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      ) : (
        // Full Home Screen with all features
        <motion.div
          key="home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                {getGreeting()}, {userName} 💕
              </h1>
              <button
                onClick={() => onNavigate('settings')}
                className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-6 pb-6 space-y-6">
            {/* Partner Capacity Section */}
            {partnerCapacity && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50"
              >
                <PartnerCapacityView
                  capacity={partnerCapacity}
                  partnerName={partnerName}
                  onNavigate={onNavigate}
                />
              </motion.div>
            )}

            {/* Partner Needs Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <PartnerNeedsView
                onNavigate={onNavigate}
                onStartNeedPlan={handleStartNeedPlan}
              />
            </motion.div>

            {/* Daily Question */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-white/50 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Daily Question</h3>
                      <p className="text-sm text-gray-600">Connect deeper today</p>
                    </div>
                    {unreadCount > 0 && (
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">{unreadCount}</span>
                      </div>
                    )}
                  </div>

                  {hasCompletedDailyQuestion ? (
                    <div className="text-center py-4">
                      <div className="text-green-600 mb-2">✅ Completed!</div>
                      <p className="text-sm text-gray-600">Great job connecting today</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => onNavigate('daily-question')}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-4 font-medium hover:shadow-lg transition-shadow"
                    >
                      Answer Today's Question
                    </button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-4"
            >
              <button
                onClick={() => onNavigate('messages')}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 hover:bg-white transition-colors"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <MessageCircleHeart className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-gray-900">Messages</h3>
                <p className="text-sm text-gray-600">Share what's on your mind</p>
              </button>

              <button
                onClick={() => onNavigate('dates')}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 hover:bg-white transition-colors"
              >
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="font-semibold text-gray-900">Date Ideas</h3>
                <p className="text-sm text-gray-600">Plan something special</p>
              </button>
            </motion.div>

            {/* Streak & Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50"
            >
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {currentStreak || 0}
                  </div>
                  <div className="text-sm text-gray-600">Day Streak</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {totalCompleted || 0}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {unreadCount || 0}
                  </div>
                  <div className="text-sm text-gray-600">Unread</div>
                </div>
              </div>
            </motion.div>

            {/* Weekly Rhythm */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <WeeklyRhythm onNavigate={onNavigate} />
            </motion.div>

            {/* Share Capacity Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 shadow-lg"
            >
              <button
                onClick={() => onNavigate('capacity-checkin')}
                className="w-full text-white text-center"
              >
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Heart className="w-8 h-8" fill="white" />
                  <h3 className="text-xl font-bold">Share Your Capacity</h3>
                </div>
                <p className="text-white/90 text-sm">
                  {myCapacity
                    ? `Let ${partnerName} know how you're doing now`
                    : `Help ${partnerName} show up better for you`
                  }
                </p>
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
