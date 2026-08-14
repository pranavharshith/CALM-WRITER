import { API_BASE, authenticatedFetch, getAuthHeaders } from './client';

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
        limit: limit.toString(),
    });
    if (visibility) params.append('visibility', visibility);
    if (theme) params.append('theme', theme);
    const resp = await authenticatedFetch(`${API_BASE}/hubs?${params.toString()}`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function fetchHubCues() {
    const resp = await authenticatedFetch(`${API_BASE}/hubs/cues`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function markHubSeen(hubId) {
    const resp = await authenticatedFetch(`${API_BASE}/hubs/${hubId}/seen`, {
        method: 'POST',
        headers: getAuthHeaders(),
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

export async function fetchHubStories(hubId, page = 1, limit = 10) {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
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

export async function fetchMyHubCreatorApplication() {
    const resp = await authenticatedFetch(`${API_BASE}/hubs/my-application`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

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
