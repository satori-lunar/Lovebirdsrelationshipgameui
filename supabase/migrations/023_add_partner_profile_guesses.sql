-- Migration: Partner Profile Guesses (Solo Mode Support)
-- Description: Store what User A thinks about User B's preferences
--              When User B joins, they can see and confirm/correct
-- Date: 2026-01-02

-- =====================================================
-- PARTNER PROFILE GUESSES TABLE
-- =====================================================
CREATE TABLE partner_profile_guesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  guesser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Who filled this out

  -- Love Language (what guesser thinks)
  love_language_primary TEXT NOT NULL CHECK (love_language_primary IN ('words', 'quality_time', 'gifts', 'acts', 'touch')),
  love_language_secondary TEXT CHECK (love_language_secondary IN ('words', 'quality_time', 'gifts', 'acts', 'touch')),

  -- Communication Style (what guesser thinks)
  communication_style TEXT NOT NULL CHECK (communication_style IN ('direct', 'gentle', 'playful', 'reserved')),

  -- Stress Needs (what guesser thinks)
  stress_needs JSONB NOT NULL DEFAULT '[]',

  -- Additional insights
  hobbies TEXT,
  likes TEXT,
  dislikes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One guess per guesser per couple
  UNIQUE(couple_id, guesser_id)
);

-- Indexes
CREATE INDEX idx_partner_profile_guesses_couple_id ON partner_profile_guesses(couple_id);
CREATE INDEX idx_partner_profile_guesses_guesser_id ON partner_profile_guesses(guesser_id);
CREATE INDEX idx_partner_profile_guesses_created_at ON partner_profile_guesses(created_at DESC);

-- RLS policies
ALTER TABLE partner_profile_guesses ENABLE ROW LEVEL SECURITY;

-- Users can view guesses about them (in their couple)
CREATE POLICY "Users can view partner guesses"
  ON partner_profile_guesses FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM relationships
      WHERE partner_a_id = auth.uid() OR partner_b_id = auth.uid()
    )
  );

-- Users can insert their guesses
CREATE POLICY "Users can insert guesses"
  ON partner_profile_guesses FOR INSERT
  WITH CHECK (guesser_id = auth.uid());

-- Users can update their own guesses
CREATE POLICY "Users can update own guesses"
  ON partner_profile_guesses FOR UPDATE
  USING (guesser_id = auth.uid());

-- =====================================================
-- PROFILE COMPARISON VIEW
-- =====================================================
-- Shows "What they think vs What you said" comparison
CREATE OR REPLACE VIEW partner_profile_comparisons AS
SELECT
  c.id AS couple_id,
  c.partner_a_id,
  c.partner_b_id,

  -- Partner A's actual profile
  ppa.love_language_primary AS a_actual_primary_lang,
  ppa.love_language_secondary AS a_actual_secondary_lang,
  ppa.communication_style AS a_actual_comm_style,

  -- What Partner B thinks about Partner A
  ppgb.love_language_primary AS b_guess_a_primary_lang,
  ppgb.love_language_secondary AS b_guess_a_secondary_lang,
  ppgb.communication_style AS b_guess_a_comm_style,
  ppgb.hobbies AS b_guess_a_hobbies,
  ppgb.likes AS b_guess_a_likes,
  ppgb.dislikes AS b_guess_a_dislikes,

  -- Partner B's actual profile
  ppb.love_language_primary AS b_actual_primary_lang,
  ppb.love_language_secondary AS b_actual_secondary_lang,
  ppb.communication_style AS b_actual_comm_style,

  -- What Partner A thinks about Partner B
  ppga.love_language_primary AS a_guess_b_primary_lang,
  ppga.love_language_secondary AS a_guess_b_secondary_lang,
  ppga.communication_style AS a_guess_b_comm_style,
  ppga.hobbies AS a_guess_b_hobbies,
  ppga.likes AS a_guess_b_likes,
  ppga.dislikes AS a_guess_b_dislikes,

  -- Accuracy scores (calculated)
  CASE
    WHEN ppa.love_language_primary = ppgb.love_language_primary THEN 1
    ELSE 0
  END AS b_guessed_a_primary_correct,

  CASE
    WHEN ppb.love_language_primary = ppga.love_language_primary THEN 1
    ELSE 0
  END AS a_guessed_b_primary_correct

FROM relationships c
LEFT JOIN partner_profiles ppa ON ppa.user_id = c.partner_a_id
LEFT JOIN partner_profiles ppb ON ppb.user_id = c.partner_b_id
LEFT JOIN partner_profile_guesses ppga ON ppga.couple_id = c.id AND ppga.guesser_id = c.partner_a_id
LEFT JOIN partner_profile_guesses ppgb ON ppgb.couple_id = c.id AND ppgb.guesser_id = c.partner_b_id;

-- Grant access
GRANT SELECT ON partner_profile_comparisons TO authenticated;

-- RLS for view
ALTER VIEW partner_profile_comparisons SET (security_invoker = true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get partner's guess about current user
CREATE OR REPLACE FUNCTION get_partner_guess_about_me(p_user_id UUID)
RETURNS TABLE (
  guesser_name TEXT,
  love_language_primary TEXT,
  love_language_secondary TEXT,
  communication_style TEXT,
  stress_needs JSONB,
  hobbies TEXT,
  likes TEXT,
  dislikes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.email::TEXT AS guesser_name,
    ppg.love_language_primary,
    ppg.love_language_secondary,
    ppg.communication_style,
    ppg.stress_needs,
    ppg.hobbies,
    ppg.likes,
    ppg.dislikes
  FROM partner_profile_guesses ppg
  JOIN relationships c ON ppg.couple_id = c.id
  JOIN auth.users u ON ppg.guesser_id = u.id
  WHERE (c.partner_a_id = p_user_id AND ppg.guesser_id = c.partner_b_id)
     OR (c.partner_b_id = p_user_id AND ppg.guesser_id = c.partner_a_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate accuracy score
CREATE OR REPLACE FUNCTION calculate_guess_accuracy(p_couple_id UUID)
RETURNS TABLE (
  partner_a_accuracy INTEGER,
  partner_b_accuracy INTEGER
) AS $$
DECLARE
  v_a_score INTEGER := 0;
  v_b_score INTEGER := 0;
  v_total_fields INTEGER := 3; -- primary lang, secondary lang, comm style
BEGIN
  -- Partner A's accuracy (how well they know B)
  SELECT
    (CASE WHEN ppg.love_language_primary = pp.love_language_primary THEN 1 ELSE 0 END) +
    (CASE WHEN ppg.love_language_secondary = pp.love_language_secondary OR (ppg.love_language_secondary IS NULL AND pp.love_language_secondary IS NULL) THEN 1 ELSE 0 END) +
    (CASE WHEN ppg.communication_style = pp.communication_style THEN 1 ELSE 0 END)
  INTO v_a_score
  FROM partner_profile_guesses ppg
  JOIN partner_profiles pp ON pp.couple_id = p_couple_id
  JOIN relationships c ON c.id = p_couple_id
  WHERE ppg.couple_id = p_couple_id
    AND ppg.guesser_id = c.partner_a_id
    AND pp.user_id = c.partner_b_id;

  -- Partner B's accuracy (how well they know A)
  SELECT
    (CASE WHEN ppg.love_language_primary = pp.love_language_primary THEN 1 ELSE 0 END) +
    (CASE WHEN ppg.love_language_secondary = pp.love_language_secondary OR (ppg.love_language_secondary IS NULL AND pp.love_language_secondary IS NULL) THEN 1 ELSE 0 END) +
    (CASE WHEN ppg.communication_style = pp.communication_style THEN 1 ELSE 0 END)
  INTO v_b_score
  FROM partner_profile_guesses ppg
  JOIN partner_profiles pp ON pp.couple_id = p_couple_id
  JOIN relationships c ON c.id = p_couple_id
  WHERE ppg.couple_id = p_couple_id
    AND ppg.guesser_id = c.partner_b_id
    AND pp.user_id = c.partner_a_id;

  -- Return percentages
  RETURN QUERY SELECT
    ROUND((v_a_score::NUMERIC / v_total_fields) * 100)::INTEGER,
    ROUND((v_b_score::NUMERIC / v_total_fields) * 100)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE partner_profile_guesses IS 'Stores what User A thinks about User B''s preferences. When User B joins, they can see and confirm/correct. Creates fun "How well do you know each other?" insights.';
COMMENT ON VIEW partner_profile_comparisons IS 'Side-by-side comparison of actual profiles vs partner guesses';
COMMENT ON FUNCTION get_partner_guess_about_me IS 'Get what your partner said about you';
COMMENT ON FUNCTION calculate_guess_accuracy IS 'Calculate accuracy percentage (0-100) for each partner''s guesses';
