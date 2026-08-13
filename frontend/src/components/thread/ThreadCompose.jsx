import React from 'react';

const wordCount = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;

const formShell = {
  background: 'var(--glass-bg-strong)',
  borderRadius: 'var(--radius-md)',
  padding: '24px',
  boxShadow: 'var(--shadow-sm)',
  marginBottom: '24px'
};

const cancelBtn = {
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 20px',
  cursor: 'pointer'
};

const COPY = {
  continue: {
    trigger: 'Continue this story',
    title: 'Continue your story',
    titleSize: '1.1em',
    placeholder: 'Write the next chapter...',
    minHeight: '200px',
    fontSize: '1em',
    submit: 'Add Chapter'
  },
  respond: {
    trigger: 'Add a reflection',
    title: 'Share your reflection',
    titleSize: '1em',
    placeholder: 'What did this story mean to you?',
    minHeight: '150px',
    fontSize: '0.95em',
    submit: 'Add Reflection'
  }
};

export default function ThreadCompose({
  mode = 'continue',
  canCompose,
  showForm,
  content,
  onChange,
  onShow,
  onSubmit,
  onCancel,
  submitting
}) {
  const copy = COPY[mode] || COPY.continue;
  const overLimit = wordCount(content) > 800;

  return (
    <>
      {canCompose && !showForm && (
        mode === 'continue' ? (
          <button
            onClick={onShow}
            style={{
              background: 'var(--blue-icon)',
              color: 'var(--blue-contrast)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '12px 24px',
              fontSize: '0.95em',
              cursor: 'pointer',
              marginBottom: '24px'
            }}>
            {copy.trigger}
          </button>
        ) : (
          <button
            onClick={onShow}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 20px',
              fontSize: '0.9em',
              cursor: 'pointer',
              marginBottom: '24px'
            }}>
            {copy.trigger}
          </button>
        )
      )}

      {showForm && (
        <div style={formShell}>
          <div style={{ fontSize: copy.titleSize, marginBottom: '12px', color: 'var(--text-primary)' }}>
            {copy.title}
          </div>
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={copy.placeholder}
            style={{
              width: '100%',
              minHeight: copy.minHeight,
              padding: '16px',
              fontSize: copy.fontSize,
              lineHeight: '1.6',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-sans)',
              resize: 'vertical'
            }}
          />
          <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={onSubmit}
              disabled={submitting || overLimit}
              style={{
                background: overLimit ? 'var(--bg-active)' : 'var(--blue-icon)',
                color: overLimit ? 'var(--text-muted)' : 'var(--blue-contrast)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '10px 20px',
                cursor: overLimit ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}>
              {submitting && <span className="spinner-ring" aria-hidden="true" />}
              {submitting ? 'Adding…' : copy.submit}
            </button>
            <button onClick={onCancel} style={cancelBtn}>
              Cancel
            </button>
            <span style={{ fontSize: '0.85em', color: overLimit ? 'var(--rose)' : 'var(--text-tertiary)' }}>
              {wordCount(content)} / 800 words
            </span>
          </div>
        </div>
      )}
    </>
  );
}
