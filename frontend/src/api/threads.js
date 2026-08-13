import { API_BASE, authenticatedFetch, getAuthHeaders } from './client';

export async function fetchThread(storyId) {
    const resp = await authenticatedFetch(`${API_BASE}/threads/${storyId}`, {
        headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch thread: ${resp.status}`);
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
