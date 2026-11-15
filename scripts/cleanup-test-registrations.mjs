import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local if present
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runCleanup() {
  console.log('--- PRE-LAUNCH TEST REGISTRATION CLEANUP UTILITY ---');

  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to run cleanup.');
    console.log('Provide them in .env.local or environment variables before executing.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const args = process.argv.slice(2);
  const deleteAll = args.includes('--all');
  const confirm = args.includes('--confirm');

  if (deleteAll) {
    if (!confirm) {
      console.warn('⚠ WARNING: --all flag requested to delete ALL teams.');
      console.warn('To proceed, run: node scripts/cleanup-test-registrations.mjs --all --confirm');
      process.exit(1);
    }

    console.log('Purging all registration records...');
    const { data, error } = await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('id, reg_code, team_name');
    if (error) {
      console.error('Error during cleanup:', error.message);
      process.exit(1);
    }

    console.log(`✓ Successfully deleted ${data?.length || 0} teams and their associated members.`);
  } else {
    console.log('Scanning for synthetic test registrations (e.g. Test*, Pioneers, Green Energy, probe)...');
    
    // Query teams that match test patterns
    const { data: testTeams, error } = await supabase
      .from('teams')
      .select('id, reg_code, team_name')
      .or('team_name.ilike.%test%,team_name.ilike.%pioneer%,team_name.ilike.%green energy%,team_name.ilike.%probe%,team_name.ilike.%hack%');

    if (error) {
      console.error('Error querying test teams:', error.message);
      process.exit(1);
    }

    if (!testTeams || testTeams.length === 0) {
      console.log('No synthetic test registrations found matching test naming patterns.');
      process.exit(0);
    }

    console.log(`Found ${testTeams.length} test team(s) to remove:`);
    testTeams.forEach((t) => console.log(` - [${t.reg_code}] ${t.team_name} (${t.id})`));

    const ids = testTeams.map((t) => t.id);
    const { error: delError } = await supabase.from('teams').delete().in('id', ids);

    if (delError) {
      console.error('Failed to delete test teams:', delError.message);
      process.exit(1);
    }

    console.log(`✓ Cleaned up ${testTeams.length} test teams successfully.`);
  }

  console.log('\nNOTE: If you wish to reset the registration sequence back to TMIT-0001 in Supabase SQL editor:');
  console.log('ALTER SEQUENCE team_reg_seq RESTART WITH 1;');
}

runCleanup().catch((err) => {
  console.error('Cleanup execution failed:', err);
  process.exit(1);
});
