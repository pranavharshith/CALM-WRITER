import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import UsernameSetup from './components/UsernameSetup';
import CommunityFeed from './components/CommunityFeed';
import StoryReader from './components/StoryReader';
import WriteScreen from './components/WriteScreen';
import PrivateArchive from './components/PrivateArchive';
import UserProfile from './components/UserProfile';
import ThreadView from './components/ThreadView';
import ModerationDashboard from './components/ModerationDashboard';
import Bookmarks from './components/Bookmarks';
import MyStories from './components/MyStories';
import FollowingPage from './components/FollowingPage';
import UserStories from './components/UserStories';
import { fetchCurrentUser, trackReadSession } from './api/api';

export default function App() {
  const [screen, setScreen] = useState('loading'); // loading, login, username-setup, community, read, write, profile, bookmarks, thread, moderation, my-stories, following, user-stories
  const [currentStory, setCurrentStory] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const [storiesUsername, setStoriesUsername] = useState('');
  const [followingUsername, setFollowingUsername] = useState('');

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
    setCurrentThreadId(null);
  };

  const handleViewBookmarks = () => {
    setScreen('bookmarks');
  };

  const handleViewMyStories = () => {
    setScreen('my-stories');
  };

  const handleViewFollowing = (username) => {
    setFollowingUsername(username);
    setScreen('following');
  };

  const handleViewUserStories = (username) => {
    setStoriesUsername(username);
    setScreen('user-stories');
  };

  const handleViewThread = (storyId) => {
    setCurrentThreadId(storyId);
    setScreen('thread');
  };

  const handleModeration = () => {
    setScreen('moderation');
  };

  const handleLogout = () => {
    localStorage.removeItem('calmstories_user');
    localStorage.removeItem('calmstories_internal_id');
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
          onViewThread={handleViewThread}
          onModeration={handleModeration}
        />
      )}
      
      {screen === 'read' && currentStory && (
        <StoryReader 
          story={currentStory}
          onBack={handleBackToCommunity}
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
          currentUser={user}
          onLogout={handleLogout}
          onViewBookmarks={handleViewBookmarks}
          onViewMyStories={handleViewMyStories}
          onViewFollowing={handleViewFollowing}
          onViewUserStories={handleViewUserStories}
        />
      )}
      
      {screen === 'bookmarks' && (
        <Bookmarks 
          onBack={() => {
            if (profileUsername) {
              setScreen('profile');
            } else {
              handleBackToCommunity();
            }
          }}
          onReadStory={handleReadStory}
          onProfile={handleProfile}
        />
      )}
      
      {screen === 'thread' && currentThreadId && (
        <ThreadView 
          storyId={currentThreadId}
          user={user}
          onBack={handleBackToCommunity}
        />
      )}
      
      {screen === 'user-stories' && (
        <UserStories
          username={storiesUsername}
          onBack={() => setScreen('profile')}
          onReadStory={handleReadStory}
          onProfile={handleProfile}
          currentUser={user}
        />
      )}

      {screen === 'following' && (
        <FollowingPage
          username={followingUsername}
          onBack={() => setScreen('profile')}
          onProfile={handleProfile}
        />
      )}

      {screen === 'my-stories' && (
        <MyStories
          user={user}
          onBack={() => setScreen('profile')}
          onReadStory={handleReadStory}
          onProfile={handleProfile}
        />
      )}

      {screen === 'moderation' && (
        <ModerationDashboard 
          user={user}
          onBack={handleBackToCommunity}
        />
      )}
    </div>
  );
}