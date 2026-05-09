import { Preferences } from '@capacitor/preferences';

const STORAGE_KEYS = {
  PLANS: 'study_plans',
  PROGRESS: 'study_progress',
  PROFILE: 'user_profile',
  CHATS: 'study_chats',
  SESSIONS: 'study_sessions',
  SCHEDULED: 'scheduled_sessions',
  SM2: 'sm2_cards',
  MASTERY: 'topic_mastery',
  EXAM_SETTINGS: 'exam_settings',
  PRACTICE_HISTORY: 'practice_history',
  WEEKLY_GOAL: 'weekly_goal',
  USER_STATS: 'user_stats',
};

// ─── SM-2 Spaced Repetition ───────────────────────────────────────────────────
// Based on the SuperMemo SM-2 algorithm (Wozniak, 1987) — the algorithm
// that powers Anki. Models the Ebbinghaus forgetting curve to schedule
// optimal review intervals.

export interface SM2Card {
  id: string;           // topicId + '::' + cardIndex
  topicId: string;
  question: string;
  answer: string;
  easeFactor: number;   // starts at 2.5; increases with correct answers
  interval: number;     // days until next review
  repetitions: number;  // consecutive correct reviews
  dueDate: string;      // ISO date string
  lastReviewed: string | null;
}

/**
 * Update an SM-2 card after a review.
 * @param card  Current card state
 * @param grade 0 = complete blackout, 3 = recalled with difficulty, 5 = perfect
 */
export function sm2Update(card: SM2Card, grade: number): SM2Card {
  let { easeFactor, interval, repetitions } = card;

  if (grade >= 3) {
    if (repetitions === 0)      interval = 1;
    else if (repetitions === 1) interval = 6;
    else                        interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    // Forgot — reset interval but keep (slightly reduced) ease factor
    repetitions = 0;
    interval = 1;
  }

  // EF update formula from SM-2 paper
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));

  const due = new Date();
  due.setDate(due.getDate() + interval);

  return {
    ...card,
    easeFactor: parseFloat(easeFactor.toFixed(3)),
    interval,
    repetitions,
    dueDate: due.toISOString().split('T')[0],
    lastReviewed: new Date().toISOString().split('T')[0],
  };
}

/** Create a fresh SM-2 card (due today) */
export function sm2NewCard(topicId: string, cardIndex: number, question: string, answer: string): SM2Card {
  return {
    id: `${topicId}::${cardIndex}`,
    topicId,
    question,
    answer,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: new Date().toISOString().split('T')[0],
    lastReviewed: null,
  };
}

export const saveAllSM2Cards = async (cards: Record<string, SM2Card>) => {
  try { await Preferences.set({ key: STORAGE_KEYS.SM2, value: JSON.stringify(cards) }); }
  catch (e) { console.error('Failed to save SM2 cards:', e); }
};

export const getAllSM2Cards = async (): Promise<Record<string, SM2Card>> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.SM2 });
    return value ? JSON.parse(value) : {};
  } catch { return {}; }
};

// ─── Topic Mastery ────────────────────────────────────────────────────────────
export interface TopicMastery {
  topicId: string;
  score: number;      // 0–100
  totalReviews: number;
  correctReviews: number;
  lastUpdated: string;
}

export const saveMasteryData = async (data: Record<string, TopicMastery>) => {
  try { await Preferences.set({ key: STORAGE_KEYS.MASTERY, value: JSON.stringify(data) }); }
  catch (e) { console.error('Failed to save mastery:', e); }
};

export const getMasteryData = async (): Promise<Record<string, TopicMastery>> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.MASTERY });
    return value ? JSON.parse(value) : {};
  } catch { return {}; }
};

export interface StudySession {
  id: string;
  date: string;        // 'YYYY-MM-DD'
  durationMinutes: number;
  topicsCompleted: number;
}

export const saveLocalPlans = async (plans: any[]) => {
  try {
    await Preferences.set({
      key: STORAGE_KEYS.PLANS,
      value: JSON.stringify(plans),
    });
  } catch (error) {
    console.error('Failed to save local plans:', error);
  }
};

export const getLocalPlans = async () => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.PLANS });
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error('Failed to get local plans:', error);
    return [];
  }
};

export const saveLocalProgress = async (progress: any) => {
  try {
    await Preferences.set({
      key: STORAGE_KEYS.PROGRESS,
      value: JSON.stringify(progress),
    });
  } catch (error) {
    console.error('Failed to save local progress:', error);
  }
};

export const getLocalProgress = async () => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.PROGRESS });
    return value ? JSON.parse(value) : {};
  } catch (error) {
    console.error('Failed to get local progress:', error);
    return {};
  }
};

export const saveLocalProfile = async (profile: any) => {
  try {
    await Preferences.set({
      key: STORAGE_KEYS.PROFILE,
      value: JSON.stringify(profile),
    });
  } catch (error) {
    console.error('Failed to save local profile:', error);
  }
};

export const getLocalProfile = async () => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.PROFILE });
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Failed to get local profile:', error);
    return null;
  }
};

export const saveLocalChats = async (chats: any[]) => {
  try {
    await Preferences.set({
      key: STORAGE_KEYS.CHATS,
      value: JSON.stringify(chats),
    });
  } catch (error) {
    console.error('Failed to save local chats:', error);
  }
};

export const getLocalChats = async () => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.CHATS });
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error('Failed to get local chats:', error);
    return [];
  }
};

export const saveStudySessions = async (sessions: StudySession[]) => {
  try {
    await Preferences.set({ key: STORAGE_KEYS.SESSIONS, value: JSON.stringify(sessions) });
  } catch (error) {
    console.error('Failed to save study sessions:', error);
  }
};

export const getStudySessions = async (): Promise<StudySession[]> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.SESSIONS });
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error('Failed to get study sessions:', error);
    return [];
  }
};

export const saveScheduledSessions = async (sessions: any[]) => {
  try {
    await Preferences.set({ key: STORAGE_KEYS.SCHEDULED, value: JSON.stringify(sessions) });
  } catch (error) {
    console.error('Failed to save scheduled sessions:', error);
  }
};

export const getScheduledSessions = async (): Promise<any[]> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.SCHEDULED });
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error('Failed to get scheduled sessions:', error);
    return [];
  }
};

export const clearLocalData = async () => {
  await Promise.all(Object.values(STORAGE_KEYS).map(k => Preferences.remove({ key: k })));
};

// ─── Exam Settings ────────────────────────────────────────────────────────────
export interface ExamSettings {
  examDate: string; // 'YYYY-MM-DD'
  examName: string;
}

export const saveExamSettings = async (settings: ExamSettings) => {
  try { await Preferences.set({ key: STORAGE_KEYS.EXAM_SETTINGS, value: JSON.stringify(settings) }); }
  catch (e) { console.error('Failed to save exam settings:', e); }
};

export const getExamSettings = async (): Promise<ExamSettings | null> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.EXAM_SETTINGS });
    return value ? JSON.parse(value) : null;
  } catch { return null; }
};

// ─── Practice Exam History ────────────────────────────────────────────────────
export interface PracticeExamResult {
  id: string;
  topicId: string;
  topicTitle: string;
  score: number;       // 0–100
  totalQuestions: number;
  date: string;        // 'YYYY-MM-DD'
}

export const savePracticeHistory = async (history: PracticeExamResult[]) => {
  try { await Preferences.set({ key: STORAGE_KEYS.PRACTICE_HISTORY, value: JSON.stringify(history) }); }
  catch (e) { console.error('Failed to save practice history:', e); }
};

export const getPracticeHistory = async (): Promise<PracticeExamResult[]> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.PRACTICE_HISTORY });
    return value ? JSON.parse(value) : [];
  } catch { return []; }
};

// ─── Weekly Goal ──────────────────────────────────────────────────────────────
export interface WeeklyGoal {
  minutesPerWeek: number;
}

export const saveWeeklyGoal = async (goal: WeeklyGoal) => {
  try { await Preferences.set({ key: STORAGE_KEYS.WEEKLY_GOAL, value: JSON.stringify(goal) }); }
  catch (e) { console.error('Failed to save weekly goal:', e); }
};

export const getWeeklyGoal = async (): Promise<WeeklyGoal | null> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.WEEKLY_GOAL });
    return value ? JSON.parse(value) : null;
  } catch { return null; }
};

// ─── Gamification: User Stats ────────────────────────────────────────────────
export const saveUserStats = async (stats: any) => {
  try { await Preferences.set({ key: STORAGE_KEYS.USER_STATS, value: JSON.stringify(stats) }); }
  catch (e) { console.error('Failed to save user stats:', e); }
};

export const getUserStats = async (): Promise<any | null> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.USER_STATS });
    return value ? JSON.parse(value) : null;
  } catch { return null; }
};
