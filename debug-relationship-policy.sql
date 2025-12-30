-- Check current RLS policies on relationships table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'relationships'
ORDER BY policyname;

-- This will show all policies on the relationships table
-- Look for "Users can update their relationships" policy
-- The with_check column should include: (partner_b_id IS NULL AND ...)
