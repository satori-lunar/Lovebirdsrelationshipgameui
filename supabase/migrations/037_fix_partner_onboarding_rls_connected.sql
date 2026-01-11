-- Fix RLS policy to check that relationship is actually connected
-- The relationships table uses connected_at (timestamp), not connected (boolean)
-- Partners should only see each other's onboarding data if connected_at IS NOT NULL

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own and partner onboarding" ON public.onboarding_responses;

-- Recreate with connected_at check
CREATE POLICY "Users can view their own and partner onboarding"
  ON public.onboarding_responses FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE connected_at IS NOT NULL
        AND (
          (relationships.partner_a_id = auth.uid() AND relationships.partner_b_id = onboarding_responses.user_id)
          OR
          (relationships.partner_b_id = auth.uid() AND relationships.partner_a_id = onboarding_responses.user_id)
        )
    )
  );

COMMENT ON POLICY "Users can view their own and partner onboarding" ON public.onboarding_responses IS
  'Allows users to view their own onboarding data and their partner''s onboarding data if they are connected (connected_at IS NOT NULL)';
