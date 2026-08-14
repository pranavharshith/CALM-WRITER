import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchMostFeltLeaderboard,
  fetchQuietlyPowerfulLeaderboard,
  fetchGrowingStoriesLeaderboard,
  fetchTopStories
} from '../../api/api';
import { SkeletonLeaderboardRow, SkeletonRegion } from '../skeletons';
import useRegionLoading from '../../hooks/useRegionLoading';

const LENSES = [
  { key: 'top', label: 'Top Stories', desc: 'The most-liked stories right now.', fn: (l) => fetchTopStories(l === 'all-time' ? 'all-time' : l === '1w' ? '1w' : l === '3d' ? '3d' : '24h', 20) },
  { key: 'mostFelt', label: 'Most Felt', desc: 'Stories that moved people deeply.', fn: () => fetchMostFeltLeaderboard(20) },
  { key: 'quietly', label: 'Quietly Powerful', desc: 'Longer stories that linger without chasing likes.', fn: () => fetchQuietlyPowerfulLeaderboard(20) },
  { key: 'growing', label: 'Growing Stories', desc: 'Stories gaining momentum.', fn: () => fetchGrowingStoriesLeaderboard(20, 7) }
];

const PERIODS = ['24h', '3d', '1w', 'all-time'];

function normalize(entry, lens) {
  const id = String(entry._id || entry.storyId || '');
  const title = (entry.title || entry.storyTitle || '').trim() || 'Untitled';
  const author = entry.authorUsername || entry.username;
  let subLabel = '';
  if (lens === 'quietly') {
    const bits = [];
    if (entry.wordCount) bits.push(`${entry.wordCount} words`);
    if (entry.reactions > 0) bits.push(`${entry.reactions} felt`);
    if (entry.likes != null) bits.push(`${entry.likes} likes`);
    subLabel = bits.join(' · ');
  } else if (lens === 'mostFelt') {
    subLabel = entry.reactions != null ? `${entry.reactions} reactions` : '';
  } else if (entry.likesPerDay != null) {
    subLabel = `${entry.likesPerDay} likes/day · ${entry.likes} total`;
  } else if (entry.likes != null) {
    subLabel = `${entry.likes} likes`;
  }

  return { id, title, author, subLabel };
}

export default function Leaderboards({ onBack }) {
  const navigate = useNavigate();
  const [lens, setLens] = useState('top');
  const [period, setPeriod] = useState('1w');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const regionLoading = useRegionLoading(loading);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens, period]);

  const loadLens = async () => {
    setLoading(true);
    setError('');
    try {
      const active = LENSES.find(l => l.key === lens);
      const result = await active.fn(period);
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to load leaderboard');
      }
      let list = [];
      if (result?.stories && Array.isArray(result.stories)) list = result.stories;
      else if (Array.isArray(result)) list = result;
      setRows(list.map(e => normalize(e, lens)));
    } catch (err) {
      console.error('Leaderboard load error:', err);
      setError('Failed to load leaderboard');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-shell__inner page-shell__inner--story">
        <button onClick={onBack} className="btn-back" style={{ marginBottom: '16px' }}>← Back</button>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9em', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Leaderboards
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px', fontSize: '0.95em' }}>
          Different ways of noticing great writing on Calm Stories.
        </p>

        {/* Lens tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {LENSES.map(l => (
            <button
              key={l.key}
              onClick={() => setLens(l.key)}
              className={`leaderboard__tab${lens === l.key ? ' leaderboard__tab--active' : ''}`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {lens === 'top' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`leaderboard__tab${period === p ? ' leaderboard__tab--active' : ''}`}
              >
                {p === 'all-time' ? 'ALL-TIME' : p.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <p style={{ fontSize: '0.85em', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
          {LENSES.find(l => l.key === lens).desc}
        </p>

        <SkeletonRegion
          loading={regionLoading}
          minHeight={320}
          skeleton={
            <div>{Array.from({ length: 5 }).map((_, i) => <SkeletonLeaderboardRow key={i} />)}</div>
          }
        >
          {error ? (
            <div className="leaderboard__error">{error}</div>
          ) : rows.length === 0 ? (
            <div className="leaderboard__empty">No stories on this board yet.</div>
          ) : (
            <div className="leaderboard__rows">
              {rows.map((entry, index) => (
                <div
                  key={entry.id || index}
                  onClick={() => entry.id && navigate(`/story/${entry.id}`)}
                  className={`leaderboard__row${index < 3 ? ' leaderboard__row--top' : ''}`}
                >
                  <div className="leaderboard__rank">{index + 1}.</div>
                  <div className="leaderboard__info">
                    <div className={`leaderboard__story-title${index < 3 ? ' leaderboard__story-title--bold' : ''}`}>
                      {entry.title}
                    </div>
                    <div className="leaderboard__author">
                      by @{entry.author || 'Anonymous'}
                      {entry.subLabel && <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)' }}>· {entry.subLabel}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SkeletonRegion>
      </div>
    </div>
  );
}