import React, { useState, useEffect } from 'react';
import { fetchTopStories } from '../api/api';
import { useNavigate } from 'react-router-dom';
import { SkeletonLeaderboardRow } from './SkeletonLoader';
import { HeartIcon, RefreshIcon } from '../icons/Icons';
import useRegionLoading from '../hooks/useRegionLoading';

const PERIOD_KEY = 'calmstories_leaderboard_period';

const periodLabels = {
  '24h': 'Last 24 Hours',
  '3d': 'Last 3 Days',
  '1w': 'Last Week',
  'all-time': 'All-Time Best',
};

const PERIODS = ['24h', '3d', '1w', 'all-time'];

export default function Leaderboard({ onViewAll }) {
  const navigate = useNavigate();

  // Restore last-used tab from localStorage, fall back to '24h'
  const [period, setPeriod] = useState(() => {
    const saved = localStorage.getItem(PERIOD_KEY);
    return PERIODS.includes(saved) ? saved : '24h';
  });

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const regionLoading = useRegionLoading(loading);

  // Persist selected period whenever it changes
  useEffect(() => {
    localStorage.setItem(PERIOD_KEY, period);
    loadLeaderboard(false);
  }, [period]);

  const loadLeaderboard = async (isRefresh = false) => {
    const started = Date.now();
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError('');

      const result = await fetchTopStories(period, 10);

      let newStories = [];
      if (result?.data && Array.isArray(result.data)) newStories = result.data;
      else if (result?.stories && Array.isArray(result.stories)) newStories = result.stories;
      else if (Array.isArray(result)) newStories = result;

      setLeaderboard(newStories);
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
      const wait = isRefresh ? Math.max(0, 450 - (Date.now() - started)) : 0;
      if (wait) await new Promise((r) => setTimeout(r, wait));
      setRefreshing(false);
    }
  };

  const handlePeriodChange = (p) => {
    if (p !== period) setPeriod(p);
  };

  return (
    <div className="leaderboard">
      {/* Title row */}
      <div className="leaderboard__header">
        <span className="leaderboard__title">Top Stories</span>
        <button
          type="button"
          onClick={() => { if (!refreshing) loadLeaderboard(true); }}
          title="Refresh leaderboard"
          aria-label="Refresh leaderboard"
          aria-busy={refreshing}
          className={`leaderboard__refresh-btn${refreshing ? ' is-busy' : ''}`}
        >
          <span className={`leaderboard__refresh-icon${refreshing ? ' is-spinning' : ''}`} aria-hidden="true">
            <RefreshIcon size={15} />
          </span>
        </button>
      </div>

      {/* Period tabs */}
      <div className="leaderboard__tabs">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={`leaderboard__tab${period === p ? ' leaderboard__tab--active' : ''}`}
          >
            {p === 'all-time' ? 'ALL-TIME' : p.toUpperCase()}
          </button>
        ))}
      </div>

      {/* View all link */}
      {onViewAll && (
        <div style={{ padding: '0 14px', textAlign: 'right', margin: '4px 0 0' }}>
          <button
            onClick={() => onViewAll()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8em',
              color: 'var(--sage-dark)', padding: '2px 0'
            }}
          >
            View all leaderboards →
          </button>
        </div>
      )}

      {/* Content — only the list region loads; chrome stays put */}
      {regionLoading ? (
        <div className="leaderboard__body" aria-busy="true">
          <div className="leaderboard__period-label">{periodLabels[period]}</div>
          <div className="leaderboard__rows">
            {[1, 2, 3, 4, 5].map(i => <SkeletonLeaderboardRow key={i} />)}
          </div>
        </div>
      ) : error ? (
        <div className="leaderboard__error">{error}</div>
      ) : leaderboard.length === 0 ? (
        <div className="leaderboard__empty">No data for {periodLabels[period].toLowerCase()}</div>
      ) : (
        <div className={`leaderboard__body${refreshing ? ' is-refreshing' : ''}`}>
          <div className="leaderboard__period-label">{periodLabels[period]}</div>
          <div className="leaderboard__rows">
            {leaderboard.map((entry, index) => (
              <div
                key={entry._id || entry.storyId}
                onClick={() => navigate(`/story/${entry._id || entry.storyId}`)}
                className={`leaderboard__row${index < 3 ? ' leaderboard__row--top' : ''}${refreshing ? ' leaderboard__row--refreshing' : ''}`}
              >
                <div className="leaderboard__rank">{index + 1}.</div>

                <div className="leaderboard__info">
                  <div className={`leaderboard__story-title${index < 3 ? ' leaderboard__story-title--bold' : ''}`}>
                    {entry.title || entry.storyTitle}
                  </div>
                  <div className="leaderboard__author">
                    by @{entry.authorUsername || entry.username}
                  </div>
                </div>

                {/* Like heart icon */}
                <div className="leaderboard__likes">
                  <span className="leaderboard__heart-icon"><HeartIcon size={12} fill="currentColor" /></span>
                  <span>{entry.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}