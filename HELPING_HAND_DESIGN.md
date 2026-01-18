# Helping Hand Feature - Design Document

## Overview
The Helping Hand feature provides personalized, context-aware suggestions for how users can support their partner based on:
- User's current capacity (work schedule, time availability, emotional capacity)
- Partner's emotional capacity and needs
- Love languages and preferences
- Living situation and relationship dynamics
- Past interactions and preferences

## Data Model

### 1. Database Tables

#### `helping_hand_user_status` Table
Tracks user's current capacity and availability for the week.

```sql
CREATE TABLE helping_hand_user_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,

  -- Work & Time Availability
  work_schedule_type TEXT NOT NULL, -- 'full_time', 'part_time', 'flexible', 'unemployed', 'student', 'shift_work'
  work_hours_per_week INTEGER, -- Average hours working this week
  available_time_level TEXT NOT NULL, -- 'very_limited', 'limited', 'moderate', 'plenty'
  busy_days JSONB, -- Array of dates that are particularly busy

  -- Emotional Capacity
  emotional_capacity TEXT NOT NULL, -- 'very_low', 'low', 'moderate', 'good', 'excellent'
  stress_level TEXT NOT NULL, -- 'very_stressed', 'stressed', 'moderate', 'relaxed', 'very_relaxed'
  energy_level TEXT NOT NULL, -- 'exhausted', 'tired', 'moderate', 'energized', 'very_energized'

  -- Context
  current_challenges TEXT[], -- Array: 'work_deadline', 'family_issue', 'health_concern', 'financial_stress', etc.
  notes TEXT, -- Optional free-form notes

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_helping_hand_user_status_user_week ON helping_hand_user_status(user_id, week_start_date);
CREATE INDEX idx_helping_hand_user_status_week ON helping_hand_user_status(week_start_date);
```

#### `helping_hand_categories` Table
Predefined categories for organizing suggestions.

```sql
CREATE TABLE helping_hand_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Lucide icon name
  color_class TEXT NOT NULL, -- Tailwind color class

  -- Filtering criteria
  min_time_required INTEGER NOT NULL, -- Minutes
  max_time_required INTEGER NOT NULL,
  effort_level TEXT NOT NULL, -- 'minimal', 'low', 'moderate', 'high'
  emotional_capacity_required TEXT NOT NULL, -- 'low', 'moderate', 'high'

  -- Metadata
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default categories
INSERT INTO helping_hand_categories (name, display_name, description, icon, color_class, min_time_required, max_time_required, effort_level, emotional_capacity_required, sort_order) VALUES
('quick_wins', 'Quick Wins', 'Simple gestures that take 5 minutes or less', 'Zap', 'warm-yellow', 1, 5, 'minimal', 'low', 1),
('thoughtful_messages', 'Thoughtful Messages', 'Meaningful words to brighten their day', 'MessageCircle', 'soft-purple', 2, 10, 'low', 'moderate', 2),
('acts_of_service', 'Acts of Service', 'Helpful actions to lighten their load', 'Heart', 'warm-pink', 10, 60, 'moderate', 'moderate', 3),
('quality_time', 'Quality Time', 'Ways to connect and be present together', 'Clock', 'soft-blue', 30, 180, 'moderate', 'high', 4),
('thoughtful_gifts', 'Thoughtful Gifts', 'Meaningful gifts or surprises', 'Gift', 'warm-orange', 15, 120, 'moderate', 'moderate', 5),
('physical_touch', 'Physical Touch', 'Affectionate gestures and closeness', 'Users', 'warm-pink-light', 5, 30, 'low', 'moderate', 6),
('planning_ahead', 'Planning Ahead', 'Future plans to look forward to', 'Calendar', 'soft-purple-light', 20, 90, 'high', 'high', 7);
```

#### `helping_hand_suggestions` Table
Stores AI-generated personalized suggestions for users.

```sql
CREATE TABLE helping_hand_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,

  -- Categorization
  category_id UUID REFERENCES helping_hand_categories(id) ON DELETE CASCADE NOT NULL,

  -- Suggestion Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detailed_steps JSONB, -- Array of step objects: [{step: 1, action: "...", tip: "..."}]

  -- Requirements
  time_estimate_minutes INTEGER NOT NULL,
  effort_level TEXT NOT NULL, -- 'minimal', 'low', 'moderate', 'high'
  best_timing TEXT, -- 'morning', 'afternoon', 'evening', 'weekend', 'any'

  -- Personalization Context
  love_language_alignment TEXT[], -- Which love languages this serves
  why_suggested TEXT NOT NULL, -- AI explanation of why this is relevant
  based_on_factors JSONB, -- What data informed this suggestion

  -- Partner Context (optional - if partner shared something privately)
  partner_hint TEXT, -- Subtle hint about partner's current state
  partner_preference_match BOOLEAN DEFAULT FALSE,

  -- Tracking
  is_selected BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  user_feedback TEXT, -- 'helpful', 'not_helpful', 'too_much'
  user_notes TEXT,

  -- AI Metadata
  ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  generated_by TEXT DEFAULT 'claude', -- AI model used

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_helping_hand_suggestions_user_week ON helping_hand_suggestions(user_id, week_start_date);
CREATE INDEX idx_helping_hand_suggestions_category ON helping_hand_suggestions(category_id);
CREATE INDEX idx_helping_hand_suggestions_selected ON helping_hand_suggestions(user_id, is_selected) WHERE is_selected = TRUE;
```

#### `helping_hand_reminders` Table
Tracks reminder schedules for selected suggestions.

```sql
CREATE TABLE helping_hand_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id UUID REFERENCES helping_hand_suggestions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Reminder Schedule
  frequency TEXT NOT NULL, -- 'once', 'daily', 'every_other_day', 'twice_weekly', 'weekly'
  specific_days INTEGER[], -- Array of day numbers (0=Sunday, 6=Saturday) for weekly/twice_weekly
  preferred_time TIME NOT NULL, -- Time of day for reminder

  -- Date Range
  start_date DATE NOT NULL,
  end_date DATE, -- NULL for ongoing

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,
  total_sent INTEGER DEFAULT 0,

  -- User Interaction
  snoozed_until TIMESTAMPTZ,
  marked_done BOOLEAN DEFAULT FALSE,
  marked_done_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_helping_hand_reminders_user ON helping_hand_reminders(user_id);
CREATE INDEX idx_helping_hand_reminders_next_scheduled ON helping_hand_reminders(next_scheduled_at) WHERE is_active = TRUE;
CREATE INDEX idx_helping_hand_reminders_suggestion ON helping_hand_reminders(suggestion_id);
```

#### `helping_hand_partner_hints` Table
Private messages/hints from partner that system can use for suggestions.

```sql
CREATE TABLE helping_hand_partner_hints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE NOT NULL,
  hinting_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiving_partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Hint Content
  hint_type TEXT NOT NULL, -- 'like', 'dislike', 'need', 'preference', 'special_occasion'
  hint_text TEXT NOT NULL,

  -- Privacy & Visibility
  show_directly BOOLEAN DEFAULT FALSE, -- If true, show hint to partner; if false, only use for AI context
  expires_at TIMESTAMPTZ, -- Optional expiration (e.g., for time-sensitive hints)

  -- Usage Tracking
  used_in_suggestion_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_helping_hand_partner_hints_relationship ON helping_hand_partner_hints(relationship_id, is_active);
CREATE INDEX idx_helping_hand_partner_hints_receiving ON helping_hand_partner_hints(receiving_partner_id, is_active);
```

---

## TypeScript Types

### Core Types

```typescript
// User Status Types
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

// Category Types
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

// Suggestion Types
export type LoveLanguage = 'words' | 'quality_time' | 'gifts' | 'acts' | 'touch';
export type BestTiming = 'morning' | 'afternoon' | 'evening' | 'weekend' | 'any';
export type UserFeedback = 'helpful' | 'not_helpful' | 'too_much';

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

  // Content
  title: string;
  description: string;
  detailedSteps?: SuggestionStep[];

  // Requirements
  timeEstimateMinutes: number;
  effortLevel: EffortLevel;
  bestTiming?: BestTiming;

  // Personalization
  loveLanguageAlignment: LoveLanguage[];
  whySuggested: string;
  basedOnFactors?: Record<string, any>;

  // Partner Context
  partnerHint?: string;
  partnerPreferenceMatch: boolean;

  // Tracking
  isSelected: boolean;
  isCompleted: boolean;
  completedAt?: string;
  userFeedback?: UserFeedback;
  userNotes?: string;

  // AI Metadata
  aiConfidenceScore: number; // 0.00 to 1.00
  generatedBy: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Reminder Types
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

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Partner Hint Types
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

// Service Request/Response Types
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

export interface GetSuggestionsRequest {
  userId: string;
  weekStartDate: string;
  categoryId?: string; // Filter by category
  includeCompleted?: boolean;
}

export interface SelectSuggestionRequest {
  suggestionId: string;
  userId: string;
  selected: boolean;
}

export interface CompleteSuggestionRequest {
  suggestionId: string;
  userId: string;
  feedback?: UserFeedback;
  notes?: string;
}

export interface SetupReminderRequest {
  suggestionId: string;
  userId: string;
  frequency: ReminderFrequency;
  specificDays?: number[];
  preferredTime: string;
  startDate: string;
  endDate?: string;
}

export interface UpdateUserStatusRequest {
  userId: string;
  weekStartDate: string;
  status: Partial<Omit<HelpingHandUserStatus, 'id' | 'userId' | 'weekStartDate' | 'createdAt' | 'updatedAt'>>;
}

export interface AddPartnerHintRequest {
  relationshipId: string;
  hintingUserId: string;
  receivingPartnerId: string;
  hintType: PartnerHintType;
  hintText: string;
  showDirectly?: boolean;
  expiresAt?: string;
}
```

---

## AI Suggestion Generation Logic

### Input Data Collection

For generating personalized suggestions, the AI service will gather:

1. **User's Current Status** (from `helping_hand_user_status`)
   - Work schedule and available time
   - Emotional capacity, stress, energy levels
   - Current challenges

2. **Partner's Current Status** (from `helping_hand_user_status`)
   - Their emotional capacity
   - Their stress and energy levels
   - Their current challenges

3. **Relationship Data** (from `relationships` + `onboarding_responses`)
   - Living situation (together or apart)
   - How often they see each other
   - Relationship duration
   - Partner's love languages
   - Partner's communication style
   - Partner's likes/dislikes from onboarding

4. **Partner Hints** (from `helping_hand_partner_hints`)
   - Secret messages partner shared with system
   - Special preferences or needs

5. **Historical Data**
   - Previous suggestions and what worked
   - User's completion rate
   - Feedback on past suggestions

6. **Calendar Data** (from `user_calendar_events`)
   - User's busy times
   - Available windows for quality time

### AI Prompt Structure

```typescript
const systemPrompt = `You are a relationship support AI helping someone show love to their partner.
Your goal is to suggest thoughtful, personalized actions that:
1. Match the person's current capacity (time, energy, emotional bandwidth)
2. Align with their partner's love language and preferences
3. Are appropriate for their relationship context (living situation, schedules)
4. Are specific, actionable, and achievable

Consider:
- If they're stressed/low capacity: Suggest minimal-effort, high-impact gestures
- If they have time/energy: Suggest more involved quality time or acts of service
- Always explain WHY the suggestion fits their situation
- Provide specific steps, not vague advice`;

const userPrompt = `
Current Week: ${weekStartDate}

USER STATUS:
- Work: ${workSchedule}, ${hoursPerWeek} hours/week
- Available Time: ${availableTime}
- Emotional Capacity: ${emotionalCapacity}
- Stress: ${stressLevel}
- Energy: ${energyLevel}
- Current Challenges: ${challenges.join(', ')}
${notes ? `- Notes: ${notes}` : ''}

PARTNER STATUS:
- Emotional Capacity: ${partnerEmotionalCapacity}
- Stress: ${partnerStressLevel}
- Energy: ${partnerEnergyLevel}
- Current Challenges: ${partnerChallenges.join(', ')}

PARTNER PROFILE:
- Love Languages: ${loveLanguages.join(', ')}
- Communication Style: ${communicationStyle}
- Favorite Activities: ${favoriteActivities.join(', ')}
- Energy Level Preference: ${energyLevel}
- Budget Comfort: ${budgetComfort}

RELATIONSHIP CONTEXT:
- Living Situation: ${livingTogether ? 'Living together' : 'Living apart'}
- See Each Other: ${seeingFrequency}
- Relationship Duration: ${relationshipDuration}

PARTNER HINTS (private):
${partnerHints.map(h => `- ${h.hintType}: ${h.hintText}`).join('\n')}

PAST FEEDBACK:
- Completed: ${completionRate}%
- Most Helpful Category: ${topCategory}
- Recent Feedback: ${recentFeedback}

Generate 3-5 suggestions for EACH category:
1. Quick Wins (1-5 min, minimal effort)
2. Thoughtful Messages (2-10 min)
3. Acts of Service (10-60 min)
4. Quality Time (30-180 min)
5. Thoughtful Gifts (15-120 min)
6. Physical Touch (5-30 min)
7. Planning Ahead (20-90 min)

For each suggestion, provide:
- title: Clear, actionable title
- description: 2-3 sentences explaining the idea
- detailedSteps: Array of specific steps
- timeEstimateMinutes: Realistic time estimate
- effortLevel: minimal/low/moderate/high
- bestTiming: When to do this (morning/afternoon/evening/weekend/any)
- loveLanguageAlignment: Which love languages this serves
- whySuggested: Explain why this fits their current situation
- aiConfidenceScore: 0.00-1.00 based on data quality

Return as JSON array.`;
```

### Suggestion Filtering & Ranking

After AI generation, filter and rank suggestions:

1. **Filter Out:**
   - Suggestions requiring more time than user has available
   - High-effort suggestions if emotional capacity is low
   - Duplicate or very similar suggestions

2. **Rank By:**
   - AI confidence score
   - Match to partner's primary love language
   - Feasibility given user's current capacity
   - Variety across categories

3. **Limit:**
   - Max 5 suggestions per category
   - Total 20-30 suggestions for the week

---

## User Flow

### 1. Weekly Assessment (Monday)
User receives notification: "Let's plan your week for [Partner Name]"

Flow:
1. **Capacity Check Screen** → HelpingHandAssessment component
   - "How's your work schedule this week?"
   - "How much free time do you have?"
   - "How's your emotional capacity?"
   - "What's on your plate?" (challenges)

2. **Partner Check Screen** (optional, if partner shared)
   - "Here's what [Partner] shared about their week"
   - Show partner's capacity (if they filled it out)

3. **Generate Suggestions**
   - Loading screen with warm animation
   - "Creating personalized suggestions for you..."

### 2. Browse Suggestions → HelpingHandCategories component
Display categories as cards:
```
┌─────────────────────────────────┐
│ ⚡ Quick Wins                    │
│ Simple 5-minute gestures        │
│ 5 suggestions                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 💬 Thoughtful Messages          │
│ Meaningful words for their day  │
│ 4 suggestions                   │
└─────────────────────────────────┘
```

### 3. View Category → HelpingHandSuggestionDetails component
User taps category, sees suggestions:
```
┌─────────────────────────────────┐
│ Send a voice note about your    │
│ favorite memory together        │
│                                 │
│ ⏱️ 5 min  💜 Words of Affirmation│
│                                 │
│ Why this works right now:       │
│ You mentioned feeling stressed  │
│ at work - a quick voice note    │
│ lets you connect without needing│
│ a long conversation.            │
│                                 │
│ Steps:                          │
│ 1. Think of a recent moment... │
│ 2. Record 1-2 minute voice note │
│ 3. Send with heart emoji        │
│                                 │
│ [Choose This] [Save for Later]  │
└─────────────────────────────────┘
```

### 4. Setup Reminders → HelpingHandReminderSetup component
After selecting:
```
┌─────────────────────────────────┐
│ 🔔 Set up reminders             │
│                                 │
│ How often?                      │
│ ○ Once                          │
│ ● Daily                         │
│ ○ Every other day               │
│ ○ Twice a week                  │
│ ○ Weekly                        │
│                                 │
│ What time works best?           │
│ [Time Picker: 7:00 PM]          │
│                                 │
│ Start date: [Today]             │
│ End date: [This Sunday]         │
│                                 │
│ [Set Reminder]                  │
└─────────────────────────────────┘
```

### 5. Track Progress → HelpingHandProgress component
Show active suggestions with completion:
```
┌─────────────────────────────────┐
│ 📋 This Week's Helping Hands    │
│                                 │
│ ✅ Voice note about favorite    │
│    memory (Completed Mon)       │
│                                 │
│ ⏳ Make their favorite coffee   │
│    Reminder: Tomorrow 7 AM      │
│                                 │
│ 📅 Plan weekend date            │
│    Reminder: Friday 6 PM        │
│                                 │
│ 2/4 completed this week 🎉      │
└─────────────────────────────────┘
```

---

## Integration Points

### 1. Navigation (App.tsx)
Add new AppState views:
- `'helping-hand-assessment'`
- `'helping-hand-categories'`
- `'helping-hand-suggestion-details'`
- `'helping-hand-reminder-setup'`
- `'helping-hand-progress'`

### 2. Dashboard Entry Point
Add card to main dashboard:
```tsx
<Card onClick={() => handleNavigate('helping-hand-assessment')}>
  <Heart className="text-warm-pink" />
  <h3>Helping Hand</h3>
  <p>Get personalized suggestions for your partner this week</p>
  {hasActiveSuggestions && <Badge>2 active</Badge>}
</Card>
```

### 3. Notification System
Integrate with `notificationScheduler.ts`:
```typescript
// Add new method
async getBestTimesForHelpingHandReminders(userId: string): Promise<Date[]> {
  // Get user's notification preferences
  // Get active reminders from helping_hand_reminders table
  // Check calendar availability
  // Return optimal times
}
```

### 4. Weekly Refresh
Add cron job or scheduled task:
- Every Monday at user's preferred time
- Trigger weekly assessment notification
- Generate new suggestions if user completes assessment

---

## API Endpoints (RPC Functions)

Create Supabase RPC functions:

```sql
-- Get or create user status for current week
CREATE OR REPLACE FUNCTION get_or_create_helping_hand_status(
  p_user_id UUID,
  p_week_start_date DATE
) RETURNS helping_hand_user_status AS $$
-- Implementation
$$ LANGUAGE plpgsql;

-- Get suggestions with category info
CREATE OR REPLACE FUNCTION get_helping_hand_suggestions(
  p_user_id UUID,
  p_week_start_date DATE,
  p_category_id UUID DEFAULT NULL
) RETURNS SETOF helping_hand_suggestions AS $$
-- Implementation with JOIN to categories
$$ LANGUAGE plpgsql;

-- Get suggestion count by category
CREATE OR REPLACE FUNCTION get_helping_hand_category_counts(
  p_user_id UUID,
  p_week_start_date DATE
) RETURNS TABLE(category_id UUID, count BIGINT) AS $$
-- Implementation
$$ LANGUAGE plpgsql;
```

---

## Success Metrics

Track these metrics to measure feature success:

1. **Engagement Metrics**
   - % users who complete weekly assessment
   - Average suggestions selected per week
   - Completion rate of selected suggestions

2. **Quality Metrics**
   - User feedback distribution (helpful/not helpful)
   - AI confidence scores vs. actual completion
   - Category popularity

3. **Relationship Impact**
   - Correlation with relationship satisfaction scores
   - Increase in daily check-in completion
   - Partner reported feeling more supported

---

## Technical Considerations

### 1. Performance
- Cache AI-generated suggestions for the week
- Use React Query for automatic caching and refetching
- Debounce status updates (save after 1s of no changes)
- Lazy load suggestion details

### 2. Privacy
- Partner hints are encrypted at rest
- Never show raw hints to receiving partner (only AI-translated)
- Allow users to delete their status/suggestions anytime
- Respect partner's privacy settings

### 3. Offline Support
- Use Capacitor Preferences to cache latest suggestions
- Allow marking suggestions complete offline
- Sync when connection restored

### 4. Accessibility
- All interactive elements keyboard navigable
- Proper ARIA labels on all components
- Screen reader friendly descriptions
- Color contrast meets WCAG AA standards

---

## Next Steps

1. ✅ Create database tables in Supabase
2. ✅ Generate TypeScript types from schema
3. ✅ Build core services (helpingHandService, aiHelpingHandService)
4. ✅ Create UI components following existing patterns
5. ✅ Integrate with notification system
6. ✅ Add navigation and entry points
7. ✅ Test end-to-end flow
8. ✅ Collect user feedback and iterate

---

## Open Questions

1. Should partner hints be bidirectional (both can hint about each other)?
   - **Recommendation: Yes** - Creates symmetry and mutual support

2. What happens if partner doesn't fill out their weekly status?
   - **Fallback: Use previous week's data + onboarding data**
   - Show message: "We're using [Partner]'s info from last week"

3. Should we allow users to add their own custom suggestions?
   - **Phase 2 feature** - Start with AI-generated, add custom later

4. How to handle long-distance relationships differently?
   - **Filter suggestions by feasibility**
   - Show more digital connection options (messages, calls, gifts)
   - Highlight planning ahead category

5. Should reminders integrate with device calendar?
   - **Yes, optional** - Use Capacitor Calendar plugin
   - Allow adding to calendar when setting reminder

---

This design provides a comprehensive foundation for building the Helping Hand feature while maintaining consistency with the existing codebase architecture.
