-- Quick fix: Allow viewing partner's onboarding data
-- Run this in Supabase SQL Editor

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
