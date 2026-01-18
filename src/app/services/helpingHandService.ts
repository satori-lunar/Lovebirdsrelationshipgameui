/**
 * Helping Hand Service
 *
 * Core service for the Helping Hand feature.
 * Handles CRUD operations for user status, suggestions, reminders, and partner hints.
 */

import { api } from './api';
import {
  HelpingHandUserStatus,
  HelpingHandCategory,
  HelpingHandSuggestion,
  HelpingHandSuggestionWithCategory,
  HelpingHandReminder,
  HelpingHandPartnerHint,
  UpdateUserStatusRequest,
  CreateCustomSuggestionRequest,
  SetupReminderRequest,
  SetupReminderResponse,
  AddPartnerHintRequest,
  AddPartnerHintResponse,
  SelectSuggestionRequest,
  CompleteSuggestionRequest,
  GetSuggestionsRequest,
  GetSuggestionsResponse,
  CategoryCount,
  GetCategoryCountsResponse,
  WeekContext
} from '../types/helpingHand';

class HelpingHandService {
  // ============================================================================
  // USER STATUS MANAGEMENT
  // ============================================================================

  /**
   * Get user's status for a specific week
   */
  async getUserStatus(userId: string, weekStartDate: string): Promise<HelpingHandUserStatus | null> {
    console.log('📊 Fetching user status:', { userId, weekStartDate });

    const { data, error } = await api.supabase
      .from('helping_hand_user_status')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .maybeSingle();

    if (error) {
      console.error('❌ Failed to fetch user status:', error);
      throw error;
    }

    if (!data) {
      console.log('ℹ️ No status found for this week');
      return null;
    }

    return this.mapUserStatusFromDb(data);
  }

  /**
   * Create or update user's weekly status
   */
  async upsertUserStatus(request: UpdateUserStatusRequest): Promise<HelpingHandUserStatus> {
    console.log('💾 Upserting user status:', request);

    const dbData = this.mapUserStatusToDb(request);

    const { data, error } = await api.supabase
      .from('helping_hand_user_status')
      .upsert(dbData, {
        onConflict: 'user_id,week_start_date'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to upsert user status:', error);
      throw error;
    }

    console.log('✅ User status saved successfully');
    return this.mapUserStatusFromDb(data);
  }

  // ============================================================================
  // CATEGORY MANAGEMENT
  // ============================================================================

  /**
   * Get all active categories
   */
  async getCategories(): Promise<HelpingHandCategory[]> {
    console.log('📂 Fetching categories');

    const { data, error } = await api.supabase
      .from('helping_hand_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('❌ Failed to fetch categories:', error);
      throw error;
    }

    return data.map(this.mapCategoryFromDb);
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string): Promise<HelpingHandCategory> {
    console.log('📂 Fetching category:', categoryId);

    const { data, error } = await api.supabase
      .from('helping_hand_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) {
      console.error('❌ Failed to fetch category:', error);
      throw error;
    }

    return this.mapCategoryFromDb(data);
  }

  /**
   * Get suggestion counts by category for a week
   */
  async getCategoryCounts(userId: string, weekStartDate: string): Promise<GetCategoryCountsResponse> {
    console.log('📊 Fetching category counts:', { userId, weekStartDate });

    const { data, error } = await api.supabase
      .rpc('get_helping_hand_category_counts', {
        p_user_id: userId,
        p_week_start_date: weekStartDate
      });

    if (error) {
      console.error('❌ Failed to fetch category counts:', error);
      throw error;
    }

    const counts: CategoryCount[] = data.map((row: any) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      count: parseInt(row.count, 10)
    }));

    const totalSuggestions = counts.reduce((sum, c) => sum + c.count, 0);

    return { counts, totalSuggestions };
  }

  // ============================================================================
  // SUGGESTION MANAGEMENT
  // ============================================================================

  /**
   * Get suggestions for a user and week
   */
  async getSuggestions(request: GetSuggestionsRequest): Promise<GetSuggestionsResponse> {
    console.log('💡 Fetching suggestions:', request);

    const { data, error } = await api.supabase
      .rpc('get_helping_hand_suggestions_with_category', {
        p_user_id: request.userId,
        p_week_start_date: request.weekStartDate,
        p_category_id: request.categoryId || null
      });

    if (error) {
      console.error('❌ Failed to fetch suggestions:', error);
      throw error;
    }

    let suggestions = data.map(this.mapSuggestionWithCategoryFromDb);

    // Filter out completed if not requested
    if (!request.includeCompleted) {
      suggestions = suggestions.filter(s => !s.isCompleted);
    }

    return {
      suggestions,
      total: suggestions.length
    };
  }

  /**
   * Get a single suggestion by ID
   */
  async getSuggestionById(suggestionId: string): Promise<HelpingHandSuggestion> {
    console.log('💡 Fetching suggestion:', suggestionId);

    const { data, error } = await api.supabase
      .from('helping_hand_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (error) {
      console.error('❌ Failed to fetch suggestion:', error);
      throw error;
    }

    return this.mapSuggestionFromDb(data);
  }

  /**
   * Create a custom user suggestion
   */
  async createCustomSuggestion(request: CreateCustomSuggestionRequest): Promise<HelpingHandSuggestion> {
    console.log('✨ Creating custom suggestion:', request);

    const dbData = {
      user_id: request.userId,
      relationship_id: request.relationshipId,
      week_start_date: request.weekStartDate,
      category_id: request.categoryId,
      source_type: 'user_created',
      title: request.title,
      description: request.description,
      detailed_steps: request.detailedSteps || [],
      time_estimate_minutes: request.timeEstimateMinutes,
      effort_level: request.effortLevel,
      best_timing: request.bestTiming || null,
      love_language_alignment: request.loveLanguageAlignment || [],
      is_selected: false,
      is_completed: false
    };

    const { data, error } = await api.supabase
      .from('helping_hand_suggestions')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create custom suggestion:', error);
      throw error;
    }

    console.log('✅ Custom suggestion created successfully');
    return this.mapSuggestionFromDb(data);
  }

  /**
   * Select or deselect a suggestion
   */
  async selectSuggestion(request: SelectSuggestionRequest): Promise<void> {
    console.log('🎯 Selecting suggestion:', request);

    const { error } = await api.supabase
      .from('helping_hand_suggestions')
      .update({ is_selected: request.selected })
      .eq('id', request.suggestionId)
      .eq('user_id', request.userId);

    if (error) {
      console.error('❌ Failed to select suggestion:', error);
      throw error;
    }

    console.log('✅ Suggestion selection updated');
  }

  /**
   * Mark a suggestion as completed
   */
  async completeSuggestion(request: CompleteSuggestionRequest): Promise<void> {
    console.log('✅ Completing suggestion:', request);

    const { error } = await api.supabase
      .from('helping_hand_suggestions')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        user_feedback: request.feedback || null,
        user_notes: request.notes || null
      })
      .eq('id', request.suggestionId)
      .eq('user_id', request.userId);

    if (error) {
      console.error('❌ Failed to complete suggestion:', error);
      throw error;
    }

    console.log('✅ Suggestion marked as completed');
  }

  /**
   * Delete a suggestion (user-created only)
   */
  async deleteSuggestion(suggestionId: string, userId: string): Promise<void> {
    console.log('🗑️ Deleting suggestion:', suggestionId);

    // Only allow deletion of user-created suggestions
    const { error } = await api.supabase
      .from('helping_hand_suggestions')
      .delete()
      .eq('id', suggestionId)
      .eq('user_id', userId)
      .eq('source_type', 'user_created');

    if (error) {
      console.error('❌ Failed to delete suggestion:', error);
      throw error;
    }

    console.log('✅ Suggestion deleted successfully');
  }

  // ============================================================================
  // REMINDER MANAGEMENT
  // ============================================================================

  /**
   * Setup a reminder for a suggestion
   */
  async setupReminder(request: SetupReminderRequest): Promise<SetupReminderResponse> {
    console.log('⏰ Setting up reminder:', request);

    const dbData = {
      suggestion_id: request.suggestionId,
      user_id: request.userId,
      frequency: request.frequency,
      specific_days: request.specificDays || [],
      preferred_time: request.preferredTime,
      start_date: request.startDate,
      end_date: request.endDate || null,
      is_active: true,
      synced_to_calendar: request.syncToCalendar || false
    };

    const { data, error } = await api.supabase
      .from('helping_hand_reminders')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to setup reminder:', error);
      throw error;
    }

    console.log('✅ Reminder setup successfully');

    // Note: Calendar sync will be handled by the component using Capacitor Calendar plugin
    return {
      reminder: this.mapReminderFromDb(data),
      calendarEventId: undefined // Populated by component after calendar sync
    };
  }

  /**
   * Get reminders for a user
   */
  async getReminders(userId: string): Promise<HelpingHandReminder[]> {
    console.log('⏰ Fetching reminders for user:', userId);

    const { data, error } = await api.supabase
      .from('helping_hand_reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('next_scheduled_at', { ascending: true });

    if (error) {
      console.error('❌ Failed to fetch reminders:', error);
      throw error;
    }

    return data.map(this.mapReminderFromDb);
  }

  /**
   * Update reminder calendar event ID
   */
  async updateReminderCalendarEvent(reminderId: string, calendarEventId: string): Promise<void> {
    console.log('📅 Updating reminder calendar event:', { reminderId, calendarEventId });

    const { error } = await api.supabase
      .from('helping_hand_reminders')
      .update({
        calendar_event_id: calendarEventId,
        synced_to_calendar: true
      })
      .eq('id', reminderId);

    if (error) {
      console.error('❌ Failed to update reminder calendar event:', error);
      throw error;
    }

    console.log('✅ Reminder calendar event updated');
  }

  /**
   * Cancel a reminder
   */
  async cancelReminder(reminderId: string, userId: string): Promise<void> {
    console.log('❌ Cancelling reminder:', reminderId);

    const { error } = await api.supabase
      .from('helping_hand_reminders')
      .update({ is_active: false })
      .eq('id', reminderId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Failed to cancel reminder:', error);
      throw error;
    }

    console.log('✅ Reminder cancelled');
  }

  // ============================================================================
  // PARTNER HINT MANAGEMENT
  // ============================================================================

  /**
   * Add a partner hint
   */
  async addPartnerHint(request: AddPartnerHintRequest): Promise<AddPartnerHintResponse> {
    console.log('💝 Adding partner hint:', request);

    const dbData = {
      relationship_id: request.relationshipId,
      hinting_user_id: request.hintingUserId,
      receiving_partner_id: request.receivingPartnerId,
      hint_type: request.hintType,
      hint_text: request.hintText,
      show_directly: request.showDirectly || false,
      expires_at: request.expiresAt || null,
      is_active: true
    };

    const { data, error } = await api.supabase
      .from('helping_hand_partner_hints')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to add partner hint:', error);
      throw error;
    }

    console.log('✅ Partner hint added successfully');

    // Note: Suggestion regeneration will be handled by the calling component if needed
    return {
      hint: this.mapPartnerHintFromDb(data),
      regeneratedSuggestions: false
    };
  }

  /**
   * Get active hints for receiving partner (for AI context)
   */
  async getActiveHintsForPartner(receivingPartnerId: string): Promise<HelpingHandPartnerHint[]> {
    console.log('💝 Fetching active hints for partner:', receivingPartnerId);

    const { data, error } = await api.supabase
      .rpc('get_active_partner_hints', {
        p_receiving_partner_id: receivingPartnerId
      });

    if (error) {
      console.error('❌ Failed to fetch partner hints:', error);
      throw error;
    }

    return data.map(this.mapPartnerHintFromDb);
  }

  /**
   * Get hints sent by user
   */
  async getHintsSentByUser(userId: string): Promise<HelpingHandPartnerHint[]> {
    console.log('💝 Fetching hints sent by user:', userId);

    const { data, error } = await api.supabase
      .from('helping_hand_partner_hints')
      .select('*')
      .eq('hinting_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch sent hints:', error);
      throw error;
    }

    return data.map(this.mapPartnerHintFromDb);
  }

  /**
   * Delete a partner hint
   */
  async deletePartnerHint(hintId: string, userId: string): Promise<void> {
    console.log('🗑️ Deleting partner hint:', hintId);

    const { error } = await api.supabase
      .from('helping_hand_partner_hints')
      .update({ is_active: false })
      .eq('id', hintId)
      .eq('hinting_user_id', userId);

    if (error) {
      console.error('❌ Failed to delete partner hint:', error);
      throw error;
    }

    console.log('✅ Partner hint deleted');
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get the start date of the current week (Monday)
   */
  getWeekStartDate(date: Date = new Date()): string {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }

  /**
   * Get week context (start, end, is current week)
   */
  getWeekContext(weekStartDate: string): WeekContext {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const currentWeekStart = this.getWeekStartDate();

    return {
      weekStartDate,
      weekEndDate: end.toISOString().split('T')[0],
      isCurrentWeek: weekStartDate === currentWeekStart
    };
  }

  /**
   * Format time estimate for display
   */
  formatTimeEstimate(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hr${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMinutes} min`;
  }

  // ============================================================================
  // MAPPING FUNCTIONS (DB <-> TypeScript)
  // ============================================================================

  private mapUserStatusFromDb(data: any): HelpingHandUserStatus {
    return {
      id: data.id,
      userId: data.user_id,
      weekStartDate: data.week_start_date,
      workScheduleType: data.work_schedule_type,
      workHoursPerWeek: data.work_hours_per_week,
      availableTimeLevel: data.available_time_level,
      busyDays: data.busy_days || [],
      emotionalCapacity: data.emotional_capacity,
      stressLevel: data.stress_level,
      energyLevel: data.energy_level,
      currentChallenges: data.current_challenges || [],
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapUserStatusToDb(request: UpdateUserStatusRequest): any {
    const { status } = request;
    return {
      user_id: request.userId,
      week_start_date: request.weekStartDate,
      work_schedule_type: status.workScheduleType,
      work_hours_per_week: status.workHoursPerWeek || null,
      available_time_level: status.availableTimeLevel,
      busy_days: status.busyDays || [],
      emotional_capacity: status.emotionalCapacity,
      stress_level: status.stressLevel,
      energy_level: status.energyLevel,
      current_challenges: status.currentChallenges || [],
      notes: status.notes || null
    };
  }

  private mapCategoryFromDb(data: any): HelpingHandCategory {
    return {
      id: data.id,
      name: data.name,
      displayName: data.display_name,
      description: data.description,
      icon: data.icon,
      colorClass: data.color_class,
      minTimeRequired: data.min_time_required,
      maxTimeRequired: data.max_time_required,
      effortLevel: data.effort_level,
      emotionalCapacityRequired: data.emotional_capacity_required,
      sortOrder: data.sort_order,
      isActive: data.is_active,
      createdAt: data.created_at
    };
  }

  private mapSuggestionFromDb(data: any): HelpingHandSuggestion {
    return {
      id: data.id,
      userId: data.user_id,
      relationshipId: data.relationship_id,
      weekStartDate: data.week_start_date,
      categoryId: data.category_id,
      sourceType: data.source_type,
      title: data.title,
      description: data.description,
      detailedSteps: data.detailed_steps || [],
      timeEstimateMinutes: data.time_estimate_minutes,
      effortLevel: data.effort_level,
      bestTiming: data.best_timing,
      loveLanguageAlignment: data.love_language_alignment || [],
      whySuggested: data.why_suggested,
      basedOnFactors: data.based_on_factors || {},
      partnerHint: data.partner_hint,
      partnerPreferenceMatch: data.partner_preference_match,
      isSelected: data.is_selected,
      isCompleted: data.is_completed,
      completedAt: data.completed_at,
      userFeedback: data.user_feedback,
      userNotes: data.user_notes,
      aiConfidenceScore: data.ai_confidence_score,
      generatedBy: data.generated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapSuggestionWithCategoryFromDb(data: any): HelpingHandSuggestionWithCategory {
    const suggestion = this.mapSuggestionFromDb(data);
    return {
      ...suggestion,
      category: {
        id: data.category_id,
        name: data.category_name,
        displayName: data.category_display_name,
        description: '',
        icon: data.category_icon,
        colorClass: data.category_color_class,
        minTimeRequired: 0,
        maxTimeRequired: 0,
        effortLevel: 'low',
        emotionalCapacityRequired: 'low',
        sortOrder: 0,
        isActive: true,
        createdAt: ''
      },
      categoryName: data.category_name,
      categoryDisplayName: data.category_display_name,
      categoryIcon: data.category_icon,
      categoryColorClass: data.category_color_class
    };
  }

  private mapReminderFromDb(data: any): HelpingHandReminder {
    return {
      id: data.id,
      suggestionId: data.suggestion_id,
      userId: data.user_id,
      frequency: data.frequency,
      specificDays: data.specific_days || [],
      preferredTime: data.preferred_time,
      startDate: data.start_date,
      endDate: data.end_date,
      isActive: data.is_active,
      lastSentAt: data.last_sent_at,
      nextScheduledAt: data.next_scheduled_at,
      totalSent: data.total_sent,
      snoozedUntil: data.snoozed_until,
      markedDone: data.marked_done,
      markedDoneAt: data.marked_done_at,
      calendarEventId: data.calendar_event_id,
      syncedToCalendar: data.synced_to_calendar,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapPartnerHintFromDb(data: any): HelpingHandPartnerHint {
    return {
      id: data.id,
      relationshipId: data.relationship_id,
      hintingUserId: data.hinting_user_id,
      receivingPartnerId: data.receiving_partner_id,
      hintType: data.hint_type,
      hintText: data.hint_text,
      showDirectly: data.show_directly,
      expiresAt: data.expires_at,
      usedInSuggestionCount: data.used_in_suggestion_count || 0,
      lastUsedAt: data.last_used_at,
      createdAt: data.created_at,
      isActive: data.is_active
    };
  }
}

export const helpingHandService = new HelpingHandService();
