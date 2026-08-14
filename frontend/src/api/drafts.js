import { API_BASE, authenticatedFetch, getAuthHeaders } from './client';

export async function saveDraft(title, text, draftId = null, promptId = null) {
    const resp = await authenticatedFetch(`${API_BASE}/drafts/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, text, draftId, promptId }),
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

export async function publishDraft(draftId) {
    const resp = await authenticatedFetch(`${API_BASE}/drafts/${draftId}/publish`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return await resp.json();
}
