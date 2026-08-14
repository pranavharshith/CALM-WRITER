import React, { useState } from 'react';

const TAG_RE = /^[a-z0-9-]{2,24}$/;

function normalize(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
}

export default function TagInput({ tags = [], onChange, max = 5 }) {
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState('');

  const add = (raw) => {
    const tag = normalize(raw);
    if (!tag) return;
    if (!TAG_RE.test(tag)) {
      setHint('Letters, numbers, hyphens · 2–24 characters.');
      return;
    }
    if (tags.includes(tag)) {
      setDraft('');
      setHint('');
      return;
    }
    if (tags.length >= max) {
      setHint(`At most ${max} tags.`);
      return;
    }
    onChange([...tags, tag]);
    setDraft('');
    setHint('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="tag-input">
      <span className="tag-input__label">Tags · optional, up to {max}</span>
      <div className="tag-input__row">
        {tags.map((tag) => (
          <span key={tag} className="tag-chip tag-chip--on">
            #{tag}
            <button
              type="button"
              className="tag-chip__x"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(tags.filter((t) => t !== tag))}
            >
              ×
            </button>
          </span>
        ))}
        {tags.length < max && (
          <input
            type="text"
            className="form-input tag-input__field"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => { if (draft.trim()) add(draft); }}
            placeholder="evening · rainy-day"
            maxLength={24}
            autoComplete="off"
            enterKeyHint="done"
          />
        )}
      </div>
      <p className="tag-input__hint">
        {hint || 'Press enter to add. These help others find the story.'}
      </p>
    </div>
  );
}
