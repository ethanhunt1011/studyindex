// ─── Gamification: XP, Levels, Achievements, Daily Quests ────────────────────
// Inspired by Duolingo and Anki's reward loops. The goal is to make the
// app addictive in a healthy way: every action earns visible progress,
// streaks compound, and weekly challenges keep students returning daily.

import type { SM2Card, TopicMastery } from './storage';

export interface UserStats {
  xp: number;
  totalReviews: number;          // every flashcard graded counts
  totalExams: number;             // practice exams completed
  perfectExams: number;           // exams with 100%
  topicsMastered: number;         // topics with mastery >= 80%
  documentsUploaded: number;
  studyBuddyMessages: number;     // chat sends with the AI
  achievements: string[];         // unlocked achievement IDs
  lastQuestRefreshDate: string;   // ISO date — re-roll quests at midnight
  questsCompletedToday: string[]; // quest IDs marked done today
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  metric: 'reviews' | 'exams' | 'minutes' | 'topics' | 'chats' | 'mastery';
  xp: number;        // XP rewarded on completion
  icon: string;      // emoji shown on the quest card
}

// ─── XP rewards ──────────────────────────────────────────────────────────────
export const XP = {
  REVIEW_CARD:        10,    // any flashcard reviewed
  REVIEW_PERFECT:     5,     // bonus for grade 5
  COMPLETE_TOPIC:     50,
  PRACTICE_EXAM:      30,    // base reward for finishing an exam
  PRACTICE_EXAM_PASS: 50,    // bonus for >= 70%
  PRACTICE_EXAM_PERF: 100,   // bonus for 100%
  STUDY_NOTES_VIEW:   5,
  CHAT_MESSAGE:       3,
  UPLOAD_DOCUMENT:    20,
  POMODORO_COMPLETE:  40,
  STREAK_DAY:         15,    // each day the streak counter increments
} as const;

// ─── Level formula ───────────────────────────────────────────────────────────
// Level n requires 100·n² XP cumulative. Level 1 = 0, Level 2 = 100, Level 3 = 400,
// Level 4 = 900, Level 5 = 1600… Quadratic growth keeps early progress fast and
// late progress meaningful — same shape RPGs use.
export const xpForLevel = (lvl: number) => 100 * lvl * lvl;

export const levelFromXP = (xp: number): number => {
  if (xp < 100) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const xpProgressInLevel = (xp: number) => {
  const lvl = levelFromXP(xp);
  const floor = xpForLevel(lvl - 1);
  const ceil  = xpForLevel(lvl);
  const range = ceil - floor;
  const into  = xp - floor;
  return { current: into, needed: range, pct: range > 0 ? into / range : 0, level: lvl, nextLevel: lvl + 1 };
};

// ─── Achievement catalogue ───────────────────────────────────────────────────
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  check: (stats: UserStats, ctx: { streak: number; minutesStudied: number; mastery: Record<string, TopicMastery>; sm2: Record<string, SM2Card> }) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_steps',  title: 'First Steps',     description: 'Complete your first flashcard review',     icon: '👣', rarity: 'common',
    check: s => s.totalReviews >= 1 },
  { id: 'bookworm',     title: 'Bookworm',        description: 'Upload 5 study documents',                 icon: '📚', rarity: 'common',
    check: s => s.documentsUploaded >= 5 },
  { id: 'card_master',  title: 'Card Master',     description: 'Review 100 flashcards',                    icon: '🎴', rarity: 'rare',
    check: s => s.totalReviews >= 100 },
  { id: 'card_legend',  title: 'Card Legend',     description: 'Review 1,000 flashcards',                  icon: '🏅', rarity: 'epic',
    check: s => s.totalReviews >= 1000 },
  { id: 'quiz_hero',    title: 'Quiz Hero',       description: 'Score 100% on a practice exam',            icon: '💯', rarity: 'rare',
    check: s => s.perfectExams >= 1 },
  { id: 'quiz_demon',   title: 'Quiz Demon',      description: 'Score 100% on 10 practice exams',          icon: '👑', rarity: 'legendary',
    check: s => s.perfectExams >= 10 },
  { id: 'polymath',     title: 'Polymath',        description: 'Master 10 topics (≥80% score)',            icon: '🧠', rarity: 'epic',
    check: s => s.topicsMastered >= 10 },
  { id: 'hot_streak',   title: 'Hot Streak',      description: 'Study 7 days in a row',                    icon: '🔥', rarity: 'rare',
    check: (_, c) => c.streak >= 7 },
  { id: 'iron_will',    title: 'Iron Will',       description: 'Study 30 days in a row',                   icon: '⚔️', rarity: 'legendary',
    check: (_, c) => c.streak >= 30 },
  { id: 'marathon',     title: 'Marathon',        description: 'Study for 2 hours in a single day',        icon: '🏃', rarity: 'rare',
    check: (_, c) => c.minutesStudied >= 120 },
  { id: 'curious_mind', title: 'Curious Mind',    description: 'Send 50 messages to Study Buddy',          icon: '💬', rarity: 'common',
    check: s => s.studyBuddyMessages >= 50 },
  { id: 'level_10',     title: 'Veteran',         description: 'Reach Level 10',                            icon: '⭐', rarity: 'epic',
    check: s => levelFromXP(s.xp) >= 10 },
  { id: 'level_25',     title: 'Master Scholar',  description: 'Reach Level 25',                            icon: '🌟', rarity: 'legendary',
    check: s => levelFromXP(s.xp) >= 25 },
];

// ─── Achievement detection ───────────────────────────────────────────────────
// Returns the IDs of achievements newly unlocked after an action.
export const detectNewAchievements = (
  stats: UserStats,
  ctx: { streak: number; minutesStudied: number; mastery: Record<string, TopicMastery>; sm2: Record<string, SM2Card> }
): Achievement[] => {
  const unlocked = new Set(stats.achievements);
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.check(stats, ctx)) fresh.push(a);
  }
  return fresh;
};

// ─── Daily quest pool ────────────────────────────────────────────────────────
// Three quests are rolled each day from this pool. Quests reset at midnight
// local time. Targets scale: easier quests give less XP, ambitious ones more.
const QUEST_POOL: DailyQuest[] = [
  { id: 'review_5',  title: 'Quick Recall',       description: 'Review 5 flashcards',          target: 5,  metric: 'reviews', xp: 30,  icon: '🎴' },
  { id: 'review_15', title: 'Memory Workout',     description: 'Review 15 flashcards',         target: 15, metric: 'reviews', xp: 75,  icon: '🧠' },
  { id: 'review_30', title: 'Deep Recall',        description: 'Review 30 flashcards',         target: 30, metric: 'reviews', xp: 150, icon: '🔥' },
  { id: 'exam_1',    title: 'Test Yourself',      description: 'Complete 1 practice exam',     target: 1,  metric: 'exams',   xp: 50,  icon: '🎓' },
  { id: 'exam_2',    title: 'Double Test',        description: 'Complete 2 practice exams',    target: 2,  metric: 'exams',   xp: 120, icon: '📝' },
  { id: 'minutes_25',title: 'Focused Sprint',     description: 'Study for 25 minutes',         target: 25, metric: 'minutes', xp: 60,  icon: '⏱️' },
  { id: 'minutes_60',title: 'Hour of Power',      description: 'Study for 60 minutes',         target: 60, metric: 'minutes', xp: 150, icon: '💪' },
  { id: 'topic_1',   title: 'Topic Conqueror',    description: 'Reach 80% mastery on 1 topic', target: 1,  metric: 'topics',  xp: 100, icon: '🏆' },
  { id: 'chat_5',    title: 'Curious Learner',    description: 'Ask Study Buddy 5 questions',  target: 5,  metric: 'chats',   xp: 40,  icon: '💬' },
];

// ─── Deterministic daily quest selection ─────────────────────────────────────
// Same date → same quests for the day. Different dates → different quests.
// Prevents "reroll exploit" while still feeling fresh each day.
function dailySeed(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) h = (h * 31 + date.charCodeAt(i)) >>> 0;
  return h;
}

export const generateDailyQuests = (date: string): DailyQuest[] => {
  const seed = dailySeed(date);
  const pool = [...QUEST_POOL];
  const picked: DailyQuest[] = [];
  // Pick 3 quests pseudo-randomly using the seed (linear congruential generator).
  let s = seed;
  while (picked.length < 3 && pool.length) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const idx = s % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
};

// ─── Quest progress evaluator ────────────────────────────────────────────────
export const evaluateQuestProgress = (
  quest: DailyQuest,
  ctx: {
    todayReviews: number;
    todayExams: number;
    todayMinutes: number;
    todayChats: number;
    masteryAtOrAbove80: number;
  }
): { current: number; pct: number; complete: boolean } => {
  let current = 0;
  switch (quest.metric) {
    case 'reviews': current = ctx.todayReviews; break;
    case 'exams':   current = ctx.todayExams; break;
    case 'minutes': current = ctx.todayMinutes; break;
    case 'topics':  current = ctx.masteryAtOrAbove80; break;
    case 'chats':   current = ctx.todayChats; break;
    case 'mastery': current = ctx.masteryAtOrAbove80; break;
  }
  const pct = Math.min(current / quest.target, 1);
  return { current: Math.min(current, quest.target), pct, complete: current >= quest.target };
};

export const initialStats = (): UserStats => ({
  xp: 0,
  totalReviews: 0,
  totalExams: 0,
  perfectExams: 0,
  topicsMastered: 0,
  documentsUploaded: 0,
  studyBuddyMessages: 0,
  achievements: [],
  lastQuestRefreshDate: '',
  questsCompletedToday: [],
});
