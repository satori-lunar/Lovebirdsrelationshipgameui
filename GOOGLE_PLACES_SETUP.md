# Google Places API Setup Guide

## Current Status
✅ **Backend is ready!** The code will work with mock/beta data until you add your API key.

🧪 **Beta Mode:** Right now, the app shows realistic mock venue data for testing.

🚀 **Production Ready:** Just add your API key and you'll get real venues with:
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
   - Choose **HTTP referrers (web sites)**
   - Add your domains:
     ```
     http://localhost:*
     https://yourdomain.com/*
     ```
3. Under **API restrictions**:
   - Choose **Restrict key**
   - Select only **Places API (New)**
4. Click **Save**

### 5. Add to Your Project
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your API key to `.env`:
   ```
   VITE_GOOGLE_PLACES_API_KEY=AIzaSy...your_key_here
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

That's it! The app will automatically start using real Google Places data.

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
- Verify API key is in `.env` file
- Make sure you restarted the dev server
- Check browser console for error messages

### "API key not valid"
- Ensure you're using **Places API (New)**, not the old "Places API"
- Check API restrictions allow your domain
- Verify the key is correctly copied to `.env`

### "Quota exceeded"
- Check your Google Cloud billing dashboard
- Verify billing is enabled (required even for free tier)
- Check you haven't exceeded the free $200/month

---

## Alternative: Keep Using Mock Data

If you prefer not to use Google Places API yet, that's fine! The mock data will continue to work. You can add the API key anytime in the future without changing any code.
