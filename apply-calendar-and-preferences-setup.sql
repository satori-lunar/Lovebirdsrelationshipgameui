-- Calendar and Notification Preferences Setup
-- Run this in Supabase SQL Editor to set up calendar functionality

-- Create user calendar events table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_calendar_events_user_id ON user_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calendar_events_time_range ON user_calendar_events(start_time, end_time);

-- Enable RLS for calendar events
ALTER TABLE user_calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own calendar events
CREATE POLICY "Users can view their own calendar events"
  ON user_calendar_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only manage their own calendar events
CREATE POLICY "Users can manage their own calendar events"
  ON user_calendar_events FOR ALL
  USING (auth.uid() = user_id);

-- Create user notification preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_question_time TIME,
  needs_suggestion_times TIME[],
  date_suggestion_days TEXT[],
  date_suggestion_time_preference TEXT CHECK (date_suggestion_time_preference IN ('morning', 'afternoon', 'evening', 'any')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure user_id is unique
  CONSTRAINT unique_user_notification_preferences_user_id UNIQUE (user_id)
);

-- Enable RLS for notification preferences
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notification preferences
CREATE POLICY "Users can view their own notification preferences"
  ON user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only manage their own notification preferences
CREATE POLICY "Users can manage their own notification preferences"
  ON user_notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON user_calendar_events TO authenticated;
GRANT ALL ON user_notification_preferences TO authenticated;
