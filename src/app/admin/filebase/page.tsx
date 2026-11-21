'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface FilebaseItem {
  key: string;
  size: number;
  lastModified: string | null;
  filename: string;
  contentType: string | null;
  submittedAt: string | null;
  submissionId: string | null;
  isLinkedToDatabase: boolean;
  regCode: string | null;
  teamId: string | null;
  teamName: string | null;
  trackKey: string | null;
  teamStatus: string | null;
  leaderName: string | null;
  leaderEmail: string | null;
  leaderPhone: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminFilebasePage() {
  const [files, setFiles] = useState<FilebaseItem[]>([]);
  const [bucketName, setBucketName] = useState<string>('');
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [totalStorageBytes, setTotalStorageBytes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/filebase');
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load Filebase data');
      }
      const data = await res.json();
      setFiles(data.files || []);
      setBucketName(data.bucket || '');
      setTotalFiles(data.totalFiles || 0);
      setTotalStorageBytes(data.totalStorageBytes || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDownload = async (key: string) => {
    try {
      setDownloadingKey(key);
      const res = await fetch(`/api/admin/ppt-url?key=${encodeURIComponent(key)}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to generate download URL');
      }
      const data = await res.json();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No download URL returned');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDelete = async (item: FilebaseItem) => {
    const confirmMsg = item.teamName
      ? `Are you sure you want to delete the file "${item.filename}" for team "${item.teamName}" (${item.regCode})?\n\nThis will permanently delete the file from Filebase S3 AND remove its record from Supabase, allowing the team to submit again.`
      : `Are you sure you want to permanently delete "${item.key}" from Filebase S3?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setDeletingKey(item.key);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/admin/filebase', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: item.key,
          regCode: item.regCode,
          submissionId: item.submissionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete file');
      }

      setSuccess(`File "${item.filename}" deleted from both Filebase and Supabase.`);
      setTimeout(() => setSuccess(null), 4000);
      await fetchFiles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingKey(null);
    }
  };

  const filtered = files.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.filename?.toLowerCase().includes(q) ||
      f.key?.toLowerCase().includes(q) ||
      f.regCode?.toLowerCase().includes(q) ||
      f.teamName?.toLowerCase().includes(q) ||
      f.leaderName?.toLowerCase().includes(q) ||
      f.leaderEmail?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ink)' }}>Filebase Storage</h1>
          <p style={{ fontSize: '13px', color: '#6a594d', marginTop: '4px' }}>
            Live S3 bucket viewer. Files uploaded to Filebase with respective team details, preview links, and synchronized deletion.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchFiles}
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
            {loading ? 'Refreshing...' : '↻ Refresh Bucket'}
          </button>
        </div>
      </div>

      {success && (
        <div style={{ padding: '12px 16px', background: '#d4f4dd', border: '1px solid #7cd699', color: '#135c2b', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ✓ {success}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: '#fbeaea', border: '1px solid #e8a2a2', color: '#8c2222', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠ {error}
        </div>
      )}

      {/* Bucket Stats Card */}
      <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Bucket Name</div>
          <div className="admin-stat-value" style={{ fontSize: '20px', fontFamily: 'monospace' }}>
            {bucketName || 'thinkmit-upload'}
          </div>
          <div className="admin-stat-sub">S3 Compatible &bull; Filebase</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-title">Files in Bucket</div>
          <div className="admin-stat-value" style={{ color: totalFiles > 0 ? '#16a34a' : 'var(--ink)' }}>
            {totalFiles}
          </div>
          <div className="admin-stat-sub">Uploaded presentation decks</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-title">Total Storage</div>
          <div className="admin-stat-value" style={{ color: '#2b6cb0' }}>
            {formatBytes(totalStorageBytes)}
          </div>
          <div className="admin-stat-sub">Filebase IPFS / S3 storage</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#7a6a5d', textTransform: 'uppercase', marginBottom: '4px' }}>
              Search Files or Teams
            </label>
            <input
              type="text"
              placeholder="Search by file name, reg code (TMIT-001), team name, leader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)' }}
            />
          </div>
        </div>
      </div>

      {/* Main Files Table */}
      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-container" style={{ margin: 0, border: 'none' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Reg ID</th>
                <th>Team &amp; Domain</th>
                <th>Team Leader</th>
                <th>Presentation File</th>
                <th>Size</th>
                <th>Uploaded At</th>
                <th>Database Link</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#7a6a5d' }}>
                    Loading Filebase storage objects...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.key}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {item.regCode ? (
                        <span style={{ color: 'var(--ink)' }}>{item.regCode}</span>
                      ) : (
                        <span style={{ color: '#aaa' }}>-</span>
                      )}
                    </td>
                    <td>
                      {item.teamName ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.teamName}</div>
                          {item.trackKey && (
                            <div style={{ fontSize: '11px', color: '#7a6a5d', textTransform: 'capitalize' }}>
                              {item.trackKey.replace(/-/g, ' ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '12px' }}>Unlinked team</span>
                      )}
                    </td>
                    <td>
                      {item.leaderName ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>{item.leaderName}</div>
                          <div style={{ fontSize: '11px', color: '#7a6a5d' }}>
                            {item.leaderEmail} &bull; {item.leaderPhone}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '13px' }}>
                        {item.filename}
                      </div>
                      <div style={{ fontSize: '10px', color: '#999', fontFamily: 'monospace', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.key}>
                        {item.key}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500, fontSize: '12px' }}>
                      {formatBytes(item.size)}
                    </td>
                    <td style={{ fontSize: '12px', color: '#7a6a5d' }}>
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '-'}
                    </td>
                    <td>
                      {item.isLinkedToDatabase ? (
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
                          ✓ Linked
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: '#fef3c7',
                            color: '#92400e',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Unlinked File
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => handleDownload(item.key)}
                          disabled={downloadingKey === item.key}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--tint)',
                            background: 'var(--surface)',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {downloadingKey === item.key ? 'Loading...' : 'Preview ↗'}
                        </button>

                        {item.teamId && (
                          <Link
                            href={`/admin/evaluations/${item.teamId}`}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--tint)',
                              background: 'var(--surface)',
                              fontSize: '12px',
                              fontWeight: 500,
                              textDecoration: 'none',
                              color: 'var(--ink)',
                            }}
                          >
                            Evaluate
                          </Link>
                        )}

                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deletingKey === item.key}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #fecdd3',
                            background: '#fff1f2',
                            color: '#be123c',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {deletingKey === item.key ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#7a6a5d' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
                      No files currently in Filebase bucket
                    </div>
                    <p style={{ fontSize: '13px', color: '#8c7c70', maxWidth: '440px', margin: '6px auto 0' }}>
                      The bucket is currently empty. When teams upload pitch decks on <code>thinkmit.tech/submissions</code>, their files and linked team details will automatically appear here.
                    </p>
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
