import React from 'react';
import ModerationSkeleton from './ModerationSkeleton';

export default function ReportsPanel({ reports, reportsLoading, statusFilter, onAction }) {
  if (reportsLoading) {
    return <ModerationSkeleton count={4} />;
  }

  if (reports.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
        No {statusFilter} reports
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {reports.map(report => (
        <div key={report._id} style={{
          background: 'var(--glass-bg-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <span style={{
                background: 'var(--bg-subtle)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.8em',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                fontWeight: '500'
              }}>
                {report.reason.replace('_', ' ')}
              </span>
            </div>
            <div style={{ fontSize: '0.8em', color: 'var(--text-tertiary)' }}>
              {new Date(report.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Reported by: @{report.reporterUsername}
            </div>
            {report.details && (
              <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '8px' }}>
                "{report.details}"
              </div>
            )}
          </div>

          {report.content && (
            <div style={{
              background: 'var(--bg-subtle)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              borderLeft: '3px solid var(--border)'
            }}>
              {report.contentType === 'story' && report.content.title && (
                <div style={{ fontSize: '1em', fontWeight: '500', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {report.content.title}
                </div>
              )}
              <div style={{
                fontSize: '0.9em',
                lineHeight: '1.6',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap'
              }}>
                {report.content.preview}
              </div>
            </div>
          )}

          {report.status === 'pending' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => onAction(report, report.contentType === 'story' ? 'remove_story' : 'remove_node')}
                style={{
                  background: 'var(--rose)',
                  color: 'var(--rose-contrast)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 16px',
                  fontSize: '0.85em',
                  cursor: 'pointer'
                }}>
                Remove Content
              </button>

              {report.contentType === 'story' && (
                <>
                  <button
                    onClick={() => onAction(report, 'lock_thread')}
                    style={{
                      background: 'var(--amber)',
                      color: 'var(--amber-contrast)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 16px',
                      fontSize: '0.85em',
                      cursor: 'pointer'
                    }}>
                    Lock Thread
                  </button>

                  <button
                    onClick={() => onAction(report, 'pin_comment')}
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--accent-contrast)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 16px',
                      fontSize: '0.85em',
                      cursor: 'pointer'
                    }}>
                    Pin Comment
                  </button>
                </>
              )}

              <button
                onClick={() => onAction(report, 'dismiss')}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 16px',
                  fontSize: '0.85em',
                  cursor: 'pointer'
                }}>
                Dismiss
              </button>
            </div>
          )}

          {report.status !== 'pending' && (
            <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Status: {report.status}
              {report.reviewedBy && ` by moderator on ${new Date(report.reviewedAt).toLocaleDateString()}`}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
