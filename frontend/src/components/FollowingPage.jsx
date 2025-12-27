import React, { useState, useEffect } from 'react';
import { getFollowingList } from '../api/api';

export default function FollowingPage({ username, onBack, onProfile }) {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

    useEffect(() => {
    if (username) {
      loadFollowing();
    }
  }, [username]);

  const loadFollowing = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getFollowingList(username);
      if (Array.isArray(result)) {
        setFollowing(result);
      } else {
        setError('Could not load the following list.');
      }
    } catch (err) {
      setError('An error occurred while fetching the list.');
      console.error('Failed to load following list:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fefefd', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button 
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '0.9em',
            cursor: 'pointer',
            marginBottom: '30px'
          }}>
          ← Back to Profile
        </button>

        <h1 style={{ fontSize: '2em', marginBottom: '30px', color: '#333' }}>Following @{username}</h1>

        {loading ? (
          <div style={{ opacity: 0.6 }}>Loading...</div>
        ) : error ? (
          <div style={{ color: '#d44' }}>{error}</div>
        ) : following.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.5, fontSize: '1.1em' }}>
            Not following anyone yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {following.map((user) => (
              <div 
                key={user.username} 
                style={{ 
                  padding: '20px', 
                  background: '#fff', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  cursor: 'pointer' 
                }}
                onClick={() => onProfile(user.username)}
              >
                <span style={{ fontSize: '1.2em', color: '#333' }}>@{user.username}</span>
                {user.displayName && <span style={{ marginLeft: '10px', color: '#777' }}>({user.displayName})</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
