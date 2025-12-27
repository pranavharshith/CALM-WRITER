import React, { useState, useEffect } from 'react';
import { fetchTopStories } from '../api/api';
import { useNavigate } from 'react-router-dom';

export default function Leaderboard() {
  const navigate = useNavigate();
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
      const result = await fetchTopStories(period);
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
    '1w': 'Last Week',
    'all-time': 'All-Time Best'
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 4px #efefee',
      width: '100%',
      border: '1px solid #ddd'
    }}>
      <div style={{
        fontSize: '1.2em',
        fontWeight: '500',
        marginBottom: '16px',
        color: '#333',
        textAlign: 'left'
      }}>
        Top Stories
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
        {['24h', '3d', '1w', 'all-time'].map(p => (
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
            {p === 'all-time' ? 'ALL-TIME' : p.toUpperCase()}
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
            textAlign: 'left'
          }}>
            {periodLabels[period]}
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {leaderboard.map((entry, index) => (
              <div
                key={entry.storyId}
                onClick={() => navigate(`/story/${entry.storyId}`)}
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
                  e.currentTarget.style.background = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = index < 3 ? '#f8f9fa' : 'transparent';
                }}>

                <div style={{
                  fontSize: '0.9em',
                  minWidth: '24px',
                  textAlign: 'center',
                  color: '#999'
                }}>
                  {index + 1}.
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.85em',
                    fontWeight: index < 3 ? '500' : 'normal',
                    color: '#333',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '2px'
                  }}>
                    {entry.storyTitle}
                  </div>
                  <div style={{
                    fontSize: '0.75em',
                    color: '#666'
                  }}>
                    by @{entry.username}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8em',
                  color: '#666'
                }}>
                  <div style={{
                    position: 'relative',
                    width: '12px',
                    height: '12px',
                    transform: 'rotate(-45deg)',
                    marginRight: '2px'
                  }}>
                    <div style={{
                      position: 'absolute',
                      width: '12px',
                      height: '12px',
                      background: '#e74c3c',
                      borderRadius: '3px'
                    }} />
                    <div style={{
                      position: 'absolute',
                      width: '12px',
                      height: '12px',
                      background: '#e74c3c',
                      borderRadius: '50%',
                      top: '-6px',
                      left: '0'
                    }} />
                    <div style={{
                      position: 'absolute',
                      width: '12px',
                      height: '12px',
                      background: '#e74c3c',
                      borderRadius: '50%',
                      left: '6px',
                      top: '0'
                    }} />
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