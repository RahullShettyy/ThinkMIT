'use client';

import React from 'react';
import Link from 'next/link';
import type { SiteContent } from '@/lib/content';
import { getRegistrationState } from '@/lib/registration-state';

export default function Nav({
  content,
}: {
  content: SiteContent;
}) {
  const { nav, registration, site, announcements } = content;
  const regState = getRegistrationState(registration);

  const primaryLinks = nav.links.filter((l) => !l.href.includes('contact'));
  const contactLink = nav.links.find((l) => l.href.includes('contact')) || { label: 'Contact', href: '/#contact' };

  const bannerActive = Boolean((announcements as unknown as Record<string, unknown>)?.bannerEnabled);
  const bannerText = String((announcements as unknown as Record<string, unknown>)?.bannerText || '');

  return (
    <>
      {bannerActive && bannerText && (
        <aside
          role="region"
          aria-label="Announcement"
          style={{
            background: 'var(--ink)',
            color: '#fff',
            textAlign: 'center',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            letterSpacing: '0.01em',
            position: 'relative',
            zIndex: 100,
          }}
        >
          {bannerText}
        </aside>
      )}
      <header className="nav" id="nav">
        <div className="wrap nav-wrap">
          <nav className="nav-l" aria-label="Main Navigation">
            {primaryLinks.map((link, idx) => (
              <a key={idx} href={link.href} className="pill">
                {link.label}
              </a>
            ))}
          </nav>

          <Link href="/" className="logo" aria-label={site.name} title="Maharaja Institute of Technology Mysore">
            <img
              src="/logos/mit-mysore-logo.jpg"
              alt="MIT Mysore"
              width={44}
              height={44}
            />
          </Link>

          <div className="nav-r">
            <a
              href="/api/template-ppt"
              download="THINK_MIT_Pitchfest_Pitch_Deck.pptx"
              className="nav-template-btn pill"
              title="Download Sample Pitch Deck PPT Template"
              aria-label="Download Sample Pitch Deck PPT Template"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Template PPT</span>
            </a>

            <a href={contactLink.href} className="nav-contact-link">
              {contactLink.label}
            </a>

            {regState.isClosed ? (
              <button
                className="btn-dark disabled"
                disabled
                title={regState.stateMessage}
                aria-disabled="true"
              >
                {nav.ctaLabel}
              </button>
            ) : (
              <Link href={nav.ctaHref} className="btn-dark">
                {nav.ctaLabel}
              </Link>
            )}

            <button className="burger" id="burger" aria-label="Menu">
              <i></i>
              <i></i>
            </button>
          </div>
        </div>
      </header>

      <div className="mmenu" id="mmenu">
        {nav.links.map((link, idx) => (
          <a key={idx} href={link.href}>
            {link.label}
          </a>
        ))}
        <a
          href="/api/template-ppt"
          download="THINK_MIT_Pitchfest_Pitch_Deck.pptx"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Template PPT
        </a>
        {nav.mobileExtraLabel && (
          <a href={regState.isClosed ? '#' : nav.ctaHref}>
            {nav.mobileExtraLabel}
          </a>
        )}
      </div>
    </>
  );
}

