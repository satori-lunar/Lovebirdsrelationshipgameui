# Fix Connection Issue

If one user is connected but the other isn't, follow these steps:

## Step 1: Run Migration 024

**This is REQUIRED** - Without this migration, orphaned invites can't be deleted.

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Migration: Add DELETE policy for relationships
DROP POLICY IF EXISTS "Users can delete their own relationships" ON public.relationships;
CREATE POLICY "Users can delete their own relationships"
  ON public.relationships FOR DELETE
  USING (auth.uid() = partner_a_id);

COMMENT ON POLICY "Users can delete their own relationships" ON public.relationships IS
  'Allows users to delete relationships where they are partner_a. This is used to clean up orphaned invites when connecting to a partner''s code.';
```

## Step 2: Debug Current State

Run this query in **Supabase SQL Editor** to see what's in your database:

```sql
-- Show all relationships
SELECT
  id,
  partner_a_id,
  partner_b_id,
  invite_code,
  connected_at,
  created_at
FROM relationships
ORDER BY created_at DESC;

-- Check DELETE policy exists
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'relationships'
AND cmd = 'DELETE';
```

**What you should see:**
- ✅ One relationship with BOTH partner_a_id AND partner_b_id filled
- ✅ DELETE policy called "Users can delete their own relationships"
- ❌ If you see TWO relationships (one with partner_b_id = null), that's the orphaned invite!

## Step 3: Manual Cleanup (If Needed)

If you see orphaned relationships after running migration 024, delete them manually:

```sql
-- Delete orphaned invites (where partner_b_id is null)
DELETE FROM relationships
WHERE partner_b_id IS NULL;
```

## Step 4: Test the Connection

1. **Both users** should log out and log back in (or refresh the page)
2. Check Settings → Partner Connection
3. Both should see "✓ Connected"

## How It Works Now

1. User A clicks "Invite" → generates code `ABC123`
2. User B enters `ABC123`
3. System automatically:
   - Deletes User B's orphaned invite (if exists)
   - Sets partner_b_id on User A's relationship
4. **Both users see "Connected" within 3 seconds** (auto-polling)

## Still Having Issues?

Check browser console for errors:
1. Press F12 → Console tab
2. Look for error messages with ❌ emoji
3. Share the error in the issue tracker
