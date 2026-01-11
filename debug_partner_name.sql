-- Debug Partner Name Issue
-- Run these queries in Supabase SQL Editor to diagnose the problem

-- 1. Check if partner has onboarding data (bypasses RLS)
SELECT
  user_id,
  name,
  partner_name,
  created_at,
  updated_at
FROM onboarding_responses
WHERE user_id = 'f61bc096-a956-40d0-ba11-826380a42133';

-- 2. Check if partner has a user record
SELECT
  id,
  name,
  email,
  created_at
FROM users
WHERE id = 'f61bc096-a956-40d0-ba11-826380a42133';

-- 3. Verify the relationship exists and is connected
SELECT
  id,
  partner_a_id,
  partner_b_id,
  connected_at,
  CASE
    WHEN connected_at IS NOT NULL THEN 'CONNECTED'
    ELSE 'NOT CONNECTED - This is the problem!'
  END as connection_status,
  created_at
FROM relationships
WHERE id = 'fb48a493-35d8-4aeb-a693-c604966365ac';

-- 3b. Check if there's a relationship between the two users
SELECT
  id,
  partner_a_id,
  partner_b_id,
  connected_at,
  CASE
    WHEN connected_at IS NOT NULL THEN 'CONNECTED'
    ELSE 'NOT CONNECTED'
  END as status
FROM relationships
WHERE (partner_a_id = '74988bb2-faa6-47a7-934a-f55dbe9ed3fa' AND partner_b_id = 'f61bc096-a956-40d0-ba11-826380a42133')
   OR (partner_b_id = '74988bb2-faa6-47a7-934a-f55dbe9ed3fa' AND partner_a_id = 'f61bc096-a956-40d0-ba11-826380a42133');

-- 4. Check RLS policies on onboarding_responses table
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
WHERE tablename = 'onboarding_responses';

-- 5. Test RLS policy manually (run as authenticated user 74988bb2-faa6-47a7-934a-f55dbe9ed3fa)
-- This simulates what the app is doing
SET request.jwt.claim.sub = '74988bb2-faa6-47a7-934a-f55dbe9ed3fa';

SELECT
  user_id,
  name,
  partner_name
FROM onboarding_responses
WHERE user_id = 'f61bc096-a956-40d0-ba11-826380a42133';

-- 6. Check if there are any other restrictive policies
SELECT
  *
FROM pg_policies
WHERE tablename = 'onboarding_responses'
  AND cmd = 'SELECT';

-- 7. FIX: If connected_at is NULL, set it to NOW() to mark the relationship as connected
-- Uncomment and run this if the relationship shows as "NOT CONNECTED" above
/*
UPDATE relationships
SET connected_at = NOW()
WHERE id = 'fb48a493-35d8-4aeb-a693-c604966365ac'
  AND connected_at IS NULL;
*/
