-- Add couple photo URL to relationships table
-- This allows couples to upload a photo of themselves together

ALTER TABLE relationships
ADD COLUMN IF NOT EXISTS couple_photo_url TEXT;

COMMENT ON COLUMN relationships.couple_photo_url IS 'URL to couple photo stored in Supabase storage - displayed on home screen';
