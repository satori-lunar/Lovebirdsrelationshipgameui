-- Add granular location sharing controls
-- Separate "share with app" (for features) from "share with partner" (visible to partner)

-- Add new column for app-level tracking
ALTER TABLE user_locations
ADD COLUMN IF NOT EXISTS share_with_app BOOLEAN DEFAULT false;

-- Rename is_sharing_enabled to share_with_partner for clarity
ALTER TABLE user_locations
RENAME COLUMN is_sharing_enabled TO share_with_partner;

-- Update the index
DROP INDEX IF EXISTS idx_user_locations_sharing_enabled;
CREATE INDEX IF NOT EXISTS idx_user_locations_share_with_partner ON user_locations(share_with_partner);
CREATE INDEX IF NOT EXISTS idx_user_locations_share_with_app ON user_locations(share_with_app);

-- Update RLS policy for partner viewing
DROP POLICY IF EXISTS "Users can view partner location if sharing enabled" ON user_locations;
CREATE POLICY "Users can view partner location if sharing enabled" ON user_locations
    FOR SELECT USING (
        share_with_partner = true
        AND EXISTS (
            SELECT 1 FROM relationships r
            WHERE (r.partner_a_id = auth.uid() AND r.partner_b_id = user_locations.user_id)
               OR (r.partner_b_id = auth.uid() AND r.partner_a_id = user_locations.user_id)
        )
    );

-- Update comments
COMMENT ON COLUMN user_locations.share_with_app IS 'Whether location is shared with the app for features (date suggestions, etc.)';
COMMENT ON COLUMN user_locations.share_with_partner IS 'Whether location is visible to the partner in real-time';
