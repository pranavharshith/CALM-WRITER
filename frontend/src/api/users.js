import { API_BASE, authenticatedFetch, getAuthHeaders } from './client';

export async function fetchUserProfile(username) {
    const resp = await fetch(`${API_BASE}/users/profile/${username}`);
    if (!resp.ok) throw new Error(`Failed to fetch profile: ${resp.status}`);
    return await resp.json();
}

export async function fetchCurrentUser() {
    const resp = await authenticatedFetch(`${API_BASE}/users/me`, {
        headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch user: ${resp.status}`);
    const text = await resp.text();
    if (!text) throw new Error('Empty response body');
    return JSON.parse(text);
}

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

export async function fetchUserOnboarding() {
    const resp = await authenticatedFetch(`${API_BASE}/users/onboarding`, {
        headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch onboarding: ${resp.status}`);
    return await resp.json();
}

export async function fetchUserStats() {
    const resp = await authenticatedFetch(`${API_BASE}/users/stats`, {
        headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch stats: ${resp.status}`);
    return await resp.json();
}
