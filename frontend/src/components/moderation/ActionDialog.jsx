import React from 'react';

export default function ActionDialog({
  actionType,
  actionReason,
  setActionReason,
  pinCommentText,
  setPinCommentText,
  submitting,
  onSubmit,
  onCancel
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
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2em' }}>
          {actionType === 'remove_story' && 'Remove Story'}
          {actionType === 'remove_node' && 'Remove Content'}
          {actionType === 'lock_thread' && 'Lock Thread'}
          {actionType === 'pin_comment' && 'Pin Moderator Comment'}
          {actionType === 'dismiss' && 'Dismiss Report'}
        </h3>

        {actionType !== 'dismiss' && actionType !== 'pin_comment' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
              Reason (will be logged)
            </label>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Explain why this action is being taken..."
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
        )}

        {actionType === 'pin_comment' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
              Comment (will be pinned for 7 days)
            </label>
            <textarea
              value={pinCommentText}
              onChange={(e) => setPinCommentText(e.target.value)}
              placeholder="Write a public moderator comment..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '10px',
                fontSize: '0.9em',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-sans)',
                resize: 'vertical'
              }}
            />
          </div>
        )}

        {actionType === 'dismiss' && (
          <p style={{ fontSize: '0.95em', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            This report will be marked as dismissed. No action will be taken on the content.
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onSubmit}
            disabled={submitting}
            style={{
              background: actionType === 'dismiss' ? 'var(--text-secondary)' : 'var(--rose)',
              color: actionType === 'dismiss' ? 'var(--bg-page)' : 'var(--rose-contrast)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 20px',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}>
            {submitting ? 'Processing...' : 'Confirm'}
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
