# THINK MIT Pitchfest Website

Official production website and administrative portal for **THINK MIT** — the college-level innovation pitchfest organized by the **Department of CSE–AI** in collaboration with the **Institution's Innovation Council (IIC)** and **Entrepreneurship Development Cell (EDC)** at MITM.

> **Theme**: *"Your Idea. Our Campus. From Pitch to Implementation."*

---

## 1. Tech Stack

- **Framework**: Next.js 14+ (App Router, React 18, TypeScript strict, `allowJs`)
- **Styling**: Semantic CSS design tokens (`src/styles/design.css`, `src/styles/admin.css`) adhering strictly to `Design.md`
- **Smooth Scroll**: `lenis@1.1.13` with accessible `prefers-reduced-motion` detection
- **Database & Auth**: Supabase (PostgreSQL 15, Row Level Security, Supabase Auth)
- **Object Storage**: Supabase Storage (`media` bucket with public read and admin write policies)
- **Validation**: Zod (recursive structural validation for content and multi-step registration schema)
- **Security**: Content Security Policy (CSP), HSTS, no-store admin headers, RFC-4180 CSV generation with formula-injection mitigation
- **Deployment**: Vercel

---

## 2. Local Setup & Quick Start

### Prerequisites
- Node.js 18.x or 20.x+
- Git
- Access to a Supabase project

### Step 1: Clone and Install
```bash
git clone <repository-url>
cd ThinkMIT
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in the required keys:
```env
# Supabase project URL and anon public key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-only service role secret (NEVER prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Authorized administrators (comma-separated)
ADMIN_EMAILS=admin@mitmysore.in,organizer@mitmysore.in

# Site URL for canonical links and metadata
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 3: Run the Development Server
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) for the public landing page.  
Visit [http://localhost:3000/admin](http://localhost:3000/admin) to log in to the admin dashboard.

---

## 3. Supabase Database & Storage Setup

All database migrations, tables, Row Level Security (RLS) policies, atomic functions, and storage bucket definitions are located in `supabase/schema.sql`.

### To apply the schema in Supabase:
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New Query**.
3. Paste the complete contents of `supabase/schema.sql` and click **Run**.
4. Verify the created tables:
   - `public.teams`: stores registered teams, status, scores, and evaluation notes.
   - `public.members`: stores the 3 members per team, designated streams, USNs, and contact details.
   - `public.site_content`: stores live content overrides saved through `/admin/content`.
   - `public.site_content_history`: stores the last 20 versions per section with 1-click restore.
   - `storage.buckets`: bucket named `media` configured with public read and admin-only write policies.
   - `public.register_team()`: atomic security-definer function handling concurrent team registrations.

### To configure Supabase Auth for Administrators:
1. Go to **Authentication** -> **URL Configuration**.
2. Set **Site URL** to your production domain: `https://thinkmit.vercel.app`.
3. Add redirect URLs:
   - `http://localhost:3000/admin`
   - `http://localhost:3000/admin/login`
   - `https://thinkmit.vercel.app/admin`
   - `https://thinkmit.vercel.app/admin/login`
4. Under **Authentication** -> **Users**, invite or create users corresponding to the email addresses listed in `ADMIN_EMAILS`.

---

## 4. Editing Website Content (`data.js` vs Admin Panel)

The website uses a **single source of truth** architecture for all text, dates, guidelines, criteria, and media URLs:

### Development vs Production:
- **`data.js`**:
  - The repository's base default content.
  - In local development (`npm run dev`), edits to `data.js` update the site instantly on page refresh.
  - In production, editing `data.js` requires committing and triggering a Vercel redeploy.
- **Admin Panel Overrides (`/admin/content`)**:
  - Organizers can modify any copy, headings, deadlines, or cards directly in `/admin/content`.
  - Overrides are saved to the Supabase database (`site_content`) and take effect **immediately without redeploying** via `revalidateTag('site-content')`.
  - **Precedence**: Database overrides always win over `data.js`. Clicking **"Reset to default"** in the admin panel deletes the override and reverts to `data.js`.
  - **Dynamic Schema Discovery**: Adding a new key to `data.js` causes it to appear automatically in the recursive content editor on the next reload.

---

## 5. Using the Admin Portal (`/admin`)

Access to `/admin` is restricted by `requireAdmin()` on both client and server:

### 5.1 Dashboard (`/admin`)
- Real-time stats: total registered teams, total students, track distribution, and status breakdown.
- 7-day registration velocity mini bar chart.
- Quick navigation shortcuts.

### 5.2 Registrations Table (`/admin/registrations`)
- Search across Team Name, USN, Member Names, Email, Phone, and Registration Code.
- Filter by Status (`submitted`, `under_review`, `shortlisted`, `selected`, `not_selected`, `withdrawn`), Track, and Programme.
- Click any row to open the in-place editor:
  - Edit student contact information, USNs, and idea abstract.
  - Assign evaluations: Score (0–100), Status, and Private Admin Notes.
- Bulk operations: select multiple teams to change status or delete.
- "+ Add Team Manually" modal: register walk-in teams on the spot with admin override privileges.

### 5.3 Exporting CSVs (`/admin/registrations` -> Export CSV)
- **Team-wise format**: One row per team with all problem/solution/impact statements, 3 member records, pitch deck URL, ISO & IST submission timestamps, and registration ID.
- **Member-wise format**: One row per student member with position, leader badge, contact details, stream, track, and status.
- **RFC-4180 Compliant**: UTF-8 BOM (`\uFEFF`) included so Excel opens Unicode/Kannada characters properly; CRLF line endings; formula-injection guard prefixes cells starting with `=, +, -, @, \t, \r` with `'`; phone numbers protected as plain text.
- Export options: Export All, Export Filtered, or Export Selected.

### 5.4 Promo Video (`/admin/promo`)
- Direct-to-storage signed URL upload for MP4/WebM videos up to 200 MB with progress bar.
- YouTube / Vimeo embed parser that converts links into privacy-safe `youtube-nocookie.com` or `player.vimeo.com` iframes.
- Optional video poster upload.
- Live player preview.

### 5.5 Media Assets (`/admin/media`)
- Replace Velia placeholder graphics with real campus photographs (JPG, PNG, WebP, AVIF up to 5 MB).
- Thumbnails for Hero, About Bento, Journey, and CTA graphics with one-click "Replace File" and "Reset to Default".

### 5.6 Event Settings (`/admin/settings`)
- **Registration Open / Closed**: Master switch. When toggled off, `/register` shows a friendly closed notice and `/api/register` immediately rejects submissions with HTTP 403.
- **Submission Deadline**: Datetime picker. Automatically closes registrations once the timestamp is passed.
- **Top Announcement Banner**: Toggle on/off and configure banner copy shown above site navigation.
- **Publish Selected Teams**: Toggle on/off. When published, the home page renders the Selected Teams section showing only status = `selected` teams with Team Name, Track, and Idea Title (never exposing USN or student contacts).

### 5.7 Adding Another Administrator
1. In the Supabase Dashboard, create/invite the user under **Authentication** -> **Users**.
2. Add their email to the `ADMIN_EMAILS` environment variable (in `.env.local` for local dev; in Vercel under Project Settings for production).
3. The user can now log in at `/admin/login`.

---

## 6. Vercel Deployment Checklist

1. **Create Vercel Project**: Import the Git repository into Vercel with framework preset `Next.js`.
2. **Environment Variables**: Add all variables from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAILS`
   - `NEXT_PUBLIC_SITE_URL` (e.g. `https://thinkmit.vercel.app`)
3. **Supabase Auth Redirects**: Ensure `https://your-domain.vercel.app/admin` and `/admin/login` are whitelisted under Supabase URL Configuration.
4. **Storage Policies**: Confirm `supabase/schema.sql` was executed so the `media` bucket has public read and admin write permissions.
5. **Redeploy vs Instant**:
   - `data.js` code edits -> **Requires Vercel redeploy / git push**.
   - Admin panel edits (`/admin/content`, `/admin/promo`, `/admin/settings`) -> **Instant live update** (backed by Supabase `site_content` and Next.js tag revalidation).

---

## 7. Pre-Launch Checklist

Before officially publishing and opening registration to students:

- [ ] **Run Environment Security Audit**:
  ```bash
  node scripts/audit-env.mjs
  ```
  Ensures no secrets are exposed to client-side bundles and all required keys are set.
- [ ] **Run Client Secret Bundle Leak Check**:
  ```bash
  node scripts/audit-client-bundle.mjs
  ```
  Scans all compiled `.next/static` bundles to verify `SUPABASE_SERVICE_ROLE` never leaks.
- [ ] **Run Database Security Check**:
  ```bash
  npx tsx scripts/check-db.ts
  ```
  Verifies that anon key cannot select student records and RLS is strictly enforced.
- [ ] **Purge Synthetic Test Registrations**:
  ```bash
  node scripts/cleanup-test-registrations.mjs
  ```
  Removes synthetic test teams and resets the sequence if needed (`ALTER SEQUENCE team_reg_seq RESTART WITH 1;`).
- [ ] **Replace Velia Placeholder Media**:
  Visit `/admin/media` to upload campus photos and event posters.
- [ ] **Fill TBA Items from PRD §15**:
  In `data.js` or `/admin/content`:
  - Event registration opening date & deadline (`registration.opensOn`, `registration.deadline`)
  - Pitch presentation duration limit (e.g., 5 min pitch + 3 min Q&A)
  - Official contact email (`contact.email`)
  - Social media profile links (`footer.socials`)
  - Final names and room locations for the 3 Tracks (`tracks`)
- [ ] **Confirm Role Nomenclature**:
  Verified in `PRD §2` as **Innovation Lead** (role key `innovation`). Display labels can be customized anytime in `/admin/content`.
- [ ] **Execute Complete Test Suite**:
  ```bash
  npm run typecheck && npm run lint && npm run build
  npx tsx scripts/test-csv.mjs
  npx tsx scripts/test-content-editor.mjs
  npx tsx scripts/test-promo-settings.mjs
  npx tsx scripts/test-edge-cases.mjs
  ```
