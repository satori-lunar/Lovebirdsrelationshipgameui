-- Set up Supabase storage bucket for profile photos
-- This creates the 'photos' bucket and sets up proper RLS policies

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos to their own folder
CREATE POLICY "Users can upload their own photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.foldername(name))[2] = 'profile-photos'
);

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update their own photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.foldername(name))[2] = 'profile-photos'
);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.foldername(name))[2] = 'profile-photos'
);

-- Allow public access to view photos (since bucket is public)
CREATE POLICY "Anyone can view photos" ON storage.objects
FOR SELECT USING (bucket_id = 'photos');

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
