import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTrendingTags, searchTags } from '../../api/api';
import { SkeletonRegion, SkeletonStoryList } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';
import useRegionLoading from '../../hooks/useRegionLoading';

export default function TagBrowse({ onBack }) {
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [query, setQuery] = useState('');
  const [input, setInput] = useState('');
  const [rawLoading, setRawLoading] = useState(true);
  const [regionBusy, setRegionBusy] = useState(false);
  const [error, setError] = useState('');
  const showT0 = useMinLoadTime(rawLoading);
  const regionLoading = useRegionLoading(regionBusy);

  const load = async (q = '') => {
    setRegionBusy(true);
    setError('');
    try {
      const res = q ? await searchTags(q) : await fetchTrendingTags();
      if (res?.success === false) throw new Error(res.error || 'Failed');
      setTags(res.tags || []);
    } catch (err) {
      console.error('Tag browse error:', err);
      setError('Could not load tags.');
      setTags([]);
    } finally {
      setRawLoading(false);
      setRegionBusy(false);
    }
  };

  useEffect(() => {
    load(query);
  }, [query]);

  if (showT0) return <SkeletonStoryList />;

  return (
    <div className="page-shell">
      <div className="page-shell__inner page-shell__inner--page tags-page">
        <button type="button" className="btn-back" onClick={onBack}>← Back</button>

        <header className="tags-page__hero">
          <h1 className="page-title">Tags</h1>
          <p className="page-sub">Words writers have set on their stories. Follow one that fits the hour.</p>
        </header>

        <form
          className="tags-page__search"
          onSubmit={(e) => { e.preventDefault(); setQuery(input.trim().toLowerCase()); }}
        >
          <input
            type="search"
            className="form-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search tags…"
            autoComplete="off"
          />
          <button type="submit" className="btn btn--primary">Search</button>
          {query && (
            <button type="button" className="btn btn--secondary" onClick={() => { setInput(''); setQuery(''); }}>
              Clear
            </button>
          )}
        </form>

        {error && <div className="feed__error" role="alert">{error}</div>}

        <SkeletonRegion loading={regionLoading} minHeight={180} skeleton={<div className="tags-page__cloud">{[1, 2, 3, 4, 5].map((i) => <span key={i} className="tag-chip">···</span>)}</div>}>
          {tags.length === 0 ? (
            <p className="tags-page__empty">
              {query ? 'No tags sit under that spelling yet.' : 'No tags in the air yet. Publish a story and give it a word.'}
            </p>
          ) : (
            <div className="tags-page__cloud">
              {tags.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  className="tag-chip"
                  onClick={() => navigate(`/tags/${encodeURIComponent(item.tag)}`)}
                >
                  #{item.tag}
                  {typeof item.count === 'number' && (
                    <span className="tags-page__count">{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </SkeletonRegion>
      </div>
    </div>
  );
}
