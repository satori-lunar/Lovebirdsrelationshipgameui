-- Quick fix to add created_at columns to question tables
-- Run this in Supabase SQL Editor

ALTER TABLE public.question_answers 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.question_answers 
SET created_at = answered_at 
WHERE created_at IS NULL;

ALTER TABLE public.question_guesses
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.question_guesses
SET created_at = guessed_at
WHERE created_at IS NULL;
