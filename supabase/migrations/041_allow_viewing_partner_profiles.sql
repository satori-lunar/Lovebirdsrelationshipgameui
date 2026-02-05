-- Allow users to view their partner's basic profile information
-- This fixes the 406 error when trying to fetch partner names

DROP POLICY IF EXISTS "Users can view partner profiles" ON public.users;

CREATE POLICY "Users can view partner profiles"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE (relationships.partner_a_id = auth.uid() AND relationships.partner_b_id = users.id)
         OR (relationships.partner_b_id = auth.uid() AND relationships.partner_a_id = users.id)
    )
  );