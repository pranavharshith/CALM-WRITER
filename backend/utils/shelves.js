const BookmarkShelf = require('../models/BookmarkShelf');

const MAX_SHELVES = 20;
const MAX_STORIES = 200;
const NAME_MIN = 2;
const NAME_MAX = 40;
const DESC_MAX = 200;
const RESERVED_SLUGS = new Set(['all', 'new', 'shelves']);

function slugify(name) {
  const slug = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || 'shelf';
}

async function uniqueSlug(ownerInternalId, base, ignoreId = null) {
  let root = slugify(base);
  if (RESERVED_SLUGS.has(root)) root = `${root}-list`;
  let slug = root;
  let n = 2;
  const query = { ownerInternalId, slug };
  while (true) {
    const existing = await BookmarkShelf.findOne(query).select('_id').lean();
    if (!existing || (ignoreId && String(existing._id) === String(ignoreId))) return slug;
    const suffix = `-${n++}`;
    slug = `${root.slice(0, 40 - suffix.length)}${suffix}`;
    query.slug = slug;
  }
}

function parseName(raw) {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return { error: `Name must be ${NAME_MIN}–${NAME_MAX} characters.` };
  }
  return { name };
}

function parseDescription(raw) {
  if (raw == null) return { description: '' };
  if (typeof raw !== 'string') return { error: 'Description must be text.' };
  const description = raw.trim();
  if (description.length > DESC_MAX) {
    return { error: `Description must be ${DESC_MAX} characters or fewer.` };
  }
  return { description };
}

function parseVisibility(raw, fallback = 'private') {
  if (raw == null || raw === '') return { visibility: fallback };
  if (raw === 'public' || raw === 'private') return { visibility: raw };
  return { error: 'Visibility must be private or public.' };
}

async function activeStoriesInOrder(storyIds) {
  const Story = require('../models/Story');
  const { getActiveStoriesFilter } = require('./storyQueryHelper');
  const orderedIds = (storyIds || []).map((id) => String(id));
  if (orderedIds.length === 0) return [];
  const found = await Story.find({
    _id: { $in: orderedIds },
    ...getActiveStoriesFilter()
  }).lean();
  const map = new Map(found.map((s) => [String(s._id), s]));
  return orderedIds.map((id) => map.get(id)).filter(Boolean);
}

function serializeShelf(shelf, coverStory = null, username = null) {
  const coverOk = coverStory && coverStory.showCoverImage !== false;
  return {
    _id: shelf._id,
    name: shelf.name,
    slug: shelf.slug,
    description: shelf.description || '',
    visibility: shelf.visibility,
    storyCount: Array.isArray(shelf.storyIds) ? shelf.storyIds.length : 0,
    storyIds: shelf.storyIds || [],
    coverImage: coverOk ? coverStory.coverImage || null : null,
    updatedAt: shelf.updatedAt,
    ownerUsername: username || null
  };
}

module.exports = {
  MAX_SHELVES,
  MAX_STORIES,
  NAME_MIN,
  NAME_MAX,
  DESC_MAX,
  slugify,
  uniqueSlug,
  parseName,
  parseDescription,
  parseVisibility,
  serializeShelf,
  activeStoriesInOrder
};
