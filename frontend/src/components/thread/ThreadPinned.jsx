import React from 'react';
import { PinIcon } from '../../icons/Icons';

export default function ThreadPinned({ comments }) {
  if (!comments || comments.length === 0) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      {comments.map((comment) => (
        <div key={comment.nodeId} className="glass" style={{
          border: '1px solid var(--amber-border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '0.85em', color: 'var(--amber)', marginBottom: '8px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <PinIcon size={13} /> Moderator Note
          </div>
          <div style={{ fontSize: '0.95em', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            {comment.content}
          </div>
          <div style={{ fontSize: '0.8em', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            — {comment.moderatorUsername}
          </div>
        </div>
      ))}
    </div>
  );
}
