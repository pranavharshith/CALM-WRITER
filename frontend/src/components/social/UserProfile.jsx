import React, { useState, useEffect, useRef } from 'react';
import { fetchUserProfile, getBookmarkCount, followUser, unfollowUser, getFollowStatus, getFollowCounts, uploadProfilePicture, deleteProfilePicture } from '../../api/api';
import { SkeletonProfile } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';
import useToast from '../../hooks/useToast';
import ConfirmDialog from '../common/ConfirmDialog';

export default function UserProfile({ username, onBack, currentUser, onLogout, onViewBookmarks, onViewMyStories, onViewFollowing, onViewUserStories }) {
  const [profile, setProfile] = useState(null);
  const [rawLoading, setRawLoading] = useState(true);
  const loading = useMinLoadTime(rawLoading);
  const toast = useToast();
  const [error, setError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [confirmEverywhere, setConfirmEverywhere] = useState(false);
  const [confirmRemovePic, setConfirmRemovePic] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [removingPic, setRemovingPic] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProfile();
    loadFollowCounts();
    if (currentUser && currentUser.username === username) {
      loadBookmarkCount();
    }
    loadFollowInfo();
  }, [username, currentUser]);

  const loadProfile = async ({ silent = false } = {}) => {
    try {
      if (!silent) setRawLoading(true);
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
      if (!silent) setRawLoading(false);
    }
  };

  const loadBookmarkCount = async () => {
    try {
      const result = await getBookmarkCount();
      setBookmarkCount(result.count || 0);
    } catch (err) {
      console.error('Failed to load bookmark count:', err);
    }
  };

  const loadFollowInfo = async () => {
    try {
      if (currentUser && currentUser.username !== username) {
        const status = await getFollowStatus(username);
        setIsFollowing(!!status.isFollowing);
      } else {
        setIsFollowing(false);
      }
    } catch (err) {
      // ignore follow status errors
    }
  };

  const loadFollowCounts = async () => {
    try {
      const counts = await getFollowCounts(username);
      setFollowingCount(counts.following || 0);
    } catch (err) {
      console.error('Failed to load follow counts:', err);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser || currentUser.username === username || followLoading) return;
    setFollowLoading(true);
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      const res = next ? await followUser(username) : await unfollowUser(username);
      if (res.error) {
        setIsFollowing(!next);
        toast.error(res.error);
      } else {
        toast.success(next ? `Following @${username}` : `Unfollowed @${username}`);
      }
    } catch (err) {
      setIsFollowing(!next);
      toast.error('Could not update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadProfilePicture(file);
      if (result.success) {
        await loadProfile({ silent: true });
        toast.success('Profile picture updated');
      } else {
        toast.error('Failed to upload profile picture');
      }
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const confirmRemovePicture = async () => {
    setRemovingPic(true);
    try {
      const result = await deleteProfilePicture();
      if (result.success) {
        await loadProfile({ silent: true });
        toast.success('Profile picture removed');
        setConfirmRemovePic(false);
      } else {
        toast.error('Failed to remove profile picture');
      }
    } catch (error) {
      toast.error('Failed to remove profile picture');
    } finally {
      setRemovingPic(false);
    }
  };

  const confirmSignOut = async () => {
    setSigningOut(true);
    try {
      const { logoutThisDevice } = await import('../../api/api');
      await logoutThisDevice();
      onLogout && onLogout();
    } catch (error) {
      toast.error('Could not sign out');
      setSigningOut(false);
    }
  };

  const confirmSignOutEverywhere = async () => {
    setSigningOutEverywhere(true);
    try {
      const { logout } = await import('../../api/api');
      await logout();
      onLogout && onLogout();
    } catch (error) {
      toast.error('Could not sign out everywhere');
      setSigningOutEverywhere(false);
    }
  };

  if (loading) {
    return <SkeletonProfile />;
  }

  if (error || !profile || !profile.user) {
    return (
      <div className="page-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--rose)', marginBottom: '20px' }}>{error || 'Profile not found'}</div>
        <button onClick={onBack} style={{ padding: '10px 20px', background: 'var(--glass-bg-strong)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>Back to Community</button>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.9em',
            cursor: 'pointer',
            marginBottom: '30px'
          }}>
          ← Back to Community
        </button>

        {/* Profile Header */}
        <div style={{ background: 'var(--glass-bg-strong)', borderRadius: 'var(--radius-md)', padding: '32px', boxShadow: 'var(--shadow-sm)', marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
            {/* Profile Picture */}
            <div style={{ position: 'relative' }}>
              {profile.user.profilePicture ? (
                <img
                  src={profile.user.profilePicture}
                  alt={profile.user.username}
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--border)'
                  }}
                />
              ) : (
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'var(--bg-subtle)',
                  border: '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  color: 'var(--text-secondary)',
                  fontWeight: '600'
                }}>
                  {profile.user.username?.[0]?.toUpperCase()}
                </div>
              )}
              {currentUser && currentUser.username === username && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`btn btn--primary${uploading ? ' btn--loading' : ''}`}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    {uploading && <span className="spinner-ring" aria-hidden="true" />}
                    {uploading ? 'Uploading…' : 'Change'}
                  </button>
                  {profile.user.profilePicture && (
                    <button
                      onClick={() => setConfirmRemovePic(true)}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ fontSize: '2em', color: 'var(--text-primary)' }}>@{profile.user.username}</div>
                {currentUser && currentUser.username !== username && (
                  <button
                    onClick={handleToggleFollow}
                    className={followLoading ? 'is-busy' : undefined}
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--accent-contrast)',
                      border: '1px solid var(--accent)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 12px',
                      fontSize: '0.9em',
                      cursor: followLoading ? 'not-allowed' : 'pointer'
                    }}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>

              {profile.user.displayName && (
                <div style={{ fontSize: '1.2em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {profile.user.displayName}
                </div>
              )}

              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                <span>{profile.stats.totalStories} stories</span>
                <span>{profile.stats.totalLikes} total likes</span>
                <span>Joined {formatDate(profile.user.joinedAt)}</span>
              </div>
            </div>
          </div>

          {currentUser && currentUser.username === username && (
            <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="btn btn--danger"
              >
                Sign Out
              </button>
              <button
                onClick={() => setConfirmEverywhere(true)}
                className="btn btn--ghost"
                style={{ color: 'var(--rose-dark)' }}
              >
                Log out everywhere
              </button>
            </div>
          )}
        </div>

        <ConfirmDialog
          open={confirmRemovePic}
          title="Remove profile picture?"
          message="Your avatar will revert to the default initial."
          confirmLabel={removingPic ? 'Removing…' : 'Remove'}
          destructive
          busy={removingPic}
          onConfirm={confirmRemovePicture}
          onCancel={() => { if (!removingPic) setConfirmRemovePic(false); }}
        />

        <ConfirmDialog
          open={showLogoutConfirm}
          title="Sign out?"
          message="You will need to sign in again on this device."
          confirmLabel={signingOut ? 'Signing out…' : 'Sign out'}
          destructive
          busy={signingOut}
          onConfirm={confirmSignOut}
          onCancel={() => { if (!signingOut) setShowLogoutConfirm(false); }}
        />

        <ConfirmDialog
          open={confirmEverywhere}
          title="Log out everywhere?"
          message="This will invalidate all active sessions on other computers and phones."
          confirmLabel={signingOutEverywhere ? 'Signing out…' : 'Log out everywhere'}
          destructive
          busy={signingOutEverywhere}
          onConfirm={confirmSignOutEverywhere}
          onCancel={() => { if (!signingOutEverywhere) setConfirmEverywhere(false); }}
        />

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div>
            <div style={{ fontSize: '1.3em', marginBottom: '20px', opacity: 0.8 }}>Content</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button onClick={() => onViewUserStories(username)} style={{ textAlign: 'left', padding: '20px', background: 'var(--glass-bg-strong)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                View Stories ({profile.stats.totalStories}) →
              </button>
              <button onClick={() => onViewFollowing(username)} style={{ textAlign: 'left', padding: '20px', background: 'var(--glass-bg-strong)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                View Following ({followingCount}) →
              </button>
              {currentUser && currentUser.username === username && (
                <>
                  <button onClick={onViewBookmarks} style={{ textAlign: 'left', padding: '20px', background: 'var(--glass-bg-strong)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                    View Bookmarked Stories ({bookmarkCount}) →
                  </button>
                  <button onClick={onViewMyStories} style={{ textAlign: 'left', padding: '20px', background: 'var(--glass-bg-strong)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                    My Stories →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}