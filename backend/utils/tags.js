const TAG_RE = /^[a-z0-9-]{2,24}$/;
const MAX_TAGS = 5;
const GRACE_MS = 5 * 60 * 1000;

function normalizeTag(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
}

function isValidTag(tag) {
  return typeof tag === 'string' && TAG_RE.test(tag);
}

function parseTags(input) {
  const src = Array.isArray(input) ? input : [];
  const out = [];
  const seen = new Set();
  for (const item of src) {
    const tag = normalizeTag(item);
    if (!isValidTag(tag) || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function canEditStoryTags(user, story) {
  if (!user) return false;
  if (user.canTagContent === true) return true;
  if (['trusted_user', 'moderator', 'admin'].includes(user.role)) return true;
  if (story && story.internalAuthorId === user.internalId) {
    const published = new Date(story.publishedAt || story.createdAt).getTime();
    return Date.now() - published <= GRACE_MS;
  }
  return false;
}

module.exports = {
  TAG_RE,
  MAX_TAGS,
  normalizeTag,
  isValidTag,
  parseTags,
  escapeRegex,
  canEditStoryTags
};
