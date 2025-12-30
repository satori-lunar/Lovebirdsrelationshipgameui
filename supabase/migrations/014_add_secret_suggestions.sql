-- Add is_secret column to suggestions table for Surprise Vault feature
-- This allows users to keep suggestions private from their partner

ALTER TABLE public.suggestions
  ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of secret suggestions
CREATE INDEX IF NOT EXISTS idx_suggestions_user_secret
  ON public.suggestions(user_id, is_secret)
  WHERE is_secret = true;

-- Add comment
COMMENT ON COLUMN public.suggestions.is_secret IS 'Whether this suggestion is secret/private (for surprise vault)';
