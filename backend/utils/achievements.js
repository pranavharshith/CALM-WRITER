const UserAchievement = require('../models/UserAchievement');
const Story = require('../models/Story');
const WritingDay = require('../models/WritingDay');
const CollaborativeHub = require('../models/CollaborativeHub');
const ReadSession = require('../models/ReadSession');
const User = require('../models/User');

const CATALOG = [
  { id: 'first_story', title: 'First page', mark: 'I', hint: 'Publish your first story.' },
  { id: 'words_1k', title: 'A thousand words', mark: '1k', hint: 'Reach 1,000 published words.' },
  { id: 'words_10k', title: 'Ten thousand', mark: '10k', hint: 'Reach 10,000 published words.' },
  { id: 'streak_7', title: 'A quiet week', mark: '7', hint: 'Keep a 7-day writing streak.' },
  { id: 'streak_30', title: 'A month of pages', mark: '30', hint: 'Keep a 30-day writing streak.' },
  { id: 'goal_week', title: 'Seven full days', mark: 'G', hint: 'Meet your daily word goal on seven different days.' },
  { id: 'prompt_one', title: 'Answered the prompt', mark: 'P', hint: 'Publish a story from a daily prompt.' },
  { id: 'hub_join', title: 'In a room', mark: 'H', hint: 'Join a writing hub.' },
  { id: 'reader_10', title: 'Ten stories read', mark: 'R', hint: 'Finish reading 10 stories.' },
  { id: 'freeze_one', title: 'A soft landing', mark: 'F', hint: 'Earn a streak freeze at a milestone.' }
];

function catalogById() {
  return Object.fromEntries(CATALOG.map((b) => [b.id, b]));
}

async function buildContext(internalId, extras = {}) {
  const [stories, days, hubCount, readSessions, user] = await Promise.all([
    Story.find({ internalAuthorId: internalId, hidden: { $ne: true } })
      .select('wordCount promptId')
      .lean(),
    WritingDay.find({ userInternalId: internalId }).select('wordCount goalMet').lean(),
    CollaborativeHub.countDocuments({
      'members.userInternalId': internalId,
      archived: { $ne: true }
    }),
    ReadSession.find({ userInternalId: internalId }).select('percentRead storyId').lean(),
    User.findOne({ internalId }).select('freezeMilestonesEarned freezeTokens').lean()
  ]);

  const totalWords = stories.reduce((s, x) => s + (x.wordCount || 0), 0);
  const finished = new Set(
    readSessions.filter((r) => (r.percentRead || 0) >= 90).map((r) => String(r.storyId))
  );

  return {
    totalStories: stories.length,
    totalWords,
    currentStreak: extras.currentStreak || 0,
    bestStreak: extras.bestStreak || 0,
    goalMetDays: days.filter((d) => d.goalMet).length,
    hasPromptStory: stories.some((s) => !!s.promptId),
    hubCount,
    storiesRead: finished.size,
    earnedFreeze: (user?.freezeMilestonesEarned || []).length > 0 || (user?.freezeTokens || 0) > 0
  };
}

function unlockedIds(ctx) {
  const out = [];
  if (ctx.totalStories >= 1) out.push('first_story');
  if (ctx.totalWords >= 1000) out.push('words_1k');
  if (ctx.totalWords >= 10000) out.push('words_10k');
  if (ctx.currentStreak >= 7 || ctx.bestStreak >= 7) out.push('streak_7');
  if (ctx.currentStreak >= 30 || ctx.bestStreak >= 30) out.push('streak_30');
  if (ctx.goalMetDays >= 7) out.push('goal_week');
  if (ctx.hasPromptStory) out.push('prompt_one');
  if (ctx.hubCount >= 1) out.push('hub_join');
  if (ctx.storiesRead >= 10) out.push('reader_10');
  if (ctx.earnedFreeze) out.push('freeze_one');
  return out;
}

async function evaluateAchievements(internalId, extras = {}) {
  const ctx = await buildContext(internalId, extras);
  const want = unlockedIds(ctx);
  const existing = await UserAchievement.find({ userInternalId: internalId }).select('badgeId').lean();
  const have = new Set(existing.map((e) => e.badgeId));
  const fresh = want.filter((id) => !have.has(id));
  if (fresh.length) {
    try {
      await UserAchievement.insertMany(
        fresh.map((badgeId) => ({ userInternalId: internalId, badgeId })),
        { ordered: false }
      );
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }
  const lookup = catalogById();
  return fresh.map((id) => ({ id, title: lookup[id]?.title || id }));
}

async function listAchievements(internalId) {
  const rows = await UserAchievement.find({ userInternalId: internalId }).lean();
  const earnedMap = new Map(rows.map((r) => [r.badgeId, r.earnedAt]));
  const earned = [];
  const locked = [];
  for (const badge of CATALOG) {
    const at = earnedMap.get(badge.id);
    if (at) earned.push({ ...badge, earnedAt: at });
    else locked.push({ id: badge.id, title: badge.title, hint: badge.hint });
  }
  return { earned, locked };
}

module.exports = {
  CATALOG,
  evaluateAchievements,
  listAchievements
};
