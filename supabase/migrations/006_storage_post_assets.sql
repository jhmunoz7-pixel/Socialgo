-- Create the post-assets storage bucket and its access policies.
-- Run this in Supabase SQL Editor if the bucket doesn't exist yet.

-- 1. Create the bucket (public, 50MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-assets',
  'post-assets',
  true,
  52428800, -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'video/mp4', 'video/quicktime', 'video/webm',
        'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Public read access (anyone can view uploaded assets)
CREATE POLICY "Public read post-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-assets');

-- 3. Authenticated users can upload
CREATE POLICY "Auth upload post-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-assets'
    AND auth.role() = 'authenticated'
  );

-- 4. Authenticated users can update their uploads
CREATE POLICY "Auth update post-assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-assets'
    AND auth.role() = 'authenticated'
  );
