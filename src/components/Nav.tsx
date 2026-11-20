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
        {nav.mobileExtraLabel && (
          <a href={regState.isClosed ? '#' : nav.ctaHref}>
            {nav.mobileExtraLabel}
          </a>
        )}
      </div>
    </>
  );
}

