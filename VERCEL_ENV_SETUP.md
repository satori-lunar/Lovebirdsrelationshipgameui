# Vercel Environment Variables Setup

## ⚠️ CRITICAL: Correct Supabase URL Format

The Supabase URL must be the **API endpoint**, NOT the dashboard URL!

### ❌ WRONG (Dashboard URL):
```
https://supabase.com/dashboard/project/vaxcujmbyngxguhonyyp
```

### ✅ CORRECT (API URL):
```
https://vaxcujmbynxgxuhonyyp.supabase.co
```

## Step-by-Step Setup

### 1. Go to Vercel Dashboard
- Navigate to your project
- Click **Settings** → **Environment Variables**

### 2. Add Variable 1: VITE_SUPABASE_URL

**Name:** `VITE_SUPABASE_URL`

**Value:** `https://vaxcujmbynxgxuhonyyp.supabase.co`

**Important:** 
- Must start with `https://`
- Must end with `.supabase.co`
- Must NOT include `/dashboard` or `/project`
- This is the API endpoint, not the dashboard URL

**Environments:** ✅ Production ✅ Preview ✅ Development (check all)

### 3. Add Variable 2: VITE_SUPABASE_ANON_KEY

**Name:** `VITE_SUPABASE_ANON_KEY`

**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheGN1am1ieW5neGd1aG9ueXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4ODE5MjgsImV4cCI6MjA4MjQ1NzkyOH0.OQc_5NAEAaLE74Ra0yNNIhPh-mTLjflX6CGeGwPjYb0`

**Environments:** ✅ Production ✅ Preview ✅ Development (check all)

### 4. How to Find Your Correct Supabase URL

1. Go to [supabase.com](https://supabase.com)
2. Sign in and select your project
3. Go to **Settings** → **API**
4. Look for **Project URL** (not Dashboard URL)
5. It should look like: `https://[project-ref].supabase.co`
6. Copy that exact URL

### 5. Verify Your Settings

After adding variables, verify:
- ✅ Variable names start with `VITE_`
- ✅ No extra spaces before/after values
- ✅ All environments are checked (Production, Preview, Development)
- ✅ URL ends with `.supabase.co` (not `.com/dashboard`)
- ✅ URL starts with `https://`

### 6. Redeploy

After setting variables:
1. Go to **Deployments**
2. Click the three dots (⋯) on latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### 7. Test

After redeploy:
1. Open your app
2. Press F12 (open console)
3. Look for: `🔍 Supabase Configuration Check`
4. Should see: `VITE_SUPABASE_URL: ✓ Set (https://vaxcujmbynxgxuhonyyp...)`
5. Should see: `✅ Supabase connection test successful`

## Quick Reference

| Setting | Value |
|---------|-------|
| Variable Name 1 | `VITE_SUPABASE_URL` |
| Variable Value 1 | `https://vaxcujmbynxgxuhonyyp.supabase.co` |
| Variable Name 2 | `VITE_SUPABASE_ANON_KEY` |
| Variable Value 2 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full key) |

## Common Mistakes

❌ Using dashboard URL: `https://supabase.com/dashboard/project/...`  
✅ Use API URL: `https://[project-ref].supabase.co`

❌ Variable name without `VITE_` prefix  
✅ Must start with `VITE_`

❌ Only enabling for Preview  
✅ Enable for Production, Preview, AND Development

❌ Not redeploying after adding variables  
✅ Always redeploy after changes

