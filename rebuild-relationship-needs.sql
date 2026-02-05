-- COMPLETE REBUILD: Relationship Needs Feature
-- This will completely drop and recreate everything
-- Safe to run multiple times

-- ============================================
-- STEP 1: CLEAN UP EVERYTHING
-- ============================================

-- Drop function first (it depends on tables)
DROP FUNCTION IF EXISTS public.create_partner_suggestions() CASCADE;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.partner_suggestions CASCADE;
DROP TABLE IF EXISTS public.relationship_needs CASCADE;

-- ============================================
-- STEP 2: CREATE TABLES
-- ============================================

-- Create relationship_needs table
CREATE TABLE public.relationship_needs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  relationship_id UUID NOT NULL,
  need_type TEXT NOT NULL,
  intensity TEXT DEFAULT 'moderate' NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Add constraints
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_relationship FOREIGN KEY (relationship_id) REFERENCES public.relationships(id) ON DELETE CASCADE,
  CONSTRAINT check_need_type CHECK (need_type IN ('affection', 'dates', 'quality_time', 'compliments', 'appreciation', 'communication', 'intimacy', 'support')),
  CONSTRAINT check_intensity CHECK (intensity IN ('slight', 'moderate', 'significant'))
);

-- Create partner_suggestions table
CREATE TABLE public.partner_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  relationship_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  need_id UUID,
  suggestion_type TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  shown_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  dismissed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Add constraints
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_relationship FOREIGN KEY (relationship_id) REFERENCES public.relationships(id) ON DELETE CASCADE,
  CONSTRAINT fk_partner FOREIGN KEY (partner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_need FOREIGN KEY (need_id) REFERENCES public.relationship_needs(id) ON DELETE CASCADE
);

-- ============================================
-- STEP 3: ENABLE RLS
-- ============================================

ALTER TABLE public.relationship_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_suggestions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================

-- Policies for relationship_needs
CREATE POLICY relationship_needs_select ON public.relationship_needs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY relationship_needs_insert ON public.relationship_needs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY relationship_needs_update ON public.relationship_needs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY relationship_needs_delete ON public.relationship_needs
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for partner_suggestions
CREATE POLICY partner_suggestions_select ON public.partner_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY partner_suggestions_update ON public.partner_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- STEP 5: CREATE INDEXES
-- ============================================

CREATE INDEX idx_needs_user_id ON public.relationship_needs(user_id);
CREATE INDEX idx_needs_relationship_id ON public.relationship_needs(relationship_id);
CREATE INDEX idx_needs_is_active ON public.relationship_needs(is_active) WHERE is_active = true;
CREATE INDEX idx_suggestions_user_id ON public.partner_suggestions(user_id);
CREATE INDEX idx_suggestions_active ON public.partner_suggestions(shown_at) WHERE dismissed_at IS NULL AND completed_at IS NULL;

-- ============================================
-- STEP 6: CREATE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.create_partner_suggestions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  need_rec RECORD;
  pid UUID;
  stext TEXT;
  sarr TEXT[];
BEGIN
  FOR need_rec IN
    SELECT n.*, r.partner_a_id, r.partner_b_id
    FROM relationship_needs n
    JOIN relationships r ON r.id = n.relationship_id
    WHERE n.is_active = true
  LOOP
    -- Determine partner ID
    IF need_rec.user_id = need_rec.partner_a_id THEN
      pid := need_rec.partner_b_id;
    ELSE
      pid := need_rec.partner_a_id;
    END IF;

    -- Check if suggestion recently shown
    IF EXISTS (
      SELECT 1 FROM partner_suggestions
      WHERE user_id = pid
        AND need_id = need_rec.id
        AND shown_at > NOW() - INTERVAL '3 days'
    ) THEN
      CONTINUE;
    END IF;

    -- Get suggestions array based on need type
    CASE need_rec.need_type
      WHEN 'affection' THEN
        sarr := ARRAY[
          'Try surprising your partner with a warm hug today',
          'Leave a sweet note for your partner to find',
          'Hold hands during your next walk together',
          'Give your partner a gentle kiss on the forehead'
        ];
      WHEN 'dates' THEN
        sarr := ARRAY[
          'Plan a surprise date for this weekend',
          'Set up a cozy movie night at home',
          'Organize a picnic in a nearby park',
          'Ask your partner out for dinner'
        ];
      WHEN 'quality_time' THEN
        sarr := ARRAY[
          'Put your phone away and have a meaningful conversation',
          'Plan an evening where you focus entirely on each other',
          'Cook a meal together tonight',
          'Take a walk together'
        ];
      WHEN 'compliments' THEN
        sarr := ARRAY[
          'Tell your partner something you appreciate about them',
          'Compliment their appearance today',
          'Acknowledge something they did really well recently',
          'Tell them why you''re proud to be with them'
        ];
      WHEN 'appreciation' THEN
        sarr := ARRAY[
          'Thank your partner for something they do regularly',
          'Express gratitude for their efforts',
          'Notice and acknowledge the little things they do',
          'Tell them how much you value them'
        ];
      WHEN 'communication' THEN
        sarr := ARRAY[
          'Ask your partner how they''re really feeling',
          'Share something vulnerable about your day',
          'Check in with your partner about their needs',
          'Have an honest conversation'
        ];
      WHEN 'intimacy' THEN
        sarr := ARRAY[
          'Create a romantic atmosphere at home tonight',
          'Plan a sensual evening together',
          'Express your desire for your partner',
          'Set aside time for intimacy'
        ];
      WHEN 'support' THEN
        sarr := ARRAY[
          'Ask your partner if there''s anything you can help with',
          'Offer to take something off their plate today',
          'Check in on how stressed your partner has been',
          'Show up for your partner when they need you'
        ];
    END CASE;

    -- Pick random suggestion
    stext := sarr[1 + floor(random() * array_length(sarr, 1))];

    -- Insert suggestion
    INSERT INTO partner_suggestions (
      user_id, relationship_id, partner_id, need_id, suggestion_type, suggestion_text
    ) VALUES (
      pid, need_rec.relationship_id, need_rec.user_id, need_rec.id, need_rec.need_type, stext
    );
  END LOOP;
END;
$$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Count tables (should return 2)
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('relationship_needs', 'partner_suggestions');

-- Verify function exists (should return 1)
SELECT COUNT(*) as function_count
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_partner_suggestions';
