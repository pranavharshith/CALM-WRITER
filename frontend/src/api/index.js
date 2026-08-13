/**
 * Public API surface. Import from '../api/api' (legacy) or '../api'.
 * Domain files live beside this barrel — do not grow client.js with endpoints.
 */
export { API_BASE, authenticatedFetch, getAuthHeaders, fetchCSRFToken, logout, logoutThisDevice } from './client';
export * from './auth';
export * from './stories';
export * from './users';
export * from './drafts';
export * from './threads';
export * from './social';
export * from './hubs';
export * from './moderation';
export * from './admin';
export * from './misc';
