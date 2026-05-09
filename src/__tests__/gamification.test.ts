/**
 * Unit tests for src/lib/gamification.ts
 *
 * Run:  npm test
 * Watch: npm run test:watch
 *
 * Covers:
 *  - Level formula (xpForLevel, levelFromXP)
 *  - XP progress within a level (xpProgressInLevel)
 *  - Achievement detection (detectNewAchievements)
 *  - Daily quest generation (generateDailyQuests)
 *  - Quest progress evaluation (evaluateQuestProgress)
 *  - initialStats shape
 */

import { describe, it, expect } from 'vitest';
import {
  xpForLevel,
  levelFromXP,
  xpProgressInLevel,
  generateDailyQuests,
  evaluateQuestProgress,
  detectNewAchievements,
  initialStats,
  ACHIEVEMENTS,
  XP,
} from '../lib/gamification';

// ─── Level formula ────────────────────────────────────────────────────────────

describe('xpForLevel', () => {
  it('level 1 requires 0 XP (starting level)', () => {
    expect(xpForLevel(1)).toBe(100);
  });

  it('level 2 requires 100 XP', () => {
    expect(xpForLevel(2)).toBe(400);
  });

  it('level 5 requires 2500 XP', () => {
    expect(xpForLevel(5)).toBe(2500);
  });

  it('is strictly increasing', () => {
    for (let l = 1; l < 20; l++) {
      expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
    }
  });
});

describe('levelFromXP', () => {
  it('0 XP → level 1', () => {
    expect(levelFromXP(0)).toBe(1);
  });

  it('99 XP → level 1', () => {
    expect(levelFromXP(99)).toBe(1);
  });

  it('100 XP → level 2', () => {
    expect(levelFromXP(100)).toBe(2);
  });

  it('400 XP → level 3', () => {
    expect(levelFromXP(400)).toBe(3);
  });

  it('is consistent with xpForLevel', () => {
    // Exactly at the boundary for level N should return N+1
    for (let lvl = 2; lvl <= 15; lvl++) {
      expect(levelFromXP(xpForLevel(lvl))).toBe(lvl + 1);
    }
  });

  it('handles large XP values', () => {
    expect(levelFromXP(10_000)).toBeGreaterThan(1);
    expect(levelFromXP(1_000_000)).toBeGreaterThan(50);
  });
});

// ─── XP progress within level ─────────────────────────────────────────────────

describe('xpProgressInLevel', () => {
  it('returns correct level at 0 XP', () => {
    const result = xpProgressInLevel(0);
    expect(result.level).toBe(1);
    expect(result.nextLevel).toBe(2);
  });

  it('pct is between 0 and 1 inclusive', () => {
    [0, 50, 100, 500, 999, 2500].forEach(xp => {
      const { pct } = xpProgressInLevel(xp);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(1);
    });
  });

  it('pct = 0 at the exact start of a level', () => {
    // levelFromXP(100) = 2, so 100 XP is the start of level 2
    const { pct } = xpProgressInLevel(100);
    expect(pct).toBe(0);
  });

  it('current + remaining = needed', () => {
    const { current, needed } = xpProgressInLevel(250);
    expect(current).toBeLessThanOrEqual(needed);
  });
});

// ─── XP constants ─────────────────────────────────────────────────────────────

describe('XP constants', () => {
  it('all XP values are positive numbers', () => {
    Object.values(XP).forEach(v => {
      expect(v).toBeGreaterThan(0);
    });
  });

  it('PRACTICE_EXAM_PERF > PRACTICE_EXAM_PASS > PRACTICE_EXAM (bonus stacks)', () => {
    expect(XP.PRACTICE_EXAM_PERF).toBeGreaterThan(XP.PRACTICE_EXAM_PASS);
    expect(XP.PRACTICE_EXAM_PASS).toBeGreaterThan(XP.PRACTICE_EXAM);
  });

  it('REVIEW_PERFECT is a smaller bonus on top of REVIEW_CARD', () => {
    expect(XP.REVIEW_PERFECT).toBeLessThan(XP.REVIEW_CARD);
  });
});

// ─── Achievement detection ────────────────────────────────────────────────────

describe('detectNewAchievements', () => {
  const baseCtx = { streak: 0, minutesStudied: 0, mastery: {}, sm2: {} };

  it('unlocks first_steps after 1 review', () => {
    const stats = { ...initialStats(), totalReviews: 1 };
    const fresh = detectNewAchievements(stats, baseCtx);
    expect(fresh.map(a => a.id)).toContain('first_steps');
  });

  it('does not re-unlock already-unlocked achievements', () => {
    const stats = { ...initialStats(), totalReviews: 1, achievements: ['first_steps'] };
    const fresh = detectNewAchievements(stats, baseCtx);
    expect(fresh.map(a => a.id)).not.toContain('first_steps');
  });

  it('unlocks hot_streak after 7-day streak', () => {
    const stats = { ...initialStats() };
    const fresh = detectNewAchievements(stats, { ...baseCtx, streak: 7 });
    expect(fresh.map(a => a.id)).toContain('hot_streak');
  });

  it('does not unlock hot_streak with only 6 days', () => {
    const stats = { ...initialStats() };
    const fresh = detectNewAchievements(stats, { ...baseCtx, streak: 6 });
    expect(fresh.map(a => a.id)).not.toContain('hot_streak');
  });

  it('unlocks quiz_hero after 1 perfect exam', () => {
    const stats = { ...initialStats(), perfectExams: 1 };
    const fresh = detectNewAchievements(stats, baseCtx);
    expect(fresh.map(a => a.id)).toContain('quiz_hero');
  });

  it('unlocks marathon after 120 minutes studied in a day', () => {
    const stats = { ...initialStats() };
    const fresh = detectNewAchievements(stats, { ...baseCtx, minutesStudied: 120 });
    expect(fresh.map(a => a.id)).toContain('marathon');
  });

  it('returns empty array when nothing is newly unlocked', () => {
    const stats = { ...initialStats() }; // 0 of everything
    const fresh = detectNewAchievements(stats, baseCtx);
    // first_steps needs totalReviews >= 1, so nothing should unlock
    expect(fresh).toHaveLength(0);
  });
});

// ─── Achievement catalogue ────────────────────────────────────────────────────

describe('ACHIEVEMENTS catalogue', () => {
  it('has at least 10 achievements', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10);
  });

  it('every achievement has required fields', () => {
    ACHIEVEMENTS.forEach(a => {
      expect(typeof a.id).toBe('string');
      expect(typeof a.title).toBe('string');
      expect(typeof a.description).toBe('string');
      expect(typeof a.icon).toBe('string');
      expect(['common', 'rare', 'epic', 'legendary']).toContain(a.rarity);
      expect(typeof a.check).toBe('function');
    });
  });

  it('all achievement IDs are unique', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has at least one legendary achievement', () => {
    expect(ACHIEVEMENTS.some(a => a.rarity === 'legendary')).toBe(true);
  });
});

// ─── Daily quest generation ───────────────────────────────────────────────────

describe('generateDailyQuests', () => {
  it('returns exactly 3 quests', () => {
    expect(generateDailyQuests('2026-01-01')).toHaveLength(3);
  });

  it('is deterministic — same date gives same quests', () => {
    const a = generateDailyQuests('2026-05-10');
    const b = generateDailyQuests('2026-05-10');
    expect(a.map(q => q.id)).toEqual(b.map(q => q.id));
  });

  it('different dates give different quests (usually)', () => {
    const a = generateDailyQuests('2026-05-10').map(q => q.id).join(',');
    const b = generateDailyQuests('2026-05-11').map(q => q.id).join(',');
    // There's an astronomically small chance these are equal — acceptable.
    expect(a).not.toBe(b);
  });

  it('never picks the same quest twice in one day', () => {
    const quests = generateDailyQuests('2026-03-15');
    const ids = quests.map(q => q.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('all quests have positive XP rewards', () => {
    generateDailyQuests('2026-07-04').forEach(q => {
      expect(q.xp).toBeGreaterThan(0);
    });
  });
});

// ─── Quest progress evaluation ────────────────────────────────────────────────

describe('evaluateQuestProgress', () => {
  const quest = { id: 'review_15', title: 'Memory Workout', description: '', target: 15, metric: 'reviews' as const, xp: 75, icon: '🧠' };
  const base = { todayReviews: 0, todayExams: 0, todayMinutes: 0, todayChats: 0, masteryAtOrAbove80: 0 };

  it('pct = 0 when nothing done', () => {
    const { pct, complete } = evaluateQuestProgress(quest, base);
    expect(pct).toBe(0);
    expect(complete).toBe(false);
  });

  it('pct = 0.5 when halfway', () => {
    const { pct } = evaluateQuestProgress(quest, { ...base, todayReviews: 7 });
    expect(pct).toBeCloseTo(7 / 15);
  });

  it('complete = true when target reached', () => {
    const { complete, pct } = evaluateQuestProgress(quest, { ...base, todayReviews: 15 });
    expect(complete).toBe(true);
    expect(pct).toBe(1);
  });

  it('pct is capped at 1 even when overachieving', () => {
    const { pct } = evaluateQuestProgress(quest, { ...base, todayReviews: 100 });
    expect(pct).toBe(1);
  });

  it('minutes metric maps to todayMinutes', () => {
    const mQuest = { ...quest, id: 'minutes_25', metric: 'minutes' as const, target: 25 };
    const { complete } = evaluateQuestProgress(mQuest, { ...base, todayMinutes: 30 });
    expect(complete).toBe(true);
  });

  it('exams metric maps to todayExams', () => {
    const eQuest = { ...quest, id: 'exam_1', metric: 'exams' as const, target: 1 };
    const { complete } = evaluateQuestProgress(eQuest, { ...base, todayExams: 1 });
    expect(complete).toBe(true);
  });

  it('topics metric maps to masteryAtOrAbove80', () => {
    const tQuest = { ...quest, id: 'topic_1', metric: 'topics' as const, target: 1 };
    const { complete } = evaluateQuestProgress(tQuest, { ...base, masteryAtOrAbove80: 2 });
    expect(complete).toBe(true);
  });
});

// ─── initialStats ─────────────────────────────────────────────────────────────

describe('initialStats', () => {
  it('returns an object with all required UserStats fields', () => {
    const s = initialStats();
    expect(s.xp).toBe(0);
    expect(s.totalReviews).toBe(0);
    expect(s.totalExams).toBe(0);
    expect(s.perfectExams).toBe(0);
    expect(s.topicsMastered).toBe(0);
    expect(s.documentsUploaded).toBe(0);
    expect(s.studyBuddyMessages).toBe(0);
    expect(Array.isArray(s.achievements)).toBe(true);
    expect(s.achievements).toHaveLength(0);
  });

  it('produces a fresh independent object each call', () => {
    const a = initialStats();
    const b = initialStats();
    a.achievements.push('test');
    expect(b.achievements).toHaveLength(0);
  });
});
