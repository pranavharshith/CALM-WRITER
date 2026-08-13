import React, { useState } from 'react';
import { reportContent } from '../api/api';
import { CheckIcon } from '../icons/Icons';

const REASONS = [
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'plagiarism', label: 'Plagiarism' },
  { value: 'other', label: 'Other' }
];

export default function ReportModal({ storyId, storyTitle, onClose }) {
  const [reason, setReason] = useState('inappropriate_content');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = await reportContent(storyId, null, reason, details);
      if (result.success) {
        setDone(true);
        setTimeout(onClose, 1400);
      } else {
        setError(result.error || 'Failed to submit report');
      }
    } catch (err) {
      setError('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--overlay-scrim)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
      padding: '20px', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)'
    }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass glass--strong"
        style={{
          borderRadius: 'var(--radius-lg)', padding: '28px', maxWidth: '460px', width: '100%'
        }}
      >
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: 'var(--sage-dark)', display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <CheckIcon size={34} />
            </div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: 4 }}>Reported</div>
            <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
              Thanks — the team will review this story.
            </div>
          </div>
        ) : (
          <>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.15em', color: 'var(--text-primary)' }}>
              Report to moderators
            </h3>
            <div style={{ fontSize: '0.88em', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              {storyTitle ? `"${storyTitle}"` : 'This story'}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="form-select"
                style={{
                  border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)',
                  background: 'var(--glass-bg)', color: 'var(--text-primary)'
                }}
              >
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                Details <span style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Anything else we should know?"
                className="form-textarea"
                style={{
                  border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)',
                  background: 'var(--glass-bg)', color: 'var(--text-primary)', resize: 'vertical'
                }}
              />
            </div>

            {error && (
              <div style={{ color: 'var(--rose-dark)', fontSize: '0.88em', marginBottom: '12px' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} className="btn btn--ghost" style={{ fontSize: '0.88em' }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn--primary"
                style={{ fontSize: '0.88em' }}
              >
                {submitting ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}