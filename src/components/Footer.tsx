import React from 'react';
import Link from 'next/link';
import type { SiteContent } from '@/lib/content';

export default function Footer({
  content,
}: {
  content: SiteContent;
}) {
  const { footer, site } = content;
  const socials = footer.socials || { facebook: '', x: '', youtube: '', instagram: '' };

  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="about rv" style={{ '--d': 0 } as React.CSSProperties}>
            <h6>{site.name}</h6>
            <p>
              THINK MIT is an IIC and EDC initiative with the{' '}
              <a
                href="https://www.linkedin.com/company/cse-ai-mitm/posts/?viewAsMember=true"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                title="Department of CSE (AI), MIT Mysore on LinkedIn"
              >
                Department of CSE–AI
              </a>
              .
            </p>
            <div className="socials">
              {socials.facebook && (
                <a
                  href={socials.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon"
                  aria-label="Facebook"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
              )}
              {socials.x && (
                <a
                  href={socials.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon"
                  aria-label="X (Twitter)"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
                  </svg>
                </a>
              )}
              {socials.youtube && (
                <a
                  href={socials.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon"
                  aria-label="YouTube"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#fff" />
                  </svg>
                </a>
              )}
              {socials.instagram && (
                <a
                  href={socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
              )}
            </div>
          </div>

          {footer.columns?.map((col, idx) => (
            <div
              key={idx}
              className="foot-col rv"
              style={{ '--d': idx + 1 } as React.CSSProperties}
            >
              <h6>{col.title}</h6>
              <ul>
                {col.links.map((link, li) => {
                  const isExternal = link.href.startsWith('http');
                  return (
                    <li key={li}>
                      <a
                        href={link.href}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                      >
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div
            className="foot-mark rv"
            style={{ '--d': 4 } as React.CSSProperties}
          >
            <img
              src="/logos/mit-mysore-logo.jpg"
              alt="MIT Mysore"
              width={48}
              height={48}
              style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '10px' }}
            />
          </div>
        </div>

        <div className="legal">
          <div>
            <Link href="/privacy">{footer.legalLeft || 'Privacy notice'}</Link>
          </div>
          <div>{footer.legalCenter}</div>
          <div>
            <Link href="/usage">{footer.legalRight || 'Usage policy'}</Link>
          </div>
        </div>

        {/* Website Designer & Developer Credit */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(42, 26, 18, 0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '14px',
            fontSize: '13px',
            color: '#6a594d',
          }}
        >
          <div>
            <span>Designed &amp; Developed by </span>
            <a
              href="https://www.linkedin.com/in/sriranga10"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--ink)',
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: '2px solid #d4612f',
                paddingBottom: '2px',
                transition: 'color .2s ease',
              }}
            >
              Sriranga
            </a>
            <span style={{ opacity: 0.75, marginLeft: '6px' }}>— Website Designer &amp; Owner</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', opacity: 0.85 }}>Get your website built:</span>
            <a
              href="https://www.linkedin.com/in/sriranga10"
              target="_blank"
              rel="noopener noreferrer"
              className="pill"
              style={{
                fontSize: '12px',
                padding: '5px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                textDecoration: 'none',
                color: 'var(--ink)',
                fontWeight: 500,
                background: '#fff',
                boxShadow: '0 2px 6px rgba(40,25,15,0.08)',
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#0077b5">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.65 1.65 0 0 0-1.66 1.66 1.66 1.66 0 0 0 1.66 1.66 1.66 1.66 0 0 0 1.66-1.66 1.65 1.65 0 0 0-1.66-1.66Z" />
              </svg>
              Connect with Sriranga on LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

