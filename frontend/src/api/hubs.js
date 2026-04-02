import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders(contentType = 'application/json') {
    const headers = {};

    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
}

export async function checkHubEligibility() {
    const resp = await fetch(`${API_BASE}/hubs/check-eligibility`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function createHub(hubData) {
    const resp = await fetch(`${API_BASE}/hubs/create`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify(hubData),
    });
    return await resp.json();
}

export async function fetchHubs(filters = {}) {
    const params = new URLSearchParams({
        visibility: filters.visibility || 'public',
        page: filters.page || 1,
        limit: filters.limit || 20
    });
    if (filters.theme && filters.theme !== 'all') params.append('theme', filters.theme);

    const resp = await fetch(`${API_BASE}/hubs?${params.toString()}`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function fetchMyHubs() {
    const resp = await fetch(`${API_BASE}/hubs/my-hubs`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function fetchHubDetails(hubId) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function updateHub(hubId, updates) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}`, {
        method: 'PATCH',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify(updates),
    });
    return await resp.json();
}

export async function archiveHub(hubId) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/archive`, {
        method: 'DELETE',
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

// Membership
export async function inviteToHub(hubId, inviteData) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/invite`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify(inviteData),
    });
    return await resp.json();
}

export async function requestJoinHub(hubId, message) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/join-request`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify({ message }),
    });
    return await resp.json();
}

export async function joinViaInvite(hubId, inviteToken) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/join-via-invite`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify({ inviteToken }),
    });
    return await resp.json();
}

export async function fetchJoinRequests(hubId, status = 'pending') {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/join-requests?status=${status}`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function approveJoinRequest(hubId, requestId) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/join-requests/${requestId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function rejectJoinRequest(hubId, requestId, reason) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/join-requests/${requestId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify({ reason }),
    });
    return await resp.json();
}

export async function removeMember(hubId, userId) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/members/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function updateMemberRole(hubId, userId, role) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/members/${userId}/role`, {
        method: 'PATCH',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify({ role }),
    });
    return await resp.json();
}

export async function leaveHub(hubId) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/leave`, {
        method: 'POST',
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

// Content
export async function submitHubStory(hubId, storyData) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/stories/submit`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify(storyData),
    });
    return await resp.json();
}

export async function fetchHubStories(hubId, options = {}) {
    const params = new URLSearchParams({
        page: options.page || 1,
        limit: options.limit || 10,
        sort: options.sort || 'latest'
    });

    const resp = await fetch(`${API_BASE}/hubs/${hubId}/stories?${params.toString()}`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function approveHubStory(hubId, storyId) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/stories/${storyId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function rejectHubStory(hubId, storyId) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/stories/${storyId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function fetchPendingStories(hubId) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/stories/pending`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

// Chat
export async function fetchHubChat(hubId, options = {}) {
    const params = new URLSearchParams({ limit: options.limit || 50 });
    if (options.before) params.append('before', options.before);

    const resp = await fetch(`${API_BASE}/hubs/${hubId}/chat?${params.toString()}`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function postHubChatMessage(hubId, message, replyTo = null) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/chat`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify({ message, replyTo }),
    });
    return await resp.json();
}

export async function pinChatMessage(hubId, messageId) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/chat/${messageId}/pin`, {
        method: 'POST',
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function unpinChatMessage(hubId, messageId) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/chat/${messageId}/pin`, {
        method: 'DELETE',
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function reactToChatMessage(hubId, messageId, emoji) {
    const resp = await fetch(`${API_BASE}/hubs/${hubId}/chat/${messageId}/react`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify({ emoji }),
    });
    return await resp.json();
}

// Applications
export async function applyForCreator(applicationData) {
    const resp = await fetch(`${API_BASE}/hubs/apply-creator`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify(applicationData),
    });
    return await resp.json();
}

export async function fetchMyApplication() {
    const resp = await fetch(`${API_BASE}/hubs/my-application`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function fetchCreatorApplications(status = 'pending') {
    const resp = await fetch(`${API_BASE}/hubs/creator-applications?status=${status}`, {
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function reviewCreatorApplication(id, decision, notes) {
    const resp = await fetch(`${API_BASE}/hubs/creator-applications/${id}/review`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify({ decision, notes }),
    });
    return await resp.json();
}
