-- Create user calendar events table for storing user schedules
-- This enables smart scheduling around user availability

CREATE TABLE IF NOT EXISTS user_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT TRUE,
  can_share_busy_status BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure end time is after start time
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_calendar_events_user_id ON user_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calendar_events_time_range ON user_calendar_events(start_time, end_time);

-- Enable RLS
ALTER TABLE user_calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own calendar events
CREATE POLICY "Users can view their own calendar events"
  ON user_calendar_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert/update/delete their own calendar events
CREATE POLICY "Users can manage their own calendar events"
  ON user_calendar_events FOR ALL
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON user_calendar_events TO authenticated;
