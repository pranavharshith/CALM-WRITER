import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchPublicShelf } from '../../api/api';
import StoryCard from '../story/StoryCard';
import { SkeletonFeedCards, SkeletonFeedPagination, SkeletonRegion, SkeletonStoryList } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';
import useRegionLoading from '../../hooks/useRegionLoading';

export default function ShelfPublic() {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const [owner, setOwner] = useState(null);
  const [shelf, setShelf] = useState(null);
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
      const res = await fetchPublicShelf(username, slug, pageNum, 8);
      if (res.success === false) {
        setMissing(true);
        setShelf(null);
        setStories([]);
        return;
      }
      setOwner(res.owner || { username });
      setShelf(res.shelf);
      setStories(reset ? (res.stories || []) : (prev) => [...prev, ...(res.stories || [])]);
      setHasMore(!!res.pagination?.hasNext);
      setPage(pageNum);
      setMissing(false);
    } catch (err) {
      console.error('Public shelf error:', err);
      setError('Could not open this list.');
    } finally {
      setRawLoading(false);
      setRegionBusy(false);
      setPaging(false);
    }
  };

  useEffect(() => {
    setStories([]);
    setShelf(null);
    setMissing(false);
    load(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, slug]);

  if (showT0) return <SkeletonStoryList />;

  if (missing) {
    return (
      <div className="page-shell">
        <div className="page-shell__inner page-shell__inner--page shelves">
          <button type="button" className="btn-back" onClick={() => navigate('/community')}>← Back</button>
          <header className="shelves__hero">
            <div className="shelves__titles">
              <h1 className="page-title">This list is quiet</h1>
              <p className="page-sub">It may be private, or it may never have been made.</p>
            </div>
          </header>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-shell__inner page-shell__inner--page shelves">
        <button type="button" className="btn-back" onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate('/community');
        }}>← Back</button>

        <header className="shelves__hero">
          <div className="shelves__titles">
            <h1 className="page-title">{shelf?.name || 'A shelf'}</h1>
            {shelf?.description && <p className="page-sub">{shelf.description}</p>}
            {owner?.username && (
              <p className="public-shelf__owner">
                A list from{' '}
                <button type="button" onClick={() => navigate(`/profile/${owner.username}`)}>
                  @{owner.username}
                </button>
              </p>
            )}
          </div>
        </header>

        {error && <div className="feed__error" role="alert">{error}</div>}

        <SkeletonRegion loading={regionLoading} minHeight={280} skeleton={<SkeletonFeedCards count={3} />}>
          {stories.length === 0 ? (
            <p className="shelves__empty">This list is empty for now.</p>
          ) : (
            <div className="shelves__list">
              {stories.map((story) => (
                <div key={story._id} className="shelves__item">
                  <StoryCard
                    story={story}
                    saveable={false}
                    disableLike
                    onRead={() => navigate(`/story/${story._id}`)}
                    onAuthorClick={() => {
                      if (story.authorUsername && story.authorUsername !== 'Anonymous') {
                        navigate(`/profile/${story.authorUsername}`);
                      }
                    }}
                  />
                </div>
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
