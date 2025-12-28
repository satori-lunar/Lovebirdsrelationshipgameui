# Vercel Deployment Setup Guide

## Quick Setup Steps

1. **Push your code to GitHub** (if not already done)
   ```bash
   git push origin main
   ```

2. **Import your project to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite/React settings

3. **Configure Environment Variables**
   - In your Vercel project dashboard, go to **Settings** → **Environment Variables**
   - Add these two variables:

   | Variable Name | Value |
   |--------------|-------|
   | `VITE_SUPABASE_URL` | `https://vaxcujmbynxgxuhonyyp.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheGN1am1ieW5neGd1aG9ueXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4ODE5MjgsImV4cCI6MjA4MjQ1NzkyOH0.OQc_5NAEAaLE74Ra0yNNIhPh-mTLjflX6CGeGwPjYb0` |

   - **Important:** Select all environments (Production, Preview, Development)
   - Click "Save"

4. **Redeploy**
   - After adding environment variables, go to **Deployments**
   - Click the three dots (⋯) on your latest deployment
   - Click "Redeploy"
   - Or push a new commit to trigger automatic deployment

5. **Verify Deployment**
   - Your app should now connect to Supabase
   - Test sign up/sign in functionality
   - Make sure database migrations are run (see `SUPABASE_SETUP.md`)

## Troubleshooting

**App shows blank screen after deployment:**
- Verify environment variables are set correctly
- Check that variables are enabled for Production environment
- Redeploy after adding variables

**Supabase connection errors:**
- Verify your Supabase project is active
- Check that database migrations have been run
- Review browser console for specific error messages

**Build fails:**
- Check Vercel build logs for errors
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

