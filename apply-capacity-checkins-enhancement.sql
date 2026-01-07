-- Enhance capacity check-ins with detailed questions
-- Run this in Supabase SQL Editor to add the missing columns

ALTER TABLE capacity_checkins
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS causes TEXT[],
ADD COLUMN IF NOT EXISTS activities TEXT,
ADD COLUMN IF NOT EXISTS boundaries TEXT;

-- Add comments for documentation
COMMENT ON COLUMN capacity_checkins.duration IS 'How long the user has felt this way (just_today, few_days, this_week, few_weeks, ongoing)';
COMMENT ON COLUMN capacity_checkins.causes IS 'What''s contributing to this capacity level (array of causes like work_stress, health_issues, etc.)';
COMMENT ON COLUMN capacity_checkins.activities IS 'Specific activities the user is looking forward to or avoiding';
COMMENT ON COLUMN capacity_checkins.boundaries IS 'Any specific boundaries or support needs the user has communicated';
