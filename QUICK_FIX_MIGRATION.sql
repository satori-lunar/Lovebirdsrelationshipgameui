-- Simplified Partner Profiles Migration
-- Run this directly in Supabase SQL Editor
-- This version is safe to run even if tables exist

-- =====================================================
-- STEP 1: Ensure partner_profiles table exists with correct structure
-- =====================================================

-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS partner_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES relationships(id) ON DELETE CASCADE,

  love_language_primary TEXT NOT NULL CHECK (love_language_primary IN ('words', 'quality_time', 'gifts', 'acts', 'touch')),
  love_language_secondary TEXT CHECK (love_language_secondary IN ('words', 'quality_time', 'gifts', 'acts', 'touch')),

  communication_style TEXT NOT NULL CHECK (communication_style IN ('direct', 'gentle', 'playful', 'reserved')) DEFAULT 'gentle',

  stress_needs JSONB NOT NULL DEFAULT '[]',

  frequency_preference TEXT NOT NULL CHECK (frequency_preference IN ('high_touch', 'moderate', 'low_touch')) DEFAULT 'moderate',
  daily_checkins_enabled BOOLEAN DEFAULT true,
  preferred_checkin_times TEXT[] DEFAULT ARRAY['evening']::TEXT[],

  custom_preferences JSONB DEFAULT '[]',
  learned_patterns JSONB DEFAULT '{}',
  engagement_score INTEGER DEFAULT 50 CHECK (engagement_score >= 0 AND engagement_score <= 100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_partner_profiles_user_id ON partner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_couple_id ON partner_profiles(couple_id);

-- Enable RLS
ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON partner_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON partner_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON partner_profiles;
DROP POLICY IF EXISTS "Users can view partner profile" ON partner_profiles;

-- Create RLS policies
CREATE POLICY "Users can view own profile"
  ON partner_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON partner_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON partner_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view partner profile"
  ON partner_profiles FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM relationships
      WHERE partner_a_id = auth.uid() OR partner_b_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 2: Add helper function
-- =====================================================

CREATE OR REPLACE FUNCTION get_partner_profile(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  love_language_primary TEXT,
  love_language_secondary TEXT,
  communication_style TEXT,
  stress_needs JSONB,
  frequency_preference TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.user_id,
    pp.love_language_primary,
    pp.love_language_secondary,
    pp.communication_style,
    pp.stress_needs,
    pp.frequency_preference
  FROM partner_profiles pp
  JOIN relationships r ON pp.couple_id = r.id
  WHERE (r.partner_a_id = p_user_id AND pp.user_id = r.partner_b_id)
     OR (r.partner_b_id = p_user_id AND pp.user_id = r.partner_a_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done! Test it:
SELECT COUNT(*) as partner_profile_count FROM partner_profiles;
