/**
 * Frequency Service
 *
 * Adaptive check-in and prompt frequency management.
 * Reduces prompts over time as couples gain independence.
 * Goal: By 6 months, minimal app dependency.
 */

import { api } from './api';
import { partnerProfileService } from './partnerProfileService';
import { needsService } from './needsService';
import {
  FrequencyConfig,
  EngagementPatterns,
  CheckinTime
} from '../types/partnerProfile';

interface FrequencyDecision {
  shouldSend: boolean;
  reasoning: string;
  nextCheckTime?: Date;
  alternativeAction?: string;
}

interface GraduationStatus {
  weeksSinceStart: number;
  independenceScore: number;
  graduationProgress: number; // 0-100, toward 6-month goal
  isGraduated: boolean;
  nextMilestone: string;
  achievements: string[];
}

class FrequencyService {
  // 6-month graduation target (26 weeks)
  private readonly GRADUATION_WEEKS = 26;

  /**
   * Main decision point: Should we send a check-in/prompt right now?
   */
  async shouldSendCheckin(userId: string, promptType: 'daily_question' | 'nudge' | 'suggestion'): Promise<FrequencyDecision> {
    const profile = await partnerProfileService.getProfile(userId);
    if (!profile) {
      return {
        shouldSend: true,
        reasoning: 'New user - establishing baseline engagement'
      };
    }

    // Check quiet mode first
    const quietMode = await partnerProfileService.getQuietMode(userId);
    if (quietMode?.active) {
      // Only allow emergency messages if enabled
      if (quietMode.allowEmergencyMessages && promptType === 'suggestion') {
        return {
          shouldSend: true,
          reasoning: 'Quiet mode active but emergency messages allowed',
          alternativeAction: 'Keep it brief and supportive'
        };
      }
      return {
        shouldSend: false,
        reasoning: `Quiet mode: ${quietMode.reason}`,
        nextCheckTime: quietMode.endsAt,
        alternativeAction: 'Respect their space. Check in later.'
      };
    }

    // Get current frequency config
    const config = await partnerProfileService.calculateOptimalFrequency(userId);

    // Check if prompt type is enabled
    if (promptType === 'daily_question' && !config.dailyQuestionEnabled) {
      return {
        shouldSend: false,
        reasoning: 'Daily questions disabled for this user',
        alternativeAction: 'Wait for weekly reflection instead'
      };
    }

    // Check time-based preferences
    const isPreferredTime = await this.isPreferredCheckinTime(userId);
    if (!isPreferredTime) {
      const nextTime = await this.getNextPreferredTime(userId);
      return {
        shouldSend: false,
        reasoning: 'Not their preferred check-in time',
        nextCheckTime: nextTime,
        alternativeAction: 'Wait for their preferred time window'
      };
    }

    // Check frequency limits
    const recentPrompts = await this.getRecentPromptCount(userId, promptType);
    const weeklyLimit = this.getWeeklyLimit(config, promptType);

    if (recentPrompts >= weeklyLimit) {
      return {
        shouldSend: false,
        reasoning: `Weekly limit reached (${recentPrompts}/${weeklyLimit})`,
        alternativeAction: 'They have enough prompts this week'
      };
    }

    // Check engagement patterns
    const patterns = await partnerProfileService.getEngagementPatterns(userId);

    // If showing high independence, reduce prompts
    if (patterns.independenceScore > 75) {
      // Only send if it's been 3+ days
      const daysSinceLastPrompt = await this.getDaysSinceLastPrompt(userId, promptType);
      if (daysSinceLastPrompt < 3) {
        return {
          shouldSend: false,
          reasoning: 'High independence score - giving them space to act naturally',
          alternativeAction: 'They\'re doing great on their own!'
        };
      }
    }

    // If engagement is declining, reduce frequency
    if (patterns.engagementTrend === 'decreasing') {
      const daysSinceLastPrompt = await this.getDaysSinceLastPrompt(userId, promptType);
      if (daysSinceLastPrompt < 2) {
        return {
          shouldSend: false,
          reasoning: 'Engagement declining - reducing pressure',
          alternativeAction: 'Give them breathing room'
        };
      }
    }

    // All checks passed - send the prompt
    return {
      shouldSend: true,
      reasoning: `Within frequency limits (${recentPrompts + 1}/${weeklyLimit} this week)`,
      nextCheckTime: await this.calculateNextCheckinTime(userId, promptType)
    };
  }

  /**
   * Calculate graduation status (progress toward 6-month independence)
   */
  async getGraduationStatus(userId: string, coupleId: string): Promise<GraduationStatus> {
    const profile = await partnerProfileService.getProfile(userId);
    if (!profile) {
      return {
        weeksSinceStart: 0,
        independenceScore: 0,
        graduationProgress: 0,
        isGraduated: false,
        nextMilestone: 'Complete your partner profile to begin',
        achievements: []
      };
    }

    // Calculate weeks since profile creation
    const weeksSinceStart = Math.floor(
      (Date.now() - profile.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // Get engagement patterns
    const patterns = await partnerProfileService.getEngagementPatterns(userId);

    // Get needs analytics
    const needsAnalytics = await needsService.getNeedsAnalytics(coupleId);

    // Calculate graduation progress (0-100)
    const timeProgress = Math.min(100, (weeksSinceStart / this.GRADUATION_WEEKS) * 100);
    const skillProgress = this.calculateSkillProgress(patterns, needsAnalytics);

    // Weighted average: 40% time, 60% skill
    const graduationProgress = Math.round(timeProgress * 0.4 + skillProgress * 0.6);

    // Check if graduated
    const isGraduated = weeksSinceStart >= this.GRADUATION_WEEKS && skillProgress >= 70;

    // Determine next milestone
    const nextMilestone = this.getNextMilestone(weeksSinceStart, patterns, needsAnalytics);

    // Collect achievements
    const achievements = this.collectAchievements(weeksSinceStart, patterns, needsAnalytics);

    return {
      weeksSinceStart,
      independenceScore: patterns.independenceScore,
      graduationProgress,
      isGraduated,
      nextMilestone,
      achievements
    };
  }

  /**
   * Adjust frequency based on graduation progress
   */
  async adjustForGraduation(userId: string): Promise<void> {
    const profile = await partnerProfileService.getProfile(userId);
    if (!profile) return;

    const weeksSinceStart = Math.floor(
      (Date.now() - profile.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // Progressive reduction schedule
    let newFrequency = profile.frequencyPreference;

    // Week 8-12: Suggest moving to moderate if high_touch
    if (weeksSinceStart >= 8 && weeksSinceStart < 12 && profile.frequencyPreference === 'high_touch') {
      const patterns = await partnerProfileService.getEngagementPatterns(userId);
      if (patterns.independenceScore > 50) {
        newFrequency = 'moderate';
      }
    }

    // Week 16-20: Suggest moving to low_touch if moderate
    if (weeksSinceStart >= 16 && weeksSinceStart < 20 && profile.frequencyPreference === 'moderate') {
      const patterns = await partnerProfileService.getEngagementPatterns(userId);
      if (patterns.independenceScore > 65) {
        newFrequency = 'low_touch';
      }
    }

    // Week 24+: Preparing for graduation
    if (weeksSinceStart >= 24) {
      const patterns = await partnerProfileService.getEngagementPatterns(userId);
      if (patterns.independenceScore > 75 && profile.frequencyPreference !== 'low_touch') {
        newFrequency = 'low_touch';
      }
    }

    // Update if changed
    if (newFrequency !== profile.frequencyPreference) {
      await partnerProfileService.updateProfile(userId, {
        frequencyPreference: newFrequency
      });
    }
  }

  /**
   * Record that a prompt was sent
   */
  async recordPromptSent(userId: string, promptType: string): Promise<void> {
    await partnerProfileService.recordEngagementEvent({
      id: '',
      userId,
      eventType: 'feature_engaged',
      context: {
        feature: 'frequency_service',
        action: 'prompt_sent',
        promptType
      },
      createdAt: new Date()
    });
  }

  /**
   * Record that a prompt was engaged with
   */
  async recordPromptEngagement(userId: string, promptType: string): Promise<void> {
    await partnerProfileService.recordEngagementEvent({
      id: '',
      userId,
      eventType: 'feature_engaged',
      context: {
        feature: 'frequency_service',
        action: 'prompt_engaged',
        promptType
      },
      createdAt: new Date()
    });
  }

  // ==================== PRIVATE HELPERS ====================

  private async isPreferredCheckinTime(userId: string): Promise<boolean> {
    const profile = await partnerProfileService.getProfile(userId);
    if (!profile) return true;

    const hour = new Date().getHours();
    const currentTime: CheckinTime =
      hour >= 6 && hour < 12 ? 'morning' :
      hour >= 12 && hour < 17 ? 'afternoon' : 'evening';

    return profile.preferredCheckinTimes.includes(currentTime);
  }

  private async getNextPreferredTime(userId: string): Promise<Date> {
    const profile = await partnerProfileService.getProfile(userId);
    if (!profile || profile.preferredCheckinTimes.length === 0) {
      // Default to next evening
      const next = new Date();
      next.setHours(18, 0, 0, 0);
      if (next.getTime() < Date.now()) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    const preferredTimes = profile.preferredCheckinTimes;
    const now = new Date();
    const hour = now.getHours();

    // Map times to hours
    const timeHours: Record<CheckinTime, number> = {
      morning: 9,
      afternoon: 14,
      evening: 18
    };

    // Find next preferred time
    for (const time of preferredTimes) {
      const targetHour = timeHours[time];
      if (hour < targetHour) {
        const next = new Date();
        next.setHours(targetHour, 0, 0, 0);
        return next;
      }
    }

    // All times passed today, use first preferred time tomorrow
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(timeHours[preferredTimes[0]], 0, 0, 0);
    return next;
  }

  private async getRecentPromptCount(userId: string, promptType: string): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await api.supabase
      .from('learning_events')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', 'feature_engaged')
      .gte('created_at', sevenDaysAgo.toISOString())
      .contains('context', { action: 'prompt_sent', promptType });

    if (error) return 0;
    return data?.length || 0;
  }

  private getWeeklyLimit(config: FrequencyConfig, promptType: string): number {
    if (promptType === 'daily_question') {
      return config.dailyQuestionEnabled ? 7 : 0;
    }
    if (promptType === 'nudge') {
      return config.nudgesPerWeek;
    }
    if (promptType === 'suggestion') {
      return config.suggestionsPerWeek;
    }
    return 3; // Default
  }

  private async getDaysSinceLastPrompt(userId: string, promptType: string): Promise<number> {
    const { data, error } = await api.supabase
      .from('learning_events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'feature_engaged')
      .contains('context', { action: 'prompt_sent', promptType })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return 999; // No previous prompt

    const lastPrompt = new Date(data.created_at);
    const daysSince = Math.floor((Date.now() - lastPrompt.getTime()) / (24 * 60 * 60 * 1000));
    return daysSince;
  }

  private async calculateNextCheckinTime(userId: string, promptType: string): Promise<Date> {
    const config = await partnerProfileService.calculateOptimalFrequency(userId);

    const now = new Date();
    const next = new Date();

    // Daily questions: next day at preferred time
    if (promptType === 'daily_question') {
      next.setDate(next.getDate() + 1);
      const nextPreferred = await this.getNextPreferredTime(userId);
      return nextPreferred;
    }

    // Nudges/suggestions: spread throughout week
    const daysUntilNext = Math.ceil(7 / config.nudgesPerWeek);
    next.setDate(next.getDate() + daysUntilNext);

    return next;
  }

  private calculateSkillProgress(patterns: EngagementPatterns, needsAnalytics: any): number {
    let score = 0;

    // Independence score (0-40 points)
    score += (patterns.independenceScore / 100) * 40;

    // Spontaneous actions (0-20 points)
    if (patterns.spontaneousActions >= 20) score += 20;
    else score += (patterns.spontaneousActions / 20) * 20;

    // Low suggestion dependency (0-20 points)
    const suggestionIndependence = 100 - patterns.suggestionAcceptanceRate;
    score += (suggestionIndependence / 100) * 20;

    // Needs resolution without app (0-20 points)
    if (needsAnalytics.needingAppLess) score += 20;
    else {
      const spontaneousRate = needsAnalytics.totalNeedsSubmitted > 0
        ? (needsAnalytics.spontaneousResolution / needsAnalytics.totalNeedsSubmitted) * 100
        : 0;
      score += (spontaneousRate / 100) * 20;
    }

    return Math.round(score);
  }

  private getNextMilestone(weeks: number, patterns: EngagementPatterns, needsAnalytics: any): string {
    // Time-based milestones
    if (weeks < 4) return 'Week 4: First independence check-in';
    if (weeks < 8) return 'Week 8: Consider reducing daily prompts';
    if (weeks < 12) return 'Week 12: Quarterly reflection milestone';
    if (weeks < 16) return 'Week 16: Halfway to graduation!';
    if (weeks < 20) return 'Week 20: Preparing for minimal guidance';
    if (weeks < 24) return 'Week 24: Final stretch to graduation';
    if (weeks < 26) return 'Week 26: Graduation & lifetime free access!';

    // Skill-based if time is complete
    if (patterns.independenceScore < 70) {
      return 'Keep building independence to unlock free access';
    }

    return 'Graduated! Enjoy lifetime free access 🎓';
  }

  private collectAchievements(weeks: number, patterns: EngagementPatterns, needsAnalytics: any): string[] {
    const achievements: string[] = [];

    // Time achievements
    if (weeks >= 4) achievements.push('✅ First Month Complete');
    if (weeks >= 12) achievements.push('✅ Quarter Year Together');
    if (weeks >= 26) achievements.push('🎓 Graduated (6 Months)');

    // Skill achievements
    if (patterns.independenceScore >= 50) achievements.push('⭐ Growing Independence');
    if (patterns.independenceScore >= 75) achievements.push('🌟 High Independence');
    if (patterns.independenceScore >= 90) achievements.push('💫 Master Communicators');

    if (patterns.spontaneousActions >= 10) achievements.push('💛 Spontaneous Love');
    if (patterns.spontaneousActions >= 25) achievements.push('💕 Natural Connection');

    if (patterns.suggestionAcceptanceRate < 40) achievements.push('🎯 Low App Dependency');
    if (patterns.suggestionAcceptanceRate < 20) achievements.push('🏆 Self-Sufficient');

    // Needs achievements
    if (needsAnalytics.needingAppLess) achievements.push('✨ Solving Needs Naturally');
    if (needsAnalytics.resolutionRate >= 80) achievements.push('🤝 Strong Resolution');

    return achievements;
  }
}

export const frequencyService = new FrequencyService();
