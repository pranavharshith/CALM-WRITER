import React, { useState, useEffect } from 'react';
import { getFollowingList } from '../api/api';
import { SkeletonFollowRow } from './SkeletonLoader';
import useMinLoadTime from '../hooks/useMinLoadTime';

export default function FollowingPage({ username, onBack, onProfile }) {
  const [following, setFollowing] = useState([]);
  const [rawLoading, setRawLoading] = useState(true);
  const loading = useMinLoadTime(rawLoading);
  const [error, setError] = useState('');

  useEffect(() => {
    if (username) {
      loadFollowing();
    }
  }, [username]);

  const loadFollowing = async () => {
    try {
      setRawLoading(true);
      setError('');
      const result = await getFollowingList(username, 1, 100);
      const list = Array.isArray(result)
        ? result
        : (Array.isArray(result?.following) ? result.following : null);
      if (list) {
        setFollowing(list.filter(u => u && u.username));
      } else {
        setError('Could not load the following list.');
      }
    } catch (err) {
      setError('An error occurred while fetching the list.');
      console.error('Failed to load following list:', err);
    } finally {
      setRawLoading(false);
    }
  };

  return (
    <div className="list-page">
      <div className="list-page__inner">
        <button onClick={onBack} className="btn-back mb-5">← Back to profile</button>
        <h1 className="page-title">Following @{username}</h1>
        <p className="page-sub">Writers they keep up with</p>

        {loading ? (
          <div className="list-page__stack">
            {[1, 2, 3, 4, 5].map(i => <SkeletonFollowRow key={i} />)}
          </div>
        ) : error ? (
          <div className="alert alert--error">{error}</div>
        ) : following.length === 0 ? (
          <div className="feed__empty">Not following anyone yet.</div>
        ) : (
          <div className="list-page__stack">
            {following.map((person) => (
              <button
                key={person.username}
                type="button"
                className="follow-row glass"
                onClick={() => onProfile(person.username)}
              >
                {person.profilePicture ? (
                  <img src={person.profilePicture} alt="" className="story-card__avatar" />
                ) : (
                  <div className="story-card__avatar-placeholder">
                    {person.username[0].toUpperCase()}
                  </div>
                )}
                <span>
                  <span className="follow-row__name">@{person.username}</span>
                  {person.displayName && (
                    <span className="follow-row__meta" style={{ display: 'block' }}>{person.displayName}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
