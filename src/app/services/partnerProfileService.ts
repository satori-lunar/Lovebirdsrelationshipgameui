/**
 * Partner Profile Service
 *
 * Manages partner profiles - the core personalization engine.
 * Handles CRUD operations, engagement tracking, and pattern learning.
 */

import { api } from './api';
import {
  PartnerProfile,
  CustomPreference,
  EngagementEvent,
  EngagementPatterns,
  FrequencyConfig,
  QuietMode,
  LoveLanguage,
  CommunicationStyle,
  FrequencyPreference,
  StressNeed,
  CheckinTime
} from '../types/partnerProfile';

class PartnerProfileService {
  /**
   * Get user's partner profile
   */
  async getProfile(userId: string): Promise<PartnerProfile | null> {
    const { data, error } = await api.supabase
      .from('partner_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No profile yet
      throw error;
    }

    return this.mapFromDatabase(data);
  }

  /**
   * Get partner's profile (for generating suggestions)
   */
  async getPartnerProfile(coupleId: string, currentUserId: string): Promise<PartnerProfile | null> {
    // Get the couple to find partner ID
    const { data: couple, error: coupleError } = await api.supabase
      .from('relationships')
      .select('partner_a_id, partner_b_id')
      .eq('id', coupleId)
      .single();

    if (coupleError) throw coupleError;

    const partnerId = couple.partner_a_id === currentUserId
      ? couple.partner_b_id
      : couple.partner_a_id;

    return this.getProfile(partnerId);
  }

  /**
   * Create new profile
   */
  async createProfile(profile: Omit<PartnerProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<PartnerProfile> {
    const { data, error } = await api.supabase
      .from('partner_profiles')
      .insert(this.mapToDatabase(profile))
      .select()
      .single();

    if (error) throw error;
    return this.mapFromDatabase(data);
  }

  /**
   * Update existing profile
   */
  async updateProfile(userId: string, updates: Partial<PartnerProfile>): Promise<void> {
    const { error } = await api.supabase
      .from('partner_profiles')
      .update(this.mapToDatabase(updates as any))
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Add custom preference (user-taught rule)
   */
  async addCustomPreference(userId: string, preference: Omit<CustomPreference, 'id' | 'createdAt'>): Promise<void> {
    // Get current profile
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('Profile not found');

    // Add new preference
    const newPreference: CustomPreference = {
      ...preference,
      id: `pref_${Date.now()}`,
      createdAt: new Date()
    };

    const updatedPreferences = [...profile.customPreferences, newPreference];

    // Update profile
    await this.updateProfile(userId, {
      customPreferences: updatedPreferences
    });

    // Record learning event
    await this.recordEngagementEvent({
      id: '',
      userId,
      eventType: 'custom_preference_added',
      context: { preference: newPreference },
      createdAt: new Date()
    });
  }

  /**
   * Record engagement event for learning
   */
  async recordEngagementEvent(event: Omit<EngagementEvent, 'id'>): Promise<void> {
    const { error } = await api.supabase
      .from('learning_events')
      .insert({
        user_id: event.userId,
        event_type: event.eventType,
        context: event.context,
        created_at: event.createdAt || new Date()
      });

    if (error) throw error;
  }

  /**
   * Get engagement patterns for a user
   */
  async getEngagementPatterns(userId: string): Promise<EngagementPatterns> {
    // Get recent events (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: events, error } = await api.supabase
      .from('learning_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return this.analyzeEngagement(userId, events || []);
  }

  /**
   * Calculate optimal frequency configuration
   */
  async calculateOptimalFrequency(userId: string): Promise<FrequencyConfig> {
    const profile = await this.getProfile(userId);
    const patterns = await this.getEngagementPatterns(userId);

    if (!profile) {
      // Default config for new users
      return {
        userId,
        dailyQuestionEnabled: true,
        weeklyReflectionEnabled: true,
        nudgesPerWeek: 3,
        suggestionsPerWeek: 5,
        quietModeActive: false,
        reasoning: 'Default configuration for new user'
      };
    }

    // Check if in quiet mode
    const quietMode = await this.getQuietMode(userId);
    if (quietMode?.active) {
      return {
        userId,
        dailyQuestionEnabled: false,
        weeklyReflectionEnabled: false,
        nudgesPerWeek: 0,
        suggestionsPerWeek: quietMode.allowEmergencyMessages ? 1 : 0,
        quietModeActive: true,
        quietModeUntil: quietMode.endsAt,
        reasoning: `Quiet mode active: ${quietMode.reason}`
      };
    }

    // Adapt based on engagement patterns
    const baseFrequency = this.getBaseFrequency(profile.frequencyPreference);

    // Reduce if engagement is declining
    if (patterns.engagementTrend === 'decreasing') {
      return {
        userId,
        dailyQuestionEnabled: profile.frequencyPreference !== 'low_touch',
        weeklyReflectionEnabled: true,
        nudgesPerWeek: Math.max(1, baseFrequency.nudgesPerWeek - 2),
        suggestionsPerWeek: Math.max(2, baseFrequency.suggestionsPerWeek - 3),
        quietModeActive: false,
        reasoning: 'Reduced frequency due to declining engagement'
      };
    }

    // Increase if engagement is high and user is high-touch
    if (patterns.engagementTrend === 'increasing' && profile.frequencyPreference === 'high_touch') {
      return {
        userId,
        dailyQuestionEnabled: true,
        weeklyReflectionEnabled: true,
        nudgesPerWeek: Math.min(7, baseFrequency.nudgesPerWeek + 1),
        suggestionsPerWeek: Math.min(10, baseFrequency.suggestionsPerWeek + 2),
        quietModeActive: false,
        reasoning: 'High engagement - maintaining active support'
      };
    }

    // Check for graduation signals
    if (patterns.readyForReduction) {
      return {
        userId,
        dailyQuestionEnabled: profile.dailyCheckinsEnabled,
        weeklyReflectionEnabled: true,
        nudgesPerWeek: Math.max(1, baseFrequency.nudgesPerWeek - 3),
        suggestionsPerWeek: Math.max(1, baseFrequency.suggestionsPerWeek - 4),
        quietModeActive: false,
        reasoning: 'Showing independence - reducing prompts (this is success!)'
      };
    }

    return {
      userId,
      ...baseFrequency,
      quietModeActive: false,
      reasoning: 'Standard configuration based on preference'
    };
  }

  /**
   * Enter quiet mode
   */
  async enterQuietMode(userId: string, reason: QuietMode['reason'], duration?: number): Promise<void> {
    const endsAt = duration
      ? new Date(Date.now() + duration * 60 * 60 * 1000) // duration in hours
      : undefined;

    const { error } = await api.supabase
      .from('quiet_mode')
      .upsert({
        user_id: userId,
        active: true,
        reason,
        activated_at: new Date().toISOString(),
        ends_at: endsAt?.toISOString(),
        allow_emergency_messages: reason !== 'user_requested', // Only block all if explicitly requested
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Exit quiet mode
   */
  async exitQuietMode(userId: string): Promise<void> {
    const { error } = await api.supabase
      .from('quiet_mode')
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Get quiet mode status
   */
  async getQuietMode(userId: string): Promise<QuietMode | null> {
    const { data, error } = await api.supabase
      .from('quiet_mode')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      userId: data.user_id,
      active: data.active,
      reason: data.reason,
      activatedAt: new Date(data.activated_at),
      endsAt: data.ends_at ? new Date(data.ends_at) : undefined,
      allowEmergencyMessages: data.allow_emergency_messages
    };
  }

  /**
   * Should send check-in based on user's frequency config?
   */
  async shouldSendCheckin(userId: string): Promise<boolean> {
    const config = await this.calculateOptimalFrequency(userId);

    // Never send if in quiet mode
    if (config.quietModeActive) return false;

    // Check if daily questions are enabled
    if (!config.dailyQuestionEnabled) return false;

    // Check if it's the right time based on preferred times
    const profile = await this.getProfile(userId);
    if (!profile) return true; // Default yes for new users

    const hour = new Date().getHours();
    const currentTime: CheckinTime =
      hour >= 6 && hour < 12 ? 'morning' :
      hour >= 12 && hour < 17 ? 'afternoon' : 'evening';

    return profile.preferredCheckinTimes.includes(currentTime);
  }

  // ==================== PRIVATE HELPERS ====================

  private getBaseFrequency(preference: FrequencyPreference): Omit<FrequencyConfig, 'userId' | 'quietModeActive' | 'reasoning'> {
    const configs = {
      high_touch: {
        dailyQuestionEnabled: true,
        weeklyReflectionEnabled: true,
        nudgesPerWeek: 5,
        suggestionsPerWeek: 7
      },
      moderate: {
        dailyQuestionEnabled: true,
        weeklyReflectionEnabled: true,
        nudgesPerWeek: 3,
        suggestionsPerWeek: 4
      },
      low_touch: {
        dailyQuestionEnabled: false,
        weeklyReflectionEnabled: true,
        nudgesPerWeek: 1,
        suggestionsPerWeek: 2
      }
    };

    return configs[preference];
  }

  private analyzeEngagement(userId: string, events: any[]): EngagementPatterns {
    const totalInteractions = events.length;

    // Calculate interactions per week
    const weeksOfData = Math.max(1, events.length > 0
      ? (Date.now() - new Date(events[events.length - 1].created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)
      : 1);
    const interactionsPerWeek = Math.round(totalInteractions / weeksOfData);

    // Analyze trend (compare first half vs second half)
    const midpoint = Math.floor(events.length / 2);
    const recentEvents = events.slice(0, midpoint).length;
    const olderEvents = events.slice(midpoint).length;
    const engagementTrend: 'increasing' | 'stable' | 'decreasing' =
      recentEvents > olderEvents * 1.2 ? 'increasing' :
      recentEvents < olderEvents * 0.8 ? 'decreasing' : 'stable';

    // Count suggestion usage
    const suggestionEvents = events.filter(e =>
      ['suggestion_accepted', 'suggestion_skipped', 'suggestion_modified'].includes(e.event_type)
    );
    const acceptedSuggestions = suggestionEvents.filter(e => e.event_type === 'suggestion_accepted').length;
    const suggestionAcceptanceRate = suggestionEvents.length > 0
      ? Math.round((acceptedSuggestions / suggestionEvents.length) * 100)
      : 50;

    // Count spontaneous actions (actions without prompts)
    const spontaneousActions = events.filter(e =>
      ['message_sent', 'gift_sent', 'date_completed'].includes(e.event_type) &&
      !e.context?.was_prompted
    ).length;

    // Feature usage
    const featureCounts: Record<string, number> = {};
    events.forEach(e => {
      const feature = e.context?.feature || 'unknown';
      featureCounts[feature] = (featureCounts[feature] || 0) + 1;
    });

    const mostUsedFeature = Object.entries(featureCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'daily_question';
    const leastUsedFeature = Object.entries(featureCounts).sort((a, b) => a[1] - b[1])[0]?.[0] || 'unknown';

    // Calculate independence score (0-100, higher = less app needed)
    const independenceScore = Math.min(100, Math.round(
      (spontaneousActions / Math.max(1, totalInteractions)) * 100 +
      (100 - suggestionAcceptanceRate) * 0.3
    ));

    // Check if ready for graduation (reducing prompts)
    const readyForReduction =
      spontaneousActions >= 10 && // At least 10 spontaneous actions
      suggestionAcceptanceRate < 30 && // Low reliance on suggestions
      independenceScore > 70; // High independence

    return {
      userId,
      totalInteractions,
      interactionsPerWeek,
      engagementTrend,
      suggestionAcceptanceRate,
      spontaneousActions,
      mostUsedFeature,
      leastUsedFeature,
      mostActiveTime: 'evening', // Would calculate from timestamps
      averageResponseTime: 60, // Would calculate from timestamps
      readyForReduction,
      independenceScore
    };
  }

  private mapFromDatabase(data: any): PartnerProfile {
    return {
      id: data.id,
      userId: data.user_id,
      coupleId: data.couple_id,
      loveLanguagePrimary: data.love_language_primary,
      loveLanguageSecondary: data.love_language_secondary,
      communicationStyle: data.communication_style,
      stressNeeds: data.stress_needs || [],
      frequencyPreference: data.frequency_preference,
      dailyCheckinsEnabled: data.daily_checkins_enabled,
      preferredCheckinTimes: data.preferred_checkin_times || [],
      customPreferences: data.custom_preferences || [],
      learnedPatterns: data.learned_patterns || {},
      engagementScore: data.engagement_score || 50,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapToDatabase(profile: Partial<PartnerProfile>): any {
    return {
      user_id: profile.userId,
      couple_id: profile.coupleId,
      love_language_primary: profile.loveLanguagePrimary,
      love_language_secondary: profile.loveLanguageSecondary,
      communication_style: profile.communicationStyle,
      stress_needs: profile.stressNeeds,
      frequency_preference: profile.frequencyPreference,
      daily_checkins_enabled: profile.dailyCheckinsEnabled,
      preferred_checkin_times: profile.preferredCheckinTimes,
      custom_preferences: profile.customPreferences,
      learned_patterns: profile.learnedPatterns,
      engagement_score: profile.engagementScore
    };
  }
}

export const partnerProfileService = new PartnerProfileService();
