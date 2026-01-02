-- Add Lockscreen Wallpaper System
-- This migration adds tables for dynamic lockscreen wallpapers and lockscreen messages

-- Create lockscreen_configs table
-- Stores user's lockscreen wallpaper configuration
CREATE TABLE IF NOT EXISTS lockscreen_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,

  -- Wallpaper type
  wallpaper_type TEXT NOT NULL CHECK (wallpaper_type IN ('time', 'message', 'mood', 'growth')),

  -- Visual settings
  photo_url TEXT,
  background_gradient TEXT,
  font_style TEXT NOT NULL DEFAULT 'minimal' CHECK (font_style IN ('minimal', 'elegant', 'bold')),
  text_visibility TEXT NOT NULL DEFAULT 'full' CHECK (text_visibility IN ('full', 'minimal', 'none')),

  -- Privacy settings (stored as JSONB)
  privacy_settings JSONB NOT NULL DEFAULT '{
    "showTextWhenLocked": true,
    "pauseDuringConflict": false,
    "useNeutralDesign": false
  }'::jsonb,

  -- Type-specific configuration (stored as JSONB)
  -- For 'time': { relationshipStartDate, displayFormat, showMilestones }
  -- For 'message': { messageExpiry }
  -- For 'mood': { showMoodText, colorPalette, partnerCurrentMood }
  -- For 'growth': { symbolType, growthLevel, lastInteractionDate, showGrowthText }
  type_specific_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One config per user
  UNIQUE(user_id)
);

-- Create lockscreen_messages table
-- Stores lockscreen messages sent between partners
CREATE TABLE IF NOT EXISTS lockscreen_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,

  -- Message content
  message TEXT NOT NULL CHECK (char_length(message) <= 150),
  tone TEXT NOT NULL CHECK (tone IN ('love', 'support', 'quiet_presence')),

  -- Status tracking
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Ensure sender and receiver are different
  CHECK (sender_id != receiver_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_lockscreen_configs_user ON lockscreen_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_lockscreen_configs_relationship ON lockscreen_configs(relationship_id);
CREATE INDEX IF NOT EXISTS idx_lockscreen_messages_receiver ON lockscreen_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_lockscreen_messages_expires ON lockscreen_messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_lockscreen_messages_relationship ON lockscreen_messages(relationship_id);

-- Enable Row Level Security
ALTER TABLE lockscreen_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lockscreen_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lockscreen_configs

-- Users can view their own config
CREATE POLICY "Users can view own lockscreen config"
  ON lockscreen_configs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own config
CREATE POLICY "Users can insert own lockscreen config"
  ON lockscreen_configs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own config
CREATE POLICY "Users can update own lockscreen config"
  ON lockscreen_configs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own config
CREATE POLICY "Users can delete own lockscreen config"
  ON lockscreen_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for lockscreen_messages

-- Users can view messages sent to them or sent by them
CREATE POLICY "Users can view their lockscreen messages"
  ON lockscreen_messages
  FOR SELECT
  USING (
    auth.uid() = receiver_id OR
    auth.uid() = sender_id
  );

-- Users can insert messages they send
CREATE POLICY "Users can send lockscreen messages"
  ON lockscreen_messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update messages sent to them (to mark as read)
CREATE POLICY "Users can update received messages"
  ON lockscreen_messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Function to automatically clean up expired messages
CREATE OR REPLACE FUNCTION cleanup_expired_lockscreen_messages()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM lockscreen_messages
  WHERE expires_at < NOW() - INTERVAL '7 days'; -- Keep for 7 days after expiry for history
END;
$$;

-- Create a scheduled job to clean up expired messages (if pg_cron is available)
-- This can also be run manually or via a cron job
-- SELECT cron.schedule('cleanup-expired-lockscreen-messages', '0 2 * * *', 'SELECT cleanup_expired_lockscreen_messages()');

-- Grant permissions
GRANT ALL ON lockscreen_configs TO authenticated;
GRANT ALL ON lockscreen_messages TO authenticated;

-- Add helpful comments
COMMENT ON TABLE lockscreen_configs IS 'Stores user lockscreen wallpaper configurations for dynamic relationship wallpapers';
COMMENT ON TABLE lockscreen_messages IS 'Stores lockscreen messages sent between partners that appear on their wallpapers';
COMMENT ON COLUMN lockscreen_configs.wallpaper_type IS 'Type of lockscreen: time, message, mood, or growth';
COMMENT ON COLUMN lockscreen_configs.type_specific_config IS 'JSONB field containing type-specific configuration options';
COMMENT ON COLUMN lockscreen_messages.tone IS 'Emotional tone of the message: love, support, or quiet_presence';
COMMENT ON COLUMN lockscreen_messages.expires_at IS 'When the message should stop displaying on the lockscreen';
