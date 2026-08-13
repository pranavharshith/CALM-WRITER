import { API_BASE, authenticatedFetch, getAuthHeaders } from './client';

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
    if (!resp.ok) throw new Error(`Failed to fetch story: ${resp.status}`);
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

export async function fetchCommunityFeed(page = 1, sort = 'latest') {
    try {
        const resp = await authenticatedFetch(`${API_BASE}/stories/feed?page=${page}&sort=${sort}`, {
            headers: getAuthHeaders(null),
        });
        if (!resp.ok) throw new Error(`Failed to fetch feed: ${resp.status}`);
        const text = await resp.text();
        if (!text) throw new Error('Empty response body');
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
        if (!resp.ok) throw new Error(`Failed to fetch following feed: ${resp.status}`);
        const text = await resp.text();
        if (!text) throw new Error('Empty response body');
        return JSON.parse(text);
    } catch (error) {
        console.error('fetchFollowingFeed error:', error);
        throw error;
    }
}

export async function fetchForYouFeed(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const resp = await authenticatedFetch(`${API_BASE}/stories/for-you?skip=${skip}&limit=${limit}`, {
        headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch personalized feed: ${resp.status}`);
    const text = await resp.text();
    if (!text) throw new Error('Empty response body');
    return JSON.parse(text);
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
    if (!resp.ok) throw new Error(`Failed to fetch story: ${resp.status}`);
    const data = await resp.json();
    return data.story;
}

export async function likeStory(storyId) {
    const resp = await authenticatedFetch(`${API_BASE}/stories/like`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ storyId }),
    });
    const data = await resp.json();
    if (data?.success) {
        const { cachePatchStory } = await import('../utils/screenCache');
        cachePatchStory(storyId, {
            likes: data.likes,
            isLikedByUser: !!data.liked,
        });
    }
    return data;
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

export async function searchStories(query, filters = {}, page = 1, limit = 10) {
    const params = new URLSearchParams({
        q: query || '',
        page: page.toString(),
        limit: limit.toString(),
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
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        return { success: false, error: data.error || `Failed to search stories: ${resp.status}`, stories: [] };
    }
    return data;
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
