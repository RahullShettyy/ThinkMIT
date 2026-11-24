'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { SiteContent } from '@/lib/content';
import { getRegistrationState } from '@/lib/registration-state';

interface MemberData {
  name: string;
  usn: string;
  email: string;
  phone: string;
  role_key: string;
  programme: string;
  year: string;
  department: string;
}

interface FormData {
  team_name: string;
  track_key: string;
  members: [MemberData, MemberData, MemberData];
  idea_title: string;
  problem: string;
  solution: string;
  uniqueness: string;
  impact: string;
  consent: boolean;
  website: string;
}

const STORAGE_KEY = 'thinkmit-draft-v1';

export default function RegisterForm({
  content,
}: {
  content: SiteContent;
}) {
  const { registration, form, roles, tracks } = content;
  const regState = getRegistrationState(registration);

  const defaultRole1 = roles[0]?.key || 'business';
  const defaultRole2 = roles[1]?.key || 'innovation';
  const defaultRole3 = roles[2]?.key || 'technical';

  const defaultMember = (roleKey: string): MemberData => ({
    name: '',
    usn: '',
    email: '',
    phone: '',
    role_key: roleKey,
    programme: form.programmeOptions[0] || 'UG – 1st Year',
    year: '',
    department: '',
  });

  const [formData, setFormData] = useState<FormData>({
    team_name: '',
    track_key: tracks[0]?.key || '',
    members: [
      defaultMember(defaultRole1),
      defaultMember(defaultRole2),
      defaultMember(defaultRole3),
    ],
    idea_title: '',
    problem: '',
    solution: '',
    uniqueness: '',
    impact: '',
    consent: false,
    website: '',
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => {
    return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  });
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Modal state for USNs outside the MIT Mysore formats
  const [usnAlertModal, setUsnAlertModal] = useState<{
    isOpen: boolean;
    enteredUsn: string;
    memberIndex: number;
    memberName: string;
  } | null>(null);

  const closeUsnAlertModal = useCallback(() => {
    if (usnAlertModal) {
      const idx = usnAlertModal.memberIndex;
      setUsnAlertModal(null);
      setTimeout(() => {
        const el = document.querySelector(`[name="members.${idx}.usn"]`) as HTMLInputElement | null;
        if (el) {
          el.focus();
          el.select();
        }
      }, 50);
    } else {
      setUsnAlertModal(null);
    }
  }, [usnAlertModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && usnAlertModal?.isOpen) {
        closeUsnAlertModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [usnAlertModal, closeUsnAlertModal]);

  const handleUsnBlur = (idx: number) => {
    const val = formData.members[idx].usn.trim().toUpperCase();
    if (!val) return;
    const usnRegex = new RegExp(registration.validation.usnRegex || '^4MH[A-Za-z0-9]{7}$');

    if (!val.startsWith('4MH') && !val.startsWith('MIT')) {
      setErrors((prev) => ({
        ...prev,
        [`members.${idx}.usn`]:
          'USN must start with 4MH or MIT.',
      }));
      setUsnAlertModal({
        isOpen: true,
        enteredUsn: val,
        memberIndex: idx,
        memberName: formData.members[idx].name.trim() || form.memberTitles[idx],
      });
    } else if (
      (val.startsWith('4MH') && (val.length !== 10 || !usnRegex.test(val))) ||
      (val.startsWith('MIT') && val.length > 12)
    ) {
      setErrors((prev) => ({
        ...prev,
        [`members.${idx}.usn`]:
          val.startsWith('4MH')
            ? '4MH USNs must be exactly 10 characters.'
            : 'MIT temporary USNs must be at most 12 characters.',
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`members.${idx}.usn`];
        return next;
      });
    }
  };

  // Restore draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          setFormData(parsed.formData);
        }
        if (parsed.idempotencyKey) {
          setIdempotencyKey(parsed.idempotencyKey);
        }
      } else {
        setIdempotencyKey(`sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
      }
    } catch {
      // ignore
    }
    setDraftLoaded(true);
  }, []);

  // Autosave draft to localStorage
  useEffect(() => {
    if (!draftLoaded || submissionSuccess) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          formData,
          idempotencyKey,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore
    }
  }, [formData, idempotencyKey, draftLoaded, submissionSuccess]);

  // Stream auto-swap logic
  const handleRoleSelect = (memberIndex: number, newRoleKey: string) => {
    setFormData((prev) => {
      const currentMembers = [...prev.members] as [MemberData, MemberData, MemberData];
      const otherMemberIndex = currentMembers.findIndex(
        (m, idx) => idx !== memberIndex && m.role_key === newRoleKey
      );

      if (otherMemberIndex !== -1) {
        // Swap streams between the two members
        const prevRole = currentMembers[memberIndex].role_key;
        currentMembers[memberIndex] = { ...currentMembers[memberIndex], role_key: newRoleKey };
        currentMembers[otherMemberIndex] = {
          ...currentMembers[otherMemberIndex],
          role_key: prevRole,
        };
      } else {
        currentMembers[memberIndex] = { ...currentMembers[memberIndex], role_key: newRoleKey };
      }

      return { ...prev, members: currentMembers };
    });
  };

  // Step validation
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    const val = registration.validation;
    const limits = registration.ideaLimits;

    if (step === 0) {
      if (!formData.team_name.trim()) {
        newErrors['team_name'] = 'Team name is required';
      } else if (
        formData.team_name.trim().length < (val.teamNameMin || 3) ||
        formData.team_name.trim().length > (val.teamNameMax || 40)
      ) {
        newErrors['team_name'] = `Team name must be between ${val.teamNameMin || 3} and ${val.teamNameMax || 40} characters`;
      }
      if (!formData.track_key) {
        newErrors['track_key'] = 'Please select a domain';
      }
    }

    if (step === 1) {
      const usnRegex = new RegExp(val.usnRegex || '^4MH[A-Za-z0-9]{7}$');
      const phoneRegex = new RegExp(val.phoneRegex || '^[6-9][0-9]{9}$');
      const usns = new Set<string>();
      const emails = new Set<string>();
      let firstInvalidUsnMember: { idx: number; usn: string; name: string } | null = null;

      for (let idx = 0; idx < formData.members.length; idx++) {
        const m = formData.members[idx];
        if (!m.name.trim()) {
          newErrors[`members.${idx}.name`] = 'Full name is required';
        }
        const trimmedUsn = m.usn.trim().toUpperCase();
        if (!trimmedUsn) {
          newErrors[`members.${idx}.usn`] = 'USN is required';
        } else if (!trimmedUsn.startsWith('4MH') && !trimmedUsn.startsWith('MIT')) {
          newErrors[`members.${idx}.usn`] =
            'USN must start with 4MH or MIT.';
          if (!firstInvalidUsnMember) {
            firstInvalidUsnMember = {
              idx,
              usn: trimmedUsn,
              name: m.name.trim() || form.memberTitles[idx],
            };
          }
        } else if (
          (trimmedUsn.startsWith('4MH') && (trimmedUsn.length !== 10 || !usnRegex.test(trimmedUsn))) ||
          (trimmedUsn.startsWith('MIT') && trimmedUsn.length > 12)
        ) {
          newErrors[`members.${idx}.usn`] =
            trimmedUsn.startsWith('4MH')
              ? '4MH USNs must be exactly 10 characters.'
              : 'MIT temporary USNs must be at most 12 characters.';
        } else if (usns.has(trimmedUsn)) {
          newErrors[`members.${idx}.usn`] = 'Duplicate USN inside the team';
        }
        usns.add(trimmedUsn);
      }

      if (firstInvalidUsnMember) {
        setUsnAlertModal({
          isOpen: true,
          enteredUsn: firstInvalidUsnMember.usn,
          memberIndex: firstInvalidUsnMember.idx,
          memberName: firstInvalidUsnMember.name,
        });
      }

      formData.members.forEach((m, idx) => {

        if (!m.email.trim()) {
          newErrors[`members.${idx}.email`] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email.trim())) {
          newErrors[`members.${idx}.email`] = 'Invalid email address';
        } else if (emails.has(m.email.trim().toLowerCase())) {
          newErrors[`members.${idx}.email`] = 'Duplicate email inside the team';
        }
        emails.add(m.email.trim().toLowerCase());

        const cleanedPhone = m.phone.replace(/[\s\-\+]/g, '').replace(/^91/, '').replace(/^0/, '');
        if (!m.phone.trim()) {
          newErrors[`members.${idx}.phone`] = 'Contact number is required';
        } else if (!phoneRegex.test(cleanedPhone)) {
          newErrors[`members.${idx}.phone`] = 'Invalid 10-digit mobile number';
        }

        if (form.member.year?.enabled && !m.year.trim()) {
          newErrors[`members.${idx}.year`] = 'Year/Semester is required';
        }
        if (form.member.department?.enabled && !m.department.trim()) {
          newErrors[`members.${idx}.department`] = 'Department is required';
        }
      });
    }

    if (step === 2) {
      if (!formData.idea_title.trim()) {
        newErrors['idea_title'] = 'Idea title is required';
      }
      if (!formData.problem.trim()) {
        newErrors['problem'] = 'Problem statement is required';
      } else if (formData.problem.trim().length > limits.problemMax) {
        newErrors['problem'] = `Problem statement exceeds max ${limits.problemMax} characters`;
      }
      if (!formData.solution.trim()) {
        newErrors['solution'] = 'Proposed solution is required';
      } else if (formData.solution.trim().length > limits.solutionMax) {
        newErrors['solution'] = `Proposed solution exceeds max ${limits.solutionMax} characters`;
      }
      if (!formData.uniqueness.trim()) {
        newErrors['uniqueness'] = 'Innovation & uniqueness is required';
      } else if (formData.uniqueness.trim().length > limits.uniquenessMax) {
        newErrors['uniqueness'] = `Innovation & uniqueness exceeds max ${limits.uniquenessMax} characters`;
      }
      if (!formData.impact.trim()) {
        newErrors['impact'] = 'Expected impact is required';
      } else if (formData.impact.trim().length > limits.impactMax) {
        newErrors['impact'] = `Expected impact exceeds max ${limits.impactMax} characters`;
      }
    }

    if (step === 3) {
      if (!formData.consent) {
        newErrors['consent'] = 'You must confirm the consent checkbox to submit';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Focus first error
      const firstKey = Object.keys(newErrors)[0];
      const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement;
      if (el) el.focus();
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, form.steps.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    // Validate all 4 steps to ensure complete integrity
    for (let s = 0; s <= 3; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setErrors(data.details);
          // Jump to first step that has errors
          const errorKeys = Object.keys(data.details);
          if (errorKeys.some((k) => k.startsWith('team_') || k.startsWith('track_'))) {
            setCurrentStep(0);
          } else if (errorKeys.some((k) => k.startsWith('members.'))) {
            setCurrentStep(1);
          } else if (errorKeys.some((k) => k.startsWith('idea_') || k.startsWith('problem') || k.startsWith('solution') || k.startsWith('uniqueness') || k.startsWith('impact'))) {
            setCurrentStep(2);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (data.field) {
          setErrors({ [data.field]: data.message || data.error });
          if (data.field === 'team_name') setCurrentStep(0);
          if (data.field.startsWith('members.')) setCurrentStep(1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setErrors({ general: data.error || 'Registration failed. Please check your inputs.' });
        }
        setIsSubmitting(false);
        return;
      }

      // Success! Clear draft
      localStorage.removeItem(STORAGE_KEY);
      setSubmissionSuccess(data.regCode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErrors({ general: 'Network error submitting registration. Please check your connection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (submissionSuccess) {
      navigator.clipboard.writeText(submissionSuccess);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If closed or not yet open
  if (regState.isClosed) {
    return (
      <div className="card form-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 400 }}>Registrations Unavailable</h2>
        <p style={{ marginTop: '16px', fontSize: '15px', color: 'var(--ink-2)' }}>
          {regState.stateMessage}
        </p>
        <div style={{ marginTop: '28px' }}>
          <Link href="/" className="btn-dark">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Success Screen
  if (submissionSuccess) {
    return (
      <div className="success-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div className="success-icon" style={{ margin: '0 auto 20px' }}>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#2e7d32" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--ink)' }}>Submitted Successfully!</h2>
        <div className="reg-id-box" style={{ margin: '20px auto', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '0.04em' }}>{submissionSuccess}</span>
          <button
            type="button"
            className="pill"
            onClick={copyToClipboard}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            {copied ? 'Copied!' : 'Copy ID'}
          </button>
        </div>
        <p style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: '1.6', maxWidth: '440px', margin: '0 auto' }}>
          {registration.successMessage || 'Your team and idea have been submitted. Keep your Registration ID safe.'}
        </p>

        {/* WhatsApp Group Invitation */}
        <div
          className="whatsapp-card"
          style={{
            margin: '28px auto 0',
            maxWidth: '480px',
            padding: '24px 20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(18, 140, 126, 0.12) 100%)',
            border: '1.5px solid rgba(37, 211, 102, 0.35)',
            boxShadow: '0 4px 16px rgba(18, 140, 126, 0.08)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#25D366',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
            }}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662a11.835 11.835 0 005.712 1.461h.005c6.554 0 11.89-5.336 11.893-11.893a11.82 11.82 0 00-3.48-8.413Z" />
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#166534', margin: '0 0 6px' }}>
            Official Participant WhatsApp Group
          </h3>
          <p style={{ fontSize: '13.5px', color: '#374151', lineHeight: '1.5', margin: '0 auto 16px', maxWidth: '380px' }}>
            Join the official WhatsApp group for event announcements, screening results, and pitch schedule updates.
          </p>
          <a
            href="https://chat.whatsapp.com/JrRCX2alfSp5WqYGNBgxuD?s=cl&p=a&iam=2"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '999px',
              background: '#25D366',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 3px 12px rgba(37, 211, 102, 0.35)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            Join the group
          </a>
          <div style={{ marginTop: '12px' }}>
            <a
              href="https://chat.whatsapp.com/JrRCX2alfSp5WqYGNBgxuD?s=cl&p=a&iam=2"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '12px',
                color: '#128c7e',
                wordBreak: 'break-all',
                textDecoration: 'underline',
              }}
            >
              https://chat.whatsapp.com/JrRCX2alfSp5WqYGNBgxuD?s=cl&p=a&iam=2
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
          <Link href="/" className="btn-dark" style={{ minWidth: '160px', textAlign: 'center' }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const selectedTrack = tracks.find((t) => t.key === formData.track_key);

  return (
    <div className="reg-container">
      {/* Stepper Header */}
      <div className="stepper" aria-label="Registration Progress">
        {form.steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;

          return (
            <button
              key={step.key || idx}
              type="button"
              className={`step-pill ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
              onClick={() => {
                if (idx < currentStep) setCurrentStep(idx);
              }}
              aria-current={isActive ? 'step' : undefined}
            >
              <span>{idx + 1}.</span> {step.title}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '11.5px', color: '#8a7a6e' }}>
        <span>Step {currentStep + 1} of {form.steps.length} · {form.steps[currentStep].title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7fb07a' }}></span>
          Draft autosaved
        </span>
      </div>

      {errors.general && (
        <div className="card" style={{ padding: '14px', marginTop: '16px', background: '#fdedec', borderColor: '#c8553d', color: '#b0412c', fontSize: '13px' }}>
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card" noValidate>

        {/* STEP 1: Team & Domain */}
        {currentStep === 0 && (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '20px' }}>
              1. Team Name & Domain of Interest
            </h3>

            <div className={`form-group ${errors.team_name ? 'has-error' : ''}`}>
              <label htmlFor="team_name">{form.team.teamName.label} *</label>
              <input
                id="team_name"
                name="team_name"
                type="text"
                aria-invalid={Boolean(errors.team_name)}
                aria-describedby={errors.team_name ? 'team_name-error' : undefined}
                value={formData.team_name}
                onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                placeholder={form.team.teamName.placeholder}
              />
              {errors.team_name && <div id="team_name-error" className="field-error">{errors.team_name}</div>}
            </div>

            <div className={`form-group ${errors.track_key ? 'has-error' : ''}`} style={{ marginTop: '24px' }}>
              <label>{form.team.track.label} *</label>
              <p style={{ fontSize: '12px', color: '#8a7a6e', marginBottom: '10px' }}>
                {form.team.track.help}
              </p>
              <div className="track-radio-group">
                {tracks.map((t) => {
                  const isSelected = formData.track_key === t.key;
                  return (
                    <div
                      key={t.key}
                      className={`track-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, track_key: t.key })}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          setFormData({ ...formData, track_key: t.key });
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>{t.name}</strong>
                        {isSelected && (
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#3b2116', display: 'grid', placeItems: 'center' }}>
                            <svg viewBox="0 0 24 24" width="10" height="10" stroke="#fff" strokeWidth="3" fill="none">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: '12.5px', color: '#5b4a3f', marginTop: '6px', lineHeight: '1.4' }}>{t.description}</p>
                      {t.focus && (
                        <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#8a7a6e', lineHeight: '1.4' }}>
                          <strong style={{ color: 'var(--ink)' }}>Focus:</strong> {t.focus}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {errors.track_key && <div className="field-error">{errors.track_key}</div>}
            </div>
          </div>
        )}

        {/* STEP 2: Team Members (Exactly 3) */}
        {currentStep === 1 && (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '8px' }}>
              2. Team Members (Exactly 3)
            </h3>
            <p style={{ fontSize: '13px', color: '#6a594d', marginBottom: '20px', lineHeight: '1.5' }}>
              Member 1 is designated as the Team Leader. Each member must present one distinct category: Business, Innovation, or Technical. All UG (1st, 2nd, 3rd, 4th Year), MBA, MCA, and M.Tech students of MITM are eligible, and interdisciplinary teams across departments are allowed and encouraged.
            </p>

            {formData.members.map((member, idx) => (
              <div key={idx} className="member-subcard">
                <div className="member-subcard-head">
                  <strong style={{ fontSize: '15px' }}>{form.memberTitles[idx]}</strong>
                  {idx === 0 && <span className="leader-pill">Team Leader</span>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div className={`form-group ${errors[`members.${idx}.name`] ? 'has-error' : ''}`}>
                    <label>{form.member.name.label} *</label>
                    <input
                      name={`members.${idx}.name`}
                      type="text"
                      placeholder={form.member.name.placeholder}
                      value={member.name}
                      onChange={(e) => {
                        const members = [...formData.members] as [MemberData, MemberData, MemberData];
                        members[idx].name = e.target.value;
                        setFormData({ ...formData, members });
                      }}
                    />
                    {errors[`members.${idx}.name`] && (
                      <div className="field-error">{errors[`members.${idx}.name`]}</div>
                    )}
                  </div>

                  <div className={`form-group ${errors[`members.${idx}.usn`] ? 'has-error' : ''}`}>
                    <label htmlFor={`member-usn-${idx}`}>{form.member.usn.label} *</label>
                    <input
                      id={`member-usn-${idx}`}
                      name={`members.${idx}.usn`}
                      type="text"
                      placeholder={form.member.usn.placeholder}
                      value={member.usn}
                      onBlur={() => handleUsnBlur(idx)}
                      onChange={(e) => {
                        const members = [...formData.members] as [MemberData, MemberData, MemberData];
                        members[idx].usn = e.target.value.toUpperCase();
                        setFormData({ ...formData, members });
                      }}
                      maxLength={member.usn.trim().toUpperCase().startsWith('4MH') ? 10 : 12}
                      autoComplete="off"
                    />

                    {errors[`members.${idx}.usn`] && (
                      <div className="field-error">{errors[`members.${idx}.usn`]}</div>
                    )}
                  </div>

                  <div className={`form-group ${errors[`members.${idx}.email`] ? 'has-error' : ''}`}>
                    <label>{form.member.email.label} *</label>
                    <input
                      name={`members.${idx}.email`}
                      type="email"
                      placeholder={form.member.email.placeholder}
                      value={member.email}
                      onChange={(e) => {
                        const members = [...formData.members] as [MemberData, MemberData, MemberData];
                        members[idx].email = e.target.value.toLowerCase();
                        setFormData({ ...formData, members });
                      }}
                    />
                    {errors[`members.${idx}.email`] && (
                      <div className="field-error">{errors[`members.${idx}.email`]}</div>
                    )}
                  </div>

                  <div className={`form-group ${errors[`members.${idx}.phone`] ? 'has-error' : ''}`}>
                    <label>{form.member.phone.label} *</label>
                    <input
                      name={`members.${idx}.phone`}
                      type="tel"
                      placeholder={form.member.phone.placeholder}
                      value={member.phone}
                      onChange={(e) => {
                        const members = [...formData.members] as [MemberData, MemberData, MemberData];
                        members[idx].phone = e.target.value;
                        setFormData({ ...formData, members });
                      }}
                    />
                    {errors[`members.${idx}.phone`] && (
                      <div className="field-error">{errors[`members.${idx}.phone`]}</div>
                    )}
                  </div>

                  {form.member.programme?.enabled && (
                    <div className="form-group">
                      <label>{form.member.programme.label} *</label>
                      <select
                        value={member.programme}
                        onChange={(e) => {
                          const members = [...formData.members] as [MemberData, MemberData, MemberData];
                          members[idx].programme = e.target.value;
                          setFormData({ ...formData, members });
                        }}
                      >
                        {form.programmeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.member.year?.enabled && (
                    <div className={`form-group ${errors[`members.${idx}.year`] ? 'has-error' : ''}`}>
                      <label>{form.member.year.label} *</label>
                      <input
                        name={`members.${idx}.year`}
                        type="text"
                        placeholder={form.member.year.placeholder}
                        value={member.year}
                        onChange={(e) => {
                          const members = [...formData.members] as [MemberData, MemberData, MemberData];
                          members[idx].year = e.target.value;
                          setFormData({ ...formData, members });
                        }}
                      />
                      {errors[`members.${idx}.year`] && (
                        <div className="field-error">{errors[`members.${idx}.year`]}</div>
                      )}
                    </div>
                  )}

                  {form.member.department?.enabled && (
                    <div className={`form-group ${errors[`members.${idx}.department`] ? 'has-error' : ''}`}>
                      <label>{form.member.department.label} *</label>
                      <input
                        name={`members.${idx}.department`}
                        type="text"
                        placeholder={form.member.department.placeholder}
                        value={member.department}
                        onChange={(e) => {
                          const members = [...formData.members] as [MemberData, MemberData, MemberData];
                          members[idx].department = e.target.value;
                          setFormData({ ...formData, members });
                        }}
                      />
                      {errors[`members.${idx}.department`] && (
                        <div className="field-error">{errors[`members.${idx}.department`]}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Role / Category selector with auto-swap */}
                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.08em', color: '#6a594d', display: 'block', marginBottom: '6px' }}>
                    {form.member.role.label} (Select 1 of 3 Roles) *
                  </label>
                  <div className="stream-pills">
                    {roles.map((r) => {
                      const isSelected = member.role_key === r.key;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          className={`stream-pill ${isSelected ? 'active' : ''}`}
                          onClick={() => handleRoleSelect(idx, r.key)}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 3: Your Idea */}
        {currentStep === 2 && (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '20px' }}>
              3. Your Campus Idea
            </h3>

            <div className={`form-group ${errors.idea_title ? 'has-error' : ''}`}>
              <label>{form.idea.title.label} *</label>
              <input
                name="idea_title"
                type="text"
                placeholder={form.idea.title.placeholder}
                value={formData.idea_title}
                onChange={(e) => setFormData({ ...formData, idea_title: e.target.value })}
              />
              <div className={`char-count ${formData.idea_title.length > registration.ideaLimits.titleMax * 0.9 ? 'near-limit' : ''}`}>
                {formData.idea_title.length} / {registration.ideaLimits.titleMax}
              </div>
              {errors.idea_title && <div className="field-error">{errors.idea_title}</div>}
            </div>

            <div className={`form-group ${errors.problem ? 'has-error' : ''}`}>
              <label>{form.idea.problem.label} *</label>
              <textarea
                name="problem"
                placeholder={form.idea.problem.placeholder}
                value={formData.problem}
                onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
              ></textarea>
              <div className={`char-count ${formData.problem.length > registration.ideaLimits.problemMax * 0.9 ? 'near-limit' : ''}`}>
                {formData.problem.length} / {registration.ideaLimits.problemMax}
              </div>
              {errors.problem && <div className="field-error">{errors.problem}</div>}
            </div>

            <div className={`form-group ${errors.solution ? 'has-error' : ''}`}>
              <label>{form.idea.solution.label} *</label>
              <textarea
                name="solution"
                placeholder={form.idea.solution.placeholder}
                value={formData.solution}
                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
              ></textarea>
              <div className={`char-count ${formData.solution.length > registration.ideaLimits.solutionMax * 0.9 ? 'near-limit' : ''}`}>
                {formData.solution.length} / {registration.ideaLimits.solutionMax}
              </div>
              {errors.solution && <div className="field-error">{errors.solution}</div>}
            </div>

            <div className={`form-group ${errors.uniqueness ? 'has-error' : ''}`}>
              <label>{form.idea.uniqueness.label} *</label>
              <textarea
                name="uniqueness"
                placeholder={form.idea.uniqueness.placeholder}
                value={formData.uniqueness}
                onChange={(e) => setFormData({ ...formData, uniqueness: e.target.value })}
              ></textarea>
              <div className={`char-count ${formData.uniqueness.length > registration.ideaLimits.uniquenessMax * 0.9 ? 'near-limit' : ''}`}>
                {formData.uniqueness.length} / {registration.ideaLimits.uniquenessMax}
              </div>
              {errors.uniqueness && <div className="field-error">{errors.uniqueness}</div>}
            </div>

            <div className={`form-group ${errors.impact ? 'has-error' : ''}`}>
              <label>{form.idea.impact.label} *</label>
              <textarea
                name="impact"
                placeholder={form.idea.impact.placeholder}
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
              ></textarea>
              <div className={`char-count ${formData.impact.length > registration.ideaLimits.impactMax * 0.9 ? 'near-limit' : ''}`}>
                {formData.impact.length} / {registration.ideaLimits.impactMax}
              </div>
              {errors.impact && <div className="field-error">{errors.impact}</div>}
            </div>

            {/* Honeypot hidden field */}
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        )}

        {/* STEP 4: Review & Submit */}
        {currentStep === 3 && (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '20px' }}>
              4. Review Your Submission
            </h3>

            <div className="card" style={{ padding: '20px', marginBottom: '16px', background: 'rgba(255,255,255,.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong>Team Details</strong>
                <button type="button" onClick={() => setCurrentStep(0)} className="pill" style={{ padding: '4px 12px', fontSize: '11px' }}>
                  Edit
                </button>
              </div>
              <p style={{ fontSize: '14px' }}>
                <strong>Name:</strong> {formData.team_name}
              </p>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>
                <strong>Domain:</strong> {selectedTrack?.name}
              </p>
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: '16px', background: 'rgba(255,255,255,.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong>Team Members</strong>
                <button type="button" onClick={() => setCurrentStep(1)} className="pill" style={{ padding: '4px 12px', fontSize: '11px' }}>
                  Edit
                </button>
              </div>
              {formData.members.map((m, idx) => (
                <div key={idx} style={{ padding: '8px 0', borderBottom: idx < 2 ? '1px solid var(--line)' : 'none', fontSize: '13px' }}>
                  <strong>{form.memberTitles[idx]}:</strong> {m.name || 'Not provided'} ({m.usn}) · {m.email} · {m.phone}
                  <div style={{ color: '#8a7a6e', marginTop: '2px' }}>
                    Role: {roles.find((r) => r.key === m.role_key)?.label} · {m.programme} {m.year ? `(${m.year})` : ''} {m.department ? `· ${m.department}` : ''}
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: '16px', background: 'rgba(255,255,255,.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong>Campus Idea</strong>
                <button type="button" onClick={() => setCurrentStep(2)} className="pill" style={{ padding: '4px 12px', fontSize: '11px' }}>
                  Edit
                </button>
              </div>
              <p style={{ fontSize: '14px' }}>
                <strong>Title:</strong> {formData.idea_title}
              </p>
              <p style={{ fontSize: '13px', color: '#5b4a3f', marginTop: '6px' }}>
                <strong>Problem:</strong> {formData.problem.slice(0, 180)}...
              </p>
              <p style={{ fontSize: '13px', color: '#5b4a3f', marginTop: '6px' }}>
                <strong>Solution:</strong> {formData.solution.slice(0, 180)}...
              </p>
            </div>

            {/* Consent checkbox */}
            <div className={`consent-row ${errors.consent ? 'has-error' : ''}`} style={{ padding: '14px', borderRadius: '14px', background: errors.consent ? 'rgba(200, 85, 61, 0.08)' : 'rgba(255, 255, 255, 0.4)', transition: 'background .2s ease' }}>
              <input
                id="consent"
                name="consent"
                type="checkbox"
                className="consent-checkbox"
                checked={formData.consent}
                onChange={(e) => {
                  setFormData({ ...formData, consent: e.target.checked });
                  if (errors.consent) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.consent;
                      return next;
                    });
                  }
                }}
              />
              <label htmlFor="consent" style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: '1.5', cursor: 'pointer', userSelect: 'none' }}>
                {registration.consentText}
              </label>
            </div>
            {errors.consent && (
              <div className="field-error" style={{ marginTop: '8px', marginBottom: '16px', fontWeight: 500, fontSize: '13px' }}>
                ⚠️ {errors.consent}
              </div>
            )}
            {errors.general && (
              <div className="card" style={{ padding: '14px 18px', marginTop: '16px', marginBottom: '16px', background: '#fdedec', borderColor: '#c8553d', color: '#b0412c', fontSize: '13px', fontWeight: 500 }}>
                ⚠️ {errors.general}
              </div>
            )}
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
          {currentStep > 0 ? (
            <button
              type="button"
              className="pill"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              ← Back
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < form.steps.length - 1 ? (
            <button
              type="button"
              className="btn-dark"
              onClick={handleNext}
            >
              Next Step →
            </button>
          ) : (
            <button
              type="submit"
              className="btn-dark"
              disabled={isSubmitting}
              onClick={handleSubmit}
              style={{
                minWidth: '180px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,.3)',
                      borderTopColor: '#fff',
                      animation: 'spin .8s linear infinite',
                    }}
                  ></span>
                  Submitting...
                </span>
              ) : (
                'Submit Registration'
              )}
            </button>
          )}
        </div>
      </form>

      {/* Unrecognized USN Alert Modal */}
      {usnAlertModal?.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="usn-modal-title"
          aria-describedby="usn-modal-desc"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(42, 26, 18, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 99999,
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeUsnAlertModal();
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#fbf8f3',
              border: '1.5px solid rgba(200, 85, 61, 0.3)',
              borderRadius: '24px',
              boxShadow: '0 24px 64px rgba(42, 26, 18, 0.35)',
              padding: '30px 26px',
              position: 'relative',
              outline: 'none',
              animation: 'slideUp 0.25s ease',
            }}
          >
            {/* Close button (X) */}
            <button
              type="button"
              onClick={closeUsnAlertModal}
              aria-label="Close dialog"
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid rgba(59, 33, 22, 0.15)',
                background: '#fff',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                color: '#6a594d',
                fontSize: '18px',
                lineHeight: 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0eae1';
                e.currentTarget.style.color = 'var(--ink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.color = '#6a594d';
              }}
            >
              ×
            </button>

            {/* Icon & Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(200, 85, 61, 0.12)',
                  border: '1px solid rgba(200, 85, 61, 0.25)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                }}
              >
                🎓
              </div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    color: '#b0412c',
                    background: 'rgba(200, 85, 61, 0.1)',
                    padding: '3px 10px',
                    borderRadius: '999px',
                  }}
                >
                  Eligibility Restriction
                </span>
                <div style={{ fontSize: '11.5px', color: '#8a7a6e', marginTop: '2px' }}>
                  Maharaja Institute of Technology Mysore
                </div>
              </div>
            </div>

            {/* Title */}
            <h3
              id="usn-modal-title"
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: '12px',
                lineHeight: '1.3',
              }}
            >
              Restricted to MIT Mysore Students Only
            </h3>

            {/* Polite message body */}
            <div
              id="usn-modal-desc"
              style={{
                fontSize: '13.5px',
                color: '#5b4a3f',
                lineHeight: '1.6',
                marginBottom: '20px',
              }}
            >
              <p style={{ marginBottom: '12px' }}>
                You entered{' '}
                <code
                  style={{
                    background: 'rgba(200, 85, 61, 0.12)',
                    color: '#b0412c',
                    padding: '2px 7px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  {usnAlertModal.enteredUsn}
                </code>{' '}
                for <strong>{usnAlertModal.memberName}</strong>.
              </p>
              <p style={{ marginBottom: '12px' }}>
                Please note that <strong>THINK MIT</strong> is an internal campus innovation challenge open{' '}
                <strong style={{ color: '#b0412c' }}>
                  strictly only for students of Maharaja Institute of Technology Mysore (MITM)
                </strong>
                .
              </p>
              <p style={{ marginBottom: '12px' }}>
                MIT Mysore USNs begin with <strong>4MH</strong>
                {' '}or <strong>MIT</strong>.
              </p>
              <p style={{ fontSize: '12.5px', color: '#8a7a6e', fontStyle: 'italic', margin: 0 }}>
                If you are an MIT Mysore student, please re-enter your official 4MH USN or temporary MIT USN. If you are from another college, we appreciate your interest, but registrations are reserved for MIT Mysore students only.
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(59, 33, 22, 0.1)', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn-dark"
                onClick={closeUsnAlertModal}
                style={{
                  padding: '10px 22px',
                  fontSize: '13.5px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Understood, I&apos;ll enter my MIT Mysore USN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

