import React, { useState } from 'react';

const REACTIONS = [
  { id: 'stayed_with_me', emoji: '🌿', label: 'This stayed with me' },
  { id: 'felt_seen', emoji: '✨', label: 'I felt seen' },
  { id: 'learned_something', emoji: '📖', label: 'I learned something' },
];

export default function Reactions({ onReactionSubmit }) {
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);

  async function handleReact(reactionType) {
    if (sending) return;
    setSending(true);
    setSelected(reactionType);
    
    // Show acknowledgment briefly, then proceed
    setTimeout(() => {
      onReactionSubmit(reactionType);
    }, 1200);
  }

  if (selected) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fefefd'
      }}>
        <div style={{
          textAlign: 'center',
          padding: 60,
          fontSize: '1.1em',
          opacity: 0.8
        }}>
          Thank you for your acknowledgment.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fefefd',
      padding: '20px'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: 40,
        maxWidth: 500,
        width: '100%'
      }}>
        <div style={{
          marginBottom: 18,
          fontSize: '1.07em',
          opacity: .62,
          textAlign: 'center'
        }}>
          How did this story resonate?
        </div>
        
        {REACTIONS.map(r => (
          <button 
            key={r.id}
            disabled={sending}
            style={{
              padding: '16px 0',
              fontSize: '1.05em',
              border: 'none',
              borderRadius: 7,
              background: '#f6f8f7',
              boxShadow: '0 0 2px #eee',
              cursor: sending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              justifyContent: 'center',
              opacity: sending ? 0.6 : 1
            }}
            onClick={() => handleReact(r.id)}>
            <span style={{ fontSize: '1.7em' }}>{r.emoji}</span> 
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

