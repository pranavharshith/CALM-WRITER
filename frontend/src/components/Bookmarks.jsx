import React, { useState, useEffect, useRef } from 'react';
import { fetchBookmarks } from '../api/api';
import StoryCard from './StoryCard';

export default function Bookmarks({ onBack, onReadStory, onProfile }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    loadBookmarks(1, true);
  }, [searchQuery]);

  useEffect(() => {
    // Infinite scroll
    const handleScroll = () => {
      if (!containerRef.current || loading || !hasMore) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadBookmarks(page + 1, false);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [page, loading, hasMore]);

  const loadBookmarks = async (pageNum = 1, reset = true) => {
    try {
      setLoading(true);
      const result = await fetchBookmarks(pageNum, 8, searchQuery);
      
      if (result && result.bookmarks) {
        if (reset) {
          setBookmarks(result.bookmarks);
        } else {
          setBookmarks(prev => [...prev, ...result.bookmarks]);
        }
        
        setHasMore(result.pagination?.hasNext || false);
        setPage(pageNum);
      } else {
        if (reset) {
          setBookmarks([]);
        }
        setHasMore(false);
      }
    } catch (err) {
      console.error('Bookmarks load error:', err);
      setError('Failed to load bookmarks');
      if (reset) {
        setBookmarks([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  // This will be called when a story is unbookmarked
  const handleBookmarkRemoved = (storyId) => {
    setBookmarks(prev => prev.filter(b => b.story._id !== storyId));
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fefefd',
      padding: '20px'
    }}>
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
          ← Back
        </button>

        {/* Header */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 4px #efefee',
          marginBottom: '24px',
          border: '1px solid #ddd'
        }}>
          <div style={{
            fontSize: '1.8em',
            marginBottom: '12px',
            color: '#333',
            fontWeight: '500'
          }}>
            Bookmarks
          </div>
          <div style={{
            fontSize: '0.9em',
            color: '#666',
            marginBottom: '20px'
          }}>
            Stories you've saved to read later
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch}>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title or author..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  background: '#222',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  cursor: 'pointer'
                }}>
                Search
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    cursor: 'pointer'
                  }}>
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Bookmarks List */}
        <div
          ref={containerRef}
          style={{
            maxHeight: 'calc(100vh - 250px)',
            overflowY: 'auto',
            paddingRight: '8px'
          }}
        >
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

          {bookmarks.length === 0 && !loading ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              opacity: 0.5,
              fontSize: '1.1em'
            }}>
              {searchQuery ? 'No bookmarks found matching your search.' : 'No bookmarks yet. Start saving stories you want to read later!'}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {bookmarks.map((bookmark) => (
                <div key={bookmark._id}>
                  <StoryCard
                    story={bookmark.story}
                    onRead={() => onReadStory(bookmark.story)}
                    onLike={(storyId, { likes, isLikedByUser }) => {
                      setBookmarks(prev => prev.map(b => {
                        if (b.story._id === storyId) {
                          return {
                            ...b,
                            story: {
                              ...b.story,
                              likes,
                              isLikedByUser
                            }
                          };
                        }
                        return b;
                      }));
                    }}
                    onAuthorClick={() => {
                      if (
                        bookmark.story.authorUsername &&
                        bookmark.story.authorUsername !== 'Anonymous'
                      ) {
                        onProfile(bookmark.story.authorUsername);
                      }
                    }}
                    onBookmarkRemoved={handleBookmarkRemoved}
                  />
                  <div style={{
                    fontSize: '0.75em',
                    color: '#999',
                    marginTop: '4px',
                    paddingLeft: '4px'
                  }}>
                    Bookmarked {formatDate(bookmark.bookmarkedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button (fallback) */}
          {hasMore && !loading && (
            <div style={{
              textAlign: 'center',
              marginTop: '30px'
            }}>
              <button
                onClick={() => loadBookmarks(page + 1, false)}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  cursor: 'pointer'
                }}>
                Load More
              </button>
            </div>
          )}

          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#666',
              fontSize: '0.9em'
            }}>
              Loading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
