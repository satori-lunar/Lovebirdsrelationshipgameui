-- Complete fix for partner connection issue
-- Run this in the Supabase SQL Editor

-- Fix 1: Allow reading relationships with empty partner_b slot (for finding by invite code)
DROP POLICY IF EXISTS "Users can view their own relationships" ON public.relationships;

CREATE POLICY "Users can view their own relationships"
  ON public.relationships FOR SELECT
  USING (
    auth.uid() = partner_a_id OR 
    auth.uid() = partner_b_id OR
    (partner_b_id IS NULL AND auth.role() = 'authenticated')
  );

-- Fix 2: Allow updating relationships to connect as partner_b
DROP POLICY IF EXISTS "Users can update their relationships" ON public.relationships;

CREATE POLICY "Users can update their relationships"
  ON public.relationships FOR UPDATE
  USING (
    auth.uid() = partner_a_id OR 
    auth.uid() = partner_b_id OR
    (partner_b_id IS NULL AND auth.role() = 'authenticated')
  );
