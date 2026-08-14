const WritingDay = require('../models/WritingDay');
const Story = require('../models/Story');
const User = require('../models/User');

const DEFAULT_GOAL = 300;
const FREEZE_MILESTONES = [7, 14, 30, 60, 100];

function utcDateKey(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}

function shiftDateKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function clampGoal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_GOAL;
  return Math.min(2000, Math.max(50, Math.round(n)));
}

function intensityFor(wordCount, goal) {
  const wc = Number(wordCount) || 0;
  if (wc <= 0) return 0;
  if (wc < goal * 0.5) return 1;
  if (wc < goal) return 2;
  if (wc < goal * 2) return 3;
  return 4;
}

async function afterPublishedStory(internalId, wordCount, when = new Date()) {
  const day = await recordPublishedWords(internalId, wordCount, when);
  try {
    const { evaluateAchievements } = require('./achievements');
    await evaluateAchievements(internalId);
  } catch (err) {
    console.error('Achievement evaluate error:', err.message);
  }
  return day;
}

async function recordPublishedWords(internalId, wordCount, when = new Date()) {
  const wc = Math.max(0, Number(wordCount) || 0);
  if (!internalId || wc <= 0) return null;
  const date = utcDateKey(when);
  const user = await User.findOne({ internalId }).select('preferences.dailyWordGoal').lean();
  const goal = clampGoal(user?.preferences?.dailyWordGoal);

  const doc = await WritingDay.findOneAndUpdate(
    { userInternalId: internalId, date },
    { $inc: { wordCount: wc, storyCount: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const goalMet = doc.wordCount >= goal;
  if (doc.goalMet !== goalMet) {
    doc.goalMet = goalMet;
    await doc.save();
  }
  return doc;
}

async function ensureBackfilled(internalId) {
  const user = await User.findOne({ internalId }).select('writingDaysBackfilled preferences.dailyWordGoal');
  if (!user || user.writingDaysBackfilled) return false;

  const stories = await Story.find({
    internalAuthorId: internalId,
    hidden: { $ne: true }
  }).select('createdAt publishedAt wordCount').lean();

  const goal = clampGoal(user.preferences?.dailyWordGoal);
  if (stories.length) {
    const byDay = new Map();
    for (const s of stories) {
      const key = utcDateKey(s.publishedAt || s.createdAt || new Date());
      const cur = byDay.get(key) || { wordCount: 0, storyCount: 0 };
      cur.wordCount += Math.max(0, s.wordCount || 0);
      cur.storyCount += 1;
      byDay.set(key, cur);
    }
    for (const [date, v] of byDay) {
      await WritingDay.updateOne(
        { userInternalId: internalId, date },
        {
          $setOnInsert: {
            wordCount: v.wordCount,
            storyCount: v.storyCount,
            goalMet: v.wordCount >= goal
          }
        },
        { upsert: true }
      );
    }
  }

  await User.updateOne({ internalId }, { $set: { writingDaysBackfilled: true } });
  return true;
}

function isIsolatedGap(date, written, used) {
  const today = utcDateKey();
  const newer = shiftDateKey(date, 1);
  const older = shiftDateKey(date, -1);
  const newerOk = newer === today || written.has(newer) || used.has(newer);
  const olderOk = written.has(older);
  return newerOk && olderOk;
}

function computeStreak(writtenKeys, freezeUsedDates = []) {
  const written = new Set(writtenKeys);
  const used = new Set(freezeUsedDates);
  const today = utcDateKey();
  const yesterday = shiftDateKey(today, -1);

  const covered = (key) => written.has(key) || used.has(key);

  let start = covered(today) ? today : yesterday;
  if (!covered(start)) {
    const pending = isIsolatedGap(yesterday, written, used) ? yesterday : null;
    return { currentStreak: 0, pendingFreezeDate: pending };
  }

  let currentStreak = 0;
  let cursor = start;
  let pendingFreezeDate = null;

  while (true) {
    if (written.has(cursor)) {
      currentStreak += 1;
      cursor = shiftDateKey(cursor, -1);
      continue;
    }
    if (used.has(cursor)) {
      cursor = shiftDateKey(cursor, -1);
      continue;
    }
    if (isIsolatedGap(cursor, written, used)) {
      pendingFreezeDate = cursor;
    }
    break;
  }

  return { currentStreak, pendingFreezeDate };
}

function computeBestStreak(writtenKeys) {
  if (!writtenKeys.length) return 0;
  const sorted = [...new Set(writtenKeys)].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === shiftDateKey(sorted[i - 1], 1)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

function buildHeatmap(dayMap, goal, weeks = 17) {
  const today = new Date();
  const dow = today.getUTCDay();
  const total = weeks * 7;
  const firstSunday = shiftDateKey(utcDateKey(today), -dow - (weeks - 1) * 7);
  const cells = [];
  for (let i = 0; i < total; i++) {
    const date = shiftDateKey(firstSunday, i);
    const rec = dayMap.get(date);
    const wordCount = rec?.wordCount || 0;
    cells.push({
      date,
      wordCount,
      storyCount: rec?.storyCount || 0,
      intensity: intensityFor(wordCount, goal)
    });
  }
  return cells;
}

function applyFreezeAndMilestones(user, writtenKeys, firstPass) {
  if (!user.freezeTokens) user.freezeTokens = 0;
  if (!Array.isArray(user.freezeMilestonesEarned)) user.freezeMilestonesEarned = [];
  if (!Array.isArray(user.freezeUsedDates)) user.freezeUsedDates = [];

  let { currentStreak, pendingFreezeDate } = firstPass;
  let freezeJustUsed = false;
  let freezeJustEarned = null;
  const today = utcDateKey();

  if (
    pendingFreezeDate &&
    pendingFreezeDate < today &&
    user.freezeTokens > 0 &&
    !user.freezeUsedDates.includes(pendingFreezeDate)
  ) {
    user.freezeTokens -= 1;
    user.freezeUsedDates.push(pendingFreezeDate);
    freezeJustUsed = true;
    currentStreak = computeStreak(writtenKeys, user.freezeUsedDates).currentStreak;
  }

  for (const mark of FREEZE_MILESTONES) {
    if (currentStreak >= mark && !user.freezeMilestonesEarned.includes(mark)) {
      user.freezeMilestonesEarned.push(mark);
      user.freezeTokens += 1;
      freezeJustEarned = mark;
    }
  }

  return { freezeJustUsed, freezeJustEarned, currentStreak };
}

module.exports = {
  DEFAULT_GOAL,
  FREEZE_MILESTONES,
  utcDateKey,
  shiftDateKey,
  clampGoal,
  intensityFor,
  recordPublishedWords,
  afterPublishedStory,
  ensureBackfilled,
  computeStreak,
  computeBestStreak,
  buildHeatmap,
  applyFreezeAndMilestones
};
