'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (data: {
    objectKey: string;
    filename: string;
    size: number;
  }) => void;
  identifier?: string;
}

type UploadState = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXTS = ['.ppt', '.pptx', '.pdf'];

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  identifier,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Reset state
  const resetForm = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setFile(null);
    setUploadState('idle');
    setProgress(0);
    setErrorMessage('');
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle cancel / close
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Accessibility: Focus trap & Escape key
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Auto-focus modal
    const timer = setTimeout(() => {
      modalRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      previouslyFocusedElementRef.current?.focus();
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  // Validate a selected file
  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage('');
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

    if (!ALLOWED_EXTS.includes(ext)) {
      setErrorMessage('Invalid file type. Only .ppt, .pptx, or .pdf files are accepted.');
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_SIZE_BYTES) {
      setErrorMessage(`File is too large (${formatSize(selectedFile.size)}). Maximum allowed size is 25 MB.`);
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setUploadState('idle');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Perform upload flow — sends file to our Next.js API proxy (no CORS issues)
  const startUpload = async () => {
    if (!file) return;

    setUploadState('validating');
    setErrorMessage('');
    setProgress(5);

    try {
      setUploadState('uploading');

      // Build FormData — browser → our API server → Filebase S3 (no CORS needed)
      const formData = new FormData();
      formData.append('file', file);
      if (identifier) formData.append('identifier', identifier);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      // Track upload progress (browser → our Next.js server)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // Map 0–100% of browser→server leg to 5–90% displayed
          const percent = 5 + Math.round((event.loaded / event.total) * 85);
          setProgress(Math.min(90, percent));
        }
      };

      xhr.onload = () => {
        xhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setProgress(100);
            setUploadState('success');
            setTimeout(() => {
              onUploadSuccess({
                objectKey: data.objectKey,
                filename: data.filename || file.name,
                size: file.size,
              });
              handleClose();
            }, 600);
          } catch {
            setUploadState('error');
            setErrorMessage('Upload succeeded but response was unreadable. Please try again.');
          }
        } else {
          setUploadState('error');
          let errMsg = `Upload failed (HTTP ${xhr.status}).`;
          try {
            const errData = JSON.parse(xhr.responseText);
            if (errData.error) errMsg = errData.error;
          } catch { /* ignore */ }
          setErrorMessage(errMsg);
        }
      };

      xhr.onerror = () => {
        xhrRef.current = null;
        setUploadState('error');
        setErrorMessage('Network error. Please check your internet connection and try again.');
      };

      xhr.onabort = () => {
        xhrRef.current = null;
        setUploadState('idle');
      };

      xhr.open('POST', '/api/upload', true);
      // No Content-Type header — browser sets correct multipart boundary automatically
      xhr.send(formData);
    } catch (err: unknown) {
      setUploadState('error');
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred during upload.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      aria-describedby="upload-modal-desc"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(42, 26, 18, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && uploadState !== 'uploading') {
          handleClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#fbf8f3',
          border: '1px solid rgba(59, 33, 22, 0.15)',
          borderRadius: '24px',
          boxShadow: '0 24px 64px rgba(42, 26, 18, 0.2)',
          padding: '28px 24px',
          position: 'relative',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: '#d4612f',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Pitch Deck Upload
            </span>
            <h3 id="upload-modal-title" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)' }}>
              Upload Presentation File
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close upload dialog"
            disabled={uploadState === 'uploading'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid rgba(59, 33, 22, 0.1)',
              background: 'transparent',
              color: 'var(--ink)',
              fontSize: '18px',
              lineHeight: 1,
              cursor: uploadState === 'uploading' ? 'not-allowed' : 'pointer',
              display: 'grid',
              placeItems: 'center',
              transition: 'background .2s',
            }}
          >
            ×
          </button>
        </div>

        <p id="upload-modal-desc" style={{ fontSize: '13px', color: '#6a594d', lineHeight: '1.5', marginBottom: '20px' }}>
          Upload your team&apos;s presentation slides directly to our secure storage. Accepted formats are <strong>PPT, PPTX, or PDF</strong> (up to 25 MB).
        </p>

        {/* Drag and drop zone */}
        {uploadState !== 'uploading' && uploadState !== 'success' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              border: `2px dashed ${isDragOver ? '#d4612f' : 'rgba(59, 33, 22, 0.2)'}`,
              borderRadius: '16px',
              padding: '32px 20px',
              textAlign: 'center',
              backgroundColor: isDragOver ? 'rgba(212, 97, 47, 0.05)' : 'rgba(255, 255, 255, 0.55)',
              transition: 'all 0.2s ease',
              marginBottom: '20px',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="pitch-file-input"
            />

            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(59, 33, 22, 0.08)', margin: '0 auto 12px', display: 'grid', placeItems: 'center' }}>
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--ink)" strokeWidth="2" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>

            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', marginBottom: '4px' }}>
              Drag &amp; drop your deck here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d4612f',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  fontSize: '14px',
                }}
              >
                browse files
              </button>
            </p>
            <span style={{ fontSize: '12px', color: '#8a7a6e' }}>
              .ppt, .pptx, or .pdf (Max 25 MB)
            </span>
          </div>
        )}

        {/* Selected File Card */}
        {file && uploadState !== 'uploading' && uploadState !== 'success' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '12px',
              background: '#fff',
              border: '1px solid rgba(59, 33, 22, 0.1)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: file.name.endsWith('.pdf') ? '#e74c3c' : '#d4612f',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {file.name.split('.').pop()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '12px', color: '#8a7a6e' }}>
                  {formatSize(file.size)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#b0412c',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Remove
            </button>
          </div>
        )}

        {/* Uploading / Progress Bar */}
        {(uploadState === 'uploading' || uploadState === 'validating' || uploadState === 'success') && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px' }}>
              <span>
                {uploadState === 'validating' ? 'Verifying destination...' : uploadState === 'success' ? 'Upload complete!' : 'Uploading file directly to Filebase...'}
              </span>
              <span>{progress}%</span>
            </div>

            <div style={{ width: '100%', height: '8px', background: '#ede7de', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: uploadState === 'success' ? '#27ae60' : 'linear-gradient(90deg, #d4612f, #e2875c)',
                  borderRadius: '999px',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>

            {uploadState === 'uploading' && (
              <p style={{ fontSize: '12px', color: '#8a7a6e', marginTop: '12px' }}>
                Please keep this window open while your presentation is being securely stored.
              </p>
            )}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#fdf2f0',
              border: '1px solid #f5c6cb',
              color: '#b0412c',
              fontSize: '12.5px',
              lineHeight: '1.4',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={handleClose}
            className="pill"
            style={{
              padding: '8px 18px',
              fontSize: '12.5px',
              background: 'transparent',
              border: '1px solid rgba(59, 33, 22, 0.2)',
            }}
          >
            {uploadState === 'uploading' ? 'Cancel Upload' : 'Close'}
          </button>

          {uploadState === 'error' && (
            <button
              type="button"
              onClick={startUpload}
              className="btn-dark"
              style={{
                padding: '8px 20px',
                fontSize: '12.5px',
                background: '#d4612f',
              }}
            >
              Retry Upload
            </button>
          )}

          {uploadState !== 'uploading' && uploadState !== 'success' && uploadState !== 'error' && (
            <button
              type="button"
              onClick={startUpload}
              disabled={!file}
              className="btn-dark"
              style={{
                padding: '8px 20px',
                fontSize: '12.5px',
                opacity: file ? 1 : 0.45,
                cursor: file ? 'pointer' : 'not-allowed',
              }}
            >
              Upload Pitch Deck
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
