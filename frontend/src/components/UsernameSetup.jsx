import React, { useState } from 'react';
import { setupUsername } from '../api/api';

export default function UsernameSetup({ user, onComplete }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      setError('Username must be 3-20 characters, letters, numbers, and underscores only');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await setupUsername(user.internalId, username.trim());
      if (result.success) {
        // Update stored user info
        const updatedUser = { ...user, username: result.username, needsUsername: false };
        localStorage.setItem('calmstories_user', JSON.stringify(updatedUser));
        onComplete(updatedUser);
      } else {
        setError(result.error || 'Failed to set username');
      }
    } catch (error) {
      setError('Failed to set username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: '#fff',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 1px 8px #efefee'
      }}>
        <div style={{
          fontSize: '1.5em',
          marginBottom: '20px',
          textAlign: 'center',
          opacity: 0.8
        }}>
          Choose Your Username
        </div>

        <div style={{
          fontSize: '0.9em',
          opacity: 0.6,
          marginBottom: '30px',
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          This will be how other readers see you in the community. 
          You can use letters, numbers, and underscores.
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.9em',
              opacity: 0.7
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1em'
              }}
              placeholder="your_username"
              maxLength={20}
              disabled={loading}
            />
            <div style={{
              fontSize: '0.8em',
              opacity: 0.5,
              marginTop: '5px'
            }}>
              3-20 characters, letters, numbers, and underscores only
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim()}
            style={{
              width: '100%',
              padding: '12px',
              background: (loading || !username.trim()) ? '#bbb' : '#222',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1em',
              cursor: (loading || !username.trim()) ? 'not-allowed' : 'pointer'
            }}>
            {loading ? 'Setting up...' : 'Continue to Community'}
          </button>
        </form>

        {error && (
          <div style={{
            color: '#d44',
            fontSize: '0.9em',
            marginTop: '15px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}