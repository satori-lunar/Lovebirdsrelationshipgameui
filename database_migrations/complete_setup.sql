-- Complete Database Setup for Relationship Modes Feature
-- Creates all tables from scratch including base tables and new features

-- =============================================================================
-- 1. CREATE COUPLES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner1_email VARCHAR(255) NOT NULL,
  partner1_name VARCHAR(255),
  partner2_email VARCHAR(255),
  partner2_name VARCHAR(255),

  -- Relationship mode fields
  relationship_mode VARCHAR(10) DEFAULT 'shared',
  is_long_distance BOOLEAN DEFAULT false,
  location VARCHAR(255),
  partner2_location VARCHAR(255),
  budget_preference VARCHAR(10) DEFAULT 'moderate',

  -- Partner form fields
  partner_form_token VARCHAR(50),
  partner_form_completed BOOLEAN DEFAULT false,
  partner_form_submitted_at TIMESTAMP,

  -- Relationship data
  relationship_start_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_relationship_mode CHECK (relationship_mode IN ('shared', 'solo')),
  CONSTRAINT check_budget_preference CHECK (budget_preference IN ('low', 'moderate', 'high'))
);

-- Create indexes for couples
CREATE INDEX IF NOT EXISTS idx_couples_partner1_email ON couples(partner1_email);
CREATE INDEX IF NOT EXISTS idx_couples_partner2_email ON couples(partner2_email);
CREATE INDEX IF NOT EXISTS idx_couples_form_token ON couples(partner_form_token);

-- =============================================================================
-- 2. CREATE PARTNER_PROFILES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS partner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_email VARCHAR(255),
  display_name VARCHAR(255),
  nickname VARCHAR(255),

  -- Solo mode support
  is_app_user BOOLEAN DEFAULT true,
  notes TEXT,

  -- Profile data
  love_language_primary VARCHAR(50),
  interests TEXT[],
  is_profile_complete BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for partner_profiles
CREATE INDEX IF NOT EXISTS idx_partner_profiles_couple ON partner_profiles(couple_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_email ON partner_profiles(user_email);

-- =============================================================================
-- 3. CREATE LONG_DISTANCE_ACTIVITIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS long_distance_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,

  -- Activity details
  activity_type VARCHAR(50) NOT NULL,
  scheduled_date DATE NOT NULL,
  day_of_week VARCHAR(10),
  title VARCHAR(255) NOT NULL,
  prompt TEXT,

  -- Completion tracking
  partner1_completed BOOLEAN DEFAULT false,
  partner2_completed BOOLEAN DEFAULT false,
  partner1_response TEXT,
  partner2_response TEXT,

  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_activity_type CHECK (activity_type IN (
    'daily_question',
    'encouragement',
    'virtual_date',
    'voice_note_prompt',
    'photo_challenge',
    'send_question',
    'memory_share',
    'gratitude_prompt',
    'check_in'
  )),
  CONSTRAINT check_day_of_week CHECK (day_of_week IN (
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday'
  ))
);

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

  -- Form data
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
-- 5. CREATE PARTNER_MESSAGES TABLE (Love Messages)
-- =============================================================================

CREATE TABLE IF NOT EXISTS partner_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message_text TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'message',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_message_type CHECK (message_type IN (
    'message',
    'miss_you',
    'thinking_of_you',
    'love_note',
    'compliment'
  ))
);

-- Create indexes for partner_messages
CREATE INDEX IF NOT EXISTS idx_partner_messages_receiver ON partner_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_partner_messages_sender ON partner_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_partner_messages_created ON partner_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_partner_messages_read ON partner_messages(read);

-- =============================================================================
-- 6. CREATE CAPACITY CHECK-INS TABLE (My Capacity Today)
-- =============================================================================

CREATE TABLE IF NOT EXISTS capacity_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,

  -- Mood tracking
  mood VARCHAR(20) NOT NULL,

  -- Needs/preferences (array of selected needs)
  needs TEXT[],

  -- Optional context (limited to 140 chars in UI)
  context TEXT,

  -- Visibility for partner
  visible_to_partner BOOLEAN DEFAULT true,
  partner_viewed BOOLEAN DEFAULT false,
  partner_viewed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_mood CHECK (mood IN (
    'good',
    'okay',
    'low',
    'overwhelmed',
    'sad',
    'numb'
  ))
);

-- Create indexes for capacity_checkins
CREATE INDEX IF NOT EXISTS idx_capacity_checkins_user ON capacity_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_capacity_checkins_couple ON capacity_checkins(couple_id);
CREATE INDEX IF NOT EXISTS idx_capacity_checkins_date ON capacity_checkins(created_at);

-- =============================================================================
-- 7. ADD EMOTIONAL PREFERENCES TO PARTNER_PROFILES
-- =============================================================================

-- Add emotional support preferences columns
ALTER TABLE partner_profiles
  ADD COLUMN IF NOT EXISTS when_low_helps JSONB,
  ADD COLUMN IF NOT EXISTS when_low_avoid JSONB;

-- when_low_helps example: ["physical_closeness", "quiet_presence", "distraction"]
-- when_low_avoid example: ["too_many_questions", "being_told_cheer_up", "silence"]

-- =============================================================================
-- 8. CREATE TRIGGERS
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

-- Create trigger for partner form completion
DROP TRIGGER IF EXISTS trigger_update_couple_on_form ON partner_form_responses;
CREATE TRIGGER trigger_update_couple_on_form
  AFTER INSERT ON partner_form_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_couple_on_form_submission();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_couples_updated_at ON couples;
CREATE TRIGGER update_couples_updated_at
  BEFORE UPDATE ON couples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_profiles_updated_at ON partner_profiles;
CREATE TRIGGER update_partner_profiles_updated_at
  BEFORE UPDATE ON partner_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. SETUP COMPLETE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database setup completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - couples (with relationship_mode, is_long_distance, etc.)';
  RAISE NOTICE '  - partner_profiles (with emotional preferences)';
  RAISE NOTICE '  - long_distance_activities';
  RAISE NOTICE '  - partner_form_responses';
  RAISE NOTICE '  - partner_messages (love messages)';
  RAISE NOTICE '  - capacity_checkins (My Capacity Today)';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers created:';
  RAISE NOTICE '  - trigger_update_couple_on_form';
  RAISE NOTICE '  - update_couples_updated_at';
  RAISE NOTICE '  - update_partner_profiles_updated_at';
  RAISE NOTICE '';
  RAISE NOTICE 'Your database is ready! 🎉';
END $$;
