import React, { useState, useEffect } from 'react';
import { fetchDailyPrompt } from '../../api/api';

export default function PromptBanner({ onWrite }) {
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchDailyPrompt()
      .then(res => {
        if (!cancelled && res.success && res.prompt?.prompt) setPrompt(res.prompt);
      })
      .catch(() => { /* keep banner hidden */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={{
        background: 'var(--bg-subtle)',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '18px 20px',
        marginBottom: '16px'
      }}>
        <div className="story-card__preview-skeleton-line" style={{ width: '35%', marginBottom: 10 }} />
        <div className="story-card__preview-skeleton-line" style={{ width: '80%' }} />
      </div>
    );
  }

  if (!prompt) return null;

  const handleWrite = () => {
    if (onWrite) onWrite(prompt);
  };

  return (
    <div className="prompt-banner" style={{
      background: 'linear-gradient(135deg, var(--sage-light) 0%, var(--glass-bg-strong) 100%)',
      border: '1px solid var(--sage)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      marginBottom: '16px',
      position: 'relative'
    }}>
      <div className="prompt-banner__label" style={{
        fontSize: '0.78em',
        fontWeight: '600',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--sage-dark)',
        marginBottom: '6px'
      }}>
        Today's Prompt
      </div>

      <div className="prompt-banner__prompt" style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '1.08em',
        lineHeight: '1.5',
        color: 'var(--text-primary)',
        marginBottom: '6px'
      }}>
        “{prompt.prompt}”
      </div>

      {prompt.description && (
        <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          {prompt.description}
        </div>
      )}

      <button
        onClick={handleWrite}
        className="btn btn--primary"
        style={{ fontSize: '0.88em', padding: '8px 16px' }}
      >
        Write from this prompt
      </button>
    </div>
  );
}