'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface MediaMap {
  [key: string]: string | string[];
}

interface MediaFieldMeta {
  label: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  description: string;
}

const MEDIA_METADATA: Record<string, MediaFieldMeta> = {
  aboutPoster: {
    label: 'About Section Background (Poster)',
    badge: 'About Bento',
    badgeColor: '#1d4ed8',
    badgeBg: '#dbeafe',
    description: 'Background image and fallback poster for the "Campus Problems Solved by Students, Built for MITM" section.',
  },
  promoPoster: {
    label: 'Promo Video Poster / Background',
    badge: 'Promo Video',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    description: 'Poster image, thumbnail, and cover background for the "See THINK MIT in Action" promo video card.',
  },
  heroPoster: {
    label: 'Hero Header Campus Panorama',
    badge: 'Hero Section',
    badgeColor: '#15803d',
    badgeBg: '#dcfce7',
    description: 'Panoramic header image across the main hero banner at the top of the homepage.',
  },
  heroPanelImage: {
    label: 'Hero Floating Panel Logo',
    badge: 'Hero Section',
    badgeColor: '#15803d',
    badgeBg: '#dcfce7',
    description: 'Badge / logo in the floating quick-info card on the hero banner.',
  },
  aboutBigCard: {
    label: 'About "Your Idea" Bento Card',
    badge: 'About Bento',
    badgeColor: '#1d4ed8',
    badgeBg: '#dbeafe',
    description: 'Featured visual artwork for the first card ("Your Idea. Our Campus.").',
  },
  aboutFundingImage: {
    label: 'Mentorship & Implementation Logo',
    badge: 'About Bento',
    badgeColor: '#1d4ed8',
    badgeBg: '#dbeafe',
    description: 'Logo displayed inside the "Mentorship & Implementation" bento card.',
  },
  aboutVideo: {
    label: 'About Section Background Video',
    badge: 'About Bento Video',
    badgeColor: '#7e22ce',
    badgeBg: '#f3e8ff',
    description: 'Optional looping video background behind the About Bento section (MP4/WebM).',
  },
  journeyCenterImage: {
    label: 'Journey Timeline Center Graphic',
    badge: 'Journey',
    badgeColor: '#4338ca',
    badgeBg: '#e0e7ff',
    description: 'Central visual featured along the journey timeline path.',
  },
  ctaPoster: {
    label: 'CTA Band Background Banner',
    badge: 'Bottom CTA',
    badgeColor: '#c2410c',
    badgeBg: '#ffedd5',
    description: 'Background banner behind the "Pitch Your Idea" registration button.',
  },
};

const PREFERRED_KEY_ORDER = [
  'aboutPoster',
  'promoPoster',
  'heroPoster',
  'ctaPoster',
  'aboutBigCard',
  'aboutFundingImage',
  'heroPanelImage',
  'journeyCenterImage',
  'aboutVideo',
];

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
        // Merge defaults with overrides to ensure newly added keys (like promoPoster) are always present
        const curMedia = { ...defMedia, ...(data.overrides?.media || {}) } as MediaMap;

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

  // Upload and replace specific image/video
  const handleFileUpload = async (key: string, file: File) => {
    setError(null);
    setSuccess(null);

    const isVideo = key.toLowerCase().includes('video');
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (isVideo) {
      if (!['.mp4', '.webm'].includes(ext)) {
        setError('Invalid file type. Only MP4 and WebM videos are allowed for this field.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError(`Video too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 50 MB.`);
        return;
      }
    } else {
      if (
        !['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext) ||
        !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)
      ) {
        setError('Invalid file type. Only JPG, PNG, WebP, and AVIF images are allowed.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError(`Image too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`);
        return;
      }
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
      if (!res.ok) throw new Error(data.error || 'Failed to upload file');

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

      const meta = MEDIA_METADATA[key];
      setSuccess(`"${meta ? meta.label : key}" uploaded and replaced successfully!`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error uploading file');
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
      const meta = MEDIA_METADATA[key];
      setSuccess(`Reset "${meta ? meta.label : key}" to original template asset.`);
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

  // Filter keys that represent single media assets and sort by preferred order
  const allStringKeys = Object.keys(defaults).filter((k) => typeof defaults[k] === 'string');
  const mediaKeys = allStringKeys.sort((a, b) => {
    const idxA = PREFERRED_KEY_ORDER.indexOf(a);
    const idxB = PREFERRED_KEY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div style={{ maxWidth: '1060px', paddingBottom: '60px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ink)' }}>Media Assets</h1>
          <p style={{ fontSize: '13px', color: '#6a594d', marginTop: '4px' }}>
            Independently manage campus photos, video posters, and branding assets (JPG, PNG, WebP, AVIF ≤ 10 MB · MP4/WebM ≤ 50 MB).
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
        <div
          style={{
            padding: '12px 16px',
            background: '#d4f4dd',
            border: '1px solid #7cd699',
            color: '#135c2b',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          ✓ {success}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fbeaea',
            border: '1px solid #e8a2a2',
            color: '#8c2222',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          ⚠ {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {mediaKeys.map((key) => {
          const currentUrl = (media[key] as string) || '';
          const defaultUrl = (defaults[key] as string) || '';
          const isReplaced = currentUrl !== defaultUrl;
          const isUploading = uploadingKey === key;
          const isVideoKey = key.toLowerCase().includes('video');
          const meta = MEDIA_METADATA[key] || {
            label: key,
            badge: 'Media Asset',
            badgeColor: '#475569',
            badgeBg: '#f1f5f9',
            description: `Media asset for ${key}.`,
          };

          return (
            <div
              key={key}
              className="admin-card"
              style={{
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: '12px',
                border: '1px solid #e7e5dc',
                background: '#ffffff',
              }}
            >
              <div>
                {/* Header with Title and Badges */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '6px',
                    gap: '8px',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--ink)',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {meta.label}
                    </h3>
                    <code
                      style={{
                        fontSize: '11px',
                        color: '#8a7a6e',
                        marginTop: '3px',
                        display: 'inline-block',
                      }}
                    >
                      media.{key}
                    </code>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        background: meta.badgeBg,
                        color: meta.badgeColor,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                    >
                      {meta.badge}
                    </span>
                    {isReplaced && (
                      <span
                        style={{
                          fontSize: '10px',
                          background: '#d4f4dd',
                          color: '#135c2b',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        Custom
                      </span>
                    )}
                  </div>
                </div>

                <p
                  style={{
                    fontSize: '12px',
                    color: '#6a594d',
                    margin: '6px 0 12px',
                    lineHeight: 1.4,
                  }}
                >
                  {meta.description}
                </p>

                {/* Media Preview Box */}
                <div
                  style={{
                    width: '100%',
                    height: '160px',
                    background: '#f8f7f2',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: '12px',
                    border: '1px solid #eceae2',
                  }}
                >
                  {currentUrl ? (
                    currentUrl.endsWith('.mp4') || currentUrl.endsWith('.webm') ? (
                      <video
                        src={currentUrl}
                        controls
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentUrl}
                        alt={meta.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )
                  ) : (
                    <span style={{ fontSize: '12px', color: '#999' }}>No asset configured</span>
                  )}

                  {isUploading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255,255,255,0.88)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--accent)',
                      }}
                    >
                      Uploading & Updating...
                    </div>
                  )}
                </div>

                {/* Direct URL Input */}
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    color: '#8a7a6e',
                    marginBottom: '4px',
                    fontWeight: 500,
                  }}
                >
                  Asset URL:
                </label>
                <input
                  type="text"
                  value={currentUrl}
                  onChange={(e) => setMedia({ ...media, [key]: e.target.value })}
                  placeholder="https://... or /images/..."
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    border: '1px solid var(--tint)',
                    marginBottom: '10px',
                    background: '#faf9f5',
                  }}
                />
              </div>

              {/* Upload & Reset Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  borderTop: '1px solid #f0eee6',
                  paddingTop: '12px',
                  marginTop: '4px',
                }}
              >
                <label
                  style={{
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--tint)',
                    background: 'var(--surface)',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'inline-block',
                    color: 'var(--ink)',
                  }}
                >
                  Upload File
                  <input
                    type="file"
                    accept={
                      isVideoKey
                        ? 'video/mp4,video/webm'
                        : 'image/jpeg,image/png,image/webp,image/avif'
                    }
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
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#b91c1c',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
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
