# Relationship Modes & Long-Distance Features - Implementation Guide

## 🎯 Strategic Shift Complete

**From**: "An app for couples"
**To**: "An app for people who want to be more intentional in their relationship"

---

## ✅ What's Been Implemented

### 1. Relationship Mode Selection System

**Component**: `RelationshipModeSetup.tsx`

#### Three Modes:
1. **Shared Mode** - Both partners use app together
   - Shared calendar, dates, questions
   - Sync features enabled
   - Collaborative planning

2. **Solo Mode** - One partner using thoughtfully
   - No partner account needed
   - Personalized suggestions
   - Optional anonymous partner form
   - Framed as "being more intentional"

3. **Long-Distance Tag** - Combines with either mode
   - Virtual date ideas
   - Async activities
   - Weekly rhythm
   - Countdown features

#### Key Features:
- Visual mode selection with benefit lists
- Info dialog explaining solo mode
- "Most Flexible" badge on solo mode
- Clear, friendly language
- Long-distance toggle

---

### 2. Solo Mode Infrastructure

**Component**: `SoloModeSetup.tsx`

#### 3-Step Onboarding:

**Step 1: Partner Info**
- Partner's name & nickname
- Relationship start date
- Location for suggestions

**Step 2: Personalization**
- What they love (freeform)
- Love language preference
- Budget range

**Step 3: Confirmation**
- Summary of features
- Pro tip about partner form

#### Database Structure:
```json
{
  "relationship_mode": "solo",
  "is_long_distance": false,
  "partner1_email": "user@example.com",
  "partner2_email": null,  // No partner account
  "location": "San Francisco",
  "budget_preference": "moderate"
}
```

---

### 3. Anonymous Partner Insights Form

**Component**: `PartnerInsightsForm.tsx`

#### 4-Step "Fun Quiz":

**Step 1: Introduction**
- Name collection
- Friendly framing
- No app mention

**Step 2: Love Languages**
- Interactive 1-5 rating system
- 5 love language categories
- Beautiful visual design

**Step 3: Interests**
- Hobbies (comma-separated)
- Favorite foods
- Music preferences

**Step 4: Preferences**
- Ideal date ideas
- What makes them feel appreciated
- Submit button

#### Key Features:
- Accessible via unique token
- No account required
- No login needed
- Updates couple record automatically
- Success confirmation screen

#### Suggested Framing:
> "Hey! I found this fun relationship quiz. Want to take it?"

---

### 4. Partner Form Invite Card

**Component**: `PartnerFormInvite.tsx`

#### Shows When:
- `relationship_mode === 'solo'`
- `partner_form_completed === false`

#### Features:
- Share via native share API
- Copy link to clipboard
- Dialog explaining benefits
- Success state when completed

#### Benefits Explanation:
**What they'll do:**
- Answer 5 quick questions
- Share preferences
- No account needed

**What you'll get:**
- Date ideas they'll love
- Gift suggestions
- Personalized prompts

---

### 5. Long-Distance Weekly Rhythm

**Component**: `WeeklyRhythm.tsx`

#### Structured Weekly Schedule:

| Day | Activity | Purpose |
|-----|----------|---------|
| **Monday** | Intentional Question | Start week connected |
| **Tuesday** | Encouragement | Send love & support |
| **Wednesday** | Mid-Week Check-In | Share highs & lows |
| **Thursday** | Voice Note OR Photo | Creative connection |
| **Friday** | Virtual Date Planning | Weekend together |
| **Saturday** | Deep Question | Meaningful conversation |
| **Sunday** | Gratitude Prompt | Weekly appreciation |

#### Features:
- Auto-generates activities for the week
- Tracks completion for both partners
- Today's prompt displayed prominently
- Response dialog for submitting
- Beautiful colored icons per type
- Progress tracking

#### Activity Types:
```typescript
enum ActivityType {
  daily_question,
  encouragement,
  virtual_date,
  voice_note_prompt,
  photo_challenge,
  send_question,
  check_in
}
```

---

### 6. Async Date Ideas

**Component**: `AsyncDateIdeas.tsx`

#### 8 Creative Activities:

1. **Voice Note Exchange**
   - 5-minute voice notes about day/dreams
   - Prompts for meaningful conversation

2. **Photo Story Challenge**
   - Daily photo representing mood/place
   - Creative visual connection

3. **Question Exchange**
   - Deep questions throughout day
   - Answer when available

4. **Shared Playlist**
   - Collaborative music curation
   - Songs that remind you of each other

5. **Book/Article Exchange**
   - Share interesting reads
   - Discuss what resonated

6. **Daily Gratitude**
   - Evening appreciation messages
   - Focus on relationship positives

7. **Virtual Coffee Dates**
   - Async coffee date recordings
   - Week recap and sharing

8. **Surprise Package Planning**
   - Care package creation
   - Document the joy

#### Each Idea Includes:
- Title & description
- 4 specific prompts
- Beautiful icon
- Expandable details

---

### 7. Location-Based Date Suggestions

**Component**: `LocationDateSuggestions.tsx`

#### Intelligent Suggestion Engine:

**Input Factors:**
1. **Location** - User's city
2. **Weather** - Current conditions
3. **Interests** - Partner's hobbies
4. **Love Language** - Primary preference
5. **Budget** - User's budget preference

#### Weather-Aware Suggestions:

**Sunny Days:**
- Picnic in the park
- Outdoor photography walk
- Farmers market visit

**Cloudy Days:**
- Museum visit
- Bookstore browse
- Art gallery date

**Rainy Days:**
- Indoor rock climbing
- Cooking class
- Board game café

**Cold Weather:**
- Ice skating
- Wine tasting
- Hot chocolate & movie

#### Interest-Based Personalization:

```typescript
if (interests.includes('music')) {
  suggest('Live Music Night');
}

if (interests.includes('food')) {
  suggest('Cook New Recipe Together');
}

if (interests.includes('nature')) {
  suggest('Sunrise Hike');
}

if (interests.includes('art')) {
  suggest('Street Art Tour');
}
```

#### Love Language Alignment:

- **Quality Time** → Uninterrupted conversation dates
- **Receiving Gifts** → Create handmade gifts
- **Words of Affirmation** → Love letter exchange
- **Acts of Service** → Surprise breakfast prep
- **Physical Touch** → Partner dance class

#### Budget Filtering:
- **Low** (Under $20): Budget-friendly activities
- **Moderate** ($20-$75): Mid-range experiences
- **High** ($75+): Special occasions

---

## 📊 Database Schemas

### Updated: Couple
```json
{
  "relationship_mode": "shared | solo",
  "is_long_distance": boolean,
  "location": "city name",
  "partner2_location": "city (if long-distance)",
  "budget_preference": "low | moderate | high",
  "partner_form_token": "unique-token",
  "partner_form_completed": boolean,
  "partner_form_submitted_at": "datetime"
}
```

### Updated: PartnerProfile
```json
{
  "is_app_user": boolean,  // false for solo mode partners
  "user_email": "optional",
  "notes": "freeform text about partner",
  "interests": ["array", "of", "interests"],
  "love_language_primary": "enum",
  "love_language_scores": { ... }
}
```

### New: LongDistanceActivity
```json
{
  "couple_id": "string",
  "activity_type": "enum (9 types)",
  "scheduled_date": "date",
  "day_of_week": "enum",
  "title": "string",
  "prompt": "string",
  "partner1_completed": boolean,
  "partner2_completed": boolean,
  "partner1_response": "string",
  "partner2_response": "string",
  "is_recurring": boolean
}
```

### New: PartnerFormResponse
```json
{
  "couple_id": "string",
  "form_token": "unique-token",
  "display_name": "string",
  "love_languages": { ... },
  "hobbies": ["array"],
  "favorite_foods": ["array"],
  "music_preferences": ["array"],
  "preferred_dates": ["array"],
  "appreciation_methods": ["array"]
}
```

---

## 🎨 UX Language (Intentionality Framing)

### ✅ Use:
- "Solo Mode"
- "Intentional Partner Mode"
- "Thoughtful Planner"
- "Be more intentional in your relationship"
- "Get thoughtful suggestions"
- "Optional partner insights"

### ❌ Avoid:
- "Secret Mode"
- "Hidden Mode"
- "Without them knowing" (except in private info)
- Deceptive language

---

## 🔗 Integration Guide

### 1. Update Onboarding Flow

```typescript
// In main onboarding component
import RelationshipModeSetup from './RelationshipModeSetup';

// After feature slides:
const handleGetStarted = () => {
  navigate('/relationship-mode-setup');
};
```

### 2. Add Routes

```typescript
// App routing
<Route path="/relationship-mode-setup" element={<RelationshipModeSetup />} />
<Route path="/solo-mode-setup" element={<SoloModeSetup />} />
<Route path="/partner-insights-form" element={<PartnerInsightsForm />} />
```

### 3. Conditional Home Screen Components

```typescript
// In Home component
import PartnerFormInvite from './PartnerFormInvite';
import WeeklyRhythm from './WeeklyRhythm';
import AsyncDateIdeas from './AsyncDateIdeas';
import LocationDateSuggestions from './LocationDateSuggestions';

// Show based on mode
{couple.relationship_mode === 'solo' && !couple.partner_form_completed && (
  <PartnerFormInvite couple={couple} />
)}

{couple.is_long_distance && (
  <>
    <WeeklyRhythm couple={couple} user={user} />
    <AsyncDateIdeas />
  </>
)}

<LocationDateSuggestions couple={couple} partnerProfile={partnerProfile} />
```

### 4. Database Migration

```sql
-- Add to Couple table
ALTER TABLE couples ADD COLUMN relationship_mode VARCHAR(10);
ALTER TABLE couples ADD COLUMN is_long_distance BOOLEAN DEFAULT false;
ALTER TABLE couples ADD COLUMN location VARCHAR(255);
ALTER TABLE couples ADD COLUMN partner2_location VARCHAR(255);
ALTER TABLE couples ADD COLUMN budget_preference VARCHAR(10);
ALTER TABLE couples ADD COLUMN partner_form_token VARCHAR(50);
ALTER TABLE couples ADD COLUMN partner_form_completed BOOLEAN DEFAULT false;

-- Add to PartnerProfile table
ALTER TABLE partner_profiles ADD COLUMN is_app_user BOOLEAN DEFAULT true;
ALTER TABLE partner_profiles ADD COLUMN notes TEXT;

-- Create LongDistanceActivity table
CREATE TABLE long_distance_activities (
  id UUID PRIMARY KEY,
  couple_id UUID REFERENCES couples(id),
  activity_type VARCHAR(50),
  scheduled_date DATE,
  day_of_week VARCHAR(10),
  title VARCHAR(255),
  prompt TEXT,
  partner1_completed BOOLEAN DEFAULT false,
  partner2_completed BOOLEAN DEFAULT false,
  partner1_response TEXT,
  partner2_response TEXT,
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create PartnerFormResponse table
CREATE TABLE partner_form_responses (
  id UUID PRIMARY KEY,
  couple_id UUID REFERENCES couples(id),
  form_token VARCHAR(50) UNIQUE,
  display_name VARCHAR(255),
  love_languages JSONB,
  hobbies TEXT[],
  favorite_foods TEXT[],
  music_preferences TEXT[],
  preferred_dates TEXT[],
  appreciation_methods TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📱 User Journeys

### Solo Mode User
1. Chooses "I'm using this solo"
2. Completes 3-step partner info
3. Sees pro tip about partner form
4. Accesses home with personalized suggestions
5. *Optional*: Shares partner form (framed as fun quiz)
6. Partner fills quiz anonymously
7. User gets hyper-personalized date/gift ideas

### Shared Mode User
1. Chooses "We're using it together"
2. Both partners complete onboarding
3. Shared calendar and features
4. Sync daily questions and dates

### Long-Distance Couple (Either Mode)
1. Toggles "Long-distance" during setup
2. Gets weekly rhythm prompts
3. Access async date ideas
4. Location-aware suggestions for both cities

---

## 🚀 Next Steps

### To Activate These Features:

1. **Update Onboarding**
   - Replace current onboarding with `RelationshipModeSetup`
   - Add routing for new components

2. **Migrate Database**
   - Run SQL migrations for new fields
   - Create new tables

3. **Update Home Screen**
   - Add conditional rendering based on mode
   - Show `PartnerFormInvite` for solo mode
   - Show `WeeklyRhythm` for long-distance

4. **Test Flows**
   - Solo mode + partner form
   - Shared mode
   - Long-distance features
   - Location suggestions

5. **API Integrations** (Optional Future)
   - Weather API for real weather data
   - Yelp/Google Places for location suggestions
   - Distance calculation for long-distance

---

## 💡 Key Benefits

### Broader Market Appeal
- No longer requires both partners to buy in
- Works for any relationship configuration
- Removes biggest barrier to signup

### Better Personalization
- Weather-aware suggestions
- Interest-based dates
- Love language alignment
- Budget-conscious filtering

### Long-Distance Support
- Structured weekly rhythm
- Async activity ideas
- Cross-timezone compatibility
- Virtual date planning

### Solo Mode Value
- Get thoughtful without forcing partner into app
- Optional enhancement (partner form)
- Natural, non-deceptive framing
- Hyper-personalized suggestions

---

## 📈 Success Metrics

Track these to measure feature success:

- % of users choosing solo mode
- Partner form completion rate
- Long-distance toggle adoption
- Weekly rhythm engagement
- Location suggestion click-through
- Budget filter usage

---

**All changes committed to**: `claude/add-ios-widget-LkLz7`

**Ready for**: Integration testing, database migration, UI polish
