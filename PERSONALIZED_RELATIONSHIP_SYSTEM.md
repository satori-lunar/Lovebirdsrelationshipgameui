# Personalized Relationship Intelligence System

## 🎯 Core Philosophy

**Goal**: Users graduate after 6 months → **LIFETIME FREE ACCESS**

### Key Principles
- ✅ **Success = Needing the app LESS, not more**
- ✅ **Love them in the way THEY feel loved** (not generic advice)
- ✅ **Transparency** - Always show "why this suggestion"
- ✅ **Non-manipulative** - No guilt, shame, or pressure
- ✅ **Graduation model** - Celebrate independence as success

---

## 📦 What's Been Built (Complete System)

### **Phase 1: Partner Profile Engine** ✅

**Purpose**: Core personalization data structure that powers everything

**Files**:
- `src/app/types/partnerProfile.ts` - Type definitions
- `src/app/services/partnerProfileService.ts` - CRUD operations
- `src/app/components/PartnerProfileOnboarding.tsx` - Onboarding UI
- `supabase/migrations/021_add_partner_profiles.sql` - Database schema

**What It Stores**:
1. **Love Language** (Primary + Secondary)
   - Words of Affirmation
   - Quality Time
   - Receiving Gifts
   - Acts of Service
   - Physical Touch

2. **Communication Style**
   - Direct: "I need reassurance about us."
   - Gentle: "I could use some extra support right now."
   - Playful: "Missing my favorite person 💛"
   - Reserved: "Need you."

3. **Stress Needs** (What they need when overwhelmed)
   - Space (time alone)
   - Reassurance (affirmation)
   - Distraction (think about something else)
   - Practical Help (concrete action)

4. **Frequency Preference**
   - High Touch: Daily check-ins
   - Moderate: 3-4x/week (recommended starting point)
   - Low Touch: 1-2x/week

5. **Preferred Check-in Times**
   - Morning (6am-12pm)
   - Afternoon (12pm-5pm)
   - Evening (5pm-10pm)

6. **Custom Preferences** (User-taught rules)
   - Example: "I don't like advice when stressed"
   - Example: "I need affection even when I'm quiet"

7. **Learned Patterns** (System-observed behaviors)
   - Fastest response times
   - Most engaged features
   - Stress patterns by day of week

8. **Engagement Score** (0-100)
   - Tracks overall engagement
   - Adapts over time based on usage

---

### **Phase 2: AI Suggestion Engine** ✅

**Purpose**: Generate personalized message suggestions filtered through partner's profile

**Files**:
- `src/app/types/suggestions.ts` - Type system
- `src/app/services/suggestionTemplates.ts` - 80+ message templates
- `src/app/services/aiSuggestionService.ts` - Core AI logic

**How It Works**:
```
Input: User wants to express affection
Partner Profile: Quality Time + Gentle communication style
↓
AI Generates:
1. "Could we have some uninterrupted time to connect?" (Primary - matches profile)
2. "Would you be up for some intentional time together?" (Alternative - gentle)
3. "Stealing you for a bit later 😌" (Alternative - playful)
↓
Shows Reasoning: "Based on their love language (quality_time) and style (gentle)"
```

**Template System**:
- **5 Love Languages** × **4 Communication Styles** × **8 Suggestion Types**
- = 160+ unique message variations

**Suggestion Types**:
1. Reassurance - "I believe in you and what we have"
2. Affection - "I love you. You mean everything to me"
3. Quality Time - "Can we set aside real time just for us?"
4. Appreciation - "I really admire how you [specific thing]"
5. Support - "I'm here for you. What do you need?"
6. Celebration - "I'm so proud of you!"
7. Reconnection - "I miss us. Can we reconnect?"
8. Check-in - "How are you really doing?"

**Special Case: Space**
When partner needs space:
- Suggests: "Take all the time you need. I'm here when you're ready."
- Action: Don't send messages for 24-48h
- Safety note: Respect the boundary they set

---

### **Phase 3: Needs-Based Learning** ✅

**Purpose**: "What feels missing?" feature - routes needs through AI to partner

**Files**:
- `src/app/types/needs.ts` - Need categories and types
- `src/app/services/needsService.ts` - Need submission logic
- `src/app/components/SubmitNeedModal.tsx` - Beautiful 3-step wizard

**11 Need Categories**:
1. 💬 Communication - Not talking enough
2. 💛 Affection - Not feeling loved
3. ⏰ Quality Time - Not enough intentional connection
4. 🤗 Reassurance - Feeling insecure
5. 🫂 Support - Need encouragement
6. 🌙 Space - Need breathing room
7. ✨ Appreciation - Not feeling valued
8. 🤝 Understanding - Feeling misunderstood
9. 📅 Consistency - Need predictability
10. 🤗 Physical Intimacy - Missing closeness
11. 🎉 Fun - Missing playfulness

**User Flow**:
1. User clicks "What Feels Missing?" on Home
2. Selects category (e.g., "Reassurance")
3. Adds optional context (300 chars)
4. Sets urgency (not_urgent / would_help / important)
5. Submits
↓
6. AI processes through partner's profile
7. Partner receives personalized suggestion in their preferred tone
8. Shows reasoning so they understand why

**Example Translation**:
```
User submits: "Need reassurance"
Context: "Feeling a bit distant lately"
Urgency: Would Help

Partner Profile: Quality Time + Gentle style
↓
Partner receives:
Message: "Could we check in tonight? Want to make sure we're good."
Actions:
  - Schedule a video call to talk
  - Affirm the relationship
Reasoning: "They value quality time and prefer gentle communication.
           This addresses their need through what makes them feel loved."
```

---

### **Phase 4: Adaptive Frequency Intelligence** ✅

**Purpose**: Decide when to send prompts and when to back off

**Files**:
- `src/app/services/frequencyService.ts` - Frequency decision engine

**Decision Logic**:
```javascript
shouldSendCheckin(userId, promptType) {
  // 1. Check quiet mode
  if (quietModeActive) return false;

  // 2. Check time preferences
  if (!isPreferredTime) return false;

  // 3. Check weekly limits
  if (recentPrompts >= weeklyLimit) return false;

  // 4. Check independence score
  if (independenceScore > 75 && daysSinceLastPrompt < 3) {
    return false; // Give space to act naturally
  }

  // 5. Check engagement trend
  if (engagementDecreasing && daysSinceLastPrompt < 2) {
    return false; // Reduce pressure
  }

  return true;
}
```

**Progressive Reduction Schedule**:
- **Week 8-12**: high_touch → moderate (if 50+ independence)
- **Week 16-20**: moderate → low_touch (if 65+ independence)
- **Week 24+**: minimal prompts (if 75+ independence)

**Quiet Mode**:
- User-requested or system-detected
- Pauses all prompts except emergency messages
- Respects explicit boundaries

---

### **Phase 5: Graduation & Growth Metrics** ✅

**Purpose**: Track progress toward 6-month graduation and lifetime free access

**Files**:
- `src/app/services/graduationService.ts` - Graduation tracking
- `src/app/components/GraduationProgress.tsx` - Progress widget
- `supabase/migrations/022_add_graduation_system.sql` - Database schema

**8 Graduation Milestones (26 Weeks)**:

1. **Week 1: Getting Started**
   - Complete partner profile
   - Reward: Profile Badge

2. **Week 4: First Month**
   - One month of consistent engagement
   - Reward: First Month Badge

3. **Week 8: Building Independence**
   - 5+ spontaneous actions without prompts
   - Reward: Independence Badge

4. **Week 12: Quarter Year**
   - Three months of growth
   - Reward: Quarterly Badge + **50% reduced prompts**

5. **Week 16: Halfway There**
   - Independence score ≥ 60
   - Reward: Midway Badge

6. **Week 20: Advanced Communicators**
   - Suggestion acceptance < 40% (using app less!)
   - Reward: Master Badge

7. **Week 24: Almost Graduated**
   - Final weeks before lifetime access
   - Reward: **75% reduced prompts**

8. **Week 26: 🎓 GRADUATION**
   - Independence score ≥ 70
   - Demonstrating self-sufficiency
   - Reward: **🎉 LIFETIME FREE ACCESS + Graduation Certificate**

**Growth Metrics Tracked**:
- **Independence Score** (0-100): Based on spontaneous actions
- **Suggestion Dependency** (0-100): Lower = better (less reliant)
- **Spontaneous Actions**: Actions without app prompts
- **Needs Resolved Naturally**: Before partner saw suggestion
- **Conversation Quality**: Daily question completion rate
- **Response Speed**: Average hours to resolve needs
- **Trend Analysis**: Improving, stable, or declining

**Graduation Requirements**:
1. ✅ 26+ weeks (6 months) since profile creation
2. ✅ 70+ independence score
3. ✅ Demonstrating self-sufficiency (low suggestion dependency)

**Skill Progress Calculation** (0-100):
```
Independence score (40 points max)
+ Spontaneous actions ≥20 (20 points max)
+ Low suggestion dependency (20 points max)
+ Needs resolved without app (20 points max)
= Total Skill Score
```

**Graduation Progress** (0-100):
```
Time Progress (40%) + Skill Progress (60%) = Overall Progress
```

---

## 🗄️ Database Schema

### Migration 021: Partner Profiles
```sql
-- Core personalization data
partner_profiles (
  id, user_id, couple_id,
  love_language_primary, love_language_secondary,
  communication_style,
  stress_needs (JSONB array),
  frequency_preference,
  daily_checkins_enabled,
  preferred_checkin_times (TEXT array),
  custom_preferences (JSONB array),
  learned_patterns (JSONB),
  engagement_score (0-100)
)

-- User-submitted needs
relationship_needs (
  id, couple_id, requester_id, receiver_id,
  need_category, context, urgency,
  ai_suggestion (JSONB),
  status, created_at, resolved_at
)

-- Track suggestion usage
message_suggestions (
  id, sender_id, receiver_id,
  suggestion_type,
  generated_messages (JSONB),
  was_used, created_at
)

-- Behavioral learning
learning_events (
  id, user_id, event_type,
  context (JSONB),
  created_at
)

-- Pause prompts
quiet_mode (
  user_id, active, reason,
  activated_at, ends_at
)
```

### Migration 022: Graduation System
```sql
-- Graduation tracking
couple_graduations (
  couple_id (PK),
  graduated_at,
  lifetime_free_access (BOOLEAN),
  final_independence_score,
  weeks_to_graduate
)

-- Milestone achievements
user_achievements (
  id, user_id,
  milestone_week,
  milestone_title,
  achieved_at
)

-- Rewards & badges
user_rewards (
  id, user_id,
  reward_type (badge | feature_unlock | free_access),
  title, description,
  unlocked_at
)

-- Dashboard view
user_growth_metrics (VIEW)
```

**Helper Functions**:
- `has_lifetime_free_access(user_id)` → BOOLEAN
- `get_graduation_progress(user_id)` → INTEGER (0-100)
- `award_achievement(user_id, week, title)` → VOID
- `is_quiet_mode_active(user_id)` → BOOLEAN

---

## 🎨 UI Components Built

### 1. **PartnerProfileOnboarding** (`PartnerProfileOnboarding.tsx`)
**7-Step Wizard**:
- Welcome screen with educational context
- Love language selection (primary + secondary)
- Communication style selection
- Stress needs (multi-select)
- Frequency preference
- Check-in times (multi-select)
- Success celebration

**Features**:
- Beautiful animations with Framer Motion
- Floating heart backgrounds
- Progress indicator dots
- Back/Next navigation
- Form validation
- Educational examples at each step

### 2. **SubmitNeedModal** (`SubmitNeedModal.tsx`)
**3-Step Wizard**:
- Category selection (11 categories with icons)
- Optional context input (300 chars)
- Urgency selector (3 levels)

**Features**:
- Category cards with descriptions
- Real-time character count
- Success confirmation
- Auto-close after submission
- Error handling

### 3. **GraduationProgress** (`GraduationProgress.tsx`)
**Progress Widget**:
- Animated progress bar
- Color-coded by stage (rose → blue → green)
- Independence score display
- Spontaneous actions count
- Days until graduation
- Graduated state celebration

**Integration Point**: Add to Home screen

---

## 📊 Example User Journey

### **Week 1: Sarah & Mike Sign Up**
```
Sarah's Onboarding:
- Primary Love Language: Quality Time
- Secondary: Words of Affirmation
- Communication Style: Gentle
- Stress Needs: Space, Reassurance
- Frequency: Moderate (3-4x/week)
- Check-in Times: Evening

Mike's Onboarding:
- Primary Love Language: Acts of Service
- Secondary: Physical Touch
- Communication Style: Direct
- Stress Needs: Practical Help, Distraction
- Frequency: High Touch (daily)
- Check-in Times: Morning, Evening
```

### **Week 4: First Need Submission**
```
Sarah submits: "What feels missing?" → Affection
Context: "We haven't had a deep conversation in a while"
Urgency: Would Help
↓
Mike receives:
"Sarah could use some extra warmth from you right now."

Suggested Messages (based on Mike's direct style):
1. "Want to talk tonight? Just us, no distractions." ✅ (Mike sends this)
2. "I miss our deep conversations. Can we reconnect?"
3. "How about a real catch-up this weekend?"

Actions:
- Schedule a dedicated date (virtual or in-person)
- Give her your undivided attention

Reasoning: "Sarah values quality time and prefers gentle communication.
           These suggestions match how she feels most loved."
```

### **Week 12: Independence Growing**
```
Sarah's Metrics:
- Independence Score: 62
- Spontaneous Actions: 8
- Suggestion Acceptance: 55%

System adjusts:
- Reduces prompts from 4/week to 3/week
- Shows: "You're doing great on your own! 🌟"
```

### **Week 26: Graduation!**
```
Sarah's Final Metrics:
- Independence Score: 78
- Spontaneous Actions: 25
- Suggestion Acceptance: 28%
- Needs Resolved Naturally: 70%

🎓 GRADUATED!
→ Lifetime free access unlocked
→ "You've learned to love each other well. The app is yours forever."

Future Use:
- Anniversary planning
- Special date ideas
- Occasional check-ins
- Milestone celebrations
```

---

## 🚀 Integration Steps

### 1. **Run Migrations**
```sql
-- In Supabase SQL Editor
-- Run migration 021_add_partner_profiles.sql
-- Run migration 022_add_graduation_system.sql
```

### 2. **Add to App Flow**
```typescript
// After initial onboarding, show PartnerProfileOnboarding
if (!userHasProfile) {
  return (
    <PartnerProfileOnboarding
      userId={user.id}
      coupleId={couple.id}
      partnerName={partnerName}
      onComplete={() => navigate('home')}
    />
  );
}
```

### 3. **Add Graduation Widget to Home**
```typescript
// In Home.tsx, after Partner Capacity card
{relationship?.partner_b_id && user && (
  <GraduationProgress
    userId={user.id}
    coupleId={relationship.id}
    onViewDetails={() => onNavigate('graduation-dashboard')}
  />
)}
```

### 4. **Test the Flow**
1. New user signs up
2. Completes partner profile onboarding
3. Sees graduation progress (0% → Week 1)
4. Submits a need via "What Feels Missing?"
5. Partner receives AI-generated suggestion
6. System tracks engagement over 26 weeks
7. Graduates after 6 months → Lifetime free access

---

## 💡 Business Model

### **Free During Learning (6 Months)**
- Users pay nothing for first 6 months
- Full access to all features
- Learning period with active support

### **Graduate → Free for Life**
If users demonstrate independence:
- ✅ 26+ weeks of use
- ✅ 70+ independence score
- ✅ Low suggestion dependency
→ **LIFETIME FREE ACCESS**

### **Continue Using After Graduation**
- Anniversary planning
- Special date ideas
- Occasional check-ins
- Milestone celebrations
- No daily prompts (they don't need them anymore!)

### **Ethical Growth Model**
- Success = needing app LESS
- Celebrate independence
- No manipulation tactics
- Transparent about graduation
- "You've learned to love well - keep the app forever"

---

## 🎯 What Makes This Different

### **Other Apps**:
❌ Maximize engagement (keep users hooked)
❌ Generic advice ("send flowers")
❌ One-size-fits-all suggestions
❌ Never reduce prompts

### **This App**:
✅ Minimize dependency (teach independence)
✅ Personalized to partner's profile
✅ Filtered through love language + communication style
✅ **Reduces prompts over time**
✅ **Celebrates when users need it less**
✅ **Free for life after graduation**

**Core Message**:
> "We're not here to make you dependent. We're here to teach you to love each other so well that you don't need us anymore. And when you get there, the app is yours forever."

---

## 📝 Remaining TODOs

### **Optional Enhancements**:
1. ✅ ~~Enhanced onboarding~~ (DONE)
2. ✅ ~~"What feels missing?" modal~~ (DONE)
3. ✅ ~~Graduation progress widget~~ (DONE)
4. Message suggestion panel in Messages view
5. Full graduation dashboard page
6. Graduation celebration modal (confetti!)
7. Partner profile settings page (edit preferences)
8. "Teach the system" quick inputs
9. Pending needs view (show what partner needs)
10. Weekly reflection prompts

### **Already Complete**:
- ✅ Partner profile type system
- ✅ AI suggestion engine with 80+ templates
- ✅ Needs submission and routing
- ✅ Frequency service (adaptive check-ins)
- ✅ Graduation tracking and metrics
- ✅ Database migrations (021, 022)
- ✅ Beautiful onboarding flow
- ✅ "What feels missing?" UI
- ✅ Graduation progress widget

---

## 🎉 Ready to Launch

The **core system is complete and ready**:
- ✅ Partner profiles collected via onboarding
- ✅ AI suggestions personalized by love language
- ✅ Needs routing through partner profiles
- ✅ Frequency adapting to engagement
- ✅ Graduation tracking toward 6-month goal
- ✅ Database schema ready (2 migrations)
- ✅ Beautiful UI components built

**Next Steps**: Run migrations, integrate into app flow, test the graduation journey!
