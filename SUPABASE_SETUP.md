# Supabase Setup Guide

Your Supabase project is configured! Here's what you need to do:

## 1. Run Database Migrations

Go to your Supabase dashboard → SQL Editor and run these migrations in order:

### Migration 1: Initial Schema
Copy and paste the contents of `supabase/migrations/001_initial_schema.sql` into the SQL Editor and run it.

### Migration 2: RLS Policies
Copy and paste the contents of `supabase/migrations/002_rls_policies.sql` into the SQL Editor and run it.

## 2. Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Click "New bucket"
3. Name it: `memories`
4. Make it **public** (or configure RLS policies for it)
5. Click "Create bucket"

## 3. Environment Variables

Your `.env` file is already configured with:
- `VITE_SUPABASE_URL=https://vaxcujmbynxgxuhonyyp.supabase.co`
- `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 4. Restart Development Server

After running migrations, restart your dev server:
```bash
npm run dev
```

## 5. Test the Connection

1. Sign up for a new account
2. Complete onboarding
3. Create a relationship invite code
4. Connect with your partner

## Troubleshooting

If you see errors:
- Make sure migrations ran successfully
- Check that the storage bucket `memories` exists
- Verify environment variables are loaded (restart dev server)
- Check browser console for specific error messages

