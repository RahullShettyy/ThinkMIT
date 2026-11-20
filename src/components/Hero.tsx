import React from 'react';
import Link from 'next/link';
import type { SiteContent } from '@/lib/content';
import { getRegistrationState } from '@/lib/registration-state';

export default function Hero({
  content,
}: {
  content: SiteContent;
}) {
  const { site, hero, media, registration } = content;
  const regState = getRegistrationState(registration);

  const headlineLine1 = site.heroHeadline?.[0] || 'Your Idea.';
  const headlineLine2 = site.heroHeadline?.[1] || 'Our Campus.';

  return (
    <section className="hero" id="home">
      <div className="wrap">
        <div className="hero-head">
          <h1
            className="h-display split"
            data-split
            style={{ '--base': '150ms' } as React.CSSProperties}
          >
            {headlineLine1}
            <br />
            {headlineLine2}
          </h1>

          <p
            className="hero-sub rv"
            style={{ '--base': '700ms' } as React.CSSProperties}
          >
            {hero.subtitle}
          </p>

          <div
            className="hero-actions rv"
            style={{ '--base': '780ms' } as React.CSSProperties}
          >
            <a
              href="/api/template-ppt"
              download="THINK_MIT_Pitchfest_Pitch_Deck.pptx"
              className="btn-dark"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              title="Download Pitch Deck PPT Template"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download Template PPT</span>
            </a>

            <a href={hero.secondaryCta.href || '#about'} className="pill">
              {hero.secondaryCta.label}
            </a>
          </div>
        </div>

        <div
          className="hero-card rv rv-scale"
          style={{ '--base': '850ms' } as React.CSSProperties}
        >
          {media.heroVideo && (
            <video
              className="media"
              id="v-hero"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              data-src={media.heroVideo}
              poster={media.heroPoster}
            ></video>
          )}
          <img
            className="media kb"
            data-fallback="v-hero"
            src={media.heroPoster || '/images/maharaja-institute-campus-panorama.png'}
            alt="Maharaja Institute of Technology Mysore Campus"
          />

          <div className="shade"></div>

          <div id="studio" className="studio">
            <div className="chat">
              <div className="chat-top">
                <span>{hero.panel.chatTitle}</span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              {hero.panel.messages.map((msg, idx) => {
                if (msg.type === 'bubble') {
                  return (
                    <div key={idx} className="msg bubble">
                      {msg.text}
                    </div>
                  );
                }
                return (
                  <div key={idx} className="msg ai">
                    <div className="ai-ic" style={{ borderRadius: '6px', overflow: 'hidden' }}>
                      <img
                        src="/logos/mit-mysore-logo.jpg"
                        alt="MIT"
                        width={28}
                        height={28}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div className="ai-t" data-text={msg.text}>
                      <span className="ghost">{msg.text}</span>
                      <span className="live"></span>
                    </div>
                  </div>
                );
              })}

              <div className="cd msg">
                <div>
                  <small>{hero.panel.blueprintLabel}</small>
                  <strong>{hero.panel.blueprintTitle}</strong>
                </div>
                <div className="slider">
                  <small>{hero.panel.sliderLabel}</small>
                  <div className="track">
                    <b
                      id="hero-track"
                      data-value={hero.panel.sliderValue || 84}
                    ></b>
                  </div>
                </div>
              </div>
            </div>

            <div className="prod">
              <span className="msg">{hero.panel.rightTitle}</span>
              <figure id="hero-fig" className="msg">
                <img
                  src={media.heroPanelImage}
                  alt={hero.panel.rightImageAlt || 'Pitch Preview'}
                />
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
