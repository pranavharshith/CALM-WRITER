import { API_BASE, authenticatedFetch, getAuthHeaders } from './client';

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
    const data = await resp.json();
    const bookmarked = !!(data.isBookmarked ?? data.bookmarked);
    return { ...data, bookmarked, isBookmarked: bookmarked };
}

export async function fetchBookmarks(page = 1, limit = 8, searchQuery = '') {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    });
    if (searchQuery) params.append('q', searchQuery);

    const resp = await authenticatedFetch(`${API_BASE}/bookmarks?${params.toString()}`, {
        headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch bookmarks: ${resp.status}`);
    return await resp.json();
}

export async function getBookmarkCount() {
    const resp = await authenticatedFetch(`${API_BASE}/bookmarks/count`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

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

export async function getFollowingList(username, page = 1, limit = 100) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    const url = username
        ? `${API_BASE}/follows/following/${encodeURIComponent(username)}?${params}`
        : `${API_BASE}/follows/following?${params}`;
    const resp = await authenticatedFetch(url, { headers: getAuthHeaders(null) });
    return await resp.json();
}
