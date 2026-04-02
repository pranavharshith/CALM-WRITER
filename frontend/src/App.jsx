import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { fetchCurrentUser, fetchStoryById } from './api/api';
import {
  AppSplashSkeleton,
  SkeletonStoryReader,
  SkeletonFeedCards,
  SkeletonLeaderboard,
  SkeletonProfile,
  SkeletonNotifications,
  SkeletonThreadView,
  SkeletonWriteScreen,
  SkeletonSettings,
  SkeletonHubsPage,
  SkeletonStoryList,
  SkeletonFollowRow,
  SkeletonHubCard
} from './components/SkeletonLoader';
import useMinLoadTime from './hooks/useMinLoadTime';
import { cacheHas, cacheGet, cachePut } from './utils/screenCache';

// Lazy load all page components
const Auth = React.lazy(() => import('./components/Auth'));
const UsernameSetup = React.lazy(() => import('./components/UsernameSetup'));
const CommunityFeed = React.lazy(() => import('./components/CommunityFeed'));
const StoryReader = React.lazy(() => import('./components/StoryReader'));
const WriteScreen = React.lazy(() => import('./components/WriteScreen'));
const PrivateArchive = React.lazy(() => import('./components/PrivateArchive'));
const UserProfile = React.lazy(() => import('./components/UserProfile'));
const ThreadView = React.lazy(() => import('./components/ThreadView'));
const ModerationDashboard = React.lazy(() => import('./components/ModerationDashboard'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const Bookmarks = React.lazy(() => import('./components/Bookmarks'));
const MyStories = React.lazy(() => import('./components/MyStories'));
const FollowingPage = React.lazy(() => import('./components/FollowingPage'));
const UserStories = React.lazy(() => import('./components/UserStories'));
const CollaborativeHubs = React.lazy(() => import('./components/CollaborativeHubs'));
const HubDetail = React.lazy(() => import('./components/HubDetail'));
const HubCreation = React.lazy(() => import('./components/HubCreation'));
const Settings = React.lazy(() => import('./components/Settings'));
const Notifications = React.lazy(() => import('./components/Notifications'));
const VerifyEmail = React.lazy(() => import('./components/VerifyEmail'));
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard'));

// Wrapper components for routes that need params
function StoryReaderRoute() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [rawLoading, setRawLoading] = useState(true);

  // Always show skeleton for at least 1 second
  const loading = useMinLoadTime(rawLoading, 1000);

  useEffect(() => {
    const loadStory = async () => {
      const cacheKey = `story:${storyId}`;

      // Use cached story (e.g. when coming back from deep page)
      if (cacheHas(cacheKey)) {
        setStory(cacheGet(cacheKey));
        setRawLoading(false);
        return;
      }

      try {
        const storyData = await fetchStoryById(storyId);
        setStory(storyData);
        if (storyData) cachePut(cacheKey, storyData);
      } catch (error) {
        console.error('Failed to load story:', error);
      } finally {
        setRawLoading(false);
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

  const handleBack = () => navigate(-1);

  if (loading) return <SkeletonStoryReader />;
  if (!story) return <div style={{ padding: '20px' }}>Story not found</div>;

  return <StoryReader story={story} onBack={handleBack} onLike={handleLike} />;
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
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('translation_')) localStorage.removeItem(key);
        });
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

  return <ThreadView storyId={storyId} user={user} onBack={() => navigate(-1)} />;
}

function FollowingPageRoute() {
  const { username } = useParams();
  const navigate = useNavigate();

  return (
    <FollowingPage
      username={username}
      onBack={() => navigate(-1)}
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
      onBack={() => navigate(-1)}
      onReadStory={(story) => navigate(`/story/${story._id}`)}
      onProfile={(username) => navigate(`/profile/${username}`)}
      currentUser={user}
    />
  );
}

function HubDetailRoute() {
  const { hubId } = useParams();
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
    <HubDetail
      hubId={hubId}
      onBack={() => navigate(-1)}
      onReadStory={(story) => navigate(`/story/${story._id}`)}
      user={user}
    />
  );
}

function AppContent() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    const handleAuthLogout = () => {
      setUser(null);
      setAuthReady(true);
      navigate('/login');
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const internalId = localStorage.getItem('calmstories_internal_id');
      if (internalId) {
        try {
          const currentUser = await fetchCurrentUser();
          if (currentUser.internalId) {
            setUser(currentUser);
            setAuthReady(true);
            if (!currentUser.username && window.location.pathname !== '/username-setup') {
              navigate('/username-setup');
            } else if (window.location.pathname === '/login' || window.location.pathname === '/') {
              navigate('/community');
            }
          } else {
            throw new Error('Invalid session');
          }
        } catch (userError) {
          if (!localStorage.getItem('accessToken')) {
            localStorage.removeItem('calmstories_internal_id');
            setAuthReady(true);
            navigate('/login');
          } else {
            setAuthReady(true);
          }
        }
      } else {
        setAuthReady(true);
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (!localStorage.getItem('accessToken')) {
        setAuthReady(true);
        navigate('/login');
      } else {
        setAuthReady(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameComplete = (userData) => {
    setUser(userData);
    navigate('/community');
  };

  if (loading) {
    return <AppSplashSkeleton />;
  }

  // Common fallbacks
  const FollowingSkeleton = () => (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ height: 30, marginBottom: 30 }} />
      {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ marginBottom: 12 }}><SkeletonFollowRow /></div>)}
    </div>
  );

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#fefefd', minHeight: '100vh' }}>
      {error && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: '#f8d7da', color: '#721c24', padding: '10px 20px', borderRadius: '4px', zIndex: 1000
        }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <Routes>
        <Route path="/login" element={
          <Suspense fallback={<div style={{ height: '100vh' }} />}>
            <Auth onAuthenticated={checkAuthStatus} />
          </Suspense>
        } />

        <Route path="/username-setup" element={
          <Suspense fallback={<div style={{ height: '100vh' }} />}>
            <UsernameSetup user={user} onComplete={handleUsernameComplete} />
          </Suspense>
        } />

        <Route path="/verify-email" element={
          <Suspense fallback={<div style={{ height: '100vh' }} />}>
            <VerifyEmail />
          </Suspense>
        } />

        <Route path="/community" element={
          authReady ? (
            <Suspense fallback={<AppSplashSkeleton />}>
              <CommunityFeed
                user={user}
                onReadStory={(story) => navigate(`/story/${story._id}`)}
                onWriteStory={() => navigate('/write')}
                onProfile={(username) => navigate(`/profile/${username}`)}
                onViewThread={(storyId) => navigate(`/thread/${storyId}`)}
                onModeration={() => navigate('/moderation')}
                onAdmin={() => navigate('/admin')}
                onHubs={() => navigate('/hubs')}
                onSettings={() => navigate('/settings')}
                onNotifications={() => navigate('/notifications')}
                onAnalytics={() => navigate('/analytics')}
              />
            </Suspense>
          ) : (
            <AppSplashSkeleton />
          )
        } />

        <Route path="/story/:storyId" element={
          <Suspense fallback={<SkeletonStoryReader />}>
            <StoryReaderRoute />
          </Suspense>
        } />

        <Route path="/write" element={
          <Suspense fallback={<SkeletonWriteScreen />}>
            <WriteScreen
              onBack={() => navigate('/community')}
              user={user}
              setUser={setUser}
            />
          </Suspense>
        } />

        <Route path="/profile/:username" element={
          <Suspense fallback={<SkeletonProfile />}>
            <UserProfileRoute />
          </Suspense>
        } />

        <Route path="/bookmarks" element={
          <Suspense fallback={<SkeletonStoryList count={5} />}>
            <Bookmarks
              onBack={() => navigate(-1)}
              onReadStory={(story) => navigate(`/story/${story._id}`)}
              onProfile={(username) => navigate(`/profile/${username}`)}
            />
          </Suspense>
        } />

        <Route path="/thread/:storyId" element={
          <Suspense fallback={<SkeletonThreadView />}>
            <ThreadViewRoute />
          </Suspense>
        } />

        <Route path="/my-stories" element={
          <Suspense fallback={<SkeletonStoryList count={3} />}>
            <MyStories
              user={user}
              onBack={() => navigate(-1)}
              onReadStory={(story) => navigate(`/story/${story._id}`)}
              onProfile={(username) => navigate(`/profile/${username}`)}
            />
          </Suspense>
        } />

        <Route path="/following/:username" element={
          <Suspense fallback={<FollowingSkeleton />}>
            <FollowingPageRoute />
          </Suspense>
        } />

        <Route path="/user/:username/stories" element={
          <Suspense fallback={<SkeletonStoryList count={3} />}>
            <UserStoriesRoute />
          </Suspense>
        } />

        {/* Collaborative Hubs Routes */}
        <Route path="/hubs" element={
          <Suspense fallback={<SkeletonHubsPage />}>
            <CollaborativeHubs
              onBack={() => navigate('/community')}
              onHubClick={(hubId) => navigate(`/hubs/${hubId}`)}
              onCreateHub={() => navigate('/hubs/create')}
            />
          </Suspense>
        } />

        <Route path="/hubs/create" element={
          <Suspense fallback={<SkeletonHubsPage />}>
            <HubCreation
              onBack={() => navigate('/hubs')}
              onCreated={(hub) => navigate(`/hubs/${hub.hubId}`)}
            />
          </Suspense>
        } />

        <Route path="/hubs/:hubId" element={
          <Suspense fallback={<div style={{ padding: 20 }}><SkeletonHubCard /></div>}>
            <HubDetailRoute />
          </Suspense>
        } />

        {/* Settings Route */}
        <Route path="/settings" element={
          <Suspense fallback={<SkeletonSettings />}>
            <Settings
              onBack={() => navigate('/community')}
              user={user}
              setUser={setUser}
            />
          </Suspense>
        } />

        {/* Notifications Route */}
        <Route path="/notifications" element={
          <Suspense fallback={<SkeletonNotifications />}>
            <Notifications
              onBack={() => navigate('/community')}
              onNavigate={(path) => navigate(path)}
            />
          </Suspense>
        } />

        {/* Analytics Route */}
        <Route path="/analytics" element={
          <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fefefd' }} />}>
            <AnalyticsDashboard onBack={() => navigate('/community')} />
          </Suspense>
        } />

        <Route path="/admin" element={
          !authReady ? (
            <div style={{ minHeight: '100vh', background: '#0d1117' }} />
          ) : user && user.role === 'admin' ? (
            <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0d1117' }} />}>
              <AdminDashboard
                user={user}
                onBack={() => navigate('/community')}
              />
            </Suspense>
          ) : (
            <Navigate to="/community" replace />
          )
        } />

        <Route path="/moderation" element={
          <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fefefd' }} />}>
            <ModerationDashboard
              user={user}
              onBack={() => navigate('/community')}
            />
          </Suspense>
        } />

        <Route path="/private-archive" element={
          <Suspense fallback={<SkeletonStoryList />}>
            <PrivateArchive
              user={user}
              onBack={() => navigate('/community')}
            />
          </Suspense>
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
