const User = require('../models/User');

function snippetOf(text, n = 200) {
  const src = typeof text === 'string' ? text : '';
  return src.length > n ? `${src.slice(0, n)}...` : src;
}

function cardFromStory(story, author, internalId) {
  const snippet = snippetOf(story.text, 200);
  return {
    _id: story._id,
    title: story.title,
    text: snippet,
    preview: snippet,
    wordCount: story.wordCount,
    likes: story.likes,
    authorUsername: author?.username || story.authorUsername || 'Anonymous',
    authorDisplayName: author?.displayName || story.authorDisplayName || 'Anonymous',
    authorProfilePicture: author?.profilePicture?.url || story.authorProfilePicture || null,
    coverImage: story.coverImage || null,
    showCoverImage: story.showCoverImage !== false,
    createdAt: story.createdAt,
    isLikedByUser: internalId ? !!(story.likedBy && story.likedBy.includes(internalId)) : false,
    tags: Array.isArray(story.tags) ? story.tags : []
  };
}

async function enrichStories(stories, internalId) {
  const ids = [...new Set(stories.map((s) => s.internalAuthorId).filter(Boolean))];
  if (ids.length === 0) {
    return stories.map((s) => cardFromStory(s, null, internalId));
  }
  const users = await User.find({ internalId: { $in: ids } })
    .select('internalId username displayName profilePicture')
    .lean();
  const map = new Map(users.map((u) => [u.internalId, u]));
  return stories.map((s) => cardFromStory(s, map.get(s.internalAuthorId), internalId));
}

module.exports = { snippetOf, cardFromStory, enrichStories };
