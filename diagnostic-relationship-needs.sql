-- DIAGNOSTIC: Check what exists in your database
-- Run this first to see the current state

-- 1. Check if tables exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('relationship_needs', 'partner_suggestions')
ORDER BY table_name;

-- 2. Check columns in relationship_needs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'relationship_needs'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check columns in partner_suggestions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'partner_suggestions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_partner_suggestions';

-- 5. Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('relationship_needs', 'partner_suggestions');
