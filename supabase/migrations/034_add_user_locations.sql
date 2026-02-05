-- Add table for real-time user location tracking
-- This allows couples to see where their partner is located

CREATE TABLE IF NOT EXISTS user_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    accuracy NUMERIC, -- accuracy in meters
    is_sharing_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own location
CREATE POLICY "Users can view their own location" ON user_locations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view their partner's location if sharing is enabled
CREATE POLICY "Users can view partner location if sharing enabled" ON user_locations
    FOR SELECT USING (
        is_sharing_enabled = true
        AND EXISTS (
            SELECT 1 FROM relationships r
            WHERE (r.partner_a_id = auth.uid() AND r.partner_b_id = user_locations.user_id)
               OR (r.partner_b_id = auth.uid() AND r.partner_a_id = user_locations.user_id)
        )
    );

-- Users can insert their own location
CREATE POLICY "Users can insert their own location" ON user_locations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own location
CREATE POLICY "Users can update their own location" ON user_locations
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own location
CREATE POLICY "Users can delete their own location" ON user_locations
    FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_sharing_enabled ON user_locations(is_sharing_enabled);
CREATE INDEX IF NOT EXISTS idx_user_locations_location ON user_locations USING gist (point(longitude, latitude));

-- Add comments for documentation
COMMENT ON TABLE user_locations IS 'Real-time location tracking for users to share with their partner';
COMMENT ON COLUMN user_locations.latitude IS 'Latitude coordinate';
COMMENT ON COLUMN user_locations.longitude IS 'Longitude coordinate';
COMMENT ON COLUMN user_locations.accuracy IS 'Location accuracy in meters';
COMMENT ON COLUMN user_locations.is_sharing_enabled IS 'Whether the user has enabled location sharing with their partner';
COMMENT ON COLUMN user_locations.updated_at IS 'Last time the location was updated';
