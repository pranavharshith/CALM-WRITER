const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Get or create internal user ID
function getInternalId() {
  let id = localStorage.getItem('calmstories_internal_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
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

