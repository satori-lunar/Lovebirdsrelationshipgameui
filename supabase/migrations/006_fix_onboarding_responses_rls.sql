-- Fix RLS policy violation for onboarding_responses table
-- Add more permissive INSERT policy to handle signup flow

-- Add policy allowing authenticated users to insert their onboarding responses
-- This mirrors the fix applied to the users table to handle the signup flow
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.onboarding_responses;
CREATE POLICY "Enable insert for authenticated users only"
  ON public.onboarding_responses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Also add a more permissive UPDATE policy to handle upserts
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.onboarding_responses;
CREATE POLICY "Enable update for authenticated users only"
  ON public.onboarding_responses FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = user_id);
