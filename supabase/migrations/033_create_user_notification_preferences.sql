-- Create user notification preferences table for storing notification scheduling preferences
-- This enables personalized timing for different types of notifications

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_question_time TIME,
  needs_suggestion_times TIME[],
  date_suggestion_days TEXT[],
  date_suggestion_time_preference TEXT CHECK (date_suggestion_time_preference IN ('morning', 'afternoon', 'evening', 'any')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure user_id is unique (one preference record per user)
  CONSTRAINT unique_user_notification_preferences_user_id UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for migration safety)
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON user_notification_preferences;

-- Users can only see their own notification preferences
CREATE POLICY "Users can view their own notification preferences"
  ON user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert/update/delete their own notification preferences
CREATE POLICY "Users can manage their own notification preferences"
  ON user_notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON user_notification_preferences TO authenticated;

-- Create function to update notification preferences updated_at timestamp
-- Using a separate function to avoid conflicts with existing function used by other tables
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists (for migration safety)
DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();
