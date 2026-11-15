'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application runtime error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        background: 'var(--bg, #fbfaf7)',
        color: 'var(--ink, #1f140e)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '48px 32px',
          background: 'var(--surface, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--tint, #ebe7df)',
          boxShadow: '0 4px 24px rgba(42, 26, 18, 0.04)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '4px 10px',
            borderRadius: '999px',
            background: '#fbeaea',
            color: '#8c2222',
            marginBottom: '16px',
          }}
        >
          Something Went Wrong
        </span>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: 400,
            lineHeight: 1.2,
            margin: '0 0 16px 0',
          }}
        >
          An unexpected error occurred
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--ink-2, #6a594d)',
            lineHeight: 1.6,
            marginBottom: '28px',
          }}
        >
          Our team has been notified. You can try refreshing the action or return to the main pitchfest homepage.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            className="btn-dark"
            style={{
              padding: '10px 22px',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '999px',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            style={{
              padding: '10px 22px',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '999px',
              border: '1px solid var(--tint, #ebe7df)',
              background: 'var(--surface, #ffffff)',
              color: 'var(--ink, #1f140e)',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
