import fs from 'node:fs';
import path from 'node:path';

console.log('--- SCANNING .NEXT CLIENT BUNDLES FOR LEAKED SECRETS ---');

const staticDir = path.join(process.cwd(), '.next', 'static');

if (!fs.existsSync(staticDir)) {
  console.error('ERROR: .next/static does not exist. Run "npm run build" first.');
  process.exit(1);
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const jsFiles = getAllFiles(staticDir);
console.log(`Found ${jsFiles.length} client JavaScript bundles to analyze.`);

let leaksFound = false;

for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');

  // Check for SUPABASE_SERVICE_ROLE string
  if (content.includes('SUPABASE_SERVICE_ROLE')) {
    console.error(`❌ LEAK FOUND in client bundle: ${file} contains "SUPABASE_SERVICE_ROLE"`);
    leaksFound = true;
  }

  // Check for common service role key keywords
  if (content.includes('service_role') && !content.includes('role_key')) {
    // Check if it's an actual token or just standard text
    if (/service_role.*eyJ/.test(content)) {
      console.error(`❌ LEAK FOUND in client bundle: ${file} contains service_role JWT token!`);
      leaksFound = true;
    }
  }
}

if (!leaksFound) {
  console.log('✓ PASS: No service-role key or SUPABASE_SERVICE_ROLE references found in any client bundle!');
  process.exit(0);
} else {
  console.error('FAILED: One or more client bundles contained sensitive server-only tokens.');
  process.exit(1);
}
