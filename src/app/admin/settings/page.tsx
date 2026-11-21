'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Registration settings
  const [isOpen, setIsOpen] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [closedMessage, setClosedMessage] = useState('');
  const [notYetOpenMessage, setNotYetOpenMessage] = useState('');

  // PPT Submissions settings
  const [pptIsOpen, setPptIsOpen] = useState(true);
  const [pptDeadline, setPptDeadline] = useState('');
  const [pptDeadlineLabel, setPptDeadlineLabel] = useState('');
  const [pptClosedMessage, setPptClosedMessage] = useState('');

  // Announcement banner settings
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerText, setBannerText] = useState('');

  // Selected teams publishing settings
  const [selectedTeamsPublished, setSelectedTeamsPublished] = useState(false);
  const [announcementHeading, setAnnouncementHeading] = useState('Selected Teams');
  const [announcementIntro, setAnnouncementIntro] = useState('');
  const [showIdeaTitle, setShowIdeaTitle] = useState(true);
  const [showTrack, setShowTrack] = useState(true);

  // Raw sections cache
  const [rawRegistration, setRawRegistration] = useState<Record<string, unknown>>({});
  const [rawSubmissions, setRawSubmissions] = useState<Record<string, unknown>>({});
  const [rawAnnouncements, setRawAnnouncements] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/content');
        if (!res.ok) throw new Error('Failed to load settings');
        const data = await res.json();

        const reg = (data.overrides?.registration || data.defaults?.registration || {}) as Record<string, unknown>;
        const subs = (data.overrides?.submissions || data.defaults?.submissions || {}) as Record<string, unknown>;
        const ann = (data.overrides?.announcements || data.defaults?.announcements || {}) as Record<string, unknown>;

        setRawRegistration(reg);
        setRawSubmissions(subs);
        setRawAnnouncements(ann);

        setIsOpen(reg.isOpen !== false);
        setDeadline(reg.deadline ? String(reg.deadline).slice(0, 16) : '');
        setClosedMessage(String(reg.closedMessage || 'Registrations are closed. Thank you for your interest!'));
        setNotYetOpenMessage(String(reg.notYetOpenMessage || 'Registrations will open soon. Stay tuned!'));

        setPptIsOpen(subs.isOpen !== false);
        setPptDeadline(subs.deadline ? String(subs.deadline).slice(0, 16) : '');
        setPptDeadlineLabel(String(subs.deadlineLabel || ''));
        setPptClosedMessage(String(subs.closedMessage || 'PPT submissions are currently closed. Thank you for your submissions!'));

        setBannerEnabled(Boolean(ann.bannerEnabled));
        setBannerText(String(ann.bannerText || ''));

        setSelectedTeamsPublished(Boolean(ann.published));
        setAnnouncementHeading(String(ann.heading || 'Selected Teams'));
        setAnnouncementIntro(String(ann.intro || ''));
        setShowIdeaTitle(ann.showIdeaTitle !== false);
        setShowTrack(ann.showTrack !== false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error fetching settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Prepare updated registration object
      const updatedRegistration = {
        ...rawRegistration,
        isOpen,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        closedMessage: closedMessage.trim(),
        notYetOpenMessage: notYetOpenMessage.trim(),
      };

      // 2. Prepare updated PPT submissions object
      const updatedSubmissions = {
        ...rawSubmissions,
        isOpen: pptIsOpen,
        deadline: pptDeadline ? new Date(pptDeadline).toISOString() : null,
        deadlineLabel: pptDeadlineLabel.trim(),
        closedMessage: pptClosedMessage.trim(),
      };

      // 3. Prepare updated announcements object
      const updatedAnnouncements = {
        ...rawAnnouncements,
        published: selectedTeamsPublished,
        bannerEnabled,
        bannerText: bannerText.trim(),
        heading: announcementHeading.trim(),
        intro: announcementIntro.trim(),
        showIdeaTitle,
        showTrack,
      };

      // Save registration section
      const res1 = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'registration',
          value: updatedRegistration,
        }),
      });

      if (!res1.ok) {
        const d = await res1.json();
        throw new Error(d.error || 'Failed to save registration settings');
      }

      // Save submissions section
      const resSubs = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'submissions',
          value: updatedSubmissions,
        }),
      });

      if (!resSubs.ok) {
        const d = await resSubs.json();
        throw new Error(d.error || 'Failed to save PPT submissions settings');
      }

      // Save announcements section
      const res2 = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'announcements',
          value: updatedAnnouncements,
        }),
      });

      if (!res2.ok) {
        const d = await res2.json();
        throw new Error(d.error || 'Failed to save announcements settings');
      }

      setSuccess('Event settings saved successfully! Live site and APIs updated.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: '#6a594d' }}>Loading event settings...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ink)' }}>Event Settings</h1>
          <p style={{ fontSize: '13px', color: '#6a594d', marginTop: '4px' }}>
            Control registration window, deadline cutoff, announcement banners, and published teams.
          </p>
        </div>

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

      {/* 1. Registration Controls Card */}
      <div className="admin-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
          Registration Status & Deadline
        </h2>

        {/* Master Open / Closed Switch */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f0eee6', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>
              Registration Open
            </div>
            <p style={{ fontSize: '12px', color: '#6a594d', marginTop: '2px' }}>
              When toggled off, both the registration form and the submission API are immediately blocked (403).
            </p>
          </div>
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(e) => setIsOpen(e.target.checked)}
            style={{ width: '22px', height: '22px', cursor: 'pointer' }}
          />
        </div>

        {/* Deadline Picker */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
            Submission Deadline
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)', background: 'var(--surface)' }}
          />
          <p style={{ fontSize: '11px', color: '#7a6a5d', marginTop: '4px' }}>
            Optional. If set, registrations will automatically lock once this timestamp is passed.
          </p>
        </div>

        {/* Closed Message */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
            Closed Message (Shown when registration is disabled)
          </label>
          <textarea
            rows={2}
            value={closedMessage}
            onChange={(e) => setClosedMessage(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)' }}
          />
        </div>
      </div>

      {/* 1B. PPT Submissions Controls Card */}
      <div className="admin-card" style={{ padding: '24px', marginBottom: '24px', borderLeft: '4px solid var(--accent, #b44a22)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
          PPT Submissions Status &amp; Deadline
        </h2>
        <p style={{ fontSize: '12px', color: '#6a594d', marginBottom: '16px' }}>
          Manage pitch deck submissions on <code>thinkmit.tech/submissions</code>.
        </p>

        {/* Master PPT Open / Closed Switch */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f0eee6', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>
              PPT Submissions Open
            </div>
            <p style={{ fontSize: '12px', color: '#6a594d', marginTop: '2px' }}>
              When toggled off, participants cannot upload presentations on <code>/submissions</code> and the submission API returns 403.
            </p>
          </div>
          <input
            type="checkbox"
            checked={pptIsOpen}
            onChange={(e) => setPptIsOpen(e.target.checked)}
            style={{ width: '22px', height: '22px', cursor: 'pointer' }}
          />
        </div>

        {/* Deadline Display Label */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
            Deadline Mention / Display Label
          </label>
          <input
            type="text"
            placeholder="e.g. November 25, 2026, 11:59 PM IST"
            value={pptDeadlineLabel}
            onChange={(e) => setPptDeadlineLabel(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)' }}
          />
          <p style={{ fontSize: '11px', color: '#7a6a5d', marginTop: '4px' }}>
            This text is displayed prominently to participants on the <code>/submissions</code> page.
          </p>
        </div>

        {/* Automatic Deadline Cutoff Picker */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
            Automatic Cutoff Timestamp (Optional)
          </label>
          <input
            type="datetime-local"
            value={pptDeadline}
            onChange={(e) => setPptDeadline(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)', background: 'var(--surface)' }}
          />
          <p style={{ fontSize: '11px', color: '#7a6a5d', marginTop: '4px' }}>
            If set, PPT submissions will automatically lock and block uploads after this time.
          </p>
        </div>

        {/* PPT Closed Message */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
            Closed State Message (Shown when PPT submissions are closed)
          </label>
          <textarea
            rows={2}
            value={pptClosedMessage}
            onChange={(e) => setPptClosedMessage(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)' }}
          />
        </div>
      </div>

      {/* 2. Announcement Banner Card */}
      <div className="admin-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
          Top Announcement Banner
        </h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f0eee6', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>
              Enable Top Banner
            </div>
            <p style={{ fontSize: '12px', color: '#6a594d', marginTop: '2px' }}>
              Shows an alert / notice bar above the main site navigation.
            </p>
          </div>
          <input
            type="checkbox"
            checked={bannerEnabled}
            onChange={(e) => setBannerEnabled(e.target.checked)}
            style={{ width: '22px', height: '22px', cursor: 'pointer' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
            Banner Text
          </label>
          <input
            type="text"
            placeholder="e.g. 📢 Shortlisted teams have been announced! Check the Selected Teams section."
            value={bannerText}
            onChange={(e) => setBannerText(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)' }}
          />
        </div>
      </div>

      {/* 3. Selected Teams Announcement Card */}
      <div className="admin-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
          Publish Selected Teams
        </h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f0eee6', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>
              Publish Selected Teams on Home Page
            </div>
            <p style={{ fontSize: '12px', color: '#6a594d', marginTop: '2px' }}>
              When enabled, only teams marked as <code>selected</code> are displayed. Only public fields (Team Name, Track, Idea Title) are rendered — student USN, email, and phone are never exposed.
            </p>
          </div>
          <input
            type="checkbox"
            checked={selectedTeamsPublished}
            onChange={(e) => setSelectedTeamsPublished(e.target.checked)}
            style={{ width: '22px', height: '22px', cursor: 'pointer' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
              Section Heading
            </label>
            <input
              type="text"
              value={announcementHeading}
              onChange={(e) => setAnnouncementHeading(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
              Section Intro Text
            </label>
            <input
              type="text"
              value={announcementIntro}
              onChange={(e) => setAnnouncementIntro(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--tint)' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showTrack}
              onChange={(e) => setShowTrack(e.target.checked)}
            />
            Show Track Badge
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showIdeaTitle}
              onChange={(e) => setShowIdeaTitle(e.target.checked)}
            />
            Show Idea Title
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-dark"
          style={{ padding: '10px 24px', fontSize: '14px' }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
