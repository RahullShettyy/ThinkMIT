'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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

interface EvaluationTeam {
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
  members: Member[];
  submission: Submission | null;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'shortlisted':
      return 'badge-shortlisted';
    case 'selected':
      return 'badge-selected';
    case 'under_review':
      return 'badge-under_review';
    case 'not_selected':
    case 'rejected':
      return 'badge-rejected';
    default:
      return 'badge-registered';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'shortlisted':
      return 'Shortlisted';
    case 'selected':
      return 'Selected';
    case 'under_review':
      return 'Waiting List';
    case 'not_selected':
    case 'rejected':
      return 'Rejected';
    case 'submitted':
      return 'Submitted';
    case 'withdrawn':
      return 'Withdrawn';
    default:
      return status.replace(/_/g, ' ');
  }
}

export default function AdminEvaluationsPage() {
  const [evaluations, setEvaluations] = useState<EvaluationTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'pending'>('all');
  const [sortField, setSortField] = useState<'created_at' | 'score' | 'reg_code'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/evaluations');
      if (!res.ok) {
        throw new Error('Failed to fetch evaluations data');
      }
      const data = await res.json();
      setEvaluations(data.evaluations || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading evaluations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  const handleDownloadDeck = async (filebaseKey: string, filename: string) => {
    try {
      setDownloadingKey(filebaseKey);
      const res = await fetch(`/api/admin/ppt-url?key=${encodeURIComponent(filebaseKey)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate download link');
      }
      const data = await res.json();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No download URL returned from server');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download error');
    } finally {
      setDownloadingKey(null);
    }
  };

  // Filtered and sorted data
  const filtered = evaluations.filter((item) => {
    // Search query
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const teamMatch =
        item.team_name?.toLowerCase().includes(q) ||
        item.reg_code?.toLowerCase().includes(q) ||
        item.idea_title?.toLowerCase().includes(q);
      const memberMatch = item.members?.some(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.usn?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.phone?.includes(q)
      );
      if (!teamMatch && !memberMatch) return false;
    }

    // Status filter
    if (statusFilter) {
      if (statusFilter === 'under_review' && item.status !== 'under_review') return false;
      if (statusFilter === 'shortlisted' && item.status !== 'shortlisted') return false;
      if (statusFilter === 'selected' && item.status !== 'selected') return false;
      if (statusFilter === 'rejected' && item.status !== 'not_selected' && item.status !== 'rejected') return false;
      if (statusFilter === 'submitted' && item.status !== 'submitted') return false;
    }

    // Track filter
    if (trackFilter && item.track_key !== trackFilter) {
      return false;
    }

    // Submission filter
    if (submissionFilter === 'submitted' && !item.submission) return false;
    if (submissionFilter === 'pending' && item.submission) return false;

    return true;
  });

  filtered.sort((a, b) => {
    if (sortField === 'score') {
      const scoreA = a.score ?? -1;
      const scoreB = b.score ?? -1;
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    }
    if (sortField === 'reg_code') {
      return sortOrder === 'asc'
        ? a.reg_code.localeCompare(b.reg_code)
        : b.reg_code.localeCompare(a.reg_code);
    }
    // Default created_at
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // Stats calculation
  const totalTeams = evaluations.length;
  const pptSubmittedCount = evaluations.filter((e) => e.submission !== null).length;
  const shortlistedCount = evaluations.filter((e) => e.status === 'shortlisted').length;
  const waitingListCount = evaluations.filter((e) => e.status === 'under_review').length;
  const selectedCount = evaluations.filter((e) => e.status === 'selected').length;
  const rejectedCount = evaluations.filter((e) => e.status === 'not_selected' || e.status === 'rejected').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ink)' }}>Idea &amp; PPT Evaluations</h1>
          <p style={{ fontSize: '13px', color: '#6a594d', marginTop: '4px' }}>
            Combined view of team registrations, idea submissions, and pitch decks from Filebase.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchEvaluations}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--tint)',
              background: 'var(--surface)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Refreshing...' : '↻ Refresh Data'}
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Total Teams</div>
          <div className="admin-stat-value">{totalTeams}</div>
          <div className="admin-stat-sub">Registered teams</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">PPT Submitted</div>
          <div className="admin-stat-value" style={{ color: '#16a34a' }}>{pptSubmittedCount}</div>
          <div className="admin-stat-sub">{totalTeams > 0 ? `${Math.round((pptSubmittedCount / totalTeams) * 100)}% submission rate` : '0%'}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Shortlisted</div>
          <div className="admin-stat-value" style={{ color: '#2b6cb0' }}>{shortlistedCount}</div>
          <div className="admin-stat-sub">Ready for next round</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Waiting List</div>
          <div className="admin-stat-value" style={{ color: '#c05621' }}>{waitingListCount}</div>
          <div className="admin-stat-sub">Under evaluation</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#7a6a5d', textTransform: 'uppercase', marginBottom: '4px' }}>
              Search Teams &amp; Ideas
            </label>
            <input
              type="text"
              placeholder="Team name, Reg ID, USN, Leader..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#7a6a5d', textTransform: 'uppercase', marginBottom: '4px' }}>
              PPT Status
            </label>
            <select
              value={submissionFilter}
              onChange={(e) => setSubmissionFilter(e.target.value as 'all' | 'submitted' | 'pending')}
              style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)', background: 'var(--surface)' }}
            >
              <option value="all">All ({totalTeams})</option>
              <option value="submitted">PPT Submitted ({pptSubmittedCount})</option>
              <option value="pending">PPT Pending ({totalTeams - pptSubmittedCount})</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#7a6a5d', textTransform: 'uppercase', marginBottom: '4px' }}>
              Evaluation Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)', background: 'var(--surface)' }}
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Waiting List / Under Review ({waitingListCount})</option>
              <option value="shortlisted">Shortlisted ({shortlistedCount})</option>
              <option value="selected">Selected ({selectedCount})</option>
              <option value="rejected">Rejected ({rejectedCount})</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#7a6a5d', textTransform: 'uppercase', marginBottom: '4px' }}>
              Domain
            </label>
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)', background: 'var(--surface)' }}
            >
              <option value="">All Domains</option>
              {siteData.tracks.map((t) => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#7a6a5d', textTransform: 'uppercase', marginBottom: '4px' }}>
              Sort By
            </label>
            <select
              value={`${sortField}:${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split(':') as [any, any];
                setSortField(f);
                setSortOrder(o);
              }}
              style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)', background: 'var(--surface)' }}
            >
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="score:desc">Highest Score</option>
              <option value="reg_code:asc">Reg Code (001 → 999)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '16px', color: '#c53030', background: '#fff5f5', borderRadius: '12px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Evaluations Table */}
      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-container" style={{ margin: 0, border: 'none' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Reg ID</th>
                <th>Team &amp; Leader</th>
                <th>Domain</th>
                <th style={{ minWidth: '220px' }}>Idea Summary</th>
                <th>PPT Submission</th>
                <th>Status</th>
                <th>Score</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#7a6a5d' }}>
                    Loading evaluation data...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((item) => {
                  const leader = item.members?.find((m) => m.position === 1) || item.members?.[0];
                  const hasPpt = Boolean(item.submission);

                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--ink)' }}>
                        {item.reg_code}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.team_name}</div>
                        {leader ? (
                          <div style={{ fontSize: '11px', color: '#7a6a5d', marginTop: '2px' }}>
                            {leader.name} &bull; {leader.phone}
                          </div>
                        ) : (
                          <span style={{ color: '#aaa', fontSize: '11px' }}>No leader</span>
                        )}
                      </td>
                      <td style={{ textTransform: 'capitalize', fontSize: '12px' }}>
                        {item.track_key.replace(/-/g, ' ')}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '13px' }}>
                          {item.idea_title}
                        </div>
                        {item.problem && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#7a6a5d',
                              marginTop: '2px',
                              maxWidth: '300px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={item.problem}
                          >
                            Problem: {item.problem}
                          </div>
                        )}
                      </td>
                      <td>
                        {hasPpt && item.submission ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                ✓ PPT Uploaded
                              </span>
                            </div>
                            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => handleDownloadDeck(item.submission!.filebase_key, item.submission!.filename)}
                                disabled={downloadingKey === item.submission.filebase_key}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  color: 'var(--accent, #b44a22)',
                                  textDecoration: 'underline',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                }}
                              >
                                {downloadingKey === item.submission.filebase_key ? 'Opening...' : 'Preview / Download ↗'}
                              </button>
                              <span style={{ fontSize: '10px', color: '#999' }}>
                                ({formatBytes(item.submission.file_size_bytes)})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#f3f4f6',
                              color: '#6b7280',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}
                          >
                            Pending
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge-status ${getStatusBadgeClass(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>
                        {item.score !== null && item.score !== undefined ? `${item.score}/100` : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={`/admin/evaluations/${item.id}`}
                          style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            background: 'var(--ink)',
                            color: '#fff',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '12px',
                            fontWeight: 500,
                            transition: 'opacity 0.15s ease',
                          }}
                        >
                          Evaluate &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#7a6a5d' }}>
                    No evaluations matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
