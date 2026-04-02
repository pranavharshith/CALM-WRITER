/**
 * screenCache — module-level in-memory cache for screen data.
 *
 * Lives for the lifetime of the browser session (resets on full refresh).
 * This prevents re-triggering the skeleton when the user navigates back
 * to a page they already visited recently.
 *
 * Usage:
 *   import { cacheGet, cachePut, cacheHas } from '../utils/screenCache';
 *
 *   // Check before fetching
 *   if (cacheHas('feed:latest')) {
 *     setStories(cacheGet('feed:latest'));
 *     setLoading(false);
 *   } else {
 *     // fetch, then:
 *     cachePut('feed:latest', fetchedStories);
 *   }
 */

// Default time-to-live: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

const store = new Map(); // key → { data, expiresAt }

/**
 * Check whether a valid (non-expired) cache entry exists for `key`.
 */
export function cacheHas(key) {
    const entry = store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return false;
    }
    return true;
}

/**
 * Retrieve the cached value for `key` (returns undefined if missing/expired).
 */
export function cacheGet(key) {
    if (!cacheHas(key)) return undefined;
    return store.get(key).data;
}

/**
 * Store `data` under `key` with an optional TTL (ms).
 */
export function cachePut(key, data, ttl = DEFAULT_TTL) {
    store.set(key, { data, expiresAt: Date.now() + ttl });
}

/**
 * Manually invalidate a cache entry (e.g., after publishing a new story).
 */
export function cacheClear(key) {
    store.delete(key);
}

/**
 * Invalidate all entries whose keys start with `prefix`.
 */
export function cacheClearPrefix(prefix) {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
    }
}
