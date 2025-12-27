const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Get or create internal user ID
// IMPORTANT: Prefer the server-assigned internalId from auth,
// so stories, likes, and profiles all stay linked to the same user.
function getInternalId() {
  // If we've already stored a canonical internal ID, use it.
  let id = localStorage.getItem('calmstories_internal_id');

  // If not, but we have a logged-in user object from auth, sync from there.
  if (!id) {
    try {
      const savedUserRaw = localStorage.getItem('calmstories_user');
      if (savedUserRaw) {
        const savedUser = JSON.parse(savedUserRaw);
        if (savedUser && savedUser.internalId) {
          id = savedUser.internalId;
          localStorage.setItem('calmstories_internal_id', id);
        }
      }
    } catch (e) {
      // If anything goes wrong here, fall back to anonymous ID below.
    }
  }

  // Final fallback: anonymous internal ID for unauthenticated usage.
  if (!id) {
    id =
      'user_' +
      Math.random().toString(36).substring(2, 11) +
      Date.now().toString(36);
    localStorage.setItem('calmstories_internal_id', id);
  }

  return id;
}

// API helpers
export async function submitStory(text, title = '') {
  const resp = await fetch(`${API_BASE}/stories/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
    body: JSON.stringify({ text, title }),
  });
  return await resp.json();
}

export async function fetchRandomStory() {
  const resp = await fetch(`${API_BASE}/stories/random`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch story: ${resp.status}`);
  }
  return await resp.json();
}

export async function submitReaction(storyId, reactionType) {
  const resp = await fetch(`${API_BASE}/reactions/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
    body: JSON.stringify({ storyId, reactionType }),
  });
  return await resp.json();
}

export async function trackReadSession(storyId, percentRead) {
  const resp = await fetch(`${API_BASE}/reads/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
    body: JSON.stringify({ storyId, percentRead }),
  });
  return await resp.json();
}

export async function fetchUserStories() {
  const resp = await fetch(`${API_BASE}/stories/mine`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  return await resp.json();
}

export async function checkCanWrite() {
  const resp = await fetch(`${API_BASE}/stories/can-write`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
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
  const resp = await fetch(`${API_BASE}/stories/feed?page=${page}&sort=${sort}`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  
  if (!resp.ok) {
    throw new Error(`Failed to fetch feed: ${resp.status}`);
  }
  
  return await resp.json();
}

export async function likeStory(storyId) {
  const resp = await fetch(`${API_BASE}/stories/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
    body: JSON.stringify({ storyId }),
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
  const resp = await fetch(`${API_BASE}/users/me`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  
  if (!resp.ok) {
    throw new Error(`Failed to fetch user: ${resp.status}`);
  }
  
  return await resp.json();
}

export async function fetchLeaderboard(period = '24h') {
  const resp = await fetch(`${API_BASE}/stories/leaderboard?period=${period}`);
  
  if (!resp.ok) {
    throw new Error(`Failed to fetch leaderboard: ${resp.status}`);
  }
  
  return await resp.json();
}

// Thread API functions
export async function fetchThread(storyId) {
  const resp = await fetch(`${API_BASE}/threads/${storyId}`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  
  if (!resp.ok) {
    throw new Error(`Failed to fetch thread: ${resp.status}`);
  }
  
  return await resp.json();
}

export async function continueStory(storyId, content) {
  const resp = await fetch(`${API_BASE}/threads/${storyId}/continue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
    body: JSON.stringify({ content }),
  });
  return await resp.json();
}

export async function respondToStory(storyId, content, nodeId = null) {
  const resp = await fetch(`${API_BASE}/threads/${storyId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
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
  const resp = await fetch(`${API_BASE}/moderation/reports?status=${status}`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  
  if (!resp.ok) {
    throw new Error(`Failed to fetch reports: ${resp.status}`);
  }
  
  return await resp.json();
}

export async function removeStory(storyId, reason, reportId = null) {
  const resp = await fetch(`${API_BASE}/moderation/remove-story`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
    body: JSON.stringify({ storyId, reason, reportId }),
  });
  return await resp.json();
}

export async function removeNode(nodeId, reason, reportId = null) {
  const resp = await fetch(`${API_BASE}/moderation/remove-node`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
    body: JSON.stringify({ nodeId, reason, reportId }),
  });
  return await resp.json();
}

export async function lockThread(storyId, reason) {
  const resp = await fetch(`${API_BASE}/moderation/lock-thread`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
    body: JSON.stringify({ storyId, reason }),
  });
  return await resp.json();
}

export async function pinComment(storyId, comment, daysToExpire = 7) {
  const resp = await fetch(`${API_BASE}/moderation/pin-comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
    body: JSON.stringify({ storyId, comment, daysToExpire }),
  });
  return await resp.json();
}

export async function dismissReport(reportId) {
  const resp = await fetch(`${API_BASE}/moderation/dismiss-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
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
  const resp = await fetch(`${API_BASE}/bookmarks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Id': getInternalId(),
    },
    body: JSON.stringify({ storyId }),
  });
  return await resp.json();
}

export async function unbookmarkStory(storyId) {
  const resp = await fetch(`${API_BASE}/bookmarks/${storyId}`, {
    method: 'DELETE',
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  return await resp.json();
}

export async function checkBookmark(storyId) {
  const resp = await fetch(`${API_BASE}/bookmarks/check/${storyId}`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
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

  const resp = await fetch(`${API_BASE}/bookmarks?${params.toString()}`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  
  if (!resp.ok) {
    throw new Error(`Failed to fetch bookmarks: ${resp.status}`);
  }
  
  return await resp.json();
}

export async function getBookmarkCount() {
  const resp = await fetch(`${API_BASE}/bookmarks/count`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  return await resp.json();
}

// Follow API functions
export async function followUser(username) {
  const resp = await fetch(`${API_BASE}/follows/${encodeURIComponent(username)}`, {
    method: 'POST',
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  return await resp.json();
}

export async function unfollowUser(username) {
  const resp = await fetch(`${API_BASE}/follows/${encodeURIComponent(username)}`, {
    method: 'DELETE',
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  return await resp.json();
}

export async function getFollowStatus(username) {
  const resp = await fetch(`${API_BASE}/follows/status/${encodeURIComponent(username)}`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
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

  const options = username ? {} : {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  };

  const resp = await fetch(url, options);
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

  const resp = await fetch(`${API_BASE}/stories/search?${params.toString()}`, {
    headers: {
      'X-Internal-Id': getInternalId(),
    },
  });
  
  if (!resp.ok) {
    throw new Error(`Failed to search stories: ${resp.status}`);
  }
  
  return await resp.json();
}

// API module exports complete

