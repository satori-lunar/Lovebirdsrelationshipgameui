-- Check Jennifer's onboarding_responses record
SELECT 'Jennifer Onboarding Data' as check, *
FROM onboarding_responses
WHERE user_id = 'f61bc096-a956-40d0-ba11-826380a42133';

-- If the above returns nothing or name is NULL, run this fix:
-- Option 1: Create/Update onboarding record with name from users table
INSERT INTO onboarding_responses (user_id, name, partner_name)
SELECT
  id as user_id,
  name,
  '' as partner_name
FROM users
WHERE id = 'f61bc096-a956-40d0-ba11-826380a42133'
ON CONFLICT (user_id)
DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Verify the fix worked
SELECT 'After Fix - Jennifer Onboarding' as check, user_id, name, partner_name
FROM onboarding_responses
WHERE user_id = 'f61bc096-a956-40d0-ba11-826380a42133';
