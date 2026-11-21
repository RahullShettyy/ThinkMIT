'use client';

import React, { useState, useRef, useCallback } from 'react';

type FormStatus = 'idle' | 'uploading' | 'success' | 'error';

interface ValidationErrors {
  reg_code?: string;
  file?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_TYPES = [
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/pdf',
];
const ACCEPTED_EXTENSIONS = ['.ppt', '.pptx', '.pdf'];

export default function SubmissionForm({ deadlineText }: { deadlineText?: string } = {}) {
  const [regCode, setRegCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateRegCode = (value: string): string | undefined => {
    if (!value.trim()) return 'Registration code is required.';
    const normalized = value.trim().toUpperCase().replace(/\s+/g, '-').replace(/-+/g, '-');
    if (!/^[A-Za-z]+-\d{3,}$/.test(normalized) && !/^[A-Za-z]+\d{3,}$/.test(normalized)) {
      return 'Invalid format. Expected pattern like TMIT-001 or TMIT 001.';
    }
    return undefined;
  };

  const validateFile = (f: File | null): string | undefined => {
    if (!f) return 'Please select a file to upload.';
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) return 'Only .ppt, .pptx, and .pdf files are accepted.';
    if (f.size > MAX_FILE_SIZE) return `File size exceeds 25 MB limit (${formatFileSize(f.size)}).`;
    return undefined;
  };

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    const err = validateFile(selectedFile);
    setErrors((prev) => ({ ...prev, file: err }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0] || null;
      handleFileSelect(droppedFile);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const regErr = validateRegCode(regCode);
    const fileErr = validateFile(file);
    if (regErr || fileErr) {
      setErrors({ reg_code: regErr, file: fileErr });
      return;
    }
    setErrors({});
    setServerError('');
    setStatus('uploading');
    setProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 300);

    try {
      let normalizedCode = regCode.trim().toUpperCase().replace(/\s+/g, '-').replace(/-+/g, '-');
      if (/^[A-Za-z]+\d{3,}$/.test(normalizedCode) && !normalizedCode.includes('-')) {
        const match = normalizedCode.match(/^([A-Za-z]+)(\d+)$/);
        if (match) normalizedCode = `${match[1]}-${match[2]}`;
      }

      const formData = new FormData();
      formData.append('reg_code', normalizedCode);
      formData.append('file', file!);

      const res = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }

      setStatus('success');
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setProgress(0);
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const resetForm = () => {
    setRegCode('');
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setErrors({});
    setServerError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Success state ────────────────────────────────────────── */
  if (status === 'success') {
    return (
      <div
        className="card"
        style={{
          maxWidth: '580px',
          margin: '40px auto 0',
          padding: '48px 24px',
          textAlign: 'center',
          borderRadius: '16px',
          background: 'var(--surface, #faf7f4)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#dcfce7',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 20px',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 500, color: 'var(--ink)' }}>
          Submitted Successfully!
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--ink-2, #6a594d)', lineHeight: '1.6', maxWidth: '440px', margin: '16px auto 0' }}>
          Your presentation has been submitted successfully!
        </p>
        <div
          style={{
            margin: '20px auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '12px 20px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#6a594d' }}>Registration Code:</span>
          <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--ink)' }}>
            {regCode.trim()}
          </span>
        </div>
        <div style={{ marginTop: '28px' }}>
          <button className="btn-dark" onClick={resetForm} style={{ minWidth: '160px' }}>
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  /* ── Form (idle / uploading / error) ──────────────────────── */
  const isDisabled = status === 'uploading';
  const canSubmit = regCode.trim().length > 0 && file !== null && !isDisabled;

  return (
    <div style={{ maxWidth: '580px', margin: '40px auto 0' }}>
      {/* Server error banner */}
      {status === 'error' && serverError && (
        <div
          className="card"
          style={{
            padding: '14px',
            marginBottom: '20px',
            background: '#fdedec',
            borderColor: '#c8553d',
            color: '#b0412c',
            fontSize: '13px',
            borderRadius: '12px',
          }}
        >
          <strong>Error:</strong> {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card" noValidate style={{ borderRadius: '16px' }}>
        {/* Registration Code */}
        <div className={`form-group ${errors.reg_code ? 'has-error' : ''}`}>
          <label htmlFor="reg_code" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.08em', color: '#6a594d', display: 'block', marginBottom: '6px' }}>
            Team Registration Code
          </label>
          <input
            id="reg_code"
            type="text"
            placeholder="e.g. TMIT-001"
            value={regCode}
            onChange={(e) => {
              setRegCode(e.target.value);
              if (errors.reg_code) {
                setErrors((prev) => ({ ...prev, reg_code: validateRegCode(e.target.value) }));
              }
            }}
            onBlur={() => setErrors((prev) => ({ ...prev, reg_code: validateRegCode(regCode) }))}
            disabled={isDisabled}
            autoComplete="off"
            style={{ fontSize: '15px' }}
          />
          {errors.reg_code && <div className="field-error">{errors.reg_code}</div>}
        </div>

        {/* File Upload */}
        <div className={`form-group ${errors.file ? 'has-error' : ''}`} style={{ marginTop: '24px' }}>
          <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.08em', color: '#6a594d', display: 'block', marginBottom: '6px' }}>
            Presentation File
          </label>
          <p style={{ fontSize: '12px', color: '#8a7a6e', marginBottom: '10px' }}>
            Accepted formats: .ppt, .pptx, .pdf — Max 25 MB
          </p>

          <div
            onClick={() => !isDisabled && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            aria-label="Upload presentation file"
            style={{
              border: `2px dashed ${isDragOver ? 'var(--accent, #c8553d)' : errors.file ? '#c8553d' : '#ccc1b5'}`,
              borderRadius: '12px',
              padding: file ? '16px 20px' : '36px 20px',
              textAlign: 'center',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              background: isDragOver ? 'rgba(200,85,61,0.04)' : 'var(--bg, #fff)',
              transition: 'border-color 0.2s, background 0.2s',
              opacity: isDisabled ? 0.6 : 1,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ppt,.pptx,.pdf"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              disabled={isDisabled}
              style={{ display: 'none' }}
            />

            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'var(--tint, #f5f0eb)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #3b2116)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8a7a6e', marginTop: '2px' }}>
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                {!isDisabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setErrors((prev) => ({ ...prev, file: undefined }));
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#8a7a6e',
                      fontSize: '18px',
                      padding: '4px',
                      lineHeight: 1,
                    }}
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8a7a6e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 500, margin: '0 0 4px' }}>
                  Drag & drop your file here
                </p>
                <p style={{ fontSize: '12px', color: '#8a7a6e', margin: 0 }}>
                  or click to browse
                </p>
              </>
            )}
          </div>
          {errors.file && <div className="field-error">{errors.file}</div>}
        </div>

        {/* Upload progress */}
        {status === 'uploading' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6a594d', marginBottom: '6px' }}>
              <span>Uploading…</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'var(--tint, #f5f0eb)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(progress, 100)}%`,
                  borderRadius: '3px',
                  background: 'var(--accent, #c8553d)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Submission rule & deadline note */}
        <div style={{ marginTop: '20px', padding: '10px 14px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--tint)' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#6a594d', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>ℹ️</span>
            <span>Submissions are strictly limited to <strong>one upload per team</strong>.</span>
          </p>
          {deadlineText && (
            <p style={{ margin: '4px 0 0 20px', fontSize: '11px', color: '#8a7a6e' }}>
              Deadline: {deadlineText}
            </p>
          )}
        </div>

        {/* Submit button */}
        <div style={{ marginTop: '20px' }}>
          <button
            type="submit"
            className="btn-dark"
            disabled={!canSubmit}
            style={{
              width: '100%',
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {status === 'uploading' ? 'Uploading…' : 'Submit Presentation'}
          </button>
        </div>

        {/* Retry hint on error */}
        {status === 'error' && (
          <p style={{ fontSize: '12px', color: '#8a7a6e', textAlign: 'center', marginTop: '12px' }}>
            Fix any issues above and try again.
          </p>
        )}
      </form>
    </div>
  );
}
