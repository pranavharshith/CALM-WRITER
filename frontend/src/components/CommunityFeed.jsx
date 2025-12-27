import React, { useState, useEffect } from 'react';
import { fetchCommunityFeed, fetchFeaturedStory, searchStories } from '../api/api';
import StoryCard from './StoryCard';
import FeaturedBanner from './FeaturedBanner';
import Leaderboard from './Leaderboard';
import SearchBar from './SearchBar';

export default function CommunityFeed({ user, onReadStory, onWriteStory, onProfile, onViewThread, onModeration, onAdmin }) {
  const [stories, setStories] = useState([]);
  const [featuredStory, setFeaturedStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({});

  useEffect(() => {
    if (!isSearching) {
      loadFeed();
      loadFeaturedStory();
    }
  }, [sort, isSearching]);

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

  const handleSearch = async (query, filters, pageNum = 1) => {
    try {
      setLoading(pageNum === 1);
      setIsSearching(true);
      setSearchQuery(query);
      setSearchFilters(filters);

      const result = await searchStories(query, filters, pageNum);

      if (result && result.stories) {
        if (pageNum === 1) {
          setStories(result.stories);
        } else {
          setStories(prev => [...prev, ...result.stories]);
        }

        setHasMore(result.pagination?.hasNext || false);
        setPage(pageNum);
      } else {
        setStories([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search stories');
      setStories([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
    setSearchFilters({});
    setPage(1);
    loadFeed(1, true);
  };

  const handleLoadMoreSearch = () => {
    if (!loading && hasMore && isSearching) {
      handleSearch(searchQuery, searchFilters, page + 1);
    }
  };

  if (loading && stories.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fefefd',
        color: '#333'
      }}>
        <div style={{ opacity: 0.6 }}>Loading community stories...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fefefd',
      color: '#333'
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #ddd',
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
            color: '#333'
          }}>
            Calm Stories
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={onWriteStory}
              style={{
                padding: '8px 16px',
                background: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.9em',
                cursor: 'pointer'
              }}>
              Write
            </button>

            {user?.username && (
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
            )}

            {user?.role === 'admin' && user?.email === 'pranav.dot.h@gmail.com' && onAdmin && (
              <button
                onClick={onAdmin}
                style={{
                  padding: '8px 16px',
                  background: '#ff9800',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontFamily: 'Georgia, serif'
                }}>
                Admin
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '20px',
        display: 'flex',
        gap: '24px',
        alignItems: 'flex-start'
      }}>
        {/* Main Content */}
        <div style={{
          flex: 1,
          maxWidth: '800px',
          minWidth: 0
        }}>
          {/* Search Bar */}
          <SearchBar
            onSearch={handleSearch}
            onClear={handleClearSearch}
            isSearching={isSearching}
          />

          {/* Sort Options - hidden when searching */}
          {!isSearching && (
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '30px'
            }}>
              {['latest', 'popular', 'trending'].map(sortOption => (
                <button
                  key={sortOption}
                  onClick={() => setSort(sortOption)}
                  style={{
                    padding: '8px 16px',
                    background: sort === sortOption ? '#f0f0f0' : 'transparent',
                    color: sort === sortOption ? '#333' : '#666',
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
          )}

          {/* Search Results Header */}
          {isSearching && (
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '6px',
              fontSize: '0.9em',
              color: '#666'
            }}>
              {searchQuery ? `Search results for "${searchQuery}"` : 'Filtered results'}
            </div>
          )}

          {/* Featured Story - hidden when searching */}
          {!isSearching && featuredStory && (
            <div style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '0',
              boxShadow: '0 1px 4px #efefee',
              border: '1px solid #ddd',
              marginBottom: '20px'
            }}>
              <FeaturedBanner
                story={featuredStory}
                onRead={() => onReadStory(featuredStory)}
              />
            </div>
          )}

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
              {isSearching ? 'No stories found matching your search.' : 'No stories yet. Be the first to share!'}
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
                  onAuthorClick={() => {
                    // Only navigate if this story is tied to a real, named user
                    if (
                      story.authorUsername &&
                      story.authorUsername !== 'Anonymous'
                    ) {
                      onProfile(story.authorUsername);
                    }
                  }}
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
                onClick={isSearching ? handleLoadMoreSearch : handleLoadMore}
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

        {/* Sidebar with Leaderboard (right rail) */}
        <div
          style={{
            width: '380px',
            flexShrink: 0
          }}
        >
          <div
            style={{
              position: 'sticky',
              // Match below-the-header offset so the rail sits under the header bar
              top: 80,
              height: 'calc(100vh - 80px)',
              overflowY: 'auto'
            }}
          >
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}