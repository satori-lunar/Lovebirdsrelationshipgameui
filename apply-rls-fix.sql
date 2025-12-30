-- Quick fix for RLS policy violation on onboarding_responses table
-- Run this in the Supabase SQL Editor if you're experiencing
-- "new row violates row-level security policy" errors during signup

-- Add policy allowing authenticated users to insert their onboarding responses
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.onboarding_responses;
CREATE POLICY "Enable insert for authenticated users only"
  ON public.onboarding_responses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Also add a more permissive UPDATE policy to handle upserts
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.onboarding_responses;
CREATE POLICY "Enable update for authenticated users only"
  ON public.onboarding_responses FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = user_id);
