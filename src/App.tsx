import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BookOpen, 
  Camera, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  LogOut, 
  Plus, 
  Settings as SettingsIcon,
  Trash2, 
  Upload,
  Loader2,
  Calendar,
  AlertCircle,
  Flame,
  BrainCircuit,
  ChevronLeft,
  Bell,
  CalendarPlus,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import {
  auth,
  db,
  signIn,
  logOut,
  handleFirestoreError,
  OperationType,
  setupRecaptcha,
  signInWithPhone,
  getSignInResult
} from './lib/firebase';
import { ConfirmationResult } from 'firebase/auth';
import {
  saveLocalPlans,
  getLocalPlans,
  saveLocalProgress,
  getLocalProgress,
  saveLocalProfile,
  getLocalProfile,
  clearLocalData,
  saveStudySessions,
  getStudySessions,
  saveScheduledSessions,
  getScheduledSessions,
  saveAllSM2Cards,
  getAllSM2Cards,
  saveMasteryData,
  getMasteryData,
  sm2Update,
  sm2NewCard,
  saveExamSettings,
  getExamSettings,
  savePracticeHistory,
  getPracticeHistory,
  saveWeeklyGoal,
  getWeeklyGoal,
  saveUserStats,
  getUserStats,
  StudySession,
  SM2Card,
  TopicMastery,
  ExamSettings,
  PracticeExamResult,
  WeeklyGoal,
} from './lib/storage';
import {
  XP,
  initialStats,
  detectNewAchievements,
  ACHIEVEMENTS,
  type UserStats,
  type Achievement,
} from './lib/gamification';
import type { Topic, Unit, Chapter, Flashcard } from './services/gemini';
import { cn } from './lib/utils';
import { Phone, Smartphone, ShieldAlert, Timer, Play, Pause, RotateCcw } from 'lucide-react';


interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  dailyLimit: number;
  reminderTime: string;
  focusTime?: number;
  topicsForDay?: number;
  streakCount?: number;
  lastStudyDate?: string;
  badges?: string[];
}

interface StudyPlan {
  id: string;
  bookTitle: string;
  units: Unit[];
  createdAt: any;
}

// Helper to get all topics from a plan in sequence
const getAllTopics = (units: Unit[]): Topic[] => {
  if (!units) return [];
  return units
    .sort((a, b) => a.order - b.order)
    .flatMap(u => 
      u.chapters
        .sort((a, b) => a.order - b.order)
        .flatMap(c => 
          c.topics.sort((a, b) => a.order - b.order)
        )
    );
};

interface Progress {
  planId: string;
  completedTopicIds: string[];
  lastStudiedAt: any;
}

interface ScheduledTopic {
  id: string;
  userId: string;
  topicId: string;
  planId: string;
  topicTitle: string;
  scheduledAt: any;
  reminderSent?: boolean;
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard, Analytics, StudyRooms, StudyBuddy, Settings, Login } from './pages';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDeepFocus, setIsDeepFocus] = useState(false);
  const [theme, setTheme] = useState<'day' | 'dark'>('day');
  const [timerSeconds, setTimerSeconds] = useState(1500);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [scheduledTopics, setScheduledTopics] = useState<ScheduledTopic[]>([]);
  const [fileId, setFileId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState<any>(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [currentFlashcards, setCurrentFlashcards] = useState<Flashcard[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [sm2Cards, setSm2Cards] = useState<Record<string, SM2Card>>({});
  const [masteryData, setMasteryData] = useState<Record<string, TopicMastery>>({});
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const [examSettings, setExamSettings] = useState<ExamSettings | null>(null);
  const [practiceHistory, setPracticeHistory] = useState<PracticeExamResult[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [userStats, setUserStats] = useState<UserStats>(initialStats);
  const [achievementToast, setAchievementToast] = useState<Achievement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setShowCelebration(true);
      // Track this completed focus session
      const durationMins = profile?.focusTime || 25;
      const newSession: StudySession = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        durationMinutes: durationMins,
        topicsCompleted: 0,
      };
      setStudySessions(prev => {
        const updated = [...prev, newSession];
        saveStudySessions(updated);
        return updated;
      });
      completeSession();
      handlePomodoroComplete();
      // Reset timer for next session
      setTimerSeconds((profile?.focusTime || 25) * 60);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // ── Auth state listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }

    // Catch any pending Android redirect result first
    getSignInResult().catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && db) {
        try {
          const profileRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(profileRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              dailyLimit: 2,
              reminderTime: '09:00',
              focusTime: 25,
              topicsForDay: 2,
              streakCount: 0,
              badges: [],
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
          }
        } catch (e) {
          console.error('Profile load error:', e);
        }
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!loading) {
      saveLocalPlans(plans);
      saveLocalProgress(progress);
    }
  }, [plans, progress, loading]);

  useEffect(() => {
    const loadData = async () => {
      const [localPlans, localProgress, localSessions, localScheduled, localSm2, localMastery, localExam, localPractice, localGoal, localStats] = await Promise.all([
        getLocalPlans(),
        getLocalProgress(),
        getStudySessions(),
        getScheduledSessions(),
        getAllSM2Cards(),
        getMasteryData(),
        getExamSettings(),
        getPracticeHistory(),
        getWeeklyGoal(),
        getUserStats(),
      ]);
      if (localPlans) setPlans(localPlans);
      if (localProgress) setProgress(localProgress);
      if (localSm2 && Object.keys(localSm2).length) setSm2Cards(localSm2);
      if (localMastery && Object.keys(localMastery).length) setMasteryData(localMastery);
      if (localSessions) setStudySessions(localSessions);
      if (localScheduled) setScheduledTopics(localScheduled);
      if (localExam) setExamSettings(localExam);
      if (localPractice && localPractice.length) setPracticeHistory(localPractice);
      if (localGoal) setWeeklyGoal(localGoal);
      if (localStats) setUserStats({ ...initialStats(), ...localStats });
      setLoading(false);
    };
    loadData();
  }, []);

  // ─── Gamification helper: award XP, then check & unlock achievements ───────
  const awardXPAndCheckAchievements = useCallback((
    xpDelta: number,
    statsDelta: Partial<UserStats> = {}
  ) => {
    setUserStats(prev => {
      const merged: UserStats = {
        ...prev,
        ...statsDelta,
        xp: prev.xp + xpDelta,
        // Numeric counters are *additive* if they were passed
        totalReviews:       prev.totalReviews       + (statsDelta.totalReviews       ?? 0),
        totalExams:         prev.totalExams         + (statsDelta.totalExams         ?? 0),
        perfectExams:       prev.perfectExams       + (statsDelta.perfectExams       ?? 0),
        documentsUploaded:  prev.documentsUploaded  + (statsDelta.documentsUploaded  ?? 0),
        studyBuddyMessages: prev.studyBuddyMessages + (statsDelta.studyBuddyMessages ?? 0),
      };
      // Re-derive topicsMastered from current mastery data
      merged.topicsMastered = Object.values(masteryData).filter((m: TopicMastery) => m.score >= 80).length;

      // Detect newly-unlocked achievements
      const totalMinutesToday = studySessions
        .filter(s => s.date === new Date().toISOString().split('T')[0])
        .reduce((sum, s) => sum + s.durationMinutes, 0);
      const fresh = detectNewAchievements(merged, {
        streak: profile?.streakCount || 0,
        minutesStudied: totalMinutesToday,
        mastery: masteryData,
        sm2: sm2Cards,
      });
      if (fresh.length > 0) {
        merged.achievements = [...merged.achievements, ...fresh.map(a => a.id)];
        setAchievementToast(fresh[0]);
        setTimeout(() => setAchievementToast(null), 5000);
      }

      saveUserStats(merged);
      return merged;
    });
  }, [masteryData, profile, studySessions, sm2Cards]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name, file.type);
    setProcessing(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Content = reader.result as string;
        console.log('File read, sending to /api/upload');
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: base64Content, mimeType: file.type }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Upload failed (${response.status})`);
        }

        const data = await response.json();
        console.log('File uploaded, fileId:', data.fileId);
        setFileId(data.fileId);

        // Extract study plan
        console.log('Extracting study plan...');
        const planResponse = await fetch('/api/extract-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: data.fileId }),
        });

        if (!planResponse.ok) {
          const errData = await planResponse.json().catch(() => ({}));
          throw new Error(errData.error || `Plan extraction failed (${planResponse.status})`);
        }

        const planData = await planResponse.json();
        const newPlan: StudyPlan = {
          id: data.fileId,
          bookTitle: planData.bookTitle || file.name,
          units: (planData.units || []).map((u: any, uIdx: number) => ({
            ...u,
            id: u.id || crypto.randomUUID(),
            order: u.order ?? uIdx,
            chapters: (u.chapters || []).map((c: any, cIdx: number) => ({
              ...c,
              id: c.id || crypto.randomUUID(),
              order: c.order ?? cIdx,
              topics: (c.topics || []).map((t: any, tIdx: number) => ({
                ...t,
                id: t.id || crypto.randomUUID(),
                order: t.order ?? tIdx,
              })),
            })),
          })),
          createdAt: new Date().toISOString()
        };

        setPlans(prev => [newPlan, ...prev]);
        setProgress(prev => ({
          ...prev,
          [newPlan.id]: { planId: newPlan.id, completedTopicIds: [], lastStudiedAt: new Date().toISOString() }
        }));

        handleDocumentUploaded();
        setProcessing(false);
      } catch (err: any) {
        console.error('Upload error:', err);
        setError(err?.message || 'Failed to upload file and extract plan.');
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };
  const toggleTopic = (planId: string, topicId: string) => {
    setProgress(prev => {
      const planProgress = prev[planId] || { planId, completedTopicIds: [], lastStudiedAt: new Date().toISOString() };
      const isCompleted = planProgress.completedTopicIds.includes(topicId);
      const newCompleted = isCompleted 
        ? planProgress.completedTopicIds.filter(id => id !== topicId)
        : [...planProgress.completedTopicIds, topicId];
      
      return {
        ...prev,
        [planId]: { ...planProgress, completedTopicIds: newCompleted, lastStudiedAt: new Date().toISOString() }
      };
    });
  };
  const deletePlan = (planId: string) => {
    setPlans(prev => prev.filter(p => p.id !== planId));
    setProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[planId];
      return newProgress;
    });
  };
  const handleLogout = async () => {
    try {
      await logOut();
      setUser(null);
      setProfile(null);
      setPlans([]);
      setProgress({});
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  const handleAddSchedule = (session: { topicTitle: string; date: string; time: string }) => {
    const newTopic = {
      id: Date.now().toString(),
      topicTitle: session.topicTitle,
      date: session.date,
      time: session.time,
      scheduledAt: new Date(`${session.date}T${session.time}`).toISOString(),
    };
    setScheduledTopics(prev => {
      const updated = [...prev, newTopic].sort(
        (a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
      saveScheduledSessions(updated);
      return updated;
    });
    setShowScheduleModal(null);
  };

  const suggestSchedule = async () => {
    if (!fileId) {
      setShowScheduleModal({ topic: { title: 'Study Session' }, isSuggest: true });
      return;
    }
    try {
      const deadlines = `Today is ${new Date().toLocaleDateString()}. Create a 7-day schedule.`;
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, deadlines }),
      });
      if (!response.ok) return;
      const suggestions: Array<{ date: string; topic: string; durationMinutes: number }> = await response.json();
      const newTopics = suggestions.slice(0, 5).map((s, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        const dateStr = d.toISOString().split('T')[0];
        return {
          id: `${Date.now()}-${i}`,
          topicTitle: s.topic,
          date: dateStr,
          time: '10:00',
          scheduledAt: new Date(`${dateStr}T10:00`).toISOString(),
        };
      });
      setScheduledTopics(prev => {
        const updated = [...(prev as any[]), ...newTopics].sort(
          (a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
        saveScheduledSessions(updated);
        return updated;
      });
    } catch (err) {
      console.error('suggestSchedule error:', err);
    }
  };

  const handleDeleteSchedule = (id: string) => {
    setScheduledTopics(prev => {
      const updated = (prev as any[]).filter((t: any) => t.id !== id);
      saveScheduledSessions(updated);
      return updated;
    });
  };

  const getGoogleCalendarUrl = (topic: any) => {
    try {
      const start = topic.scheduledAt
        ? new Date(topic.scheduledAt)
        : new Date(`${topic.date}T${topic.time || '10:00'}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
      const title = encodeURIComponent(topic.topicTitle || topic.title || 'Study Session');
      const details = encodeURIComponent('Scheduled via StudyIndex');
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
    } catch {
      return '';
    }
  };

  const handleGenerateFlashcards = async (topic: any) => {
    setCurrentFlashcards([]);
    setFlashcardIndex(0);
    setShowAnswer(false);
    setShowFlashcards(true);
    setCurrentTopicId(topic.id);
    try {
      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: topic.title,
          context: topic.dailyExercise || '',
        }),
      });
      if (!response.ok) throw new Error('Failed to generate flashcards');
      const cards = await response.json();
      // Initialise any new SM-2 cards that don't exist yet
      setSm2Cards(prev => {
        const updated = { ...prev };
        cards.forEach((c: any, i: number) => {
          const cardId = `${topic.id}::${i}`;
          if (!updated[cardId]) {
            updated[cardId] = sm2NewCard(topic.id, i, c.question, c.answer);
          }
        });
        saveAllSM2Cards(updated);
        return updated;
      });
      setCurrentFlashcards(cards);
    } catch (err) {
      console.error('Flashcard error:', err);
      setShowFlashcards(false);
    }
  };

  /**
   * SM-2 grade handler — called when user rates a flashcard.
   * grade: 1 = forgot, 3 = hard, 4 = good, 5 = easy
   */
  const handleSM2Grade = (cardIndex: number, grade: number) => {
    if (!currentTopicId) return;
    const cardId = `${currentTopicId}::${cardIndex}`;
    setSm2Cards(prev => {
      const existing = prev[cardId] ?? sm2NewCard(currentTopicId, cardIndex, '', '');
      const updated = { ...prev, [cardId]: sm2Update(existing, grade) };
      saveAllSM2Cards(updated);
      return updated;
    });
    // Award XP — review base + bonus for grade 5
    awardXPAndCheckAchievements(
      XP.REVIEW_CARD + (grade === 5 ? XP.REVIEW_PERFECT : 0),
      { totalReviews: 1 }
    );
    // Update mastery score (exponential moving average of grade/5)
    setMasteryData(prev => {
      const existing = prev[currentTopicId] ?? {
        topicId: currentTopicId, score: 0, totalReviews: 0, correctReviews: 0, lastUpdated: '',
      };
      const correct = grade >= 3 ? 1 : 0;
      const newTotal = existing.totalReviews + 1;
      const newCorrect = existing.correctReviews + correct;
      const newScore = Math.round((newCorrect / newTotal) * 100);
      const updated = {
        ...prev,
        [currentTopicId]: {
          topicId: currentTopicId,
          score: newScore,
          totalReviews: newTotal,
          correctReviews: newCorrect,
          lastUpdated: new Date().toISOString().split('T')[0],
        },
      };
      saveMasteryData(updated);
      return updated;
    });
    // Auto-advance to next card after grading
    if (cardIndex < currentFlashcards.length - 1) {
      setFlashcardIndex(cardIndex + 1);
      setShowAnswer(false);
    }
  };

  const handleSaveWeeklyGoal = (goal: WeeklyGoal) => {
    setWeeklyGoal(goal);
    saveWeeklyGoal(goal);
  };

  const handleSaveExamSettings = (settings: ExamSettings) => {
    setExamSettings(settings);
    saveExamSettings(settings);
  };

  const handleSavePracticeResult = (result: Omit<PracticeExamResult, 'id' | 'date'>) => {
    const newResult: PracticeExamResult = {
      ...result,
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
    };
    setPracticeHistory(prev => {
      const updated = [newResult, ...prev].slice(0, 50); // keep last 50 results
      savePracticeHistory(updated);
      return updated;
    });
    // Award XP based on exam score: base + pass bonus + perfect bonus
    const isPerfect = result.score === 100;
    const isPass    = result.score >= 70;
    const xpDelta = XP.PRACTICE_EXAM
                  + (isPass    ? XP.PRACTICE_EXAM_PASS : 0)
                  + (isPerfect ? XP.PRACTICE_EXAM_PERF : 0);
    awardXPAndCheckAchievements(xpDelta, {
      totalExams:   1,
      perfectExams: isPerfect ? 1 : 0,
    });
  };

  // Called when a chat message is sent in Study Buddy
  const handleChatMessage = useCallback(() => {
    awardXPAndCheckAchievements(XP.CHAT_MESSAGE, { studyBuddyMessages: 1 });
  }, [awardXPAndCheckAchievements]);

  // Called when a document is uploaded
  const handleDocumentUploaded = useCallback(() => {
    awardXPAndCheckAchievements(XP.UPLOAD_DOCUMENT, { documentsUploaded: 1 });
  }, [awardXPAndCheckAchievements]);

  // Called when a Pomodoro completes
  const handlePomodoroComplete = useCallback(() => {
    awardXPAndCheckAchievements(XP.POMODORO_COMPLETE);
  }, [awardXPAndCheckAchievements]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const updatedProfile = { ...profile, ...updates };
    setProfile(updatedProfile);
    saveLocalProfile(updatedProfile);
    try {
      await updateDoc(doc(db, 'users', profile.uid), updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const completeSession = async () => {
    if (!profile) return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastStudyDate = profile.lastStudyDate;
    
    let newStreak = profile.streakCount || 0;
    
    if (lastStudyDate) {
      const lastDate = new Date(lastStudyDate);
      const diffDays = Math.floor((new Date(today).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
    
    const newBadges = [...(profile.badges || [])];
    if (newStreak >= 7 && !newBadges.includes('7-Day Streak')) {
      newBadges.push('7-Day Streak');
    }
    
    // Update profile
    const updatedProfile = {
      ...profile,
      streakCount: newStreak,
      lastStudyDate: today,
      badges: newBadges
    };
    
    setProfile(updatedProfile);
    // Also need to save this to Firestore
    try {
      await updateDoc(doc(db, 'users', profile.uid), updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  // Show a full-screen spinner while auth + local data both resolve
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[#5A5A40] rounded-[14px] flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-[#5A5A40]" />
        </div>
      </div>
    );
  }

  // Show login screen when not authenticated and not in guest mode
  if (!user && !isGuest) {
    return <Login onGuestMode={() => setIsGuest(true)} />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={
            <Dashboard 
              user={user}
              plans={plans}
              progress={progress}
              loading={loading}
              handleFileUpload={handleFileUpload}
              toggleTopic={toggleTopic}
              deletePlan={deletePlan}
              isDeepFocus={isDeepFocus}
              theme={theme}
              timerSeconds={timerSeconds}
              formatTime={formatTime}
              isTimerRunning={isTimerRunning}
              setIsTimerRunning={setIsTimerRunning}
              setTimerSeconds={setTimerSeconds}
              setIsDeepFocus={setIsDeepFocus}
              profile={profile}
              handleLogout={handleLogout}
              suggestSchedule={suggestSchedule}
              scheduledTopics={scheduledTopics}
              handleDeleteSchedule={handleDeleteSchedule}
              getGoogleCalendarUrl={getGoogleCalendarUrl}
              fileInputRef={fileInputRef}
              processing={processing}
              error={error}
              fileId={fileId}
              setShowSettings={setShowSettings}
              setShowScheduleModal={setShowScheduleModal}
              setScheduleDate={setScheduleDate}
              setScheduleTime={setScheduleTime}
              showFlashcards={showFlashcards}
              currentFlashcards={currentFlashcards}
              flashcardIndex={flashcardIndex}
              showAnswer={showAnswer}
              setShowFlashcards={setShowFlashcards}
              setFlashcardIndex={setFlashcardIndex}
              setShowAnswer={setShowAnswer}
              showScheduleModal={showScheduleModal}
              isGuest={isGuest}
              completeSession={completeSession}
              handleAddSchedule={handleAddSchedule}
              handleGenerateFlashcards={handleGenerateFlashcards}
              handleSM2Grade={handleSM2Grade}
              sm2Cards={sm2Cards}
              masteryData={masteryData}
              showCelebration={showCelebration}
              setShowCelebration={setShowCelebration}
              studySessions={studySessions}
              handleSavePracticeResult={handleSavePracticeResult}
              weeklyGoal={weeklyGoal}
              handleSaveWeeklyGoal={handleSaveWeeklyGoal}
              userStats={userStats}
            />
          } />
          <Route path="/analytics" element={<Analytics studySessions={studySessions} plans={plans} progress={progress} profile={profile} masteryData={masteryData} examSettings={examSettings} handleSaveExamSettings={handleSaveExamSettings} practiceHistory={practiceHistory} sm2Cards={sm2Cards} userStats={userStats} />} />
          <Route path="/rooms" element={<StudyRooms />} />
          <Route path="/buddy" element={<StudyBuddy fileId={fileId} onMessageSent={handleChatMessage} />} />
          <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} profile={profile} updateProfile={updateProfile} userStats={userStats} masteryData={masteryData} studySessions={studySessions} />} />
        </Routes>
      </Layout>

      {/* Achievement Toast */}
      <AnimatePresence>
        {achievementToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-gradient-to-br from-[#5A5A40] to-[#3A3A28] text-white rounded-3xl px-5 py-4 shadow-2xl flex items-center gap-3 max-w-sm w-[calc(100%-2rem)] cursor-pointer"
            onClick={() => setAchievementToast(null)}
          >
            <span className="text-3xl shrink-0">{achievementToast.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Achievement Unlocked</p>
              <p className="font-bold text-base leading-tight">{achievementToast.title}</p>
              <p className="text-xs text-white/70 mt-0.5">{achievementToast.description}</p>
            </div>
            <span className={cn(
              'text-[9px] font-bold uppercase px-2 py-1 rounded-md tracking-wider shrink-0',
              achievementToast.rarity === 'legendary' ? 'bg-yellow-400 text-yellow-900' :
              achievementToast.rarity === 'epic'      ? 'bg-purple-400 text-purple-900' :
              achievementToast.rarity === 'rare'      ? 'bg-blue-400 text-blue-900' :
                                                        'bg-white/20 text-white'
            )}>{achievementToast.rarity}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </BrowserRouter>
  );
}







