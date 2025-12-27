import React, { useState, useEffect } from 'react';
import { fetchUserProfile } from '../api/api';
import StoryCard from './StoryCard';

export default function MyStories({ user, onBack, onReadStory, onProfile }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.username) {
      loadMyStories();
    }
  }, [user]);

  const loadMyStories = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await fetchUserProfile(user.username);
      if (result && result.stories) {
        setStories(result.stories);
      } else {
        setError('Could not load your stories.');
      }
    } catch (err) {
      setError('An error occurred while fetching your stories.');
      console.error('Failed to load stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = (storyId, { likes, isLikedByUser }) => {
    setStories(prevStories =>
      prevStories.map(story => {
        if (story._id === storyId) {
          return { ...story, likes, isLikedByUser };
        }
        return story;
      })
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fefefd', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button 
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '0.9em',
            cursor: 'pointer',
            marginBottom: '30px'
          }}>
          ← Back to Profile
        </button>

        <h1 style={{ fontSize: '2em', marginBottom: '30px', color: '#333' }}>My Stories</h1>

        {loading ? (
          <div style={{ opacity: 0.6 }}>Loading stories...</div>
        ) : error ? (
          <div style={{ color: '#d44' }}>{error}</div>
        ) : stories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.5, fontSize: '1.1em' }}>
            You haven't written any stories yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {stories.map((story) => (
              <StoryCard
                key={story._id}
                story={story}
                onRead={() => onReadStory(story)}
                onLike={handleLike}
                disableLike={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
