import React, { useState, useEffect } from 'react';
import { fetchAchievements } from '../../api/api';
import { SkeletonAchievements } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';

export default function Achievements({ onBack }) {
  const [earned, setEarned] = useState([]);
  const [locked, setLocked] = useState([]);
  const [rawLoading, setRawLoading] = useState(true);
  const [error, setError] = useState('');
  const showT0 = useMinLoadTime(rawLoading);

  useEffect(() => {
    fetchAchievements()
      .then((res) => {
        if (res.success === false) throw new Error(res.error || 'Failed');
        setEarned(res.earned || []);
        setLocked(res.locked || []);
      })
      .catch(() => setError('Could not load badges.'))
      .finally(() => setRawLoading(false));
  }, []);

  if (showT0) return <SkeletonAchievements />;

  const total = earned.length + locked.length;

  return (
    <div className="page-shell">
      <div className="page-shell__inner page-shell__inner--page achievements">
        <button type="button" onClick={onBack} className="btn-back">← Back</button>

        <header className="achievements__hero">
          <h1 className="page-title">Your case</h1>
          <p className="page-sub">
            {earned.length === 0
              ? 'A quiet shelf for marks you earn by writing. Nothing to grind.'
              : `${earned.length} of ${total} marks in the case.`}
          </p>
        </header>

        {error && <div className="feed__error" role="alert">{error}</div>}

        <section className="achievements__case" aria-label="Earned badges">
          {earned.length === 0 ? (
            <p className="achievements__empty">The case is empty. Publish a story and the first mark appears here.</p>
          ) : (
            <ul className="achievements__grid">
              {earned.map((badge) => (
                <li key={badge.id} className="achievements__medal achievements__medal--earned">
                  <div className="achievements__disc" aria-hidden="true">
                    <span className="achievements__glyph">{badge.mark || badge.title.charAt(0)}</span>
                  </div>
                  <p className="achievements__name">{badge.title}</p>
                  <p className="achievements__when">
                    {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : 'Earned'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {locked.length > 0 && (
          <section className="achievements__section" aria-label="Locked badges">
            <h2 className="achievements__heading">Still waiting</h2>
            <ul className="achievements__grid achievements__grid--locked">
              {locked.map((badge) => (
                <li key={badge.id} className="achievements__medal achievements__medal--locked">
                  <div className="achievements__disc achievements__disc--locked" aria-hidden="true">
                    <span className="achievements__glyph">{badge.mark || '?'}</span>
                  </div>
                  <p className="achievements__name">{badge.title}</p>
                  <p className="achievements__hint">{badge.hint}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
