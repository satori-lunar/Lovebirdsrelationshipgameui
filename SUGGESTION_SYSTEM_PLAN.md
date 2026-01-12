# Intelligent Suggestion System - Implementation Plan

## Overview
Transform the detailed relationship needs data into personalized, contextual suggestions for partners using AI and smart pattern matching.

## Current State
- ✅ Detailed need data captured (8 fields of context)
- ✅ Basic random suggestion system
- ❌ No contextual matching
- ❌ No personalization based on input

## Proposed Solution: Hybrid AI + Rule-Based System

### Architecture

```
User Input (Detailed Need Data)
    ↓
Suggestion Generator Service
    ↓
├─→ AI Generation (if API available)
│   - Uses GPT-4/Claude to generate 5-10 personalized suggestions
│   - Considers all context: wishes, duration, communication history, impact
│   - Stores in database for reuse
│
└─→ Smart Rule-Based (fallback/default)
    - Pattern matching on keywords
    - Intensity-based filtering
    - Duration-based prioritization
    - Communication-aware suggestions
    ↓
Suggestion Storage (partner_suggestions table)
    ↓
Gradual Delivery System
    - One suggestion every 2-3 days
    - Progressive difficulty/directness
    - Track completion/dismissal
```

## Database Schema Updates

### Option 1: Add AI-generated suggestions column
```sql
ALTER TABLE partner_suggestions
  ADD COLUMN generation_method TEXT DEFAULT 'rule_based'
    CHECK (generation_method IN ('ai_generated', 'rule_based', 'hybrid')),
  ADD COLUMN context_keywords TEXT[], -- For matching
  ADD COLUMN suggestion_priority INTEGER DEFAULT 5, -- 1-10 scale
  ADD COLUMN is_direct_action BOOLEAN DEFAULT false; -- vs indirect nudge
```

### Option 2: Create suggestion templates with smart matching
```sql
CREATE TABLE suggestion_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  need_type TEXT NOT NULL,
  template_text TEXT NOT NULL,
  keywords TEXT[], -- Match against user input
  min_duration TEXT, -- When this becomes relevant
  requires_prior_conversation BOOLEAN DEFAULT false,
  intensity_match TEXT[], -- Which intensities this works for
  directness_level INTEGER DEFAULT 5, -- 1-10, how direct
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Smart Matching Algorithm

### Phase 1: Context Analysis
Analyze user input to extract:
1. **Action Keywords**: What they want partner to do
   - "initiate", "spend time", "listen", "help", "notice"
2. **Emotional Keywords**: How it affects them
   - "lonely", "unappreciated", "disconnected", "frustrated"
3. **Frequency Keywords**: Ideal outcome patterns
   - "daily", "weekly", "regularly", "more often"
4. **Communication Status**: Talked about it or not

### Phase 2: Suggestion Matching
Score suggestions based on:
- Keyword overlap (30%)
- Duration appropriateness (20%)
- Communication awareness (20%)
- Intensity match (15%)
- Directness level (15%)

### Phase 3: Progressive Delivery
Week 1: Gentle, indirect suggestions
Week 2-3: More specific, actionable suggestions
Week 4+: Direct, clear suggestions (if issue persists)

## Implementation Files

### 1. Service Layer
`src/app/services/suggestionGeneratorService.ts`
- analyzeNeedContext(need) -> keywords, patterns
- generateAISuggestions(need) -> suggestions[]
- generateRuleBasedSuggestions(need) -> suggestions[]
- rankAndPrioritizeSuggestions(suggestions, context) -> ranked[]

### 2. AI Integration (Optional)
`src/app/services/aiSuggestionService.ts`
- Integration with OpenAI/Anthropic API
- Prompt engineering for suggestion generation
- Cost management and caching

### 3. Enhanced Database Function
Update `create_partner_suggestions()` to:
- Call suggestion generator service
- Store AI vs rule-based metadata
- Implement progressive delivery logic

## Suggestion Quality Framework

### Good Suggestion Criteria:
✅ Actionable (partner can do it today)
✅ Specific (not vague)
✅ Contextual (matches the actual need)
✅ Progressive (appropriate for timeline)
✅ Respectful (doesn't blame or judge)
✅ Achievable (realistic for most people)

### Example Progression:

**User Input**:
- Need: Quality Time
- Wish would do: "Spend evenings together without phones"
- Wish understood: "That phone time makes me feel unimportant"
- Duration: Several months
- Talked about it: Yes, but nothing changed
- Impact: "Feel lonely and disconnected"

**AI/Smart Generated Suggestions**:
1. Week 1 (Gentle): "Suggest having dinner together tonight"
2. Week 1 (Indirect): "Invite your partner to do an activity together"
3. Week 2 (Specific): "Propose a phone-free dinner rule for just one meal"
4. Week 2 (Action): "Create a cozy space for evening conversations"
5. Week 3 (Direct): "Express how much you value your evening time together"
6. Week 3 (Clear): "Ask about setting aside 30 minutes of daily phone-free time"
7. Week 4 (Explicit): "Have a gentle conversation about device boundaries"
8. Week 4+ (Last resort): "Suggest revisiting the conversation about quality time together"

## Cost Considerations

### AI-Powered (OpenAI GPT-4):
- ~$0.01-0.03 per need (generates 8-10 suggestions)
- 1000 needs/month = $10-30
- One-time generation, cached forever

### Rule-Based (Free):
- No API costs
- Requires manual curation of templates
- Less personalized but still contextual

### Hybrid Recommendation:
- Start with rule-based for all users
- Add AI generation for premium users
- Or: AI for high-intensity needs only

## Privacy & Ethics

### What Partners See:
✅ Helpful, actionable suggestions
❌ Never see the raw input
❌ Never see the specific analysis
❌ Never know what triggered it

### What We Store:
✅ Raw need data (encrypted)
✅ Generated suggestions
✅ Delivery timestamps
✅ Completion/dismissal data
❌ Don't store PII beyond what's needed

## Next Steps

1. **Immediate (Rule-Based)**:
   - Create suggestion template database
   - Implement keyword matching
   - Add context-aware filtering
   - Deploy smart suggestion selector

2. **Phase 2 (AI Integration)**:
   - Add OpenAI/Anthropic integration
   - Build prompt templates
   - Implement caching strategy
   - A/B test AI vs rule-based

3. **Phase 3 (Optimization)**:
   - Track suggestion effectiveness
   - Learn from completion rates
   - Refine matching algorithm
   - Add user feedback loop

## Success Metrics

- **Relevance Score**: How well suggestions match need context
- **Completion Rate**: % of suggestions marked as "I'll do this"
- **Time to Resolution**: How long until need is marked resolved
- **Partner Satisfaction**: Indirect measure via relationship health
- **Dismissal Rate**: % of suggestions dismissed (want <30%)

## Technical Dependencies

### Required:
- Existing database (PostgreSQL)
- Existing relationship_needs table ✅
- Existing partner_suggestions table ✅

### Optional:
- OpenAI API key (for AI generation)
- Background job system (for scheduled generation)
- Analytics system (for tracking metrics)

## Example: AI Prompt Template

```
You are a relationship counselor helping generate subtle suggestions for a partner.

Context:
- The other partner feels: [need_type]
- What they wish you'd do: [wish_partner_would_do]
- What they wish you understood: [wish_partner_understood]
- How long: [duration_of_issue]
- Have they talked to you: [have_talked_about_it]
- How it affects them: [how_it_affects_me]
- Ideal outcome: [ideal_outcome]

Generate 8-10 actionable suggestions that:
1. Are specific and achievable today
2. Don't reveal you were prompted
3. Progress from gentle to more direct
4. Respect both partners' autonomy
5. Focus on positive actions (not "stop doing")

Format: Simple action statements starting with verbs.
```

## Rollout Plan

### Week 1: Database + Basic Smart Matching
- Add new columns
- Implement keyword extraction
- Create 50-100 template suggestions
- Deploy smart selector

### Week 2: Enhanced Matching
- Add intensity-based filtering
- Implement duration-aware suggestions
- Add communication-aware logic
- Test with real data

### Week 3: AI Integration (Optional)
- Add API integration
- Test prompt engineering
- Implement caching
- A/B test results

### Week 4: Optimization
- Analyze effectiveness
- Refine algorithms
- Add feedback mechanisms
- Scale to all users

---

**Status**: Ready for implementation
**Priority**: High - Core feature enhancement
**Complexity**: Medium (rule-based) / High (AI-powered)
**Impact**: High - Significantly improves feature value
