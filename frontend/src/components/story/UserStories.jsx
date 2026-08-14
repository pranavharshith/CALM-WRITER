import React, { useState, useEffect } from 'react';
import { fetchUserProfile } from '../../api/api';
import StoryCard from './StoryCard';
import { SkeletonStoryList } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';

export default function UserStories({ username, onBack, onReadStory, onProfile, currentUser }) {
  const [stories, setStories] = useState([]);
  const [rawLoading, setRawLoading] = useState(true);
  const loading = useMinLoadTime(rawLoading);
  const [error, setError] = useState('');

  useEffect(() => {
    if (username) {
      loadUserStories();
    }
  }, [username]);

  const loadUserStories = async () => {
    try {
      setRawLoading(true);
      setError('');
      const result = await fetchUserProfile(username);
      if (result && result.stories) {
        setStories(result.stories);
      } else {
        setError('Could not load stories for this user.');
      }
    } catch (err) {
      setError('An error occurred while fetching stories.');
      console.error('Failed to load user stories:', err);
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
        <h1 className="page-title">Stories by @{username}</h1>
        <p className="page-sub">Everything they’ve published</p>

        {error ? (
          <div className="alert alert--error">{error}</div>
        ) : stories.length === 0 ? (
          <div className="feed__empty">This writer hasn’t published any stories yet.</div>
        ) : (
          <div className="list-page__stack">
            {stories.map((story) => (
              <StoryCard
                key={story._id}
                story={story}
                onRead={() => onReadStory(story)}
                onLike={handleLike}
                onAuthorClick={() => {
                  // Only allow navigation if not viewing own stories
                  if (currentUser && currentUser.username !== story.authorUsername) {
                    onProfile(story.authorUsername);
                  }
                }}
                disableLike={currentUser && currentUser.username === story.authorUsername}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
