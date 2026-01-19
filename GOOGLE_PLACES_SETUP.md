# Google Places API Setup Guide

## Current Status
✅ **Backend is ready!** The code will work with mock/beta data until you add your API key.

🧪 **Beta Mode:** Right now, the app shows realistic mock venue data for testing.

🔒 **Security:** API calls are now proxied through Vercel serverless functions (`/api/places`), which solves CORS issues and keeps your API key secure on the server.

🚀 **Production Ready:** Just add your API key to Vercel environment variables and you'll get real venues with:
- Real business names, addresses, and locations
- Google ratings and reviews
- Opening hours
- Price levels
- Photos

---

## Steps to Enable Real Venue Data

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing one)
3. Name it something like "Lovebirds-Dates"

### 2. Enable Places API
1. In your project, go to **APIs & Services** > **Library**
2. Search for **"Places API (New)"**
3. Click **Enable**

### 3. Create API Key
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy your new API key

### 4. Secure Your API Key (Important!)
1. Click on your API key to edit it
2. Under **Application restrictions**:
   - **Option 1 (Recommended for production):** Choose **IP addresses (web servers, cron jobs, etc.)**
     - Add Vercel's IP ranges (optional, or leave unrestricted for serverless functions)
   - **Option 2 (Easier for testing):** Choose **None** (for development/testing)
   - **Note:** Since API calls are now server-side, HTTP referrer restrictions won't work
3. Under **API restrictions**:
   - Choose **Restrict key**
   - Select only **Places API (New)** and **Places API** (for photo access)
4. Click **Save**

### 5. Add API Key to Vercel Environment Variables

**Important:** The API key is now stored server-side in Vercel environment variables to avoid CORS issues and keep it secure.

#### For Production (Vercel):

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name:** `GOOGLE_PLACES_API_KEY`
   - **Value:** Your Google Places API key (e.g., `AIzaSy...your_key_here`)
   - **Environments:** ✅ Production ✅ Preview ✅ Development
5. Click **Save**
6. **Redeploy** your application for changes to take effect

#### For Local Development:

1. Create a `.env.local` file in the project root:
   ```bash
   # On Windows PowerShell
   New-Item .env.local
   
   # On Mac/Linux
   touch .env.local
   ```

2. Add your API key to `.env.local`:
   ```
   GOOGLE_PLACES_API_KEY=AIzaSy...your_key_here
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

**Note:** The API key is now used by serverless functions (`/api/places` and `/api/places-photo`) which proxy requests to Google Places API. This solves CORS issues and keeps your API key secure.

That's it! The app will automatically use real Google Places data via the API proxy.

---

## Cost & Billing

### Free Tier
- **$200/month free credit** from Google (automatically applied)
- Covers ~6,250 venue searches per month for free

### Pricing After Free Tier
- **Nearby Search:** $0.032 per request
- **Place Details:** $0.017 per request (if we add this later)

### Example Usage
If you have **1,000 users per month**, each generating **3 date suggestions**:
- 3,000 searches × $0.032 = **$96/month**
- Still **within the free $200 credit!**

### Set Up Billing Alerts
1. In Google Cloud Console, go to **Billing** > **Budgets & alerts**
2. Create budget alert at $50, $100, $150

---

## Testing

### Without API Key (Current State)
You'll see mock venues like:
- "The Romantic Garden"
- "Cozy Coffee Corner"
- "Sunset Park"

These are realistic placeholders for development.

### With API Key
You'll see real venues from Google Maps:
- Actual restaurant names
- Real addresses
- Google ratings (e.g., 4.5 ⭐)
- Current opening hours
- Real photos

---

## Troubleshooting

### "No venues found"
- Check that Places API (New) is enabled
- Verify API key is set in Vercel environment variables (`GOOGLE_PLACES_API_KEY`)
- For local development, check `.env.local` file
- Make sure you redeployed after adding the environment variable
- Check browser console and Vercel function logs for error messages

### "CORS error" or "Failed to fetch"
- This should be fixed with the API proxy! If you still see this:
  - Ensure you've deployed the latest code with the `/api/places` endpoint
  - Check that `vercel.json` properly routes API calls
  - Verify the API proxy is accessible at `/api/places`

### "API key not valid" or "500 error from /api/places"
- Ensure you're using **Places API (New)**, not the old "Places API"
- Check API restrictions allow server-side usage (or remove restrictions for testing)
- Verify the key is correctly set in Vercel environment variables
- Check Vercel function logs for detailed error messages

### "Quota exceeded"
- Check your Google Cloud billing dashboard
- Verify billing is enabled (required even for free tier)
- Check you haven't exceeded the free $200/month

---

## Alternative: Keep Using Mock Data

If you prefer not to use Google Places API yet, that's fine! The mock data will continue to work. You can add the API key anytime in the future without changing any code.
