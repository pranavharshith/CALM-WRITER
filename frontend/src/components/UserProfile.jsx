import React, { useState, useEffect } from 'react';
import { fetchUserProfile } from '../api/api';

export default function UserProfile({ username, onBack, onReadStory }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await fetchUserProfile(username);
      
      if (result && result.user) {
        setProfile(result);
      } else {
        setError('Profile not found or invalid data');
      }
    } catch (err) {
      console.error('Profile load error:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fefefd'
      }}>
        <div style={{ opacity: 0.6 }}>Loading profile...</div>
      </div>
    );
  }

  if (error || !profile || !profile.user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fefefd',
        padding: '20px'
      }}>
        <div style={{ color: '#d44', marginBottom: '20px' }}>
          {error || 'Profile not found'}
        </div>
        <button onClick={onBack} style={{ padding: '10px 20px' }}>
          Back to Community
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fefefd',
      padding: '20px'
    }}>
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
          ← Back to Community
        </button>

        {/* Profile Header */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '32px',
          boxShadow: '0 1px 4px #efefee',
          marginBottom: '30px'
        }}>
          <div style={{
            fontSize: '2em',
            marginBottom: '8px',
            color: '#333'
          }}>
            @{profile.user.username}
          </div>
          
          {profile.user.displayName && (
            <div style={{
              fontSize: '1.2em',
              color: '#666',
              marginBottom: '16px'
            }}>
              {profile.user.displayName}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '16px',
            fontSize: '0.9em',
            color: '#666'
          }}>
            <span>{profile.stats.totalStories} stories</span>
            <span>{profile.stats.totalLikes} total likes</span>
            <span>Joined {formatDate(profile.user.joinedAt)}</span>
          </div>
        </div>

        {/* Stories */}
        <div style={{
          fontSize: '1.3em',
          marginBottom: '20px',
          opacity: 0.8
        }}>
          Stories by @{profile.user.username}
        </div>

        {profile.stories.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            opacity: 0.5,
            fontSize: '1.1em'
          }}>
            No stories yet.
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {profile.stories.map(story => (
              <div
                key={story._id}
                onClick={() => onReadStory(story)}
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '24px',
                  boxShadow: '0 1px 4px #efefee',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 2px 8px #e0e0e0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = '0 1px 4px #efefee';
                }}>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    color: '#999',
                    fontSize: '0.9em'
                  }}>
                    {formatDate(story.createdAt)}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#666',
                    fontSize: '0.9em'
                  }}>
                    <span>👍</span>
                    <span>{story.likes || 0}</span>
                  </div>
                </div>

                {story.title && (
                  <div style={{
                    fontSize: '1.2em',
                    fontWeight: '500',
                    marginBottom: '12px',
                    color: '#333',
                    lineHeight: '1.4'
                  }}>
                    {story.title}
                  </div>
                )}

                <div style={{
                  fontSize: '1em',
                  lineHeight: '1.6',
                  color: '#555',
                  whiteSpace: 'pre-wrap'
                }}>
                  {story.preview}
                </div>

                <div style={{
                  marginTop: '16px',
                  fontSize: '0.9em',
                  color: '#666',
                  opacity: 0.8
                }}>
                  Read full story →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}