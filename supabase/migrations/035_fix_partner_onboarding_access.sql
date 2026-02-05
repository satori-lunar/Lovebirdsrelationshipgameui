-- Fix partner onboarding access by removing the old restrictive policy
-- The old policy "Users can view their own onboarding" prevents viewing partner data
-- We need to remove it and keep only the partner-aware policy

-- Drop the old restrictive policy from migration 002
DROP POLICY IF EXISTS "Users can view their own onboarding" ON public.onboarding_responses;

-- Ensure the partner-aware policy exists (should already exist from migration 012)
DROP POLICY IF EXISTS "Users can view their own and partner onboarding" ON public.onboarding_responses;

CREATE POLICY "Users can view their own and partner onboarding"
  ON public.onboarding_responses FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE (relationships.partner_a_id = auth.uid() AND relationships.partner_b_id = onboarding_responses.user_id)
         OR (relationships.partner_b_id = auth.uid() AND relationships.partner_a_id = onboarding_responses.user_id)
    )
  );

COMMENT ON POLICY "Users can view their own and partner onboarding" ON public.onboarding_responses IS
  'Allows users to view their own onboarding data and their partner''s onboarding data if they are connected in a relationship';
