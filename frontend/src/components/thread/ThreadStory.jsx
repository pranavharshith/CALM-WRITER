import React from 'react';
import { ZapIcon, LockIcon } from '../../icons/Icons';

export default function ThreadStory({ story, threadLocked, onReport }) {
  if (!story) return null;

  return (
    <>
      <div style={{
        background: 'var(--glass-bg-strong)',
        borderRadius: 'var(--radius-md)',
        padding: '32px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '24px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
            @{story.authorUsername}
            {story.authorRole === 'moderator' && (
              <span style={{ marginLeft: '8px', fontSize: '0.8em', color: 'var(--accent)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ZapIcon size={12} /> Moderator
              </span>
            )}
          </span>
        </div>

        {story.title && (
          <h2 style={{
            fontSize: '1.4em',
            fontWeight: '500',
            marginBottom: '16px',
            color: 'var(--text-primary)',
            lineHeight: '1.4'
          }}>
            {story.title}
          </h2>
        )}

        <div style={{
          fontSize: '1.1em',
          lineHeight: '1.72',
          whiteSpace: 'pre-wrap',
          color: 'var(--text-primary)',
          marginBottom: '16px'
        }}>
          {story.text}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={() => onReport('story', story._id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              fontSize: '0.85em',
              cursor: 'pointer',
              padding: '4px 8px'
            }}>
            Report
          </button>
        </div>
      </div>

      {threadLocked && (
        <div style={{
          background: 'var(--amber-light)',
          border: '1px solid var(--amber-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '0.9em',
          color: 'var(--amber)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <LockIcon size={15} /> This thread has been locked by moderators
        </div>
      )}
    </>
  );
}
