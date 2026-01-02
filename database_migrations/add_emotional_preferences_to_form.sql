-- Add emotional preference fields to partner_form_responses table
-- This allows partners in solo mode to share how they like to be supported

ALTER TABLE partner_form_responses
  ADD COLUMN IF NOT EXISTS when_low_helps JSONB,
  ADD COLUMN IF NOT EXISTS when_low_avoid JSONB;

-- Comment for documentation
COMMENT ON COLUMN partner_form_responses.when_low_helps IS 'Array of things that help when feeling low (e.g., ["Physical closeness", "Quiet presence"])';
COMMENT ON COLUMN partner_form_responses.when_low_avoid IS 'Array of things to avoid when feeling low (e.g., ["Too many questions", "Being told to cheer up"])';

-- Verify
DO $$
BEGIN
  RAISE NOTICE '✅ Added emotional preference columns to partner_form_responses';
  RAISE NOTICE 'Columns: when_low_helps, when_low_avoid';
END $$;
