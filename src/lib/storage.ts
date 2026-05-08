import { Preferences } from '@capacitor/preferences';

const STORAGE_KEYS = {
  PLANS: 'study_plans',
  PROGRESS: 'study_progress',
  PROFILE: 'user_profile',
  CHATS: 'study_chats',
  SESSIONS: 'study_sessions',
  SCHEDULED: 'scheduled_sessions',
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
  await Preferences.remove({ key: STORAGE_KEYS.PLANS });
  await Preferences.remove({ key: STORAGE_KEYS.PROGRESS });
  await Preferences.remove({ key: STORAGE_KEYS.PROFILE });
  await Preferences.remove({ key: STORAGE_KEYS.CHATS });
  await Preferences.remove({ key: STORAGE_KEYS.SESSIONS });
  await Preferences.remove({ key: STORAGE_KEYS.SCHEDULED });
};
