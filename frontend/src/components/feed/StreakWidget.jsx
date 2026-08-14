import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserStats } from '../../api/api';
import useRegionLoading from '../../hooks/useRegionLoading';
import useToast from '../../hooks/useToast';
import { MedalIcon } from '../../icons/Icons';

const RING = 2 * Math.PI * 22;

export default function StreakWidget({ onWrite }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [rawLoading, setRawLoading] = useState(true);
  const loading = useRegionLoading(rawLoading);

  useEffect(() => {
    fetchUserStats()
      .then(res => {
        if (res.success) {
          setStats(res.stats);
          if (res.stats?.freezeJustEarned) {
            toast.info('A freeze token is waiting if you miss a day.');
          } else if (res.stats?.freezeJustUsed) {
            toast.info('A freeze kept your streak.');
          } else if (res.stats?.newBadges?.length) {
            toast.info(`Unlocked: ${res.stats.newBadges[0].title}`);
          }
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setRawLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="streak-widget" aria-busy="true">
        <div className="streak-widget__header">
          <span>Writing streak</span>
        </div>
        <div className="streak-widget__top">
          <div className="skeleton-shimmer streak-widget__ring-sk" />
          <div className="streak-widget__copy">
            <div className="skeleton-shimmer" style={{ width: '70%', height: 14, marginBottom: 8 }} />
            <div className="skeleton-shimmer" style={{ width: '92%', height: 11 }} />
          </div>
        </div>
      </div>
    );
  }
  if (!stats) return null;

  const {
    currentStreak = 0,
    todayWordCount = 0,
    dailyWordGoal = 300,
    goalProgress = 0,
    freezeTokens = 0,
    badgeCount = 0,
    heatmap = [],
  } = stats;

  const offset = RING * (1 - Math.min(1, Math.max(0, goalProgress)));

  return (
    <div className="streak-widget">
      <div className="streak-widget__header">
          <span>Writing streak</span>
          <button
            type="button"
            className="streak-widget__badge-btn"
            onClick={() => navigate('/achievements')}
            aria-label={badgeCount > 0 ? `${badgeCount} badges` : 'Badges'}
            title="Badges"
          >
            <MedalIcon size={16} />
            {badgeCount > 0 && <span className="streak-widget__badge-dot" />}
          </button>
        </div>

      <div className="streak-widget__top">
        <div
          className="streak-widget__dial"
          role="img"
          aria-label={`${todayWordCount} of ${dailyWordGoal} words today`}
        >
          <svg viewBox="0 0 52 52" className="streak-widget__ring" aria-hidden="true">
            <circle className="streak-widget__ring-track" cx="26" cy="26" r="22" />
            <circle
              className="streak-widget__ring-value"
              cx="26"
              cy="26"
              r="22"
              strokeDasharray={RING}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="streak-widget__dial-label">
            <span className="streak-widget__num">{currentStreak}</span>
            <span className="streak-widget__unit">day</span>
          </div>
        </div>

        <div className="streak-widget__copy">
          <div className="streak-widget__lead">
            {currentStreak > 0
              ? <><b>{currentStreak}</b>-day writing streak.</>
              : 'Write today to start your streak.'}
          </div>
          <div className="streak-widget__meta">
            {todayWordCount} / {dailyWordGoal} words today
          </div>
        </div>
      </div>

      {heatmap.length > 0 && (
        <div className="streak-widget__heat" aria-hidden="false" role="img" aria-label="Writing calendar">
          {heatmap.map((cell) => (
            <span
              key={cell.date}
              className={`streak-widget__cell streak-widget__cell--${cell.intensity || 0}`}
              title={cell.wordCount
                ? `${cell.date}: ${cell.wordCount} words`
                : `${cell.date}: no published words`}
            />
          ))}
        </div>
      )}

      {freezeTokens > 0 && (
        <p className="streak-widget__freeze">
          {freezeTokens} freeze{freezeTokens === 1 ? '' : 's'} ready
        </p>
      )}

      <div className="streak-widget__actions">
        <button type="button" onClick={onWrite} className="btn btn--secondary streak-widget__write">
          {todayWordCount > 0 ? 'Keep writing' : 'Write something today'}
        </button>
      </div>
    </div>
  );
}
