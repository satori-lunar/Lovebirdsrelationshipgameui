-- Add photo support to important dates
-- Allows users to attach photos to special dates and memories

ALTER TABLE important_dates
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN important_dates.photo_url IS 'Photo associated with this special date (stored in Supabase Storage)';
