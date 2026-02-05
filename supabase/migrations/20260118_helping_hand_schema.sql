-- Helping Hand Feature Database Schema
-- This migration creates all tables for the Helping Hand feature

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: helping_hand_user_status
-- Tracks user's weekly capacity and availability
-- ============================================================================
CREATE TABLE IF NOT EXISTS helping_hand_user_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,

  -- Work & Time Availability
  work_schedule_type TEXT NOT NULL CHECK (work_schedule_type IN ('full_time', 'part_time', 'flexible', 'unemployed', 'student', 'shift_work')),
  work_hours_per_week INTEGER CHECK (work_hours_per_week >= 0 AND work_hours_per_week <= 168),
  available_time_level TEXT NOT NULL CHECK (available_time_level IN ('very_limited', 'limited', 'moderate', 'plenty')),
  busy_days JSONB DEFAULT '[]'::jsonb,

  -- Emotional Capacity
  emotional_capacity TEXT NOT NULL CHECK (emotional_capacity IN ('very_low', 'low', 'moderate', 'good', 'excellent')),
  stress_level TEXT NOT NULL CHECK (stress_level IN ('very_stressed', 'stressed', 'moderate', 'relaxed', 'very_relaxed')),
  energy_level TEXT NOT NULL CHECK (energy_level IN ('exhausted', 'tired', 'moderate', 'energized', 'very_energized')),

  -- Context
  current_challenges TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one status per user per week
  UNIQUE(user_id, week_start_date)
);

-- Indexes for helping_hand_user_status
CREATE INDEX idx_helping_hand_user_status_user_week ON helping_hand_user_status(user_id, week_start_date);
CREATE INDEX idx_helping_hand_user_status_week ON helping_hand_user_status(week_start_date);

-- ============================================================================
-- TABLE: helping_hand_categories
-- Predefined categories for organizing suggestions
-- ============================================================================
CREATE TABLE IF NOT EXISTS helping_hand_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color_class TEXT NOT NULL,

  -- Filtering criteria
  min_time_required INTEGER NOT NULL CHECK (min_time_required > 0),
  max_time_required INTEGER NOT NULL CHECK (max_time_required >= min_time_required),
  effort_level TEXT NOT NULL CHECK (effort_level IN ('minimal', 'low', 'moderate', 'high')),
  emotional_capacity_required TEXT NOT NULL CHECK (emotional_capacity_required IN ('low', 'moderate', 'high')),

  -- Metadata
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO helping_hand_categories (name, display_name, description, icon, color_class, min_time_required, max_time_required, effort_level, emotional_capacity_required, sort_order) VALUES
('quick_wins', 'Quick Wins', 'Simple gestures that take 5 minutes or less', 'Zap', 'warm-yellow', 1, 5, 'minimal', 'low', 1),
('thoughtful_messages', 'Thoughtful Messages', 'Meaningful words to brighten their day', 'MessageCircle', 'soft-purple', 2, 10, 'low', 'moderate', 2),
('acts_of_service', 'Acts of Service', 'Helpful actions to lighten their load', 'Heart', 'warm-pink', 10, 60, 'moderate', 'moderate', 3),
('quality_time', 'Quality Time', 'Ways to connect and be present together', 'Clock', 'soft-blue', 30, 180, 'moderate', 'high', 4),
('thoughtful_gifts', 'Thoughtful Gifts', 'Meaningful gifts or surprises', 'Gift', 'warm-orange', 15, 120, 'moderate', 'moderate', 5),
('physical_touch', 'Physical Touch', 'Affectionate gestures and closeness', 'Users', 'warm-pink-light', 5, 30, 'low', 'moderate', 6),
('planning_ahead', 'Planning Ahead', 'Future plans to look forward to', 'Calendar', 'soft-purple-light', 20, 90, 'high', 'high', 7)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- TABLE: helping_hand_suggestions
-- AI-generated and user-created suggestions
-- ============================================================================
CREATE TABLE IF NOT EXISTS helping_hand_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,

  -- Categorization
  category_id UUID REFERENCES helping_hand_categories(id) ON DELETE CASCADE NOT NULL,

  -- Source
  source_type TEXT NOT NULL DEFAULT 'ai' CHECK (source_type IN ('ai', 'user_created')),

  -- Suggestion Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detailed_steps JSONB DEFAULT '[]'::jsonb,

  -- Requirements
  time_estimate_minutes INTEGER NOT NULL CHECK (time_estimate_minutes > 0),
  effort_level TEXT NOT NULL CHECK (effort_level IN ('minimal', 'low', 'moderate', 'high')),
  best_timing TEXT CHECK (best_timing IN ('morning', 'afternoon', 'evening', 'weekend', 'any')),

  -- Personalization Context (optional for user-created)
  love_language_alignment TEXT[] DEFAULT ARRAY[]::TEXT[],
  why_suggested TEXT,
  based_on_factors JSONB DEFAULT '{}'::jsonb,

  -- Partner Context (AI-generated only)
  partner_hint TEXT,
  partner_preference_match BOOLEAN DEFAULT FALSE,

  -- Tracking
  is_selected BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  user_feedback TEXT CHECK (user_feedback IN ('helpful', 'not_helpful', 'too_much')),
  user_notes TEXT,

  -- AI Metadata (only for AI-generated suggestions)
  ai_confidence_score DECIMAL(3,2) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
  generated_by TEXT DEFAULT 'claude',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for helping_hand_suggestions
CREATE INDEX idx_helping_hand_suggestions_user_week ON helping_hand_suggestions(user_id, week_start_date);
CREATE INDEX idx_helping_hand_suggestions_category ON helping_hand_suggestions(category_id);
CREATE INDEX idx_helping_hand_suggestions_selected ON helping_hand_suggestions(user_id, is_selected) WHERE is_selected = TRUE;
CREATE INDEX idx_helping_hand_suggestions_relationship ON helping_hand_suggestions(relationship_id);

-- ============================================================================
-- TABLE: helping_hand_reminders
-- Reminder schedules for selected suggestions
-- ============================================================================
CREATE TABLE IF NOT EXISTS helping_hand_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id UUID REFERENCES helping_hand_suggestions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Reminder Schedule
  frequency TEXT NOT NULL CHECK (frequency IN ('once', 'daily', 'every_other_day', 'twice_weekly', 'weekly')),
  specific_days INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  preferred_time TIME NOT NULL,

  -- Date Range
  start_date DATE NOT NULL,
  end_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,
  total_sent INTEGER DEFAULT 0,

  -- User Interaction
  snoozed_until TIMESTAMPTZ,
  marked_done BOOLEAN DEFAULT FALSE,
  marked_done_at TIMESTAMPTZ,

  -- Calendar Integration
  calendar_event_id TEXT,
  synced_to_calendar BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for helping_hand_reminders
CREATE INDEX idx_helping_hand_reminders_user ON helping_hand_reminders(user_id);
CREATE INDEX idx_helping_hand_reminders_next_scheduled ON helping_hand_reminders(next_scheduled_at) WHERE is_active = TRUE;
CREATE INDEX idx_helping_hand_reminders_suggestion ON helping_hand_reminders(suggestion_id);

-- ============================================================================
-- TABLE: helping_hand_partner_hints
-- Private hints from partners for AI context
-- ============================================================================
CREATE TABLE IF NOT EXISTS helping_hand_partner_hints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE NOT NULL,
  hinting_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiving_partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Hint Content
  hint_type TEXT NOT NULL CHECK (hint_type IN ('like', 'dislike', 'need', 'preference', 'special_occasion')),
  hint_text TEXT NOT NULL,

  -- Privacy & Visibility
  show_directly BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,

  -- Usage Tracking
  used_in_suggestion_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for helping_hand_partner_hints
CREATE INDEX idx_helping_hand_partner_hints_relationship ON helping_hand_partner_hints(relationship_id, is_active);
CREATE INDEX idx_helping_hand_partner_hints_receiving ON helping_hand_partner_hints(receiving_partner_id, is_active);
CREATE INDEX idx_helping_hand_partner_hints_expires ON helping_hand_partner_hints(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Function: Get or create user status for current week
CREATE OR REPLACE FUNCTION get_or_create_helping_hand_status(
  p_user_id UUID,
  p_week_start_date DATE
)
RETURNS helping_hand_user_status AS $$
DECLARE
  v_status helping_hand_user_status;
BEGIN
  -- Try to get existing status
  SELECT * INTO v_status
  FROM helping_hand_user_status
  WHERE user_id = p_user_id
    AND week_start_date = p_week_start_date;

  -- If not found, return null (component will handle creation)
  RETURN v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get suggestions with category info
CREATE OR REPLACE FUNCTION get_helping_hand_suggestions_with_category(
  p_user_id UUID,
  p_week_start_date DATE,
  p_category_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  relationship_id UUID,
  week_start_date DATE,
  category_id UUID,
  category_name TEXT,
  category_display_name TEXT,
  category_icon TEXT,
  category_color_class TEXT,
  source_type TEXT,
  title TEXT,
  description TEXT,
  detailed_steps JSONB,
  time_estimate_minutes INTEGER,
  effort_level TEXT,
  best_timing TEXT,
  love_language_alignment TEXT[],
  why_suggested TEXT,
  based_on_factors JSONB,
  partner_hint TEXT,
  partner_preference_match BOOLEAN,
  is_selected BOOLEAN,
  is_completed BOOLEAN,
  completed_at TIMESTAMPTZ,
  user_feedback TEXT,
  user_notes TEXT,
  ai_confidence_score DECIMAL,
  generated_by TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.relationship_id,
    s.week_start_date,
    s.category_id,
    c.name as category_name,
    c.display_name as category_display_name,
    c.icon as category_icon,
    c.color_class as category_color_class,
    s.source_type,
    s.title,
    s.description,
    s.detailed_steps,
    s.time_estimate_minutes,
    s.effort_level,
    s.best_timing,
    s.love_language_alignment,
    s.why_suggested,
    s.based_on_factors,
    s.partner_hint,
    s.partner_preference_match,
    s.is_selected,
    s.is_completed,
    s.completed_at,
    s.user_feedback,
    s.user_notes,
    s.ai_confidence_score,
    s.generated_by,
    s.created_at,
    s.updated_at
  FROM helping_hand_suggestions s
  JOIN helping_hand_categories c ON s.category_id = c.id
  WHERE s.user_id = p_user_id
    AND s.week_start_date = p_week_start_date
    AND (p_category_id IS NULL OR s.category_id = p_category_id)
  ORDER BY c.sort_order, s.ai_confidence_score DESC NULLS LAST, s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get suggestion count by category
CREATE OR REPLACE FUNCTION get_helping_hand_category_counts(
  p_user_id UUID,
  p_week_start_date DATE
)
RETURNS TABLE(category_id UUID, category_name TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as category_id,
    c.name as category_name,
    COUNT(s.id) as count
  FROM helping_hand_categories c
  LEFT JOIN helping_hand_suggestions s ON s.category_id = c.id
    AND s.user_id = p_user_id
    AND s.week_start_date = p_week_start_date
  WHERE c.is_active = TRUE
  GROUP BY c.id, c.name, c.sort_order
  ORDER BY c.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get active partner hints for user
CREATE OR REPLACE FUNCTION get_active_partner_hints(
  p_receiving_partner_id UUID
)
RETURNS TABLE(
  id UUID,
  relationship_id UUID,
  hinting_user_id UUID,
  hint_type TEXT,
  hint_text TEXT,
  show_directly BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.relationship_id,
    h.hinting_user_id,
    h.hint_type,
    h.hint_text,
    h.show_directly,
    h.created_at
  FROM helping_hand_partner_hints h
  WHERE h.receiving_partner_id = p_receiving_partner_id
    AND h.is_active = TRUE
    AND (h.expires_at IS NULL OR h.expires_at > NOW())
  ORDER BY h.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE helping_hand_user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE helping_hand_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE helping_hand_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE helping_hand_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE helping_hand_partner_hints ENABLE ROW LEVEL SECURITY;

-- Policies for helping_hand_user_status
CREATE POLICY "Users can view their own status"
  ON helping_hand_user_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own status"
  ON helping_hand_user_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status"
  ON helping_hand_user_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status"
  ON helping_hand_user_status FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for helping_hand_categories (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view categories"
  ON helping_hand_categories FOR SELECT
  TO authenticated
  USING (TRUE);

-- Policies for helping_hand_suggestions
CREATE POLICY "Users can view their own suggestions"
  ON helping_hand_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suggestions"
  ON helping_hand_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions"
  ON helping_hand_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suggestions"
  ON helping_hand_suggestions FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for helping_hand_reminders
CREATE POLICY "Users can view their own reminders"
  ON helping_hand_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders"
  ON helping_hand_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON helping_hand_reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON helping_hand_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for helping_hand_partner_hints
CREATE POLICY "Users can view hints they sent"
  ON helping_hand_partner_hints FOR SELECT
  USING (auth.uid() = hinting_user_id);

CREATE POLICY "Users can view hints sent to them"
  ON helping_hand_partner_hints FOR SELECT
  USING (auth.uid() = receiving_partner_id);

CREATE POLICY "Users can insert hints to their partner"
  ON helping_hand_partner_hints FOR INSERT
  WITH CHECK (auth.uid() = hinting_user_id);

CREATE POLICY "Users can update hints they sent"
  ON helping_hand_partner_hints FOR UPDATE
  USING (auth.uid() = hinting_user_id);

CREATE POLICY "Users can delete hints they sent"
  ON helping_hand_partner_hints FOR DELETE
  USING (auth.uid() = hinting_user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_helping_hand_user_status_updated_at
  BEFORE UPDATE ON helping_hand_user_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_helping_hand_suggestions_updated_at
  BEFORE UPDATE ON helping_hand_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_helping_hand_reminders_updated_at
  BEFORE UPDATE ON helping_hand_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE helping_hand_user_status IS 'Tracks users weekly capacity and availability for personalized suggestions';
COMMENT ON TABLE helping_hand_categories IS 'Predefined categories for organizing helping hand suggestions';
COMMENT ON TABLE helping_hand_suggestions IS 'AI-generated and user-created suggestions for supporting partner';
COMMENT ON TABLE helping_hand_reminders IS 'Reminder schedules for selected suggestions with calendar sync';
COMMENT ON TABLE helping_hand_partner_hints IS 'Private hints from partners used for AI context and personalization';
