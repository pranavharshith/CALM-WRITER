import React, { useState, useEffect } from 'react';
import { fetchTopStories } from '../api/api';
import { useNavigate } from 'react-router-dom';
import { LIKE_COLORS } from '../styles/likeColors';
import { SkeletonLeaderboard } from './SkeletonLoader';

const PERIOD_KEY = 'calmstories_leaderboard_period';

const periodLabels = {
  '24h': 'Last 24 Hours',
  '3d': 'Last 3 Days',
  '1w': 'Last Week',
  'all-time': 'All-Time Best',
};

const PERIODS = ['24h', '3d', '1w', 'all-time'];

export default function Leaderboard() {
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

  // Persist selected period whenever it changes
  useEffect(() => {
    localStorage.setItem(PERIOD_KEY, period);
    loadLeaderboard(false);
  }, [period]);

  const loadLeaderboard = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError('');

      const result = await fetchTopStories(period);

      let newStories = [];
      if (result?.data && Array.isArray(result.data)) newStories = result.data;
      else if (result?.stories && Array.isArray(result.stories)) newStories = result.stories;
      else if (Array.isArray(result)) newStories = result;

      if (isRefresh && leaderboard.length > 0) {
        // Smart-diff: only update changed rows
        let firstChanged = -1;
        for (let i = 0; i < Math.max(newStories.length, leaderboard.length); i++) {
          const o = leaderboard[i], n = newStories[i];
          if (!o || !n || o._id !== n._id || o.likes !== n.likes) { firstChanged = i; break; }
        }
        if (firstChanged >= 0) {
          setLeaderboard(prev => {
            const updated = [...prev];
            for (let i = firstChanged; i < newStories.length; i++) updated[i] = newStories[i];
            if (updated.length > newStories.length) updated.splice(newStories.length);
            return updated;
          });
        }
      } else {
        setLeaderboard(newStories);
      }
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
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
          onClick={() => loadLeaderboard(true)}
          disabled={refreshing}
          title="Refresh leaderboard"
          className={`leaderboard__refresh-btn${refreshing ? ' leaderboard__refresh-btn--spinning' : ''}`}
        >
          ↻
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

      {/* Content */}
      {loading ? (
        <SkeletonLeaderboard />
      ) : error ? (
        <div className="leaderboard__error">{error}</div>
      ) : leaderboard.length === 0 ? (
        <div className="leaderboard__empty">No data for {periodLabels[period].toLowerCase()}</div>
      ) : (
        <div>
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
                  <div className="leaderboard__heart">
                    <div style={{ position: 'absolute', width: '12px', height: '12px', background: LIKE_COLORS.liked.primary, borderRadius: '3px' }} />
                    <div style={{ position: 'absolute', width: '12px', height: '12px', background: LIKE_COLORS.liked.secondary, borderRadius: '50%', top: '-6px', left: '0' }} />
                    <div style={{ position: 'absolute', width: '12px', height: '12px', background: LIKE_COLORS.liked.tertiary, borderRadius: '50%', left: '6px', top: '0' }} />
                  </div>
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