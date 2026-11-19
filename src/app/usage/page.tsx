import Link from 'next/link';
import { getContent } from '@/lib/content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Usage Policy — THINK MIT',
  description: 'Terms of participation, intellectual property rules, and platform usage guidelines for THINK MIT Pitchfest.',
};

export default async function UsagePolicyPage() {
  const content = await getContent();

  return (
    <div style={{ maxWidth: '860px', margin: '60px auto 100px', padding: '0 24px' }}>
      <Link href="/" className="pill" style={{ marginBottom: '24px', display: 'inline-block' }}>
        ← Back to Home
      </Link>

      <div className="sec-head" style={{ marginTop: '16px', marginBottom: '32px' }}>
        <span className="eyebrow">Legal &amp; Guidelines</span>
        <h1 className="h2" style={{ fontSize: 'clamp(28px, 3vw, 42px)', marginTop: '8px' }}>
          Usage Policy &amp; Event Terms
        </h1>
        <p className="lead" style={{ fontSize: '15px', color: '#6a594d', marginTop: '10px', maxWidth: '640px' }}>
          Guidelines for participation, intellectual property protection, ethical conduct, and platform usage for {content.site.name}.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 1. Eligibility */}
        <section className="card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '12px' }}>
            1. Eligibility &amp; Team Composition
          </h2>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.7', color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <strong>Eligible Students:</strong> Participation is open to enrolled students of Maharaja Institute of Technology Mysore (MITM) across eligible programs (UG 2nd, 3rd, 4th Year, MBA, and MCA).
            </li>
            <li>
              <strong>Team Structure:</strong> Every team must consist of <strong>exactly three members</strong>. Cross-department teams are encouraged. Each member must be assigned a distinct training stream (Business Lead, Innovation Lead, and Technical Lead).
            </li>
            <li>
              <strong>Accuracy of Records:</strong> Team details—including full name, USN, college email, and contact number—must accurately reflect official institutional records. Duplicate registrations across multiple teams are automatically rejected.
            </li>
          </ul>
        </section>

        {/* 2. Intellectual Property */}
        <section className="card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '12px' }}>
            2. Intellectual Property &amp; Originality
          </h2>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.7', color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <strong>Student Ownership:</strong> All concepts, designs, code, slide decks, and solutions submitted through this platform remain the intellectual property of the submitting student team.
            </li>
            <li>
              <strong>Institutional Incubation &amp; Support:</strong> Participation, mentorship, incubation support, or institutional seed funding from IIC, EDC, or {content.site.inAssociationWith} does not forfeit or involuntarily transfer student IP rights.
            </li>
            <li>
              <strong>Zero-Tolerance for Plagiarism:</strong> Ideas must address genuine campus or societal challenges. Submissions found to be plagiarized, deceptive, or directly copied without original development will be disqualified immediately.
            </li>
          </ul>
        </section>

        {/* 3. Pitching & Selection */}
        <section className="card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '12px' }}>
            3. Pitching Guidelines &amp; Evaluation
          </h2>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.7', color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <strong>Pitch Deck Link:</strong> Teams must provide an accessible presentation link (Google Slides, Canva, OneDrive, or public cloud storage link) during registration. Ensure sharing permissions allow viewing.
            </li>
            <li>
              <strong>Evaluation Criteria:</strong> Submissions are evaluated by faculty, industry mentors, and jury panels based on problem clarity, solution feasibility, innovation, campus impact, and presentation quality.
            </li>
            <li>
              <strong>Finality of Jury Decisions:</strong> Screening outcomes, shortlist selections, and awards decided by the organizing committee and jury are final and binding.
            </li>
          </ul>
        </section>

        {/* 4. Platform Usage */}
        <section className="card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '12px' }}>
            4. Digital Platform Acceptable Use
          </h2>
          <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.7', color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <strong>Intended Purpose:</strong> The THINK MIT web portal is provided solely for information dissemination, student team registration, and official event administration.
            </li>
            <li>
              <strong>Prohibited Actions:</strong> Automated bot requests, denial-of-service attempts, SQL injection, script tampering, or unauthorized attempts to access administrative dashboards are strictly prohibited and logged.
            </li>
            <li>
              <strong>Privacy Commitment:</strong> Submitted sensitive data (USNs, contact numbers, email addresses) is securely stored and never published on public pages.
            </li>
          </ul>
        </section>

        {/* 5. Organisers & Contact */}
        <section className="card" style={{ padding: '28px', background: 'rgba(255, 255, 255, 0.7)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '12px' }}>
            5. Organising Bodies &amp; Queries
          </h2>
          <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink-2)' }}>
            THINK MIT is organized under the aegis of Maharaja Institute of Technology Mysore by:
          </p>
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <a
              href="https://www.linkedin.com/company/cse-ai-mitm/posts/?viewAsMember=true"
              target="_blank"
              rel="noopener noreferrer"
              className="pill"
              style={{ fontSize: '12px', padding: '6px 14px', textDecoration: 'none', color: 'var(--ink)', background: '#fff' }}
            >
              Dept. of CSE (AI) on LinkedIn ↗
            </a>
            <span className="pill" style={{ fontSize: '12px', padding: '6px 14px' }}>
              Institution&apos;s Innovation Council (IIC)
            </span>
            <span className="pill" style={{ fontSize: '12px', padding: '6px 14px' }}>
              Entrepreneurship Development Cell (EDC)
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#8a7a6e', marginTop: '16px' }}>
            For queries, reach out to your respective faculty coordinators or visit the CSE–AI Department office.
          </p>
        </section>
      </div>
    </div>
  );
}
