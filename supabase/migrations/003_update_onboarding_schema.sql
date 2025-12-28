-- Migration to update onboarding_responses table for new onboarding structure
-- This adds new columns while keeping old ones for backward compatibility

-- Add new columns for the new onboarding structure
ALTER TABLE public.onboarding_responses 
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS pronouns TEXT,
  ADD COLUMN IF NOT EXISTS love_language_primary TEXT,
  ADD COLUMN IF NOT EXISTS love_language_secondary TEXT,
  ADD COLUMN IF NOT EXISTS wants_needs JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consent JSONB DEFAULT '{}'::jsonb;

-- Create index for new JSONB columns if needed
CREATE INDEX IF NOT EXISTS idx_onboarding_wants_needs ON public.onboarding_responses USING GIN (wants_needs);
CREATE INDEX IF NOT EXISTS idx_onboarding_preferences ON public.onboarding_responses USING GIN (preferences);

-- Update the constraint to allow name to be nullable temporarily during onboarding
-- But we'll keep NOT NULL for now since it's required in the new flow

-- Add comment to document the new structure
COMMENT ON COLUMN public.onboarding_responses.wants_needs IS 'JSON object containing: gestures (array), surprise_frequency (string), date_style (string), gift_types (array), planning_style (string), avoid (string), notes (string)';
COMMENT ON COLUMN public.onboarding_responses.preferences IS 'JSON object containing: date_types (array), gift_budget (string), nudge_frequency (string)';
COMMENT ON COLUMN public.onboarding_responses.consent IS 'JSON object containing: share_with_partner (boolean), email_opt_in (boolean)';

