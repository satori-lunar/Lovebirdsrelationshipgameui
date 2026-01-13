-- Verify and ensure all necessary RLS policies exist

-- Check current policies
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
  AND tablename IN ('users', 'onboarding_responses', 'relationships')
ORDER BY tablename, policyname;

-- Ensure users table has the partner profiles policy
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
        RAISE NOTICE '✅ Created policy: Users can view partner profiles';
    ELSE
        RAISE NOTICE 'ℹ️ Policy already exists: Users can view partner profiles';
    END IF;
END $$;

-- Ensure onboarding_responses has proper policies
DO $$
BEGIN
    -- Check for own onboarding policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'onboarding_responses'
        AND policyname = 'Users can view their own onboarding'
    ) THEN
        CREATE POLICY "Users can view their own onboarding"
          ON public.onboarding_responses FOR SELECT
          USING (auth.uid() = user_id);
        RAISE NOTICE '✅ Created policy: Users can view their own onboarding';
    ELSE
        RAISE NOTICE 'ℹ️ Policy already exists: Users can view their own onboarding';
    END IF;

    -- Check for partner onboarding policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'onboarding_responses'
        AND policyname = 'Users can view partner onboarding'
    ) THEN
        CREATE POLICY "Users can view partner onboarding"
          ON public.onboarding_responses FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.relationships
              WHERE (relationships.partner_a_id = auth.uid() AND relationships.partner_b_id = onboarding_responses.user_id)
                 OR (relationships.partner_b_id = auth.uid() AND relationships.partner_a_id = onboarding_responses.user_id)
            )
          );
        RAISE NOTICE '✅ Created policy: Users can view partner onboarding';
    ELSE
        RAISE NOTICE 'ℹ️ Policy already exists: Users can view partner onboarding';
    END IF;
END $$;

-- Final policy check
SELECT
    'Final Policy Check' as status,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'onboarding_responses', 'relationships');