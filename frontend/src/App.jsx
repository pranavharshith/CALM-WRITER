import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { fetchCurrentUser } from './api/api';
import {
  AppSplashSkeleton,
  SkeletonStoryReader,
  SkeletonProfile,
  SkeletonNotifications,
  SkeletonThreadView,
  SkeletonWriteScreen,
  SkeletonSettings,
  SkeletonHubsPage,
  SkeletonStoryList,
  SkeletonFollowRow,
  SkeletonHubDetail,
  SkeletonAchievements
} from './components/skeletons';
import ToastProvider from './components/common/ToastProvider';

const Auth = React.lazy(() => import('./components/auth/Auth'));
const UsernameSetup = React.lazy(() => import('./components/auth/UsernameSetup'));
const CommunityFeed = React.lazy(() => import('./components/feed/CommunityFeed'));
const WriteScreen = React.lazy(() => import('./components/story/WriteScreen'));
const PrivateArchive = React.lazy(() => import('./components/story/PrivateArchive'));
const ModerationDashboard = React.lazy(() => import('./components/moderation/ModerationDashboard'));
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));
const Bookmarks = React.lazy(() => import('./components/social/Bookmarks'));
const MyStories = React.lazy(() => import('./components/story/MyStories'));
const CollaborativeHubs = React.lazy(() => import('./components/hub/CollaborativeHubs'));
const HubCreation = React.lazy(() => import('./components/hub/HubCreation'));
const Settings = React.lazy(() => import('./components/settings/Settings'));
const Notifications = React.lazy(() => import('./components/social/Notifications'));
const VerifyEmail = React.lazy(() => import('./components/auth/VerifyEmail'));
const AnalyticsDashboard = React.lazy(() => import('./components/story/AnalyticsDashboard'));
const Leaderboards = React.lazy(() => import('./components/leaderboard/Leaderboards'));
const Achievements = React.lazy(() => import('./components/social/Achievements'));
const ShelfPublic = React.lazy(() => import('./components/social/ShelfPublic'));
const TagBrowse = React.lazy(() => import('./components/story/TagBrowse'));
const TagStories = React.lazy(() => import('./components/story/TagStories'));

const StoryReaderRoute = React.lazy(() => import('./routes/StoryReaderRoute'));
const UserProfileRoute = React.lazy(() => import('./routes/UserProfileRoute'));
const ThreadViewRoute = React.lazy(() => import('./routes/ThreadViewRoute'));
const FollowingPageRoute = React.lazy(() => import('./routes/FollowingPageRoute'));
const UserStoriesRoute = React.lazy(() => import('./routes/UserStoriesRoute'));
const HubDetailRoute = React.lazy(() => import('./routes/HubDetailRoute'));

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
    // Fired after email verification auto-login so App reloads the user state
    // without a full page refresh.
    const handleAuthLogin = () => {
      checkAuthStatus();
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    window.addEventListener('auth:login', handleAuthLogin);
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
      window.removeEventListener('auth:login', handleAuthLogin);
    };
  }, []);

  // Pages that must be reachable without an authenticated session
  const isPublicAuthPath = () => {
    const path = window.location.pathname;
    return path === '/login' || path === '/verify-email' || path.startsWith('/shelf/') || path === '/tags' || path.startsWith('/tags/');
  };

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
            if (!isPublicAuthPath()) navigate('/login');
          } else {
            setAuthReady(true);
          }
        }
      } else {
        setAuthReady(true);
        // Don't redirect off the email-verification (or login) page — a user
        // clicking a verification link has no session yet.
        if (!isPublicAuthPath()) navigate('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (!localStorage.getItem('accessToken')) {
        setAuthReady(true);
        if (!isPublicAuthPath()) navigate('/login');
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
    <div className="app-shell">
      {error && (
        <div className="toast" style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--rose-light)', color: 'var(--rose-dark)', zIndex: 1200
        }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      <Routes>
        <Route path="/login" element={
          <Suspense fallback={<div className="suspense-fallback" />}>
            <Auth onAuthenticated={checkAuthStatus} />
          </Suspense>
        } />

        <Route path="/username-setup" element={
          <Suspense fallback={<div className="suspense-fallback" />}>
            <UsernameSetup user={user} onComplete={handleUsernameComplete} />
          </Suspense>
        } />

        <Route path="/verify-email" element={
          <Suspense fallback={<div className="suspense-fallback" />}>
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
                onLeaderboards={() => navigate('/leaderboards')}
                onWritePrompt={(prompt) => {
                  localStorage.setItem('calmstories_write_prompt', JSON.stringify(prompt));
                  navigate('/write');
                }}
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
              user={user}
              onBack={() => navigate(-1)}
              onReadStory={(story) => navigate(`/story/${story._id}`)}
              onProfile={(username) => navigate(`/profile/${username}`)}
            />
          </Suspense>
        } />

        <Route path="/shelf/:username/:slug" element={
          <Suspense fallback={<SkeletonStoryList count={5} />}>
            <ShelfPublic />
          </Suspense>
        } />

        <Route path="/tags" element={
          <Suspense fallback={<SkeletonStoryList count={5} />}>
            <TagBrowse onBack={() => navigate('/community')} />
          </Suspense>
        } />

        <Route path="/tags/:tag" element={
          <Suspense fallback={<SkeletonStoryList count={5} />}>
            <TagStories />
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
          <Suspense fallback={<SkeletonHubDetail />}>
            <HubDetailRoute />
          </Suspense>
        } />

        {/* Settings Route */}
        <Route path="/settings" element={
          <Suspense fallback={<SkeletonSettings />}>
            <Settings
              onBack={() => navigate('/community')}
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
          <Suspense fallback={<div className="suspense-fallback" />}>
            <AnalyticsDashboard onBack={() => navigate('/community')} />
          </Suspense>
        } />

        {/* Leaderboards Route */}
        <Route path="/leaderboards" element={
          <Suspense fallback={<div className="suspense-fallback" />}>
            <Leaderboards onBack={() => navigate('/community')} />
          </Suspense>
        } />

        <Route path="/achievements" element={
          <Suspense fallback={<SkeletonAchievements />}>
            <Achievements onBack={() => navigate('/community')} />
          </Suspense>
        } />

        <Route path="/admin" element={
          !authReady ? (
            <div className="suspense-fallback" />
          ) : user && user.role === 'admin' ? (
            <Suspense fallback={<div className="suspense-fallback" />}>
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
          !authReady ? (
            <div className="suspense-fallback" />
          ) : user && ['admin', 'moderator'].includes(user.role) ? (
            <Suspense fallback={<div className="suspense-fallback" />}>
              <ModerationDashboard
                user={user}
                onBack={() => navigate('/community')}
              />
            </Suspense>
          ) : (
            <Navigate to="/community" replace />
          )
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
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}
