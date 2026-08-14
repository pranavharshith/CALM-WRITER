import React, { useState, useEffect, useRef } from 'react';
import { fetchBookmarks } from '../../api/api';
import StoryCard from '../story/StoryCard';
import { SkeletonFeedCards, SkeletonFeedPagination, SkeletonRegion, SkeletonStoryList } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';
import useRegionLoading from '../../hooks/useRegionLoading';

export default function Bookmarks({ onBack, onReadStory, onProfile }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [rawLoading, setRawLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [regionBusy, setRegionBusy] = useState(true);
  const [paging, setPaging] = useState(false);
  const showT0 = useMinLoadTime(rawLoading && isFirstLoad);
  const regionLoading = useRegionLoading(regionBusy && !isFirstLoad);
  const pagingLoading = useRegionLoading(paging);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const containerRef = useRef(null);
  const pagingLock = useRef(false);

  useEffect(() => {
    loadBookmarks(1, true);
  }, [searchQuery]);

  useEffect(() => {
    const handleScroll = () => {
      if (regionLoading || pagingLoading || pagingLock.current || !hasMore) return;
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 160;
      if (nearBottom) loadBookmarks(page + 1, false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, regionLoading, pagingLoading, hasMore]);

  const loadBookmarks = async (pageNum = 1, reset = true) => {
    if (pagingLock.current) return;
    pagingLock.current = true;
    try {
      if (reset) setRegionBusy(true);
      else setPaging(true);
      setRawLoading(true);
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
      setRawLoading(false);
      setIsFirstLoad(false);
      setRegionBusy(false);
      setPaging(false);
      pagingLock.current = false;
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

  if (showT0) {
    return <SkeletonStoryList />;
  }

  return (
    <div className="list-page">
      <div className="list-page__inner">
        <button onClick={onBack} className="btn-back mb-5">← Back</button>

        {/* Header */}
        <div style={{
          background: 'var(--glass-bg-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '24px',
          border: '1px solid var(--border)'
        }}>
          <h1 className="page-title">Bookmarks</h1>
          <p className="page-sub">Stories you’ve saved to read later</p>

          {/* Search Bar */}
          <form onSubmit={handleSearch}>
            <div className="search-bar__row">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title or author..."
                className="form-input search-bar__input"
              />
              <button type="submit" className="btn btn--primary">Search</button>
              {searchQuery && (
                <button type="button" onClick={handleClearSearch} className="btn btn--secondary">
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Bookmarks List */}
        <div ref={containerRef}>
          {error && (
            <div style={{
              color: 'var(--rose-dark)',
              textAlign: 'center',
              padding: '20px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <SkeletonRegion
            loading={regionLoading}
            minHeight={360}
            skeleton={<SkeletonFeedCards count={3} />}
          >
          {bookmarks.length === 0 ? (
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
                    color: 'var(--text-tertiary)',
                    marginTop: '4px',
                    paddingLeft: '4px'
                  }}>
                    Bookmarked {formatDate(bookmark.bookmarkedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}

          </SkeletonRegion>

          {pagingLoading && <SkeletonFeedPagination />}

          {hasMore && !regionLoading && !pagingLoading && (
            <div style={{
              textAlign: 'center',
              marginTop: '30px'
            }}>
              <button
                onClick={() => loadBookmarks(page + 1, false)}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9em',
                  cursor: 'pointer'
                }}>
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
