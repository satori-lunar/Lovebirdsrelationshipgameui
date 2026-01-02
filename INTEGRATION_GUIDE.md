# Quick Integration Guide

## ✅ What's Already Done

1. **App.tsx Updated** - New views added to AppState type
2. **Components Imported** - All new components imported
3. **Views Added** - relationship-mode-setup, solo-mode-setup, partner-insights-form
4. **Utility Created** - `/src/app/utils/index.ts` with createPageUrl()

## 🔧 Components Need Navigation Fix

The new components currently use `useNavigate` from react-router-dom, but your app uses state-based routing. Here's how to fix each:

### Option 1: Quick Fix - Update Components to Use Custom Events

Add this to App.tsx to listen for navigation events:

```typescript
// In App.tsx, add this useEffect
useEffect(() => {
  const handleNavigateEvent = (event: CustomEvent) => {
    setCurrentView(event.detail as AppState);
  };

  window.addEventListener('navigate', handleNavigateEvent as EventListener);
  return () => window.removeEventListener('navigate', handleNavigateEvent as EventListener);
}, []);
```

### Option 2: Pass Navigation Callbacks (Recommended)

Update component signatures to accept `onNavigate` callback:

**RelationshipModeSetup.tsx**:
```typescript
export default function RelationshipModeSetup({ onNavigate }: { onNavigate: (view: string) => void }) {
  // Replace navigate() calls with:
  onNavigate('solo-mode-setup'); // or 'onboarding' for shared mode
}
```

**SoloModeSetup.tsx**:
```typescript
export default function SoloModeSetup({ onNavigate }: { onNavigate: (view: string) => void }) {
  // Replace navigate() calls with:
  onNavigate('home');
}
```

**PartnerInsightsForm.tsx**:
```typescript
// This one is standalone and doesn't navigate, so it's fine as-is
```

Then update App.tsx to pass the callback:

```typescript
{currentView === 'relationship-mode-setup' && user && (
  <RelationshipModeSetup onNavigate={handleNavigate} />
)}

{currentView === 'solo-mode-setup' && user && (
  <SoloModeSetup onNavigate={handleNavigate} />
)}
```

## 📊 Database Migration

### SQL Migration Script

Run this to add new fields to existing tables:

```sql
-- Add to Couple table
ALTER TABLE couples
  ADD COLUMN IF NOT EXISTS relationship_mode VARCHAR(10) DEFAULT 'shared',
  ADD COLUMN IF NOT EXISTS is_long_distance BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS partner2_location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS budget_preference VARCHAR(10) DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS partner_form_token VARCHAR(50),
  ADD COLUMN IF NOT EXISTS partner_form_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_form_submitted_at TIMESTAMP;

-- Add to PartnerProfile table
ALTER TABLE partner_profiles
  ADD COLUMN IF NOT EXISTS is_app_user BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create LongDistanceActivity table
CREATE TABLE IF NOT EXISTS long_distance_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  scheduled_date DATE NOT NULL,
  day_of_week VARCHAR(10),
  title VARCHAR(255) NOT NULL,
  prompt TEXT,
  partner1_completed BOOLEAN DEFAULT false,
  partner2_completed BOOLEAN DEFAULT false,
  partner1_response TEXT,
  partner2_response TEXT,
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ld_activities_couple ON long_distance_activities(couple_id);
CREATE INDEX IF NOT EXISTS idx_ld_activities_date ON long_distance_activities(scheduled_date);

-- Create PartnerFormResponse table
CREATE TABLE IF NOT EXISTS partner_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  form_token VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  love_languages JSONB,
  hobbies TEXT[],
  favorite_foods TEXT[],
  music_preferences TEXT[],
  preferred_dates TEXT[],
  appreciation_methods TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_form_couple ON partner_form_responses(couple_id);
CREATE INDEX IF NOT EXISTS idx_partner_form_token ON partner_form_responses(form_token);
```

## 🏠 Add Features to Home Component

Once navigation is fixed, add these components to your Home.tsx:

```typescript
import PartnerFormInvite from './PartnerFormInvite';
import WeeklyRhythm from './WeeklyRhythm';
import AsyncDateIdeas from './AsyncDateIdeas';
import LocationDateSuggestions from './LocationDateSuggestions';

// In Home component, conditionally render based on couple data:

{/* Solo Mode - Show partner form invite if not completed */}
{couple?.relationship_mode === 'solo' && !couple?.partner_form_completed && (
  <PartnerFormInvite couple={couple} />
)}

{/* Long Distance - Show weekly rhythm */}
{couple?.is_long_distance && (
  <div className="space-y-6">
    <WeeklyRhythm couple={couple} user={user} />
    <AsyncDateIdeas />
  </div>
)}

{/* Everyone - Show location-based suggestions */}
{couple && partnerProfile && (
  <LocationDateSuggestions
    couple={couple}
    partnerProfile={partnerProfile}
  />
)}
```

## 🧪 Testing Checklist

1. [ ] Sign up flow goes to relationship-mode-setup
2. [ ] Shared mode goes to existing onboarding
3. [ ] Solo mode goes to solo-mode-setup
4. [ ] Solo mode setup creates couple with relationship_mode='solo'
5. [ ] Partner form is accessible via token link
6. [ ] Partner form submission updates couple record
7. [ ] Home shows PartnerFormInvite for solo mode
8. [ ] Long-distance toggle works
9. [ ] Weekly rhythm generates activities
10. [ ] Location suggestions personalize correctly

## 🚀 Quick Start Commands

```bash
# Run database migrations
psql -d your_database -f migration.sql

# Test the flow
npm run dev

# Build
npm run build
```

## 📝 Next Steps

1. Fix navigation in components (Option 1 or 2 above)
2. Run database migration
3. Test signup flow
4. Add components to Home
5. Test all three modes

## 🐛 Common Issues

**Issue**: Components don't navigate
**Fix**: Implement Option 1 or 2 above

**Issue**: Database errors
**Fix**: Run migration script, check table names match your schema

**Issue**: Partner form not loading
**Fix**: Make sure partner-insights-form view is accessible without authentication

**Issue**: Home components not showing
**Fix**: Check couple and partnerProfile data is loaded in Home component
