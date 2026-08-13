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
        const newUsername = result.user?.username || result.username;
        const updatedUser = { ...user, username: newUsername, needsUsername: false };
        localStorage.setItem('calmstories_user', JSON.stringify(updatedUser));
        localStorage.setItem('username', newUsername);
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
      background: 'transparent',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: 'var(--glass-bg-strong)',
        padding: '40px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)'
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
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
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
              background: (loading || !username.trim()) ? 'var(--bg-active)' : 'var(--accent)',
              color: (loading || !username.trim()) ? 'var(--text-muted)' : 'var(--accent-contrast)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '1em',
              cursor: (loading || !username.trim()) ? 'not-allowed' : 'pointer'
            }}>
            {loading ? 'Setting up...' : 'Continue to Community'}
          </button>
        </form>

        {error && (
          <div style={{
            color: 'var(--rose-dark)',
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