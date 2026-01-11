-- Add tables for geo-location based date planner feature

-- User preferences for date planning
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    preferred_date_types TEXT[] DEFAULT '{}',
    preferred_vibe TEXT[] DEFAULT '{}',
    max_budget_per_person NUMERIC DEFAULT 100.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Saved date plans from the geo-location feature
CREATE TABLE IF NOT EXISTS saved_date_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    location_lat NUMERIC NOT NULL,
    location_lon NUMERIC NOT NULL,
    date_package_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_date_plans ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Saved date plans policies
CREATE POLICY "Users can view their own saved date plans" ON saved_date_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved date plans" ON saved_date_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved date plans" ON saved_date_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved date plans" ON saved_date_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_date_plans_user_id ON saved_date_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_date_plans_location ON saved_date_plans USING gist (point(location_lon, location_lat));

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'User preferences for geo-location based date planning';
COMMENT ON TABLE saved_date_plans IS 'Saved date plans created using the geo-location feature';
COMMENT ON COLUMN user_preferences.preferred_date_types IS 'Array of preferred date types (e.g., romantic, casual, adventure)';
COMMENT ON COLUMN user_preferences.preferred_vibe IS 'Array of preferred date vibes (e.g., lively, cozy, upscale)';
COMMENT ON COLUMN user_preferences.max_budget_per_person IS 'Maximum budget per person for date activities';
COMMENT ON COLUMN saved_date_plans.date_package_json IS 'JSON structure containing the complete date package with items, budget breakdown, etc.';
