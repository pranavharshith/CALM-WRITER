import React, { useEffect, useRef, useState } from 'react';
import {
  addStoryToShelf,
  createShelf,
  deleteShelf,
  fetchBookmarks,
  fetchShelf,
  fetchShelves,
  getBookmarkCount,
  removeStoryFromShelf,
  updateShelf,
} from '../../api/api';
import StoryCard from '../story/StoryCard';
import ConfirmDialog from '../common/ConfirmDialog';
import { SkeletonFeedCards, SkeletonFeedPagination, SkeletonRegion, SkeletonStoryList } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';
import useRegionLoading from '../../hooks/useRegionLoading';
import useToast from '../../hooks/useToast';

function storyIdOf(item) {
  return item?.story?._id || item?._id;
}

function ShelfForm({ open, title, initial, busy, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [visibility, setVisibility] = useState(initial?.visibility || 'private');

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || '');
    setDescription(initial?.description || '');
    setVisibility(initial?.visibility || 'private');
  }, [open, initial]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    onSave({ name: name.trim(), description: description.trim(), visibility });
  };

  return (
    <div className="overlay-shell" onClick={() => { if (!busy) onClose(); }} role="presentation">
      <form
        className="overlay-shell__card glass glass--strong shelf-form__card"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="shelf-form__title">{title}</h2>
        <div className="overlay-shell__body shelf-form__fields">
          <label className="shelf-form__label">
            Name
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="evening reads"
              maxLength={40}
              minLength={2}
              required
              autoComplete="off"
            />
          </label>
          <label className="shelf-form__label">
            A line about it · optional
            <input
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="For when the light goes amber."
              maxLength={200}
              autoComplete="off"
            />
          </label>
          <div className="shelf-form__vis" role="radiogroup" aria-label="Who can see this">
            <label className="shelf-form__choice">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
              />
              <span>
                <strong>Only you</strong>
                <span>A quiet pile. The link stays dark.</span>
              </span>
            </label>
            <label className="shelf-form__choice">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
              />
              <span>
                <strong>Anyone with the link</strong>
                <span>A list you can pass along.</span>
              </span>
            </label>
          </div>
        </div>
        <div className="overlay-shell__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={`btn btn--primary${busy ? ' btn--loading' : ''}`} disabled={busy || name.trim().length < 2}>
            {busy && <span className="spinner-ring" aria-hidden="true" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function AddToShelf({ open, story, shelves, busyId, onToggle, onClose, onCreate }) {
  if (!open) return null;
  const sid = storyIdOf({ story });

  return (
    <div className="overlay-shell" onClick={onClose} role="presentation">
      <div className="overlay-shell__card glass glass--strong shelf-form__card" onClick={(e) => e.stopPropagation()}>
        <h2 className="shelf-form__title">Place on a shelf</h2>
        <div className="overlay-shell__body">
          {shelves.length === 0 ? (
            <div>
              <p className="shelf-pick__empty">No named piles yet.</p>
              {onCreate && (
                <button type="button" className="btn btn--primary" onClick={onCreate}>
                  New shelf
                </button>
              )}
            </div>
          ) : (
            <ul className="shelf-pick__list">
              {shelves.map((shelf) => {
                const on = (shelf.storyIds || []).some((id) => String(id) === String(sid));
                return (
                  <li key={shelf._id}>
                    <label className="shelf-pick__row">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={busyId === shelf._id}
                        onChange={() => onToggle(shelf, !on)}
                      />
                      <span>{shelf.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="overlay-shell__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default function Bookmarks({ onBack, onReadStory, onProfile, user }) {
  const toast = useToast();
  const [view, setView] = useState('home');
  const [shelves, setShelves] = useState([]);
  const [username, setUsername] = useState(user?.username || '');
  const [savedCount, setSavedCount] = useState(0);
  const [items, setItems] = useState([]);
  const [activeShelf, setActiveShelf] = useState(null);

  const [rawLoading, setRawLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [regionBusy, setRegionBusy] = useState(false);
  const [paging, setPaging] = useState(false);
  const showT0 = useMinLoadTime(rawLoading && isFirstLoad);
  const regionLoading = useRegionLoading(regionBusy);
  const pagingLoading = useRegionLoading(paging);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const pagingLock = useRef(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [placing, setPlacing] = useState(null);
  const [placeBusy, setPlaceBusy] = useState(null);
  const pendingPlace = useRef(null);

  const loadHome = async () => {
    setRegionBusy(true);
    setRawLoading(true);
    setError('');
    try {
      const [shelfRes, countRes] = await Promise.all([
        fetchShelves(),
        getBookmarkCount(),
      ]);
      if (shelfRes?.success === false) throw new Error(shelfRes.error || 'Failed');
      setShelves(shelfRes.shelves || []);
      if (shelfRes.username) setUsername(shelfRes.username);
      setSavedCount(countRes.count ?? 0);
    } catch (err) {
      console.error('Shelves load error:', err);
      setError('Could not open your shelves.');
    } finally {
      setRawLoading(false);
      setIsFirstLoad(false);
      setRegionBusy(false);
    }
  };

  useEffect(() => {
    loadHome();
  }, []);

  const loadAllSaved = async (pageNum = 1, reset = true) => {
    if (pagingLock.current) return;
    pagingLock.current = true;
    try {
      if (reset) setRegionBusy(true);
      else setPaging(true);
      const result = await fetchBookmarks(pageNum, 8, searchQuery);
      if (result && result.bookmarks) {
        setItems(reset ? result.bookmarks : (prev) => [...prev, ...result.bookmarks]);
        setHasMore(!!result.pagination?.hasNext);
        setPage(pageNum);
        if (reset && !searchQuery) setSavedCount(result.pagination?.total ?? result.bookmarks.length);
      } else {
        if (reset) setItems([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Bookmarks load error:', err);
      setError('Could not load what you saved.');
      if (reset) setItems([]);
      setHasMore(false);
    } finally {
      setRegionBusy(false);
      setPaging(false);
      setRawLoading(false);
      setIsFirstLoad(false);
      pagingLock.current = false;
    }
  };

  const loadNamed = async (shelf, pageNum = 1, reset = true) => {
    if (pagingLock.current) return;
    pagingLock.current = true;
    try {
      if (reset) setRegionBusy(true);
      else setPaging(true);
      const result = await fetchShelf(shelf._id, pageNum, 8);
      if (result?.success === false) throw new Error(result.error || 'Failed');
      const next = (result.stories || []).map((story) => ({ _id: story._id, story }));
      setItems(reset ? next : (prev) => [...prev, ...next]);
      setActiveShelf(result.shelf || shelf);
      setHasMore(!!result.pagination?.hasNext);
      setPage(pageNum);
    } catch (err) {
      console.error('Shelf load error:', err);
      setError('Could not open this shelf.');
      if (reset) setItems([]);
      setHasMore(false);
    } finally {
      setRegionBusy(false);
      setPaging(false);
      setRawLoading(false);
      setIsFirstLoad(false);
      pagingLock.current = false;
    }
  };

  useEffect(() => {
    if (view === 'all') loadAllSaved(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, searchQuery]);

  useEffect(() => {
    if (view === 'home') return undefined;
    const handleScroll = () => {
      if (regionLoading || pagingLoading || pagingLock.current || !hasMore) return;
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 160;
      if (!nearBottom) return;
      if (view === 'all') loadAllSaved(page + 1, false);
      else if (activeShelf) loadNamed(activeShelf, page + 1, false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [view, page, regionLoading, pagingLoading, hasMore, activeShelf]);

  const openAll = () => {
    setRegionBusy(true);
    setView('all');
    setActiveShelf(null);
    setSearchQuery('');
    setSearchInput('');
    setItems([]);
    setPage(1);
    setError('');
  };

  const openShelf = (shelf) => {
    setRegionBusy(true);
    setView('shelf');
    setActiveShelf(shelf);
    setItems([]);
    setPage(1);
    setError('');
    loadNamed(shelf, 1, true);
  };

  const goHome = () => {
    setView('home');
    setActiveShelf(null);
    setItems([]);
    setError('');
    loadHome();
  };

  const handleSaveForm = async (payload) => {
    setFormBusy(true);
    try {
      if (editing) {
        const res = await updateShelf(editing._id, payload);
        if (res.success === false) throw new Error(res.error || 'Failed');
        setActiveShelf(res.shelf);
        setShelves((prev) => prev.map((s) => (s._id === res.shelf._id ? { ...s, ...res.shelf } : s)));
        toast.success('Shelf updated');
      } else {
        const res = await createShelf(payload);
        if (res.success === false) throw new Error(res.error || 'Failed');
        setShelves((prev) => [res.shelf, ...prev]);
        toast.success('Shelf made');
        if (pendingPlace.current) {
          setPlacing(pendingPlace.current);
          pendingPlace.current = null;
        }
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err.message || 'Could not save this shelf');
    } finally {
      setFormBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!activeShelf) return;
    setDeleteBusy(true);
    try {
      const res = await deleteShelf(activeShelf._id);
      if (res.success === false) throw new Error(res.error || 'Failed');
      toast.success('Shelf taken down');
      setDeleteOpen(false);
      goHome();
    } catch (err) {
      toast.error(err.message || 'Could not remove this shelf');
    } finally {
      setDeleteBusy(false);
    }
  };

  const copyLink = async () => {
    if (!activeShelf || activeShelf.visibility !== 'public' || !username) return;
    const url = `${window.location.origin}/shelf/${username}/${activeShelf.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.info('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const handleTogglePlace = async (shelf, add) => {
    const sid = storyIdOf({ story: placing });
    if (!sid) return;
    setPlaceBusy(shelf._id);
    try {
      const res = add
        ? await addStoryToShelf(shelf._id, sid)
        : await removeStoryFromShelf(shelf._id, sid);
      if (res.success === false) throw new Error(res.error || 'Failed');
      setShelves((prev) => prev.map((s) => {
        if (s._id !== shelf._id) return s;
        const ids = add
          ? [...(s.storyIds || []).filter((id) => String(id) !== String(sid)), sid]
          : (s.storyIds || []).filter((id) => String(id) !== String(sid));
        return { ...s, storyIds: ids, storyCount: ids.length };
      }));
      toast.success(add ? `On “${shelf.name}”` : `Off “${shelf.name}”`);
    } catch (err) {
      toast.error(err.message || 'Could not move this story');
    } finally {
      setPlaceBusy(null);
    }
  };

  const handleRemoveFromShelf = async (storyId) => {
    if (!activeShelf) return;
    try {
      const res = await removeStoryFromShelf(activeShelf._id, storyId);
      if (res.success === false) throw new Error(res.error || 'Failed');
      setItems((prev) => prev.filter((b) => storyIdOf(b) !== storyId));
      setActiveShelf((s) => s ? { ...s, storyCount: Math.max(0, (s.storyCount || 1) - 1) } : s);
      toast.success('Taken off this shelf');
    } catch (err) {
      toast.error(err.message || 'Could not take this off');
    }
  };

  const handleBookmarkRemoved = (storyId) => {
    setItems((prev) => prev.filter((b) => storyIdOf(b) !== storyId));
    setSavedCount((n) => Math.max(0, n - 1));
    setShelves((prev) => prev.map((s) => {
      const ids = (s.storyIds || []).filter((id) => String(id) !== String(storyId));
      return { ...s, storyIds: ids, storyCount: ids.length };
    }));
  };

  const patchStory = (storyId, patch) => {
    setItems((prev) => prev.map((b) => {
      if (storyIdOf(b) !== storyId) return b;
      return { ...b, story: { ...b.story, ...patch } };
    }));
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  if (showT0) return <SkeletonStoryList />;

  const heading = view === 'home'
    ? { title: 'Your shelves', sub: 'Piles of stories for later. Some you keep. Some you share.' }
    : view === 'all'
      ? { title: 'All saved', sub: 'Everything you have set aside, in one quiet stack.' }
      : {
        title: activeShelf?.name || 'Shelf',
        sub: activeShelf?.description || (activeShelf?.visibility === 'public' ? 'Anyone with the link can read this list.' : 'Only you see this pile.')
      };

  return (
    <div className="page-shell">
      <div className="page-shell__inner page-shell__inner--page shelves">
        <button type="button" onClick={view === 'home' ? onBack : goHome} className="btn-back">
          ← {view === 'home' ? 'Back' : 'Your shelves'}
        </button>

        <header className="shelves__hero">
          <div className="shelves__titles">
            <h1 className="page-title">{heading.title}</h1>
            <p className="page-sub">{heading.sub}</p>
          </div>
          {(view === 'home' || view === 'all') && (
            <button type="button" className="btn btn--primary shelves__new" onClick={() => { setEditing(null); setFormOpen(true); }}>
              New shelf
            </button>
          )}
          {view === 'shelf' && activeShelf && (
            <div className="shelves__view-actions">
              {activeShelf.visibility === 'public' && username && (
                <button type="button" className="btn btn--secondary" onClick={copyLink}>Copy link</button>
              )}
              <button type="button" className="btn btn--secondary" onClick={() => { setEditing(activeShelf); setFormOpen(true); }}>
                Edit
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => setDeleteOpen(true)}>
                Take down
              </button>
            </div>
          )}
        </header>

        {error && <div className="feed__error" role="alert">{error}</div>}

        {view === 'home' && (
          <SkeletonRegion loading={regionLoading} minHeight={280} skeleton={<SkeletonFeedCards count={2} />}>
            <ul className="shelves__grid">
              <li>
                <button type="button" className="shelf-card shelf-card--all" onClick={openAll}>
                  <div className="shelf-card__cover" aria-hidden="true">
                    <span className="shelf-card__mark">*</span>
                  </div>
                  <div className="shelf-card__body">
                    <h2 className="shelf-card__name">All saved</h2>
                    <p className="shelf-card__desc">The full stack — named or not.</p>
                    <p className="shelf-card__meta">
                      {savedCount === 0 ? 'Nothing kept yet' : `${savedCount} ${savedCount === 1 ? 'story' : 'stories'}`}
                    </p>
                  </div>
                </button>
              </li>
              {shelves.map((shelf) => (
                <li key={shelf._id}>
                  <button type="button" className="shelf-card" onClick={() => openShelf(shelf)}>
                    <div className="shelf-card__cover" aria-hidden="true">
                      {shelf.coverImage?.url ? (
                        <img src={shelf.coverImage.url} alt="" />
                      ) : (
                        <span className="shelf-card__mark">{(shelf.name || '?').charAt(0)}</span>
                      )}
                    </div>
                    <div className="shelf-card__body">
                      <h2 className="shelf-card__name">{shelf.name}</h2>
                      {shelf.description && <p className="shelf-card__desc">{shelf.description}</p>}
                      <p className="shelf-card__meta">
                        {shelf.storyCount || 0} {(shelf.storyCount || 0) === 1 ? 'story' : 'stories'}
                        {' · '}
                        {shelf.visibility === 'public' ? 'Anyone with the link' : 'Only you'}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {shelves.length === 0 && savedCount === 0 && (
              <p className="shelves__empty">Save a story from the feed. Then, if you like, give it a named pile — evening reads, for a rainy day.</p>
            )}
          </SkeletonRegion>
        )}

        {view === 'all' && (
          <>
            <form
              onSubmit={(e) => { e.preventDefault(); setSearchQuery(searchInput.trim()); }}
              className="tags-page__search"
            >
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title or author…"
                className="form-input"
              />
              <button type="submit" className="btn btn--primary">Search</button>
              {searchQuery && (
                <button type="button" className="btn btn--secondary" onClick={() => { setSearchInput(''); setSearchQuery(''); }}>
                  Clear
                </button>
              )}
            </form>

            <SkeletonRegion loading={regionLoading} minHeight={360} skeleton={<SkeletonFeedCards count={3} />}>
              {items.length === 0 ? (
                <p className="shelves__empty">
                  {searchQuery ? 'Nothing in the stack matches that.' : 'No bookmarks yet. Keep a story from the feed when you want it later.'}
                </p>
              ) : (
                <div className="shelves__list">
                  {items.map((bookmark) => (
                    <div key={bookmark._id || storyIdOf(bookmark)} className="shelves__item">
                      <StoryCard
                        story={bookmark.story}
                        saved
                        onRead={() => onReadStory(bookmark.story)}
                        onLike={(storyId, { likes, isLikedByUser }) => patchStory(storyId, { likes, isLikedByUser })}
                        onAuthorClick={() => {
                          if (bookmark.story.authorUsername && bookmark.story.authorUsername !== 'Anonymous') {
                            onProfile(bookmark.story.authorUsername);
                          }
                        }}
                        onBookmarkRemoved={handleBookmarkRemoved}
                      />
                      <div className="shelves__item-meta">
                        <p className="shelves__when">
                          {bookmark.bookmarkedAt ? `Kept ${formatDate(bookmark.bookmarkedAt)}` : 'Kept'}
                        </p>
                        <div className="shelves__item-actions">
                          <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={() => setPlacing(bookmark.story)}
                          >
                            Place on a shelf
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SkeletonRegion>
          </>
        )}

        {view === 'shelf' && (
          <SkeletonRegion loading={regionLoading} minHeight={360} skeleton={<SkeletonFeedCards count={3} />}>
            {items.length === 0 ? (
              <p className="shelves__empty">Nothing on this shelf yet. Open All saved and place a story here.</p>
            ) : (
              <div className="shelves__list">
                {items.map((bookmark) => (
                  <div key={bookmark._id || storyIdOf(bookmark)} className="shelves__item">
                    <StoryCard
                      story={bookmark.story}
                      saved
                      onRead={() => onReadStory(bookmark.story)}
                      onLike={(storyId, { likes, isLikedByUser }) => patchStory(storyId, { likes, isLikedByUser })}
                      onAuthorClick={() => {
                        if (bookmark.story.authorUsername && bookmark.story.authorUsername !== 'Anonymous') {
                          onProfile(bookmark.story.authorUsername);
                        }
                      }}
                      onBookmarkRemoved={handleBookmarkRemoved}
                    />
                    <div className="shelves__item-meta">
                      <p className="shelves__when">On this shelf</p>
                      <div className="shelves__item-actions">
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={() => handleRemoveFromShelf(storyIdOf(bookmark))}
                        >
                          Take off
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SkeletonRegion>
        )}

        {pagingLoading && <SkeletonFeedPagination />}

        {hasMore && !regionLoading && !pagingLoading && view !== 'home' && (
          <div className="shelves__more">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                if (view === 'all') loadAllSaved(page + 1, false);
                else if (activeShelf) loadNamed(activeShelf, page + 1, false);
              }}
            >
              Load more
            </button>
          </div>
        )}

        <ShelfForm
          open={formOpen}
          title={editing ? 'Edit this shelf' : 'A new shelf'}
          initial={editing}
          busy={formBusy}
          onClose={() => {
            if (formBusy) return;
            setFormOpen(false);
            setEditing(null);
            if (pendingPlace.current) {
              setPlacing(pendingPlace.current);
              pendingPlace.current = null;
            }
          }}
          onSave={handleSaveForm}
        />

        <AddToShelf
          open={!!placing}
          story={placing}
          shelves={shelves}
          busyId={placeBusy}
          onToggle={handleTogglePlace}
          onClose={() => setPlacing(null)}
          onCreate={() => {
            pendingPlace.current = placing;
            setPlacing(null);
            setEditing(null);
            setFormOpen(true);
          }}
        />

        <ConfirmDialog
          open={deleteOpen}
          title="Take this shelf down?"
          message="Stories stay in All saved. Only the named pile goes."
          confirmLabel="Take down"
          destructive
          busy={deleteBusy}
          onConfirm={handleDelete}
          onCancel={() => { if (!deleteBusy) setDeleteOpen(false); }}
        />
      </div>
    </div>
  );
}
