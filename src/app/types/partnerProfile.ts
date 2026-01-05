/**
 * Partner Profile System Types
 *
 * Core personalization engine that powers all AI suggestions,
 * date ideas, and frequency adjustments.
 */

import { LoveLanguage, CommunicationStyle } from './suggestions';

export type FrequencyPreference =
  | 'high_touch'    // Daily check-ins, frequent prompts
  | 'moderate'      // 3-4x/week check-ins
  | 'low_touch';    // 1-2x/week, minimal prompts

export type StressNeed =
  | 'space'              // Leave them alone
  | 'reassurance'        // Affirm them
  | 'distraction'        // Help them think about something else
  | 'practical_help';    // Do something concrete

export type CheckinTime =
  | 'morning'    // 6am-12pm
  | 'afternoon'  // 12pm-5pm
  | 'evening';   // 5pm-10pm

export type RelationshipStatus =
  | 'dating'      // Currently dating
  | 'married';    // Married

export type CohabitationStatus =
  | 'living_together'    // Live in the same place
  | 'living_apart';      // Live in different places

export type ProximityStatus =
  | 'same_city'      // In the same city/area
  | 'different_cities'  // Different cities but same state/country
  | 'long_distance'; // Long distance relationship

export type SeeingFrequency =
  | 'daily'        // See each other every day
  | 'few_times_week'  // Few times per week
  | 'once_week'    // Once per week
  | 'few_times_month' // Few times per month
  | 'once_month'   // Once per month
  | 'rarely';      // Rarely see each other

/**
 * Partner Profile - The core personalization engine
 */
export interface PartnerProfile {
  id: string;
  userId: string;
  coupleId: string;

  // Relationship Details (collected during onboarding)
  relationshipStatus?: RelationshipStatus;
  cohabitationStatus?: CohabitationStatus;
  proximityStatus?: ProximityStatus;
  seeingFrequency?: SeeingFrequency;

  // Explicit Preferences (collected during onboarding)
  loveLanguagePrimary: LoveLanguage;
  loveLanguageSecondary?: LoveLanguage;
  communicationStyle: CommunicationStyle;
  stressNeeds: StressNeed[];
  frequencyPreference: FrequencyPreference;
  dailyCheckinsEnabled: boolean;
  preferredCheckinTimes: CheckinTime[];

  // Custom Learning (user-taught rules)
  customPreferences: CustomPreference[];

  // Behavioral Learning (system-learned patterns)
  learnedPatterns: LearnedPatterns;
  engagementScore: number; // 0-100, how engaged they are

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User-taught rules like "I don't want advice when stressed"
 */
export interface CustomPreference {
  id: string;
  category: 'stress' | 'affection' | 'communication' | 'surprises' | 'general';
  rule: string; // Natural language: "I need affection even when I'm quiet"
  createdAt: Date;
}

/**
 * System-learned behavioral patterns
 */
export interface LearnedPatterns {
  // Response patterns
  fastestResponseTime?: CheckinTime; // When they respond quickest
  slowestResponseTime?: CheckinTime;

  // Engagement patterns
  mostEngagedFeatures: string[]; // ['daily_question', 'messages']
  leastEngagedFeatures: string[];

  // Mood patterns
  stressedDays?: number[]; // Days of week (0-6) when they're often stressed
  energeticDays?: number[];

  // Date preferences
  preferredDateTypes?: string[]; // ['virtual', 'low_energy', 'creative']

  // Message preferences
  preferredMessageLength?: 'short' | 'medium' | 'long';
  respondsToEmojis?: boolean;
}

/**
 * Engagement tracking event
 */
export interface EngagementEvent {
  id: string;
  userId: string;
  eventType:
    | 'suggestion_accepted'
    | 'suggestion_skipped'
    | 'message_sent'
    | 'date_completed'
    | 'daily_question_answered'
    | 'gift_sent'
    | 'need_submitted'
    | 'custom_preference_added';

  context: Record<string, any>; // What was the suggestion, etc.
  createdAt: Date;
}

/**
 * Engagement patterns analysis
 */
export interface EngagementPatterns {
  userId: string;

  // Overall engagement
  totalInteractions: number;
  interactionsPerWeek: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';

  // Suggestion performance
  suggestionAcceptanceRate: number; // 0-100
  spontaneousActions: number; // Actions without prompts

  // Feature usage
  mostUsedFeature: string;
  leastUsedFeature: string;

  // Time patterns
  mostActiveTime: CheckinTime;
  averageResponseTime: number; // Minutes

  // Graduation signals
  readyForReduction: boolean; // Ready to reduce prompts
  independenceScore: number; // 0-100, higher = less app needed
}

/**
 * Frequency configuration (calculated)
 */
export interface FrequencyConfig {
  userId: string;

  // Current settings
  dailyQuestionEnabled: boolean;
  weeklyReflectionEnabled: boolean;
  nudgesPerWeek: number;
  suggestionsPerWeek: number;

  // Quiet mode
  quietModeActive: boolean;
  quietModeUntil?: Date;

  // Scheduling
  nextCheckinTime?: Date;
  nextSuggestionTime?: Date;

  // Reasoning
  reasoning: string; // Why this frequency
}

/**
 * Quiet mode configuration
 */
export interface QuietMode {
  userId: string;
  active: boolean;
  reason: 'user_requested' | 'stress_detected' | 'low_engagement' | 'partner_requested_space';
  activatedAt: Date;
  endsAt?: Date;
  allowEmergencyMessages: boolean;
}
