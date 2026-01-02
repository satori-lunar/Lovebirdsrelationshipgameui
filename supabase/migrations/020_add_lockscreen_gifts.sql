-- Add Lockscreen Gifts System
-- Gift-able lockscreen wallpapers that partners design and send to each other

-- Drop old lockscreen tables if they exist
DROP TABLE IF EXISTS lockscreen_messages CASCADE;
DROP TABLE IF EXISTS lockscreen_configs CASCADE;

-- Create lockscreen_gifts table
-- Stores wallpapers designed and sent as gifts between partners
CREATE TABLE IF NOT EXISTS lockscreen_gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,

  -- Complete wallpaper design (JSONB)
  -- Contains: layout, images, dateDisplay, message, style, etc.
  design JSONB NOT NULL,

  -- Gift status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'applied', 'saved')),
  viewed_at TIMESTAMP WITH TIME ZONE,
  applied_at TIMESTAMP WITH TIME ZONE,   -- When receiver set it as lockscreen
  saved_at TIMESTAMP WITH TIME ZONE,     -- When saved to memories

  -- Optional personal message from sender
  sender_message TEXT CHECK (char_length(sender_message) <= 200),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure sender and receiver are different
  CHECK (sender_id != receiver_id)
);

-- Create gift_privacy_settings table
-- User preferences for receiving lockscreen gifts
CREATE TABLE IF NOT EXISTS gift_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  allow_gifts BOOLEAN NOT NULL DEFAULT TRUE,
  require_approval BOOLEAN NOT NULL DEFAULT FALSE,
  max_per_week INTEGER NOT NULL DEFAULT 0,          -- 0 = unlimited
  hide_relationship_info BOOLEAN NOT NULL DEFAULT FALSE,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_lockscreen_gifts_receiver ON lockscreen_gifts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_lockscreen_gifts_sender ON lockscreen_gifts(sender_id);
CREATE INDEX IF NOT EXISTS idx_lockscreen_gifts_relationship ON lockscreen_gifts(relationship_id);
CREATE INDEX IF NOT EXISTS idx_lockscreen_gifts_status ON lockscreen_gifts(status);
CREATE INDEX IF NOT EXISTS idx_lockscreen_gifts_created ON lockscreen_gifts(created_at);

-- Enable Row Level Security
ALTER TABLE lockscreen_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_privacy_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lockscreen_gifts

-- Users can view gifts they sent or received
CREATE POLICY "Users can view their lockscreen gifts"
  ON lockscreen_gifts
  FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id
  );

-- Users can send gifts
CREATE POLICY "Users can send lockscreen gifts"
  ON lockscreen_gifts
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update gifts they received (to mark status)
CREATE POLICY "Users can update received gifts"
  ON lockscreen_gifts
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Users can delete gifts they sent or received
CREATE POLICY "Users can delete their gifts"
  ON lockscreen_gifts
  FOR DELETE
  USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id
  );

-- RLS Policies for gift_privacy_settings

-- Users can view their own privacy settings
CREATE POLICY "Users can view own privacy settings"
  ON gift_privacy_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own privacy settings
CREATE POLICY "Users can insert own privacy settings"
  ON gift_privacy_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own privacy settings
CREATE POLICY "Users can update own privacy settings"
  ON gift_privacy_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to get pending gift count for a sender-receiver pair
CREATE OR REPLACE FUNCTION get_weekly_gift_count(
  p_sender_id UUID,
  p_receiver_id UUID
)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM lockscreen_gifts
  WHERE sender_id = p_sender_id
    AND receiver_id = p_receiver_id
    AND created_at >= NOW() - INTERVAL '7 days';
$$;

-- Function to clean up old pending gifts (optional cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_pending_gifts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete pending gifts older than 30 days
  DELETE FROM lockscreen_gifts
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Grant permissions
GRANT ALL ON lockscreen_gifts TO authenticated;
GRANT ALL ON gift_privacy_settings TO authenticated;

-- Add helpful comments
COMMENT ON TABLE lockscreen_gifts IS 'Stores lockscreen wallpaper gifts designed and sent between partners';
COMMENT ON TABLE gift_privacy_settings IS 'User privacy preferences for receiving lockscreen gifts';
COMMENT ON COLUMN lockscreen_gifts.design IS 'Complete wallpaper design stored as JSONB (layout, images, text, style)';
COMMENT ON COLUMN lockscreen_gifts.status IS 'Gift lifecycle: pending → viewed → applied/saved';
COMMENT ON COLUMN gift_privacy_settings.max_per_week IS 'Maximum gifts allowed per week (0 = unlimited)';
