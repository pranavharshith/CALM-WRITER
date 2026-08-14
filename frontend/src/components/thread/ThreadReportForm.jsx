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
    <div className="overlay-shell" style={{ zIndex: 1000 }}>
      <div className="overlay-shell__card glass glass--strong" style={{ padding: '32px', maxWidth: '500px' }}>
        <div className="overlay-shell__body">
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
            className={`btn btn--danger${submitting ? ' btn--loading' : ''}`}
          >
            {submitting && <span className="spinner-ring" aria-hidden="true" />}
            {submitting ? 'Submitting…' : 'Submit Report'}
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
    </div>
  );
}
