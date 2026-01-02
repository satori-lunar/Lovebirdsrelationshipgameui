/**
 * Needs-Based Learning System Types
 *
 * "What feels missing?" feature that routes intelligently
 * through partner's profile to generate helpful suggestions.
 */

import { MessageSuggestion, ActionSuggestion } from './suggestions';

export type NeedCategory =
  | 'communication'    // Not talking enough or deeply enough
  | 'affection'        // Not feeling loved
  | 'quality_time'     // Not enough intentional time together
  | 'reassurance'      // Feeling insecure or uncertain
  | 'support'          // Need help or encouragement
  | 'space'            // Need breathing room
  | 'appreciation'     // Not feeling valued
  | 'understanding'    // Feeling misunderstood
  | 'consistency'      // Need more reliability/routine
  | 'physical_intimacy' // Touch, closeness (for LDR: virtual intimacy)
  | 'fun'              // Missing playfulness/joy
  | 'other';           // Custom category

export type Urgency =
  | 'not_urgent'  // Can wait, no rush
  | 'would_help'  // Would improve things
  | 'important';  // Needs attention soon

export type NeedStatus =
  | 'pending'        // Submitted, partner hasn't seen yet
  | 'acknowledged'   // Partner viewed the suggestion
  | 'in_progress'    // Partner is working on it
  | 'resolved'       // Need has been met
  | 'expired';       // No longer relevant

/**
 * A relationship need submitted by one partner
 */
export interface RelationshipNeed {
  id: string;
  coupleId: string;
  requesterId: string; // Who needs something
  receiverId: string;  // Who receives the suggestion

  // What's missing
  needCategory: NeedCategory;
  customCategory?: string; // If category = 'other'
  context?: string; // Optional 1-2 sentence context
  urgency: Urgency;

  // Status
  status: NeedStatus;

  // AI-generated response
  aiSuggestion?: AINeedSuggestion;

  // Privacy
  showRawNeedToPartner: boolean; // Usually false - show AI translation instead

  // Timestamps
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  expiresAt?: Date; // Auto-expire after 7 days
}

/**
 * AI-generated suggestion for how to respond to a need
 */
export interface AINeedSuggestion {
  // For the receiver (partner)
  receiverMessage: string; // Gentle summary of what's needed
  suggestedMessages: MessageSuggestion[]; // 3-4 message options
  suggestedActions: ActionSuggestion[]; // Concrete actions they can take

  // For the requester
  requesterGuidance?: string; // How to receive their response

  // Reasoning (shown only to receiver)
  reasoning: string; // Why these suggestions

  // Safety
  safetyNote?: string; // E.g., "If this is urgent, consider talking directly"
}

/**
 * Need submission form data
 */
export interface SubmitNeedRequest {
  coupleId: string;
  requesterId: string;
  needCategory: NeedCategory;
  customCategory?: string;
  context?: string;
  urgency: Urgency;
  showRawNeedToPartner?: boolean; // Default: false
}

/**
 * Need category metadata for UI
 */
export interface NeedCategoryInfo {
  category: NeedCategory;
  label: string;
  description: string;
  icon: string; // Emoji
  examples: string[]; // Example scenarios
  commonWhen: string; // When this typically comes up
}

/**
 * Constants for need categories
 */
export const NEED_CATEGORIES: NeedCategoryInfo[] = [
  {
    category: 'communication',
    label: 'Communication',
    description: 'Not talking enough or deeply enough',
    icon: '💬',
    examples: [
      'We only text surface-level stuff',
      'I want deeper conversations',
      'We haven\'t really talked in days'
    ],
    commonWhen: 'Long distance, busy schedules, feeling disconnected'
  },
  {
    category: 'affection',
    label: 'Affection',
    description: 'Not feeling loved or cared for',
    icon: '💛',
    examples: [
      'I need to hear "I love you" more',
      'Missing warmth and tenderness',
      'Want to feel special'
    ],
    commonWhen: 'Stress, distance, routine setting in'
  },
  {
    category: 'quality_time',
    label: 'Quality Time',
    description: 'Not enough intentional time together',
    icon: '⏰',
    examples: [
      'We\'re both here but not present',
      'Want undivided attention',
      'Need a real date, not just texting'
    ],
    commonWhen: 'Busy periods, taking each other for granted'
  },
  {
    category: 'reassurance',
    label: 'Reassurance',
    description: 'Feeling insecure or uncertain',
    icon: '🤗',
    examples: [
      'Doubting if we\'re okay',
      'Need to know you still care',
      'Feeling a bit distant'
    ],
    commonWhen: 'After arguments, periods of silence, anxiety'
  },
  {
    category: 'support',
    label: 'Support',
    description: 'Need encouragement or help',
    icon: '🫂',
    examples: [
      'Going through a tough time',
      'Need someone to believe in me',
      'Want help processing something'
    ],
    commonWhen: 'Stress, challenges, big decisions'
  },
  {
    category: 'space',
    label: 'Space',
    description: 'Need breathing room',
    icon: '🌙',
    examples: [
      'Feeling overwhelmed',
      'Need time to myself',
      'Want less pressure to respond'
    ],
    commonWhen: 'Burnout, overstimulation, processing emotions'
  },
  {
    category: 'appreciation',
    label: 'Appreciation',
    description: 'Not feeling valued or seen',
    icon: '✨',
    examples: [
      'My efforts feel unnoticed',
      'Want acknowledgment',
      'Need to feel valued'
    ],
    commonWhen: 'One person doing more, feeling taken for granted'
  },
  {
    category: 'understanding',
    label: 'Understanding',
    description: 'Feeling misunderstood',
    icon: '🤝',
    examples: [
      'Feel like they don\'t get me',
      'Need empathy, not solutions',
      'Want to be heard'
    ],
    commonWhen: 'Miscommunication, different perspectives, conflict'
  },
  {
    category: 'consistency',
    label: 'Consistency',
    description: 'Need more reliability or routine',
    icon: '📅',
    examples: [
      'Our rhythm feels off',
      'Need predictable check-ins',
      'Want more stability'
    ],
    commonWhen: 'Irregular schedules, unpredictability, anxiety'
  },
  {
    category: 'fun',
    label: 'Fun & Playfulness',
    description: 'Missing joy and lightness',
    icon: '🎉',
    examples: [
      'We\'re too serious lately',
      'Miss laughing together',
      'Want spontaneity'
    ],
    commonWhen: 'Stress, routine, heavy conversations'
  },
  {
    category: 'other',
    label: 'Something Else',
    description: 'Custom need',
    icon: '💭',
    examples: [],
    commonWhen: 'Unique situation'
  }
];

/**
 * Need resolution feedback
 */
export interface NeedResolution {
  needId: string;
  resolvedBy: string; // User ID who marked it resolved
  howItWasResolved: string; // What they did
  wasHelpful: boolean;
  feedback?: string;
  resolvedAt: Date;
}

/**
 * Analytics for needs over time
 */
export interface NeedsAnalytics {
  coupleId: string;

  // Frequency
  totalNeedsSubmitted: number;
  needsPerMonth: number;
  needsTrend: 'increasing' | 'stable' | 'decreasing';

  // Categories
  mostCommonNeed: NeedCategory;
  leastCommonNeed: NeedCategory;

  // Resolution
  averageResolutionTime: number; // Hours
  resolutionRate: number; // 0-100
  spontaneousResolution: number; // Resolved before seeing suggestion

  // Independence
  needingAppLess: boolean; // Are they solving needs without submitting?
}
