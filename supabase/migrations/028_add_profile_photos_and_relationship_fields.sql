-- Add profile photo URLs and relationship status fields to onboarding_responses
ALTER TABLE onboarding_responses
ADD COLUMN IF NOT EXISTS user_photo_url TEXT,
ADD COLUMN IF NOT EXISTS partner_photo_url TEXT,
ADD COLUMN IF NOT EXISTS relationship_status TEXT CHECK (relationship_status IN ('married', 'cohabitating', 'living_separately')),
ADD COLUMN IF NOT EXISTS date_frequency TEXT CHECK (date_frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly', 'rarely', 'never')),
ADD COLUMN IF NOT EXISTS want_more_dates BOOLEAN DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN onboarding_responses.user_photo_url IS 'URL to user profile photo stored in Supabase storage';
COMMENT ON COLUMN onboarding_responses.partner_photo_url IS 'URL to partner profile photo stored in Supabase storage';
COMMENT ON COLUMN onboarding_responses.relationship_status IS 'Current relationship living arrangement status';
COMMENT ON COLUMN onboarding_responses.date_frequency IS 'How often the couple goes on dates';
COMMENT ON COLUMN onboarding_responses.want_more_dates IS 'Whether the user wants to go on dates more often';
