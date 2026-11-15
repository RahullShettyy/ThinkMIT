'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';

interface VersionItem {
  id: string;
  created_at: string;
  value: unknown;
}

export default function AdminContentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Defaults from data.js, current DB overrides, and history
  const [defaults, setDefaults] = useState<Record<string, unknown>>({});
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});
  const [history, setHistory] = useState<Record<string, VersionItem[]>>({});

  // Active section and search
  const [activeSection, setActiveSection] = useState<string>('site');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Working state for active section
  const [sectionData, setSectionData] = useState<unknown>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Array<{ path: string; message: string }>>([]);

  // Reset All modal
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // Fetch content from API
  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content');
      if (!res.ok) {
        throw new Error(`Failed to load content (${res.status})`);
      }
      const data = await res.json();
      setDefaults(data.defaults || {});
      setOverrides(data.overrides || {});
      setHistory(data.history || {});

      // Initialize active section with override if present, else default
      const sec = activeSection in (data.defaults || {}) ? activeSection : Object.keys(data.defaults || {})[0] || 'site';
      setActiveSection(sec);

      const initialVal = data.overrides?.[sec] !== undefined ? data.overrides[sec] : data.defaults?.[sec];
      setSectionData(JSON.parse(JSON.stringify(initialVal ?? '')));
      setIsDirty(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching content');
    } finally {
      setLoading(false);
    }
  }, [activeSection]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Handle active section change
  const handleSelectSection = (sec: string) => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes in this section. Discard them?')) {
        return;
      }
    }
    setActiveSection(sec);
    const val = overrides[sec] !== undefined ? overrides[sec] : defaults[sec];
    setSectionData(JSON.parse(JSON.stringify(val ?? '')));
    setIsDirty(false);
    setValidationErrors([]);
    setSuccessMsg(null);
    setShowHistory(false);
  };

  // Warn on beforeunload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Deep update helper
  const handleFieldChange = (path: string[], newVal: unknown) => {
    setIsDirty(true);
    setSectionData((prev: unknown) => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (path.length === 0) return newVal;

      let curr: Record<string, unknown> | unknown[] = updated;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (Array.isArray(curr)) {
          curr = curr[Number(key)] as Record<string, unknown> | unknown[];
        } else {
          curr = curr[key] as Record<string, unknown> | unknown[];
        }
      }
      const lastKey = path[path.length - 1];
      if (Array.isArray(curr)) {
        curr[Number(lastKey)] = newVal;
      } else {
        (curr as Record<string, unknown>)[lastKey] = newVal;
      }
      return updated;
    });
  };

  // Save current section override
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setValidationErrors([]);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: activeSection,
          value: sectionData,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        if (resData.errors) {
          setValidationErrors(resData.errors);
        }
        throw new Error(resData.error || 'Failed to save section');
      }

      setOverrides((prev) => ({ ...prev, [activeSection]: sectionData }));
      setIsDirty(false);
      setSuccessMsg(`Section "${activeSection}" saved and revalidated! Live site updated.`);
      setTimeout(() => setSuccessMsg(null), 4000);

      // Refresh history
      const ref = await fetch('/api/admin/content');
      if (ref.ok) {
        const d = await ref.json();
        setHistory(d.history || {});
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving section');
    } finally {
      setSaving(false);
    }
  };

  // Reset active section to data.js default
  const handleResetSection = async () => {
    if (!window.confirm(`Reset section "${activeSection}" to default from data.js? This removes the custom override.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/content?section=${encodeURIComponent(activeSection)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to reset section');
      }

      setOverrides((prev) => {
        const copy = { ...prev };
        delete copy[activeSection];
        return copy;
      });

      const defVal = defaults[activeSection];
      setSectionData(JSON.parse(JSON.stringify(defVal ?? '')));
      setIsDirty(false);
      setSuccessMsg(`Section "${activeSection}" reset to default!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error resetting section');
    }
  };

  // Restore history version
  const handleRestoreVersion = async (v: VersionItem) => {
    if (!window.confirm(`Restore this version from ${new Date(v.created_at).toLocaleString()}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          section: activeSection,
          historyId: v.id,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to restore version');
      }

      setSectionData(JSON.parse(JSON.stringify(v.value)));
      setOverrides((prev) => ({ ...prev, [activeSection]: v.value }));
      setIsDirty(false);
      setSuccessMsg('Version restored successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error restoring version');
    }
  };

  // Reset ALL overrides
  const handleResetAll = async () => {
    if (resetConfirmText !== 'RESET') {
      alert('Please type RESET to confirm.');
      return;
    }

    try {
      const res = await fetch('/api/admin/content?section=ALL&confirm=RESET', {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to reset all content');
      }

      setOverrides({});
      const defVal = defaults[activeSection];
      setSectionData(JSON.parse(JSON.stringify(defVal ?? '')));
      setIsDirty(false);
      setShowResetAllModal(false);
      setResetConfirmText('');
      setSuccessMsg('All custom content overrides cleared! Site reverted to data.js defaults.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error resetting all content');
    }
  };

  const sectionKeys = useMemo(() => Object.keys(defaults), [defaults]);
  const isSectionOverridden = overrides[activeSection] !== undefined;

  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--ink)' }}>
        <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid #ccc', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Loading content editor schema from data.js...
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ink)' }}>Content Editor</h1>
          <p style={{ fontSize: '13px', color: '#6a594d', marginTop: '4px' }}>
            Modify live website copy recursively generated from <code>data.js</code>. Saved overrides update immediately.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowResetAllModal(true)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #d45d5d',
              background: 'transparent',
              color: '#d45d5d',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reset All to Default
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
              fontWeight: 500,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>↗</span> View Live Site
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#d4f4dd', border: '1px solid #7cd699', color: '#135c2b', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#135c2b', fontSize: '16px' }}>×</button>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: '#fbeaea', border: '1px solid #e8a2a2', color: '#8c2222', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c2222', fontSize: '16px' }}>×</button>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div style={{ padding: '12px 16px', background: '#fff4e5', border: '1px solid #ffd599', color: '#8a5300', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          <strong>Structural validation errors:</strong>
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            {validationErrors.map((v, idx) => (
              <li key={idx}><code>{v.path}</code>: {v.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Grid: Sidebar + Editor Pane */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Sections Sidebar */}
        <div className="admin-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a5d', textTransform: 'uppercase', marginBottom: '8px' }}>
            Content Sections
          </div>
          {sectionKeys.map((sec) => {
            const isOverridden = overrides[sec] !== undefined;
            const isActive = sec === activeSection;

            return (
              <button
                key={sec}
                onClick={() => handleSelectSection(sec)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive ? 'var(--ink)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
              >
                <span style={{ textTransform: 'capitalize' }}>{sec}</span>
                {isOverridden && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isActive ? '#d47226' : '#fff0e6',
                      color: isActive ? '#fff' : '#b3550b',
                      fontWeight: 600,
                    }}
                  >
                    MODIFIED
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Editor Panel */}
        <div className="admin-card" style={{ padding: '24px' }}>
          {/* Section Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--tint)', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>
                {activeSection}
              </h2>
              {isSectionOverridden && (
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#fff0e6', color: '#b3550b', fontWeight: 600 }}>
                  Custom Overrides Active
                </span>
              )}
              {isDirty && (
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                  ● Unsaved changes
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Diff Toggle */}
              <button
                onClick={() => setShowDiff(!showDiff)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--tint)',
                  background: showDiff ? 'var(--tint)' : 'transparent',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {showDiff ? 'Hide Diff' : 'Compare Default'}
              </button>

              {/* Version History Toggle */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--tint)',
                  background: showHistory ? 'var(--tint)' : 'transparent',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                History ({history[activeSection]?.length || 0})
              </button>

              {/* Reset Section Button */}
              {isSectionOverridden && (
                <button
                  onClick={handleResetSection}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d45d5d',
                    background: 'transparent',
                    color: '#d45d5d',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Reset Section
                </button>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="btn-dark"
                style={{
                  padding: '7px 16px',
                  fontSize: '13px',
                  opacity: saving || !isDirty ? 0.6 : 1,
                  cursor: saving || !isDirty ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save & Publish'}
              </button>
            </div>
          </div>

          {/* Search Box within Section */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search keys in this section (e.g. title, hero, dates)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid var(--tint)',
                background: 'var(--surface)',
                outline: 'none',
              }}
            />
          </div>

          {/* History Drawer */}
          {showHistory && (
            <div style={{ background: '#faf9f5', border: '1px solid var(--tint)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '10px' }}>
                Version History for &quot;{activeSection}&quot; (Last 20 saves)
              </div>
              {!history[activeSection] || history[activeSection].length === 0 ? (
                <div style={{ fontSize: '12px', color: '#7a6a5d' }}>No prior saved versions recorded yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {history[activeSection].map((h, i) => (
                    <div key={h.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #eee' }}>
                      <span style={{ fontSize: '12px', color: '#555' }}>
                        Version #{history[activeSection].length - i} — {new Date(h.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                      </span>
                      <button
                        onClick={() => handleRestoreVersion(h)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--tint)',
                          background: 'var(--surface)',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Restore This Version
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Diff View if enabled */}
          {showDiff && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f5f4ef', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px' }}>
              <div>
                <strong style={{ color: '#7a6a5d' }}>Default in data.js:</strong>
                <pre style={{ marginTop: '6px', padding: '8px', background: '#fff', borderRadius: '4px', maxHeight: '220px', overflow: 'auto', border: '1px solid #ddd' }}>
                  {JSON.stringify(defaults[activeSection], null, 2)}
                </pre>
              </div>
              <div>
                <strong style={{ color: '#b3550b' }}>Current Value / Edits:</strong>
                <pre style={{ marginTop: '6px', padding: '8px', background: '#fff', borderRadius: '4px', maxHeight: '220px', overflow: 'auto', border: '1px solid #ddd' }}>
                  {JSON.stringify(sectionData, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Recursive Field Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RecursiveField
              key={activeSection}
              label={activeSection}
              path={[]}
              value={sectionData}
              defaultValue={defaults[activeSection]}
              onChange={(newVal) => handleFieldChange([], newVal)}
              searchQuery={searchQuery.toLowerCase().trim()}
              depth={0}
            />
          </div>
        </div>
      </div>

      {/* Reset All Modal with Typed Confirmation */}
      {showResetAllModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '28px', borderRadius: '12px', maxWidth: '440px', width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#991b1b', marginBottom: '8px' }}>
              Reset All Content to Default?
            </h3>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.5, marginBottom: '16px' }}>
              This will permanently delete all database overrides across all sections. The site will immediately fall back to the raw defaults defined in <code>data.js</code>.
            </p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
              Type <span style={{ color: '#b91c1c' }}>RESET</span> below to confirm:
            </p>
            <input
              type="text"
              placeholder="RESET"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowResetAllModal(false);
                  setResetConfirmText('');
                }}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #ccc', background: '#f5f5f5', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetAll}
                disabled={resetConfirmText !== 'RESET'}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: resetConfirmText === 'RESET' ? '#dc2626' : '#f87171',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: resetConfirmText === 'RESET' ? 'pointer' : 'not-allowed',
                }}
              >
                Confirm Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecursiveField: Dynamically renders inputs based on data.js shape
// ---------------------------------------------------------------------------
interface RecursiveFieldProps {
  label: string;
  path: string[];
  value: unknown;
  defaultValue: unknown;
  onChange: (val: unknown) => void;
  searchQuery: string;
  depth: number;
}

function RecursiveField({
  label,
  path,
  value,
  defaultValue,
  onChange,
  searchQuery,
  depth,
}: RecursiveFieldProps) {
  const [collapsed, setCollapsed] = useState(depth > 1);

  // Check if matches search query
  const keyStr = path.join('.').toLowerCase();
  const labelMatches = searchQuery === '' || keyStr.includes(searchQuery) || label.toLowerCase().includes(searchQuery);

  // 1. Primitive: Boolean -> Toggle Switch
  if (typeof value === 'boolean' || typeof defaultValue === 'boolean') {
    if (!labelMatches) return null;
    const isModified = value !== defaultValue;

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0eee6' }}>
        <div>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
            {label}
          </label>
          {isModified && (
            <span style={{ marginLeft: '8px', fontSize: '10px', background: '#fff0e6', color: '#b3550b', padding: '1px 5px', borderRadius: '3px' }}>
              modified
            </span>
          )}
        </div>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
      </div>
    );
  }

  // 2. Primitive: Number
  if (typeof value === 'number' || typeof defaultValue === 'number') {
    if (!labelMatches) return null;
    const isModified = value !== defaultValue;

    return (
      <div style={{ padding: '6px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#555' }}>
            {label}
          </label>
          {isModified && (
            <span style={{ fontSize: '10px', background: '#fff0e6', color: '#b3550b', padding: '1px 5px', borderRadius: '3px' }}>
              modified
            </span>
          )}
        </div>
        <input
          type="number"
          value={value === null || value === undefined ? '' : Number(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--tint)' }}
        />
      </div>
    );
  }

  // 3. Primitive: String (or Null string / URL / placeholder)
  if (typeof value === 'string' || typeof defaultValue === 'string' || value === null) {
    if (!labelMatches) return null;
    const isModified = value !== defaultValue;
    const strVal = value === null || value === undefined ? '' : String(value);

    // Multiline textarea if long or common multiline key names
    const isLongText =
      strVal.length > 70 ||
      strVal.includes('\n') ||
      /description|abstract|problem|solution|uniqueness|impact|message|consent|heroHeadline/i.test(label);

    return (
      <div style={{ padding: '6px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#555' }}>
            {label}
          </label>
          {isModified && (
            <span style={{ fontSize: '10px', background: '#fff0e6', color: '#b3550b', padding: '1px 5px', borderRadius: '3px' }}>
              modified
            </span>
          )}
        </div>
        {isLongText ? (
          <textarea
            rows={3}
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--tint)', resize: 'vertical' }}
          />
        ) : (
          <input
            type="text"
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--tint)' }}
          />
        )}
      </div>
    );
  }

  // 4. Array -> Add, Remove, Reorder Items
  if (Array.isArray(value)) {
    const arr = value as unknown[];
    const defArr = Array.isArray(defaultValue) ? defaultValue : [];

    const handleAddItem = () => {
      // If default array has an element template, clone it; else add empty string
      const template = defArr.length > 0 ? defArr[0] : '';
      const newItem = typeof template === 'object' && template !== null ? JSON.parse(JSON.stringify(template)) : '';
      onChange([...arr, newItem]);
    };

    const handleRemoveItem = (index: number) => {
      const copy = [...arr];
      copy.splice(index, 1);
      onChange(copy);
    };

    const handleMoveItem = (index: number, direction: 'up' | 'down') => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= arr.length) return;
      const copy = [...arr];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      onChange(copy);
    };

    return (
      <div style={{ border: '1px solid #e7e4dc', borderRadius: '8px', padding: '14px', background: '#faf9f6', margin: '8px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#666' }}
            >
              {collapsed ? '▶' : '▼'}
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
              {label} ({arr.length} items)
            </span>
          </div>

          <button
            onClick={handleAddItem}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid var(--tint)',
              background: '#fff',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + Add Item
          </button>
        </div>

        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {arr.map((item, idx) => (
              <div key={idx} style={{ background: '#fff', border: '1px solid #ebe8e1', borderRadius: '6px', padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f2ec', paddingBottom: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#7a6a5d' }}>Item #{idx + 1}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleMoveItem(idx, 'up')}
                      disabled={idx === 0}
                      style={{ padding: '2px 6px', fontSize: '10px', cursor: idx === 0 ? 'default' : 'pointer' }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveItem(idx, 'down')}
                      disabled={idx === arr.length - 1}
                      style={{ padding: '2px 6px', fontSize: '10px', cursor: idx === arr.length - 1 ? 'default' : 'pointer' }}
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      style={{ padding: '2px 6px', fontSize: '10px', color: '#b91c1c', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <RecursiveField
                  label={`Item ${idx + 1}`}
                  path={[...path, String(idx)]}
                  value={item}
                  defaultValue={defArr[idx] ?? defArr[0]}
                  onChange={(val) => {
                    const copy = [...arr];
                    copy[idx] = val;
                    onChange(copy);
                  }}
                  searchQuery={searchQuery}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 5. Object -> Collapsible Group
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    const defObj = (typeof defaultValue === 'object' && defaultValue !== null ? defaultValue : {}) as Record<string, unknown>;

    // Merge keys from both current object and default object so newly added keys to data.js appear automatically!
    const allKeys = Array.from(new Set([...Object.keys(defObj), ...Object.keys(obj)]));

    return (
      <div style={{ borderLeft: depth > 0 ? '2px solid #e2ded5' : 'none', paddingLeft: depth > 0 ? '12px' : 0, margin: '6px 0' }}>
        {depth > 0 && (
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 0' }}
          >
            <span style={{ fontSize: '10px', color: '#888' }}>{collapsed ? '▶' : '▼'}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
          </div>
        )}

        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allKeys.map((k) => (
              <RecursiveField
                key={k}
                label={k}
                path={[...path, k]}
                value={obj[k]}
                defaultValue={defObj[k]}
                onChange={(val) => {
                  const updated = { ...obj, [k]: val };
                  onChange(updated);
                }}
                searchQuery={searchQuery}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
