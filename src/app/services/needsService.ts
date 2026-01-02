/**
 * Needs Service
 *
 * Handles the "What feels missing?" feature.
 * Routes user needs through AI to generate partner-specific suggestions.
 */

import { api } from './api';
import { aiSuggestionService } from './aiSuggestionService';
import { partnerProfileService } from './partnerProfileService';
import {
  RelationshipNeed,
  AINeedSuggestion,
  SubmitNeedRequest,
  NeedResolution,
  NeedsAnalytics
} from '../types/needs';

class NeedsService {
  /**
   * Submit a relationship need
   */
  async submitNeed(request: SubmitNeedRequest): Promise<string> {
    // Get partner's profile to generate appropriate suggestion
    const partnerProfile = await partnerProfileService.getPartnerProfile(
      request.coupleId,
      request.requesterId
    );

    if (!partnerProfile) {
      throw new Error('Partner profile not found');
    }

    // Determine receiver ID from couple
    const { data: couple, error: coupleError } = await api.supabase
      .from('relationships')
      .select('partner_a_id, partner_b_id')
      .eq('id', request.coupleId)
      .single();

    if (coupleError) throw coupleError;

    const receiverId = couple.partner_a_id === request.requesterId
      ? couple.partner_b_id
      : couple.partner_a_id;

    // Generate AI suggestion for the receiver
    const aiSuggestion = await aiSuggestionService.generateNeedResponse(
      {
        id: '',
        coupleId: request.coupleId,
        requesterId: request.requesterId,
        receiverId,
        needCategory: request.needCategory,
        customCategory: request.customCategory,
        context: request.context,
        urgency: request.urgency,
        status: 'pending',
        showRawNeedToPartner: request.showRawNeedToPartner || false,
        createdAt: new Date()
      },
      {
        loveLanguage: partnerProfile.loveLanguagePrimary,
        communicationStyle: partnerProfile.communicationStyle,
        customPreferences: partnerProfile.customPreferences.reduce((acc, pref) => {
          acc[pref.id] = pref.rule;
          return acc;
        }, {} as Record<string, any>)
      }
    );

    // Insert need with AI suggestion
    const { data, error } = await api.supabase
      .from('relationship_needs')
      .insert({
        couple_id: request.coupleId,
        requester_id: request.requesterId,
        receiver_id: receiverId,
        need_category: request.needCategory,
        custom_category: request.customCategory,
        context: request.context,
        urgency: request.urgency,
        show_raw_need_to_partner: request.showRawNeedToPartner || false,
        ai_suggestion: aiSuggestion,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Record engagement event
    await partnerProfileService.recordEngagementEvent({
      id: '',
      userId: request.requesterId,
      eventType: 'need_submitted',
      context: {
        needCategory: request.needCategory,
        urgency: request.urgency
      },
      createdAt: new Date()
    });

    return data.id;
  }

  /**
   * Get pending needs for a user (where they are the receiver)
   */
  async getPendingNeeds(userId: string): Promise<RelationshipNeed[]> {
    const { data, error } = await api.supabase
      .from('relationship_needs')
      .select('*')
      .eq('receiver_id', userId)
      .in('status', ['pending', 'acknowledged'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapFromDatabase);
  }

  /**
   * Get needs submitted by user (where they are the requester)
   */
  async getSubmittedNeeds(userId: string): Promise<RelationshipNeed[]> {
    const { data, error } = await api.supabase
      .from('relationship_needs')
      .select('*')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return (data || []).map(this.mapFromDatabase);
  }

  /**
   * Acknowledge a need (receiver has seen it)
   */
  async acknowledgeNeed(needId: string): Promise<void> {
    const { error } = await api.supabase
      .from('relationship_needs')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', needId);

    if (error) throw error;
  }

  /**
   * Mark need as in progress
   */
  async markInProgress(needId: string): Promise<void> {
    const { error } = await api.supabase
      .from('relationship_needs')
      .update({
        status: 'in_progress'
      })
      .eq('id', needId);

    if (error) throw error;
  }

  /**
   * Resolve a need
   */
  async resolveNeed(resolution: Omit<NeedResolution, 'resolvedAt'>): Promise<void> {
    const { error } = await api.supabase
      .from('relationship_needs')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', resolution.needId);

    if (error) throw error;

    // Record engagement event
    await partnerProfileService.recordEngagementEvent({
      id: '',
      userId: resolution.resolvedBy,
      eventType: 'feature_engaged',
      context: {
        feature: 'needs',
        action: 'resolved',
        howResolved: resolution.howItWasResolved,
        wasHelpful: resolution.wasHelpful
      },
      createdAt: new Date()
    });
  }

  /**
   * Get needs analytics for a couple
   */
  async getNeedsAnalytics(coupleId: string): Promise<NeedsAnalytics> {
    // Get all needs for the couple
    const { data: needs, error } = await api.supabase
      .from('relationship_needs')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allNeeds = (needs || []).map(this.mapFromDatabase);

    // Calculate metrics
    const totalNeedsSubmitted = allNeeds.length;

    // Needs per month (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentNeeds = allNeeds.filter(n => n.createdAt >= thirtyDaysAgo);
    const needsPerMonth = recentNeeds.length;

    // Trend analysis (compare last 15 days to previous 15 days)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const recentCount = allNeeds.filter(n => n.createdAt >= fifteenDaysAgo).length;
    const previousCount = allNeeds.filter(n =>
      n.createdAt >= thirtyDaysAgo && n.createdAt < fifteenDaysAgo
    ).length;

    const needsTrend: 'increasing' | 'stable' | 'decreasing' =
      recentCount > previousCount * 1.5 ? 'increasing' :
      recentCount < previousCount * 0.5 ? 'decreasing' : 'stable';

    // Most common need category
    const categoryCounts: Record<string, number> = {};
    allNeeds.forEach(need => {
      categoryCounts[need.needCategory] = (categoryCounts[need.needCategory] || 0) + 1;
    });

    const mostCommonNeed = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'communication';
    const leastCommonNeed = Object.entries(categoryCounts)
      .sort((a, b) => a[1] - b[1])[0]?.[0] || 'space';

    // Resolution metrics
    const resolvedNeeds = allNeeds.filter(n => n.status === 'resolved');
    const resolutionRate = totalNeedsSubmitted > 0
      ? Math.round((resolvedNeeds.length / totalNeedsSubmitted) * 100)
      : 0;

    // Average resolution time (in hours)
    const resolutionTimes = resolvedNeeds
      .filter(n => n.resolvedAt && n.createdAt)
      .map(n => (n.resolvedAt!.getTime() - n.createdAt.getTime()) / (1000 * 60 * 60));

    const averageResolutionTime = resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
      : 24;

    // Spontaneous resolution (resolved before being acknowledged - partner responded naturally)
    const spontaneousResolution = resolvedNeeds.filter(n =>
      n.resolvedAt && n.acknowledgedAt &&
      n.resolvedAt < n.acknowledgedAt
    ).length;

    // Check if couple is needing app less
    const needingAppLess =
      needsTrend === 'decreasing' &&
      spontaneousResolution > resolvedNeeds.length * 0.3 && // 30%+ spontaneous
      averageResolutionTime < 12; // Quick resolution

    return {
      coupleId,
      totalNeedsSubmitted,
      needsPerMonth,
      needsTrend,
      mostCommonNeed: mostCommonNeed as any,
      leastCommonNeed: leastCommonNeed as any,
      averageResolutionTime,
      resolutionRate,
      spontaneousResolution,
      needingAppLess
    };
  }

  /**
   * Expire old needs (called by cron job)
   */
  async expireOldNeeds(): Promise<void> {
    const { error } = await api.supabase
      .from('relationship_needs')
      .update({ status: 'expired' })
      .lt('expires_at', new Date().toISOString())
      .in('status', ['pending', 'acknowledged']);

    if (error) throw error;
  }

  // ==================== PRIVATE HELPERS ====================

  private mapFromDatabase(data: any): RelationshipNeed {
    return {
      id: data.id,
      coupleId: data.couple_id,
      requesterId: data.requester_id,
      receiverId: data.receiver_id,
      needCategory: data.need_category,
      customCategory: data.custom_category,
      context: data.context,
      urgency: data.urgency,
      status: data.status,
      aiSuggestion: data.ai_suggestion,
      showRawNeedToPartner: data.show_raw_need_to_partner,
      createdAt: new Date(data.created_at),
      acknowledgedAt: data.acknowledged_at ? new Date(data.acknowledged_at) : undefined,
      resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined
    };
  }
}

export const needsService = new NeedsService();
