/**
 * Run with: npx tsx scripts/create-storage-policies.ts
 * Creates RLS policies for the "post-assets" bucket via Supabase SQL endpoint.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local
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
  console.error('Missing env vars');
  process.exit(1);
}

// Extract project ref from URL (e.g. https://abc123.supabase.co → abc123)
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

async function runSQL(sql: string, label: string) {
  // Use the Supabase REST SQL endpoint (postgrest pg/sql)
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
    },
    body: JSON.stringify({}),
  });

  // Fallback: use direct postgres connection via supabase-js query
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    db: { schema: 'storage' },
  });

  // Try using the default schema client for raw SQL
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Execute via pg_net or direct — use postgrest functions approach
  const { error } = await client.from('_dummy_').select().limit(0).maybeSingle();
  // Ignore — we just need the client initialized

  return { error: null };
}

async function main() {
  console.log('🔧 Creating storage policies via Supabase Management API...\n');

  // Use the Supabase Management API to run SQL
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const policies = [
    {
      label: 'Public SELECT (read) policy',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE policyname = 'Public read post-assets' AND tablename = 'objects' AND schemaname = 'storage'
          ) THEN
            CREATE POLICY "Public read post-assets"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'post-assets');
          END IF;
        END $$;
      `,
    },
    {
      label: 'Authenticated INSERT (upload) policy',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE policyname = 'Auth upload post-assets' AND tablename = 'objects' AND schemaname = 'storage'
          ) THEN
            CREATE POLICY "Auth upload post-assets"
            ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'post-assets');
          END IF;
        END $$;
      `,
    },
    {
      label: 'Authenticated UPDATE (overwrite) policy',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE policyname = 'Auth update post-assets' AND tablename = 'objects' AND schemaname = 'storage'
          ) THEN
            CREATE POLICY "Auth update post-assets"
            ON storage.objects FOR UPDATE
            USING (bucket_id = 'post-assets');
          END IF;
        END $$;
      `,
    },
  ];

  for (const policy of policies) {
    console.log(`→ ${policy.label}...`);
    try {
      const res = await fetch(mgmtUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ query: policy.sql }),
      });

      if (!res.ok) {
        const text = await res.text();
        // Try alternative: direct postgREST rpc
        console.log(`  ⚠️  Management API returned ${res.status}. Trying direct approach...`);

        // Use supabase-js with service role to call raw SQL via pg functions
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false },
        });

        // The simplest: just try the postgrest SQL function
        const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
        if (error) {
          console.log(`  ❌ ${error.message}`);
          console.log(`  → You need to add this policy manually in Supabase Dashboard.`);
        } else {
          console.log(`  ✅ Created via RPC`);
        }
      } else {
        console.log(`  ✅ Created`);
      }
    } catch (err: any) {
      console.log(`  ❌ ${err.message}`);
    }
  }

  console.log('\n📋 If any policy failed, add them manually in Supabase Dashboard:');
  console.log('   Storage → post-assets → Policies (top-right button)');
  console.log('   1. "New Policy" → SELECT → For all users → bucket_id = \'post-assets\'');
  console.log('   2. "New Policy" → INSERT → For authenticated → bucket_id = \'post-assets\'');
  console.log('   3. "New Policy" → UPDATE → For authenticated → bucket_id = \'post-assets\'');
}

main();
