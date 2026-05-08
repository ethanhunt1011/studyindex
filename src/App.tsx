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
  clearLocalData
} from './lib/storage';
import { extractTopicsFromImage, generateFlashcards, Topic, Unit, Chapter, Flashcard } from './services/gemini';
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
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
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
      const localPlans = await getLocalPlans();
      const localProgress = await getLocalProgress();
      if (localPlans) setPlans(localPlans);
      if (localProgress) setProgress(localProgress);
      setLoading(false);
    };
    loadData();
  }, []);

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
        
        if (!response.ok) throw new Error('Failed to upload file.');
        
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

        if (!planResponse.ok) throw new Error('Failed to extract study plan.');

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

        setProcessing(false);
      } catch (err) {
        console.error('Upload error:', err);
        setError('Failed to upload file and extract plan.');
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
  const suggestSchedule = () => {
    // Placeholder for suggest schedule logic
    console.log('Suggest schedule triggered');
  };
  const handleDeleteSchedule = (id: string) => {
    // Placeholder for delete schedule logic
    console.log('Delete schedule triggered', id);
  };
  const getGoogleCalendarUrl = (topic: any) => '';

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
            />
          } />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/rooms" element={<StudyRooms />} />
          <Route path="/buddy" element={<StudyBuddy fileId={fileId} />} />
          <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} profile={profile} updateProfile={updateProfile} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}







