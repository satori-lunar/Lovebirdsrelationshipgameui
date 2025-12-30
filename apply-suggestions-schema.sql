-- Quick Apply: Enhanced Suggestions Schema
-- Run this in Supabase SQL Editor to apply migration 013
-- This enables personalized gift, date, and love language suggestions

-- Rename table to be more general
ALTER TABLE IF EXISTS public.love_language_suggestions RENAME TO suggestions;

-- Add new columns to support multiple suggestion types
ALTER TABLE public.suggestions
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'love_language'
    CHECK (category IN ('love_language', 'gift', 'date')),
  ADD COLUMN IF NOT EXISTS data_sources JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS personalization_tier INTEGER DEFAULT 1
    CHECK (personalization_tier >= 1 AND personalization_tier <= 4),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing rows to have the love_language category
UPDATE public.suggestions
SET category = 'love_language'
WHERE category IS NULL;

-- Make category NOT NULL after setting default values
ALTER TABLE public.suggestions
  ALTER COLUMN category SET NOT NULL;

-- Create suggestion_generation_metadata table
CREATE TABLE IF NOT EXISTS public.suggestion_generation_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('love_language', 'gift', 'date')),
  week_start_date DATE NOT NULL,
  onboarding_data_version TIMESTAMPTZ,
  partner_onboarding_data_version TIMESTAMPTZ,
  saved_insights_count INTEGER DEFAULT 0,
  daily_answers_count INTEGER DEFAULT 0,
  personalization_tier INTEGER DEFAULT 1 CHECK (personalization_tier >= 1 AND personalization_tier <= 4),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, week_start_date)
);

-- Drop old index and create new ones
DROP INDEX IF EXISTS public.idx_love_language_suggestions_user_week;

CREATE INDEX IF NOT EXISTS idx_suggestions_user_category_week
  ON public.suggestions(user_id, category, week_start_date);

CREATE INDEX IF NOT EXISTS idx_suggestions_category
  ON public.suggestions(category);

CREATE INDEX IF NOT EXISTS idx_suggestion_metadata_user_category
  ON public.suggestion_generation_metadata(user_id, category, week_start_date);

-- Enable RLS on new table
ALTER TABLE public.suggestion_generation_metadata ENABLE ROW LEVEL SECURITY;

-- RLS policies for suggestions table (update existing or create new)
DROP POLICY IF EXISTS "Users can view their own love language suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Users can insert their own love language suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Users can update their own love language suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Users can delete their own love language suggestions" ON public.suggestions;

-- New RLS policies for suggestions
CREATE POLICY "Users can view their own suggestions"
  ON public.suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suggestions"
  ON public.suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions"
  ON public.suggestions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suggestions"
  ON public.suggestions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for suggestion_generation_metadata
CREATE POLICY "Users can view their own suggestion metadata"
  ON public.suggestion_generation_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suggestion metadata"
  ON public.suggestion_generation_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestion metadata"
  ON public.suggestion_generation_metadata FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suggestion metadata"
  ON public.suggestion_generation_metadata FOR DELETE
  USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE public.suggestions IS 'Stores personalized suggestions for love languages, gifts, and dates';
COMMENT ON COLUMN public.suggestions.category IS 'Type of suggestion: love_language, gift, or date';
COMMENT ON COLUMN public.suggestions.data_sources IS 'JSONB storing what data was used for personalization (e.g., partner preferences, saved insights)';
COMMENT ON COLUMN public.suggestions.personalization_tier IS 'Level of personalization: 1=basic, 2=partner data, 3=insights, 4=patterns';
COMMENT ON COLUMN public.suggestions.metadata IS 'Additional metadata like budget, effort, occasion, etc.';

COMMENT ON TABLE public.suggestion_generation_metadata IS 'Tracks when suggestions were generated and what data was available';
