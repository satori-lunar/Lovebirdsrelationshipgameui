-- Fix relationship SELECT policy to allow finding relationships by invite code
-- This fixes the 406 error when trying to connect with a partner's invite code

-- User B cannot read the relationship to find it by invite code because they're not in it yet
-- This policy allows authenticated users to view relationships that are available to join

DROP POLICY IF EXISTS "Users can view their own relationships" ON public.relationships;

CREATE POLICY "Users can view their own relationships"
  ON public.relationships FOR SELECT
  USING (
    auth.uid() = partner_a_id OR
    auth.uid() = partner_b_id OR
    (partner_b_id IS NULL AND auth.role() = 'authenticated')
  );

COMMENT ON POLICY "Users can view their own relationships" ON public.relationships IS
  'Allows users to view relationships they are part of, and allows any authenticated user to view relationships available to join (partner_b_id IS NULL)';
