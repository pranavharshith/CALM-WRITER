import React, { useState, useEffect, useRef } from 'react';
import { fetchCommunityFeed, fetchFollowingFeed, fetchFeaturedStory, searchStories, fetchForYouFeed } from '../../api/api';
import StoryCard from '../story/StoryCard';
import FeaturedBanner from './FeaturedBanner';
import SearchBar from '../common/SearchBar';
import PromptBanner from './PromptBanner';
import OnboardingChecklist from './OnboardingChecklist';
import { AppSplashSkeleton, SkeletonFeaturedBanner, SkeletonFeedCards, SkeletonFeedPagination, SkeletonRegion } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';
import useRegionLoading from '../../hooks/useRegionLoading';
import { cacheHas, cacheGet, cachePut } from '../../utils/screenCache';
import FeedHeader from './FeedHeader';
import FeedSidebar from './FeedSidebar';

export default function CommunityFeed({ user, onReadStory, onWriteStory, onWritePrompt, onProfile, onHubs, onSettings, onNotifications, onAnalytics, onAdmin, onModeration, onViewThread, onLeaderboards }) {
  const [stories, setStories] = useState([]);
  const [featuredStory, setFeaturedStory] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [rawLoading, setRawLoading] = useState(true);   // actual network state
  const [error, setError] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [hubAttention, setHubAttention] = useState(0);
  const [booted, setBooted] = useState(false);
  const bootedRef = useRef(false);
  const feedGen = useRef(0);
  const [regionBusy, setRegionBusy] = useState(false);
  const [paging, setPaging] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [highlightId, setHighlightId] = useState(null);
  const [entering, setEntering] = useState(false);

  const loading = useMinLoadTime(rawLoading && !booted);
  const regionLoading = useRegionLoading(regionBusy);
  const pagingLoading = useRegionLoading(paging);

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
      const { getUnreadNotificationCount, fetchHubCues } = await import('../../api/api');
      const [result, cues] = await Promise.all([
        getUnreadNotificationCount(),
        fetchHubCues().catch(() => null),
      ]);
      setUnreadCount(result.count ?? result.unreadCount ?? 0);
      if (cues && cues.success !== false) {
        setHubAttention(Number(cues.attention) || 0);
      }
    } catch (error) {
      console.debug('Failed to load notification count:', error);
    }
  };

  const loadFeed = async (pageNum = 1, reset = true) => {
    const gen = ++feedGen.current;
    const cacheKey = `feed:${sort}:page${pageNum}`;

    // If we have a fresh cached result, use it without showing the skeleton
    if (reset && pageNum === 1 && cacheHas(cacheKey)) {
      if (gen !== feedGen.current) return;
      const cached = cacheGet(cacheKey);
      setStories(cached.stories);
      setHasMore(cached.hasMore);
      setPage(1);
      setRawLoading(false);
      setRegionBusy(false);
      setPaging(false);
      markBooted();
      return;
    }

    try {
      if (reset && pageNum === 1) {
        if (bootedRef.current) setRegionBusy(true);
        else setRawLoading(true);
      } else {
        setPaging(true);
      }
      setError('');

      let result;
      if (sort === 'following') {
        result = await fetchFollowingFeed(pageNum);
      } else if (sort === 'for-you') {
        const fy = await fetchForYouFeed(pageNum, 10);
        setSuggestions(fy.suggestions || []);
        result = fy;
      } else {
        result = await fetchCommunityFeed(pageNum, sort);
      }

      let stories = [], hasNext = false;

      if (result?.data && Array.isArray(result.data)) {
        stories = result.data;
        hasNext = result.pagination?.hasNext ?? false;
      } else if (result?.stories && Array.isArray(result.stories)) {
        stories = result.stories;
        hasNext = result.pagination?.hasNext ?? (sort === 'for-you' && stories.length >= 10);
      } else if (Array.isArray(result)) {
        stories = result;
        hasNext = false;
      } else {
        if (result?.error) setError(result.error);
      }

      if (gen !== feedGen.current) return;

      if (reset) setStories(stories);
      else setStories(prev => [...prev, ...stories]);

      setHasMore(hasNext);
      setPage(pageNum);

      // Save first page results to cache (only for shared public sorts)
      const cachable = ['latest', 'popular', 'trending', 'most-liked'].includes(sort);
      if (pageNum === 1 && cachable) cachePut(cacheKey, { stories, hasMore: hasNext });

    } catch (err) {
      console.error('Feed load error:', err);
      if (gen !== feedGen.current) return;
      if (reset && pageNum === 1) setError('Failed to load stories');
      setHasMore(false);
    } finally {
      if (gen !== feedGen.current) return;
      setRawLoading(false);
      setRegionBusy(false);
      setPaging(false);
      markBooted();
    }
  };

  const markBooted = () => {
    bootedRef.current = true;
    setBooted(true);
  };

  const loadFeaturedStory = async () => {
    const key = 'featured';
    if (cacheHas(key)) {
      setFeaturedStory(cacheGet(key));
      setFeaturedLoading(false);
      return;
    }
    try {
      setFeaturedLoading(true);
      const result = await fetchFeaturedStory();
      setFeaturedStory(result.story || null);
      if (result.story) cachePut(key, result.story);
    } catch (err) {
      console.error('Failed to load featured story:', err);
    } finally {
      setFeaturedLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!rawLoading && !paging && hasMore) loadFeed(page + 1, false);
  };

  const handleStoryUpdate = (storyId, updates) => {
    setStories(prev => prev.map(story =>
      story._id === storyId ? { ...story, ...updates } : story
    ));
    // Keep the featured banner in sync if the liked story happens to be featured
    setFeaturedStory(prev => prev && prev._id === storyId ? { ...prev, ...updates } : prev);
  };

  const handleSearch = async (query, filters, pageNum = 1) => {
    const gen = ++feedGen.current;
    try {
      if (pageNum === 1) {
        if (bootedRef.current) setRegionBusy(true);
        else setRawLoading(true);
      } else {
        setPaging(true);
      }
      setIsSearching(true);
      setSearchQuery(query);
      setSearchFilters(filters);
      const result = await searchStories(query, filters, pageNum);
      if (gen !== feedGen.current) return;
      if (result?.stories) {
        if (pageNum === 1) setStories(result.stories);
        else setStories(prev => [...prev, ...result.stories]);
        setHasMore(result.pagination?.hasNext || false);
        setPage(pageNum);
      } else {
        setStories([]);
        setHasMore(false);
        if (result?.error) setError(result.error);
      }
    } catch (err) {
      console.error('Search error:', err);
      if (gen !== feedGen.current) return;
      setError('Failed to search stories');
      setStories([]);
      setHasMore(false);
    } finally {
      if (gen !== feedGen.current) return;
      setRawLoading(false);
      setRegionBusy(false);
      setPaging(false);
      markBooted();
    }
  };

  const handleClearSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
    setSearchFilters({});
    setPage(1);
  };

  const handleLoadMoreSearch = () => {
    if (!rawLoading && !paging && hasMore && isSearching) {
      handleSearch(searchQuery, searchFilters, page + 1);
    }
  };

  useEffect(() => {
    const id = sessionStorage.getItem('cw_highlight_story');
    if (id) setHighlightId(id);
  }, []);

  useEffect(() => {
    if (!highlightId) return undefined;
    if (!stories.some(s => s._id === highlightId)) return undefined;
    sessionStorage.removeItem('cw_highlight_story');
    const t = setTimeout(() => setHighlightId(null), 2200);
    return () => clearTimeout(t);
  }, [highlightId, stories]);

  useEffect(() => {
    if (regionLoading || loading) {
      setEntering(false);
      return undefined;
    }
    setEntering(true);
    const t = setTimeout(() => setEntering(false), 400);
    return () => clearTimeout(t);
  }, [regionLoading, loading, sort, isSearching]);

  /* ── T0: full-page skeleton only on first route mount ── */
  if (loading) {
    return <AppSplashSkeleton user={user} />;
  }

  return (
    <div className="feed">
      <FeedHeader
        user={user}
        unreadCount={unreadCount}
        hubAttention={hubAttention}
        onWriteStory={onWriteStory}
        onHubs={onHubs}
        onProfile={onProfile}
        onSettings={onSettings}
        onNotifications={onNotifications}
        onAnalytics={onAnalytics}
        onAdmin={onAdmin}
        onModeration={onModeration}
      />

      <div className="split-shell">
        <div className="split-shell__main">
          <SearchBar onSearch={handleSearch} onClear={handleClearSearch} isSearching={isSearching} />

          {/* Sort tabs — hidden when searching */}
          {!isSearching && (
            <div className="feed__sort">
              {['for-you', 'latest', 'popular', 'trending', 'following'].map(sortOption => (
                <button
                  key={sortOption}
                  onClick={() => setSort(sortOption)}
                  className={`feed__sort-btn${sort === sortOption ? ' feed__sort-btn--active' : ''}`}
                >
                  {sortOption === 'for-you' ? 'For You' : sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}
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
          {!isSearching && featuredLoading && !featuredStory && (
            <div className="feed__featured">
              <SkeletonFeaturedBanner />
            </div>
          )}
          {!isSearching && featuredStory && (
            <div className="feed__featured">
              <FeaturedBanner story={featuredStory} onRead={() => onReadStory(featuredStory)} />
            </div>
          )}

          {/* Daily Prompt — always a reason to write */}
          {!isSearching && onWritePrompt && (
            <PromptBanner onWrite={onWritePrompt} />
          )}

          {/* Onboarding checklist for new users */}
          {!isSearching && user && (
            <OnboardingChecklist
              onNavigate={(path) => {
                if (path === '/verify-email') { window.location.assign('/verify-email'); }
                else if (path === '/write') onWriteStory();
                else if (path === '/hubs') onHubs();
                else { /* /community — stay */ }
              }}
            />
          )}

          {/* Writer suggestions on empty For You */}
          {!isSearching && sort === 'for-you' && suggestions.length > 0 && (
            <div className="feed__suggestions">
              <div className="feed__suggestions-title">Writers to follow</div>
              <div className="feed__suggestions-list">
                {suggestions.map(s => (
                  <button
                    key={s.username}
                    onClick={() => onProfile(s.username)}
                    className="feed__suggestion"
                  >
                    {s.profilePicture ? (
                      <img src={s.profilePicture} alt={s.username} className="story-card__avatar" />
                    ) : (
                      <div className="story-card__avatar-placeholder" style={{ width: 30, height: 30, fontSize: '0.85em' }}>
                        {s.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <span>@{s.username}</span>
                  </button>
                ))}
              </div>
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

          {/* Stories — T1 region refresh, T2 pagination append */}
          <SkeletonRegion
            loading={regionLoading}
            minHeight={480}
            skeleton={<SkeletonFeedCards count={4} />}
          >
            {stories.length === 0 ? (
              <div className="feed__empty">
                {isSearching ? 'No stories found matching your search.' : 'No stories yet. Be the first to share!'}
              </div>
            ) : (
              <div className={`feed__stories${entering ? ' feed__stories--entering' : ''}`}>
                {stories.map(story => (
                  <StoryCard
                    key={story._id}
                    story={story}
                    isNew={highlightId === story._id}
                    onRead={() => onReadStory(story)}
                    onLike={handleStoryUpdate}
                    onViewThread={onViewThread}
                    onAuthorClick={() => {
                      if (story.authorUsername && story.authorUsername !== 'Anonymous') {
                        onProfile(story.authorUsername);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </SkeletonRegion>

          {pagingLoading && <SkeletonFeedPagination />}

          {/* Load More */}
          {hasMore && !pagingLoading && (
            <div className="feed__load-more">
              <button
                onClick={isSearching ? handleLoadMoreSearch : handleLoadMore}
                disabled={regionLoading}
                className="feed__load-more-btn"
              >
                Load More Stories
              </button>
            </div>
          )}
        </div>

        <FeedSidebar onWriteStory={onWriteStory} onLeaderboards={onLeaderboards} />
      </div>
    </div>
  );
}