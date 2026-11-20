'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { SiteContent } from '@/lib/content';
import { getRegistrationState } from '@/lib/registration-state';
import UploadModal from './UploadModal';

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
  reference_link: string;
  ppt_url?: string;
  ppt_object_key?: string;
  ppt_filename?: string;
  ppt_size_bytes?: number;
  ppt_uploaded_at?: string;
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
    reference_link: '',
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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      const usnRegex = new RegExp(val.usnRegex || '^[A-Za-z0-9]{10}$');
      const phoneRegex = new RegExp(val.phoneRegex || '^[6-9][0-9]{9}$');
      const usns = new Set<string>();
      const emails = new Set<string>();

      formData.members.forEach((m, idx) => {
        if (!m.name.trim()) {
          newErrors[`members.${idx}.name`] = 'Full name is required';
        }
        if (!m.usn.trim()) {
          newErrors[`members.${idx}.usn`] = 'USN is required';
        } else if (!usnRegex.test(m.usn.trim())) {
          newErrors[`members.${idx}.usn`] = 'Invalid USN (must be 10 alphanumeric characters)';
        } else if (usns.has(m.usn.trim().toUpperCase())) {
          newErrors[`members.${idx}.usn`] = 'Duplicate USN inside the team';
        }
        usns.add(m.usn.trim().toUpperCase());

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
      if (formData.reference_link && !/^https?:\/\/.+/i.test(formData.reference_link.trim())) {
        newErrors['reference_link'] = 'Link must start with http:// or https://';
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
          } else if (errorKeys.some((k) => k.startsWith('idea_') || k.startsWith('problem') || k.startsWith('solution') || k.startsWith('uniqueness') || k.startsWith('impact') || k.startsWith('reference_link'))) {
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
            <p style={{ fontSize: '13px', color: '#6a594d', marginBottom: '20px' }}>
              Member 1 is designated as the Team Leader. Each member must present one distinct category: Business, Innovation, or Technical. All UG (1st, 2nd, 3rd, 4th Year), MBA, MCA, and M.Tech students are eligible, and interdisciplinary teams across departments are allowed and encouraged.
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
                    <label>{form.member.usn.label} *</label>
                    <input
                      name={`members.${idx}.usn`}
                      type="text"
                      placeholder={form.member.usn.placeholder}
                      value={member.usn}
                      onChange={(e) => {
                        const members = [...formData.members] as [MemberData, MemberData, MemberData];
                        members[idx].usn = e.target.value.toUpperCase();
                        setFormData({ ...formData, members });
                      }}
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

        {/* STEP 3: Your Idea + PPT Submission */}
        {currentStep === 2 && (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '20px' }}>
              3. Your Campus Idea & PPT Pitch Deck
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

            {/* PPT / Pitch Deck Submission Field */}
            <div className={`form-group ${errors.reference_link ? 'has-error' : ''}`} style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <span>Pitch Deck / PPT Presentation Link</span>
                  <span style={{ fontSize: '11px', color: '#8a7a6e', textTransform: 'none' }}>(Recommended)</span>
                </label>
                {!formData.ppt_object_key && (
                  <button
                    type="button"
                    className="pill"
                    onClick={() => setIsUploadModalOpen(true)}
                    style={{
                      padding: '5px 14px',
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(59, 33, 22, 0.08)',
                      cursor: 'pointer',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload PPT / PDF instead
                  </button>
                )}
              </div>

              {/* Uploaded File Chip (Filebase Private Bucket) */}
              {formData.ppt_object_key ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#e8f5e9',
                    border: '1px solid #a5d6a7',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#2e7d32',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1b5e20', wordBreak: 'break-all' }}>
                        Uploaded: {formData.ppt_filename || 'pitch-deck'} ✓
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#2e7d32', marginTop: '2px' }}>
                        {formatFileSize(formData.ppt_size_bytes)} · Stored securely in competition vault
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="pill"
                      onClick={() => setIsUploadModalOpen(true)}
                      style={{
                        padding: '4px 12px',
                        fontSize: '11.5px',
                        background: '#fff',
                        borderColor: '#a5d6a7',
                        color: '#1b5e20',
                        cursor: 'pointer',
                      }}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="pill"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          ppt_object_key: undefined,
                          ppt_filename: undefined,
                          ppt_size_bytes: undefined,
                          ppt_uploaded_at: undefined,
                          ppt_url: undefined,
                        }))
                      }
                      style={{
                        padding: '4px 12px',
                        fontSize: '11.5px',
                        background: '#fff',
                        borderColor: '#e57373',
                        color: '#c62828',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : null}

              <input
                name="reference_link"
                type="url"
                placeholder="https://drive.google.com/... or https://canva.com/..."
                value={formData.reference_link}
                onChange={(e) => setFormData({ ...formData, reference_link: e.target.value })}
              />
              <p style={{ fontSize: '12px', color: '#6a594d', marginTop: '6px' }}>
                Upload your pitch deck file directly (.ppt, .pptx, .pdf up to 25 MB) OR paste a shareable presentation link (Google Drive, OneDrive, Canva, etc. set to <em>&quot;Anyone with the link can view&quot;</em>).
              </p>
              {errors.reference_link && <div className="field-error">{errors.reference_link}</div>}
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
                <strong>Campus Idea & Presentation</strong>
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
              {formData.ppt_filename && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1b5e20' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>
                    <strong>Pitch Deck File:</strong> {formData.ppt_filename} ({formatFileSize(formData.ppt_size_bytes)}) ✓ Uploaded
                  </span>
                </div>
              )}
              {formData.reference_link && (
                <p style={{ fontSize: '13px', marginTop: '8px' }}>
                  <strong>Presentation Link:</strong>{' '}
                  <a href={formData.reference_link} target="_blank" rel="noopener noreferrer" style={{ color: '#d4612f' }}>
                    {formData.reference_link}
                  </a>
                </p>
              )}
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

      {/* Direct Filebase PPT/PDF Upload Dialog */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        identifier={idempotencyKey || formData.team_name}
        onUploadSuccess={({ objectKey, filename, size }) => {
          setFormData((prev) => ({
            ...prev,
            ppt_object_key: objectKey,
            ppt_filename: filename,
            ppt_size_bytes: size,
            ppt_uploaded_at: new Date().toISOString(),
          }));
        }}
      />
    </div>
  );
}

