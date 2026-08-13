import React, { useState, useEffect } from 'react';
import { fetchUserOnboarding } from '../api/api';
import { SkeletonWidgetLine } from './SkeletonLoader';
import { MailIcon, EditIcon, UsersIcon, SproutIcon, CheckIcon, ArrowLeftIcon } from '../icons/Icons';

const STEP_CONFIG = [
  { key: 'verifyEmail', label: 'Verify your email', icon: <MailIcon size={16} />, path: '/verify-email' },
  { key: 'writeFirstStory', label: 'Publish your first story', icon: <EditIcon size={16} />, path: '/write' },
  { key: 'followWriters', label: 'Follow a writer', icon: <UsersIcon size={16} />, path: '/community' },
  { key: 'joinHub', label: 'Join a hub', icon: <SproutIcon size={16} />, path: '/hubs' }
];

export default function OnboardingChecklist({ onNavigate }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserOnboarding()
      .then(res => {
        if (res.success) {
          const doneList = res.steps;
          setSteps(STEP_CONFIG.map(s => ({ ...s, done: !!doneList[s.key]?.done })));
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false));
  }, []);

  const doneCount = steps.filter(s => s.done).length;
  if (loading) return <div style={{ marginBottom: 16 }}><SkeletonWidgetLine /></div>;
  if (steps.length === 0) return null;
  if (doneCount === steps.length) return null; // fully onboarded — hide

  return (
    <div className="glass" style={{
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '0.95em', fontWeight: '600', color: 'var(--text-primary)' }}>
          Get started
        </div>
        <div style={{ fontSize: '0.82em', color: 'var(--text-secondary)' }}>
          {doneCount}/{steps.length} done
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'var(--bg-active)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{
          height: '100%',
          width: `${(doneCount / steps.length) * 100}%`,
          background: 'var(--accent)',
          borderRadius: '4px',
          transition: 'width 0.4s ease'
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {steps.map(step => (
          <button
            key={step.key}
            onClick={() => onNavigate(step.path)}
            disabled={step.done}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: step.done ? 'var(--glass-bg)' : 'var(--glass-bg-strong)',
              border: step.done ? '1px solid var(--glass-border)' : '1px dashed var(--glass-border-dark)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              cursor: step.done ? 'default' : 'pointer',
              textAlign: 'left',
              opacity: step.done ? 0.65 : 1,
              color: 'inherit',
              fontFamily: 'inherit'
            }}
          >
            <span style={{ fontSize: '1.2em', display: 'inline-flex', color: 'var(--accent)' }}>{step.icon}</span>
            <span style={{ flex: 1, fontSize: '0.92em', fontWeight: step.done ? 'normal' : '500' }}>
              {step.label}
            </span>
            <span style={{ fontSize: '0.9em', color: step.done ? 'var(--sage-dark)' : 'var(--text-tertiary)', display: 'inline-flex' }}>
              {step.done ? <CheckIcon size={14} /> : <ArrowLeftIcon size={14} style={{ transform: 'rotate(180deg)' }} />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}