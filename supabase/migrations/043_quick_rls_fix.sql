-- Quick RLS Fix - Only add missing policies without dropping existing ones

-- =====================================================
-- 1. Add missing users table policies if they don't exist
-- =====================================================

-- Only create the partner profiles policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'users'
        AND policyname = 'Users can view partner profiles'
    ) THEN
        CREATE POLICY "Users can view partner profiles"
          ON public.users FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.relationships
              WHERE (relationships.partner_a_id = auth.uid() AND relationships.partner_b_id = users.id)
                 OR (relationships.partner_b_id = auth.uid() AND relationships.partner_a_id = users.id)
            )
          );
        RAISE NOTICE 'Created policy: Users can view partner profiles';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can view partner profiles';
    END IF;
END $$;

-- =====================================================
-- 2. Verify all policies exist
-- =====================================================

-- Check what policies exist for both tables
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