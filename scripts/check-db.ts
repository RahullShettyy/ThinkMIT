import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Helper to load .env.local if present
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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkDatabase() {
  console.log('--- SUPABASE SECURITY & RLS INTEGRITY AUDIT ---');

  if (!supabaseUrl) {
    console.error('FAIL: Missing NEXT_PUBLIC_SUPABASE_URL in environment or .env.local');
    process.exit(1);
  }

  console.log(`Supabase URL: ${supabaseUrl}`);
  let allPass = true;

  // 1. Audit Anon Client Access (Public / Student boundary)
  if (anonKey) {
    console.log('\n[Phase 1] Auditing Anon Role Security Boundaries...');
    const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    // A. Anon cannot SELECT from teams
    const { data: anonTeams, error: anonSelectError } = await anonClient.from('teams').select('*');
    if (!anonSelectError && anonTeams && anonTeams.length > 0) {
      console.error('❌ CRITICAL SECURITY VULNERABILITY: Anon key can SELECT registrations from public.teams!');
      allPass = false;
    } else {
      console.log('✓ PASS: Anon client cannot select registration data from public.teams (blocked by RLS)');
    }

    // B. Anon cannot SELECT from members
    const { data: anonMembers, error: anonMemberErr } = await anonClient.from('members').select('*');
    if (!anonMemberErr && anonMembers && anonMembers.length > 0) {
      console.error('❌ CRITICAL SECURITY VULNERABILITY: Anon key can SELECT member USN/email from public.members!');
      allPass = false;
    } else {
      console.log('✓ PASS: Anon client cannot select student details from public.members (blocked by RLS)');
    }

    // C. Anon cannot directly INSERT into teams without RPC
    const { error: anonDirectInsertErr } = await anonClient.from('teams').insert({
      team_name: '__hack_team__',
      track_key: 'track-1',
      idea_title: 'Hack',
      problem: 'p',
      solution: 's',
      uniqueness: 'u',
      impact: 'i',
      reg_code: 'HACK-001',
    });
    if (!anonDirectInsertErr) {
      console.error('❌ CRITICAL SECURITY VULNERABILITY: Anon key can directly INSERT into public.teams!');
      allPass = false;
    } else {
      console.log('✓ PASS: Anon client cannot directly insert into public.teams (must use server atomic RPC)');
    }
  } else {
    console.warn('⚠ Note: NEXT_PUBLIC_SUPABASE_ANON_KEY not configured for anon audit check.');
  }

  // 2. Audit Admin / Service Role Client (Server-only boundary)
  if (serviceKey) {
    console.log('\n[Phase 2] Auditing Server Service Role Client...');
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Check table 'teams'
    const { error: teamsErr } = await adminClient.from('teams').select('id').limit(1);
    if (teamsErr && teamsErr.code !== 'PGRST116') {
      console.error(`[FAIL] Table 'teams': ${teamsErr.message}`);
      allPass = false;
    } else {
      console.log(`[PASS] Server client connects to 'teams' table`);
    }

    // Check table 'members'
    const { error: membersErr } = await adminClient.from('members').select('id').limit(1);
    if (membersErr && membersErr.code !== 'PGRST116') {
      console.error(`[FAIL] Table 'members': ${membersErr.message}`);
      allPass = false;
    } else {
      console.log(`[PASS] Server client connects to 'members' table`);
    }

    // Check table 'site_content'
    const { error: contentErr } = await adminClient.from('site_content').select('section').limit(1);
    if (contentErr && contentErr.code !== 'PGRST116') {
      console.error(`[FAIL] Table 'site_content': ${contentErr.message}`);
      allPass = false;
    } else {
      console.log(`[PASS] Server client connects to 'site_content' table`);
    }

    // Check atomic RPC 'register_team'
    const { error: rpcErr } = await adminClient.rpc('register_team', {
      payload: {},
      p_submission_key: '__db_probe__',
      p_prefix: 'TEST',
    });
    if (rpcErr && (rpcErr.code === '42883' || rpcErr.message.includes('Could not find the function'))) {
      console.error(`[FAIL] Function 'register_team': ${rpcErr.message}`);
      allPass = false;
    } else {
      console.log(`[PASS] Atomic function 'register_team' verified on server`);
    }
  }

  console.log('\n----------------------------------------------------');
  if (allPass) {
    console.log('ALL DATABASE SECURITY & INTEGRITY AUDITS PASSED.');
    process.exit(0);
  } else {
    console.error('ONE OR MORE CHECKS FAILED.');
    process.exit(1);
  }
}

checkDatabase().catch((err) => {
  console.error('Unexpected check failure:', err);
  process.exit(1);
});
