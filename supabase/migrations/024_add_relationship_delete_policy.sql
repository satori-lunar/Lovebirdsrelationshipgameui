-- Migration: Add DELETE policy for relationships
-- Description: Allow users to delete their own orphaned relationship invites
-- Date: 2026-01-03

-- Users can delete their own relationships (only if they are partner_a)
DROP POLICY IF EXISTS "Users can delete their own relationships" ON public.relationships;
CREATE POLICY "Users can delete their own relationships"
  ON public.relationships FOR DELETE
  USING (auth.uid() = partner_a_id);

COMMENT ON POLICY "Users can delete their own relationships" ON public.relationships IS
  'Allows users to delete relationships where they are partner_a. This is used to clean up orphaned invites when connecting to a partner''s code.';
