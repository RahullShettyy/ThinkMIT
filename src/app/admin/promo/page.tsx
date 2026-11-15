'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { parseEmbedVideo } from '@/components/PromoVideo';

export default function AdminPromoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [videoType, setVideoType] = useState<'none' | 'file' | 'youtube' | 'vimeo'>('none');
  const [videoUrl, setVideoUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [comingSoonText, setComingSoonText] = useState('Promo Video Coming Soon');

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  // Fetch current promo video content
  useEffect(() => {
    const fetchPromo = async () => {
      try {
        const res = await fetch('/api/admin/content');
        if (!res.ok) throw new Error('Failed to load content');
        const data = await res.json();
        const promo = data.overrides?.promoVideo || data.defaults?.promoVideo || {};

        setVideoType(promo.type || 'none');
        setVideoUrl(promo.url || '');
        setPosterUrl(promo.poster || '');
        if (promo.comingSoonText) setComingSoonText(promo.comingSoonText);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading promo video settings');
      } finally {
        setLoading(false);
      }
    };
    fetchPromo();
  }, []);

  // Client validation and direct-to-storage signed URL upload with progress
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    // Client-side validation
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.mp4', '.webm'].includes(ext) || !['video/mp4', 'video/webm'].includes(file.type)) {
      setError('Invalid file type. Only MP4 and WebM videos are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 200 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // 1. Request signed URL from server
      const signRes = await fetch('/api/admin/storage/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
          category: 'promo',
        }),
      });

      const signData = await signRes.json();
      if (!signRes.ok) {
        throw new Error(signData.error || 'Failed to sign upload URL');
      }

      setUploadProgress(30);

      let finalPublicUrl = signData.publicUrl;

      // 2. Direct upload via signed URL with progress tracking
      if (signData.signedUrl && !signData.fallbackToDirect) {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', signData.signedUrl);
          xhr.setRequestHeader('Content-Type', file.type);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round(30 + (event.loaded / event.total) * 65);
              setUploadProgress(percent);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Storage PUT failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(file);
        });
      } else {
        // Fallback: direct server stream
        const fd = new FormData();
        fd.append('file', file);
        fd.append('category', 'promo');

        const uploadRes = await fetch('/api/admin/storage/upload', {
          method: 'POST',
          body: fd,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Upload failed');
        }
        finalPublicUrl = uploadData.publicUrl;
      }

      setUploadProgress(100);
      setVideoUrl(finalPublicUrl);
      setVideoType('file');
      setSuccess('Video successfully uploaded to Supabase Storage!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error uploading video');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 1000);
    }
  };

  // Poster image upload (≤ 5MB)
  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setError('Invalid image format. Allowed: JPG, PNG, WebP, AVIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Poster exceeds 5 MB limit.');
      return;
    }

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'media');

      const res = await fetch('/api/admin/storage/upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload poster');
      setPosterUrl(data.publicUrl);
      setSuccess('Poster image uploaded successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error uploading poster');
    }
  };

  // Save promo settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validate YouTube / Vimeo embed if selected
    if ((videoType === 'youtube' || videoType === 'vimeo') && videoUrl.trim()) {
      const embed = parseEmbedVideo(videoUrl.trim(), videoType);
      if (!embed) {
        setError(`Invalid ${videoType === 'youtube' ? 'YouTube' : 'Vimeo'} URL. Please paste a valid link.`);
        setSaving(false);
        return;
      }
    }

    try {
      // Fetch full promoVideo section from content to preserve title/caption
      const contentRes = await fetch('/api/admin/content');
      const contentData = await contentRes.json();
      const currentPromo = contentData.overrides?.promoVideo || contentData.defaults?.promoVideo || {};

      const updatedPromo = {
        ...currentPromo,
        type: videoType,
        url: videoType === 'none' ? '' : videoUrl.trim(),
        poster: posterUrl.trim(),
        comingSoonText: comingSoonText.trim(),
      };

      const saveRes = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'promoVideo',
          value: updatedPromo,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Failed to save promo video');
      }

      setSuccess('Promo video settings saved and live site revalidated!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving promo video');
    } finally {
      setSaving(false);
    }
  };

  // Remove promo video
  const handleRemove = async () => {
    if (!window.confirm('Remove the promo video and revert to placeholder?')) return;
    setVideoType('none');
    setVideoUrl('');
    setPosterUrl('');
    await handleSave();
  };

  // Preview embed URL calculation
  const previewEmbedUrl =
    (videoType === 'youtube' || videoType === 'vimeo') && videoUrl.trim()
      ? parseEmbedVideo(videoUrl.trim(), videoType)
      : null;

  if (loading) {
    return <div style={{ padding: '40px', color: '#6a594d' }}>Loading promo video settings...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ink)' }}>Promo Video</h1>
          <p style={{ fontSize: '13px', color: '#6a594d', marginTop: '4px' }}>
            Upload a video file or embed a YouTube/Vimeo video on the landing page promo section.
          </p>
        </div>

        <Link
          href="/#promo"
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
          ↗ View on Landing Page
        </Link>
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

      <div className="admin-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
          Video Source
        </h2>

        {/* Source Radio Buttons */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="videoType"
              value="none"
              checked={videoType === 'none'}
              onChange={() => setVideoType('none')}
            />
            None / Coming Soon Card
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="videoType"
              value="file"
              checked={videoType === 'file'}
              onChange={() => setVideoType('file')}
            />
            Upload MP4 / WebM File (Direct to Storage)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="videoType"
              value="youtube"
              checked={videoType === 'youtube'}
              onChange={() => setVideoType('youtube')}
            />
            YouTube Link
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="videoType"
              value="vimeo"
              checked={videoType === 'vimeo'}
              onChange={() => setVideoType('vimeo')}
            />
            Vimeo Link
          </label>
        </div>

        {/* Option A: Direct Video Upload */}
        {videoType === 'file' && (
          <div style={{ background: '#faf9f5', border: '1px dashed var(--tint)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
              Upload Video File (MP4 or WebM, Max 200 MB)
            </div>
            <p style={{ fontSize: '12px', color: '#6a594d', marginBottom: '14px' }}>
              Uploads directly to the Supabase <code>media</code> storage bucket via secure server-signed URL.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ fontSize: '13px' }}
            />

            {uploadProgress !== null && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6a594d', marginBottom: '4px' }}>
                  <span>Uploading to Storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            )}

            {videoUrl && (
              <div style={{ marginTop: '14px', fontSize: '12px', color: '#555', wordBreak: 'break-all' }}>
                Current File URL: <a href={videoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{videoUrl}</a>
              </div>
            )}
          </div>
        )}

        {/* Option B: YouTube / Vimeo Embed */}
        {(videoType === 'youtube' || videoType === 'vimeo') && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
              {videoType === 'youtube' ? 'YouTube Video URL or ID' : 'Vimeo Video URL'}
            </label>
            <input
              type="text"
              placeholder={videoType === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://vimeo.com/...'}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)' }}
            />
            <p style={{ fontSize: '11px', color: '#7a6a5d', marginTop: '4px' }}>
              Parsed automatically into privacy-respecting <code>youtube-nocookie.com</code> or <code>player.vimeo.com</code> iframe.
            </p>
          </div>
        )}

        {/* Coming Soon Card Text */}
        {videoType === 'none' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
              Placeholder Text
            </label>
            <input
              type="text"
              value={comingSoonText}
              onChange={(e) => setComingSoonText(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)' }}
            />
          </div>
        )}

        {/* Optional Poster Image */}
        <div style={{ marginBottom: '24px', borderTop: '1px solid #f0eee6', paddingTop: '18px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
            Video Poster / Preview Image (Optional)
          </label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
            <input
              ref={posterInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handlePosterUpload}
              style={{ fontSize: '13px' }}
            />
            {posterUrl && (
              <button
                type="button"
                onClick={() => setPosterUrl('')}
                style={{ padding: '4px 8px', fontSize: '11px', color: '#d45d5d', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear Poster
              </button>
            )}
          </div>
          {posterUrl && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#7a6a5d' }}>
              Poster: <code>{posterUrl}</code>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--tint)', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={handleRemove}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d45d5d', background: 'transparent', color: '#d45d5d', fontSize: '13px', cursor: 'pointer' }}
          >
            Remove / Clear Video
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-dark"
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            {saving ? 'Saving...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Live Preview Box */}
      <div className="admin-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
          Live Player Preview
        </h3>

        <div style={{ maxWidth: '640px', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
          {videoType === 'file' && videoUrl ? (
            <video
              controls
              playsInline
              preload="metadata"
              poster={posterUrl || undefined}
              src={videoUrl}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : previewEmbedUrl ? (
            <iframe
              src={previewEmbedUrl}
              title="Promo Video Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#aaa', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
              <div>
                <p>📺 {comingSoonText || 'Promo Video Placeholder'}</p>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                  {posterUrl ? 'Showing poster image' : 'No video uploaded or linked yet'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
