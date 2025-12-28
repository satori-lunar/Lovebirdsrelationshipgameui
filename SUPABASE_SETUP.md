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

### Local Development

Your `.env` file is already configured with:
- `VITE_SUPABASE_URL=https://vaxcujmbynxgxuhonyyp.supabase.co`
- `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Vercel Deployment

**You MUST configure these environment variables in Vercel for production:**

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

   **Variable Name:** `VITE_SUPABASE_URL`  
   **Value:** `https://vaxcujmbynxgxuhonyyp.supabase.co`  
   **Environment:** Production, Preview, Development (select all)

   **Variable Name:** `VITE_SUPABASE_ANON_KEY`  
   **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheGN1am1ieW5neGd1aG9ueXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4ODE5MjgsImV4cCI6MjA4MjQ1NzkyOH0.OQc_5NAEAaLE74Ra0yNNIhPh-mTLjflX6CGeGwPjYb0`  
   **Environment:** Production, Preview, Development (select all)

4. After adding the variables, **redeploy your application** for the changes to take effect

> **Note:** The anon key is safe to expose in client-side code. It's designed to be public and is restricted by Row Level Security (RLS) policies.

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

