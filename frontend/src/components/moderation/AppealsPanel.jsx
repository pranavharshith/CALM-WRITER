import React from 'react';
import ModerationSkeleton from './ModerationSkeleton';

export default function AppealsPanel({
  appeals,
  appealsLoading,
  statusFilter,
  submitting,
  user,
  onConfirm,
  onCancel
}) {
  if (appealsLoading) {
    return <ModerationSkeleton count={3} />;
  }

  if (appeals.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
        No {statusFilter} appeals
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {appeals.map(appeal => (
        <div key={appeal._id} style={{
          background: 'var(--glass-bg-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.95em', color: 'var(--text-primary)', fontWeight: '500' }}>
              @{appeal.userUsername || appeal.username}
            </div>
            <div style={{ fontSize: '0.8em', color: 'var(--text-tertiary)' }}>
              {new Date(appeal.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div style={{
            fontSize: '0.9em',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            marginBottom: '12px'
          }}>
            {appeal.timeoutReason || appeal.reason}
          </div>
          <div style={{ fontSize: '0.85em', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
            Status: {appeal.status}{appeal.timeoutDuration ? ` · Timeout: ${appeal.timeoutDuration}` : ''}
          </div>
          {appeal.status === 'pending' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onConfirm(appeal)}
                disabled={submitting}
                style={{
                  background: 'var(--rose)',
                  color: 'var(--rose-contrast)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 16px',
                  fontSize: '0.85em',
                  cursor: 'pointer'
                }}>
                Deny Appeal
              </button>
              {user && user.role === 'admin' && (
                <button
                  onClick={() => onCancel(appeal)}
                  disabled={submitting}
                  style={{
                    background: 'var(--sage-dark)',
                    color: 'var(--sage-contrast)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 16px',
                    fontSize: '0.85em',
                    cursor: 'pointer'
                  }}>
                  Cancel Timeout
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
