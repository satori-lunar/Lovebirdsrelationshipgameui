-- Fix relationship UPDATE policy to allow partner connection
-- This fixes the issue where users can't connect because they're not yet in the relationship

-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can update their relationships" ON public.relationships;

-- Create a new UPDATE policy that allows:
-- 1. Users already in the relationship to update (existing behavior)
-- 2. Any authenticated user to connect as partner_b if the slot is empty
CREATE POLICY "Users can update their relationships"
  ON public.relationships FOR UPDATE
  USING (
    auth.uid() = partner_a_id OR
    auth.uid() = partner_b_id OR
    (partner_b_id IS NULL AND auth.role() = 'authenticated')
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Users can update their relationships" ON public.relationships IS
  'Allows users in a relationship to update it, and allows any authenticated user to connect as partner_b when the slot is empty';
