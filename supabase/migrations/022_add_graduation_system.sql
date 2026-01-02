-- Migration: Graduation & Growth Tracking System
-- Description: Track couple progress toward 6-month graduation and lifetime free access
-- Date: 2026-01-02

-- =====================================================
-- COUPLE GRADUATIONS TABLE
-- =====================================================
CREATE TABLE couple_graduations (
  couple_id UUID PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
  graduated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lifetime_free_access BOOLEAN DEFAULT true,

  -- Metrics at graduation
  final_independence_score INTEGER,
  final_spontaneous_actions INTEGER,
  weeks_to_graduate INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_couple_graduations_graduated_at ON couple_graduations(graduated_at DESC);

-- RLS policies
ALTER TABLE couple_graduations ENABLE ROW LEVEL SECURITY;

-- Partners can view their couple's graduation status
CREATE POLICY "Partners can view graduation"
  ON couple_graduations FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE partner_a_id = auth.uid() OR partner_b_id = auth.uid()
    )
  );

-- System can insert graduations (via service)
CREATE POLICY "System can record graduations"
  ON couple_graduations FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- USER ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Achievement details
  milestone_week INTEGER NOT NULL,
  milestone_title TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, milestone_week)
);

-- Indexes
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_week ON user_achievements(milestone_week);
CREATE INDEX idx_user_achievements_achieved_at ON user_achievements(achieved_at DESC);

-- RLS policies
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (user_id = auth.uid());

-- System can insert achievements
CREATE POLICY "System can insert achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- USER REWARDS TABLE
-- =====================================================
CREATE TABLE user_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Reward details
  reward_type TEXT NOT NULL CHECK (reward_type IN ('badge', 'feature_unlock', 'free_access', 'celebration')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Metadata
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_rewards_user_id ON user_rewards(user_id);
CREATE INDEX idx_user_rewards_type ON user_rewards(reward_type);
CREATE INDEX idx_user_rewards_unlocked_at ON user_rewards(unlocked_at DESC);

-- RLS policies
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

-- Users can view their own rewards
CREATE POLICY "Users can view own rewards"
  ON user_rewards FOR SELECT
  USING (user_id = auth.uid());

-- System can insert rewards
CREATE POLICY "System can insert rewards"
  ON user_rewards FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- GROWTH METRICS VIEW (for dashboard)
-- =====================================================
CREATE OR REPLACE VIEW user_growth_metrics AS
SELECT
  pp.user_id,
  pp.couple_id,

  -- Profile data
  pp.love_language_primary,
  pp.communication_style,
  pp.frequency_preference,
  pp.engagement_score,

  -- Time metrics
  EXTRACT(EPOCH FROM (NOW() - pp.created_at)) / (7 * 24 * 60 * 60) AS weeks_since_start,

  -- Achievements count
  (SELECT COUNT(*) FROM user_achievements WHERE user_id = pp.user_id) AS achievements_count,

  -- Rewards count
  (SELECT COUNT(*) FROM user_rewards WHERE user_id = pp.user_id) AS rewards_count,

  -- Graduation status
  (SELECT graduated_at FROM couple_graduations WHERE couple_id = pp.couple_id) AS graduated_at,
  (SELECT lifetime_free_access FROM couple_graduations WHERE couple_id = pp.couple_id) AS has_lifetime_access,

  pp.created_at,
  pp.updated_at
FROM partner_profiles pp;

-- Grant access to view
GRANT SELECT ON user_growth_metrics TO authenticated;

-- RLS for view
ALTER VIEW user_growth_metrics SET (security_invoker = true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has lifetime free access
CREATE OR REPLACE FUNCTION has_lifetime_free_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_couple_id UUID;
  v_graduated BOOLEAN;
BEGIN
  -- Get user's couple_id
  SELECT couple_id INTO v_couple_id
  FROM partner_profiles
  WHERE user_id = p_user_id;

  IF v_couple_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if couple has graduated
  SELECT EXISTS(
    SELECT 1 FROM couple_graduations
    WHERE couple_id = v_couple_id AND lifetime_free_access = true
  ) INTO v_graduated;

  RETURN COALESCE(v_graduated, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get graduation progress percentage
CREATE OR REPLACE FUNCTION get_graduation_progress(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_weeks_since_start NUMERIC;
  v_independence_score INTEGER;
  v_time_progress NUMERIC;
  v_skill_progress NUMERIC;
  v_total_progress INTEGER;
BEGIN
  -- Get weeks since profile creation
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / (7 * 24 * 60 * 60)
  INTO v_weeks_since_start
  FROM partner_profiles
  WHERE user_id = p_user_id;

  IF v_weeks_since_start IS NULL THEN
    RETURN 0;
  END IF;

  -- Get engagement score as proxy for independence
  SELECT engagement_score INTO v_independence_score
  FROM partner_profiles
  WHERE user_id = p_user_id;

  -- Calculate time progress (capped at 100%)
  v_time_progress := LEAST(100, (v_weeks_since_start / 26) * 100);

  -- Calculate skill progress
  v_skill_progress := COALESCE(v_independence_score, 50);

  -- Weighted average: 40% time, 60% skill
  v_total_progress := ROUND(v_time_progress * 0.4 + v_skill_progress * 0.6);

  RETURN v_total_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award achievement
CREATE OR REPLACE FUNCTION award_achievement(
  p_user_id UUID,
  p_milestone_week INTEGER,
  p_milestone_title TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_achievements (user_id, milestone_week, milestone_title)
  VALUES (p_user_id, p_milestone_week, p_milestone_title)
  ON CONFLICT (user_id, milestone_week) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to auto-award achievements based on weeks
CREATE OR REPLACE FUNCTION check_and_award_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_weeks_since_start INTEGER;
BEGIN
  -- Calculate weeks since profile creation
  v_weeks_since_start := FLOOR(EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / (7 * 24 * 60 * 60));

  -- Award milestone achievements
  IF v_weeks_since_start >= 4 THEN
    PERFORM award_achievement(NEW.user_id, 4, 'First Month Milestone');
  END IF;

  IF v_weeks_since_start >= 12 THEN
    PERFORM award_achievement(NEW.user_id, 12, 'Quarter Year Together');
  END IF;

  IF v_weeks_since_start >= 26 THEN
    PERFORM award_achievement(NEW.user_id, 26, 'Graduation: Lifetime Free Access');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_achievements
AFTER UPDATE ON partner_profiles
FOR EACH ROW
EXECUTE FUNCTION check_and_award_achievements();

-- =====================================================
-- SEED DATA (Example achievements)
-- =====================================================

-- Award initial achievement to existing users with profiles
INSERT INTO user_achievements (user_id, milestone_week, milestone_title)
SELECT user_id, 1, 'Getting Started'
FROM partner_profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_achievements
  WHERE user_achievements.user_id = partner_profiles.user_id
  AND milestone_week = 1
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE couple_graduations IS 'Tracks couples who have graduated (6 months) and earned lifetime free access';
COMMENT ON TABLE user_achievements IS 'Individual milestone achievements earned during relationship growth journey';
COMMENT ON TABLE user_rewards IS 'Rewards and badges earned by users for reaching milestones';
COMMENT ON VIEW user_growth_metrics IS 'Consolidated view of user growth metrics for dashboards';
COMMENT ON FUNCTION has_lifetime_free_access IS 'Check if user has earned lifetime free access through graduation';
COMMENT ON FUNCTION get_graduation_progress IS 'Calculate graduation progress percentage (0-100) for user';
