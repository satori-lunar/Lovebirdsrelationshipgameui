-- Migration to add relationship wellness check-ins
-- This allows tracking periodic relationship health check-ins

-- Create relationship wellness check-ins table
CREATE TABLE IF NOT EXISTS public.relationship_wellness_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL CHECK (mood IN ('amazing', 'good', 'okay', 'struggling')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_wellness_checkins_couple_user ON public.relationship_wellness_checkins(couple_id, user_id, created_at DESC);

-- Add RLS policies
ALTER TABLE public.relationship_wellness_checkins ENABLE ROW LEVEL SECURITY;

-- Users can view their own wellness check-ins
CREATE POLICY "Users can view own wellness checkins"
  ON public.relationship_wellness_checkins
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own wellness check-ins
CREATE POLICY "Users can insert own wellness checkins"
  ON public.relationship_wellness_checkins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.relationship_wellness_checkins IS 'Tracks periodic relationship wellness check-ins to encourage engagement and monitor relationship health';
