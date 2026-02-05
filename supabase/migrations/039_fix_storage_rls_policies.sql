-- Fix Storage RLS policies for photo uploads
-- This allows authenticated users to upload and access their photos

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- Policy 1: Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload their own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Allow authenticated users to update their own photos
CREATE POLICY "Users can update their own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Allow authenticated users to read all photos in the photos bucket
-- This allows partners to see each other's photos
CREATE POLICY "Authenticated users can view photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'photos');

-- Policy 4: Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Ensure the photos bucket exists and is public (for viewing)
-- Note: This needs to be done in Supabase Dashboard if not already created
-- Go to Storage > Create bucket > name: photos, public: true

COMMENT ON POLICY "Users can upload their own photos" ON storage.objects IS
  'Allows authenticated users to upload photos to their folder in the photos bucket';

COMMENT ON POLICY "Authenticated users can view photos" ON storage.objects IS
  'Allows all authenticated users to view photos - needed for partners to see each others photos';
