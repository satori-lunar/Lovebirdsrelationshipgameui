-- Relationship Modes & Long-Distance Features Migration
-- Run this script to add new fields and tables for the relationship modes feature

-- =============================================================================
-- 1. UPDATE COUPLES TABLE
-- =============================================================================

-- Add relationship mode fields
ALTER TABLE couples
  ADD COLUMN IF NOT EXISTS relationship_mode VARCHAR(10) DEFAULT 'shared',
  ADD COLUMN IF NOT EXISTS is_long_distance BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS partner2_location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS budget_preference VARCHAR(10) DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS partner_form_token VARCHAR(50),
  ADD COLUMN IF NOT EXISTS partner_form_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_form_submitted_at TIMESTAMP;

-- Add check constraints (with existence checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_relationship_mode'
  ) THEN
    ALTER TABLE couples
      ADD CONSTRAINT check_relationship_mode
      CHECK (relationship_mode IN ('shared', 'solo'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_budget_preference'
  ) THEN
    ALTER TABLE couples
      ADD CONSTRAINT check_budget_preference
      CHECK (budget_preference IN ('low', 'moderate', 'high'));
  END IF;
END $$;

-- Create index for form token lookups
CREATE INDEX IF NOT EXISTS idx_couples_form_token ON couples(partner_form_token);

-- =============================================================================
-- 2. UPDATE PARTNER_PROFILES TABLE
-- =============================================================================

-- Add solo mode support fields
ALTER TABLE partner_profiles
  ADD COLUMN IF NOT EXISTS is_app_user BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- =============================================================================
-- 3. CREATE LONG_DISTANCE_ACTIVITIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS long_distance_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
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

-- Add check constraints (with existence checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_activity_type'
  ) THEN
    ALTER TABLE long_distance_activities
      ADD CONSTRAINT check_activity_type
      CHECK (activity_type IN (
        'daily_question',
        'encouragement',
        'virtual_date',
        'voice_note_prompt',
        'photo_challenge',
        'send_question',
        'memory_share',
        'gratitude_prompt',
        'check_in'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_day_of_week'
  ) THEN
    ALTER TABLE long_distance_activities
      ADD CONSTRAINT check_day_of_week
      CHECK (day_of_week IN (
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
      ));
  END IF;
END $$;

-- Create indexes for long_distance_activities
CREATE INDEX IF NOT EXISTS idx_ld_activities_couple ON long_distance_activities(couple_id);
CREATE INDEX IF NOT EXISTS idx_ld_activities_date ON long_distance_activities(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_ld_activities_type ON long_distance_activities(activity_type);

-- =============================================================================
-- 4. CREATE PARTNER_FORM_RESPONSES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS partner_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
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

-- Create indexes for partner_form_responses
CREATE INDEX IF NOT EXISTS idx_partner_form_couple ON partner_form_responses(couple_id);
CREATE INDEX IF NOT EXISTS idx_partner_form_token ON partner_form_responses(form_token);

-- =============================================================================
-- 5. CREATE TRIGGER FOR PARTNER FORM COMPLETION
-- =============================================================================

-- Function to update couple record when partner form is submitted
CREATE OR REPLACE FUNCTION update_couple_on_form_submission()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE couples
  SET
    partner_form_completed = true,
    partner_form_submitted_at = NOW()
  WHERE id = NEW.couple_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_couple_on_form ON partner_form_responses;
CREATE TRIGGER trigger_update_couple_on_form
  AFTER INSERT ON partner_form_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_couple_on_form_submission();

-- =============================================================================
-- 6. MIGRATION COMPLETE
-- =============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'New tables created: long_distance_activities, partner_form_responses';
  RAISE NOTICE 'Updated tables: couples, partner_profiles';
  RAISE NOTICE 'Triggers created: trigger_update_couple_on_form';
END $$;
