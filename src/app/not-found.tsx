import React from 'react';
import Link from 'next/link';

export default function NotFound() {
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
            background: 'var(--tint, #ebe7df)',
            color: 'var(--ink, #1f140e)',
            marginBottom: '16px',
          }}
        >
          404 — Page Not Found
        </span>

        <h1
          style={{
            fontSize: '32px',
            fontWeight: 400,
            lineHeight: 1.2,
            margin: '0 0 16px 0',
            fontFamily: 'inherit',
          }}
        >
          Lost in the Innovation Lab?
        </h1>

        <p
          style={{
            fontSize: '15px',
            color: 'var(--ink-2, #6a594d)',
            lineHeight: 1.6,
            marginBottom: '32px',
          }}
        >
          The page you are looking for does not exist or has been moved. Head back to the THINK MIT homepage.
        </p>

        <Link
          href="/"
          className="btn-dark"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: '999px',
            textDecoration: 'none',
          }}
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  );
}
