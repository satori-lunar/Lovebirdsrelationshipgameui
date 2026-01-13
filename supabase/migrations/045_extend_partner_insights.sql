-- Extend partner insights table to support different types of insights
-- Add insight_type to categorize different types of insights
-- Add title and content fields for manual notes

-- First, add new columns to the existing table
ALTER TABLE public.saved_partner_insights
ADD COLUMN IF NOT EXISTS insight_type TEXT NOT NULL DEFAULT 'daily_question',
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS content TEXT;

-- Add check constraint for insight_type values
ALTER TABLE public.saved_partner_insights
ADD CONSTRAINT valid_insight_type CHECK (
  insight_type IN ('daily_question', 'couple_challenge', 'icebreaker', 'manual_note')
);

-- Make question_id nullable since manual notes won't have one
ALTER TABLE public.saved_partner_insights
ALTER COLUMN question_id DROP NOT NULL;

-- Create index for better querying by type
CREATE INDEX IF NOT EXISTS saved_partner_insights_type_idx ON public.saved_partner_insights(insight_type);

-- Update existing records to have proper insight_type
UPDATE public.saved_partner_insights
SET insight_type = 'daily_question'
WHERE insight_type = 'daily_question' OR insight_type IS NULL;