'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface MediaMap {
  [key: string]: string | string[];
}

export default function AdminMediaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [defaults, setDefaults] = useState<MediaMap>({});
  const [media, setMedia] = useState<MediaMap>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Load media settings from API
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await fetch('/api/admin/content');
        if (!res.ok) throw new Error('Failed to load media config');
        const data = await res.json();

        const defMedia = (data.defaults?.media || {}) as MediaMap;
        const curMedia = (data.overrides?.media || defMedia) as MediaMap;

        setDefaults(defMedia);
        setMedia(JSON.parse(JSON.stringify(curMedia)));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error fetching media');
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, []);

  // Upload and replace specific image
  const handleFileUpload = async (key: string, file: File) => {
    setError(null);
    setSuccess(null);

    // Validate image format and size
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext) || !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setError('Invalid file type. Only JPG, PNG, WebP, and AVIF images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(`Image too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`);
      return;
    }

    setUploadingKey(key);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'media');

      const res = await fetch('/api/admin/storage/upload', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload image');

      const newUrl = data.publicUrl;
      const updatedMedia = { ...media, [key]: newUrl };
      setMedia(updatedMedia);

      // Save directly to site_content
      const saveRes = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'media',
          value: updatedMedia,
        }),
      });

      if (!saveRes.ok) {
        const d = await saveRes.json();
        throw new Error(d.error || 'Failed to persist media update');
      }

      setSuccess(`Image for "${key}" uploaded and replaced successfully!`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error uploading image');
    } finally {
      setUploadingKey(null);
    }
  };

  // Reset image to default from data.js
  const handleResetImage = async (key: string) => {
    const defaultVal = defaults[key];
    const updatedMedia = { ...media, [key]: defaultVal };
    setMedia(updatedMedia);

    try {
      const saveRes = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'media',
          value: updatedMedia,
        }),
      });
      if (!saveRes.ok) throw new Error('Failed to save reset');
      setSuccess(`Reset "${key}" to original template image.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error resetting image');
    }
  };

  // Save all manual URL edits
  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'media',
          value: media,
        }),
      });
      if (!res.ok) throw new Error('Failed to save media changes');
      setSuccess('All media asset URLs saved and site revalidated!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving media');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: '#6a594d' }}>Loading site media assets...</div>;
  }

  // Filter keys that represent single image assets
  const mediaKeys = Object.keys(defaults).filter((k) => typeof defaults[k] === 'string');

  return (
    <div style={{ maxWidth: '1000px', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ink)' }}>Media Assets</h1>
          <p style={{ fontSize: '13px', color: '#6a594d', marginTop: '4px' }}>
            Replace Velia placeholder graphics with real campus photos and event branding (JPG, PNG, WebP, AVIF ≤ 5 MB).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="btn-dark"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
          <Link
            href="/"
            target="_blank"
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--tint)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            ↗ View Live Site
          </Link>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {mediaKeys.map((key) => {
          const currentUrl = (media[key] as string) || '';
          const defaultUrl = (defaults[key] as string) || '';
          const isReplaced = currentUrl !== defaultUrl;
          const isUploading = uploadingKey === key;

          return (
            <div key={key} className="admin-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{key}</h3>
                  {isReplaced && (
                    <span style={{ fontSize: '10px', background: '#d4f4dd', color: '#135c2b', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Custom Image
                    </span>
                  )}
                </div>

                {/* Image / Video Thumbnail */}
                <div style={{ width: '100%', height: '160px', background: '#f5f4ef', borderRadius: '6px', overflow: 'hidden', position: 'relative', display: 'grid', placeItems: 'center', marginBottom: '12px', border: '1px solid #eee' }}>
                  {currentUrl ? (
                    currentUrl.endsWith('.mp4') || currentUrl.endsWith('.webm') ? (
                      <video src={currentUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentUrl}
                        alt={key}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )
                  ) : (
                    <span style={{ fontSize: '12px', color: '#999' }}>No image set</span>
                  )}

                  {isUploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                      Uploading...
                    </div>
                  )}
                </div>

                {/* URL Input */}
                <input
                  type="text"
                  value={currentUrl}
                  onChange={(e) => setMedia({ ...media, [key]: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--tint)', marginBottom: '10px' }}
                />
              </div>

              {/* Upload & Reset Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderTop: '1px solid #f0eee6', paddingTop: '10px' }}>
                <label style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--tint)', background: 'var(--surface)', fontSize: '12px', fontWeight: 500, display: 'inline-block' }}>
                  Replace File
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(key, f);
                    }}
                    style={{ display: 'none' }}
                  />
                </label>

                {isReplaced && (
                  <button
                    type="button"
                    onClick={() => handleResetImage(key)}
                    style={{ background: 'none', border: 'none', color: '#b91c1c', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
