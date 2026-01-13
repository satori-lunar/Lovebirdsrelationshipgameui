-- Check Partner's Data
-- Your ID: 74988bb2-faa6-47a7-934a-f55dbe9ed3fa (elliot mccormick)
-- Partner ID: f61bc096-a956-40d0-ba11-826380a42133

-- 1. Does partner have a user record?
SELECT 'Partner User Record' as check_type, *
FROM users
WHERE id = 'f61bc096-a956-40d0-ba11-826380a42133';

-- 2. Does partner have onboarding data?
SELECT 'Partner Onboarding Record' as check_type, *
FROM onboarding_responses
WHERE user_id = 'f61bc096-a956-40d0-ba11-826380a42133';

-- 3. Check YOUR onboarding data (for comparison)
SELECT 'Your Onboarding Record' as check_type, *
FROM onboarding_responses
WHERE user_id = '74988bb2-faa6-47a7-934a-f55dbe9ed3fa';

-- 4. Summary - What's missing?
SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM users WHERE id = 'f61bc096-a956-40d0-ba11-826380a42133') = 0
    THEN '❌ Partner has NO user record'
    ELSE '✅ Partner has user record'
  END as user_check,
  CASE
    WHEN (SELECT COUNT(*) FROM onboarding_responses WHERE user_id = 'f61bc096-a956-40d0-ba11-826380a42133') = 0
    THEN '❌ Partner has NO onboarding data - THIS IS THE PROBLEM'
    ELSE '✅ Partner has onboarding data'
  END as onboarding_check,
  CASE
    WHEN (SELECT name FROM onboarding_responses WHERE user_id = 'f61bc096-a956-40d0-ba11-826380a42133') IS NULL
    THEN '❌ Partner name is NULL'
    ELSE '✅ Partner name: ' || (SELECT name FROM onboarding_responses WHERE user_id = 'f61bc096-a956-40d0-ba11-826380a42133')
  END as name_check;
