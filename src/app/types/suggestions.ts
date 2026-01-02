/**
 * AI Suggestion System Types
 *
 * Types for AI-generated message suggestions, date ideas, and responses
 * filtered through partner's love language and communication style.
 */

export type SuggestionType =
  | 'reassurance'
  | 'affection'
  | 'quality_time'
  | 'appreciation'
  | 'support'
  | 'celebration'
  | 'reconnection'
  | 'check_in';

export type CommunicationStyle =
  | 'direct'
  | 'gentle'
  | 'playful'
  | 'reserved';

export type LoveLanguage =
  | 'words'           // Words of Affirmation
  | 'quality_time'    // Quality Time
  | 'gifts'           // Receiving Gifts
  | 'acts'            // Acts of Service
  | 'touch';          // Physical Touch

/**
 * A single message suggestion with tone, content, and reasoning
 */
export interface MessageSuggestion {
  id: string;
  tone: CommunicationStyle;
  message: string;
  reasoning: string; // Why this suggestion was generated
  loveLanguageAlignment: LoveLanguage; // Which love language this serves
  suggestionType: SuggestionType;
  confidence: number; // 0-100, how confident the AI is
}

/**
 * Context used to generate suggestions
 */
export interface SuggestionContext {
  triggerReason: string; // "Partner hasn't received affirmation in 3 days"
  partnerLoveLanguage: LoveLanguage;
  partnerCommunicationStyle: CommunicationStyle;
  recentInteractions?: {
    lastMessageSent?: Date;
    lastDateCompleted?: Date;
    lastGiftSent?: Date;
    lastPositiveInteraction?: Date;
  };
  currentMood?: 'stressed' | 'happy' | 'neutral' | 'distant';
  customPreferences?: Record<string, any>; // User-taught rules
}

/**
 * Date suggestion tailored to partner's preferences
 */
export interface DateSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'virtual' | 'in_person' | 'async';
  loveLanguageFocus: LoveLanguage;
  energyLevel: 'low' | 'medium' | 'high'; // Required energy
  duration: string; // "30 minutes" | "2 hours"
  reasoning: string; // Why this date for this couple
  steps?: string[]; // Optional step-by-step guide
}

/**
 * Response to a relationship need
 */
export interface NeedResponse {
  needId: string;
  suggestions: MessageSuggestion[];
  actions: ActionSuggestion[];
  reasoning: string;
  urgencyAcknowledged: boolean;
}

/**
 * Suggested action (not just a message)
 */
export interface ActionSuggestion {
  type: 'send_gift' | 'schedule_date' | 'send_message' | 'give_space' | 'check_in_later';
  description: string;
  reasoning: string;
  loveLanguageAlignment: LoveLanguage;
}

/**
 * Stored suggestion in database
 */
export interface StoredSuggestion {
  id: string;
  senderId: string;
  receiverId: string;
  suggestionType: SuggestionType;
  generatedMessages: MessageSuggestion[];
  context: SuggestionContext;
  wasUsed: boolean;
  usedMessageId?: string;
  createdAt: Date;
}

/**
 * Learning event to track what works
 */
export interface SuggestionLearningEvent {
  id: string;
  userId: string;
  eventType: 'accepted' | 'skipped' | 'modified' | 'dismissed';
  suggestionId: string;
  suggestionType: SuggestionType;
  loveLanguage: LoveLanguage;
  communicationStyle: CommunicationStyle;
  createdAt: Date;
}

/**
 * Template for generating suggestions
 */
export interface SuggestionTemplate {
  direct: string;
  gentle: string;
  playful: string;
  reserved: string;
}
