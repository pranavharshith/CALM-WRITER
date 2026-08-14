import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TagChips({ tags, className = '', stopCardClick = false }) {
  const navigate = useNavigate();
  const list = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (list.length === 0) return null;

  return (
    <ul className={`tag-chips ${className}`.trim()}>
      {list.map((tag) => (
        <li key={tag}>
          <button
            type="button"
            className="tag-chip"
            onClick={(e) => {
              if (stopCardClick) e.stopPropagation();
              navigate(`/tags/${encodeURIComponent(tag)}`);
            }}
          >
            #{tag}
          </button>
        </li>
      ))}
    </ul>
  );
}
