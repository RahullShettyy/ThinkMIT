import fs from 'node:fs';
import path from 'node:path';

console.log('--- EXECUTING ENVIRONMENT VARIABLES SECURITY AUDIT ---');

// Load .env.local if present
function loadEnvLocal() {
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

loadEnvLocal();

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_EMAILS',
];

let failed = false;

// 1. Check required variables
for (const varName of REQUIRED_VARS) {
  const val = process.env[varName];
  if (!val || val.trim() === '') {
    console.error(`❌ MISSING REQUIRED ENV VARIABLE: ${varName} is unset or empty.`);
    failed = true;
  } else {
    console.log(`✓ ${varName} is present.`);
  }
}

// 2. Critical Security Check: Ensure NO secret is exposed with NEXT_PUBLIC_ prefix
for (const [key, val] of Object.entries(process.env)) {
  if (key.startsWith('NEXT_PUBLIC_')) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('service') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('private_key') ||
      lowerKey.includes('role_key')
    ) {
      console.error(
        `❌ CRITICAL SECURITY VIOLATION: Environment variable "${key}" has a NEXT_PUBLIC_ prefix but contains sensitive keywords. Client browsers would receive this secret!`
      );
      failed = true;
    }

    // Inspect JWT payload if value looks like a token
    if (typeof val === 'string' && val.startsWith('eyJ')) {
      try {
        const parts = val.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.role === 'service_role') {
            console.error(
              `❌ CRITICAL SECURITY VIOLATION: "${key}" contains a Supabase service_role JWT token! Never expose service_role to NEXT_PUBLIC_ variables.`
            );
            failed = true;
          }
        }
      } catch {
        // Not a standard base64 JSON JWT
      }
    }
  }
}

// 3. ADMIN_EMAILS format check
if (process.env.ADMIN_EMAILS) {
  const emails = process.env.ADMIN_EMAILS.split(',').map((e) => e.trim()).filter(Boolean);
  if (emails.length === 0) {
    console.error('❌ ADMIN_EMAILS must contain at least one comma-separated email address.');
    failed = true;
  } else {
    console.log(`✓ ADMIN_EMAILS configured with ${emails.length} authorized administrator(s).`);
  }
}

console.log('------------------------------------------------------');
if (failed) {
  console.error('ENVIRONMENT AUDIT FAILED. Fix issues above before deploying.');
  process.exit(1);
} else {
  console.log('ENVIRONMENT AUDIT PASSED: All secrets safely separated, all required variables configured.');
  process.exit(0);
}
