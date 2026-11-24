import assert from 'node:assert';
import rawData from '../data.js';
import { buildRegistrationSchema } from '../src/lib/schema.ts';

console.log('--- RUNNING EDGE CASE & VALIDATION TESTS ---');

async function runEdgeCaseTests() {
  const content = (rawData.default || rawData);
  const schema = buildRegistrationSchema(content);

  // 1. Unicode, Kannada & Emoji names
  const validUnicodePayload = {
    team_name: 'ಆವಿಷ್ಕಾರ ತಂಡ 🚀',
    track_key: 'waste-to-wealth',
    members: [
      {
        name: 'ಪ್ರವೀಣ್ ಕುಮಾರ್ 💡',
        usn: '4MH23CS001',
        email: 'praveen@mitmysore.in',
        phone: '9876543210',
        role_key: 'business',
        programme: 'UG – 3rd Year',
        year: '3rd Year',
        department: 'CSE',
      },
      {
        name: 'ಆಕಾಶ್ ಶೆಟ್ಟಿ ⭐',
        usn: '4MH23CS002',
        email: 'akash@mitmysore.in',
        phone: '9876543211',
        role_key: 'innovation',
        programme: 'UG – 3rd Year',
        year: '3rd Year',
        department: 'CSE',
      },
      {
        name: 'Dr. John Doe',
        usn: '4MH23CS003',
        email: 'john@mitmysore.in',
        phone: '9876543212',
        role_key: 'technical',
        programme: 'UG – 3rd Year',
        year: '3rd Year',
        department: 'CSE',
      },
    ],
    idea_title: 'ಸ್ಮಾರ್ಟ್ ಕ್ಯಾಂಪಸ್ ವೇಸ್ಟ್ ಮ್ಯಾನೇಜ್ಮೆಂಟ್',
    problem: 'Detailed problem description with campus requirements...',
    solution: 'Automated solar bin system with optical sensors...',
    uniqueness: 'Local components and offline telemetry...',
    impact: 'Reduces manual sorting labor by 80%...',
    consent: true,
  };

  const unicodeResult = schema.safeParse(validUnicodePayload);
  assert.ok(unicodeResult.success, 'Kannada characters and emojis should pass schema validation');
  console.log('✓ Kannada & Emoji unicode name support verified');

  // 2. Length caps
  // Team name max 40
  const oversizedTeamName = {
    ...validUnicodePayload,
    team_name: 'This Team Name Is Way Too Long To Fit Within The Forty Character Limit Set By PRD',
  };
  const teamLenResult = schema.safeParse(oversizedTeamName);
  assert.strictEqual(teamLenResult.success, false, 'Oversized team name should fail validation');

  // Idea title max 80
  const oversizedTitle = {
    ...validUnicodePayload,
    idea_title: 'A'.repeat(81),
  };
  const titleResult = schema.safeParse(oversizedTitle);
  assert.strictEqual(titleResult.success, false, 'Idea title > 80 chars should fail validation');

  // Problem statement max 800
  const oversizedProblem = {
    ...validUnicodePayload,
    problem: 'P'.repeat(801),
  };
  const probResult = schema.safeParse(oversizedProblem);
  assert.strictEqual(probResult.success, false, 'Problem > 800 chars should fail validation');

  console.log('✓ Text length caps enforced according to data.js');

  // 3. Duplicate Stream / Role in same team
  const duplicateStreamPayload = {
    ...validUnicodePayload,
    members: [
      { ...validUnicodePayload.members[0], role_key: 'business' },
      { ...validUnicodePayload.members[1], role_key: 'business' }, // Duplicate stream!
      { ...validUnicodePayload.members[2], role_key: 'technical' },
    ],
  };
  const dupStreamResult = schema.safeParse(duplicateStreamPayload);
  assert.strictEqual(dupStreamResult.success, false, 'Duplicate stream in team must fail validation');
  console.log('✓ Unique stream per team constraint verified');

  // 4. Invalid USN format
  const invalidUsnPayload = {
    ...validUnicodePayload,
    members: [
      { ...validUnicodePayload.members[0], usn: 'SHORT' }, // Must be 10 alphanumeric
      validUnicodePayload.members[1],
      validUnicodePayload.members[2],
    ],
  };
  const usnResult = schema.safeParse(invalidUsnPayload);
  assert.strictEqual(usnResult.success, false, 'Invalid USN must fail validation');
  console.log('✓ 10-character alphanumeric USN constraint verified');

  // 4b. Official and temporary MITM USN prefixes
  const temporaryUsnPayload = {
    ...validUnicodePayload,
    members: [
      { ...validUnicodePayload.members[0], usn: 'MIT26EC076' },
      validUnicodePayload.members[1],
      validUnicodePayload.members[2],
    ],
  };
  const temporaryUsnResult = schema.safeParse(temporaryUsnPayload);
  assert.strictEqual(temporaryUsnResult.success, true, 'Temporary MIT USN must be accepted');

  const outsideCollegeUsnPayload = {
    ...validUnicodePayload,
    members: [
      { ...validUnicodePayload.members[0], usn: '1RV26EC076' },
      validUnicodePayload.members[1],
      validUnicodePayload.members[2],
    ],
  };
  const outsideCollegeUsnResult = schema.safeParse(outsideCollegeUsnPayload);
  assert.strictEqual(outsideCollegeUsnResult.success, false, 'USNs outside 4MH/MIT prefixes must fail');
  console.log('✓ Official 4MH and temporary MIT USN prefixes verified');

  // 5. Invalid Phone (not 10 digits starting with 6-9)
  const invalidPhonePayload = {
    ...validUnicodePayload,
    members: [
      { ...validUnicodePayload.members[0], phone: '12345' },
      validUnicodePayload.members[1],
      validUnicodePayload.members[2],
    ],
  };
  const phoneResult = schema.safeParse(invalidPhonePayload);
  assert.strictEqual(phoneResult.success, false, 'Invalid phone number must fail validation');
  console.log('✓ 10-digit Indian phone regex constraint verified');

  console.log('\nALL EDGE CASE & SCHEMA TESTS PASSED! 🎉');
}

runEdgeCaseTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
