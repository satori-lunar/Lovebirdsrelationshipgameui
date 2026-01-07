import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, Heart, CheckCircle, MessageCircle, Calendar, Sparkles, Users, Timer, Send, Copy, Zap, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { RelationshipNeed } from '../types/needs';
import { needsService } from '../services/needsService';
import { onboardingService } from '../services/onboardingService';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface NeedSupportPlanProps {
  need: RelationshipNeed;
  partnerName: string;
  onBack: () => void;
  onComplete: () => void;
}

type TimeAvailability = 'limited' | 'moderate' | 'plenty';
type ProximityType = 'together' | 'close' | 'distant' | 'long_distance';
type MentalCapacity = 'low' | 'moderate' | 'high';

export function NeedSupportPlan({ need, partnerName, onBack, onComplete }: NeedSupportPlanProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);

  // Get user's onboarding data for capacity assessment
  const { data: userOnboarding } = useQuery({
    queryKey: ['user-onboarding-capacity', user?.id],
    queryFn: () => user?.id ? onboardingService.getOnboarding(user.id) : null,
    enabled: !!user?.id,
  });

  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [scheduledReminders, setScheduledReminders] = useState<string[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  // Load saved progress on component mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const progress = await needsService.getSupportPlanProgress(need.id);
        if (progress) {
          setCompletedActions(new Set(progress.completedActions));
          setScheduledReminders(progress.scheduledReminders);
          console.log('✅ Loaded saved progress:', progress);
        } else {
          console.log('ℹ️ No saved progress found, starting fresh');
        }
      } catch (error) {
        console.error('Failed to load progress (column may not exist yet):', error);
        // Continue without saved progress - user can still use the plan
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [need.id]);

  // Save progress whenever it changes
  useEffect(() => {
    if (isLoadingProgress) return; // Don't save while loading

    const saveProgress = async () => {
      try {
        const progress = {
          completedActions: Array.from(completedActions),
          scheduledReminders,
          lastUpdated: new Date()
        };
        await needsService.saveSupportPlanProgress(need.id, progress);
        console.log('💾 Progress saved automatically');
      } catch (error) {
        console.error('Failed to save progress (column may not exist yet):', error);
        // Don't show error to user - saving is nice-to-have, not required
      }
    };

    const timeoutId = setTimeout(saveProgress, 1000); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [completedActions, scheduledReminders, need.id, isLoadingProgress]);
  const [showQualityTime, setShowQualityTime] = useState(false);

  // Component is now driven by real-time state and user interactions

  const assessTimeAvailability = (): TimeAvailability => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Start with time-of-day assessment
    let baseAvailability: TimeAvailability = 'moderate';

    // Morning (6-12): Limited - people are busy starting their day
    if (hour >= 6 && hour < 12) baseAvailability = 'limited';

    // Lunch time (12-14): Moderate - quick break available
    if (hour >= 12 && hour < 14) baseAvailability = 'moderate';

    // Afternoon work hours (14-17): Limited - busy work time
    if (hour >= 14 && hour < 17) baseAvailability = 'limited';

    // Early evening (17-20): Moderate - winding down, some time available
    if (hour >= 17 && hour < 20) baseAvailability = 'moderate';

    // Evening (20-22): Plenty - relaxed time, especially on weekends
    if (hour >= 20 && hour < 22) {
      baseAvailability = isWeekend ? 'plenty' : 'moderate';
    }

    // Late night (22-6): Limited - time for rest
    if (hour >= 22 || hour < 6) baseAvailability = 'limited';

    // Now adjust based on user's real data
    if (userOnboarding) {
      const energyLevel = userOnboarding.energy_level;

      // If user reports low energy, reduce availability
      if (energyLevel === 'low_energy' || energyLevel === 'very_low_energy') {
        if (baseAvailability === 'plenty') return 'moderate';
        if (baseAvailability === 'moderate') return 'limited';
        return 'limited';
      }

      // If user reports high energy, increase availability
      if (energyLevel === 'high_energy' || energyLevel === 'very_high_energy') {
        if (baseAvailability === 'limited') return 'moderate';
        if (baseAvailability === 'moderate') return 'plenty';
        return 'plenty';
      }

      // Check for work/stress indicators
      const feelLoved = userOnboarding.feel_loved;
      if (feelLoved === 'seldom' || feelLoved === 'never') {
        // User might be stressed, reduce availability
        if (baseAvailability === 'plenty') return 'moderate';
      }
    }

    return baseAvailability;
  };

  const assessProximity = (): ProximityType => {
    if (!relationship) return 'long_distance';

    // If no partner connected yet
    if (!relationship.partner_b_id) return 'long_distance';

    // First check relationship mode
    if (relationship.relationship_mode === 'long_distance') return 'long_distance';
    if (relationship.relationship_mode === 'solo') return 'distant';

    // Check user's onboarding for living situation
    if (userOnboarding) {
      const relationshipStatus = userOnboarding.relationship_status;

      // If they live together, they're physically close
      if (relationshipStatus === 'cohabitating') return 'together';

      // If married but not cohabitating, check if they're living separately
      if (relationshipStatus === 'living_separately') return 'distant';

      // If married and we don't know living situation, assume close
      if (relationshipStatus === 'married') return 'close';
    }

    // Fallback: check connection recency and relationship mode
    const hasRecentConnection = relationship.connected_at &&
      (Date.now() - new Date(relationship.connected_at).getTime()) < (30 * 24 * 60 * 60 * 1000); // 30 days

    return hasRecentConnection ? 'close' : 'distant';
  };

  const assessMentalCapacity = (): MentalCapacity => {
    if (!userOnboarding) return 'moderate'; // Default if no data

    const energyLevel = userOnboarding.energy_level;
    const feelLoved = userOnboarding.feel_loved;

    // Low energy indicates low mental capacity
    if (energyLevel === 'very_low_energy' || energyLevel === 'low_energy') {
      return 'low';
    }

    // High energy indicates high mental capacity
    if (energyLevel === 'high_energy' || energyLevel === 'very_high_energy') {
      return 'high';
    }

    // Check relationship satisfaction as indicator of mental load
    if (feelLoved === 'seldom' || feelLoved === 'never') {
      // Relationship stress might reduce mental capacity
      return 'low';
    }

    return 'moderate'; // Default moderate capacity
  };


  const handleSendMessage = async (message: string) => {
    await navigator.clipboard.writeText(message);
    toast.success("Message copied! Send it to your partner.");
    setCompletedActions(prev => new Set([...prev, 'immediate_message']));
  };

  const handleMicroConnection = async (action: string) => {
    setCompletedActions(prev => new Set([...prev, 'micro_connection']));
    toast.success("Great! Small actions make a big difference.");
  };

  const handleScheduleReminder = (reminder: string) => {
    setScheduledReminders(prev => [...prev, reminder]);
    toast.success("Reminder scheduled for later!");
  };

  const handleCompletePlan = async () => {
    try {
      await needsService.resolveNeed({
        needId: need.id,
        resolvedBy: user!.id,
        howItWasResolved: "Completed personalized support plan",
        wasHelpful: true
      });
      toast.success("Amazing work! Your partner will really appreciate your support.");
      onComplete();
    } catch (error) {
      console.error('Failed to complete plan:', error);
      toast.error('Failed to mark as complete');
    }
  };

  const timeAvailable = assessTimeAvailability();
  const proximity = assessProximity();
  const mentalCapacity = assessMentalCapacity();

  // Generate capacity-aware actions based on need + user capacity
  const generateCapacityAwareActions = () => {
    const needCategory = need.needCategory || (need as any).need_category;
    const actions = {
      immediateMessages: [] as string[],
      microConnections: [] as { text: string; action: () => void }[],
      primaryGoal: ''
    };

    // Generate capacity-aware actions based on need type
    if (needCategory === 'space') {
      actions.primaryGoal = 'Help partner feel respected and give them breathing room';

      // Immediate messages - always available regardless of capacity
      actions.immediateMessages = [
        "Take all the time you need. I'm here when you're ready.",
        "I respect your need for space. Take care of yourself.",
        "No pressure. Whenever you're ready to connect, I'm here."
      ];

      // Micro-connections based on capacity and proximity
      if (mentalCapacity === 'high' && timeAvailable === 'plenty') {
        // High capacity - can offer more support
        actions.microConnections = [
          {
            text: proximity === 'close' ? "Give them a gentle hug if they're open to it" : "Send a quick 'thinking of you' text",
            action: () => handleMicroConnection('gentle_affection')
          },
          {
            text: "Plan a low-pressure check-in for tomorrow",
            action: () => handleScheduleReminder("Tomorrow: Gentle check-in - 'How are you feeling?'")
          }
        ];
      } else if (mentalCapacity === 'moderate' || timeAvailable === 'moderate') {
        // Moderate capacity - balanced approach
        actions.microConnections = [
          {
            text: "Send one emoji heart if it feels right",
            action: () => handleMicroConnection('subtle_connection')
          },
          {
            text: "Respect their space - no messages unless they initiate",
            action: () => handleMicroConnection('space_respect')
          }
        ];
      } else {
        // Low capacity - minimal, respectful actions
        actions.microConnections = [
          {
            text: "Simply acknowledge their need for space internally",
            action: () => handleMicroConnection('internal_acknowledgment')
          },
          {
            text: "Focus on giving them uninterrupted space",
            action: () => handleMicroConnection('space_honoring')
          }
        ];
      }
    } else if (needCategory === 'affection') {
      actions.primaryGoal = 'Help partner feel loved and valued';

      actions.immediateMessages = [
        "You mean the world to me. I hope you know that.",
        "I'm so grateful to have you in my life.",
        "Thinking of you with a smile right now."
      ];

      if (mentalCapacity === 'high' && timeAvailable === 'plenty') {
        actions.microConnections = [
          {
            text: proximity === 'close' ? "Share a specific compliment about them" : "Send a voice message with appreciation",
            action: () => handleMicroConnection('personal_affection')
          },
          {
            text: "Write down 3 things you love about them",
            action: () => handleMicroConnection('reflection_affection')
          }
        ];
      } else if (mentalCapacity === 'moderate' || timeAvailable === 'moderate') {
        actions.microConnections = [
          {
            text: "Send a heart emoji with a simple 'thinking of you'",
            action: () => handleMicroConnection('quick_affection')
          },
          {
            text: "Look at a photo of them and smile",
            action: () => handleMicroConnection('internal_affection')
          }
        ];
      } else {
        actions.microConnections = [
          {
            text: "Take a moment to appreciate them internally",
            action: () => handleMicroConnection('quiet_affection')
          },
          {
            text: "Send a simple heart emoji",
            action: () => handleMicroConnection('minimal_affection')
          }
        ];
      }
    } else if (needCategory === 'communication') {
      actions.primaryGoal = 'Help partner feel heard and understood';

      actions.immediateMessages = [
        "I'm here to listen whenever you want to talk.",
        "Your thoughts and feelings matter to me.",
        "I want to understand your perspective better."
      ];

      if (mentalCapacity === 'high' && timeAvailable === 'plenty') {
        actions.microConnections = [
          {
            text: "Ask open-ended questions about their day",
            action: () => handleMicroConnection('deep_listening')
          },
          {
            text: "Set aside focused time for conversation",
            action: () => handleScheduleReminder("Tonight: 15-minute focused conversation")
          }
        ];
      } else if (mentalCapacity === 'moderate' || timeAvailable === 'moderate') {
        actions.microConnections = [
          {
            text: "Send 'How was your day?' and actually listen to response",
            action: () => handleMicroConnection('balanced_listening')
          },
          {
            text: "Practice active listening without distractions",
            action: () => handleMicroConnection('present_listening')
          }
        ];
      } else {
        actions.microConnections = [
          {
            text: "Send 'I'm here if you want to talk'",
            action: () => handleMicroConnection('available_signal')
          },
          {
            text: "Put away phone during their responses",
            action: () => handleMicroConnection('undivided_attention')
          }
        ];
      }
    } else {
      // Generic fallback for other need types
      actions.primaryGoal = 'Support your partner with actions that match your current capacity';

      actions.immediateMessages = [
        "I'm thinking about you and care about how you're feeling.",
        "You matter to me, and I'm here for you.",
        "I appreciate you and our relationship."
      ];

      actions.microConnections = [
        {
          text: "Send a supportive message matching your capacity",
          action: () => handleMicroConnection('capacity_aware_support')
        },
        {
          text: "Take one small action that feels manageable",
          action: () => handleMicroConnection('appropriate_effort')
        }
      ];
    }

    return actions;
  };

  const capacityActions = generateCapacityAwareActions();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 px-4 py-6 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Plan for {partnerName}</h1>
            <p className="text-gray-600">Helping with: {need.needCategory || (need as any).need_category ? (need.needCategory || (need as any).need_category).replace('_', ' ') : 'Unknown need'}</p>
          </div>
        </motion.div>

        {/* Support Context */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Your Support Context
                {!isLoadingProgress && (
                  <span className="text-xs text-green-600 ml-auto flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Progress saved
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-blue-50 rounded-lg gap-2 sm:gap-0">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">Partner Need</p>
                      <p className="text-xs text-gray-600 break-words">{need.needCategory || (need as any).need_category ? (need.needCategory || (need as any).need_category).replace('_', ' ') : 'Unknown need'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-orange-50 rounded-lg gap-2 sm:gap-0">
                  <div className="flex items-center gap-3">
                    <Timer className={`w-5 h-5 flex-shrink-0 ${timeAvailable === 'plenty' ? 'text-green-600' : timeAvailable === 'moderate' ? 'text-yellow-600' : 'text-red-600'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">Time Available</p>
                      <p className="text-xs text-gray-600 break-words capitalize">{timeAvailable}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-blue-50 rounded-lg gap-2 sm:gap-0">
                  <div className="flex items-center gap-3">
                    <Zap className={`w-5 h-5 flex-shrink-0 ${mentalCapacity === 'high' ? 'text-green-600' : mentalCapacity === 'moderate' ? 'text-yellow-600' : 'text-red-600'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">Mental Capacity</p>
                      <p className="text-xs text-gray-600 break-words capitalize">{mentalCapacity} bandwidth</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-green-50 rounded-lg gap-2 sm:gap-0">
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-5 h-5 flex-shrink-0 ${proximity === 'close' ? 'text-green-600' : 'text-blue-600'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">Physical Proximity</p>
                      <p className="text-xs text-gray-600 break-words capitalize">{proximity.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-900 mb-1">Tailored Approach</p>
                  <p className="text-xs text-purple-700">{capacityActions.primaryGoal}</p>
                  <p className="text-xs text-purple-600 mt-1">
                    Based on your {mentalCapacity} capacity, {timeAvailable} time, and {proximity.replace('_', ' ')} proximity
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 1: Immediate Emotional Regulation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Step 1: Immediate Emotional Regulation (2–3 minutes)
              </CardTitle>
                <p className="text-sm text-gray-600">{capacityActions.primaryGoal}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 mb-3">Capacity-aware messages ({mentalCapacity} mental capacity, {timeAvailable} time):</p>

                {capacityActions.immediateMessages.map((message, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 italic break-words">"{message}"</p>
                    </div>
                    <div className="flex gap-2 self-end sm:self-auto">
                      <Button
                        onClick={() => handleSendMessage(message)}
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Send
                      </Button>
                      <Button
                        onClick={() => navigator.clipboard.writeText(message)}
                        size="sm"
                        variant="outline"
                        className="text-xs px-3"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 2: Micro-Connection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-600" />
                Step 2: Micro-Connection (No Planning Required)
              </CardTitle>
              <p className="text-sm text-gray-600">Even small moments of presence reduce emotional distance.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-700">Capacity-tailored actions (takes 1-2 minutes):</p>

                {capacityActions.microConnections.map((connection, index) => {
                  const colors = [
                    { bg: 'bg-green-50', hover: 'hover:bg-green-100', border: 'border-green-200', text: 'text-green-600', title: 'text-green-900', desc: 'text-green-700' },
                    { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', border: 'border-blue-200', text: 'text-blue-600', title: 'text-blue-900', desc: 'text-blue-700' },
                    { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-200', text: 'text-purple-600', title: 'text-purple-900', desc: 'text-purple-700' }
                  ][index % 3];

                  return (
                    <Button
                      key={index}
                      onClick={connection.action}
                      className={`w-full justify-start p-4 h-auto ${colors.bg} ${colors.hover} ${colors.border} text-left`}
                      variant="outline"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <CheckCircle className={`w-4 h-4 mt-1 ${colors.text} flex-shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium ${colors.title} break-words`}>{connection.text}</p>
                          <p className={`text-sm ${colors.desc} break-words`}>
                            {mentalCapacity === 'high' ? 'Thoughtful support' :
                             mentalCapacity === 'moderate' ? 'Balanced approach' :
                             'Respectful minimum'}
                          </p>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 3: Auto-Scheduled Follow-Through */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Step 3: Auto-Scheduled Follow-Through (System Handles It)
              </CardTitle>
              <p className="text-sm text-gray-600">No vague "check in later" - specific reminders at realistic times.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeAvailable === 'plenty' && (
                  <>
                    <Button
                      onClick={() => handleScheduleReminder("Tonight at 8:30pm: Send one appreciation message")}
                      className="w-full justify-start p-4 h-auto bg-orange-50 hover:bg-orange-100 border-orange-200 text-left"
                      variant="outline"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <Clock className="w-4 h-4 mt-1 text-orange-600 flex-shrink-0" />
                        <p className="font-medium text-orange-900 break-words">Tonight at 8:30pm: Send one appreciation message</p>
                      </div>
                    </Button>

                    <Button
                      onClick={() => handleScheduleReminder("Tomorrow morning: Ask how they're feeling today")}
                      className="w-full justify-start p-4 h-auto bg-orange-50 hover:bg-orange-100 border-orange-200 text-left"
                      variant="outline"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <Clock className="w-4 h-4 mt-1 text-orange-600 flex-shrink-0" />
                        <p className="font-medium text-orange-900 break-words">Tomorrow morning: Ask how they're feeling today</p>
                      </div>
                    </Button>
                  </>
                )}

                {timeAvailable === 'moderate' && (
                  <Button
                    onClick={() => handleScheduleReminder("Tomorrow evening: 5-minute check-in call")}
                    className="w-full justify-start p-4 h-auto bg-orange-50 hover:bg-orange-100 border-orange-200 text-left"
                    variant="outline"
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Clock className="w-4 h-4 mt-1 text-orange-600 flex-shrink-0" />
                      <p className="font-medium text-orange-900 break-words">Tomorrow evening: 5-minute check-in call</p>
                    </div>
                  </Button>
                )}

                {timeAvailable === 'limited' && (
                  <Button
                    onClick={() => handleScheduleReminder("When you have a quiet moment: Send 'thinking of you'")}
                    className="w-full justify-start p-4 h-auto bg-orange-50 hover:bg-orange-100 border-orange-200 text-left"
                    variant="outline"
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Clock className="w-4 h-4 mt-1 text-orange-600 flex-shrink-0" />
                      <p className="font-medium text-orange-900 break-words">When you have a quiet moment: Send 'thinking of you'</p>
                    </div>
                  </Button>
                )}
              </div>

              {scheduledReminders.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-2">Scheduled reminders:</p>
                  <ul className="space-y-1">
                    {scheduledReminders.map((reminder, index) => (
                      <li key={index} className="text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3" />
                        {reminder}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 4: Assisted Quality Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Step 4: Assisted Quality Time (When Time Allows)
              </CardTitle>
              <p className="text-sm text-gray-600">Pre-built options with scripts and prompts when you're ready for more.</p>
            </CardHeader>
            <CardContent>
              {!showQualityTime ? (
                <Button
                  onClick={() => setShowQualityTime(true)}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  Show Quality Time Options
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                    <h4 className="font-medium text-indigo-900 mb-2">15-minute "Reconnect" Script</h4>
                    <p className="text-sm text-indigo-700 mb-2">Time estimate: 15 minutes | Emotional goal: Rebuild connection</p>
                    <ul className="text-sm text-indigo-700 space-y-1 ml-4">
                      <li>• 5 min: Share one positive moment from your day</li>
                      <li>• 5 min: Ask "What's one thing I can do to support you better?"</li>
                      <li>• 5 min: End with appreciation and physical closeness</li>
                    </ul>
                  </div>

                  {proximity === 'close' && (
                    <div className="p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                      <h4 className="font-medium text-indigo-900 mb-2">Short Walk + Guided Prompts</h4>
                      <p className="text-sm text-indigo-700 mb-2">Time estimate: 20 minutes | Emotional goal: Deeper understanding</p>
                      <ul className="text-sm text-indigo-700 space-y-1 ml-4">
                        <li>• Walk together without phones</li>
                        <li>• Ask: "What's been most challenging for you lately?"</li>
                        <li>• Share: "This is what's been on my mind..."</li>
                      </ul>
                    </div>
                  )}

                  <div className="p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                    <h4 className="font-medium text-indigo-900 mb-2">Sit Together + Shared Question Pack</h4>
                    <p className="text-sm text-indigo-700 mb-2">Time estimate: 10-15 minutes | Emotional goal: Emotional intimacy</p>
                    <ul className="text-sm text-indigo-700 space-y-1 ml-4">
                      <li>• Exact words: "I want to really hear about your day"</li>
                      <li>• Take turns answering: "What's one thing you're proud of?"</li>
                      <li>• End with: "What's one way I can love you better?"</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress & Success Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                How You'll Know It's Working
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${completedActions.has('immediate_message') ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${completedActions.has('immediate_message') ? 'text-green-800' : 'text-gray-600'}`}>
                    {completedActions.has('immediate_message') ? '✅' : '○'} Partner receives immediate emotional reassurance
                  </p>
                </div>

                <div className={`p-3 rounded-lg ${completedActions.has('micro_connection') ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${completedActions.has('micro_connection') ? 'text-green-800' : 'text-gray-600'}`}>
                    {completedActions.has('micro_connection') ? '✅' : '○'} Small moments of presence reduce emotional distance
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 Small actions are adding up. Your partner is engaging more.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Complete Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-3"
        >
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1"
          >
            Continue Later
          </Button>
          <Button
            onClick={handleCompletePlan}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark Complete
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
