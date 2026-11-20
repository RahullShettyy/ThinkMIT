'use client';

import React, { useState, useEffect } from 'react';
import type { SiteContent } from '@/lib/content';

function formatStageDate(rawDate?: string | null): string {
  if (!rawDate) return 'Date TBA';
  if (rawDate.includes('T')) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch {}
  }
  return rawDate;
}

export default function Journey({
  content,
}: {
  content: SiteContent;
}) {
  const { journey, media } = content;
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Close modal on Escape key and prevent background scroll
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isModalOpen]);

  const stage1 = journey.stages[0];
  const stage2 = journey.stages[1];
  const stage3 = journey.stages[2];
  const stage4 = journey.stages[3];
  const stage5 = journey.stages[4];

  const renderStageCard = (
    stg: (typeof journey.stages)[0] | undefined,
    d: number
  ) => {
    if (!stg) return null;
    return (
      <div
        className="g-card rv"
        style={{ '--d': d } as React.CSSProperties}
      >
        <span className="lbl">
          STAGE {stg.n} · {formatStageDate(stg.date)}
        </span>
        <h5>{stg.title}</h5>
        <em>{stg.text}</em>
        <div className="g-foot">
          <div className="stage-arrow">
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="#3b2116" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="s-prod" id="journey">
      <div className="wrap">
        <div className="prod-shell">
          <div className="sec-head">
            <span className="eyebrow rv">{journey.eyebrow}</span>
            <h2 className="h2 split" data-split>
              {journey.headingLine1}
              <br />
              <span className="lt">{journey.headingLine2}</span>
            </h2>
            <p
              className="lead rv"
              style={{ '--d': 3 } as React.CSSProperties}
            >
              {journey.lead}
            </p>
          </div>

          <div className="stage" id="stage">
            <div className="col">
              {renderStageCard(stage1, 1)}
              {renderStageCard(stage2, 2)}
            </div>

            {/* Poster frame with curvy corners & click-to-enlarge */}
            <div
              className="hand rv"
              style={{ '--d': 2 } as React.CSSProperties}
              onClick={() => setIsModalOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsModalOpen(true);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Click to enlarge event poster"
              title="Click to view full poster"
            >
              <img
                id="hand-img"
                src={media.journeyCenterImage}
                alt={journey.centerImageAlt || 'THINK MIT Official Event Poster'}
              />
              <div className="hand-expand-hint">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                <span>Click to view poster</span>
              </div>
            </div>

            <div className="col">
              {renderStageCard(stage3, 3)}
              {renderStageCard(stage4, 4)}
            </div>
          </div>

          {stage5 && (
            <div
              className="g-card rv stage-5-card"
              style={{ '--d': 5 } as React.CSSProperties}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span className="lbl">
                    STAGE {stage5.n} · {formatStageDate(stage5.date)}
                  </span>
                  <h5>{stage5.title}</h5>
                  <em>{stage5.text}</em>
                </div>
                <div className="stage-arrow" style={{ alignSelf: 'center' }}>
                  <svg viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="#3b2116" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Funding strip */}
          <div className="funding-strip">
            <div className="funding-head">
              <h3>{journey.funding.heading}</h3>
              <p>{journey.funding.subheading}</p>
            </div>

            <div className="funding-grid">
              {journey.funding.steps.map((st, idx) => (
                <div
                  key={idx}
                  className="g-card rv funding-step"
                  style={{ '--d': idx + 1 } as React.CSSProperties}
                >
                  <div className="funding-num">{idx + 1}</div>
                  <h5>{st.title}</h5>
                  <em>{st.text}</em>
                </div>
              ))}
            </div>

            <div className="funding-note">
              <div className="funding-note-dot"></div>
              <span>{journey.funding.note}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Poster Popup Modal with Curvy Corners */}
      {isModalOpen && (
        <div
          className="poster-modal-backdrop"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Event Poster Preview"
        >
          <div
            className="poster-modal-frame"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="poster-modal-header">
              <div className="poster-modal-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>THINK MIT Official Event Poster</span>
              </div>
              <button
                type="button"
                className="poster-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close poster preview"
                title="Close (Esc)"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="poster-modal-body">
              <img
                src={media.journeyCenterImage}
                alt={journey.centerImageAlt || 'THINK MIT Event Poster'}
                className="poster-modal-img"
              />
            </div>

            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#8a7a6e' }}>
                Click anywhere or press Esc to close
              </span>
              <a
                href={media.journeyCenterImage}
                target="_blank"
                rel="noopener noreferrer"
                className="pill"
                style={{ fontSize: '11.5px', padding: '6px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open Full Resolution
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
