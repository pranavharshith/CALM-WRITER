import { API_BASE, authenticatedFetch, getAuthHeaders } from './client';

export async function requestOTP(email) {
    const resp = await fetch(`${API_BASE}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return await resp.json();
}

export async function verifyOTP(email, otp) {
    const resp = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
    });
    return await resp.json();
}

export async function verifyEmail(token) {
    const resp = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
    });
    return await resp.json();
}

export async function resendVerification(email) {
    const resp = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return await resp.json();
}

export async function setupUsername(internalId, username) {
    const resp = await authenticatedFetch(`${API_BASE}/auth/setup-username`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ internalId, username }),
    });
    return await resp.json();
}
