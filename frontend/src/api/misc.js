import { API_BASE, authenticatedFetch, getAuthHeaders } from './client';

export async function fetchLeaderboard(period = '24h') {
    const resp = await authenticatedFetch(`${API_BASE}/stories/leaderboard?period=${period}`);
    if (!resp.ok) throw new Error(`Failed to fetch leaderboard: ${resp.status}`);
    return await resp.json();
}

export async function fetchTopStories(period = '24h', limit = 20) {
    try {
        const params = new URLSearchParams({ period, limit: String(limit) });
        const resp = await authenticatedFetch(`${API_BASE}/leaderboards/top-stories?${params}`);
        if (!resp.ok) throw new Error(`Failed to fetch top stories: ${resp.status}`);
        const text = await resp.text();
        if (!text) throw new Error('Empty response body');
        return JSON.parse(text);
    } catch (error) {
        console.error('fetchTopStories error:', error);
        throw error;
    }
}

export async function fetchMostFeltLeaderboard(limit = 10) {
    const resp = await authenticatedFetch(`${API_BASE}/leaderboards/most-felt?limit=${limit}`);
    if (!resp.ok) throw new Error(`Failed to fetch leaderboard: ${resp.status}`);
    return await resp.json();
}

export async function fetchQuietlyPowerfulLeaderboard(limit = 10) {
    const resp = await authenticatedFetch(`${API_BASE}/leaderboards/quietly-powerful?limit=${limit}`);
    if (!resp.ok) throw new Error(`Failed to fetch leaderboard: ${resp.status}`);
    return await resp.json();
}

export async function fetchGrowingStoriesLeaderboard(limit = 10, days = 7) {
    const resp = await authenticatedFetch(`${API_BASE}/leaderboards/growing-stories?limit=${limit}&days=${days}`);
    if (!resp.ok) throw new Error(`Failed to fetch leaderboard: ${resp.status}`);
    return await resp.json();
}

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
    if (!resp.ok) return { count: 0, unreadCount: 0 };
    const text = await resp.text();
    if (!text) return { count: 0, unreadCount: 0 };
    const data = JSON.parse(text);
    const count = data.count ?? data.unreadCount ?? 0;
    return { ...data, count, unreadCount: data.unreadCount ?? count };
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

export async function translateText(contentId, contentType, text, targetLanguage) {
    const resp = await authenticatedFetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ contentId, contentType, text, targetLanguage }),
    });
    return await resp.json();
}

export async function fetchDailyPrompt() {
    const resp = await fetch(`${API_BASE}/prompts/current`);
    return await resp.json();
}
