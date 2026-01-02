# Database Migration Instructions

## New Tables Required

The comprehensive onboarding system requires 3 new database migrations:
- `021_add_partner_profiles.sql` - Partner profiles, needs tracking, AI suggestions
- `022_add_graduation_system.sql` - 26-week graduation tracking
- `023_add_partner_profile_guesses.sql` - Solo mode partner guesses

## How to Apply Migrations to Supabase

### Method 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **+ New query**
5. Copy and paste the contents of each migration file **in order**:
   - First: `supabase/migrations/021_add_partner_profiles.sql`
   - Second: `supabase/migrations/022_add_graduation_system.sql`
   - Third: `supabase/migrations/023_add_partner_profile_guesses.sql`
6. Click **Run** for each migration

### Method 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link your project (one time)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## Verify Migrations

After running, verify the tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('partner_profiles', 'couple_graduations', 'partner_profile_guesses');
```

You should see all 3 tables listed.

## Alternative: Temporary Fix

If you can't run migrations right now, you can temporarily use the legacy onboarding by changing line 53 in `src/app/components/RelationshipModeSetup.tsx`:

```typescript
// Change this:
onNavigate('profile-onboarding');

// To this (temporarily):
onNavigate('onboarding');
```

This will use the simple 4-slide onboarding until you can apply the migrations.
