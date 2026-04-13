/**
 * Run with: npx tsx scripts/create-storage-bucket.ts
 * Creates the "post-assets" bucket in Supabase Storage.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local manually (no dotenv dependency needed)
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  envVars[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
}

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log('🔧 Connecting to Supabase...');

  // Check if bucket already exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Error listing buckets:', listError.message);
    process.exit(1);
  }

  const exists = buckets?.some((b) => b.id === 'post-assets');
  if (exists) {
    console.log('✅ Bucket "post-assets" already exists.');
    return;
  }

  // Create bucket
  const { data, error } = await supabase.storage.createBucket('post-assets', {
    public: true,
    fileSizeLimit: 52428800, // 50 MB
    allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
  });

  if (error) {
    console.error('Error creating bucket:', error.message);
    process.exit(1);
  }

  console.log('✅ Bucket "post-assets" created successfully:', data);

  // Add public read policy
  const { error: policyError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY IF NOT EXISTS "Public read access for post-assets"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'post-assets');
    `,
  });

  if (policyError) {
    console.log('⚠️  Could not create read policy via RPC (normal if exec_sql is not enabled).');
    console.log('   Go to Supabase Dashboard → Storage → post-assets → Policies:');
    console.log('   Add SELECT policy for all users with: bucket_id = \'post-assets\'');
  } else {
    console.log('✅ Public read policy created.');
  }

  // Add authenticated upload policy
  const { error: uploadPolicyError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY IF NOT EXISTS "Authenticated upload for post-assets"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'post-assets' AND auth.role() = 'authenticated');
    `,
  });

  if (uploadPolicyError) {
    console.log('⚠️  Could not create upload policy via RPC.');
    console.log('   Go to Supabase Dashboard → Storage → post-assets → Policies:');
    console.log('   Add INSERT policy for authenticated with: bucket_id = \'post-assets\'');
  } else {
    console.log('✅ Authenticated upload policy created.');
  }
}

main();
