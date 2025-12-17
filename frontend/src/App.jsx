import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import UsernameSetup from './components/UsernameSetup';
import CommunityFeed from './components/CommunityFeed';
import StoryReader from './components/StoryReader';
import WriteScreen from './components/WriteScreen';
import PrivateArchive from './components/PrivateArchive';
import UserProfile from './components/UserProfile';
import Reactions from './components/Reactions';
import { fetchCurrentUser, submitReaction, trackReadSession } from './api/api';

export default function App() {
  const [screen, setScreen] = useState('loading'); // loading, login, username-setup, community, read, write, profile, react
  const [currentStory, setCurrentStory] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileUsername, setProfileUsername] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if user exists in localStorage
      const savedUser = localStorage.getItem('calmstories_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        try {
          // Verify with server and get latest user info
          const currentUser = await fetchCurrentUser();
          if (currentUser.internalId) {
            setUser(currentUser);
            
            if (currentUser.needsUsername) {
              setScreen('username-setup');
            } else {
              setScreen('community');
            }
          } else {
            // Invalid session, clear and show login
            localStorage.removeItem('calmstories_user');
            localStorage.removeItem('calmstories_internal_id');
            setScreen('login');
          }
        } catch (userError) {
          // User doesn't exist on server, clear local data
          console.log('User not found on server, clearing local data');
          localStorage.removeItem('calmstories_user');
          localStorage.removeItem('calmstories_internal_id');
          setScreen('login');
        }
      } else {
        setScreen('login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('calmstories_user');
      localStorage.removeItem('calmstories_internal_id');
      setScreen('login');
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    if (userData.needsUsername) {
      setScreen('username-setup');
    } else {
      setScreen('community');
    }
  };

  const handleUsernameComplete = (userData) => {
    setUser(userData);
    setScreen('community');
  };

  const handleReadStory = (story) => {
    setCurrentStory(story);
    setScreen('read');
  };

  const handleReact = () => {
    if (currentStory) {
      // Track read completion
      trackReadSession(currentStory._id, 100);
      setScreen('react');
    }
  };

  const handleReactionSubmit = async (reactionType) => {
    if (currentStory) {
      try {
        await submitReaction(currentStory._id, reactionType);
        // Go back to community feed
        setScreen('community');
        setCurrentStory(null);
      } catch (error) {
        console.error('Failed to submit reaction:', error);
      }
    }
  };

  const handleWriteStory = () => {
    setScreen('write');
  };

  const handleProfile = (username) => {
    setProfileUsername(username);
    setScreen('profile');
  };

  const handleBackToCommunity = () => {
    setScreen('community');
    setCurrentStory(null);
    setProfileUsername('');
  };

  const handleLogout = () => {
    localStorage.removeItem('calmstories_user');
    setUser(null);
    setScreen('login');
  };

  if (screen === 'loading') {
    return (
      <div style={{ 
        fontFamily: 'Georgia, serif', 
        background: '#fefefd', 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ opacity: 0.6 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#fefefd', minHeight: '100vh' }}>
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#f8d7da',
          color: '#721c24',
          padding: '10px 20px',
          borderRadius: '4px',
          zIndex: 1000
        }}>
          {error}
          <button 
            onClick={() => setError('')}
            style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer' }}>
            ×
          </button>
        </div>
      )}
      
      {screen === 'login' && (
        <LoginScreen onLogin={handleLogin} />
      )}
      
      {screen === 'username-setup' && (
        <UsernameSetup user={user} onComplete={handleUsernameComplete} />
      )}
      
      {screen === 'community' && (
        <CommunityFeed 
          user={user}
          onReadStory={handleReadStory}
          onWriteStory={handleWriteStory}
          onProfile={handleProfile}
        />
      )}
      
      {screen === 'read' && currentStory && (
        <StoryReader 
          story={currentStory}
          onReact={handleReact}
          onBack={handleBackToCommunity}
        />
      )}
      
      {screen === 'react' && (
        <Reactions 
          onReactionSubmit={handleReactionSubmit}
        />
      )}
      
      {screen === 'write' && (
        <WriteScreen 
          onBack={handleBackToCommunity}
          user={user}
          setUser={setUser}
        />
      )}
      
      {screen === 'profile' && (
        <UserProfile 
          username={profileUsername}
          onBack={handleBackToCommunity}
          onReadStory={handleReadStory}
        />
      )}
    </div>
  );
}