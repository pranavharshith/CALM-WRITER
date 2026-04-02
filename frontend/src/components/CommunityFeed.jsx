import React, { useState, useEffect } from 'react';
import { fetchCommunityFeed, fetchFollowingFeed, fetchFeaturedStory, searchStories } from '../api/api';
import StoryCard from './StoryCard';
import FeaturedBanner from './FeaturedBanner';
import Leaderboard from './Leaderboard';
import SearchBar from './SearchBar';
import { AppSplashSkeleton, SkeletonFeaturedBanner } from './SkeletonLoader';
import useMinLoadTime from '../hooks/useMinLoadTime';
import { cacheHas, cacheGet, cachePut } from '../utils/screenCache';

export default function CommunityFeed({ user, onReadStory, onWriteStory, onProfile, onHubs, onSettings, onNotifications, onAnalytics, onAdmin }) {
  const [stories, setStories] = useState([]);
  const [featuredStory, setFeaturedStory] = useState(null);
  const [rawLoading, setRawLoading] = useState(true);   // actual network state
  const [error, setError] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  // Minimum 1 s skeleton display so it's always visible
  const loading = useMinLoadTime(rawLoading, 1000);

  useEffect(() => {
    loadFeaturedStory();
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isSearching) loadFeed();
  }, [sort, isSearching]);

  const loadUnreadCount = async () => {
    try {
      const { getUnreadNotificationCount } = await import('../api/api');
      const result = await getUnreadNotificationCount();
      setUnreadCount(result.count || 0);
    } catch (error) {
      console.debug('Failed to load notification count:', error);
    }
  };

  const loadFeed = async (pageNum = 1, reset = true) => {
    const cacheKey = `feed:${sort}:page${pageNum}`;

    // If we have a fresh cached result, use it without showing the skeleton
    if (reset && pageNum === 1 && cacheHas(cacheKey)) {
      const cached = cacheGet(cacheKey);
      setStories(cached.stories);
      setHasMore(cached.hasMore);
      setPage(1);
      setRawLoading(false);   // no skeleton at all for cached data
      return;
    }

    try {
      setRawLoading(pageNum === 1);
      setError('');

      let result;
      if (sort === 'following') {
        result = await fetchFollowingFeed(pageNum);
      } else {
        result = await fetchCommunityFeed(pageNum, sort);
      }

      let stories = [], hasNext = false;

      if (result?.data && Array.isArray(result.data)) {
        stories = result.data;
        hasNext = result.pagination?.hasNext || false;
      } else if (result?.stories && Array.isArray(result.stories)) {
        stories = result.stories;
        hasNext = result.pagination?.hasNext || false;
      } else if (Array.isArray(result)) {
        stories = result;
        hasNext = false;
      } else {
        if (result?.error) setError(result.error);
      }

      if (reset) setStories(stories);
      else setStories(prev => [...prev, ...stories]);

      setHasMore(hasNext);
      setPage(pageNum);

      // Save first page results to cache
      if (pageNum === 1) cachePut(cacheKey, { stories, hasMore: hasNext });

    } catch (err) {
      console.error('Feed load error:', err);
      if (stories.length === 0) setError('Failed to load stories');
      setHasMore(false);
    } finally {
      setRawLoading(false);
    }
  };

  const loadFeaturedStory = async () => {
    const key = 'featured';
    if (cacheHas(key)) {
      setFeaturedStory(cacheGet(key));
      return;
    }
    try {
      const result = await fetchFeaturedStory();
      setFeaturedStory(result.featured);
      if (result.featured) cachePut(key, result.featured);
    } catch (err) {
      console.error('Failed to load featured story:', err);
    }
  };

  const handleLoadMore = () => {
    if (!rawLoading && hasMore) loadFeed(page + 1, false);
  };

  const handleStoryUpdate = (storyId, updates) => {
    setStories(prev => prev.map(story =>
      story._id === storyId ? { ...story, ...updates } : story
    ));
  };

  const handleSearch = async (query, filters, pageNum = 1) => {
    try {
      setRawLoading(pageNum === 1);
      setIsSearching(true);
      setSearchQuery(query);
      setSearchFilters(filters);
      const result = await searchStories(query, filters, pageNum);
      if (result?.stories) {
        if (pageNum === 1) setStories(result.stories);
        else setStories(prev => [...prev, ...result.stories]);
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
      setRawLoading(false);
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
    if (!rawLoading && hasMore && isSearching) {
      handleSearch(searchQuery, searchFilters, page + 1);
    }
  };

  /* ── Full-page skeleton while the first batch loads ── */
  if (loading) {
    return <AppSplashSkeleton user={user} />;
  }

  return (
    <div className="feed">
      {/* Sticky Header */}
      <div className="feed__header">
        <div className="feed__header-inner">
          <div className="feed__logo">Calm Stories</div>

          <div className="feed__nav">
            <button onClick={onWriteStory} className="feed__nav-btn feed__nav-btn--write">
              Write
            </button>

            {user?.username && (
              <button onClick={() => onProfile(user.username)} className="feed__nav-btn feed__nav-btn--outline">
                @{user.username}
              </button>
            )}

            {onHubs && (
              <button onClick={onHubs} className="feed__nav-btn feed__nav-btn--outline">
                Hubs
              </button>
            )}

            {onSettings && (
              <button onClick={onSettings} className="feed__nav-btn feed__nav-btn--outline">
                Settings
              </button>
            )}

            {onNotifications && (
              <button onClick={onNotifications} className="feed__notif-btn">
                🔔
                {unreadCount > 0 && (
                  <span className="feed__notif-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {onAnalytics && (
              <button onClick={onAnalytics} className="feed__nav-btn feed__nav-btn--outline" title="Writer Analytics">
                Stats
              </button>
            )}

            {user?.role === 'admin' && onAdmin && (
              <button onClick={onAdmin} className="feed__nav-btn feed__nav-btn--admin">
                Admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="feed__body">
        {/* Main Content */}
        <div className="feed__main">
          <SearchBar onSearch={handleSearch} onClear={handleClearSearch} isSearching={isSearching} />

          {/* Sort tabs — hidden when searching */}
          {!isSearching && (
            <div className="feed__sort">
              {['latest', 'popular', 'trending', 'following'].map(sortOption => (
                <button
                  key={sortOption}
                  onClick={() => setSort(sortOption)}
                  className={`feed__sort-btn${sort === sortOption ? ' feed__sort-btn--active' : ''}`}
                >
                  {sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Search result header */}
          {isSearching && (
            <div className="feed__search-info">
              {searchQuery ? `Search results for "${searchQuery}"` : 'Filtered results'}
            </div>
          )}

          {/* Featured Story */}
          {!isSearching && featuredStory && (
            <div className="feed__featured">
              <FeaturedBanner story={featuredStory} onRead={() => onReadStory(featuredStory)} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="feed__error">
              <div className="feed__error-msg">{error}</div>
              <button
                className="btn btn--primary"
                onClick={() => { setError(''); loadFeed(1, true); }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Stories */}
          {stories.length === 0 && !loading ? (
            <div className="feed__empty">
              {isSearching ? 'No stories found matching your search.' : 'No stories yet. Be the first to share!'}
            </div>
          ) : (
            <div className="feed__stories">
              {stories.map(story => (
                <StoryCard
                  key={story._id}
                  story={story}
                  onRead={() => onReadStory(story)}
                  onLike={handleStoryUpdate}
                  onAuthorClick={() => {
                    if (story.authorUsername && story.authorUsername !== 'Anonymous') {
                      onProfile(story.authorUsername);
                    }
                  }}
                />
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="feed__load-more">
              <button
                onClick={isSearching ? handleLoadMoreSearch : handleLoadMore}
                disabled={rawLoading}
                className="feed__load-more-btn"
              >
                {rawLoading ? 'Loading...' : 'Load More Stories'}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="feed__sidebar">
          <div className="feed__sidebar-sticky">
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}