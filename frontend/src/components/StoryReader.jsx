import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import ProgressBar from './ProgressBar';
import ShareButton from './ShareButton';
import { trackReadSession, likeStory } from '../api/api';

export default function StoryReader({ story, onBack, onLike }) {
  const [percentRead, setPercentRead] = useState(0);
  const [canReact, setCanReact] = useState(false);
  const [liking, setLiking] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !story) return;
    const el = ref.current;

    function onScroll() {
      const total = el.scrollHeight - el.clientHeight;
      const at = el.scrollTop;
      const percent = Math.min(100, Math.round(100 * (at + el.clientHeight) / el.scrollHeight));
      setPercentRead(percent);
      setCanReact(percent >= 90);

      // Track reading progress
      if (percent > 0) {
        trackReadSession(story._id, percent).catch(console.error);
      }
    }

    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [story]);

  const handleLike = async () => {
    if (liking) return;

    setLiking(true);
    try {
      const result = await likeStory(story._id);
      if (result.success && onLike) {
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

  if (!story) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>No story available</p>
        <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Back
        </button>
      </div>
    );
  }

  const storyPreview = story.text.substring(0, 200).replace(/\n/g, ' ');
  const shareUrl = `${window.location.origin}/story/${story._id}`;

  return (
    <div style={{ minHeight: '100vh', background: '#fefefd', padding: '20px' }}>
      <Helmet>
        <title>{story.title || 'Story'} - Calm Stories</title>
        <meta name="description" content={storyPreview + '...'} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:title" content={`${story.title || 'Story'} by ${story.authorUsername || 'Anonymous'}`} />
        <meta property="og:description" content={storyPreview + '...'} />
        <meta property="og:site_name" content="Calm Stories" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={shareUrl} />
        <meta name="twitter:title" content={`${story.title || 'Story'} by ${story.authorUsername || 'Anonymous'}`} />
        <meta name="twitter:description" content={storyPreview + '...'} />

        {/* WhatsApp / General */}
        <meta property="og:image:alt" content={`Read "${story.title || 'Story'}" on Calm Stories`} />
      </Helmet>

      <div style={{ maxWidth: '660px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              fontSize: '0.9em',
              cursor: 'pointer'
            }}>
            ← Back
          </button>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

            <ShareButton story={story} />
          </div>
        </div>

        <div
          ref={ref}
          style={{
            height: '70vh',
            overflowY: 'auto',
            background: '#fff',
            padding: 32,
            borderRadius: 8,
            boxShadow: '0 1px 8px #efefee'
          }}>
          <ProgressBar percent={percentRead} />
          <div style={{
            fontSize: '1.17em',
            lineHeight: '1.72',
            whiteSpace: 'pre-wrap',
            marginBottom: 28,
            color: '#333'
          }}>
            {story.text}
          </div>
        </div>
      </div>
    </div>
  );
}
