import React from 'react';
import ModerationSkeleton from './ModerationSkeleton';

export default function ModChatPanel({
  user,
  chatMessages,
  chatLoading,
  chatMessage,
  setChatMessage,
  submitting,
  onSend
}) {
  return (
    <div style={{
      background: 'var(--glass-bg-strong)',
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ fontSize: '1.1em', marginBottom: '16px', color: 'var(--text-primary)' }}>
        Moderator Chat
      </div>

      {chatLoading ? (
        <ModerationSkeleton count={3} />
      ) : chatMessages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
          No messages yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
          {chatMessages.map(message => (
            <div key={message._id} style={{
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              alignSelf: message.senderInternalId === (user && user.internalId) ? 'flex-end' : 'flex-start',
              maxWidth: '80%'
            }}>
              <div style={{ fontSize: '0.85em', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                @{message.senderName || message.senderUsername || 'moderator'}
              </div>
              <div style={{ fontSize: '0.95em', lineHeight: '1.6', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {message.message || message.content}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <input
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '0.95em',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)'
          }}
        />
        <button
          onClick={onSend}
          disabled={!chatMessage.trim() || submitting}
          className={`btn btn--positive${submitting ? ' btn--loading' : ''}`}
          style={{ fontSize: '0.9em' }}
        >
          {submitting && <span className="spinner-ring" aria-hidden="true" />}
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
