import React, { useState, useEffect, useRef } from 'react';
import { fetchUserProfile, getBookmarkCount, followUser, unfollowUser, getFollowStatus, getFollowCounts, uploadProfilePicture, deleteProfilePicture } from '../api/api';
import { SkeletonProfile } from './SkeletonLoader';
import useMinLoadTime from '../hooks/useMinLoadTime';

export default function UserProfile({ username, onBack, onReadStory, currentUser, onLogout, onViewBookmarks, onViewMyStories, onViewFollowing, onViewUserStories }) {
  const [profile, setProfile] = useState(null);
  const [rawLoading, setRawLoading] = useState(true);
  const loading = useMinLoadTime(rawLoading, 1000);
  const [error, setError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProfile();
    loadFollowCounts();
    if (currentUser && currentUser.username === username) {
      loadBookmarkCount();
    }
    loadFollowInfo();
  }, [username, currentUser]);

  const loadProfile = async () => {
    try {
      setRawLoading(true);
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
      setRawLoading(false);
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
    try {
      if (isFollowing) {
        const res = await unfollowUser(username);
        if (!res.error) setIsFollowing(false);
      } else {
        const res = await followUser(username);
        if (!res.error) setIsFollowing(true);
      }
    } catch (err) {
      // ignore
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
      alert('Please upload a JPG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadProfilePicture(file);
      if (result.success) {
        // Reload profile to show new picture
        loadProfile();
        alert('Profile picture updated!');
      } else {
        alert('Failed to upload profile picture');
      }
    } catch (error) {
      alert('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!confirm('Remove your profile picture?')) return;
    try {
      const result = await deleteProfilePicture();
      if (result.success) {
        loadProfile();
        alert('Profile picture removed');
      }
    } catch (error) {
      alert('Failed to remove profile picture');
    }
  };

  if (loading) {
    return <SkeletonProfile />;
  }

  if (error || !profile || !profile.user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fefefd', color: '#333', padding: '20px' }}>
        <div style={{ color: '#c7968c', marginBottom: '20px' }}>{error || 'Profile not found'}</div>
        <button onClick={onBack} style={{ padding: '10px 20px', background: '#fff', color: '#333', border: '1px solid #ddd' }}>Back to Community</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fefefd', padding: '20px' }}>
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
        <div style={{ background: '#fff', borderRadius: '8px', padding: '32px', boxShadow: '0 1px 4px #efefee', marginBottom: '30px' }}>
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
                    border: '2px solid #ddd'
                  }}
                />
              ) : (
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: '#f0f0f0',
                  border: '2px solid #ddd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  color: '#666',
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
                    style={{
                      padding: '6px 12px',
                      background: '#3d5a80',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Change'}
                  </button>
                  {profile.user.profilePicture && (
                    <button
                      onClick={handleRemoveProfilePicture}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        color: '#666',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
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
                <div style={{ fontSize: '2em', color: '#333' }}>@{profile.user.username}</div>
                {currentUser && currentUser.username !== username && (
                  <button
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    style={{
                      background: '#000',
                      color: '#fff',
                      border: '1px solid #000',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.9em',
                      cursor: followLoading ? 'not-allowed' : 'pointer'
                    }}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>

              {profile.user.displayName && (
                <div style={{ fontSize: '1.2em', color: '#666', marginBottom: '16px' }}>
                  {profile.user.displayName}
                </div>
              )}

              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', fontSize: '0.9em', color: '#666' }}>
                <span>{profile.stats.totalStories} stories</span>
                <span>{profile.stats.totalLikes} total likes</span>
                <span>Joined {formatDate(profile.user.joinedAt)}</span>
              </div>
            </div>
          </div>

          {currentUser && currentUser.username === username && (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              style={{ marginTop: '16px', padding: '10px 20px', background: '#c7968c', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.9em', cursor: 'pointer' }}>
              Sign Out
            </button>
          )}
        </div>

        {showLogoutConfirm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '32px', maxWidth: '400px', width: '90%' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.2em' }}>Sign Out?</h3>
              <p style={{ fontSize: '0.95em', color: '#666', marginBottom: '24px', lineHeight: '1.6' }}>Are you sure you want to sign out?</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => { setShowLogoutConfirm(false); onLogout && onLogout(); }}
                  style={{ padding: '12px 20px', background: '#c7968c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Sign Out (This Device)
                </button>

                <button
                  onClick={async () => {
                    if (confirm('This will invalid all active sessions on other computers/phones. Continue?')) {
                      setShowLogoutConfirm(false);
                      // api.logout now calls /logout-all which invalidates all tokens
                      await import('../api/api').then(mod => mod.logout());
                      onLogout && onLogout();
                    }
                  }}
                  style={{ padding: '12px 20px', background: '#fff', color: '#d32f2f', border: '2px solid #d32f2f', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Log Out Everywhere (All Devices)
                </button>

                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{ padding: '12px 20px', background: 'transparent', color: '#666', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div>
            <div style={{ fontSize: '1.3em', marginBottom: '20px', opacity: 0.8 }}>Content</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button onClick={() => onViewUserStories(username)} style={{ textAlign: 'left', padding: '20px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>
                View Stories ({profile.stats.totalStories}) →
              </button>
              <button onClick={() => onViewFollowing(username)} style={{ textAlign: 'left', padding: '20px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>
                View Following ({followingCount}) →
              </button>
              {currentUser && currentUser.username === username && (
                <button onClick={onViewBookmarks} style={{ textAlign: 'left', padding: '20px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>
                  View Bookmarked Stories ({bookmarkCount}) →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}