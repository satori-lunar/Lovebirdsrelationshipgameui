-- Add created_at columns to question tables for consistency
-- The code expects created_at but the schema has answered_at/guessed_at

-- Add created_at to question_answers (keep answered_at for backward compatibility)
ALTER TABLE public.question_answers
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Set created_at to match answered_at for existing rows
UPDATE public.question_answers
SET created_at = answered_at
WHERE created_at IS NULL;

-- Add created_at to question_guesses (keep guessed_at for backward compatibility)
ALTER TABLE public.question_guesses
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Set created_at to match guessed_at for existing rows
UPDATE public.question_guesses
SET created_at = guessed_at
WHERE created_at IS NULL;

COMMENT ON COLUMN public.question_answers.created_at IS 'Added for code compatibility - mirrors answered_at';
COMMENT ON COLUMN public.question_guesses.created_at IS 'Added for code compatibility - mirrors guessed_at';
