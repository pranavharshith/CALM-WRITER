import { API_BASE, authenticatedFetch, getAuthHeaders } from './client';

export async function saveDraft(title, text, draftId = null, promptId = null, tags = null) {
    const body = { title, text, draftId, promptId };
    if (Array.isArray(tags)) body.tags = tags;
    const resp = await authenticatedFetch(`${API_BASE}/drafts/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
    });
    return await resp.json();
}

export async function fetchDrafts() {
    const resp = await authenticatedFetch(`${API_BASE}/drafts`, {
        headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch drafts: ${resp.status}`);
    return await resp.json();
}

export async function fetchDraft(draftId) {
    const resp = await authenticatedFetch(`${API_BASE}/drafts/${draftId}`, {
        headers: getAuthHeaders(null),
    });
    if (!resp.ok) throw new Error(`Failed to fetch draft: ${resp.status}`);
    return await resp.json();
}

export async function deleteDraft(draftId) {
    const resp = await authenticatedFetch(`${API_BASE}/drafts/${draftId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(null),
    });
    return await resp.json();
}

export async function publishDraft(draftId, tags = null) {
    const body = Array.isArray(tags) ? { tags } : {};
    const resp = await authenticatedFetch(`${API_BASE}/drafts/${draftId}/publish`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
    });
    return await resp.json();
}
