-- Add per-partner photo URLs to relationships table
-- This allows each partner to set their own homepage photo independently

ALTER TABLE relationships
ADD COLUMN partner_a_photo_url TEXT,
ADD COLUMN partner_b_photo_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN relationships.partner_a_photo_url IS 'Photo URL chosen by partner A for their homepage view';
COMMENT ON COLUMN relationships.partner_b_photo_url IS 'Photo URL chosen by partner B for their homepage view';
COMMENT ON COLUMN relationships.couple_photo_url IS 'Legacy shared photo URL (now used as fallback if per-partner photos not set)';
