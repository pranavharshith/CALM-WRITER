import React, { useState, useEffect } from 'react';
import { fetchUserStories } from '../../api/api';
import { SkeletonStoryList } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';

export default function PrivateArchive({ onBack, user }) {
  const [stories, setStories] = useState([]);
  const [rawLoading, setRawLoading] = useState(true);
  const loading = useMinLoadTime(rawLoading);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      setRawLoading(true);
      const userStories = await fetchUserStories();
      setStories(Array.isArray(userStories) ? userStories : (userStories.stories || []));
    } catch (err) {
      setError('Failed to load your stories');
      console.error('Failed to fetch user stories:', err);
    } finally {
      setRawLoading(false);
    }
  };

  if (loading) {
    return <SkeletonStoryList count={3} />;
  }

  if (error) {
    return (
      <div className="page-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--rose-dark)', marginBottom: '20px' }}>{error}</div>
        <button onClick={onBack} style={{ padding: '10px 20px' }}>Back</button>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-shell__inner page-shell__inner--narrow">
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.9em',
            cursor: 'pointer',
            marginBottom: '30px'
          }}>
          ← Back
        </button>

        <div style={{
          fontSize: '1.4em',
          marginBottom: '30px',
          opacity: 0.8,
          textAlign: 'center'
        }}>
          Your Stories
        </div>

        {!stories.length ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            opacity: 0.5,
            fontSize: '1.1em'
          }}>
            Your writing archive is empty.
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 30
          }}>
            {stories.map(story => (
              <div
                key={story._id}
                style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 24,
                  boxShadow: 'var(--shadow-sm)'
                }}>
                <div style={{
                  fontSize: '0.9em',
                  color: 'var(--text-tertiary)',
                  marginBottom: 12
                }}>
                  Written {new Date(story.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  fontSize: '1.1em',
                  color: 'var(--text-primary)'
                }}>
                  {story.text || story.preview || 'No preview available.'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

