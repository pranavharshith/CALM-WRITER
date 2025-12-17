import React, { useState, useEffect } from 'react';
import { fetchLeaderboard } from '../api/api';

export default function Leaderboard({ onUserClick }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const result = await fetchLeaderboard(period);
      setLeaderboard(result.leaderboard || []);
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const periodLabels = {
    '24h': 'Last 24 Hours',
    '3d': 'Last 3 Days',
    '1w': 'Last Week'
  };

  const getRankEmoji = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 4px #efefee',
      height: 'fit-content',
      position: 'sticky',
      top: '100px'
    }}>
      <div style={{
        fontSize: '1.2em',
        fontWeight: '500',
        marginBottom: '16px',
        color: '#333',
        textAlign: 'center'
      }}>
        🏆 Top Writers
      </div>

      {/* Period Selector */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '20px',
        background: '#f8f9fa',
        borderRadius: '6px',
        padding: '4px'
      }}>
        {['24h', '3d', '1w'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              flex: 1,
              padding: '6px 8px',
              background: period === p ? '#fff' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.8em',
              cursor: 'pointer',
              color: period === p ? '#333' : '#666',
              boxShadow: period === p ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
            }}>
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#666',
          fontSize: '0.9em'
        }}>
          Loading...
        </div>
      ) : error ? (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#d44',
          fontSize: '0.9em'
        }}>
          {error}
        </div>
      ) : leaderboard.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#666',
          fontSize: '0.9em'
        }}>
          No data for {periodLabels[period].toLowerCase()}
        </div>
      ) : (
        <div>
          <div style={{
            fontSize: '0.8em',
            color: '#666',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            {periodLabels[period]}
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {leaderboard.map((user, index) => (
              <div
                key={user.internalId}
                onClick={() => onUserClick(user.username)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: index < 3 ? '#f8f9fa' : 'transparent',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = index < 3 ? '#f8f9fa' : 'transparent';
                }}>
                
                <div style={{
                  fontSize: '0.9em',
                  minWidth: '24px',
                  textAlign: 'center'
                }}>
                  {getRankEmoji(index)}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.85em',
                    fontWeight: index < 3 ? '500' : 'normal',
                    color: '#333',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    @{user.username}
                  </div>
                  <div style={{
                    fontSize: '0.75em',
                    color: '#666'
                  }}>
                    {user.storyCount} {user.storyCount === 1 ? 'story' : 'stories'}
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8em',
                  color: '#666'
                }}>
                  <span>👍</span>
                  <span>{user.totalLikes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}