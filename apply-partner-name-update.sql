-- Allow partners to update each other's names
-- Run this in the Supabase SQL Editor to enable the "Update Partner Name" feature in Settings

-- Add policy to allow partners to update each other's name in onboarding_responses
DROP POLICY IF EXISTS "Partners can update each other's name" ON public.onboarding_responses;

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
