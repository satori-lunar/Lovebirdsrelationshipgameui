-- Add media support to couple challenge responses
-- Run this in Supabase SQL Editor to enable photo/video uploads in challenges

-- Add media columns to couple_challenge_responses
ALTER TABLE public.couple_challenge_responses
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'video'));

-- Create storage bucket for challenge media if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('challenge-media', 'challenge-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for challenge media
DROP POLICY IF EXISTS "Users can upload their own challenge media" ON storage.objects;
CREATE POLICY "Users can upload their own challenge media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'challenge-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their own and partner's challenge media" ON storage.objects;
CREATE POLICY "Users can view their own and partner's challenge media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'challenge-media' AND
  (
    -- Own media
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Partner's media (if they're in a relationship)
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE (
        relationships.partner_a_id = auth.uid() AND
        relationships.partner_b_id::text = (storage.foldername(name))[1]
      ) OR (
        relationships.partner_b_id = auth.uid() AND
        relationships.partner_a_id::text = (storage.foldername(name))[1]
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own challenge media" ON storage.objects;
CREATE POLICY "Users can update their own challenge media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'challenge-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own challenge media" ON storage.objects;
CREATE POLICY "Users can delete their own challenge media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'challenge-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
