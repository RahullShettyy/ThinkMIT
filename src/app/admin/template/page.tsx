'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface TemplateMetadata {
  filename: string;
  sizeBytes: number;
  storageKey: string;
  publicUrl: string;
  existsInSupabase: boolean;
  localFallbackAvailable: boolean;
  updatedAt: string;
  source: 'supabase' | 'local_sample';
}

export default function AdminTemplatePage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState<TemplateMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplateInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/template-ppt');
      if (!res.ok) {
        throw new Error('Failed to load template metadata');
      }
      const data = await res.json();
      setMeta(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading template status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplateInfo();
  }, []);

  const formatSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCopyUrl = () => {
    if (meta?.publicUrl) {
      navigator.clipboard.writeText(window.location.origin + meta.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSyncFromSamplePpt = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/admin/template-ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_sample' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to sync sample PPT');
      }

      setSuccess('Successfully synced sample PPT to Supabase Storage!');
      await fetchTemplateInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync sample PPT');
    } finally {
      setSyncing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.ppt') && !lower.endsWith('.pptx')) {
      setError('Invalid file type. Only PowerPoint files (.ppt, .pptx) are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/template-ppt', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      setSuccess(`New presentation template "${file.name}" uploaded to Supabase Storage successfully!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchTemplateInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading presentation');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-main">
      <header className="admin-header">
        <div>
          <h1 className="admin-page-title">Pitch Deck Template Management</h1>
          <p className="admin-page-subtitle">
            Manage the official PPT template linked from the website navigation bar, stored securely in Supabase Storage.
          </p>
        </div>
      </header>

      <div className="admin-content-area" style={{ maxWidth: '960px' }}>
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              marginBottom: '20px',
              fontSize: '14px',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              marginBottom: '20px',
              fontSize: '14px',
            }}
          >
            <strong>Success:</strong> {success}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6a594d' }}>
            <div
              className="spinner"
              style={{
                width: '28px',
                height: '28px',
                border: '3px solid #dfd8ce',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }}
            />
            Loading Supabase template metadata...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Live Template Status Card */}
            <div className="admin-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                      Current Template Status
                    </h2>
                    {meta?.existsInSupabase ? (
                      <span
                        style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
                        Active in Supabase Storage
                      </span>
                    ) : (
                      <span
                        style={{
                          background: '#fef3c7',
                          color: '#b45309',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }}></span>
                        Local Sample Fallback Active
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', marginBottom: 0 }}>
                    This presentation is provided to all registered participants when clicking <strong>Template PPT</strong> in the navigation bar.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <a
                    href="/api/template-ppt"
                    className="btn-dark"
                    download={meta?.filename || 'THINK_MIT_Pitchfest_Pitch_Deck.pptx'}
                    style={{
                      padding: '8px 18px',
                      fontSize: '13px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Template
                  </a>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginTop: '20px',
                  padding: '16px',
                  background: '#fcfaf7',
                  borderRadius: '12px',
                  border: '1px solid #ebdcd0',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#8a7a6e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Template Filename
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginTop: '4px', wordBreak: 'break-all' }}>
                    {meta?.filename}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#8a7a6e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    File Size
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
                    {formatSize(meta?.sizeBytes)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#8a7a6e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Storage Bucket & Key
                  </div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#374151', marginTop: '4px' }}>
                    media / {meta?.storageKey}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#8a7a6e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Last Updated / Synced
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px' }}>
                    {meta?.updatedAt ? new Date(meta.updatedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>

              {meta?.publicUrl && (
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="pill"
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                  >
                    {copied ? 'Copied Public URL!' : 'Copy Storage URL'}
                  </button>
                  <a
                    href={meta.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#d4612f', textDecoration: 'underline' }}
                  >
                    View Public Storage Object
                  </a>
                </div>
              )}
            </div>

            {/* Quick Actions: Sync from /sample_ppt folder */}
            <div className="admin-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 8px' }}>
                Sync from /sample_ppt Folder
              </h2>
              <p style={{ fontSize: '13.5px', color: '#5b4a3f', lineHeight: '1.5', margin: '0 0 16px' }}>
                The original pitch deck template is stored in <code>/sample_ppt/THINK MIT Pitchfest Pitch Deck.pptx</code>.
                Click the button below to upload or restore it directly to the Supabase Storage <code>media</code> bucket.
              </p>

              <button
                type="button"
                onClick={handleSyncFromSamplePpt}
                disabled={syncing}
                className="btn-dark"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: syncing ? 0.7 : 1,
                  cursor: syncing ? 'not-allowed' : 'pointer',
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  <polyline points="16 3 21 8 16 13" />
                  <line x1="21" y1="8" x2="9" y2="8" />
                </svg>
                {syncing ? 'Syncing to Supabase Storage...' : 'Sync / Restore from /sample_ppt to Supabase'}
              </button>
            </div>

            {/* Upload New Custom Template */}
            <div className="admin-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 8px' }}>
                Upload New Pitch Deck Template
              </h2>
              <p style={{ fontSize: '13.5px', color: '#5b4a3f', lineHeight: '1.5', margin: '0 0 16px' }}>
                Upload an updated PowerPoint template (.ppt, .pptx). It will immediately replace the template stored in Supabase Storage and be served to participants downloading from the navbar.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-dark"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: uploading ? 0.7 : 1,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {uploading ? 'Uploading to Supabase Storage...' : 'Upload New PPT Template (.pptx)'}
                </button>
                <span style={{ fontSize: '12.5px', color: '#8a7a6e' }}>
                  Max size 50 MB · Supported formats: .ppt, .pptx
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
