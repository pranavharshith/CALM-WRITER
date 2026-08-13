import React from 'react';
import { ZapIcon } from '../../icons/Icons';

const reportBtnBase = {
  background: 'none',
  border: 'none',
  color: 'var(--text-tertiary)',
  cursor: 'pointer',
  padding: '4px 8px'
};

export default function ThreadCard({
  id,
  variant = 'continuation',
  chapter,
  content,
  authorUsername,
  authorRole,
  optimistic,
  onReport
}) {
  if (variant === 'response') {
    return (
      <div
        id={`thread-card-${id}`}
        className={optimistic ? 'thread-card--new' : undefined}
        style={{
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '12px',
          fontSize: '0.95em'
        }}>
        <div style={{ marginBottom: '8px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
          @{authorUsername}
          {authorRole === 'moderator' && (
            <span style={{ marginLeft: '6px', fontSize: '0.8em', color: 'var(--accent)', display: 'inline-flex', verticalAlign: 'middle' }}>
              <ZapIcon size={12} />
            </span>
          )}
        </div>
        <div style={{
          lineHeight: '1.6',
          color: 'var(--text-secondary)',
          whiteSpace: 'pre-wrap'
        }}>
          {content}
        </div>
        <div style={{ marginTop: '8px' }}>
          <button
            onClick={onReport}
            style={{ ...reportBtnBase, fontSize: '0.75em' }}>
            Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`thread-card-${id}`}
      className={`thread-card${optimistic ? ' thread-card--new' : ''}`}
      style={{
        borderLeft: '3px solid var(--border)'
      }}>
      <div style={{ marginBottom: '12px', fontSize: '0.85em', color: 'var(--text-tertiary)' }}>
        Chapter {chapter}
      </div>
      <div style={{
        fontSize: '1.05em',
        lineHeight: '1.72',
        whiteSpace: 'pre-wrap',
        color: 'var(--text-primary)'
      }}>
        {content}
      </div>
      <div style={{ marginTop: '12px' }}>
        <button
          onClick={onReport}
          style={{ ...reportBtnBase, fontSize: '0.8em' }}>
          Report
        </button>
      </div>
    </div>
  );
}
