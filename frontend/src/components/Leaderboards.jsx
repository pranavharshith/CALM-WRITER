import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchMostFeltLeaderboard,
  fetchQuietlyPowerfulLeaderboard,
  fetchGrowingStoriesLeaderboard,
  fetchTopStories
} from '../api/api';
import { SkeletonLeaderboardRow } from './SkeletonLoader';

const LENSES = [
  { key: 'top', label: 'Top Stories', desc: 'The most-liked stories right now.', fn: (l) => fetchTopStories(l === 'all-time' ? 'all-time' : l === '1w' ? '1w' : l === '3d' ? '3d' : '24h', 20) },
  { key: 'mostFelt', label: 'Most Felt', desc: 'Stories that moved people deeply.', fn: () => fetchMostFeltLeaderboard(20) },
  { key: 'quietly', label: 'Quietly Powerful', desc: 'Stories with quiet depth and meaning.', fn: () => fetchQuietlyPowerfulLeaderboard(20) },
  { key: 'growing', label: 'Growing Stories', desc: 'Stories gaining momentum.', fn: () => fetchGrowingStoriesLeaderboard(20, 7) }
];

const PERIODS = ['24h', '3d', '1w', 'all-time'];

function normalize(entry, lens) {
  // Shared fields across lenses
  const id = entry._id || entry.storyId;
  const title = entry.title || entry.storyTitle;
  const author = entry.authorUsername || entry.username;
  const subLabel =
    entry.reactions != null ? `${entry.reactions} reactions` :
    entry.likesPerDay != null ? `${entry.likesPerDay} likes/day · ${entry.likes} total` :
    entry.likes != null ? `${entry.likes} likes` : '';

  return { id, title, author, subLabel };
}

export default function Leaderboards({ onBack }) {
  const navigate = useNavigate();
  const [lens, setLens] = useState('top');
  const [period, setPeriod] = useState('1w');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '20px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
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

        {/* Rows */}
        {loading ? (
          <div>{Array.from({ length: 5 }).map((_, i) => <SkeletonLeaderboardRow key={i} />)}</div>
        ) : error ? (
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
      </div>
    </div>
  );
}