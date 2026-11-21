'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import siteData from '@data';

interface Member {
  id: string;
  name: string;
  usn: string;
  email: string;
  phone: string;
  programme?: string;
  department?: string;
  year?: string;
  role_key: string;
  position: number;
}

interface Submission {
  id: string;
  reg_code: string;
  filebase_key: string;
  filename: string;
  file_size_bytes: number;
  content_type: string;
  submitted_at: string;
}

interface TeamEvaluationDetail {
  id: string;
  reg_code: string;
  team_name: string;
  track_key: string;
  idea_title: string;
  problem: string;
  solution: string;
  uniqueness: string;
  impact: string;
  status: string;
  score: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at?: string;
  members: Member[];
  submission: Submission | null;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TeamEvaluationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [team, setTeam] = useState<TeamEvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingDeck, setDownloadingDeck] = useState(false);
  const [deletingDeck, setDeletingDeck] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Evaluation form state
  const [status, setStatus] = useState('submitted');
  const [score, setScore] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchTeamEvaluation = async () => {
      try {
        setLoading(true);
        // Fetch from combined evaluations API
        const res = await fetch('/api/admin/evaluations');
        if (!res.ok) {
          throw new Error('Failed to fetch evaluations');
        }
        const data = await res.json();
        const found = (data.evaluations || []).find((t: any) => t.id === params.id);

        if (!found) {
          throw new Error('Team not found in evaluations');
        }

        setTeam(found);
        setStatus(found.status || 'submitted');
        setScore(found.score !== null && found.score !== undefined ? String(found.score) : '');
        setNotes(found.admin_notes || '');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error fetching team');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamEvaluation();
  }, [params.id]);

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/admin/evaluations/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          score: score === '' ? null : Number(score),
          admin_notes: notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save evaluation');
      }

      setTeam((prev) => (prev ? { ...prev, ...data.team } : prev));
      setSuccessMsg('Evaluation saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving evaluation');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDeck = async () => {
    if (!team?.submission?.filebase_key) return;

    try {
      setDownloadingDeck(true);
      const res = await fetch(`/api/admin/ppt-url?key=${encodeURIComponent(team.submission.filebase_key)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate download URL');
      }

      const data = await res.json();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No download URL provided');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingDeck(false);
    }
  };

  const handleDeleteDeck = async () => {
    if (!team?.submission) return;

    const confirmMsg = `Are you sure you want to delete the presentation "${team.submission.filename}" for team "${team.team_name}" (${team.reg_code})?\n\nThis will permanently delete the file from Filebase S3 AND remove its record from Supabase, allowing the team to submit again.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setDeletingDeck(true);
      setError('');
      setSuccessMsg('');

      const res = await fetch('/api/admin/filebase', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: team.submission.filebase_key,
          regCode: team.reg_code,
          submissionId: team.submission.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete presentation');
      }

      setTeam((prev) => (prev ? { ...prev, submission: null } : prev));
      setSuccessMsg('Presentation file deleted from Filebase and Supabase. The team can now submit again.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingDeck(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', color: '#6a594d', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          className="spinner"
          style={{ width: '20px', height: '20px', border: '2px solid #dfd8ce', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}
        />
        Loading team evaluation details...
      </div>
    );
  }

  if (error && !team) {
    return (
      <div style={{ padding: '24px', background: '#fff5f5', color: '#c53030', borderRadius: '12px' }}>
        {error}
        <div style={{ marginTop: '12px' }}>
          <Link href="/admin/evaluations" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            &larr; Back to Evaluations
          </Link>
        </div>
      </div>
    );
  }

  if (!team) return null;

  const trackInfo = siteData.tracks.find((t) => t.key === team.track_key);

  return (
    <div>
      {/* Top Breadcrumb & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link href="/admin/evaluations" style={{ color: '#6a594d', textDecoration: 'none', fontSize: '13px' }}>
              &larr; Evaluations
            </Link>
            <span style={{ color: '#ccc' }}>/</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--ink)' }}>{team.reg_code}</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
            {team.team_name}
          </h1>
          <p style={{ fontSize: '13px', color: '#6a594d', marginTop: '2px' }}>
            Domain: <strong>{trackInfo?.name || team.track_key}</strong> &bull; Registered on{' '}
            {new Date(team.created_at).toLocaleDateString()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            href={`/admin/registrations/${team.id}`}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--tint)',
              background: 'var(--surface)',
              fontSize: '13px',
              color: 'var(--ink)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            View Registration &rarr;
          </Link>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 18px', background: '#c6f6d5', color: '#22543d', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: 500 }}>
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 18px', background: '#fff5f5', color: '#c53030', borderRadius: '10px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSaveEvaluation}>
        {/* SECTION 1: Evaluator Decision & Status */}
        <div className="admin-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--ink)' }}>
            Evaluation Decision &amp; Scoring
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#554438', marginBottom: '6px' }}>
                Evaluation Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--tint)',
                  background: 'var(--surface)',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <option value="submitted">Submitted (Pending Review)</option>
                <option value="under_review">Waiting List / Under Review</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="selected">Selected for Finals</option>
                <option value="not_selected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#554438', marginBottom: '6px' }}>
                Score (0 - 100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 85"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--tint)',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#554438', marginBottom: '6px' }}>
              Evaluator / Judge Notes &amp; Feedback (Private)
            </label>
            <textarea
              rows={4}
              placeholder="Internal notes on novelty, technical feasibility, pitch deck quality, recommendations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--tint)',
                fontSize: '13px',
                lineHeight: '1.5',
              }}
            />
          </div>
        </div>

        {/* SECTION 2: Pitch Deck / PPT File from Filebase */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Pitch Deck / PPT Submission
            </h2>
            {team.submission && (
              <span style={{ fontSize: '12px', color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: '6px', fontWeight: 600 }}>
                ✓ Stored on Filebase
              </span>
            )}
          </div>

          {team.submission ? (
            <div
              style={{
                background: '#f8f5f0',
                border: '1px solid var(--tint)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: '#e2d9cd',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '14px' }}>
                    {team.submission.filename}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7a6a5d', marginTop: '2px' }}>
                    Size: {formatBytes(team.submission.file_size_bytes)} &bull; Uploaded:{' '}
                    {new Date(team.submission.submitted_at).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace', marginTop: '4px' }}>
                    Filebase Key: {team.submission.filebase_key}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleDownloadDeck}
                  disabled={downloadingDeck}
                  className="btn-dark"
                  style={{ padding: '10px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {downloadingDeck ? 'Generating Link...' : 'Download / Preview Pitch Deck ↗'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteDeck}
                  disabled={deletingDeck}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #fecdd3',
                    background: '#fff1f2',
                    color: '#be123c',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {deletingDeck ? 'Deleting...' : 'Delete File'}
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#fafafa',
                border: '1px dashed var(--tint)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                color: '#7a6a5d',
              }}
            >
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
                No pitch deck submitted yet.
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#999' }}>
                The team has not uploaded their PPTX file via <code>thinkmit.tech/submissions</code>.
              </p>
            </div>
          )}
        </div>

        {/* SECTION 3: Idea & Problem Submission (Exact fields from teams table) */}
        <div className="admin-card">
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--ink)' }}>
            Idea Submission Details
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#7a6a5d', letterSpacing: '0.04em' }}>
              Project / Idea Title
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
              {team.idea_title}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            {/* Problem Statement */}
            <div style={{ background: '#fcfaf7', border: '1px solid var(--tint)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#b44a22', letterSpacing: '0.04em', marginBottom: '8px' }}>
                1. Problem Statement
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                {team.problem || 'Not provided'}
              </div>
            </div>

            {/* Proposed Solution */}
            <div style={{ background: '#fcfaf7', border: '1px solid var(--tint)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#2b6cb0', letterSpacing: '0.04em', marginBottom: '8px' }}>
                2. Proposed Solution
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                {team.solution || 'Not provided'}
              </div>
            </div>

            {/* Uniqueness & Innovation */}
            <div style={{ background: '#fcfaf7', border: '1px solid var(--tint)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#7b341e', letterSpacing: '0.04em', marginBottom: '8px' }}>
                3. Uniqueness &amp; Innovation
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                {team.uniqueness || 'Not provided'}
              </div>
            </div>

            {/* Impact & Implementation */}
            <div style={{ background: '#fcfaf7', border: '1px solid var(--tint)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#22543d', letterSpacing: '0.04em', marginBottom: '8px' }}>
                4. Expected Impact &amp; Implementation
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                {team.impact || 'Not provided'}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Team Members & Participant Details */}
        <div className="admin-card">
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--ink)' }}>
            Team Roster &amp; Participants ({team.members?.length || 0} Members)
          </h2>

          <div className="admin-table-container" style={{ margin: 0 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Full Name</th>
                  <th>USN</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Department / Programme</th>
                  <th>Year</th>
                </tr>
              </thead>
              <tbody>
                {team.members && team.members.length > 0 ? (
                  team.members.map((m, idx) => (
                    <tr key={m.id || idx}>
                      <td>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {m.role_key || 'Member'}{' '}
                          {m.position === 1 && (
                            <span style={{ color: 'var(--accent)', fontSize: '11px', fontWeight: 600 }}>
                              (Leader)
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{m.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{m.usn}</td>
                      <td>
                        <a href={`mailto:${m.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                          {m.email}
                        </a>
                      </td>
                      <td>
                        <a href={`tel:${m.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {m.phone}
                        </a>
                      </td>
                      <td>{m.department || m.programme || '-'}</td>
                      <td>{m.year || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#7a6a5d', padding: '24px' }}>
                      No members listed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div
          style={{
            position: 'sticky',
            bottom: '20px',
            background: 'var(--surface)',
            padding: '16px 24px',
            borderRadius: '12px',
            border: '1px solid var(--tint)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: '13px', color: '#7a6a5d' }}>
            Status: <strong>{status}</strong> &bull; Score: <strong>{score ? `${score}/100` : 'Not scored'}</strong>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              href="/admin/evaluations"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid var(--tint)',
                background: 'transparent',
                textDecoration: 'none',
                color: 'var(--ink)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-dark"
              disabled={saving}
              style={{ padding: '10px 24px', fontSize: '13px' }}
            >
              {saving ? 'Saving...' : 'Save Evaluation'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
