import React, { useState, useEffect } from 'react';
import { fetchUserStats } from '../api/api';
import useRegionLoading from '../hooks/useRegionLoading';

export default function StreakWidget({ onWrite }) {
  const [stats, setStats] = useState(null);
  const [rawLoading, setRawLoading] = useState(true);
  const loading = useRegionLoading(rawLoading);

  useEffect(() => {
    fetchUserStats()
      .then(res => {
        if (res.success) setStats(res.stats);
      })
      .catch(() => { /* silent */ })
      .finally(() => setRawLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="streak-widget" aria-busy="true">
        <div className="streak-widget__header">Writing streak</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 0 8px' }}>
          <div className="skeleton-shimmer" style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-shimmer" style={{ width: '70%', height: 14, marginBottom: 8 }} />
            <div className="skeleton-shimmer" style={{ width: '92%', height: 11 }} />
          </div>
        </div>
      </div>
    );
  }
  if (!stats) return null;

  const { currentStreak, todayWordCount, totalStories, totalWords, storiesRead } = stats;

  const cells = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Approximate: mark only via streak, not calendar — keep it honest + light
    cells.push(d);
  }

  return (
    <div className="streak-widget">
      <div className="streak-widget__header">Writing streak</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px 8px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: currentStreak > 0 ? 'var(--sage)' : 'var(--bg-active)',
          color: currentStreak > 0 ? 'var(--sage-contrast)' : 'var(--text-tertiary)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: '1.15em', fontWeight: '700', lineHeight: 1 }}>{currentStreak}</span>
          <span style={{ fontSize: '0.68em', textTransform: 'uppercase', letterSpacing: '0.04em' }}>day</span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.9em', color: 'var(--text-primary)' }}>
            {currentStreak > 0
              ? <><b>{currentStreak}</b>-day writing streak.</>
              : 'Write today to start your streak.'}
          </div>
          <div style={{ fontSize: '0.82em', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {todayWordCount > 0
              ? `${todayWordCount} words today · ${totalStories} story${totalStories === 1 ? '' : 's'} · ${totalWords.toLocaleString()} words`
              : `${storiesRead} stories read · ${totalStories} published`}
          </div>
        </div>
      </div>

      {/* 14-day gentle dot strip */}
      <div style={{ display: 'flex', gap: '5px', padding: '4px 16px 14px' }}>
        {cells.map(d => {
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={d.toISOString()} title={d.toLocaleDateString()} style={{
              width: '11px', height: '11px', borderRadius: '3px',
              background:
                isToday && todayWordCount > 0 ? 'var(--sage-dark)' :
                isToday ? 'var(--sage)' :
                (currentStreak > 0 && !isToday ? 'var(--sage-light)' : 'var(--bg-active)'),
              opacity: isToday ? 1 : 0.9,
              flex: 1
            }} />
          );
        })}
      </div>

      <div style={{ padding: '0 16px 14px' }}>
        <button
          onClick={onWrite}
          className="btn btn--secondary"
          style={{ width: '100%', fontSize: '0.85em' }}
        >
          {todayWordCount > 0 ? 'Keep writing' : 'Write something today'}
        </button>
      </div>
    </div>
  );
}