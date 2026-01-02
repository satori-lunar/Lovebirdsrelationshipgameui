/**
 * Graduation Service
 *
 * Tracks relationship growth and progress toward 6-month graduation.
 * Celebrates independence as success, not failure.
 * Goal: Lifetime free access after demonstrating self-sufficiency.
 */

import { api } from './api';
import { partnerProfileService } from './partnerProfileService';
import { needsService } from './needsService';
import { frequencyService } from './frequencyService';

export interface GrowthMetrics {
  // Time metrics
  daysTogether: number;
  weeksSinceStart: number;
  daysUntilGraduation: number;

  // Skill metrics
  independenceScore: number; // 0-100
  suggestionDependency: number; // 0-100, lower is better
  spontaneousActionsCount: number;
  needsResolvedNaturally: number;

  // Communication metrics
  conversationQuality: number; // 0-100, based on daily question depth
  responseSpeed: number; // Average hours to respond to needs
  conflictResolution: number; // 0-100, how well they resolve disagreements

  // Overall progress
  graduationProgress: number; // 0-100
  readyForGraduation: boolean;

  // Trend
  trendLastMonth: 'improving' | 'stable' | 'declining';
}

export interface GraduationMilestone {
  week: number;
  title: string;
  description: string;
  achieved: boolean;
  achievedAt?: Date;
  reward?: string;
}

export interface GraduationReward {
  type: 'badge' | 'feature_unlock' | 'free_access' | 'celebration';
  title: string;
  description: string;
  unlockedAt: Date;
}

export interface GraduationCelebration {
  isGraduated: boolean;
  graduatedAt?: Date;
  celebrationMessage: string;
  nextSteps: string[];
  lifeTimeFreeAccess: boolean;
  continueSupport: string; // How they can still use the app
}

class GraduationService {
  private readonly GRADUATION_WEEKS = 26; // 6 months
  private readonly INDEPENDENCE_THRESHOLD = 70; // Score needed to graduate

  /**
   * Get comprehensive growth metrics for a couple
   */
  async getGrowthMetrics(userId: string, coupleId: string): Promise<GrowthMetrics> {
    const profile = await partnerProfileService.getProfile(userId);
    const patterns = await partnerProfileService.getEngagementPatterns(userId);
    const needsAnalytics = await needsService.getNeedsAnalytics(coupleId);

    // Get couple creation date
    const { data: couple } = await api.supabase
      .from('relationships')
      .select('created_at')
      .eq('id', coupleId)
      .single();

    const coupleCreatedAt = couple ? new Date(couple.created_at) : new Date();
    const daysTogether = Math.floor(
      (Date.now() - coupleCreatedAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    const weeksSinceStart = profile
      ? Math.floor((Date.now() - profile.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000))
      : 0;

    const daysUntilGraduation = Math.max(0, (this.GRADUATION_WEEKS * 7) - (weeksSinceStart * 7));

    // Calculate suggestion dependency (inverse of independence)
    const suggestionDependency = patterns ? patterns.suggestionAcceptanceRate : 50;

    // Spontaneous actions
    const spontaneousActionsCount = patterns ? patterns.spontaneousActions : 0;

    // Needs resolved naturally (before partner saw suggestion)
    const needsResolvedNaturally = needsAnalytics ? needsAnalytics.spontaneousResolution : 0;

    // Communication quality (based on daily question completion rate)
    const conversationQuality = await this.calculateConversationQuality(userId);

    // Response speed (lower is better)
    const responseSpeed = needsAnalytics ? needsAnalytics.averageResolutionTime : 24;

    // Conflict resolution score
    const conflictResolution = await this.calculateConflictResolution(coupleId);

    // Overall graduation progress
    const graduationStatus = await frequencyService.getGraduationStatus(userId, coupleId);
    const graduationProgress = graduationStatus.graduationProgress;

    // Ready for graduation?
    const readyForGraduation =
      weeksSinceStart >= this.GRADUATION_WEEKS &&
      graduationStatus.independenceScore >= this.INDEPENDENCE_THRESHOLD;

    // Trend analysis
    const trendLastMonth = await this.analyzeTrend(userId);

    return {
      daysTogether,
      weeksSinceStart,
      daysUntilGraduation,
      independenceScore: graduationStatus.independenceScore,
      suggestionDependency,
      spontaneousActionsCount,
      needsResolvedNaturally,
      conversationQuality,
      responseSpeed,
      conflictResolution,
      graduationProgress,
      readyForGraduation,
      trendLastMonth
    };
  }

  /**
   * Get graduation milestones with achievement status
   */
  async getGraduationMilestones(userId: string, coupleId: string): Promise<GraduationMilestone[]> {
    const profile = await partnerProfileService.getProfile(userId);
    const weeksSinceStart = profile
      ? Math.floor((Date.now() - profile.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000))
      : 0;

    const patterns = await partnerProfileService.getEngagementPatterns(userId);

    const milestones: GraduationMilestone[] = [
      {
        week: 1,
        title: 'Getting Started',
        description: 'Complete your partner profile and start learning about each other',
        achieved: profile !== null,
        reward: 'Profile Badge'
      },
      {
        week: 4,
        title: 'First Month Milestone',
        description: 'One month of consistent engagement and communication',
        achieved: weeksSinceStart >= 4,
        reward: 'First Month Badge'
      },
      {
        week: 8,
        title: 'Building Independence',
        description: 'Start taking spontaneous actions without prompts',
        achieved: weeksSinceStart >= 8 && patterns.spontaneousActions >= 5,
        reward: 'Independence Badge'
      },
      {
        week: 12,
        title: 'Quarter Year Together',
        description: 'Three months of growth and understanding',
        achieved: weeksSinceStart >= 12,
        reward: 'Quarterly Badge + 50% reduced prompts'
      },
      {
        week: 16,
        title: 'Halfway There!',
        description: 'You\'re mastering the art of loving well',
        achieved: weeksSinceStart >= 16 && patterns.independenceScore >= 60,
        reward: 'Midway Badge'
      },
      {
        week: 20,
        title: 'Advanced Communicators',
        description: 'Resolving needs naturally with minimal guidance',
        achieved: weeksSinceStart >= 20 && patterns.suggestionAcceptanceRate < 40,
        reward: 'Master Badge'
      },
      {
        week: 24,
        title: 'Almost Graduated',
        description: 'Final weeks before lifetime free access',
        achieved: weeksSinceStart >= 24,
        reward: '75% reduced prompts'
      },
      {
        week: 26,
        title: '🎓 Graduation: Lifetime Free Access',
        description: 'You\'ve learned to love each other well. The app is yours forever.',
        achieved: weeksSinceStart >= 26 && patterns.independenceScore >= this.INDEPENDENCE_THRESHOLD,
        reward: '🎉 Lifetime Free Access + Graduation Certificate'
      }
    ];

    // Check achievements from database
    await this.loadAchievementDates(userId, milestones);

    return milestones;
  }

  /**
   * Check if couple is ready for graduation
   */
  async checkGraduationEligibility(userId: string, coupleId: string): Promise<GraduationCelebration> {
    const metrics = await this.getGrowthMetrics(userId, coupleId);
    const milestones = await this.getGraduationMilestones(userId, coupleId);

    const finalMilestone = milestones[milestones.length - 1];
    const isGraduated = finalMilestone.achieved;

    // Check if already celebrated
    const { data: graduation } = await api.supabase
      .from('couple_graduations')
      .select('*')
      .eq('couple_id', coupleId)
      .single();

    const graduatedAt = graduation ? new Date(graduation.graduated_at) : undefined;

    if (isGraduated && !graduation) {
      // Record graduation
      await this.recordGraduation(coupleId);
    }

    return {
      isGraduated,
      graduatedAt,
      celebrationMessage: isGraduated
        ? "🎓 Congratulations! You've graduated! You've learned to love each other so well that you don't need daily guidance anymore. That's the goal, and you crushed it."
        : `You're ${metrics.graduationProgress}% of the way to graduation. Keep growing together!`,
      nextSteps: isGraduated
        ? [
            'Enjoy lifetime free access to all features',
            'Use the app for special occasions (anniversaries, date planning)',
            'Check in whenever you need inspiration',
            'Share your story to help other couples'
          ]
        : [
            `${metrics.daysUntilGraduation} days until graduation`,
            `Current independence score: ${metrics.independenceScore}/100`,
            'Keep responding to each other naturally',
            'Use suggestions less, trust your instincts more'
          ],
      lifeTimeFreeAccess: isGraduated,
      continueSupport: isGraduated
        ? 'We\'re still here when you need us - for anniversary planning, date ideas, or occasional check-ins. Just less frequently.'
        : 'We\'re reducing prompts as you grow. This is progress!'
    };
  }

  /**
   * Get rewards earned
   */
  async getRewards(userId: string): Promise<GraduationReward[]> {
    const { data, error } = await api.supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) return [];

    return (data || []).map(r => ({
      type: r.reward_type,
      title: r.title,
      description: r.description,
      unlockedAt: new Date(r.unlocked_at)
    }));
  }

  /**
   * Award a reward
   */
  async awardReward(userId: string, reward: Omit<GraduationReward, 'unlockedAt'>): Promise<void> {
    const { error } = await api.supabase
      .from('user_rewards')
      .insert({
        user_id: userId,
        reward_type: reward.type,
        title: reward.title,
        description: reward.description,
        unlocked_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Record graduation
   */
  private async recordGraduation(coupleId: string): Promise<void> {
    // Create graduation record
    const { error: gradError } = await api.supabase
      .from('couple_graduations')
      .insert({
        couple_id: coupleId,
        graduated_at: new Date().toISOString(),
        lifetime_free_access: true
      });

    if (gradError && gradError.code !== '23505') { // Ignore duplicate key
      throw gradError;
    }

    // Get both partners
    const { data: couple } = await api.supabase
      .from('relationships')
      .select('partner_a_id, partner_b_id')
      .eq('id', coupleId)
      .single();

    if (couple) {
      // Award graduation rewards to both partners
      const graduationReward: Omit<GraduationReward, 'unlockedAt'> = {
        type: 'free_access',
        title: '🎓 Graduated: Lifetime Free Access',
        description: 'You\'ve mastered loving each other well. Enjoy free access forever!'
      };

      await this.awardReward(couple.partner_a_id, graduationReward);
      await this.awardReward(couple.partner_b_id, graduationReward);
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private async calculateConversationQuality(userId: string): Promise<number> {
    // Get daily question completion rate over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: responses } = await api.supabase
      .from('daily_question_responses')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const completionRate = responses ? Math.min(100, (responses.length / 30) * 100) : 0;
    return Math.round(completionRate);
  }

  private async calculateConflictResolution(coupleId: string): Promise<number> {
    // Check needs that were urgent and how quickly resolved
    const { data: urgentNeeds } = await api.supabase
      .from('relationship_needs')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('urgency', 'important');

    if (!urgentNeeds || urgentNeeds.length === 0) return 100; // No conflicts

    const resolved = urgentNeeds.filter(n => n.status === 'resolved').length;
    const resolutionRate = (resolved / urgentNeeds.length) * 100;

    return Math.round(resolutionRate);
  }

  private async analyzeTrend(userId: string): Promise<'improving' | 'stable' | 'declining'> {
    const patterns = await partnerProfileService.getEngagementPatterns(userId);
    if (!patterns) return 'stable';

    // If independence score is growing and spontaneous actions increasing = improving
    if (patterns.independenceScore > 60 && patterns.spontaneousActions >= 10) {
      return 'improving';
    }

    // If engagement is declining = declining
    if (patterns.engagementTrend === 'decreasing') {
      return 'declining';
    }

    return 'stable';
  }

  private async loadAchievementDates(userId: string, milestones: GraduationMilestone[]): Promise<void> {
    // Check for recorded achievements
    const { data: achievements } = await api.supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);

    if (!achievements) return;

    milestones.forEach(milestone => {
      const achievement = achievements.find(a => a.milestone_week === milestone.week);
      if (achievement) {
        milestone.achievedAt = new Date(achievement.achieved_at);
      }
    });

    // Record new achievements
    for (const milestone of milestones) {
      if (milestone.achieved && !milestone.achievedAt) {
        await api.supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            milestone_week: milestone.week,
            milestone_title: milestone.title,
            achieved_at: new Date().toISOString()
          });
      }
    }
  }
}

export const graduationService = new GraduationService();
