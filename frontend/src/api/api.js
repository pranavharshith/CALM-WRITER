const API_BASE = import.meta.env.VITE_API_URL || '/api';

// CSRF token management
let csrfToken = null;
let csrfTokenPromise = null; // Track ongoing fetch to avoid race conditions

// Request deduplication - prevent duplicate concurrent requests
const pendingRequests = new Map();

// Offline detection
let isOnline = navigator.onLine;

// Listen for online/offline events
window.addEventListener('online', () => {
  isOnline = true;
  console.log('Connection restored');
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.warn('Connection lost - some features may be unavailable');
});

/**
 * Check if user is online
 */
function checkOnlineStatus() {
  return isOnline;
}

/**
 * Get CSRF token from cookie or meta tag
 */
function getCSRFToken() {
  if (csrfToken) return csrfToken;

  // Try to get from cookie - match backend's csrf-token name
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      csrfToken = decodeURIComponent(value);
      return csrfToken;
    }
  }

  // Try to get from meta tag
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    csrfToken = metaTag.getAttribute('content');
    return csrfToken;
  }

  return null;
}

/**
 * Fetch CSRF token from server
 */
async function fetchCSRFToken() {
  // If already fetching, wait for that promise
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = (async () => {
    try {
      const resp = await fetch(`${API_BASE}/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include'
      });

      if (resp.ok) {
        const data = await resp.json();
        csrfToken = data.token;
        return csrfToken;
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    } finally {
      csrfTokenPromise = null;
    }

    return null;
  })();

  return csrfTokenPromise;
}

// Get authentication headers (JWT + CSRF)
function getAuthHeaders(contentType = 'application/json') {
  const headers = {};

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Add CSRF token for state-changing requests (must be lowercase for middleware)
  const token = getCSRFToken();
  if (token) {
    headers['x-csrf-token'] = token;
  }

  return headers;
}

// Check if user is authenticated
function isAuthenticated() {
  return !!localStorage.getItem('accessToken');
}

// Get current user from localStorage
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('calmstories_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

// Legacy internal id is no longer used for authentication on the backend,
// but we keep it for UI-only purposes where needed.
function getInternalId() {
  return localStorage.getItem('calmstories_internal_id') || localStorage.getItem('internalId');
}

// Refresh access token using refresh token (via HttpOnly cookie)
async function refreshAccessToken() {
  try {
    // No need to send refresh token in body - it's an HttpOnly cookie now
    const resp = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include' // Important: Send cookies
    });

    if (!resp.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await resp.json();
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  } catch (error) {
    // Only clear tokens when refresh is definitively dead
    localStorage.removeItem('accessToken');
    // localStorage.removeItem('refreshToken'); // No longer used
    localStorage.removeItem('calmstories_user');
    localStorage.removeItem('calmstories_internal_id');
    throw error;
  }
}

// Logout and invalidate token (Global Logout)
export async function logout() {
  try {
    // Call logout-all to invalidate all sessions and clear cookies
    const resp = await authenticatedFetch(`${API_BASE}/auth/logout-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    // Clear tokens regardless of response
    localStorage.removeItem('accessToken');
    localStorage.removeItem('calmstories_user');
    localStorage.removeItem('calmstories_internal_id');

    return resp.ok; // or resp.json() if you need message
  } catch (error) {
    // Clear tokens on error too
    localStorage.removeItem('accessToken');
    // localStorage.removeItem('refreshToken');
    localStorage.removeItem('calmstories_user');
    localStorage.removeItem('calmstories_internal_id');
    throw error;
  }
}

// Helper function to add timeout to fetch requests
function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(timeoutId));
}

// Make authenticated API request with automatic token refresh and CSRF protection
async function authenticatedFetch(url, options = {}) {
  // Check if user is online
  if (!checkOnlineStatus()) {
    throw new Error('You are offline. Please check your internet connection.');
  }

  try {
    // Ensure CSRF token is available for state-changing requests
    const method = options.method || 'GET';
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      let token = getCSRFToken();
      if (!token) {
        token = await fetchCSRFToken();
      }
    }

    // First attempt with current token (30 second timeout)
    let response = await fetchWithTimeout(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
        ...getAuthHeaders()
      }
    });

    // If 401, try refreshing token
    if (response.status === 401) {
      try {
        await refreshAccessToken();
        // Retry with new token - create a fresh request
        response = await fetchWithTimeout(url, {
          ...options,
          credentials: 'include',
          headers: {
            ...options.headers,
            ...getAuthHeaders()
          }
        });
      } catch (error) {
        // Refresh definitively failed — navigate to login via React Router
        // (tokens are already cleared inside refreshAccessToken)
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw error;
      }
    } else if (response.status === 403 && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      // If 403, it might be a CSRF error - try to refresh CSRF token and retry once
      // Only for state-changing requests (POST/PUT/DELETE/PATCH)
      try {
        // Clear cached token and fetch a new one
        csrfToken = null;
        await fetchCSRFToken();
        // Create a fresh request
        response = await fetchWithTimeout(url, {
          ...options,
          credentials: 'include',
          headers: {
            ...options.headers,
            ...getAuthHeaders()
          }
        });
      } catch (error) {
        console.error('CSRF token refresh failed:', error);
      }
    }

    return response;
  } catch (error) {
    console.error('authenticatedFetch error:', error);
    throw error;
  }
}

// API helpers
export async function submitStory(text, title = '') {
  const resp = await authenticatedFetch(`${API_BASE}/stories/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text, title }),
  });
  return await resp.json();
}

export async function fetchRandomStory() {
  const resp = await authenticatedFetch(`${API_BASE}/stories/random`, {
    headers: getAuthHeaders(null),
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch story: ${resp.status}`);
  }
  return await resp.json();
}

export async function submitReaction(storyId, reactionType) {
  const resp = await authenticatedFetch(`${API_BASE}/reactions/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ storyId, reactionType }),
  });
  return await resp.json();
}

export async function trackReadSession(storyId, percentRead) {
  const resp = await authenticatedFetch(`${API_BASE}/reads/track`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ storyId, percentRead }),
  });
  return await resp.json();
}

export async function fetchUserStories() {
  const resp = await authenticatedFetch(`${API_BASE}/stories/mine`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function checkCanWrite() {
  const resp = await authenticatedFetch(`${API_BASE}/stories/can-write`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

// Auth API functions
export async function requestOTP(email) {
  const resp = await fetch(`${API_BASE}/auth/request-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  return await resp.json();
}

export async function verifyOTP(email, otp) {
  const resp = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, otp }),
  });
  return await resp.json();
}

export async function verifyEmail(token) {
  const resp = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  return await resp.json();
}

export async function resendVerification(email) {
  const resp = await fetch(`${API_BASE}/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  return await resp.json();
}

export async function setupUsername(internalId, username) {
  const resp = await fetch(`${API_BASE}/auth/setup-username`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ internalId, username }),
  });
  return await resp.json();
}

// Community API functions
export async function fetchCommunityFeed(page = 1, sort = 'latest') {
  try {
    const resp = await authenticatedFetch(`${API_BASE}/stories/feed?page=${page}&sort=${sort}`, {
      headers: getAuthHeaders(null),
    });

    if (!resp.ok) {
      throw new Error(`Failed to fetch feed: ${resp.status}`);
    }

    // Read response body as text first to avoid stream issues
    const text = await resp.text();
    if (!text) {
      throw new Error('Empty response body');
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('fetchCommunityFeed error:', error);
    throw error;
  }
}

export async function fetchFollowingFeed(page = 1) {
  try {
    const resp = await authenticatedFetch(`${API_BASE}/stories/following?page=${page}`, {
      headers: getAuthHeaders(null),
    });

    if (!resp.ok) {
      throw new Error(`Failed to fetch following feed: ${resp.status}`);
    }

    const text = await resp.text();
    if (!text) {
      throw new Error('Empty response body');
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('fetchFollowingFeed error:', error);
    throw error;
  }
}

export async function fetchWriterAnalytics(page = 1, limit = 3) {
  try {
    const resp = await authenticatedFetch(`${API_BASE}/stories/analytics?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch analytics: ${resp.status}`);
    return await resp.json();
  } catch (error) {
    console.error('fetchWriterAnalytics error:', error);
    throw error;
  }
}

export async function fetchStoryById(storyId) {
  const resp = await authenticatedFetch(`${API_BASE}/stories/${storyId}`, {
    headers: getAuthHeaders(null),
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch story: ${resp.status}`);
  }

  const data = await resp.json();
  return data.story; // Return just the story object, not the wrapper
}

export async function likeStory(storyId) {
  const resp = await authenticatedFetch(`${API_BASE}/stories/like`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ storyId }),
  });
  return await resp.json();
}

export async function editStory(storyId, text, title = '') {
  const resp = await authenticatedFetch(`${API_BASE}/stories/${storyId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text, title }),
  });
  return await resp.json();
}

export async function deleteStory(storyId) {
  const resp = await authenticatedFetch(`${API_BASE}/stories/${storyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function fetchFeaturedStory() {
  const resp = await fetch(`${API_BASE}/stories/featured`);
  return await resp.json();
}

export async function fetchUserProfile(username) {
  const resp = await fetch(`${API_BASE}/users/profile/${username}`);

  if (!resp.ok) {
    throw new Error(`Failed to fetch profile: ${resp.status}`);
  }

  return await resp.json();
}

export async function fetchCurrentUser() {
  const resp = await authenticatedFetch(`${API_BASE}/users/me`, {
    headers: getAuthHeaders(null),
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch user: ${resp.status}`);
  }

  // Read response body as text first to avoid stream issues
  const text = await resp.text();
  if (!text) {
    throw new Error('Empty response body');
  }
  return JSON.parse(text);
}

export async function fetchLeaderboard(period = '24h') {
  const resp = await authenticatedFetch(`${API_BASE}/stories/leaderboard?period=${period}`);

  if (!resp.ok) {
    throw new Error(`Failed to fetch leaderboard: ${resp.status}`);
  }

  return await resp.json();
}

export async function fetchTopStories(period = '24h') {
  try {
    const resp = await authenticatedFetch(`${API_BASE}/leaderboards/top-stories?period=${period}`);

    if (!resp.ok) {
      throw new Error(`Failed to fetch top stories: ${resp.status}`);
    }

    // Read response body as text first to avoid stream issues
    const text = await resp.text();
    if (!text) {
      throw new Error('Empty response body');
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('fetchTopStories error:', error);
    throw error;
  }
}

// Thread API functions
export async function fetchThread(storyId) {
  const resp = await authenticatedFetch(`${API_BASE}/threads/${storyId}`, {
    headers: getAuthHeaders(null),
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch thread: ${resp.status}`);
  }

  return await resp.json();
}

export async function continueStory(storyId, content) {
  const resp = await authenticatedFetch(`${API_BASE}/threads/${storyId}/continue`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
  return await resp.json();
}

export async function respondToStory(storyId, content, nodeId = null) {
  const resp = await authenticatedFetch(`${API_BASE}/threads/${storyId}/respond`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content, nodeId }),
  });
  return await resp.json();
}

export async function checkHasThread(storyId) {
  const resp = await fetch(`${API_BASE}/threads/${storyId}/has-thread`);
  return await resp.json();
}

// New leaderboard lenses
export async function fetchMostFeltLeaderboard(limit = 10) {
  const resp = await fetch(`${API_BASE}/leaderboards/most-felt?limit=${limit}`);

  if (!resp.ok) {
    throw new Error(`Failed to fetch leaderboard: ${resp.status}`);
  }

  return await resp.json();
}

export async function fetchQuietlyPowerfulLeaderboard(limit = 10) {
  const resp = await fetch(`${API_BASE}/leaderboards/quietly-powerful?limit=${limit}`);

  if (!resp.ok) {
    throw new Error(`Failed to fetch leaderboard: ${resp.status}`);
  }

  return await resp.json();
}

export async function fetchGrowingStoriesLeaderboard(limit = 10, days = 7) {
  const resp = await fetch(`${API_BASE}/leaderboards/growing-stories?limit=${limit}&days=${days}`);

  if (!resp.ok) {
    throw new Error(`Failed to fetch leaderboard: ${resp.status}`);
  }

  return await resp.json();
}

// Moderation API functions
export async function reportContent(storyId, storyNodeId, reason, details) {
  const resp = await fetch(`${API_BASE}/admin/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userInternalId: getInternalId(),
      storyId,
      storyNodeId,
      reason,
      details
    }),
  });
  return await resp.json();
}

export async function fetchReports(status = 'pending') {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/reports?status=${status}`, {
    headers: getAuthHeaders(null),
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch reports: ${resp.status}`);
  }

  return await resp.json();
}

export async function removeStory(storyId, reason, reportId = null) {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/remove-story`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ storyId, reason, reportId }),
  });
  return await resp.json();
}

export async function removeNode(nodeId, reason, reportId = null) {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/remove-node`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ nodeId, reason, reportId }),
  });
  return await resp.json();
}

export async function lockThread(storyId, reason) {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/lock-thread`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ storyId, reason }),
  });
  return await resp.json();
}

export async function pinComment(storyId, comment, daysToExpire = 7) {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/pin-comment`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ storyId, comment, daysToExpire }),
  });
  return await resp.json();
}

export async function dismissReport(reportId) {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/dismiss-report`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reportId }),
  });
  return await resp.json();
}

export async function fetchPinnedComments(storyId) {
  const resp = await fetch(`${API_BASE}/moderation/pinned-comments/${storyId}`);
  return await resp.json();
}

// Bookmark API functions
export async function bookmarkStory(storyId) {
  const resp = await authenticatedFetch(`${API_BASE}/bookmarks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ storyId }),
  });
  return await resp.json();
}

export async function unbookmarkStory(storyId) {
  const resp = await authenticatedFetch(`${API_BASE}/bookmarks/${storyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function checkBookmark(storyId) {
  const resp = await authenticatedFetch(`${API_BASE}/bookmarks/check/${storyId}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function fetchBookmarks(page = 1, limit = 8, searchQuery = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (searchQuery) {
    params.append('q', searchQuery);
  }

  const resp = await authenticatedFetch(`${API_BASE}/bookmarks?${params.toString()}`, {
    headers: getAuthHeaders(null),
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch bookmarks: ${resp.status}`);
  }

  return await resp.json();
}

export async function getBookmarkCount() {
  const resp = await authenticatedFetch(`${API_BASE}/bookmarks/count`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

// Follow API functions
export async function followUser(username) {
  const resp = await authenticatedFetch(`${API_BASE}/follows/${encodeURIComponent(username)}`, {
    method: 'POST',
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function unfollowUser(username) {
  const resp = await authenticatedFetch(`${API_BASE}/follows/${encodeURIComponent(username)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function getFollowStatus(username) {
  const resp = await authenticatedFetch(`${API_BASE}/follows/status/${encodeURIComponent(username)}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function getFollowCounts(username) {
  const resp = await fetch(`${API_BASE}/follows/counts/${encodeURIComponent(username)}`);
  return await resp.json();
}

export async function getFollowingList(username) {
  const url = username
    ? `${API_BASE}/follows/following/${encodeURIComponent(username)}`
    : `${API_BASE}/follows/following`;

  const resp = await authenticatedFetch(url, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

// Search API functions
export async function searchStories(query, filters = {}, page = 1, limit = 10) {
  const params = new URLSearchParams({
    q: query || '',
    page: page.toString(),
    limit: limit.toString()
  });

  if (filters.minLikes) params.append('minLikes', filters.minLikes);
  if (filters.maxLikes) params.append('maxLikes', filters.maxLikes);
  if (filters.minWords) params.append('minWords', filters.minWords);
  if (filters.maxWords) params.append('maxWords', filters.maxWords);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);

  const resp = await authenticatedFetch(`${API_BASE}/stories/search?${params.toString()}`, {
    headers: getAuthHeaders(null),
  });

  if (!resp.ok) {
    throw new Error(`Failed to search stories: ${resp.status}`);
  }

  return await resp.json();
}

// Draft API functions
export async function saveDraft(title, text, draftId = null) {
  const resp = await authenticatedFetch(`${API_BASE}/drafts/save`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, text, draftId }),
  });
  return await resp.json();
}

export async function fetchDrafts() {
  const resp = await authenticatedFetch(`${API_BASE}/drafts`, {
    headers: getAuthHeaders(null),
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch drafts: ${resp.status}`);
  }

  return await resp.json();
}

export async function fetchDraft(draftId) {
  const resp = await authenticatedFetch(`${API_BASE}/drafts/${draftId}`, {
    headers: getAuthHeaders(null),
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch draft: ${resp.status}`);
  }

  return await resp.json();
}

export async function deleteDraft(draftId) {
  const resp = await authenticatedFetch(`${API_BASE}/drafts/${draftId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function publishDraft(draftId) {
  const resp = await authenticatedFetch(`${API_BASE}/drafts/${draftId}/publish`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return await resp.json();
}

// Admin API functions
export async function fetchAdminStats() {
  const resp = await authenticatedFetch(`${API_BASE}/admin/stats`, {
    headers: getAuthHeaders(null),
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch admin stats: ${resp.status}`);
  }

  return await resp.json();
}

export async function fetchAdminActivity(limit = 20) {
  const resp = await authenticatedFetch(`${API_BASE}/admin/activity?limit=${limit}`, {
    headers: getAuthHeaders(null),
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch admin activity: ${resp.status}`);
  }

  return await resp.json();
}

// Timeout and Warning API functions
export async function timeoutUser(userInternalId, duration, reason) {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/timeout-user`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userInternalId, duration, reason }),
  });
  return await resp.json();
}

export async function issueWarning(userInternalId, reason) {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/issue-warning`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userInternalId, reason }),
  });
  return await resp.json();
}

// Moderator Chat API functions
export async function fetchModeratorChat(limit = 50, before = null) {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (before) params.append('before', before);

  const resp = await authenticatedFetch(`${API_BASE}/moderation/chat?${params.toString()}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function postModeratorChat(message) {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });
  return await resp.json();
}

// Timeout Appeal API functions
export async function submitTimeoutAppeal(answers) {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/submit-appeal`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ answers }),
  });
  return await resp.json();
}

export async function fetchTimeoutAppeals(status = 'pending') {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/appeals?status=${status}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function reviewTimeoutAppeal(appealId, decision, notes, newDuration = null) {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/review-appeal`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ appealId, decision, notes, newDuration }),
  });
  return await resp.json();
}

export async function revokeTimeout(userInternalId, reason) {
  const resp = await authenticatedFetch(`${API_BASE}/moderation/revoke-timeout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userInternalId, reason }),
  });
  return await resp.json();
}

// Moderator Application API functions
export async function checkModeratorEligibility() {
  const resp = await authenticatedFetch(`${API_BASE}/admin/check-moderator-eligibility`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function applyForModerator(essay, scenarioAnswers) {
  const resp = await authenticatedFetch(`${API_BASE}/admin/apply-moderator`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ essay, scenarioAnswers }),
  });
  return await resp.json();
}

export async function fetchModeratorApplications(status = 'pending') {
  const resp = await authenticatedFetch(`${API_BASE}/admin/moderator-applications?status=${status}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function reviewModeratorApplication(applicationId, decision, notes) {
  const resp = await authenticatedFetch(`${API_BASE}/admin/review-moderator-application`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ applicationId, decision, notes }),
  });
  return await resp.json();
}

export async function promoteToModerator(userInternalId, justification) {
  const resp = await authenticatedFetch(`${API_BASE}/admin/promote-to-moderator`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userInternalId, justification }),
  });
  return await resp.json();
}

// Collaborative Hub API functions
export async function checkHubEligibility() {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/check-eligibility`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function createHub(hubData) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(hubData),
  });
  return await resp.json();
}

export async function fetchHubs(visibility = '', theme = '', page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (visibility) params.append('visibility', visibility);
  if (theme) params.append('theme', theme);

  const resp = await authenticatedFetch(`${API_BASE}/hubs?${params.toString()}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function fetchMyHubs() {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/my-hubs`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function fetchHubDetails(hubId) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function updateHub(hubId, updates) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/update`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  return await resp.json();
}

export async function deleteHub(hubId) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

// Hub Membership API functions
export async function sendHubInvite(hubId, username) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/invite`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ username }),
  });
  return await resp.json();
}

export async function requestJoinHub(hubId) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/request-join`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return await resp.json();
}

export async function respondToInvite(inviteId, accept) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/invites/${inviteId}/respond`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ accept }),
  });
  return await resp.json();
}

export async function approveJoinRequest(hubId, requestId, approve) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/requests/${requestId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ approve }),
  });
  return await resp.json();
}

export async function leaveHub(hubId) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/leave`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return await resp.json();
}

export async function removeHubMember(hubId, userInternalId) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/remove-member`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userInternalId }),
  });
  return await resp.json();
}

export async function updateMemberRole(hubId, userInternalId, newRole) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/update-role`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userInternalId, newRole }),
  });
  return await resp.json();
}

export async function fetchHubInvites() {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/my-invites`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function fetchHubMembers(hubId) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/members`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function fetchPendingRequests(hubId) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/pending-requests`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

// Hub Content API functions
export async function fetchHubStories(hubId, page = 1, limit = 10) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });

  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/stories?${params.toString()}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function createHubStory(hubId, title, text) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/stories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, text }),
  });
  return await resp.json();
}

// Hub Chat API functions
export async function fetchHubChat(hubId, limit = 50, before = null) {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (before) params.append('before', before);

  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/chat?${params.toString()}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function postHubChatMessage(hubId, message) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });
  return await resp.json();
}

export async function deleteHubChatMessage(hubId, messageId) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/chat/${messageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

// Hub Creator Application API functions
export async function applyForHubCreator(essay, motivation) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/apply-creator`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ essay, motivation }),
  });
  return await resp.json();
}

export async function fetchHubCreatorApplications(status = 'pending') {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/creator-applications?status=${status}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function reviewHubCreatorApplication(applicationId, decision, notes) {
  const resp = await authenticatedFetch(`${API_BASE}/hubs/review-creator-application`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ applicationId, decision, notes }),
  });
  return await resp.json();
}

// User Preferences API functions
export async function fetchUserPreferences() {
  const resp = await authenticatedFetch(`${API_BASE}/preferences`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function updateUserPreferences(preferences) {
  const resp = await authenticatedFetch(`${API_BASE}/preferences`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(preferences),
  });
  return await resp.json();
}

// Image Upload API functions
export async function uploadProfilePicture(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const resp = await authenticatedFetch(`${API_BASE}/uploads/profile-picture`, {
    method: 'POST',
    headers: getAuthHeaders(null),
    body: formData,
  });
  return await resp.json();
}

export async function deleteProfilePicture() {
  const resp = await authenticatedFetch(`${API_BASE}/uploads/profile-picture`, {
    method: 'DELETE',
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function uploadStoryCover(storyId, imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const resp = await authenticatedFetch(`${API_BASE}/uploads/story/${storyId}/cover`, {
    method: 'POST',
    headers: getAuthHeaders(null),
    body: formData,
  });
  return await resp.json();
}

export async function deleteStoryCover(storyId) {
  const resp = await authenticatedFetch(`${API_BASE}/uploads/story/${storyId}/cover`, {
    method: 'DELETE',
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

// Notifications API
export async function fetchNotifications(page = 1, limit = 20) {
  const resp = await authenticatedFetch(`${API_BASE}/notifications?page=${page}&limit=${limit}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function getUnreadNotificationCount() {
  const resp = await authenticatedFetch(`${API_BASE}/notifications/unread-count`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function markNotificationRead(notificationId) {
  const resp = await authenticatedFetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return await resp.json();
}

export async function markAllNotificationsRead() {
  const resp = await authenticatedFetch(`${API_BASE}/notifications/mark-all-read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return await resp.json();
}

// Edit Request API
export async function createEditRequest(storyId, proposedText, proposedTitle, reason) {
  const resp = await authenticatedFetch(`${API_BASE}/edit-requests/${storyId}/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ proposedText, proposedTitle, reason }),
  });
  return await resp.json();
}

export async function fetchEditRequests(storyId) {
  const resp = await authenticatedFetch(`${API_BASE}/edit-requests/${storyId}`, {
    headers: getAuthHeaders(null),
  });
  return await resp.json();
}

export async function voteOnEditRequest(requestId) {
  const resp = await authenticatedFetch(`${API_BASE}/edit-requests/${requestId}/vote`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return await resp.json();
}

export async function respondToEditRequest(requestId, approved, note = '') {
  const resp = await authenticatedFetch(`${API_BASE}/edit-requests/${requestId}/author-response`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ approved, note }),
  });
  return await resp.json();
}

// Translation API
export async function translateText(contentId, contentType, text, targetLanguage) {
  const resp = await authenticatedFetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ contentId, contentType, text, targetLanguage }),
  });
  return await resp.json();
}

// API module exports complete


