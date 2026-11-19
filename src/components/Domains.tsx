'use client';

import React from 'react';
import Link from 'next/link';
import type { SiteContent } from '@/lib/content';

export default function Domains({
  content,
}: {
  content: SiteContent;
}) {
  const { tracks, tracksIntro } = content;

  return (
    <section className="s-domains" id="domains" style={{ padding: '80px 0', position: 'relative' }}>
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow rv">Five Event Tracks</span>
          <h2 className="h2 split" data-split>
            Five Domains. One Campus.
          </h2>
          <p className="lead rv" style={{ '--d': 3 } as React.CSSProperties}>
            {tracksIntro || 'Every idea must be useful to the MITM campus, easily scalable within it, and mainly limited to the upgrowth of MITM.'}
          </p>
        </div>

        {/* 5 Domains Single Horizontal Bar */}
        <div
          className="domains-horizontal-bar"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(230px, 1fr))',
            gap: '14px',
            marginTop: '36px',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}
        >
          {tracks.map((track, idx) => {
            const trackNum = String(idx + 1).padStart(2, '0');
            const cleanName = track.name.replace(/^\d+\.\s*/, '');

            return (
              <div
                key={track.key || idx}
                className="card domain-card rv"
                style={{
                  '--d': Math.min(idx + 1, 5),
                  padding: '22px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '20px',
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-b)',
                  boxShadow: '0 8px 24px rgba(42,26,18,.04)',
                  transition: 'transform .3s var(--ease), box-shadow .3s var(--ease)',
                  minHeight: '340px',
                } as React.CSSProperties}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        padding: '4px 9px',
                        borderRadius: '999px',
                        background: 'rgba(59,33,22,.08)',
                        color: 'var(--ink)',
                      }}
                    >
                      Track {trackNum}
                    </span>
                    <span style={{ fontSize: '12px', color: '#8a7a6e', fontWeight: 500 }}>
                      10 Teams
                    </span>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px', lineHeight: '1.3' }}>
                    {cleanName}
                  </h3>

                  <p style={{ fontSize: '12.5px', color: '#5b4a3f', lineHeight: '1.5', marginBottom: '14px' }}>
                    {track.description}
                  </p>

                  {track.focus && (
                    <div
                      style={{
                        background: 'rgba(255,255,255,.6)',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        fontSize: '11.5px',
                        lineHeight: '1.45',
                        color: '#6a594d',
                        border: '1px solid rgba(59,33,22,.06)',
                      }}
                    >
                      <strong style={{ color: 'var(--ink)' }}>Focus: </strong>
                      {track.focus}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid rgba(59,33,22,.08)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Link
                    href={`/register`}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none',
                    }}
                  >
                    Register Team <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Highlight Banner */}
        <div
          className="card rv"
          style={{
            marginTop: '32px',
            padding: '20px 28px',
            background: 'rgba(255,255,255,.55)',
            border: '1px solid var(--glass-b)',
            borderRadius: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', fontSize: '13px', color: 'var(--ink)' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '16px', color: 'var(--ink)' }}>50 Teams</strong>
              <span style={{ color: '#8a7a6e', fontSize: '12px' }}>10 per track</span>
            </div>
            <div style={{ width: '1px', height: '28px', background: 'var(--line)' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '16px', color: 'var(--ink)' }}>5 Venues</strong>
              <span style={{ color: '#8a7a6e', fontSize: '12px' }}>Parallel tracks on 08-12-2026</span>
            </div>
            <div style={{ width: '1px', height: '28px', background: 'var(--line)' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '16px', color: 'var(--ink)' }}>10 Finalists</strong>
              <span style={{ color: '#8a7a6e', fontSize: '12px' }}>Top 2 per track advance</span>
            </div>
          </div>

          <a
            href="/#guidelines"
            className="pill"
            style={{ fontSize: '12px', padding: '8px 16px' }}
          >
            View Event Guidelines ↓
          </a>
        </div>
      </div>
    </section>
  );
}
