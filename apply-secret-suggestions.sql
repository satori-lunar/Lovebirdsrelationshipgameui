-- Quick Apply: Add Secret Suggestions (Surprise Vault)
-- Run this in Supabase SQL Editor

-- Add is_secret column to suggestions table
ALTER TABLE public.suggestions
  ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_suggestions_user_secret
  ON public.suggestions(user_id, is_secret)
  WHERE is_secret = true;

-- Add comment
COMMENT ON COLUMN public.suggestions.is_secret IS 'Whether this suggestion is secret/private (for surprise vault)';
