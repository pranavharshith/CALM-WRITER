import React from 'react';

export default function ThreadReportForm({
  reason,
  details,
  onReasonChange,
  onDetailsChange,
  onSubmit,
  onCancel,
  submitting
}) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--overlay-scrim)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--glass-bg-strong)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        padding: '32px',
        maxWidth: '500px',
        width: '90%'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2em' }}>Report Content</h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '0.95em',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)'
            }}>
            <option value="spam">Spam</option>
            <option value="hate">Hate Speech</option>
            <option value="harassment">Harassment</option>
            <option value="explicit_harm">Explicit Harm</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
            Additional Details (optional)
          </label>
          <textarea
            value={details}
            onChange={(e) => onDetailsChange(e.target.value)}
            placeholder="Provide more context..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '10px',
              fontSize: '0.9em',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-sans)',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onSubmit}
            disabled={submitting}
            style={{
              background: 'var(--rose)',
              color: 'var(--rose-contrast)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 20px',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 20px',
              cursor: 'pointer'
            }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
