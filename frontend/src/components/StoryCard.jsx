import React, { useState, useEffect } from 'react';
import { likeStory, bookmarkStory, unbookmarkStory, checkBookmark } from '../api/api';

export default function StoryCard({ story, onRead, onLike, onAuthorClick, onBookmarkRemoved, disableLike = false }) {

  const [liking, setLiking] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    // Check if story is bookmarked on mount
    if (story._id) {
      checkBookmark(story._id).then(result => {
        setIsBookmarked(result.bookmarked);
      }).catch(() => {
        // Silently fail if check fails
      });
    }
  }, [story._id]);

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
    if (onAuthorClick) {
      onAuthorClick();
    }
  };

  const handleBookmark = async (e) => {
    e.stopPropagation();
    if (bookmarking) return;

    setBookmarking(true);
    try {
      if (isBookmarked) {
        const result = await unbookmarkStory(story._id);
        if (result.success) {
          setIsBookmarked(false);
          // Notify parent if bookmark was removed
          if (onBookmarkRemoved) {
            onBookmarkRemoved(story._id);
          }
        }
      } else {
        const result = await bookmarkStory(story._id);
        if (result.success) {
          setIsBookmarked(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    } finally {
      setBookmarking(false);
    }
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
        border: '1px solid #ddd'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px #e0e0e0';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 4px #efefee';
      }}
    >
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
              color: onAuthorClick ? '#666' : '#999',
              fontSize: '0.9em',
              cursor: onAuthorClick ? 'pointer' : 'default',
              padding: '0',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              if (onAuthorClick) {
                e.target.style.textDecoration = 'underline';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.textDecoration = 'none';
            }}
          >
            @{story.authorUsername}
          </button>
          <span style={{
            color: '#666',
            fontSize: '0.8em'
          }}>
            {timeAgo(story.createdAt)}
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            onClick={handleBookmark}
            disabled={bookmarking}
            style={{
              background: 'none',
              border: 'none',
              cursor: bookmarking ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px 8px',
              borderRadius: '20px',
              color: isBookmarked ? '#f39c12' : '#666',
              fontSize: '0.9em',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!bookmarking) {
                e.currentTarget.style.background = '#f8f8f8';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark story'}
          >
            <div style={{
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isBookmarked ? (
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: '2px solid #f39c12',
                  borderLeft: '2px solid #f39c12',
                  transform: 'rotate(-45deg)',
                  marginTop: '-2px'
                }} />
              ) : (
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: '2px solid #aaa',
                  borderLeft: '2px solid #aaa',
                  transform: 'rotate(-45deg)',
                  marginTop: '-2px',
                  opacity: 0.6
                }} />
              )}
            </div>
          </button>

          <button
            onClick={handleLike}
            disabled={liking || disableLike}
            style={{
              background: 'none',
              border: 'none',
              cursor: liking || disableLike ? 'not-allowed' : 'pointer',
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
              if (!liking && !disableLike) {
                e.currentTarget.style.background = '#f8f8f8';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <div style={{
              position: 'relative',
              width: '14px',
              height: '14px',
              transform: story.isLikedByUser ? 'rotate(-45deg) scale(1.1)' : 'rotate(-45deg)',
              transition: 'transform 0.2s ease'
            }}>
              <div style={{
                position: 'absolute',
                width: '14px',
                height: '14px',
                background: story.isLikedByUser ? '#e74c3c' : '#aaa',
                borderRadius: '3px'
              }} />
              <div style={{
                position: 'absolute',
                width: '14px',
                height: '14px',
                background: story.isLikedByUser ? '#e74c3c' : '#aaa',
                borderRadius: '50%',
                top: '-7px',
                left: '0'
              }} />
              <div style={{
                position: 'absolute',
                width: '14px',
                height: '14px',
                background: story.isLikedByUser ? '#e74c3c' : '#aaa',
                borderRadius: '50%',
                left: '7px',
                top: '0'
              }} />
            </div>
            <span>{story.likes || 0}</span>
          </button>
        </div>
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
        color: '#333',
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