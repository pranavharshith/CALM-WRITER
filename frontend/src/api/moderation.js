import { API_BASE, authenticatedFetch, getAuthHeaders } from './client';

export async function reportContent(storyId, storyNodeId, reason, details) {
    const resp = await authenticatedFetch(`${API_BASE}/admin/report`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ storyId, storyNodeId, reason, details }),
    });
    return await resp.json();
}

export async function fetchReports(status = 'pending') {
    const resp = await authenticatedFetch(`${API_BASE}/moderation/reports?status=${status}`, {
        headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch reports: ${resp.status}`);
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
