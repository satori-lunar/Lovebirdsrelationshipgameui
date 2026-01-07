# Profile Photos Storage Setup

## Issue
The app requires a Supabase storage bucket for profile photos, but regular users cannot create storage buckets or RLS policies through SQL migrations.

## Solution
Set up the storage bucket manually through the Supabase Dashboard:

### Step 1: Create Storage Bucket
1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the sidebar
3. Click **Create bucket**
4. Set bucket name: `photos`
5. Check **Public bucket** (so profile photos can be viewed)
6. Click **Create bucket**

### Step 2: Configure Bucket Policies
1. In the Storage section, click on the `photos` bucket
2. Go to **Policies** tab
3. Create the following policies:

#### Policy 1: Allow viewing photos (for public access)
```sql
-- Allow public access to view photos
CREATE POLICY "Anyone can view photos" ON storage.objects
FOR SELECT USING (bucket_id = 'photos');
```

#### Policy 2: Allow uploading photos (authenticated users only)
```sql
-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'photos' AND
  auth.role() = 'authenticated'
);
```

#### Policy 3: Allow updating own photos
```sql
-- Allow users to update their own photos
CREATE POLICY "Users can update own photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 4: Allow deleting own photos
```sql
-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Step 3: Enable RLS
Make sure Row Level Security is enabled for the storage.objects table (it should be by default).

## Alternative: Use Existing Bucket
If you already have a storage bucket for photos, update the `PhotoUpload.tsx` component to use your existing bucket name instead of `'photos'`.

## Testing
After setup:
1. Try uploading a profile photo
2. Check that the photo appears in the Supabase Storage dashboard
3. Verify that photos are publicly accessible

## Notes
- The bucket should be public so profile photos can be displayed
- RLS policies ensure users can only upload/update/delete their own photos
- The app will handle the case where storage is not set up with appropriate error messages
