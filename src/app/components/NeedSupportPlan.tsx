import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, Heart, CheckCircle, MessageCircle, Calendar, Sparkles, Users, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { RelationshipNeed } from '../types/needs';
import { needsService } from '../services/needsService';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { toast } from 'sonner';

interface NeedSupportPlanProps {
  need: RelationshipNeed;
  partnerName: string;
  onBack: () => void;
  onComplete: () => void;
}

type TimeAvailability = 'limited' | 'moderate' | 'plenty';
type ProximityType = 'together' | 'close' | 'distant' | 'long_distance';

interface SupportPlan {
  timeAvailable: TimeAvailability;
  proximity: ProximityType;
  priorityActions: string[];
  timeline: string[];
  checkInSchedule: string[];
  successMetrics: string[];
}

export function NeedSupportPlan({ need, partnerName, onBack, onComplete }: NeedSupportPlanProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);
  const [plan, setPlan] = useState<SupportPlan | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Generate personalized support plan
  useEffect(() => {
    generateSupportPlan();
  }, [need, relationship]);

  const generateSupportPlan = async () => {
    if (!relationship || !partnerId) return;

    // Get partner's profile for personalization
    let partnerProfile: any = {};
    try {
      const { data: profile } = await import('../services/api').then(api =>
        api.api.supabase
          .from('onboarding_responses')
          .select('love_language_primary, communication_style, favorite_activities, energy_level')
          .eq('user_id', partnerId)
          .maybeSingle()
      );
      partnerProfile = profile || {};
    } catch (error) {
      console.error('Failed to fetch partner profile:', error);
    }

    const supportPlan: SupportPlan = {
      timeAvailable: assessTimeAvailability(),
      proximity: assessProximity(),
      priorityActions: generatePriorityActions(need, partnerProfile, assessTimeAvailability(), assessProximity()),
      timeline: generateTimeline(need, assessTimeAvailability()),
      checkInSchedule: generateCheckInSchedule(assessTimeAvailability()),
      successMetrics: generateSuccessMetrics(need)
    };

    setPlan(supportPlan);
  };

  const assessTimeAvailability = (): TimeAvailability => {
    // Simple assessment - in a real app this could be more sophisticated
    const hour = new Date().getHours();
    const isWeekend = [0, 6].includes(new Date().getDay());

    if (isWeekend && (hour >= 10 && hour <= 22)) return 'plenty';
    if (!isWeekend && (hour >= 18 && hour <= 22)) return 'moderate';
    return 'limited';
  };

  const assessProximity = (): ProximityType => {
    // Check if they have an active relationship (implies they're connected)
    // In a real app, this could check GPS proximity or user preference
    if (!relationship?.connected_at) return 'long_distance';
    if (relationship?.relationship_mode === 'solo') return 'distant';
    return 'close'; // Assume they're close if in a relationship
  };

  const generatePriorityActions = (
    need: RelationshipNeed,
    partnerProfile: any,
    timeAvailable: TimeAvailability,
    proximity: ProximityType
  ): string[] => {
    const actions: string[] = [];
    const loveLanguage = partnerProfile.love_language_primary || 'quality_time';
    const energyLevel = partnerProfile.energy_level || 'balanced';

    switch (need.needCategory) {
      case 'affection':
        if (loveLanguage === 'words') {
          actions.push("Send a heartfelt message sharing 3 specific things you appreciate about them");
          if (proximity === 'close') {
            actions.push("Plan a 10-minute 'appreciation chat' where you only talk about what you love about each other");
          }
        } else if (loveLanguage === 'touch') {
          if (proximity === 'close') {
            actions.push("Initiate physical affection - a hug, holding hands, or just sitting close while watching something");
          } else {
            actions.push("Send a voice message saying how much you miss their touch and warmth");
          }
        } else if (loveLanguage === 'quality_time') {
          if (timeAvailable === 'plenty') {
            actions.push("Set aside 30-60 minutes of focused, distraction-free time together");
          } else {
            actions.push("Send them a 'quality time' promise for later this week when you have more time");
          }
        }
        break;

      case 'communication':
        actions.push("Ask open-ended questions: 'What's been on your mind lately?' or 'How are you really feeling?'");
        if (loveLanguage === 'quality_time') {
          actions.push("Schedule a 'deep talk' session without distractions - put phones away and really listen");
        }
        if (proximity === 'close') {
          actions.push("Create a 'communication ritual' - same time each day for checking in with each other");
        }
        break;

      case 'quality_time':
        if (timeAvailable === 'plenty') {
          actions.push("Plan an activity from their favorite activities list and give them your full attention");
        } else {
          actions.push("Send them a calendar invite for dedicated time together later this week");
        }
        if (proximity === 'close') {
          actions.push("Do a 'parallel activity' - work on separate things in the same room, staying connected");
        }
        break;

      case 'support':
        actions.push("Ask them directly: 'What would actually help right now - advice, listening, or just being there?'");
        actions.push("Validate their feelings first: 'That sounds really hard' or 'You have every right to feel this way'");
        if (energyLevel === 'low_energy') {
          actions.push("Offer low-energy support - send encouraging texts throughout the day or order their favorite comfort food");
        }
        break;

      case 'fun':
        if (timeAvailable === 'plenty') {
          actions.push("Plan a spontaneous fun activity - game night, dance party, or silly TikTok challenge");
        } else {
          actions.push("Send funny memes, videos, or plan a 'fun promise' for when you have more time");
        }
        actions.push("Share something that made you laugh today and ask them to share theirs");
        break;

      default:
        actions.push("Start with listening - ask them to tell you more about what they need and really hear them");
        actions.push("Show you care through action - do one small thing today that shows you're paying attention");
    }

    return actions;
  };

  const generateTimeline = (need: RelationshipNeed, timeAvailable: TimeAvailability): string[] => {
    const timeline: string[] = [];

    if (timeAvailable === 'plenty') {
      timeline.push("Today: Start with immediate action - send a message or initiate contact");
      timeline.push("Next 2-3 days: Follow through on your plan with consistent effort");
      timeline.push("End of week: Check in on progress and adjust as needed");
    } else if (timeAvailable === 'moderate') {
      timeline.push("Today: Quick action - send a thoughtful message or make a concrete plan");
      timeline.push("Tomorrow: Follow up with the first step of your action plan");
      timeline.push("This week: Complete the main support action and check in");
    } else {
      timeline.push("Today: Send an acknowledging message showing you heard them");
      timeline.push("Soon: Schedule time to properly address their need");
      timeline.push("When possible: Follow through with meaningful support");
    }

    return timeline;
  };

  const generateCheckInSchedule = (timeAvailable: TimeAvailability): string[] => {
    if (timeAvailable === 'plenty') {
      return ["Tomorrow morning", "2 days from now", "End of week"];
    } else if (timeAvailable === 'moderate') {
      return ["Tomorrow", "Mid-week"];
    } else {
      return ["When you have time", "End of week"];
    }
  };

  const generateSuccessMetrics = (need: RelationshipNeed): string[] => {
    const metrics: string[] = [];

    switch (need.needCategory) {
      case 'affection':
        metrics.push("They feel more loved and appreciated");
        metrics.push("You notice them smiling or seeming happier");
        metrics.push("They initiate more positive interactions");
        break;
      case 'communication':
        metrics.push("Conversations feel deeper and more connected");
        metrics.push("They share more openly with you");
        metrics.push("You understand their perspective better");
        break;
      case 'quality_time':
        metrics.push("They comment on enjoying time together");
        metrics.push("You both feel more connected");
        metrics.push("Distractions during time together decrease");
        break;
      case 'support':
        metrics.push("They express feeling supported and less alone");
        metrics.push("Their stress or challenges seem more manageable");
        metrics.push("They reach out to you when they need help");
        break;
      case 'fun':
        metrics.push("You hear them laugh more often");
        metrics.push("They suggest fun activities or moments");
        metrics.push("The relationship feels lighter and more playful");
        break;
      default:
        metrics.push("They express appreciation for your support");
        metrics.push("The issue they mentioned feels addressed");
        metrics.push("They seem more content and at peace");
    }

    return metrics;
  };

  const handleStepComplete = (stepIndex: number) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepIndex);
    setCompletedSteps(newCompleted);
    setCurrentStep(stepIndex + 1);
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

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-purple-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-purple-200 rounded"></div>
              <div className="h-24 bg-purple-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 p-6">
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
            <p className="text-gray-600">Helping with: {need.needCategory.replace('_', ' ')}</p>
          </div>
        </motion.div>

        {/* Context Assessment */}
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Timer className={`w-5 h-5 ${plan.timeAvailable === 'plenty' ? 'text-green-600' : plan.timeAvailable === 'moderate' ? 'text-yellow-600' : 'text-red-600'}`} />
                  <div>
                    <p className="font-medium text-sm">Time Available</p>
                    <p className="text-xs text-gray-600 capitalize">{plan.timeAvailable}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <MapPin className={`w-5 h-5 ${plan.proximity === 'close' || plan.proximity === 'together' ? 'text-green-600' : 'text-blue-600'}`} />
                  <div>
                    <p className="font-medium text-sm">Physical Proximity</p>
                    <p className="text-xs text-gray-600 capitalize">{plan.proximity.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Priority Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Your Action Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plan.priorityActions.map((action, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      completedSteps.has(index)
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                        completedSteps.has(index)
                          ? 'bg-green-500 text-white'
                          : 'bg-purple-100 text-purple-600'
                      }`}>
                        {completedSteps.has(index) ? '✓' : index + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${completedSteps.has(index) ? 'text-green-800' : 'text-gray-700'}`}>
                          {action}
                        </p>
                        {!completedSteps.has(index) && (
                          <Button
                            onClick={() => handleStepComplete(index)}
                            size="sm"
                            className="mt-2 bg-purple-500 hover:bg-purple-600 text-white"
                          >
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.timeline.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-sm text-gray-700">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Success Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-600" />
                How You'll Know It's Working
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {plan.successMetrics.map((metric, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-pink-500 rounded-full mt-2"></div>
                    <p className="text-sm text-gray-700">{metric}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Check-in Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Follow-up Check-ins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-3">
                We'll remind you to check in on progress:
              </p>
              <div className="space-y-2">
                {plan.checkInSchedule.map((checkin, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-orange-50 rounded">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-700">{checkin}</span>
                  </div>
                ))}
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
