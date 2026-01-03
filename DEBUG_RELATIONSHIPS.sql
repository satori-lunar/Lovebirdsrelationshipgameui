-- DEBUG: Check relationships table
-- Run this in Supabase SQL Editor to see what relationships exist

-- 1. Show all relationships
SELECT
  id,
  partner_a_id,
  partner_b_id,
  invite_code,
  connected_at,
  created_at
FROM relationships
ORDER BY created_at DESC;

-- 2. Check if DELETE policy exists
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'relationships'
ORDER BY policyname;

-- 3. Count orphaned relationships (partner_b_id is null)
SELECT
  COUNT(*) as orphaned_count,
  partner_a_id
FROM relationships
WHERE partner_b_id IS NULL
GROUP BY partner_a_id;
