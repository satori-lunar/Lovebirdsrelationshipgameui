# Troubleshooting Guide

## "Failed to fetch" Error on Sign Up

This error typically means the app cannot connect to Supabase. Here's how to fix it:

### 1. Check Environment Variables in Vercel

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Verify these exact variable names:**
- `VITE_SUPABASE_URL` (not `SUPABASE_URL` - must start with `VITE_`)
- `VITE_SUPABASE_ANON_KEY` (not `SUPABASE_ANON_KEY` - must start with `VITE_`)

**Check the values:**
- `VITE_SUPABASE_URL` should be: `https://vaxcujmbynxgxuhonyyp.supabase.co`
- `VITE_SUPABASE_ANON_KEY` should be your full anon key (starts with `eyJhbGci...`)

**Important:**
- ✅ Make sure variables are enabled for **Production** environment
- ✅ No extra spaces before/after values
- ✅ Values are exactly as shown above
- ✅ After adding/changing variables, **redeploy** your app

### 2. Verify Supabase Project is Active

1. Go to [supabase.com](https://supabase.com)
2. Check your project status
3. Make sure it's not paused
4. Verify the project URL matches: `vaxcujmbynxgxuhonyyp`

### 3. Check Browser Console

1. Open your deployed app
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for:
   - "Environment check" log - should show both variables as "✓ Set"
   - Any red error messages
   - Network errors in the Network tab

### 4. Common Issues

**Issue:** Variables not loading
- **Fix:** Make sure variable names start with `VITE_`
- **Fix:** Redeploy after adding variables

**Issue:** Wrong Supabase URL
- **Fix:** Double-check the URL in Supabase dashboard → Settings → API
- **Fix:** Make sure it starts with `https://` and ends with `.supabase.co`

**Issue:** CORS errors
- **Fix:** Supabase handles CORS automatically, but check your Supabase project settings
- **Fix:** Make sure your Vercel domain is allowed (usually auto-allowed)

**Issue:** Database tables don't exist
- **Fix:** Run the migrations (see `SUPABASE_SETUP.md`)
- **Note:** Sign up will still work, but user profile creation will be skipped until migrations are run

### 5. Test Steps

1. **Check console logs:**
   ```
   Open browser console → Look for "Environment check"
   Should see: hasSupabaseUrl: true, hasSupabaseKey: true
   ```

2. **Test sign up:**
   - Try signing up with a test email
   - Check for specific error messages
   - Check Network tab for failed requests

3. **Verify in Vercel:**
   - Go to Deployments → Latest deployment → Build Logs
   - Check for any build errors
   - Verify environment variables are shown (values are hidden, but names should appear)

### 6. Still Not Working?

If you've checked everything above:

1. **Double-check environment variables:**
   - Copy the exact values from your `.env` file
   - Paste them into Vercel (no extra spaces)
   - Make sure they're enabled for Production

2. **Try redeploying:**
   - Go to Deployments
   - Click "Redeploy" on the latest deployment
   - Wait for build to complete

3. **Check Supabase logs:**
   - Go to Supabase Dashboard → Logs
   - Check for any errors or blocked requests

4. **Test locally:**
   - Run `npm run dev` locally
   - Try signing up
   - If it works locally but not on Vercel, it's an environment variable issue

### Quick Checklist

- [ ] Environment variables set in Vercel
- [ ] Variable names start with `VITE_`
- [ ] Variables enabled for Production
- [ ] Values are correct (no spaces)
- [ ] App redeployed after setting variables
- [ ] Supabase project is active
- [ ] Browser console shows variables loaded
- [ ] No CORS errors in console

