export const API_BASE = import.meta.env.VITE_API_URL || '/api';

let csrfToken = null;
let csrfTokenPromise = null;
let refreshPromise = null;
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { isOnline = true; });
    window.addEventListener('offline', () => {
        isOnline = false;
        console.warn('Connection lost - some features may be unavailable');
    });
}

export function checkOnlineStatus() {
    return isOnline;
}

export function getCSRFToken() {
    if (csrfToken) return csrfToken;

    if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrf-token') {
                csrfToken = decodeURIComponent(value);
                return csrfToken;
            }
        }
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            csrfToken = metaTag.getAttribute('content');
            return csrfToken;
        }
    }

    return null;
}

export async function fetchCSRFToken() {
    if (csrfTokenPromise) return csrfTokenPromise;

    csrfTokenPromise = (async () => {
        try {
            const resp = await fetch(`${API_BASE}/auth/csrf-token`, {
                method: 'GET',
                credentials: 'include',
            });
            if (resp.ok) {
                const data = await resp.json();
                csrfToken = data.token;
                return csrfToken;
            }
        } catch (error) {
            console.error('Failed to fetch CSRF token:', error);
        } finally {
            csrfTokenPromise = null;
        }
        return null;
    })();

    return csrfTokenPromise;
}

export function getAuthHeaders(contentType = 'application/json') {
    const headers = {};
    if (contentType) headers['Content-Type'] = contentType;

    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const token = getCSRFToken();
    if (token) headers['x-csrf-token'] = token;

    return headers;
}

export function isAuthenticated() {
    return !!localStorage.getItem('accessToken');
}

export function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('calmstories_user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
}

export function getInternalId() {
    return localStorage.getItem('calmstories_internal_id') || localStorage.getItem('internalId');
}

export function clearAuthState() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('calmstories_user');
    localStorage.removeItem('calmstories_internal_id');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    csrfToken = null;
}

export function resetCsrfCache() {
    csrfToken = null;
}

async function refreshAccessToken() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        let resp;
        try {
            resp = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
        } catch (error) {
            const err = new Error('Network error during token refresh');
            err.isTransient = true;
            throw err;
        }

        if (resp.status === 401) {
            clearAuthState();
            const err = new Error('Token refresh failed');
            err.isAuthExpired = true;
            throw err;
        }

        if (!resp.ok) {
            const err = new Error(`Token refresh failed (${resp.status})`);
            err.isTransient = true;
            throw err;
        }

        const data = await resp.json();
        localStorage.setItem('accessToken', data.accessToken);
        return data.accessToken;
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

function buildRequestHeaders(options = {}, method = 'GET') {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const incoming = { ...(options.headers || {}) };
    delete incoming.Authorization;
    delete incoming.authorization;
    const headers = { ...incoming, ...getAuthHeaders(null) };
    if (isFormData) {
        delete headers['Content-Type'];
        delete headers['content-type'];
    } else if (!headers['Content-Type'] && !headers['content-type'] && method !== 'GET' && method !== 'HEAD') {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
}

export async function authenticatedFetch(url, options = {}) {
    if (!checkOnlineStatus()) {
        throw new Error('You are offline. Please check your internet connection.');
    }

    try {
        const method = options.method || 'GET';
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            if (!getCSRFToken()) await fetchCSRFToken();
        }

        let response = await fetchWithTimeout(url, {
            ...options,
            credentials: 'include',
            headers: buildRequestHeaders(options, method),
        });

        if (response.status === 401) {
            try {
                await refreshAccessToken();
                response = await fetchWithTimeout(url, {
                    ...options,
                    credentials: 'include',
                    headers: buildRequestHeaders(options, method),
                });
            } catch (error) {
                if (error.isAuthExpired) {
                    window.dispatchEvent(new CustomEvent('auth:logout'));
                }
                throw error;
            }
        } else if (response.status === 403 && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            let csrfFail = false;
            try {
                const body = await response.clone().json();
                csrfFail = body?.code === 'CSRF_TOKEN_MISSING' || body?.code === 'CSRF_TOKEN_INVALID';
            } catch (e) { /* not JSON */ }
            if (csrfFail) {
                try {
                    resetCsrfCache();
                    await fetchCSRFToken();
                    response = await fetchWithTimeout(url, {
                        ...options,
                        credentials: 'include',
                        headers: buildRequestHeaders(options, method),
                    });
                } catch (error) {
                    console.error('CSRF token refresh failed:', error);
                }
            }
        }

        return response;
    } catch (error) {
        console.error('authenticatedFetch error:', error);
        throw error;
    }
}

export async function logoutThisDevice() {
    try {
        await authenticatedFetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });
    } catch (error) {
        console.error('Logout request failed:', error);
    } finally {
        clearAuthState();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }
    }
}

export async function logout() {
    try {
        const resp = await authenticatedFetch(`${API_BASE}/auth/logout-all`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });
        clearAuthState();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        return resp.ok;
    } catch (error) {
        clearAuthState();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        throw error;
    }
}
