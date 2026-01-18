/**
 * Helping Hand Feature Types
 *
 * This file contains all TypeScript type definitions for the Helping Hand feature,
 * which provides personalized weekly suggestions for supporting one's partner
 * based on capacity, love languages, and relationship context.
 */

// ============================================================================
// USER STATUS TYPES
// ============================================================================

export type WorkScheduleType =
  | 'full_time'
  | 'part_time'
  | 'flexible'
  | 'unemployed'
  | 'student'
  | 'shift_work';

export type AvailableTimeLevel =
  | 'very_limited'
  | 'limited'
  | 'moderate'
  | 'plenty';

export type CapacityLevel =
  | 'very_low'
  | 'low'
  | 'moderate'
  | 'good'
  | 'excellent';

export type StressLevel =
  | 'very_stressed'
  | 'stressed'
  | 'moderate'
  | 'relaxed'
  | 'very_relaxed';

export type EnergyLevel =
  | 'exhausted'
  | 'tired'
  | 'moderate'
  | 'energized'
  | 'very_energized';

export type CurrentChallenge =
  | 'work_deadline'
  | 'family_issue'
  | 'health_concern'
  | 'financial_stress'
  | 'travel'
  | 'moving'
  | 'studying'
  | 'other';

export interface HelpingHandUserStatus {
  id: string;
  userId: string;
  weekStartDate: string; // ISO date string

  // Work & Time
  workScheduleType: WorkScheduleType;
  workHoursPerWeek?: number;
  availableTimeLevel: AvailableTimeLevel;
  busyDays?: string[]; // ISO date strings

  // Emotional Capacity
  emotionalCapacity: CapacityLevel;
  stressLevel: StressLevel;
  energyLevel: EnergyLevel;

  // Context
  currentChallenges?: CurrentChallenge[];
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export type EffortLevel = 'minimal' | 'low' | 'moderate' | 'high';
export type EmotionalCapacityRequired = 'low' | 'moderate' | 'high';

export interface HelpingHandCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string; // Lucide icon name
  colorClass: string;

  // Filtering
  minTimeRequired: number; // minutes
  maxTimeRequired: number;
  effortLevel: EffortLevel;
  emotionalCapacityRequired: EmotionalCapacityRequired;

  // Metadata
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// SUGGESTION TYPES
// ============================================================================

export type LoveLanguage = 'words' | 'quality_time' | 'gifts' | 'acts' | 'touch';
export type BestTiming = 'morning' | 'afternoon' | 'evening' | 'weekend' | 'any';
export type UserFeedback = 'helpful' | 'not_helpful' | 'too_much';
export type SuggestionSourceType = 'ai' | 'user_created';

export interface SuggestionStep {
  step: number;
  action: string;
  tip?: string;
  estimatedMinutes?: number;
}

export interface HelpingHandSuggestion {
  id: string;
  userId: string;
  relationshipId: string;
  weekStartDate: string;

  // Categorization
  categoryId: string;
  category?: HelpingHandCategory; // Populated via join

  // Source
  sourceType: SuggestionSourceType; // 'ai' or 'user_created'

  // Content
  title: string;
  description: string;
  detailedSteps?: SuggestionStep[];

  // Requirements
  timeEstimateMinutes: number;
  effortLevel: EffortLevel;
  bestTiming?: BestTiming;

  // Personalization (optional for user-created suggestions)
  loveLanguageAlignment?: LoveLanguage[];
  whySuggested?: string; // AI explanation (empty for user-created)
  basedOnFactors?: Record<string, any>;

  // Partner Context (AI-generated only)
  partnerHint?: string;
  partnerPreferenceMatch?: boolean;

  // Tracking
  isSelected: boolean;
  isCompleted: boolean;
  completedAt?: string;
  userFeedback?: UserFeedback;
  userNotes?: string;

  // AI Metadata (only for AI-generated suggestions)
  aiConfidenceScore?: number; // 0.00 to 1.00 (null for user-created)
  generatedBy?: string; // AI model used (null for user-created)

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Suggestion with populated category (from join)
export interface HelpingHandSuggestionWithCategory extends HelpingHandSuggestion {
  category: HelpingHandCategory;
  categoryName: string;
  categoryDisplayName: string;
  categoryIcon: string;
  categoryColorClass: string;
}

// ============================================================================
// REMINDER TYPES
// ============================================================================

export type ReminderFrequency =
  | 'once'
  | 'daily'
  | 'every_other_day'
  | 'twice_weekly'
  | 'weekly';

export interface HelpingHandReminder {
  id: string;
  suggestionId: string;
  userId: string;

  // Schedule
  frequency: ReminderFrequency;
  specificDays?: number[]; // 0=Sunday, 6=Saturday
  preferredTime: string; // HH:MM format

  // Date Range
  startDate: string;
  endDate?: string;

  // Status
  isActive: boolean;
  lastSentAt?: string;
  nextScheduledAt?: string;
  totalSent: number;

  // User Interaction
  snoozedUntil?: string;
  markedDone: boolean;
  markedDoneAt?: string;

  // Calendar Integration
  calendarEventId?: string;
  syncedToCalendar: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PARTNER HINT TYPES
// ============================================================================

export type PartnerHintType =
  | 'like'
  | 'dislike'
  | 'need'
  | 'preference'
  | 'special_occasion';

export interface HelpingHandPartnerHint {
  id: string;
  relationshipId: string;
  hintingUserId: string;
  receivingPartnerId: string;

  // Content
  hintType: PartnerHintType;
  hintText: string;

  // Privacy
  showDirectly: boolean;
  expiresAt?: string;

  // Usage
  usedInSuggestionCount: number;
  lastUsedAt?: string;

  // Metadata
  createdAt: string;
  isActive: boolean;
}

// ============================================================================
// SERVICE REQUEST/RESPONSE TYPES
// ============================================================================

// Generate Suggestions
export interface GenerateSuggestionsRequest {
  userId: string;
  relationshipId: string;
  weekStartDate: string;
  regenerate?: boolean; // If true, regenerate even if suggestions exist
}

export interface GenerateSuggestionsResponse {
  suggestions: HelpingHandSuggestion[];
  categoryCounts: Record<string, number>;
  generatedAt: string;
}

// Get Suggestions
export interface GetSuggestionsRequest {
  userId: string;
  weekStartDate: string;
  categoryId?: string; // Filter by category
  includeCompleted?: boolean;
}

export interface GetSuggestionsResponse {
  suggestions: HelpingHandSuggestionWithCategory[];
  total: number;
}

// Select/Deselect Suggestion
export interface SelectSuggestionRequest {
  suggestionId: string;
  userId: string;
  selected: boolean;
}

// Complete Suggestion
export interface CompleteSuggestionRequest {
  suggestionId: string;
  userId: string;
  feedback?: UserFeedback;
  notes?: string;
}

// Setup Reminder
export interface SetupReminderRequest {
  suggestionId: string;
  userId: string;
  frequency: ReminderFrequency;
  specificDays?: number[];
  preferredTime: string;
  startDate: string;
  endDate?: string;
  syncToCalendar?: boolean; // Whether to sync to device calendar
}

export interface SetupReminderResponse {
  reminder: HelpingHandReminder;
  calendarEventId?: string; // If synced to calendar
}

// Update User Status
export interface UpdateUserStatusRequest {
  userId: string;
  weekStartDate: string;
  status: Partial<Omit<HelpingHandUserStatus, 'id' | 'userId' | 'weekStartDate' | 'createdAt' | 'updatedAt'>>;
}

// Create Custom Suggestion
export interface CreateCustomSuggestionRequest {
  userId: string;
  relationshipId: string;
  weekStartDate: string;
  categoryId: string;
  title: string;
  description: string;
  detailedSteps?: SuggestionStep[];
  timeEstimateMinutes: number;
  effortLevel: EffortLevel;
  bestTiming?: BestTiming;
  loveLanguageAlignment?: LoveLanguage[];
}

// Add Partner Hint
export interface AddPartnerHintRequest {
  relationshipId: string;
  hintingUserId: string;
  receivingPartnerId: string;
  hintType: PartnerHintType;
  hintText: string;
  showDirectly?: boolean;
  expiresAt?: string;
}

export interface AddPartnerHintResponse {
  hint: HelpingHandPartnerHint;
  regeneratedSuggestions: boolean; // Whether suggestions were regenerated
}

// Get Category Counts
export interface CategoryCount {
  categoryId: string;
  categoryName: string;
  count: number;
}

export interface GetCategoryCountsResponse {
  counts: CategoryCount[];
  totalSuggestions: number;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface HelpingHandAssessmentProps {
  onBack: () => void;
  onComplete: (status: HelpingHandUserStatus) => void;
  existingStatus?: HelpingHandUserStatus;
}

export interface HelpingHandCategoriesProps {
  onBack: () => void;
  onSelectCategory: (category: HelpingHandCategory) => void;
  onAddCustom: (category: HelpingHandCategory) => void;
  weekStartDate: string;
}

export interface HelpingHandSuggestionDetailsProps {
  category: HelpingHandCategory;
  onBack: () => void;
  onSelectSuggestion: (suggestion: HelpingHandSuggestion) => void;
  onSaveForLater: (suggestion: HelpingHandSuggestion) => void;
  weekStartDate: string;
}

export interface HelpingHandCustomSuggestionProps {
  category: HelpingHandCategory;
  onBack: () => void;
  onSave: (suggestion: CreateCustomSuggestionRequest) => void;
  weekStartDate: string;
}

export interface HelpingHandReminderSetupProps {
  suggestion: HelpingHandSuggestion;
  onBack: () => void;
  onComplete: (reminder: HelpingHandReminder) => void;
}

export interface HelpingHandProgressProps {
  onBack: () => void;
  onViewSuggestion: (suggestion: HelpingHandSuggestion) => void;
  weekStartDate: string;
}

export interface HelpingHandHintModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  partnerName: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Week context - used across components
export interface WeekContext {
  weekStartDate: string;
  weekEndDate: string;
  isCurrentWeek: boolean;
}

// Suggestion filters
export interface SuggestionFilters {
  categoryId?: string;
  sourceType?: SuggestionSourceType;
  effortLevel?: EffortLevel;
  maxTimeMinutes?: number;
  loveLanguage?: LoveLanguage;
  isSelected?: boolean;
  isCompleted?: boolean;
}

// AI generation context (used internally by AI service)
export interface AIGenerationContext {
  userStatus: HelpingHandUserStatus;
  partnerStatus?: HelpingHandUserStatus;
  userOnboarding: any; // OnboardingResponse type
  partnerOnboarding: any;
  relationshipData: any; // Relationship type
  partnerHints: HelpingHandPartnerHint[];
  userCalendarEvents: any[];
  previousSuggestions: HelpingHandSuggestion[];
}

// Quick nudge preset
export interface QuickNudgePreset {
  emoji: string;
  label: string;
  hintType: PartnerHintType;
  hintText: string;
}

// Helper function type for getting week start date
export type GetWeekStartDate = (date?: Date) => string;

// Helper function type for formatting time estimate
export type FormatTimeEstimate = (minutes: number) => string;
