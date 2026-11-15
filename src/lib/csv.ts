/**
 * CSV Generation for THINK MIT Admin
 * RFC-4180 compliant, UTF-8 BOM, CRLF line endings, Formula Injection Guard
 */

export function formatIST(dateStr?: string | Date | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const findPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const day = findPart('day');
  const month = findPart('month');
  const year = findPart('year');
  const hour = findPart('hour');
  const minute = findPart('minute');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function formatISO(dateStr?: string | Date | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

/**
 * Sanitizes cell for formula injection and RFC-4180 quoting
 */
export function sanitizeCell(val: unknown, isPhone: boolean = false): string {
  if (val === null || val === undefined) return '';

  let str = String(val);

  // Phone numbers (or text starting with +91...): prefix with ' so Excel treats as text
  if (isPhone && str.length > 0) {
    if (!str.startsWith("'")) {
      str = `'${str}`;
    }
  } else if (/^[=+\-@\t\r]/.test(str)) {
    // Formula-injection guard: prefix with ' if it starts with =, +, -, @, tab, or carriage return
    str = `'${str}`;
  }

  // RFC-4180 quoting: if cell contains comma, double-quote, or newline, enclose in quotes and double internal quotes
  if (/[",\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export interface TeamMemberRecord {
  position?: number;
  is_leader?: boolean;
  role_key?: string;
  name?: string;
  usn?: string;
  email?: string;
  phone?: string;
  programme?: string;
  year?: string | number;
  department?: string;
  branch?: string;
}

export interface TeamRecord {
  id?: string;
  reg_code?: string;
  team_name?: string;
  track_key?: string;
  status?: string;
  idea_title?: string;
  problem?: string;
  idea_abstract?: string;
  solution?: string;
  uniqueness?: string;
  impact?: string;
  reference_link?: string;
  ppt_url?: string;
  pitch_deck_url?: string;
  score?: number | null;
  admin_notes?: string;
  internal_notes?: string;
  created_at?: string;
  members?: TeamMemberRecord[];
}

export interface ContentLookup {
  roles?: Array<{ key: string; label?: string; name?: string }>;
  tracks?: Array<{ key: string; title?: string; name?: string }>;
  [key: string]: unknown;
}

export function generateTeamCSV(
  teams: TeamRecord[],
  content?: ContentLookup,
  includeInternal: boolean = false
): string {
  const roleMap: Record<string, string> = {};
  ((content?.roles as Array<{ key: string; label?: string; name?: string }>) || []).forEach((r) => {
    roleMap[r.key] = r.label || r.name || r.key;
  });

  const trackMap: Record<string, string> = {};
  ((content?.tracks as Array<{ key: string; title?: string; name?: string }>) || []).forEach((t) => {
    trackMap[t.key] = t.title || t.name || t.key;
  });

  // PRD & M8 Columns:
  // Team Name, Track, Status, Idea Title, Problem, Solution, Uniqueness, Impact, Link;
  // then for Member 1–3: Name, USN, Email, Phone, Programme, Year, Department, Stream/Role;
  // then Pitch Deck URL, Submitted At (ISO), Submitted At (IST), Team ID.
  const headers = [
    'Team Name',
    'Track',
    'Status',
    'Idea Title',
    'Problem',
    'Solution',
    'Uniqueness',
    'Impact',
    'Link',
    'Member 1 Name',
    'Member 1 USN',
    'Member 1 Email',
    'Member 1 Phone',
    'Member 1 Programme',
    'Member 1 Year',
    'Member 1 Department',
    'Member 1 Stream/Role',
    'Member 2 Name',
    'Member 2 USN',
    'Member 2 Email',
    'Member 2 Phone',
    'Member 2 Programme',
    'Member 2 Year',
    'Member 2 Department',
    'Member 2 Stream/Role',
    'Member 3 Name',
    'Member 3 USN',
    'Member 3 Email',
    'Member 3 Phone',
    'Member 3 Programme',
    'Member 3 Year',
    'Member 3 Department',
    'Member 3 Stream/Role',
    'Pitch Deck URL',
    'Submitted At (ISO)',
    'Submitted At (IST)',
    'Team ID',
  ];

  if (includeInternal) {
    headers.push('Score', 'Admin Notes');
  }

  const rows: string[] = [headers.map((h) => sanitizeCell(h)).join(',')];

  teams.forEach((team) => {
    const members = [...(team.members || [])].sort((a, b) => (a.position || 0) - (b.position || 0));

    const m1 = members[0] || {};
    const m2 = members[1] || {};
    const m3 = members[2] || {};

    const trackDisplay = (team.track_key && trackMap[team.track_key]) || team.track_key || '';
    const m1Stream = (m1.role_key && roleMap[m1.role_key]) || m1.role_key || '';
    const m2Stream = (m2.role_key && roleMap[m2.role_key]) || m2.role_key || '';
    const m3Stream = (m3.role_key && roleMap[m3.role_key]) || m3.role_key || '';

    const deckUrl = team.pitch_deck_url || team.ppt_url || team.reference_link || '';
    const teamId = team.reg_code || team.id || '';

    const row = [
      sanitizeCell(team.team_name),
      sanitizeCell(trackDisplay),
      sanitizeCell(team.status),
      sanitizeCell(team.idea_title),
      sanitizeCell(team.problem || team.idea_abstract || ''),
      sanitizeCell(team.solution || ''),
      sanitizeCell(team.uniqueness || ''),
      sanitizeCell(team.impact || ''),
      sanitizeCell(team.reference_link || ''),
      // Member 1
      sanitizeCell(m1.name),
      sanitizeCell(m1.usn),
      sanitizeCell(m1.email),
      sanitizeCell(m1.phone, true),
      sanitizeCell(m1.programme),
      sanitizeCell(m1.year),
      sanitizeCell(m1.department || m1.branch),
      sanitizeCell(m1Stream),
      // Member 2
      sanitizeCell(m2.name),
      sanitizeCell(m2.usn),
      sanitizeCell(m2.email),
      sanitizeCell(m2.phone, true),
      sanitizeCell(m2.programme),
      sanitizeCell(m2.year),
      sanitizeCell(m2.department || m2.branch),
      sanitizeCell(m2Stream),
      // Member 3
      sanitizeCell(m3.name),
      sanitizeCell(m3.usn),
      sanitizeCell(m3.email),
      sanitizeCell(m3.phone, true),
      sanitizeCell(m3.programme),
      sanitizeCell(m3.year),
      sanitizeCell(m3.department || m3.branch),
      sanitizeCell(m3Stream),
      // Pitch Deck URL, Submitted At, Team ID
      sanitizeCell(deckUrl),
      sanitizeCell(formatISO(team.created_at)),
      sanitizeCell(formatIST(team.created_at)),
      sanitizeCell(teamId),
    ];

    if (includeInternal) {
      row.push(
        sanitizeCell(team.score !== null && team.score !== undefined ? team.score : ''),
        sanitizeCell(team.admin_notes || team.internal_notes || '')
      );
    }

    rows.push(row.join(','));
  });

  // UTF-8 BOM + CRLF joined rows
  return '\uFEFF' + rows.join('\r\n');
}

export function generateMemberCSV(teams: TeamRecord[], content?: ContentLookup): string {
  const roleMap: Record<string, string> = {};
  ((content?.roles as Array<{ key: string; label?: string; name?: string }>) || []).forEach((r) => {
    roleMap[r.key] = r.label || r.name || r.key;
  });

  const trackMap: Record<string, string> = {};
  ((content?.tracks as Array<{ key: string; title?: string; name?: string }>) || []).forEach((t) => {
    trackMap[t.key] = t.title || t.name || t.key;
  });

  // PRD & M8 Columns:
  // Team Name, Member No, Is Leader, Name, USN, Email, Phone, Programme, Year, Department, Stream/Role, Track, Status, Submitted At
  const headers = [
    'Team Name',
    'Member No',
    'Is Leader',
    'Name',
    'USN',
    'Email',
    'Phone',
    'Programme',
    'Year',
    'Department',
    'Stream/Role',
    'Track',
    'Status',
    'Submitted At',
  ];

  const rows: string[] = [headers.map((h) => sanitizeCell(h)).join(',')];

  teams.forEach((team) => {
    const trackDisplay = (team.track_key && trackMap[team.track_key]) || team.track_key || '';
    const members = [...(team.members || [])].sort((a, b) => (a.position || 0) - (b.position || 0));

    members.forEach((m, idx) => {
      const memberNo = m.position || idx + 1;
      const isLeader = memberNo === 1 || m.is_leader ? 'Yes' : 'No';
      const streamDisplay = (m.role_key && roleMap[m.role_key]) || m.role_key || '';

      const row = [
        sanitizeCell(team.team_name),
        sanitizeCell(memberNo),
        sanitizeCell(isLeader),
        sanitizeCell(m.name),
        sanitizeCell(m.usn),
        sanitizeCell(m.email),
        sanitizeCell(m.phone, true),
        sanitizeCell(m.programme),
        sanitizeCell(m.year),
        sanitizeCell(m.department || m.branch),
        sanitizeCell(streamDisplay),
        sanitizeCell(trackDisplay),
        sanitizeCell(team.status),
        sanitizeCell(formatIST(team.created_at)),
      ];

      rows.push(row.join(','));
    });
  });

  // UTF-8 BOM + CRLF joined rows
  return '\uFEFF' + rows.join('\r\n');
}
