import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import LoginScreen from './components/LoginScreen';
import UsernameSetup from './components/UsernameSetup';
import CommunityFeed from './components/CommunityFeed';
import StoryReader from './components/StoryReader';
import WriteScreen from './components/WriteScreen';
import PrivateArchive from './components/PrivateArchive';
import UserProfile from './components/UserProfile';
import ThreadView from './components/ThreadView';
import ModerationDashboard from './components/ModerationDashboard';
import AdminDashboard from './components/AdminDashboard';
import Bookmarks from './components/Bookmarks';
import MyStories from './components/MyStories';
import FollowingPage from './components/FollowingPage';
import UserStories from './components/UserStories';
import { fetchCurrentUser, trackReadSession, fetchStoryById } from './api/api';

// Wrapper components for routes that need params
function StoryReaderRoute() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStory = async () => {
      try {
        const storyData = await fetchStoryById(storyId);
        setStory(storyData);
      } catch (error) {
        console.error('Failed to load story:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStory();
  }, [storyId]);

  const handleLike = (storyId, updates) => {
    setStory(prevStory => ({
      ...prevStory,
      likes: updates.likes,
      isLikedByUser: updates.isLikedByUser
    }));
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (!story) return <div style={{ padding: '20px' }}>Story not found</div>;

  return <StoryReader story={story} onBack={() => navigate('/community')} onLike={handleLike} />;
}

function UserProfileRoute() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  return (
    <UserProfile
      username={username}
      onBack={() => navigate('/community')}
      onReadStory={(story) => navigate(`/story/${story._id}`)}
      currentUser={user}
      onLogout={() => {
        localStorage.removeItem('calmstories_user');
        localStorage.removeItem('calmstories_internal_id');
        navigate('/login');
      }}
      onViewBookmarks={() => navigate('/bookmarks')}
      onViewMyStories={() => navigate('/my-stories')}
      onViewFollowing={(username) => navigate(`/following/${username}`)}
      onViewUserStories={(username) => navigate(`/user/${username}/stories`)}
    />
  );
}

function ThreadViewRoute() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  return <ThreadView storyId={storyId} user={user} onBack={() => navigate('/community')} />;
}

function FollowingPageRoute() {
  const { username } = useParams();
  const navigate = useNavigate();

  return (
    <FollowingPage
      username={username}
      onBack={() => navigate(`/profile/${username}`)}
      onProfile={(username) => navigate(`/profile/${username}`)}
    />
  );
}

function UserStoriesRoute() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  return (
    <UserStories
      username={username}
      onBack={() => navigate(`/profile/${username}`)}
      onReadStory={(story) => navigate(`/story/${story._id}`)}
      onProfile={(username) => navigate(`/profile/${username}`)}
      currentUser={user}
    />
  );
}

function AppContent() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const savedUser = localStorage.getItem('calmstories_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);

        try {
          const currentUser = await fetchCurrentUser();
          if (currentUser.internalId) {
            setUser(currentUser);

            if (currentUser.needsUsername) {
              navigate('/username-setup');
            } else if (window.location.pathname === '/login' || window.location.pathname === '/') {
              navigate('/community');
            }
          } else {
            localStorage.removeItem('calmstories_user');
            localStorage.removeItem('calmstories_internal_id');
            navigate('/login');
          }
        } catch (userError) {
          localStorage.removeItem('calmstories_user');
          localStorage.removeItem('calmstories_internal_id');
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('calmstories_user');
      localStorage.removeItem('calmstories_internal_id');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    if (userData.needsUsername) {
      navigate('/username-setup');
    } else {
      navigate('/community');
    }
  };

  const handleUsernameComplete = (userData) => {
    setUser(userData);
    navigate('/community');
  };

  if (loading) {
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

      <Routes>
        <Route path="/login" element={<LoginScreen onLogin={handleLogin} />} />
        <Route path="/username-setup" element={<UsernameSetup user={user} onComplete={handleUsernameComplete} />} />
        <Route path="/community" element={
          <CommunityFeed
            user={user}
            onReadStory={(story) => navigate(`/story/${story._id}`)}
            onWriteStory={() => navigate('/write')}
            onProfile={(username) => navigate(`/profile/${username}`)}
            onViewThread={(storyId) => navigate(`/thread/${storyId}`)}
            onModeration={() => navigate('/moderation')}
            onAdmin={() => navigate('/admin')}
          />
        } />
        <Route path="/story/:storyId" element={<StoryReaderRoute />} />
        <Route path="/write" element={
          <WriteScreen
            onBack={() => navigate('/community')}
            user={user}
            setUser={setUser}
          />
        } />
        <Route path="/profile/:username" element={<UserProfileRoute />} />
        <Route path="/bookmarks" element={
          <Bookmarks
            onBack={() => navigate('/community')}
            onReadStory={(story) => navigate(`/story/${story._id}`)}
            onProfile={(username) => navigate(`/profile/${username}`)}
          />
        } />
        <Route path="/thread/:storyId" element={<ThreadViewRoute />} />
        <Route path="/my-stories" element={
          <MyStories
            user={user}
            onBack={() => navigate(`/profile/${user?.username}`)}
            onReadStory={(story) => navigate(`/story/${story._id}`)}
            onProfile={(username) => navigate(`/profile/${username}`)}
          />
        } />
        <Route path="/following/:username" element={<FollowingPageRoute />} />
        <Route path="/user/:username/stories" element={<UserStoriesRoute />} />
        <Route path="/admin" element={
          user && user.role === 'admin' && user.email === 'pranav.dot.h@gmail.com' ? (
            <AdminDashboard
              user={user}
              onBack={() => navigate('/community')}
            />
          ) : (
            <Navigate to="/community" replace />
          )
        } />
        <Route path="/moderation" element={
          <ModerationDashboard
            user={user}
            onBack={() => navigate('/community')}
          />
        } />
        <Route path="/" element={<Navigate to="/community" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </HelmetProvider>
  );
}