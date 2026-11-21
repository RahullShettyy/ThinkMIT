import React from 'react';
import { getContent } from '@/lib/content';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import SubmissionForm from '@/components/SubmissionForm';

export const metadata = {
  title: 'Submit PPT — THINK MIT',
  description: 'Submit your team\'s pitch deck for THINK MIT Innovation Pitchfest.',
};

export default async function SubmissionsPage() {
  const content = await getContent();
  const subsConfig = content.submissions || {
    isOpen: true,
    deadline: null,
    deadlineLabel: '',
    closedMessage: 'PPT submissions are currently closed. Thank you for your submissions!',
  };

  const isManuallyClosed = subsConfig.isOpen === false;
  const isPastDeadline = Boolean(
    subsConfig.deadline && Date.now() > new Date(subsConfig.deadline).getTime()
  );
  const isClosed = isManuallyClosed || isPastDeadline;

  const deadlineDisplay =
    subsConfig.deadlineLabel ||
    (subsConfig.deadline
      ? new Date(subsConfig.deadline).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '');

  return (
    <>
      <Nav content={content} />
      <main className="reg-page">
        <div className="wrap">
          <div className="sec-head" style={{ textAlign: 'center' }}>
            <span className="eyebrow rv">Submissions</span>
            <h1 className="h2 split" data-split style={{ marginTop: '12px' }}>
              Submit Your Pitch Deck
            </h1>
            <p className="lead rv" style={{ '--d': 2 } as React.CSSProperties}>
              Upload your team&apos;s presentation file. Enter your registration code to link the submission to your team.
            </p>

            {deadlineDisplay && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isClosed ? '#fff1f2' : '#f0fdf4',
                  border: `1px solid ${isClosed ? '#fecdd3' : '#bbf7d0'}`,
                  borderRadius: '999px',
                  padding: '6px 16px',
                  marginTop: '14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isClosed ? '#9f1239' : '#166534',
                }}
              >
                <span>🕒</span>
                <span>
                  Submission Deadline: <strong>{deadlineDisplay}</strong>
                </span>
                {isClosed && <span style={{ fontWeight: 600 }}>(Closed)</span>}
              </div>
            )}
          </div>

          {isClosed ? (
            <div
              className="card"
              style={{
                maxWidth: '580px',
                margin: '40px auto 0',
                padding: '40px 24px',
                textAlign: 'center',
                borderRadius: '16px',
                background: 'var(--surface, #faf7f4)',
                border: '1px solid var(--tint)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <span style={{ fontSize: '24px' }}>🔒</span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)' }}>
                Submissions Closed
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--ink-2, #6a594d)',
                  lineHeight: '1.6',
                  maxWidth: '440px',
                  margin: '12px auto 0',
                }}
              >
                {subsConfig.closedMessage ||
                  'PPT submissions are currently closed. Thank you for your submissions!'}
              </p>
            </div>
          ) : (
            <SubmissionForm deadlineText={deadlineDisplay} />
          )}
        </div>
      </main>
      <Footer content={content} />
    </>
  );
}
