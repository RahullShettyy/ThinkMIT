import assert from 'node:assert';
import {
  sanitizeCell,
  formatIST,
  formatISO,
  generateTeamCSV,
  generateMemberCSV,
} from '../src/lib/csv.ts';

console.log('--- RUNNING CSV UNIT TESTS ---');

// 1. Quoting & Delimiters
const quoteWithComma = sanitizeCell('Mysuru, Karnataka');
assert.strictEqual(quoteWithComma, '"Mysuru, Karnataka"', 'Comma must be wrapped in quotes');

const quoteWithDoubleQuotes = sanitizeCell('The "AI" System');
assert.strictEqual(quoteWithDoubleQuotes, '"The ""AI"" System"', 'Double quotes must be escaped as ""');

const quoteWithNewline = sanitizeCell("Line 1\nLine 2");
assert.strictEqual(quoteWithNewline, '"Line 1\nLine 2"', 'Newlines must be wrapped in quotes');

console.log('✓ Quoting and RFC-4180 delimiter tests passed');

// 2. Unicode and Kannada Names
const kannadaName = sanitizeCell('ಪ್ರವೀಣ್ ಕುಮಾರ್');
assert.strictEqual(kannadaName, 'ಪ್ರವೀಣ್ ಕುಮಾರ್', 'Kannada characters must be preserved');

const kannadaWithComma = sanitizeCell('ಕುಮಾರ್, ಪ್ರವೀಣ್');
assert.strictEqual(kannadaWithComma, '"ಕುಮಾರ್, ಪ್ರವೀಣ್"', 'Kannada with comma must be properly quoted');

console.log('✓ Unicode / Kannada character tests passed');

// 3. Formula Injection Guard
const eqFormula = sanitizeCell('=SUM(A1:B10)');
assert.strictEqual(eqFormula, "'=SUM(A1:B10)", 'Leading = must be prefixed with single quote');

const plusFormula = sanitizeCell('+123456');
assert.strictEqual(plusFormula, "'+123456", 'Leading + must be prefixed with single quote');

const minusFormula = sanitizeCell('-CMD|calc');
assert.strictEqual(minusFormula, "'-CMD|calc", 'Leading - must be prefixed with single quote');

const atFormula = sanitizeCell('@SUM(1;2)');
assert.strictEqual(atFormula, "'@SUM(1;2)", 'Leading @ must be prefixed with single quote');

const atFormulaWithComma = sanitizeCell('@SUM(1,2)');
assert.strictEqual(atFormulaWithComma, `"'@SUM(1,2)"`, 'Leading @ with comma must be prefixed with single quote and quoted');

const tabFormula = sanitizeCell('\tmalicious');
assert.strictEqual(tabFormula, "'\tmalicious", 'Leading Tab must be prefixed with single quote');

const crFormula = sanitizeCell('\rmalicious');
assert.ok(crFormula.startsWith('"\'\r') || crFormula.startsWith("'\r"), 'Leading CR must be protected and quoted');

console.log('✓ Formula injection guard tests passed');

// 4. Phone Numbers (+91 and 10 digits)
const phoneWithPlus = sanitizeCell('+919876543210', true);
assert.strictEqual(phoneWithPlus, "'+919876543210", 'Phone number with +91 must be single-quoted text');

const phone10Digits = sanitizeCell('9876543210', true);
assert.strictEqual(phone10Digits, "'9876543210", '10 digit phone number must be single-quoted text to prevent scientific notation');

console.log('✓ Phone number formatting tests passed');

// 5. Empty and null values
assert.strictEqual(sanitizeCell(null), '', 'null should return empty string');
assert.strictEqual(sanitizeCell(undefined), '', 'undefined should return empty string');
assert.strictEqual(sanitizeCell(''), '', 'empty string should return empty string');

console.log('✓ Empty value tests passed');

// 6. Test generateTeamCSV and generateMemberCSV
const mockTeams = [
  {
    id: 'team-uuid-1',
    reg_code: 'TMIT-0001',
    team_name: 'Smart Campus, Inc.',
    track_key: 'track1',
    status: 'submitted',
    idea_title: '=DangerousTitle',
    problem: 'Waste management on campus\nNeed segregation',
    solution: '+Automated bin sorting',
    uniqueness: '@Patented sensor technology',
    impact: '-Reduces landfill by 80%',
    reference_link: 'https://example.com/pitch.pdf',
    created_at: '2026-11-14T06:30:00.000Z',
    members: [
      {
        position: 1,
        name: 'ಪ್ರವೀಣ್ ಕುಮಾರ್',
        usn: '4MT22CS001',
        email: 'praveen@mitmysore.in',
        phone: '+919876543210',
        programme: 'UG',
        year: '3',
        department: 'CSE',
        role_key: 'business',
      },
      {
        position: 2,
        name: 'Jane Doe',
        usn: '4MT22CS002',
        email: 'jane@mitmysore.in',
        phone: '9876543211',
        programme: 'UG',
        year: '3',
        department: 'CSE',
        role_key: 'innovation',
      },
      {
        position: 3,
        name: 'John Smith',
        usn: '4MT22CS003',
        email: 'john@mitmysore.in',
        phone: '9876543212',
        programme: 'UG',
        year: '3',
        department: 'CSE',
        role_key: 'technical',
      },
    ],
  },
  {
    id: 'team-uuid-2',
    reg_code: 'TMIT-0002',
    team_name: 'EcoEnergy',
    track_key: 'track2',
    status: 'shortlisted',
    idea_title: 'Solar Pods',
    problem: 'High electricity cost',
    solution: 'Smart micro solar arrays',
    uniqueness: 'Low cost modular cells',
    impact: 'Saves 30% grid energy',
    reference_link: '',
    created_at: '2026-11-14T07:00:00.000Z',
    members: [
      {
        position: 1,
        name: 'Asha R',
        usn: '4MT22AI010',
        email: 'asha@mitmysore.in',
        phone: '9876543213',
        programme: 'UG',
        year: '2',
        department: 'AI',
        role_key: 'business',
      },
    ],
  },
];

const mockContent = {
  tracks: [
    { key: 'track1', title: 'Smart Campus & Sustainability' },
    { key: 'track2', title: 'Energy & Environment' },
  ],
  roles: [
    { key: 'business', label: 'Business Lead' },
    { key: 'innovation', label: 'Innovation Lead' },
    { key: 'technical', label: 'Technical Lead' },
  ],
};

// Test Team CSV
const teamCSV = generateTeamCSV(mockTeams, mockContent);

// Check BOM
assert.ok(teamCSV.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');

// Check CRLF
assert.ok(teamCSV.includes('\r\n'), 'CSV must use CRLF line endings');

const teamLines = teamCSV.slice(1).split('\r\n');
assert.strictEqual(teamLines.length, 3, 'Team CSV should have 1 header line + 2 team lines');

// Verify headers
assert.ok(teamLines[0].includes('Team Name'), 'Header must contain Team Name');
assert.ok(teamLines[0].includes('Track'), 'Header must contain Track');
assert.ok(teamLines[0].includes('Status'), 'Header must contain Status');
assert.ok(teamLines[0].includes('Member 1 Name'), 'Header must contain Member 1 Name');
assert.ok(teamLines[0].includes('Pitch Deck URL'), 'Header must contain Pitch Deck URL');

// Verify formula guard in team data: no unquoted raw =, +, -, @ at the beginning of any cell
const cells = teamLines[1].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
for (const cell of cells) {
  const unquoted = cell.replace(/^"/, '').replace(/"$/, '');
  if (unquoted.length > 0) {
    assert.ok(
      !/^[=+\-@\t\r]/.test(unquoted),
      `Cell must not begin with raw formula trigger: ${cell}`
    );
  }
}

// Test Member CSV
const memberCSV = generateMemberCSV(mockTeams, mockContent);
assert.ok(memberCSV.startsWith('\uFEFF'), 'Member CSV must start with UTF-8 BOM');
assert.ok(memberCSV.includes('\r\n'), 'Member CSV must use CRLF line endings');

const memberLines = memberCSV.slice(1).split('\r\n');
// Team 1 has 3 members, Team 2 has 1 member -> total 4 member rows + 1 header row = 5 rows
assert.strictEqual(memberLines.length, 5, 'Member CSV should have 1 header line + 4 member lines');

assert.ok(memberLines[0].includes('Team Name'), 'Header must contain Team Name');
assert.ok(memberLines[0].includes('Member No'), 'Header must contain Member No');
assert.ok(memberLines[0].includes('Is Leader'), 'Header must contain Is Leader');

console.log('✓ Team CSV and Member CSV generation tests passed');
console.log('ALL CSV TESTS PASSED SUCCESSFULLY! 🎉');
