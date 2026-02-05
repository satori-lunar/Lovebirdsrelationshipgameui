-- Allow partners to update each other's names
-- This enables the "Update Partner Name" feature in Settings

-- Add policy to allow partners to update each other's name in onboarding_responses
CREATE POLICY "Partners can update each other's name"
  ON public.onboarding_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE (relationships.partner_a_id = auth.uid() AND relationships.partner_b_id = onboarding_responses.user_id)
         OR (relationships.partner_b_id = auth.uid() AND relationships.partner_a_id = onboarding_responses.user_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE (relationships.partner_a_id = auth.uid() AND relationships.partner_b_id = onboarding_responses.user_id)
         OR (relationships.partner_b_id = auth.uid() AND relationships.partner_a_id = onboarding_responses.user_id)
    )
  );

-- Verify the policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'onboarding_responses'
  AND policyname = 'Partners can update each other''s name'
ORDER BY tablename, policyname;
