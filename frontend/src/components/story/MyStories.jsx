import React, { useState, useEffect } from 'react';
import { fetchUserProfile } from '../../api/api';
import StoryCard from './StoryCard';
import { SkeletonStoryList } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';

export default function MyStories({ user, onBack, onReadStory, onProfile }) {
  const [stories, setStories] = useState([]);
  const [rawLoading, setRawLoading] = useState(true);
  const loading = useMinLoadTime(rawLoading);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.username) {
      loadMyStories();
      return;
    }
    if (user === null) {
      setRawLoading(false);
      setError('Please sign in to view your stories.');
    }
  }, [user]);

  const loadMyStories = async () => {
    try {
      setRawLoading(true);
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
      setRawLoading(false);
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

  if (loading) {
    return <SkeletonStoryList count={3} />;
  }

  return (
    <div className="list-page">
      <div className="list-page__inner">
        <button onClick={onBack} className="btn-back mb-5">← Back to profile</button>
        <h1 className="page-title">My stories</h1>
        <p className="page-sub">Pieces you’ve published</p>

        {error ? (
          <div className="alert alert--error">{error}</div>
        ) : stories.length === 0 ? (
          <div className="feed__empty">You haven’t published any stories yet.</div>
        ) : (
          <div className="list-page__stack">
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
