import React from 'react';

export default function FeaturedBanner({ story, onRead }) {
  return (
    <div
      onClick={onRead}
      style={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '20px',
        cursor: 'pointer',
        border: '2px solid #dee2e6',
        position: 'relative',
        overflow: 'hidden'
      }}>
      
      {/* Featured Badge */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: '#28a745',
        color: '#fff',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.8em',
        fontWeight: '500'
      }}>
        ⭐ Featured Story
      </div>

      {/* Content */}
      <div style={{
        marginRight: '120px' // Space for the badge
      }}>
        <div style={{
          fontSize: '0.9em',
          color: '#666',
          marginBottom: '8px'
        }}>
          Story of the Week by @{story.authorUsername}
        </div>

        {story.title && (
          <div style={{
            fontSize: '1.4em',
            fontWeight: '500',
            marginBottom: '12px',
            color: '#333',
            lineHeight: '1.3'
          }}>
            {story.title}
          </div>
        )}

        <div style={{
          fontSize: '1.1em',
          lineHeight: '1.6',
          color: '#555',
          marginBottom: '16px',
          whiteSpace: 'pre-wrap'
        }}>
          {story.text.substring(0, 300)}{story.text.length > 300 ? '...' : ''}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '0.9em',
          color: '#666'
        }}>
          <span>👍 {story.likes} likes</span>
          <span>→ Read full story</span>
        </div>
      </div>
    </div>
  );
}