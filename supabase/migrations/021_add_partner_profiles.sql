-- Migration: Partner Profile System
-- Description: Add partner profiles, relationship needs, and AI suggestion tracking
-- Date: 2026-01-02

-- =====================================================
-- PARTNER PROFILES TABLE
-- =====================================================
CREATE TABLE partner_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES relationships(id) ON DELETE CASCADE,

  -- Love Language (primary and secondary)
  love_language_primary TEXT NOT NULL CHECK (love_language_primary IN ('words', 'quality_time', 'gifts', 'acts', 'touch')),
  love_language_secondary TEXT CHECK (love_language_secondary IN ('words', 'quality_time', 'gifts', 'acts', 'touch')),

  -- Communication Style
  communication_style TEXT NOT NULL CHECK (communication_style IN ('direct', 'gentle', 'playful', 'reserved')) DEFAULT 'gentle',

  -- Emotional Needs When Stressed (array)
  stress_needs JSONB NOT NULL DEFAULT '[]',

  -- Connection Frequency Preference
  frequency_preference TEXT NOT NULL CHECK (frequency_preference IN ('high_touch', 'moderate', 'low_touch')) DEFAULT 'moderate',
  daily_checkins_enabled BOOLEAN DEFAULT true,
  preferred_checkin_times TEXT[] DEFAULT ARRAY['evening']::TEXT[],

  -- Custom Learning Inputs (user-taught rules)
  custom_preferences JSONB DEFAULT '[]',

  -- Behavioral Learning (system-learned patterns)
  learned_patterns JSONB DEFAULT '{}',

  -- Engagement score (0-100, adapts over time)
  engagement_score INTEGER DEFAULT 50 CHECK (engagement_score >= 0 AND engagement_score <= 100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX idx_partner_profiles_user_id ON partner_profiles(user_id);
CREATE INDEX idx_partner_profiles_couple_id ON partner_profiles(couple_id);

-- RLS policies
ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON partner_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON partner_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON partner_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their partner's profile (same couple)
CREATE POLICY "Users can view partner profile"
  ON partner_profiles FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM relationships
      WHERE partner_a_id = auth.uid() OR partner_b_id = auth.uid()
    )
  );

-- =====================================================
-- RELATIONSHIP NEEDS TABLE
-- =====================================================
CREATE TABLE relationship_needs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What's missing
  need_category TEXT NOT NULL CHECK (need_category IN (
    'communication', 'affection', 'quality_time', 'reassurance',
    'support', 'space', 'appreciation', 'understanding',
    'consistency', 'physical_intimacy', 'fun', 'other'
  )),
  custom_category TEXT, -- If category = 'other'
  context TEXT CHECK (char_length(context) <= 300), -- Optional 1-2 sentences
  urgency TEXT NOT NULL CHECK (urgency IN ('not_urgent', 'would_help', 'important')) DEFAULT 'would_help',

  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'resolved', 'expired')) DEFAULT 'pending',

  -- AI-generated suggestion (JSONB for flexibility)
  ai_suggestion JSONB,

  -- Privacy
  show_raw_need_to_partner BOOLEAN DEFAULT false, -- Usually false - show AI translation instead

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') -- Auto-expire after 7 days
);

-- Indexes
CREATE INDEX idx_relationship_needs_couple_id ON relationship_needs(couple_id);
CREATE INDEX idx_relationship_needs_requester_id ON relationship_needs(requester_id);
CREATE INDEX idx_relationship_needs_receiver_id ON relationship_needs(receiver_id);
CREATE INDEX idx_relationship_needs_status ON relationship_needs(status);
CREATE INDEX idx_relationship_needs_created_at ON relationship_needs(created_at DESC);

-- RLS policies
ALTER TABLE relationship_needs ENABLE ROW LEVEL SECURITY;

-- Users can view needs where they are requester or receiver
CREATE POLICY "Users can view their needs"
  ON relationship_needs FOR SELECT
  USING (requester_id = auth.uid() OR receiver_id = auth.uid());

-- Users can insert needs where they are the requester
CREATE POLICY "Users can create needs"
  ON relationship_needs FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- Users can update needs where they are involved
CREATE POLICY "Users can update their needs"
  ON relationship_needs FOR UPDATE
  USING (requester_id = auth.uid() OR receiver_id = auth.uid());

-- =====================================================
-- MESSAGE SUGGESTIONS TABLE (for tracking & learning)
-- =====================================================
CREATE TABLE message_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Suggestion metadata
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
    'reassurance', 'affection', 'quality_time', 'appreciation',
    'support', 'celebration', 'reconnection', 'check_in'
  )),

  -- Generated messages (array of MessageSuggestion objects)
  generated_messages JSONB NOT NULL,

  -- Context that led to suggestion
  context JSONB NOT NULL,

  -- Tracking
  was_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  used_message_id TEXT, -- Which suggestion was actually used
  modified_message TEXT, -- If user modified the suggestion

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_message_suggestions_sender_id ON message_suggestions(sender_id);
CREATE INDEX idx_message_suggestions_receiver_id ON message_suggestions(receiver_id);
CREATE INDEX idx_message_suggestions_type ON message_suggestions(suggestion_type);
CREATE INDEX idx_message_suggestions_created_at ON message_suggestions(created_at DESC);
CREATE INDEX idx_message_suggestions_was_used ON message_suggestions(was_used);

-- RLS policies
ALTER TABLE message_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view their own suggestions
CREATE POLICY "Users can view own suggestions"
  ON message_suggestions FOR SELECT
  USING (sender_id = auth.uid());

-- Users can insert their own suggestions
CREATE POLICY "Users can insert suggestions"
  ON message_suggestions FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Users can update their own suggestions
CREATE POLICY "Users can update own suggestions"
  ON message_suggestions FOR UPDATE
  USING (sender_id = auth.uid());

-- =====================================================
-- LEARNING EVENTS TABLE (track what works)
-- =====================================================
CREATE TABLE learning_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'suggestion_accepted', 'suggestion_skipped', 'suggestion_modified', 'suggestion_dismissed',
    'message_sent', 'date_completed', 'daily_question_answered',
    'gift_sent', 'need_submitted', 'custom_preference_added',
    'checkin_completed', 'feature_engaged'
  )),

  -- Context (what was the suggestion, what love language, etc.)
  context JSONB NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_learning_events_user_id ON learning_events(user_id);
CREATE INDEX idx_learning_events_type ON learning_events(event_type);
CREATE INDEX idx_learning_events_created_at ON learning_events(created_at DESC);

-- RLS policies
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own learning events
CREATE POLICY "Users can view own events"
  ON learning_events FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own events
CREATE POLICY "Users can insert events"
  ON learning_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- QUIET MODE TABLE (track when users need space)
-- =====================================================
CREATE TABLE quiet_mode (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Is quiet mode active?
  active BOOLEAN DEFAULT false,

  -- Reason for quiet mode
  reason TEXT CHECK (reason IN ('user_requested', 'stress_detected', 'low_engagement', 'partner_requested_space')),

  -- Timing
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,

  -- Allow emergency messages even in quiet mode?
  allow_emergency_messages BOOLEAN DEFAULT true,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE quiet_mode ENABLE ROW LEVEL SECURITY;

-- Users can view their own quiet mode status
CREATE POLICY "Users can view own quiet mode"
  ON quiet_mode FOR SELECT
  USING (user_id = auth.uid());

-- Users can manage their own quiet mode
CREATE POLICY "Users can manage quiet mode"
  ON quiet_mode FOR ALL
  USING (user_id = auth.uid());

-- Partners can view each other's quiet mode (to respect boundaries)
CREATE POLICY "Partners can view partner quiet mode"
  ON quiet_mode FOR SELECT
  USING (
    user_id IN (
      SELECT partner_a_id FROM relationships WHERE partner_b_id = auth.uid()
      UNION
      SELECT partner_b_id FROM relationships WHERE partner_a_id = auth.uid()
    )
  );

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

-- Trigger to update updated_at on partner_profiles
CREATE OR REPLACE FUNCTION update_partner_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_partner_profile_updated
BEFORE UPDATE ON partner_profiles
FOR EACH ROW
EXECUTE FUNCTION update_partner_profile_timestamp();

-- Trigger to update updated_at on quiet_mode
CREATE TRIGGER trigger_quiet_mode_updated
BEFORE UPDATE ON quiet_mode
FOR EACH ROW
EXECUTE FUNCTION update_partner_profile_timestamp();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get partner's profile
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
  SELECT pp.id, pp.user_id, pp.love_language_primary, pp.love_language_secondary,
         pp.communication_style, pp.stress_needs, pp.frequency_preference
  FROM partner_profiles pp
  JOIN relationships c ON pp.couple_id = c.id
  WHERE (c.partner_a_id = p_user_id AND pp.user_id = c.partner_b_id)
     OR (c.partner_b_id = p_user_id AND pp.user_id = c.partner_a_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if quiet mode is active
CREATE OR REPLACE FUNCTION is_quiet_mode_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_active BOOLEAN;
  v_ends_at TIMESTAMPTZ;
BEGIN
  SELECT active, ends_at INTO v_active, v_ends_at
  FROM quiet_mode
  WHERE user_id = p_user_id;

  -- If no record, not in quiet mode
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- If active is false, not in quiet mode
  IF NOT v_active THEN
    RETURN false;
  END IF;

  -- If ends_at is set and has passed, deactivate and return false
  IF v_ends_at IS NOT NULL AND v_ends_at < NOW() THEN
    UPDATE quiet_mode SET active = false WHERE user_id = p_user_id;
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE partner_profiles IS 'Core personalization engine storing each user''s love language, communication preferences, and learned patterns';
COMMENT ON TABLE relationship_needs IS 'User-submitted needs ("What feels missing?") with AI-generated suggestions for partners';
COMMENT ON TABLE message_suggestions IS 'AI-generated message suggestions with usage tracking for learning';
COMMENT ON TABLE learning_events IS 'Behavioral tracking to improve suggestions over time';
COMMENT ON TABLE quiet_mode IS 'Tracks when users need reduced prompts and notifications';
