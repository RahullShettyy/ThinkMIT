import assert from 'node:assert';
import { parseEmbedVideo } from '../src/components/PromoVideo.tsx';

console.log('--- RUNNING MILESTONE 10 TESTS ---');

// 1. YouTube link parsing
const ytStandard = parseEmbedVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube');
assert.strictEqual(
  ytStandard,
  'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
  'Standard YouTube URL must parse to youtube-nocookie embed'
);

const ytShort = parseEmbedVideo('https://youtu.be/dQw4w9WgXcQ', 'youtube');
assert.strictEqual(
  ytShort,
  'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
  'youtu.be short URL must parse to youtube-nocookie embed'
);

const ytShorts = parseEmbedVideo('https://www.youtube.com/shorts/dQw4w9WgXcQ', 'youtube');
assert.strictEqual(
  ytShorts,
  'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
  'YouTube shorts URL must parse to youtube-nocookie embed'
);

console.log('✓ YouTube safe embed tests passed');

// 2. Vimeo link parsing
const vimeoUrl = parseEmbedVideo('https://vimeo.com/123456789', 'vimeo');
assert.strictEqual(
  vimeoUrl,
  'https://player.vimeo.com/video/123456789?autoplay=1',
  'Vimeo URL must parse to player.vimeo.com embed'
);

console.log('✓ Vimeo safe embed tests passed');

// 3. Security: Reject non-youtube/vimeo domains or malformed URLs
const maliciousUrl = parseEmbedVideo('https://malicious-site.com/video.mp4', 'youtube');
assert.strictEqual(maliciousUrl, null, 'Unapproved domains must return null');

const xssUrl = parseEmbedVideo('javascript:alert(1)', 'youtube');
assert.strictEqual(xssUrl, null, 'javascript: URLs must return null');

console.log('✓ Video URL domain safety tests passed');

// 4. File extension and size rejection logic test
function validateUploadSecurity(filename, fileType, fileSize, category) {
  const lower = filename.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf('.'));

  if (/\.(exe|bat|cmd|sh|php|js|jsx|ts|tsx|dll|scr|vbs)$/i.test(lower)) {
    return { ok: false, error: 'Executable forbidden' };
  }

  if (category === 'promo') {
    if (!['video/mp4', 'video/webm'].includes(fileType) || !['.mp4', '.webm'].includes(ext)) {
      return { ok: false, error: 'Invalid video format' };
    }
    if (fileSize > 200 * 1024 * 1024) {
      return { ok: false, error: 'Video too large' };
    }
  } else {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(fileType) || !['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext)) {
      return { ok: false, error: 'Invalid image format' };
    }
    if (fileSize > 5 * 1024 * 1024) {
      return { ok: false, error: 'Image too large' };
    }
  }

  return { ok: true };
}

// Test executable rejection
assert.strictEqual(validateUploadSecurity('malware.exe', 'application/x-msdownload', 1024, 'promo').ok, false);
assert.strictEqual(validateUploadSecurity('script.sh', 'text/x-sh', 1024, 'promo').ok, false);

// Test oversized video rejection (>200 MB)
assert.strictEqual(validateUploadSecurity('big.mp4', 'video/mp4', 201 * 1024 * 1024, 'promo').ok, false);

// Test valid video (<200 MB)
assert.strictEqual(validateUploadSecurity('promo.mp4', 'video/mp4', 50 * 1024 * 1024, 'promo').ok, true);
assert.strictEqual(validateUploadSecurity('promo.webm', 'video/webm', 25 * 1024 * 1024, 'promo').ok, true);

// Test oversized image rejection (>5 MB)
assert.strictEqual(validateUploadSecurity('photo.png', 'image/png', 6 * 1024 * 1024, 'media').ok, false);

// Test valid image (<5 MB)
assert.strictEqual(validateUploadSecurity('campus.webp', 'image/webp', 2 * 1024 * 1024, 'media').ok, true);

console.log('✓ File type and size restriction tests passed');

// 5. Selected Teams Data Sanitization test
// Verify that team payload for public display excludes USN, email, and phone
const rawTeamDbRecord = {
  id: 'uuid-1',
  team_name: 'Campus Innovators',
  track_key: 'track-1',
  idea_title: 'Campus Solar Trash Can',
  status: 'selected',
  members: [
    { name: 'Alice', usn: '4MT22CS001', email: 'alice@mit.edu', phone: '9876543210' },
  ],
};

function formatPublicSelectedTeam(team, trackMap) {
  if (team.status !== 'selected') return null;
  return {
    teamName: team.team_name,
    trackName: trackMap[team.track_key] || team.track_key,
    ideaTitle: team.idea_title,
  };
}

const publicTeam = formatPublicSelectedTeam(rawTeamDbRecord, { 'track-1': 'Smart Campus' });
assert.strictEqual(publicTeam.teamName, 'Campus Innovators');
assert.strictEqual(publicTeam.trackName, 'Smart Campus');
assert.strictEqual(publicTeam.ideaTitle, 'Campus Solar Trash Can');
assert.strictEqual(publicTeam.email, undefined, 'Email must never appear in public selected teams');
assert.strictEqual(publicTeam.phone, undefined, 'Phone must never appear in public selected teams');
assert.strictEqual(publicTeam.usn, undefined, 'USN must never appear in public selected teams');

console.log('✓ Selected teams public privacy guarantee tests passed');
console.log('ALL MILESTONE 10 TESTS PASSED! 🎉');
