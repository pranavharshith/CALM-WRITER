import React, { useState } from 'react';
import { likeStory } from '../api/api';

export default function StoryCard({ story, onRead, onLike, onAuthorClick }) {
  const [liking, setLiking] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (liking) return;

    setLiking(true);
    try {
      const result = await likeStory(story._id);
      if (result.success) {
        onLike(story._id, {
          likes: result.likes,
          isLikedByUser: result.liked
        });
      }
    } catch (error) {
      console.error('Failed to like story:', error);
    } finally {
      setLiking(false);
    }
  };

  const handleAuthorClick = (e) => {
    e.stopPropagation();
    onAuthorClick();
  };

  const timeAgo = (date) => {
    const now = new Date();
    const posted = new Date(date);
    const diffMs = now - posted;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div
      onClick={onRead}
      style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 1px 4px #efefee',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease',
        border: '1px solid transparent'
      }}
      onMouseEnter={(e) => {
        e.target.style.boxShadow = '0 2px 8px #e0e0e0';
      }}
      onMouseLeave={(e) => {
        e.target.style.boxShadow = '0 1px 4px #efefee';
      }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <button
            onClick={handleAuthorClick}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '0.9em',
              cursor: 'pointer',
              padding: '0',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              e.target.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.target.style.textDecoration = 'none';
            }}>
            @{story.authorUsername}
          </button>
          
          <span style={{
            color: '#999',
            fontSize: '0.8em'
          }}>
            {timeAgo(story.createdAt)}
          </span>
        </div>

        <button
          onClick={handleLike}
          disabled={liking}
          style={{
            background: 'none',
            border: 'none',
            cursor: liking ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            color: story.isLikedByUser ? '#e74c3c' : '#666',
            fontSize: '0.9em',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!liking) {
              e.target.style.background = '#f8f8f8';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'none';
          }}>
          <span style={{ fontSize: '1.1em' }}>
            {story.isLikedByUser ? '👍' : '👍'}
          </span>
          <span>{story.likes || 0}</span>
        </button>
      </div>

      {/* Title */}
      {story.title && (
        <div style={{
          fontSize: '1.2em',
          fontWeight: '500',
          marginBottom: '12px',
          color: '#333',
          lineHeight: '1.4'
        }}>
          {story.title}
        </div>
      )}

      {/* Preview */}
      <div style={{
        fontSize: '1em',
        lineHeight: '1.6',
        color: '#555',
        whiteSpace: 'pre-wrap'
      }}>
        {story.preview}
      </div>

      {/* Read More */}
      <div style={{
        marginTop: '16px',
        fontSize: '0.9em',
        color: '#666',
        opacity: 0.8
      }}>
        Read full story →
      </div>
    </div>
  );
}