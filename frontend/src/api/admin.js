import { API_BASE, authenticatedFetch, getAuthHeaders } from './client';

export async function fetchAdminStats() {
    const resp = await authenticatedFetch(`${API_BASE}/admin/stats`, {
        headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch admin stats: ${resp.status}`);
    return await resp.json();
}

export async function fetchAdminActivity(limit = 20) {
    const resp = await authenticatedFetch(`${API_BASE}/admin/activity?limit=${limit}`, {
        headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch admin activity: ${resp.status}`);
    return await resp.json();
}

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
