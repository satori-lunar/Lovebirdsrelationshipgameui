-- Comprehensive RLS Policy Fix
-- This ensures all necessary policies are in place for proper app functionality

-- =====================================================
-- 1. Fix onboarding_responses policies
-- =====================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own onboarding" ON public.onboarding_responses;
DROP POLICY IF EXISTS "Users can insert their own onboarding" ON public.onboarding_responses;
DROP POLICY IF EXISTS "Users can update their own onboarding" ON public.onboarding_responses;
DROP POLICY IF EXISTS "Users can view their own and partner onboarding" ON public.onboarding_responses;

-- Recreate policies with proper permissions
CREATE POLICY "Users can view their own onboarding"
  ON public.onboarding_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding"
  ON public.onboarding_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding"
  ON public.onboarding_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view partner onboarding"
  ON public.onboarding_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE (relationships.partner_a_id = auth.uid() AND relationships.partner_b_id = onboarding_responses.user_id)
         OR (relationships.partner_b_id = auth.uid() AND relationships.partner_a_id = onboarding_responses.user_id)
    )
  );

-- =====================================================
-- 2. Fix users table policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Users can view partner profiles" ON public.users;

-- Recreate user policies
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view partner profiles"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE (relationships.partner_a_id = auth.uid() AND relationships.partner_b_id = users.id)
         OR (relationships.partner_b_id = auth.uid() AND relationships.partner_a_id = users.id)
    )
  );

-- =====================================================
-- 3. Ensure RLS is enabled on all tables
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. Verify policies are created
-- =====================================================

-- Check that policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'onboarding_responses')
ORDER BY tablename, policyname;