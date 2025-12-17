import React, { useState, useEffect } from 'react';
import { fetchCommunityFeed, fetchFeaturedStory } from '../api/api';
import StoryCard from './StoryCard';
import FeaturedBanner from './FeaturedBanner';
import Leaderboard from './Leaderboard';

export default function CommunityFeed({ user, onReadStory, onWriteStory, onProfile }) {
  const [stories, setStories] = useState([]);
  const [featuredStory, setFeaturedStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadFeed();
    loadFeaturedStory();
  }, [sort]);

  const loadFeed = async (pageNum = 1, reset = true) => {
    try {
      setLoading(pageNum === 1);
      const result = await fetchCommunityFeed(pageNum, sort);
      
      if (result && result.stories) {
        if (reset) {
          setStories(result.stories);
        } else {
          setStories(prev => [...prev, ...result.stories]);
        }
        
        setHasMore(result.pagination?.hasNext || false);
        setPage(pageNum);
      } else {
        setStories([]);
        setHasMore(false);
        if (result?.error) {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error('Feed load error:', err);
      setError('Failed to load stories');
      setStories([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedStory = async () => {
    try {
      const result = await fetchFeaturedStory();
      setFeaturedStory(result.featured);
    } catch (err) {
      console.error('Failed to load featured story:', err);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadFeed(page + 1, false);
    }
  };

  const handleStoryUpdate = (storyId, updates) => {
    setStories(prev => prev.map(story => 
      story._id === storyId ? { ...story, ...updates } : story
    ));
  };

  if (loading && stories.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fefefd'
      }}>
        <div style={{ opacity: 0.6 }}>Loading community stories...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fefefd'
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #eee',
        padding: '15px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '1.3em',
            fontWeight: 'normal',
            opacity: 0.8
          }}>
            Calm Stories
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={onWriteStory}
              style={{
                padding: '8px 16px',
                background: '#222',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.9em',
                cursor: 'pointer'
              }}>
              Write
            </button>
            
            <button
              onClick={() => onProfile(user.username)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9em',
                cursor: 'pointer'
              }}>
              @{user.username}
            </button>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
        display: 'flex',
        gap: '20px'
      }}>
        {/* Main Content */}
        <div style={{
          flex: 1,
          maxWidth: '800px'
        }}>
        {/* Featured Story */}
        {featuredStory && (
          <FeaturedBanner 
            story={featuredStory} 
            onRead={() => onReadStory(featuredStory)}
          />
        )}

        {/* Sort Options */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '30px',
          marginTop: featuredStory ? '30px' : '0'
        }}>
          {['latest', 'popular', 'trending'].map(sortOption => (
            <button
              key={sortOption}
              onClick={() => setSort(sortOption)}
              style={{
                padding: '8px 16px',
                background: sort === sortOption ? '#f0f0f0' : 'transparent',
                color: sort === sortOption ? '#222' : '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9em',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}>
              {sortOption}
            </button>
          ))}
        </div>

        {/* Stories */}
        {error && (
          <div style={{
            color: '#d44',
            textAlign: 'center',
            padding: '20px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {stories.length === 0 && !loading ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            opacity: 0.5,
            fontSize: '1.1em'
          }}>
            No stories yet. Be the first to share!
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {stories.map(story => (
              <StoryCard
                key={story._id}
                story={story}
                onRead={() => onReadStory(story)}
                onLike={handleStoryUpdate}
                onAuthorClick={() => onProfile(story.authorUsername)}
              />
            ))}
          </div>
        )}

          {/* Load More */}
          {hasMore && (
            <div style={{
              textAlign: 'center',
              marginTop: '30px'
            }}>
              <button
                onClick={handleLoadMore}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: loading ? '#bbb' : 'transparent',
                  color: loading ? '#fff' : '#666',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}>
                {loading ? 'Loading...' : 'Load More Stories'}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar with Leaderboard */}
        <div style={{
          width: '280px',
          flexShrink: 0
        }}>
          <Leaderboard onUserClick={onProfile} />
        </div>
      </div>
    </div>
  );
}