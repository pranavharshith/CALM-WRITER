import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchStoriesByTag } from '../../api/api';
import StoryCard from './StoryCard';
import { SkeletonFeedCards, SkeletonFeedPagination, SkeletonRegion, SkeletonStoryList } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';
import useRegionLoading from '../../hooks/useRegionLoading';

export default function TagStories() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [rawLoading, setRawLoading] = useState(true);
  const [regionBusy, setRegionBusy] = useState(false);
  const [paging, setPaging] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [missing, setMissing] = useState(false);
  const showT0 = useMinLoadTime(rawLoading);
  const regionLoading = useRegionLoading(regionBusy);
  const pagingLoading = useRegionLoading(paging);

  const load = async (pageNum = 1, reset = true) => {
    try {
      if (reset) {
        setRegionBusy(true);
        setRawLoading(true);
      } else {
        setPaging(true);
      }
      const res = await fetchStoriesByTag(tag, pageNum, 8);
      if (res.success === false) {
        setMissing(true);
        setStories([]);
        return;
      }
      setMissing(false);
      setStories(reset ? (res.stories || []) : (prev) => [...prev, ...(res.stories || [])]);
      setHasMore(!!res.pagination?.hasNext);
      setPage(pageNum);
    } catch (err) {
      console.error('Tag stories error:', err);
      setError('Could not load these stories.');
    } finally {
      setRawLoading(false);
      setRegionBusy(false);
      setPaging(false);
    }
  };

  useEffect(() => {
    setStories([]);
    setMissing(false);
    load(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  if (showT0) return <SkeletonStoryList />;

  return (
    <div className="page-shell">
      <div className="page-shell__inner page-shell__inner--page tags-page">
        <button type="button" className="btn-back" onClick={() => navigate('/tags')}>← Tags</button>

        <header className="tags-page__hero">
          <h1 className="page-title">#{tag}</h1>
          <p className="page-sub">Stories marked with this word.</p>
        </header>

        {error && <div className="feed__error" role="alert">{error}</div>}

        <SkeletonRegion loading={regionLoading} minHeight={320} skeleton={<SkeletonFeedCards count={3} />}>
          {missing || stories.length === 0 ? (
            <p className="tags-page__empty">Nothing lives under this tag yet.</p>
          ) : (
            <div className="shelves__list">
              {stories.map((story) => (
                <StoryCard
                  key={story._id}
                  story={story}
                  onRead={() => navigate(`/story/${story._id}`)}
                  onAuthorClick={() => {
                    if (story.authorUsername && story.authorUsername !== 'Anonymous') {
                      navigate(`/profile/${story.authorUsername}`);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </SkeletonRegion>

        {pagingLoading && <SkeletonFeedPagination />}
        {hasMore && !regionLoading && !pagingLoading && (
          <div className="shelves__more">
            <button type="button" className="btn btn--secondary" onClick={() => load(page + 1, false)}>
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
