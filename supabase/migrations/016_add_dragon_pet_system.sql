-- Add virtual dragon pet system
-- Each user gets their own dragon that grows through relationship activities

-- Dragons table - stores each user's dragon state and stats
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
  health INTEGER NOT NULL DEFAULT 100 CHECK (health >= 0 AND hunger <= 100),
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

-- Dragon items table - user inventory for dragon items
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

-- Dragon activity log - tracks activities to prevent duplicate XP rewards
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

-- Dragon interactions - tracks partner dragon interactions
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dragons_user ON public.dragons(user_id);
CREATE INDEX IF NOT EXISTS idx_dragon_items_user ON public.dragon_items(user_id, item_type);
CREATE INDEX IF NOT EXISTS idx_dragon_activity_user ON public.dragon_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dragon_interactions_to ON public.dragon_interactions(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dragon_interactions_from ON public.dragon_interactions(from_user_id, created_at DESC);

-- Trigger for dragons updated_at
DROP TRIGGER IF EXISTS update_dragons_updated_at ON public.dragons;
CREATE TRIGGER update_dragons_updated_at
  BEFORE UPDATE ON public.dragons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for dragon_items updated_at
DROP TRIGGER IF EXISTS update_dragon_items_updated_at ON public.dragon_items;
CREATE TRIGGER update_dragon_items_updated_at
  BEFORE UPDATE ON public.dragon_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies

-- Dragons: Users can view their own dragon and their partner's dragon
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

DROP POLICY IF EXISTS "Users can insert their own dragon" ON public.dragons;
CREATE POLICY "Users can insert their own dragon" ON public.dragons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own dragon" ON public.dragons;
CREATE POLICY "Users can update their own dragon" ON public.dragons
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own dragon" ON public.dragons;
CREATE POLICY "Users can delete their own dragon" ON public.dragons
  FOR DELETE USING (auth.uid() = user_id);

-- Dragon items: Users can only manage their own items
ALTER TABLE public.dragon_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their items" ON public.dragon_items;
CREATE POLICY "Users can view their items" ON public.dragon_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their items" ON public.dragon_items;
CREATE POLICY "Users can insert their items" ON public.dragon_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their items" ON public.dragon_items;
CREATE POLICY "Users can update their items" ON public.dragon_items
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their items" ON public.dragon_items;
CREATE POLICY "Users can delete their items" ON public.dragon_items
  FOR DELETE USING (auth.uid() = user_id);

-- Activity log: Users can only view and create their own logs
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

DROP POLICY IF EXISTS "Users can delete their interactions" ON public.dragon_interactions;
CREATE POLICY "Users can delete their interactions" ON public.dragon_interactions
  FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Comments
COMMENT ON TABLE public.dragons IS 'Virtual dragon pets that grow through relationship activities';
COMMENT ON TABLE public.dragon_items IS 'User inventory for dragon food, treats, toys, and accessories';
COMMENT ON TABLE public.dragon_activity_log IS 'Activity log to track XP rewards and prevent duplicates';
COMMENT ON TABLE public.dragon_interactions IS 'Partner interactions with each other''s dragons';
