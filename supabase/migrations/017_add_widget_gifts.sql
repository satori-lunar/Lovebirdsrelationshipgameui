-- Widget Gifts: Allow partners to send content to each other's home screen widgets
-- Design decisions:
--   - Gifts expire after 24 hours, then widget reverts to memory rotation
--   - Multiple pending gifts are queued (carousel)
--   - Supports photo, memory reference, or text-only notes

-- Create widget_gifts table
CREATE TABLE widget_gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationship
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,

  -- Content
  gift_type TEXT NOT NULL CHECK (gift_type IN ('photo', 'memory', 'note')),
  photo_url TEXT,                    -- CDN URL for uploaded photo (for 'photo' type)
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,  -- For 'memory' type
  message TEXT CHECK (char_length(message) <= 150),  -- Sweet note (max 150 chars)

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'seen', 'dismissed', 'expired')),
  delivered_at TIMESTAMPTZ,          -- When widget was updated
  seen_at TIMESTAMPTZ,               -- When partner opened app and saw it
  dismissed_at TIMESTAMPTZ,          -- When partner dismissed from widget

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Constraints
  CONSTRAINT valid_photo_gift CHECK (
    gift_type != 'photo' OR photo_url IS NOT NULL
  ),
  CONSTRAINT valid_memory_gift CHECK (
    gift_type != 'memory' OR memory_id IS NOT NULL
  ),
  CONSTRAINT sender_not_receiver CHECK (sender_id != receiver_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_widget_gifts_receiver_active ON widget_gifts(receiver_id, status, created_at DESC)
  WHERE status IN ('pending', 'delivered');
CREATE INDEX idx_widget_gifts_receiver_all ON widget_gifts(receiver_id, created_at DESC);
CREATE INDEX idx_widget_gifts_sender ON widget_gifts(sender_id, created_at DESC);
CREATE INDEX idx_widget_gifts_expires ON widget_gifts(expires_at) WHERE status IN ('pending', 'delivered');

-- Enable RLS
ALTER TABLE widget_gifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view gifts they sent or received"
  ON widget_gifts FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send gifts to their partner"
  ON widget_gifts FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
      AND r.connected_at IS NOT NULL
      AND (
        (r.partner_a_id = auth.uid() AND r.partner_b_id = receiver_id)
        OR (r.partner_b_id = auth.uid() AND r.partner_a_id = receiver_id)
      )
    )
  );

CREATE POLICY "Users can update gifts they received"
  ON widget_gifts FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Function to auto-expire old gifts
CREATE OR REPLACE FUNCTION expire_old_widget_gifts()
RETURNS void AS $$
BEGIN
  UPDATE widget_gifts
  SET status = 'expired'
  WHERE status IN ('pending', 'delivered')
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active gifts for a user (for widget display)
CREATE OR REPLACE FUNCTION get_active_widget_gifts(user_id UUID)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  sender_name TEXT,
  gift_type TEXT,
  photo_url TEXT,
  memory_id UUID,
  memory_photo_url TEXT,
  memory_title TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  -- First expire old gifts
  PERFORM expire_old_widget_gifts();

  -- Return active gifts ordered by creation (oldest first for queue)
  RETURN QUERY
  SELECT
    wg.id,
    wg.sender_id,
    COALESCE(o.partner_name, 'Your Partner') as sender_name,
    wg.gift_type,
    wg.photo_url,
    wg.memory_id,
    m.photo_url as memory_photo_url,
    m.title as memory_title,
    wg.message,
    wg.created_at,
    wg.expires_at
  FROM widget_gifts wg
  LEFT JOIN onboarding_responses o ON o.user_id = wg.sender_id
  LEFT JOIN memories m ON m.id = wg.memory_id
  WHERE wg.receiver_id = user_id
    AND wg.status IN ('pending', 'delivered')
    AND wg.expires_at > NOW()
  ORDER BY wg.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add XP rewards for widget gifts (integrate with dragon system)
-- Sending a gift: +15 XP
-- First gift ever: +50 XP bonus
-- Viewing partner's gift: +10 XP

COMMENT ON TABLE widget_gifts IS 'Stores love notes/photos sent to partner''s home screen widget. Gifts expire after 24 hours.';
