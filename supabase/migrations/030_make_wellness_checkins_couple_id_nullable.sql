-- Allow wellness check-ins without requiring a relationship
-- This enables general mood/wellness tracking even for single users

ALTER TABLE public.relationship_wellness_checkins
ALTER COLUMN couple_id DROP NOT NULL;

-- Update the index to handle null couple_ids
DROP INDEX IF EXISTS idx_wellness_checkins_couple_user;
CREATE INDEX IF NOT EXISTS idx_wellness_checkins_user_couple ON public.relationship_wellness_checkins(user_id, couple_id, created_at DESC);

-- Update RLS policies to handle null couple_ids
DROP POLICY IF EXISTS "Users can view own wellness checkins" ON public.relationship_wellness_checkins;
CREATE POLICY "Users can view own wellness checkins"
  ON public.relationship_wellness_checkins
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.relationship_wellness_checkins IS 'Tracks periodic wellness check-ins for mood tracking, can be relationship-specific or general';
