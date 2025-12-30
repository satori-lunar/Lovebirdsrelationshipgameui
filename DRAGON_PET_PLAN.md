# Virtual Dragon Pet System - Implementation Plan

## Overview
Each user in a couple gets their own virtual dragon pet that grows through relationship activities. Dragons evolve through 5 stages and have stats/inventory systems. Partners can interact with each other's dragons.

**Critical Design Requirement**: Dragons must look like actual dragons (not baby chicks or other animals) - featuring wings, scales, horns, and traditional dragon characteristics at each evolution stage.

---

## 1. Database Schema Design

### Table: `dragons`
Stores each user's dragon state and stats.

```sql
CREATE TABLE IF NOT EXISTS public.dragons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Dragon',
  stage TEXT NOT NULL DEFAULT 'egg' CHECK (stage IN ('egg', 'hatchling', 'young', 'teen', 'adult')),

  -- Experience and leveling
  experience INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,

  -- Stats (0-100)
  hunger INTEGER NOT NULL DEFAULT 100 CHECK (hunger >= 0 AND hunger <= 100),
  happiness INTEGER NOT NULL DEFAULT 100 CHECK (happiness >= 0 AND happiness <= 100),
  health INTEGER NOT NULL DEFAULT 100 CHECK (health >= 0 AND health <= 100),
  bond_level INTEGER NOT NULL DEFAULT 0 CHECK (bond_level >= 0 AND bond_level <= 100),

  -- Customization
  color TEXT NOT NULL DEFAULT 'purple',
  accessories JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_fed_at TIMESTAMPTZ,
  last_played_at TIMESTAMPTZ,

  -- Evolution tracking
  evolved_to_hatchling_at TIMESTAMPTZ,
  evolved_to_young_at TIMESTAMPTZ,
  evolved_to_teen_at TIMESTAMPTZ,
  evolved_to_adult_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dragons_user ON public.dragons(user_id);
```

### Table: `dragon_items`
User inventory for dragon items.

```sql
CREATE TABLE IF NOT EXISTS public.dragon_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('food', 'treat', 'toy', 'accessory')),
  item_id TEXT NOT NULL, -- e.g., 'apple', 'cake', 'ball', 'crown'
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_dragon_items_user ON public.dragon_items(user_id, item_type);
```

### Table: `dragon_activity_log`
Tracks activities to prevent duplicate XP rewards.

```sql
CREATE TABLE IF NOT EXISTS public.dragon_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'daily_question', 'message_sent', 'request_completed', etc.
  activity_id TEXT NOT NULL, -- ID of the specific activity
  xp_awarded INTEGER NOT NULL,
  items_awarded JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, activity_type, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_dragon_activity_user ON public.dragon_activity_log(user_id, created_at DESC);
```

### Table: `dragon_interactions`
Tracks partner dragon interactions.

```sql
CREATE TABLE IF NOT EXISTS public.dragon_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('gift', 'play_date', 'dragon_date', 'play_fight')),
  gift_item_id TEXT, -- if interaction_type is 'gift'
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT different_users_dragon CHECK (from_user_id != to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_dragon_interactions_to ON public.dragon_interactions(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dragon_interactions_from ON public.dragon_interactions(from_user_id, created_at DESC);
```

---

## 2. RLS Policies

```sql
-- Dragons: Users can only see and manage their own dragon and their partner's dragon
ALTER TABLE public.dragons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their dragon and partner's dragon" ON public.dragons;
CREATE POLICY "Users can view their dragon and partner's dragon" ON public.dragons
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE (r.partner_a_id = auth.uid() AND r.partner_b_id = user_id)
         OR (r.partner_b_id = auth.uid() AND r.partner_a_id = user_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage their own dragon" ON public.dragons;
CREATE POLICY "Users can manage their own dragon" ON public.dragons
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Dragon items: Users can only manage their own items
ALTER TABLE public.dragon_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their items" ON public.dragon_items;
CREATE POLICY "Users can manage their items" ON public.dragon_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Activity log: Users can only view their own logs
ALTER TABLE public.dragon_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their activity log" ON public.dragon_activity_log;
CREATE POLICY "Users can view their activity log" ON public.dragon_activity_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their activity log" ON public.dragon_activity_log;
CREATE POLICY "Users can insert their activity log" ON public.dragon_activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Dragon interactions: Users can see interactions they sent or received
ALTER TABLE public.dragon_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their interactions" ON public.dragon_interactions;
CREATE POLICY "Users can view their interactions" ON public.dragon_interactions
  FOR SELECT USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

DROP POLICY IF EXISTS "Users can create interactions" ON public.dragon_interactions;
CREATE POLICY "Users can create interactions" ON public.dragon_interactions
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);
```

---

## 3. XP System Design

### XP Requirements for Evolution
- **Egg → Hatchling**: 100 XP
- **Hatchling → Young**: 300 XP (total 400 XP)
- **Young → Teen**: 600 XP (total 1000 XP)
- **Teen → Adult**: 1000 XP (total 2000 XP)

### Activity XP Rewards

| Activity | XP Reward | Item Reward |
|----------|-----------|-------------|
| Answer daily question | 10 XP | - |
| Submit guess for partner | 15 XP | - |
| Send love message | 5 XP | - |
| Send partner request | 5 XP | - |
| Complete partner request | 20 XP | Random treat (20% chance) |
| Save date suggestion | 5 XP | - |
| Complete date | 30 XP | Party treat |
| Save gift idea | 5 XP | - |
| Complete gift | 25 XP | Random toy (30% chance) |
| Save memory | 15 XP | Camera accessory (on 5th memory) |
| Save partner insight | 10 XP | - |
| Plan surprise | 15 XP | - |
| Complete surprise | 35 XP | Special treat |
| Send dragon gift | 5 XP | - |
| Play with dragon | 3 XP | - (increases happiness) |
| Feed dragon | 2 XP | - (restores hunger) |

### Stat Decay System
- **Hunger**: Decreases by 1 every 2 hours
- **Happiness**: Decreases by 1 every 3 hours
- **Health**: Tied to hunger/happiness (if either below 20, health decreases by 1/hour)
- **Bond Level**: Increases with XP, never decreases

### Item System

**Food Items** (restore hunger):
- Apple (+10 hunger, common - from requests)
- Cake (+20 hunger, uncommon - from completed dates)
- Feast (+40 hunger, rare - from surprises)

**Treat Items** (restore happiness):
- Cookie (+10 happiness, common)
- Ice Cream (+15 happiness, uncommon)
- Party Cake (+30 happiness, rare)

**Toy Items** (increase bond, restore happiness):
- Ball (+5 bond, +10 happiness)
- Puzzle (+10 bond, +15 happiness)
- Dragon Toy (+15 bond, +20 happiness)

**Accessory Items** (cosmetic only):
- Crown, Bow, Necklace, Wings decoration, etc.

---

## 4. Service Layer Design

### `dragonService.ts`
Core CRUD operations for dragons.

```typescript
// Core dragon operations
- createDragon(userId: string): Promise<Dragon>
- getDragon(userId: string): Promise<Dragon | null>
- updateDragon(userId: string, updates: Partial<Dragon>): Promise<Dragon>
- getDragonStats(userId: string): Promise<DragonStats>
- getPartnerDragon(partnerId: string): Promise<Dragon | null>

// Item management
- getInventory(userId: string): Promise<DragonItem[]>
- addItem(userId: string, itemId: string, quantity: number): Promise<void>
- useItem(userId: string, itemId: string): Promise<{ dragon: Dragon, itemEffect: string }>
- hasItem(userId: string, itemId: string): Promise<boolean>

// Activity tracking
- logActivity(userId: string, activityType: string, activityId: string, xpAwarded: number, itemsAwarded?: ItemReward[]): Promise<void>
- hasLoggedActivity(userId: string, activityType: string, activityId: string): Promise<boolean>

// Interactions
- sendGiftToDragon(fromUserId: string, toUserId: string, itemId: string, message?: string): Promise<void>
- getReceivedInteractions(userId: string): Promise<DragonInteraction[]>
- getSentInteractions(userId: string): Promise<DragonInteraction[]>
```

### `dragonGameLogic.ts`
Game mechanics and calculations.

```typescript
// XP and leveling
- awardXP(userId: string, xp: number, source: string): Promise<{ dragon: Dragon, leveledUp: boolean, evolved: boolean, newStage?: string }>
- calculateXPForNextStage(currentStage: string, currentXP: number): { required: number, progress: number }
- checkAndTriggerEvolution(dragon: Dragon): Promise<{ evolved: boolean, newStage?: string }>

// Stat management
- updateStats(userId: string): Promise<Dragon> // Called periodically to apply decay
- feedDragon(userId: string, foodItemId: string): Promise<Dragon>
- playWithDragon(userId: string, toyItemId?: string): Promise<Dragon>
- calculateStatDecay(lastUpdated: Date): { hungerLoss: number, happinessLoss: number, healthLoss: number }

// Item effects
- applyItemEffect(dragon: Dragon, itemId: string): { hunger?: number, happiness?: number, bond?: number, health?: number }
- getItemDefinition(itemId: string): ItemDefinition
- getRandomItemReward(activityType: string): ItemReward | null

// Integration helper
- awardActivityCompletion(userId: string, activityType: string, activityId: string): Promise<ActivityReward>
```

---

## 5. Integration Points

### A. DailyQuestion Component (`/src/app/components/DailyQuestion.tsx`)

**Line 125-130** - After answer submission:
```typescript
await saveAnswer({ answerText: answerText.trim() });
// ADD: Award XP for answering
await dragonGameLogic.awardActivityCompletion(
  user.id,
  'daily_question_answer',
  question.id
);
setStage('guess');
toast.success('Answer saved!');
```

**Line 142-148** - After guess submission:
```typescript
await saveGuess({ guessText: guessText.trim() });
// ADD: Award XP for guessing
await dragonGameLogic.awardActivityCompletion(
  user.id,
  'daily_question_guess',
  question.id
);
```

### B. LoveMessages Component (`/src/app/components/LoveMessages.tsx`)

**Line 123-128** - After message sent:
```typescript
onSuccess: async () => {
  queryClient.invalidateQueries({ queryKey: ['messages'] });
  setMessageText('');
  setSelectedType('custom');
  // ADD: Award XP
  await dragonGameLogic.awardActivityCompletion(
    user.id,
    'message_sent',
    Date.now().toString() // Unique ID per send
  );
  toast.success('Message sent! 💌');
},
```

### C. PartnerRequests Component (`/src/app/components/PartnerRequests.tsx`)

**Line 107-112** - After request sent:
```typescript
onSuccess: async () => {
  queryClient.invalidateQueries({ queryKey: ['requests'] });
  // ADD: Award XP
  await dragonGameLogic.awardActivityCompletion(
    user.id,
    'request_sent',
    Date.now().toString()
  );
  setSelectedType(null);
  setRequestMessage('');
  toast.success('Request sent! 💝');
},
```

**Line 132-134** - After request status updated:
```typescript
onSuccess: async (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ['requests', 'received'] });
  // ADD: Award XP if completed
  if (variables.status === 'completed') {
    await dragonGameLogic.awardActivityCompletion(
      user.id,
      'request_completed',
      variables.requestId
    );
  }
},
```

### D. DatePlanner & GiftGuidance Components

Both use `useSuggestions` hook. Need to modify the hook:

**File**: `/src/app/hooks/useSuggestions.ts`

In `markAsCompleted` mutation's onSuccess:
```typescript
onSuccess: async (_, suggestionId) => {
  queryClient.invalidateQueries({ queryKey: ['suggestions'] });
  // ADD: Award XP based on category
  const suggestion = suggestions.find(s => s.id === suggestionId);
  if (suggestion) {
    const activityType = suggestion.suggestion_type === 'date'
      ? 'date_completed'
      : 'gift_completed';
    await dragonGameLogic.awardActivityCompletion(
      user.id,
      activityType,
      suggestionId
    );
  }
  toast.success('Marked as completed!');
},
```

### E. Memories Component

In `memoryService.createMemory` or in the component after successful create.

### F. Partner Insights

In `usePartnerInsights` hook after successful save.

### G. Surprise Vault

Need to check this component and add XP on surprise completion.

---

## 6. Component Architecture

### Main Components

1. **`DragonPet.tsx`** (Main container)
   - Tabs: My Dragon | Partner's Dragon | Interactions
   - Shows dragon visualization, stats, quick actions

2. **`DragonView.tsx`** (Dragon visualization)
   - SVG-based dragon display
   - Different visuals for each stage
   - Animations for idle, happy, hungry states
   - Shows accessories/customization

3. **`DragonStats.tsx`** (Stats display)
   - Progress bars for hunger, happiness, health, bond
   - XP progress bar with current level
   - Evolution stage indicator
   - Time until next stat decay

4. **`DragonInventory.tsx`** (Items management)
   - Grid of items with quantities
   - Filter by type (food, treats, toys, accessories)
   - Tap item to use on dragon
   - Visual feedback when item used

5. **`DragonCustomization.tsx`** (Appearance editor)
   - Color picker (10+ dragon colors)
   - Accessory selector
   - Name editor
   - Preview of changes

6. **`PartnerDragonView.tsx`** (View partner's dragon)
   - Read-only dragon visualization
   - Shows partner's dragon stats
   - Gift sending interface
   - Request play date button

7. **`DragonInteractions.tsx`** (Partner interactions)
   - Send gift to partner's dragon
   - Request play date
   - View interaction history
   - Dragon vs dragon mini-games

8. **`DragonActivityFeed.tsx`** (Recent activities)
   - List of recent XP gains
   - Evolution milestones
   - Received gifts from partner

### Supporting Components

9. **`DragonEvolutionAnimation.tsx`**
   - Full-screen animation when dragon evolves
   - Shows transformation from old stage to new

10. **`DragonNotification.tsx`**
    - Badge/indicator on Home screen
    - Shows when dragon is hungry/unhappy
    - Shows when partner sent gift

---

## 7. Visual Design - Dragon Stages

### Critical Requirements
- All dragons must have DRAGON characteristics: wings, scales, tail, horns/spikes
- NO bird-like features, NO baby chick appearance
- Use SVG for scalability and customization
- Consistent color theming across stages

### Stage Designs

**Egg (0-100 XP)**
- Large dragon egg with scale texture
- Glowing cracks appear as XP increases
- Color customization applies to egg shell
- Subtle pulsing animation

**Hatchling (100-400 XP)**
- Small dragon just hatched
- Small wings (folded)
- Tiny horns/spikes on head
- Long tail with spikes
- Big eyes, quadrupedal stance
- Size: ~30% of adult

**Young Dragon (400-1000 XP)**
- Wings slightly larger, can flutter but not fly
- More pronounced horns and scales
- More athletic build
- Sits on hind legs sometimes
- Size: ~50% of adult

**Teen Dragon (1000-2000 XP)**
- Wings large enough to fly
- Prominent horns and scales
- Sleeker, more mature features
- Can stand bipedal or quadrupedal
- Fire breath visual effect appears
- Size: ~75% of adult

**Adult Dragon (2000+ XP)**
- Full wingspan, majestic pose
- Large horns, impressive scales
- Can have crown/accessories
- Powerful stance (often bipedal)
- Full fire breath animations
- Size: 100%

### Color Options
- Purple (default), Red, Blue, Green, Gold, Silver, Black, White, Pink, Teal

### Accessory Options
- Crown, Royal Cape, Necklace, Bracelet, Wing Ribbons, Tail Ring, Horn Decorations

---

## 8. Implementation Steps

### Phase 1: Database & Core Service (2-3 hours)
1. ✅ Create migration file `016_add_dragon_pet_system.sql`
2. ✅ Implement `dragonService.ts`
3. ✅ Implement `dragonGameLogic.ts`
4. ✅ Create custom hooks: `useDragon.ts`, `useDragonInventory.ts`
5. ✅ Test service layer with basic operations

### Phase 2: Dragon Visualization (3-4 hours)
1. ✅ Create SVG dragon components for each stage
2. ✅ Implement color customization
3. ✅ Add basic animations (idle, eating, happy)
4. ✅ Test responsive sizing
5. ✅ Ensure dragons look like ACTUAL DRAGONS

### Phase 3: Core Dragon UI (2-3 hours)
1. ✅ Build `DragonPet.tsx` container
2. ✅ Build `DragonView.tsx` with visualizations
3. ✅ Build `DragonStats.tsx` with progress bars
4. ✅ Build `DragonInventory.tsx` with item management
5. ✅ Add to Home screen navigation

### Phase 4: Game Mechanics (2-3 hours)
1. ✅ Implement XP awarding system
2. ✅ Implement stat decay system (background job or on-demand)
3. ✅ Implement item usage (feed, play, accessories)
4. ✅ Implement evolution triggers and animations
5. ✅ Test level progression

### Phase 5: Integration with Existing Features (2-3 hours)
1. ✅ Add XP awards to DailyQuestion
2. ✅ Add XP awards to LoveMessages
3. ✅ Add XP awards to PartnerRequests
4. ✅ Add XP awards to Date/Gift suggestions
5. ✅ Add XP awards to Memories
6. ✅ Add XP awards to Insights
7. ✅ Add XP awards to SurpriseVault
8. ✅ Test all integration points

### Phase 6: Partner Interactions (2-3 hours)
1. ✅ Build `PartnerDragonView.tsx`
2. ✅ Build `DragonInteractions.tsx`
3. ✅ Implement gift sending
4. ✅ Implement real-time updates for partner dragons
5. ✅ Test partner interaction flows

### Phase 7: Polish & Testing (1-2 hours)
1. ✅ Add DragonNotification to Home screen
2. ✅ Add evolution animation
3. ✅ Add activity feed
4. ✅ End-to-end testing
5. ✅ Performance optimization
6. ✅ Bug fixes

**Total Estimated Time: 14-21 hours**

---

## 9. Potential Challenges & Solutions

### Challenge 1: SVG Dragon Design
**Problem**: Creating authentic dragon visuals that scale across stages.
**Solution**:
- Use a modular SVG approach where body parts are separate components
- Scale parts proportionally for each stage
- Reference existing dragon art styles for inspiration
- Consider using a dragon SVG library or commissioning custom SVGs

### Challenge 2: Stat Decay Background Processing
**Problem**: Stats need to decay over time even when app is closed.
**Solution**:
- Calculate decay on-demand when dragon is loaded
- Use `last_updated_at` timestamp to calculate time elapsed
- Apply accumulated decay when user opens dragon view
- Option: Set up Supabase Edge Function to run hourly and update all dragons

### Challenge 3: Preventing Duplicate XP
**Problem**: User could repeatedly get XP for same activity.
**Solution**:
- Use `dragon_activity_log` table with UNIQUE constraint on (user_id, activity_type, activity_id)
- Always check if activity already logged before awarding XP
- For repeatable activities (like feeding), use timestamp-based IDs

### Challenge 4: Real-time Partner Dragon Updates
**Problem**: Partner's dragon should update in real-time when they interact.
**Solution**:
- Use Supabase real-time subscriptions on `dragons` table
- Filter by partner's user_id
- Invalidate queries when changes detected
- Similar pattern to existing `useUnreadMessages` hook

### Challenge 5: Performance with Many Items
**Problem**: Inventory could grow large over time.
**Solution**:
- Items are grouped by item_id with quantities
- Index on user_id for fast lookups
- Limit display to 50 items max (pagination or consolidation)

---

## 10. Success Criteria

✅ Each user can create and view their own dragon
✅ Dragons evolve through all 5 stages based on XP
✅ Dragons visually look like ACTUAL DRAGONS (not chicks or other animals)
✅ All existing features award appropriate XP
✅ Stat system works (hunger, happiness, health, bond)
✅ Item system works (food, treats, toys, accessories)
✅ Users can customize dragon (color, accessories, name)
✅ Users can view partner's dragon
✅ Users can send gifts to partner's dragon
✅ Real-time updates work for partner dragon changes
✅ Evolution animations play when dragon evolves
✅ No duplicate XP for same activities
✅ Stats decay appropriately over time
✅ Performance is good (no lag when loading dragon)

---

## 11. Future Enhancements (Out of Scope for V1)

- Dragon mini-games (play fights, races)
- Dragon achievements/badges
- Dragon leaderboard (among friends)
- Seasonal dragon skins
- Dragon breeding (when both partners reach adult)
- Dragon home customization
- More complex AI behaviors
- Dragon voice/sound effects
- Weekly dragon challenges
