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
  }, [need, relationship, partnerId]);

  const generateSupportPlan = async () => {
    // Get partner's profile for personalization
    let partnerProfile: any = {};
    try {
      const { data: profile } = await import('../services/api').then(api =>
        api.api.supabase
          .from('onboarding_responses')
          .select('love_language_primary, communication_style, favorite_activities, energy_level, budget_comfort')
          .eq('user_id', partnerId)
          .maybeSingle()
      );
      partnerProfile = profile || {};
    } catch (error) {
      console.error('Failed to fetch partner profile:', error);
    }

    const timeAvailable = assessTimeAvailability();
    const proximity = assessProximity();

    const supportPlan: SupportPlan = {
      timeAvailable,
      proximity,
      priorityActions: generatePriorityActions(need, partnerProfile, timeAvailable, proximity),
      timeline: generateTimeline(need, timeAvailable),
      checkInSchedule: generateCheckInSchedule(timeAvailable),
      successMetrics: generateSuccessMetrics(need)
    };

    setPlan(supportPlan);
  };

  const assessTimeAvailability = (): TimeAvailability => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Morning (6-12): Limited - people are busy starting their day
    if (hour >= 6 && hour < 12) return 'limited';

    // Lunch time (12-14): Moderate - quick break available
    if (hour >= 12 && hour < 14) return 'moderate';

    // Afternoon work hours (14-17): Limited - busy work time
    if (hour >= 14 && hour < 17) return 'limited';

    // Early evening (17-20): Moderate - winding down, some time available
    if (hour >= 17 && hour < 20) return 'moderate';

    // Evening (20-22): Plenty - relaxed time, especially on weekends
    if (hour >= 20 && hour < 22) {
      return isWeekend ? 'plenty' : 'moderate';
    }

    // Late night (22-6): Limited - time for rest
    return 'limited';
  };

  const assessProximity = (): ProximityType => {
    if (!relationship) return 'long_distance';

    // If no partner connected yet
    if (!relationship.partner_b_id) return 'long_distance';

    // Check relationship mode and living situation from onboarding
    // For now, use relationship data - in future could integrate GPS
    const hasRecentConnection = relationship.connected_at &&
      (Date.now() - new Date(relationship.connected_at).getTime()) < (30 * 24 * 60 * 60 * 1000); // 30 days

    if (relationship.relationship_mode === 'long_distance') return 'long_distance';
    if (relationship.relationship_mode === 'solo') return 'distant';

    // Check if they live together (from onboarding data if available)
    // For now, assume close proximity unless specified as long distance
    return hasRecentConnection ? 'close' : 'distant';
  };

  const generatePriorityActions = (
    need: RelationshipNeed,
    partnerProfile: any,
    timeAvailable: TimeAvailability,
    proximity: ProximityType
  ): string[] => {
    const actions: string[] = [];
    const loveLanguage = partnerProfile.love_language_primary || 'quality_time';
    const favoriteActivities = partnerProfile.favorite_activities || [];
    const energyLevel = partnerProfile.energy_level || 'balanced';
    const communicationStyle = partnerProfile.communication_style || 'gentle';

    // Create specific, actionable steps based on real data
    switch (need.needCategory) {
      case 'affection':
        if (loveLanguage === 'words') {
          if (communicationStyle === 'playful') {
            actions.push(`Send: "Just thinking about you and smiling. You're the highlight of my day 💕"`);
            actions.push(`Send: "I love how you [mention something specific about them]. It makes me feel so lucky."`);
          } else if (communicationStyle === 'direct') {
            actions.push(`Send: "I want you to know how much I care about you. You're important to me."`);
            actions.push(`Send: "Thinking of you right now. Just wanted to say I appreciate you."`);
          } else {
            actions.push(`Send: "I'm so grateful to have you in my life. You make everything better."`);
            actions.push(`Send: "You mean the world to me. I hope you know that."`);
          }
        } else if (loveLanguage === 'touch' && proximity === 'close') {
          actions.push(`Give them a hug when you see them next - no words needed, just closeness`);
          actions.push(`Hold their hand while watching TV or walking together tonight`);
          actions.push(`Cuddle up together - physical closeness shows you care`);
        } else if (loveLanguage === 'quality_time') {
          if (timeAvailable === 'plenty') {
            actions.push(`Spend 20 minutes of focused time together - phones away, just being present`);
            if (favoriteActivities.length > 0) {
              actions.push(`Do ${favoriteActivities[0].toLowerCase()} together - give them your full attention`);
            }
          } else {
            actions.push(`Send: "I can't wait for our next date night. You make time together so special."`);
          }
        } else if (loveLanguage === 'acts') {
          actions.push(`Make them their favorite drink or prepare something they enjoy without being asked`);
          actions.push(`Take care of a small task they've mentioned - show you listen through actions`);
        }
        break;

      case 'communication':
        if (communicationStyle === 'playful') {
          actions.push(`Send: "Hey, what's new with you? I want to hear everything! 😊"`);
          actions.push(`Ask: "What's been making you laugh lately? Tell me a funny story."`);
        } else if (communicationStyle === 'direct') {
          actions.push(`Send: "I want to know how you're really doing. What's on your mind?"`);
          actions.push(`Ask: "How has your day been? I want to hear about it."`);
        } else {
          actions.push(`Send: "I've been thinking about you. How are you feeling today?"`);
          actions.push(`Ask: "What's something you'd like to talk about? I'm here to listen."`);
        }

        if (proximity === 'close' && timeAvailable !== 'limited') {
          actions.push(`Set aside 15 minutes for a conversation - phones away, eye contact, really listen`);
        }
        break;

      case 'quality_time':
        if (favoriteActivities.length > 0) {
          if (timeAvailable === 'plenty') {
            actions.push(`Plan to ${favoriteActivities[0].toLowerCase()} together tonight - make it special`);
            if (favoriteActivities.length > 1) {
              actions.push(`Try ${favoriteActivities[1].toLowerCase()} as a couple - create new memories`);
            }
          } else {
            actions.push(`Send: "Let's ${favoriteActivities[0].toLowerCase()} together soon. I can't wait! 📅"`);
          }
        } else {
          if (proximity === 'close') {
            actions.push(`Cook dinner together - prep, cook, eat, and clean up as a team`);
            actions.push(`Take a walk together and talk about your day - simple but meaningful`);
          } else {
            actions.push(`Schedule a video call for ${timeAvailable === 'plenty' ? 'tonight' : 'tomorrow'} - focused time together`);
          }
        }
        break;

      case 'support':
        actions.push(`Send: "I hear that ${need.context ? need.context.substring(0, 30) + '...' : 'you\'re going through something'}. I'm here for you."`);
        actions.push(`Ask: "What would help most right now - listening, advice, or just being present?"`);

        if (energyLevel === 'low_energy') {
          actions.push(`Send encouraging texts throughout the day: "Thinking of you 💙" or "You've got this"`);
        } else {
          actions.push(`Offer specific help: "Can I pick up groceries for you?" or "Would a home-cooked meal help?"`);
        }
        break;

      case 'fun':
        if (favoriteActivities.some(a => a.toLowerCase().includes('game'))) {
          actions.push(`Send: "Game night? Your turn to pick the game 🎲"`);
          actions.push(`Set up a board game or card game session - keep it light and fun`);
        } else if (favoriteActivities.some(a => a.toLowerCase().includes('movie') || a.toLowerCase().includes('tv'))) {
          actions.push(`Send: "Comedy movie marathon tonight? 🍿"`);
          actions.push(`Pick their favorite comedy and watch together - share the laughs`);
        } else {
          actions.push(`Send: "Let's do something spontaneous and fun. Ideas? 🎉"`);
          actions.push(`Plan a silly activity: make funny TikToks, have a dance party, or tell jokes`);
        }

        if (proximity === 'close') {
          actions.push(`Create inside jokes together - find something silly and laugh about it`);
        }
        break;

      case 'appreciation':
        if (communicationStyle === 'playful') {
          actions.push(`Send: "You're basically a superhero in my life. Just FYI 🦸‍♀️"`);
          actions.push(`List 3 specific things they did this week that you appreciate`);
        } else {
          actions.push(`Send: "I don't say it enough, but I'm so grateful for everything you do. Thank you."`);
          actions.push(`Tell them specifically: "I appreciate how you [mention something they did recently]"`);
        }
        break;

      case 'understanding':
        actions.push(`Send: "I want to understand your perspective better. Can you tell me more about how you see it?"`);
        actions.push(`Listen without defending: just hear them out completely before sharing your view`);
        break;

      case 'consistency':
        actions.push(`Send: "I commit to checking in with you every morning. Here's to being more consistent! 📅"`);
        actions.push(`Create a daily ritual: same time each day for connection, even if just a quick text`);
        break;

      default:
        actions.push(`Start with empathy: "I hear you. Tell me more about what's going on."`);
        actions.push(`Ask what they need: "What would be most helpful from me right now?"`);
        actions.push(`Follow through: Whatever they ask for, make it happen`);
    }

    return actions;
  };

  const generateTimeline = (need: RelationshipNeed, timeAvailable: TimeAvailability): string[] => {
    const now = new Date();
    const hour = now.getHours();
    const timeline: string[] = [];

    if (timeAvailable === 'plenty') {
      // Evening/weekend time - can act immediately
      timeline.push(`Today (${hour >= 18 ? 'now' : 'this evening'}): Send the first message from your action plan above`);
      timeline.push("Tonight: Follow through with your planned activity or quality time");
      timeline.push("Tomorrow: Send a follow-up message asking how they're feeling");
      timeline.push("This week: Continue the support and check in regularly");
    } else if (timeAvailable === 'moderate') {
      // Evening time on weekday - some time available
      timeline.push(`Today (${hour >= 17 ? 'now' : 'this evening'}): Send an initial supportive message`);
      timeline.push("Tomorrow: Follow up with more substantial support from your action plan");
      timeline.push("This week: Complete the main support actions and maintain connection");
    } else {
      // Busy time - limited immediate availability
      timeline.push("Today: Send a quick acknowledging message showing you heard them");
      timeline.push("This evening: Send a more substantial message from your action plan");
      timeline.push("Tomorrow: Follow through with concrete support actions");
      timeline.push("This week: Build on the initial support with ongoing care");
    }

    return timeline;
  };

  const generateCheckInSchedule = (timeAvailable: TimeAvailability): string[] => {
    const now = new Date();
    const hour = now.getHours();

    if (timeAvailable === 'plenty') {
      // Can be more frequent with plenty of time
      return [
        "Tomorrow morning - ask how they're feeling after your support",
        "2 days from now - check on progress",
        "End of week - see how things have improved"
      ];
    } else if (timeAvailable === 'moderate') {
      return [
        "Tomorrow - follow up on your initial message",
        "Mid-week - check in on how the support is landing"
      ];
    } else {
      // Limited time - focus on key moments
      return [
        "This evening - send your planned supportive message",
        "Tomorrow - check in after your message",
        "When you have time - follow through on action items"
      ];
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
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Creating your personalized support plan...</p>
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
