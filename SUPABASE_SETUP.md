# Supabase Setup Guide

This document provides detailed instructions for configuring your Supabase project for the Love Birds app.

## Critical: Disable Email Confirmation

**This app requires immediate user onboarding after signup.** Email confirmation MUST be disabled.

### Why?

When email confirmation is enabled:
- `signUp()` creates the user but returns `session: null`
- Users cannot access the app until they click the confirmation email
- The app's onboarding flow requires immediate database access
- Without a session, all database requests fail with 401 errors

### How to Disable Email Confirmation

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Click on **Email** provider
5. Find the **"Confirm email"** toggle
6. **Turn OFF** "Confirm email"
7. Click **Save**

### Verification

After disabling, test signup:
1. Create a new account
2. Check browser console for: `✓ Session successfully set in Supabase client`
3. If you see `⚠️ No session returned from signup`, email confirmation is still enabled

## Database Migrations

Run all migrations in order via SQL Editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_update_onboarding_schema.sql`
4. `supabase/migrations/004_add_daily_questions.sql`
5. `supabase/migrations/005_enhance_memories_schema.sql`
6. `supabase/migrations/006_fix_onboarding_responses_rls.sql`
7. `supabase/migrations/007_fix_relationship_update_policy.sql` **(Required for partner connection)**

### Quick Fix Scripts

- Onboarding RLS: `apply-rls-fix.sql`
- Partner connection: `apply-relationship-fix.sql`

## Storage Setup

Create a storage bucket for memory photos:

1. Go to **Storage** in Supabase Dashboard
2. Create a new bucket named `memories`
3. Set bucket to **Private** (RLS will control access)
4. Configure RLS policies for the bucket if needed

## Environment Variables

Required variables for your deployment (Vercel, etc.):

```env
VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important:**
- Use the API URL, NOT the dashboard URL
- Get these from: Settings → API in Supabase Dashboard
- Redeploy after setting variables

## Troubleshooting

### "No session returned from signup"

**Cause:** Email confirmation is still enabled
**Fix:** Follow the "Disable Email Confirmation" steps above

### "new row violates row-level security policy"

**Cause:** RLS policies not applied or session not set
**Fix:**
1. Apply migration `006_fix_onboarding_responses_rls.sql`
2. Ensure email confirmation is disabled
3. Check that session is being set in console logs

### "Failed to load resource: 401"

**Cause:** No authenticated session
**Fix:** Disable email confirmation (see above)

### User created but can't complete onboarding

**Cause:** User was created with email confirmation enabled
**Fix:**
1. Disable email confirmation
2. Delete the test user from Authentication → Users
3. Try signup again with a new email

### Partner connection shows "Successfully connected" but still says "Waiting for partner"

**Cause:** Relationship UPDATE policy not applied (migration 007)
**Fix:**

1. **Apply the migration** in Supabase SQL Editor:
   ```sql
   DROP POLICY IF EXISTS "Users can update their relationships" ON public.relationships;
   
   CREATE POLICY "Users can update their relationships"
     ON public.relationships FOR UPDATE
     USING (
       auth.uid() = partner_a_id OR 
       auth.uid() = partner_b_id OR
       (partner_b_id IS NULL AND auth.role() = 'authenticated')
     );
   ```

2. **Verify the policy is updated**:
   - Run `debug-relationship-policy.sql` in SQL Editor
   - Check that "Users can update their relationships" policy exists
   - The `qual` or `with_check` column should include `partner_b_id IS NULL`

3. **Check browser console** when connecting:
   - Should see: `✅ Successfully connected partner!`
   - If you see: `❌ Failed to update relationship` → policy not applied
   - If you see RLS error → run the migration above

4. **Refresh the page** after connecting to update the UI

5. **Clear existing test relationships**:
   ```sql
   -- In Supabase SQL Editor
   DELETE FROM relationships WHERE partner_b_id IS NULL;
   ```
   Then try connecting again from scratch

## Additional Settings (Optional)

### Auto-confirm users (Alternative)

If you need email validation but want to skip confirmation for testing:

1. Go to **Authentication** → **Providers** → **Email**
2. Enable **"Enable custom access token hook"** if you want to auto-confirm via Edge Function
3. Or manually confirm users in Dashboard → Authentication → Users

### Session Settings

Recommended settings in **Authentication** → **Settings**:

- **JWT Expiry:** 3600 (1 hour) - Default is fine
- **Refresh Token Rotation:** Enabled (default)
- **Reuse Interval:** 10 seconds (default)

## Production Checklist

- [ ] Email confirmation is DISABLED
- [ ] All 7 migrations have been run (including 007 for partner connection)
- [ ] Storage bucket `memories` created
- [ ] Environment variables set in production
- [ ] Test signup flow works end-to-end
- [ ] Test onboarding save completes successfully
- [ ] Test partner connection works (shows "Connected" status)
- [ ] Check console logs for session and connection confirmation messages

## Debugging Partner Connection

If partners can't connect, check these in order:

1. **Console logs** - Open F12 and look for:
   - `✅ Successfully connected partner!` = Working
   - `❌ Failed to update relationship` = Policy issue
   - RLS error code 42501 = Migration 007 not applied

2. **Database state** - Run in SQL Editor:
   ```sql
   SELECT id, partner_a_id, partner_b_id, invite_code, connected_at
   FROM relationships;
   ```
   - If `partner_b_id` is NULL after connecting → Policy blocked update
   - If `partner_b_id` is filled → Connection worked

3. **RLS policies** - Run `debug-relationship-policy.sql` to verify policies

4. **Start fresh**:
   - Delete test relationships
   - Create new invite code
   - Try connecting again
   - Watch console logs
