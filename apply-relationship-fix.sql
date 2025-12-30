-- Quick fix for partner connection issue
-- Run this in the Supabase SQL Editor if partners can't connect

-- Fix the UPDATE policy to allow users to connect as partner_b
DROP POLICY IF EXISTS "Users can update their relationships" ON public.relationships;

CREATE POLICY "Users can update their relationships"
  ON public.relationships FOR UPDATE
  USING (
    auth.uid() = partner_a_id OR 
    auth.uid() = partner_b_id OR
    (partner_b_id IS NULL AND auth.role() = 'authenticated')
  );
