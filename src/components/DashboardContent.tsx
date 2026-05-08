import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  LogOut,
  Trash2,
  Upload,
  Loader2,
  Calendar,
  Flame,
  Sparkles,
  X,
  Timer,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Celebration Modal ────────────────────────────────────────────────────────
const CelebrationModal = ({ onClose, focusMinutes }: { onClose: () => void; focusMinutes: number }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <motion.div
          animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-6xl mb-4"
        >
          🎉
        </motion.div>
        <h2 className="text-3xl font-serif font-bold text-[#1A1A1A] mb-2">Focus Complete!</h2>
        <p className="text-[#5A5A40]/70 mb-6 text-sm">
          You just crushed <span className="font-bold text-[#5A5A40]">{focusMinutes} minutes</span> of deep work. Keep the momentum going!
        </p>
        <div className="flex gap-3 justify-center mb-8">
          <div className="bg-orange-50 px-4 py-2 rounded-2xl flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span className="text-sm font-bold text-orange-700">Streak updated</span>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-2xl flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-blue-700">{focusMinutes} min logged</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-semibold hover:bg-[#4A4A30] transition-all active:scale-[0.98]"
        >
          Keep Going 💪
        </button>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

// ─── Flashcard Modal (SM-2 Spaced Repetition) ────────────────────────────────
const FlashcardModal = ({
  cards,
  index,
  showAnswer,
  setIndex,
  setShowAnswer,
  onClose,
  onGrade,
  sm2Cards,
  topicId,
}: {
  cards: any[];
  index: number;
  showAnswer: boolean;
  setIndex: (i: number) => void;
  setShowAnswer: (v: boolean) => void;
  onClose: () => void;
  onGrade?: (cardIndex: number, grade: number) => void;
  sm2Cards?: Record<string, any>;
  topicId?: string | null;
}) => {
  const card = cards[index];
  const isLoading = cards.length === 0;
  const cardId = topicId ? `${topicId}::${index}` : null;
  const sm2 = cardId && sm2Cards ? sm2Cards[cardId] : null;

  // SM-2 grade buttons — shown after answer is revealed
  const grades = [
    { label: 'Forgot', grade: 1, color: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { label: 'Hard',   grade: 3, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    { label: 'Good',   grade: 4, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { label: 'Easy',   grade: 5, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-[#5A5A40]" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#5A5A40]" />
            <span className="font-bold text-sm text-[#5A5A40]">Flashcards</span>
            {!isLoading && (
              <span className="ml-auto text-xs text-[#5A5A40]/50 font-medium">{index + 1} / {cards.length}</span>
            )}
          </div>

          {/* SM-2 due date badge */}
          {sm2 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40">
                Next review:
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#5A5A40]/10 text-[#5A5A40] rounded-full">
                {sm2.dueDate || 'Today'} · interval {sm2.interval}d · EF {sm2.easeFactor}
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
              <p className="text-sm text-[#5A5A40]/60">Generating flashcards…</p>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="h-1 bg-gray-100 rounded-full mb-6 overflow-hidden">
                <motion.div
                  animate={{ width: `${((index + 1) / cards.length) * 100}%` }}
                  className="h-full bg-[#5A5A40] rounded-full"
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Card */}
              <motion.div
                key={`${index}-${showAnswer}`}
                initial={{ rotateY: showAnswer ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
                onClick={() => setShowAnswer(!showAnswer)}
                className={cn(
                  "min-h-[160px] rounded-[24px] p-6 flex flex-col items-center justify-center text-center cursor-pointer select-none transition-colors",
                  showAnswer
                    ? "bg-[#5A5A40] text-white"
                    : "bg-[#F5F5F0] text-[#1A1A1A] border-2 border-dashed border-[#5A5A40]/20"
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 mb-3">
                  {showAnswer ? 'Answer' : 'Question · tap to flip'}
                </p>
                <p className="font-semibold text-base leading-relaxed">
                  {showAnswer ? card.answer : card.question}
                </p>
              </motion.div>

              {/* SM-2 grade buttons (shown after answer revealed) */}
              {showAnswer && onGrade ? (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-center text-[#5A5A40]/50 mb-3">
                    How well did you remember?
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {grades.map(({ label, grade, color }) => (
                      <button
                        key={label}
                        onClick={() => { onGrade(index, grade); }}
                        className={cn("py-2 rounded-xl text-xs font-bold transition-colors", color)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Navigation (shown before answer) */
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => { setIndex(Math.max(0, index - 1)); setShowAnswer(false); }}
                    disabled={index === 0}
                    className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="px-6 py-2 bg-[#5A5A40]/10 text-[#5A5A40] rounded-full text-sm font-semibold hover:bg-[#5A5A40]/20 transition-colors"
                  >
                    Reveal Answer
                  </button>
                  <button
                    onClick={() => { setIndex(Math.min(cards.length - 1, index + 1)); setShowAnswer(false); }}
                    disabled={index === cards.length - 1}
                    className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Schedule Modal ───────────────────────────────────────────────────────────
const ScheduleModal = ({
  topicTitle,
  onConfirm,
  onClose,
}: {
  topicTitle: string;
  onConfirm: (s: { topicTitle: string; date: string; time: string }) => void;
  onClose: () => void;
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const nowHour = new Date().getHours();
  const defaultTime = `${String((nowHour + 1) % 24).padStart(2, '0')}:00`;

  const [title, setTitle] = useState(topicTitle);
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(defaultTime);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="bg-white rounded-t-[40px] p-8 w-full max-w-lg shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
          <h2 className="text-2xl font-serif font-bold text-[#1A1A1A] mb-1">Schedule Session</h2>
          <p className="text-sm text-[#5A5A40]/60 mb-6">Add this to your study calendar</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/50 block mb-1.5">Topic</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[#F5F5F0] border border-[#1A1A1A]/10 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/50 block mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  min={todayStr}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#1A1A1A]/10 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/50 block mb-1.5">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-[#1A1A1A]/10 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={onClose} className="flex-1 py-4 rounded-2xl border border-[#1A1A1A]/10 text-[#5A5A40] font-semibold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onConfirm({ topicTitle: title, date, time })}
              disabled={!title || !date || !time}
              className="flex-1 py-4 rounded-2xl bg-[#5A5A40] text-white font-semibold hover:bg-[#4A4A30] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Save Session
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const DashboardContent = ({
  user,
  plans,
  progress,
  loading,
  handleFileUpload,
  toggleTopic,
  deletePlan,
  isDeepFocus,
  timerSeconds,
  formatTime,
  isTimerRunning,
  setIsTimerRunning,
  setTimerSeconds,
  setIsDeepFocus,
  profile,
  handleLogout,
  suggestSchedule,
  scheduledTopics,
  theme,
  handleDeleteSchedule,
  getGoogleCalendarUrl,
  fileInputRef,
  processing,
  error,
  setShowSettings,
  setShowScheduleModal,
  setScheduleDate,
  setScheduleTime,
  showFlashcards,
  currentFlashcards,
  flashcardIndex,
  showAnswer,
  setShowFlashcards,
  setFlashcardIndex,
  setShowAnswer,
  showScheduleModal,
  isGuest,
  completeSession,
  fileId,
  handleAddSchedule,
  handleGenerateFlashcards,
  showCelebration,
  setShowCelebration,
  studySessions,
  handleSM2Grade,
  sm2Cards,
  masteryData,
  currentTopicId,
}: any) => {
  const isDark = isDeepFocus || theme === 'dark';

  // ── Derived data ────────────────────────────────────────────────────────────
  const allTopics = (plans || []).flatMap((plan: any) => {
    const planProgress = progress?.[plan.id]?.completedTopicIds || [];
    return (plan.units || []).flatMap((unit: any) =>
      (unit.chapters || []).flatMap((chapter: any) =>
        (chapter.topics || []).map((topic: any) => ({
          ...topic,
          planId: plan.id,
          bookTitle: plan.bookTitle,
          unitTitle: unit.title,
          chapterTitle: chapter.title,
          isCompleted: planProgress.includes(topic.id),
        }))
      )
    );
  });

  const topicsForDayCount = profile?.topicsForDay || 2;
  const uncompletedTopics = allTopics.filter((t: any) => !t.isCompleted);
  const topicsForToday = uncompletedTopics.slice(0, topicsForDayCount);
  const completedTopicsLog = allTopics.filter((t: any) => t.isCompleted);

  // ── Quick stats ─────────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = (studySessions || []).filter((s: any) => s.date === todayStr);
  const todayMinutes = todaySessions.reduce((sum: number, s: any) => sum + (s.durationMinutes || 0), 0);

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-1000",
      isDark ? "bg-[#0A0A0A] text-white" : "bg-[#F5F5F0] text-[#1A1A1A]"
    )}>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showCelebration && (
        <CelebrationModal
          focusMinutes={profile?.focusTime || 25}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {showFlashcards && (
        <FlashcardModal
          cards={currentFlashcards}
          index={flashcardIndex}
          showAnswer={showAnswer}
          setIndex={setFlashcardIndex}
          setShowAnswer={setShowAnswer}
          onClose={() => setShowFlashcards(false)}
          onGrade={handleSM2Grade}
          sm2Cards={sm2Cards}
          topicId={currentTopicId}
        />
      )}

      {showScheduleModal && (
        <ScheduleModal
          topicTitle={showScheduleModal?.topic?.title || 'Study Session'}
          onConfirm={handleAddSchedule}
          onClose={() => setShowScheduleModal(null)}
        />
      )}

      {/* ── Guest banner ────────────────────────────────────────────────────── */}
      {isGuest && (
        <div className="bg-orange-500 text-white px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          <ShieldAlert className="w-3 h-3" />
          Guest Mode: Data is saved locally but will be lost if you clear browser data.
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className={cn(
        "sticky top-0 z-30 backdrop-blur-md border-b transition-all duration-1000 px-6 py-4 flex items-center justify-between",
        isDark ? "bg-[#0A0A0A]/80 border-white/5" : "bg-[#F5F5F0]/80 border-[#1A1A1A]/5"
      )}>
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#5A5A40]" />
          <span className="font-serif font-bold text-xl tracking-tight">StudyIndex</span>
        </div>
        <div className="flex items-center gap-4">
          {profile?.streakCount > 0 && (
            <div className="flex items-center gap-1 bg-orange-100 px-3 py-1 rounded-full">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="text-sm font-bold text-orange-700">{profile.streakCount}</span>
            </div>
          )}
          {profile?.displayName && (
            <span className="hidden md:block text-xs font-bold uppercase tracking-widest text-[#5A5A40] opacity-60">
              {profile.displayName}
            </span>
          )}
          <button onClick={handleLogout} className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors">
            <LogOut className="w-5 h-5 text-[#5A5A40]" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8">

        {/* ── Quick stats row ──────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {[
              {
                label: 'Focus Today',
                value: todayMinutes > 0 ? `${todayMinutes}m` : '—',
                icon: <Timer className="w-4 h-4" />,
                color: 'bg-blue-50 text-blue-700',
              },
              {
                label: 'Done Today',
                value: completedTopicsLog.length.toString(),
                icon: <CheckCircle2 className="w-4 h-4" />,
                color: 'bg-green-50 text-green-700',
              },
              {
                label: 'Streak',
                value: profile?.streakCount > 0 ? `${profile.streakCount}d 🔥` : '—',
                icon: <Flame className="w-4 h-4" />,
                color: 'bg-orange-50 text-orange-700',
              },
              {
                label: 'Sessions',
                value: todaySessions.length.toString(),
                icon: <Zap className="w-4 h-4" />,
                color: 'bg-purple-50 text-purple-700',
              },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl shrink-0 font-semibold text-sm",
                  isDark ? "bg-white/10 text-white" : stat.color
                )}
              >
                {stat.icon}
                <div>
                  <div className="text-xs font-medium opacity-60 leading-none mb-0.5">{stat.label}</div>
                  <div className="font-bold leading-none">{stat.value}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Study Timer ──────────────────────────────────────────────────── */}
        <section className="mb-10">
          <motion.div
            animate={{
              boxShadow: isDeepFocus && isTimerRunning
                ? "0 0 40px rgba(90, 90, 64, 0.2)"
                : "0 20px 25px -5px rgb(0 0 0 / 0.1)"
            }}
            className={cn(
              "p-8 rounded-[40px] relative overflow-hidden transition-all duration-300",
              isDeepFocus ? "bg-black border border-white/10" : "bg-white text-[#1A1A1A] shadow-2xl"
            )}
          >
            {/* Liquid fill background */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: `${(timerSeconds / ((profile?.focusTime || 25) * 60)) * 100}%` }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0 bg-blue-600/60 pointer-events-none"
              style={{ borderRadius: 'inherit', transformOrigin: 'bottom' }}
            >
              <motion.div
                animate={{ x: ["-100%", "0%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute w-[200%] h-12 blur-lg"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.4), transparent)', top: '-20px' }}
              />
            </motion.div>

            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Timer className={cn("w-24 h-24", isDark ? "text-white" : "text-[#1A1A1A]")} />
            </div>

            {isDark && isTimerRunning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.05, 0.15, 0.05] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-[#5A5A40]"
              />
            )}

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className={cn("text-[10px] font-bold uppercase tracking-[0.3em]", isDark ? "text-white/40" : "text-[#1A1A1A]/40")}>
                  {isDeepFocus ? "Deep Focus Active" : "Focus Timer"}
                </div>
                <button
                  onClick={() => setIsDeepFocus(!isDeepFocus)}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all",
                    isDark
                      ? "bg-[#5A5A40] border-[#5A5A40] text-white"
                      : "border-[#1A1A1A]/20 text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:border-[#1A1A1A]"
                  )}
                >
                  {isDeepFocus ? "Exit Deep Focus" : "Enter Deep Focus"}
                </button>
              </div>

              <div className="flex items-end gap-4 mt-1">
                <div className="flex flex-col">
                  <div className={cn(
                    "text-6xl font-serif font-bold tracking-tighter transition-colors duration-300",
                    isDark ? "text-[#E6E6E6]" : "text-[#1A1A1A]"
                  )}>
                    {formatTime(timerSeconds)}
                  </div>
                  <div className={cn("text-xs font-serif italic mt-1 transition-colors duration-300", isDark ? "text-white/40" : "text-[#1A1A1A]/60")}>
                    Hello, {profile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Scholar'}
                  </div>
                </div>

                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setTimerSeconds((prev: number) => Math.max(0, prev - 5 * 60))}
                    className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors text-xs font-bold", isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-[#1A1A1A]/20")}
                  >
                    -5m
                  </button>
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={cn("w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform active:scale-95", isDark ? "bg-white text-[#1A1A1A]" : "bg-[#1A1A1A] text-white")}
                  >
                    {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <button
                    onClick={() => setTimerSeconds((prev: number) => prev + 5 * 60)}
                    className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors text-xs font-bold", isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-[#1A1A1A]/20")}
                  >
                    +5m
                  </button>
                  <button
                    onClick={() => { setIsTimerRunning(false); setTimerSeconds((profile?.focusTime || 25) * 60); }}
                    className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors", isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-[#1A1A1A]/20")}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Topics for the Day ───────────────────────────────────────────── */}
        <section className="mb-10">
          <h3 className={cn("text-xl font-serif font-bold mb-6", isDark ? "text-white" : "text-[#1A1A1A]")}>
            Topics for the Day
          </h3>
          <div className="space-y-4">
            {topicsForToday.length > 0 ? (
              topicsForToday.map((topic: any) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-6 rounded-[32px] shadow-sm border transition-colors",
                    isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("font-bold truncate", isDark ? "text-white" : "text-[#1A1A1A]")}>{topic.title}</h4>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-[#5A5A40]")}>
                        {topic.bookTitle} · {topic.chapterTitle}
                      </p>
                      {topic.estimatedTime && (
                        <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-blue-100 text-blue-700">
                          <Clock className="w-3 h-3" /> {topic.estimatedTime}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {/* Flashcard button */}
                      <button
                        onClick={() => handleGenerateFlashcards(topic)}
                        className={cn(
                          "p-2.5 rounded-full transition-colors",
                          isDark ? "bg-white/10 hover:bg-white/20 text-yellow-300" : "bg-yellow-50 hover:bg-yellow-100 text-yellow-600"
                        )}
                        title="Generate Flashcards"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      {/* Schedule button */}
                      <button
                        onClick={() => setShowScheduleModal({ topic })}
                        className={cn(
                          "p-2.5 rounded-full transition-colors",
                          isDark ? "bg-white/10 hover:bg-white/20 text-blue-300" : "bg-blue-50 hover:bg-blue-100 text-blue-600"
                        )}
                        title="Schedule this topic"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      {/* Complete button */}
                      <button
                        onClick={() => toggleTopic(topic.planId, topic.id)}
                        className={cn(
                          "p-2.5 rounded-full transition-colors",
                          isDark ? "bg-white/10 hover:bg-white/20 text-green-400" : "bg-green-50 hover:bg-green-100 text-green-600"
                        )}
                        title="Mark complete"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className={cn("text-center py-12 rounded-[32px] border", isDark ? "bg-[#1A1A1A] border-white/10" : "bg-[#F5F5F0] border-[#1A1A1A]/5")}>
                <BookOpen className={cn("w-8 h-8 mx-auto mb-2", isDark ? "text-white/20" : "text-[#5A5A40]/20")} />
                <p className={cn("italic text-sm", isDark ? "text-white/60" : "text-[#5A5A40]/60")}>
                  No topics for today. Upload a document to generate a study plan!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Completed Log ────────────────────────────────────────────────── */}
        {completedTopicsLog.length > 0 && (
          <section className="mb-10">
            <h3 className={cn("text-xl font-serif font-bold mb-6", isDark ? "text-white" : "text-[#1A1A1A]")}>
              Completed Topics
              <span className={cn("ml-2 text-sm font-normal", isDark ? "text-white/40" : "text-[#5A5A40]/50")}>
                {completedTopicsLog.length} done
              </span>
            </h3>
            <div className="space-y-3">
              {completedTopicsLog.map((topic: any) => (
                <div
                  key={topic.id}
                  className={cn(
                    "p-5 rounded-[28px] border flex items-center justify-between",
                    isDark ? "bg-[#1A1A1A] border-white/5" : "bg-green-50/60 border-green-100"
                  )}
                >
                  <div>
                    <h4 className={cn("font-semibold text-sm line-through opacity-70", isDark ? "text-white" : "text-[#1A1A1A]")}>{topic.title}</h4>
                    <p className={cn("text-xs opacity-60 mt-0.5", isDark ? "text-gray-400" : "text-[#5A5A40]")}>
                      {topic.bookTitle} · {topic.chapterTitle}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleTopic(topic.planId, topic.id)}
                    className={cn("p-2 rounded-full transition-colors shrink-0", isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-green-100 text-green-600")}
                    title="Undo"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Scheduled Calendar ───────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-xl font-serif font-bold", isDark ? "text-white" : "text-[#1A1A1A]")}>Scheduled</h3>
            <div className="flex gap-3">
              <button
                onClick={suggestSchedule}
                className={cn("text-xs font-bold uppercase tracking-widest transition-colors", isDark ? "text-white/50 hover:text-white" : "text-[#5A5A40]/60 hover:text-[#5A5A40]")}
              >
                AI Suggest
              </button>
              <button
                onClick={() => setShowScheduleModal({ topic: { title: 'Study Session' } })}
                className={cn("text-xs font-bold uppercase tracking-widest transition-colors", isDark ? "text-white/50 hover:text-white" : "text-[#5A5A40]/60 hover:text-[#5A5A40]")}
              >
                + Add
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {scheduledTopics.length === 0 ? (
              <div className={cn("text-center py-12 rounded-[32px] border", isDark ? "bg-[#1A1A1A] border-white/10" : "bg-[#F5F5F0] border-[#1A1A1A]/5")}>
                <Calendar className={cn("w-8 h-8 mx-auto mb-2", isDark ? "text-white/20" : "text-[#5A5A40]/20")} />
                <p className={cn("italic text-sm", isDark ? "text-white/60" : "text-[#5A5A40]/60")}>No sessions scheduled. Tap "+ Add" to plan ahead.</p>
              </div>
            ) : (
              scheduledTopics.map((topic: any) => {
                const gcalUrl = getGoogleCalendarUrl(topic);
                return (
                  <div
                    key={topic.id}
                    className={cn("p-6 rounded-[32px] shadow-sm border flex items-center justify-between", isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/5")}
                  >
                    <div>
                      <h4 className={cn("font-bold", isDark ? "text-white" : "text-[#1A1A1A]")}>{topic.topicTitle || topic.title}</h4>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-[#5A5A40]")}>
                        {topic.date ? new Date(topic.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : ''}{topic.time ? ` · ${topic.time}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {gcalUrl && (
                        <a href={gcalUrl} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-white/10" : "hover:bg-blue-50")} title="Add to Google Calendar">
                          <Calendar className={cn("w-4 h-4", isDark ? "text-gray-400" : "text-blue-500")} />
                        </a>
                      )}
                      <button onClick={() => handleDeleteSchedule(topic.id)} className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-red-900/20" : "hover:bg-red-50")} title="Delete">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── Upload ───────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div
            className={cn(
              "border-2 border-dashed rounded-[32px] p-12 text-center transition-all cursor-pointer",
              isDark ? "border-white/20 hover:border-white/40 bg-white/5" : "border-[#5A5A40]/20 hover:border-[#5A5A40]/40 hover:bg-[#5A5A40]/5",
              processing ? "opacity-50 pointer-events-none" : ""
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.txt,.docx,image/*" />
            {processing ? (
              <Loader2 className={cn("w-10 h-10 mx-auto animate-spin", isDark ? "text-white" : "text-[#5A5A40]")} />
            ) : (
              <Upload className={cn("w-10 h-10 mx-auto mb-4", isDark ? "text-white" : "text-[#5A5A40]")} />
            )}
            <h3 className={cn("font-bold mb-1", isDark ? "text-white" : "text-[#1A1A1A]")}>
              {fileId ? 'File Uploaded ✓' : 'Upload Study Material'}
            </h3>
            <p className={cn("text-sm opacity-60", isDark ? "text-white" : "text-[#5A5A40]")}>
              {fileId ? 'Upload another file to switch context.' : 'PDF, image, or text file'}
            </p>
          </div>
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        </section>

        {/* ── Study Plans ──────────────────────────────────────────────────── */}
        <section className="pb-20">
          <h3 className={cn("text-xl font-serif font-bold mb-6", isDark ? "text-white" : "text-[#1A1A1A]")}>Your Study Plans</h3>
          <div className="space-y-8">
            {plans.length > 0 ? (
              plans.map((plan: any) => {
                const planProgress = progress[plan.id]?.completedTopicIds || [];
                const totalTopics = (plan.units || []).flatMap((u: any) => (u.chapters || []).flatMap((c: any) => c.topics || [])).length;
                const completedCount = planProgress.length;
                const pct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

                return (
                  <div key={plan.id} className={cn("p-6 md:p-8 rounded-[40px] shadow-sm border", isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/5")}>
                    {/* Plan header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className={cn("text-2xl font-serif font-bold", isDark ? "text-white" : "text-[#1A1A1A]")}>{plan.bookTitle}</h4>
                        <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-[#5A5A40]")}>
                          Created {new Date(plan.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => deletePlan(plan.id)} className={cn("p-3 rounded-full transition-colors shrink-0", isDark ? "hover:bg-red-900/20 text-red-400" : "hover:bg-red-50 text-red-500")}>
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3 mb-8">
                      <div className={cn("flex-1 h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-gray-100")}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-[#5A5A40] to-[#8A8A60]"
                        />
                      </div>
                      <span className={cn("text-xs font-bold tabular-nums shrink-0", isDark ? "text-gray-400" : "text-[#5A5A40]")}>
                        {completedCount}/{totalTopics} · {pct}%
                      </span>
                    </div>

                    {/* Units → Chapters → Topics */}
                    <div className="space-y-6">
                      {plan.units?.map((unit: any, uIdx: number) => (
                        <div key={uIdx} className="space-y-4">
                          <h5 className={cn("text-lg font-bold border-b pb-2", isDark ? "text-white border-white/10" : "text-[#1A1A1A] border-[#1A1A1A]/10")}>
                            {unit.title}
                          </h5>
                          <div className="space-y-4 pl-4 md:pl-6">
                            {unit.chapters?.map((chapter: any, cIdx: number) => (
                              <div key={cIdx} className="space-y-3">
                                <h6 className={cn("font-bold text-sm uppercase tracking-wider", isDark ? "text-gray-300" : "text-[#5A5A40]")}>
                                  {chapter.title}
                                </h6>
                                <div className="space-y-3 pl-2 md:pl-4 border-l-2 border-[#5A5A40]/20">
                                  {chapter.topics?.map((topic: any) => {
                                    const isCompleted = planProgress.includes(topic.id);
                                    return (
                                      <div
                                        key={topic.id}
                                        className={cn(
                                          "p-4 rounded-2xl border transition-all",
                                          isDark ? "bg-[#222] border-white/5" : "bg-[#F9F9F6] border-[#1A1A1A]/5",
                                          isCompleted && (isDark ? "opacity-50" : "bg-green-50/50 border-green-100")
                                        )}
                                      >
                                        <div className="flex items-start gap-3">
                                          <button
                                            onClick={() => toggleTopic(plan.id, topic.id)}
                                            className={cn("mt-0.5 shrink-0 transition-colors", isCompleted ? "text-green-500" : (isDark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-[#1A1A1A]"))}
                                          >
                                            <CheckCircle2 className="w-5 h-5" />
                                          </button>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                              <h6 className={cn("font-bold text-base", isCompleted && "line-through", isDark ? "text-white" : "text-[#1A1A1A]")}>
                                                {topic.title}
                                              </h6>
                                              <button
                                                onClick={() => handleGenerateFlashcards(topic)}
                                                className={cn("p-1.5 rounded-full shrink-0 transition-colors", isDark ? "hover:bg-white/10 text-yellow-300" : "hover:bg-yellow-50 text-yellow-500")}
                                                title="Flashcards"
                                              >
                                                <Sparkles className="w-3.5 h-3.5" />
                                              </button>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-2">
                                              {topic.difficulty && (
                                                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md", topic.difficulty.toLowerCase() === 'easy' ? "bg-green-100 text-green-700" : topic.difficulty.toLowerCase() === 'medium' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")}>
                                                  {topic.difficulty}
                                                </span>
                                              )}
                                              {/* Mastery score from SM-2 reviews */}
                                              {masteryData?.[topic.id] && (
                                                <span className={cn(
                                                  "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1",
                                                  masteryData[topic.id].score >= 80 ? "bg-emerald-100 text-emerald-700" :
                                                  masteryData[topic.id].score >= 50 ? "bg-yellow-100 text-yellow-700" :
                                                  "bg-red-100 text-red-700"
                                                )}>
                                                  <Trophy className="w-3 h-3" /> {masteryData[topic.id].score}% mastery
                                                </span>
                                              )}
                                              {topic.estimatedTime && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-blue-100 text-blue-700 flex items-center gap-1">
                                                  <Clock className="w-3 h-3" /> {topic.estimatedTime}
                                                </span>
                                              )}
                                              {topic.revisionSchedule && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-purple-100 text-purple-700 flex items-center gap-1">
                                                  <RotateCcw className="w-3 h-3" /> {topic.revisionSchedule}
                                                </span>
                                              )}
                                            </div>

                                            {!isCompleted && (topic.dailyExercise || topic.motivation) && (
                                              <div className="mt-3 space-y-2">
                                                {topic.dailyExercise && (
                                                  <div className={cn("text-sm p-3 rounded-xl", isDark ? "bg-white/5" : "bg-white border border-[#1A1A1A]/5")}>
                                                    <span className="font-bold block mb-1 text-xs uppercase tracking-wide opacity-60">Exercise</span>
                                                    <span className={isDark ? "text-gray-300" : "text-gray-600"}>{topic.dailyExercise}</span>
                                                  </div>
                                                )}
                                                {topic.motivation && (
                                                  <p className="text-sm italic text-orange-500">"{topic.motivation}"</p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={cn("p-12 rounded-[40px] shadow-sm border text-center", isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/5")}>
                <BookOpen className={cn("w-12 h-12 mx-auto mb-4 opacity-20", isDark ? "text-white" : "text-[#5A5A40]")} />
                <p className={cn("italic", isDark ? "text-gray-400" : "text-[#5A5A40]")}>
                  No study plans yet. Upload a document to generate one!
                </p>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
};
