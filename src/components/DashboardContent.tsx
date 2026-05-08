import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  X,
  Timer, 
  Play, 
  Pause, 
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';

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
  fileId
}: any) => {
  const isDark = isDeepFocus || theme === 'dark';

  // Compute all topics across all plans
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
          isCompleted: planProgress.includes(topic.id)
        }))
      )
    );
  });

  const topicsForDayCount = profile?.topicsForDay || 2;
  const uncompletedTopics = allTopics.filter((t: any) => !t.isCompleted);
  const topicsForToday = uncompletedTopics.slice(0, topicsForDayCount);
  
  const completedTopicsLog = allTopics.filter((t: any) => t.isCompleted);

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-1000",
      isDark ? "bg-[#0A0A0A] text-white" : "bg-[#F5F5F0] text-[#1A1A1A]"
    )}>
      {/* Guest Warning */}
      {isGuest && (
        <div className="bg-orange-500 text-white px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          <ShieldAlert className="w-3 h-3" />
          Guest Mode: Data is saved locally but will be lost if you clear browser data.
        </div>
      )}

      {/* Header */}
      <header className={cn(
        "sticky top-0 z-30 backdrop-blur-md border-b transition-all duration-1000 px-6 py-4 flex items-center justify-between",
        isDark 
          ? "bg-[#0A0A0A]/80 border-white/5" 
          : "bg-[#F5F5F0]/80 border-[#1A1A1A]/5"
      )}>
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#5A5A40]" />
          <span className="font-serif font-bold text-xl tracking-tight">StudyIndex</span>
        </div>
        <div className="flex items-center gap-6">
          {profile?.streakCount && profile.streakCount > 0 && (
            <div className="flex items-center gap-1 bg-orange-100 px-3 py-1 rounded-full">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="text-sm font-bold text-orange-700">{profile.streakCount}</span>
            </div>
          )}
          <div className="flex items-center gap-4">
            {profile?.displayName && (
              <span className="hidden md:block text-xs font-bold uppercase tracking-widest text-[#5A5A40] opacity-60">
                {profile.displayName}
              </span>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors"
            >
              <LogOut className="w-5 h-5 text-[#5A5A40]" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8">
        {/* Study Timer Widget */}
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
            {/* Liquid Animation Background - Blue Water */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: `${(timerSeconds / ((profile?.focusTime || 25) * 60)) * 100}%` }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0 bg-blue-600/60 pointer-events-none"
              style={{ 
                borderRadius: 'inherit',
                transformOrigin: 'bottom'
              }}
            >
              {/* Wave Effect */}
              <motion.div 
                animate={{ 
                  x: ["-100%", "0%"],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 w-[200%] h-12 bg-blue-400/40 blur-lg"
                style={{ 
                  background: 'linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.4), transparent)',
                  top: '-20px'
                }}
              />
              <motion.div 
                animate={{ 
                  x: ["0%", "-100%"],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 w-[200%] h-16 bg-blue-300/20 blur-xl"
                style={{ 
                  background: 'linear-gradient(90deg, transparent, rgba(147, 197, 253, 0.2), transparent)',
                  top: '-30px'
                }}
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
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-end gap-4">
                    <div className={cn(
                      "text-6xl font-serif font-bold tracking-tighter transition-colors duration-300",
                      isDark ? "text-[#E6E6E6]" : "text-[#1A1A1A]"
                    )}>
                      {formatTime(timerSeconds)}
                    </div>
                    <div className="flex gap-2 mb-2">
                      <button 
                        onClick={() => setTimerSeconds(prev => Math.max(0, prev - 5 * 60))}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-colors text-xs font-bold",
                          isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-[#1A1A1A]/20"
                        )}
                      >
                        -5m
                      </button>
                      <button 
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform active:scale-95",
                          isDark ? "bg-white text-[#1A1A1A]" : "bg-[#1A1A1A] text-white"
                        )}
                      >
                        {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>
                      <button 
                        onClick={() => setTimerSeconds(prev => prev + 5 * 60)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-colors text-xs font-bold",
                          isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-[#1A1A1A]/20"
                        )}
                      >
                        +5m
                      </button>
                      <button 
                        onClick={() => { setIsTimerRunning(false); setTimerSeconds((profile?.focusTime || 25) * 60); }}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                          isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-[#1A1A1A]/20"
                        )}
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {/* Greeting below timer */}
                  <div className={cn(
                    "text-xs font-serif italic mt-1 transition-colors duration-300",
                    isDark ? "text-white/40" : "text-[#1A1A1A]/60"
                  )}>
                    Hello, {profile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Scholar'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
        
        {/* Topics for the Day */}
        <section className="mb-10">
          <h3 className={cn("text-xl font-serif font-bold mb-6", isDark ? "text-white" : "text-[#1A1A1A]")}>
            Topics for the Day
          </h3>
          <div className="space-y-4">
            {topicsForToday.length > 0 ? (
              topicsForToday.map((topic: any) => (
                <div key={topic.id} className={cn(
                  "p-6 rounded-[32px] shadow-sm border flex items-center justify-between transition-colors",
                  isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/5"
                )}>
                  <div>
                    <h4 className={cn("font-bold", isDark ? "text-white" : "text-[#1A1A1A]")}>{topic.title}</h4>
                    <p className={cn("text-sm", isDark ? "text-gray-400" : "text-[#5A5A40]")}>
                      {topic.bookTitle} • {topic.chapterTitle}
                    </p>
                  </div>
                  <button 
                    onClick={() => toggleTopic(topic.planId, topic.id)}
                    className={cn(
                      "p-3 rounded-full transition-colors",
                      isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 text-[#5A5A40]"
                    )}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                </div>
              ))
            ) : (
              <div className={cn(
                "text-center py-12 rounded-[32px] border",
                isDark ? "bg-[#1A1A1A] border-white/10" : "bg-[#F5F5F0] border-[#1A1A1A]/5"
              )}>
                <BookOpen className={cn("w-8 h-8 mx-auto mb-2", isDark ? "text-white/20" : "text-[#5A5A40]/20")} />
                <p className={cn("italic", isDark ? "text-white/60" : "text-[#5A5A40]/60")}>
                  No topics for today. Upload a document to generate a study plan!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Topics Completed Log */}
        <section className="mb-10">
          <h3 className={cn("text-xl font-serif font-bold mb-6", isDark ? "text-white" : "text-[#1A1A1A]")}>
            Topics Completed Log
          </h3>
          <div className="space-y-4">
            {completedTopicsLog.length > 0 ? (
              completedTopicsLog.map((topic: any) => (
                <div key={topic.id} className={cn(
                  "p-6 rounded-[32px] shadow-sm border flex items-center justify-between transition-colors",
                  isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/5"
                )}>
                  <div>
                    <h4 className={cn("font-bold line-through opacity-70", isDark ? "text-white" : "text-[#1A1A1A]")}>{topic.title}</h4>
                    <p className={cn("text-sm opacity-70", isDark ? "text-gray-400" : "text-[#5A5A40]")}>
                      {topic.bookTitle} • {topic.chapterTitle}
                    </p>
                  </div>
                  <button 
                    onClick={() => toggleTopic(topic.planId, topic.id)}
                    className={cn(
                      "p-3 rounded-full transition-colors",
                      isDark ? "bg-green-900/40 hover:bg-green-900/60 text-green-400" : "bg-green-100 hover:bg-green-200 text-green-600"
                    )}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              ))
            ) : (
              <div className={cn(
                "text-center py-12 rounded-[32px] border",
                isDark ? "bg-[#1A1A1A] border-white/10" : "bg-[#F5F5F0] border-[#1A1A1A]/5"
              )}>
                <CheckCircle2 className={cn("w-8 h-8 mx-auto mb-2", isDark ? "text-white/20" : "text-[#5A5A40]/20")} />
                <p className={cn("italic", isDark ? "text-white/60" : "text-[#5A5A40]/60")}>
                  No topics completed yet. Start studying!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Scheduled Calendar Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-serif font-bold text-[#1A1A1A]">Scheduled</h3>
            <button 
              onClick={() => setShowScheduleModal({ topic: { title: 'New Session' } })}
              className="text-xs font-bold uppercase tracking-widest text-[#5A5A40] hover:text-[#1A1A1A] transition-colors"
            >
              + Add Session
            </button>
          </div>
          <div className="space-y-4">
            {scheduledTopics.length === 0 ? (
              <div className={cn(
                "text-center py-12 rounded-[32px] border",
                isDark ? "bg-[#1A1A1A] border-white/10" : "bg-[#F5F5F0] border-[#1A1A1A]/5"
              )}>
                <Calendar className={cn("w-8 h-8 mx-auto mb-2", isDark ? "text-white/20" : "text-[#5A5A40]/20")} />
                <p className={cn("italic", isDark ? "text-white/60" : "text-[#5A5A40]/60")}>No sessions scheduled.</p>
              </div>
            ) : (
              scheduledTopics.map((topic: any) => (
                <div key={topic.id} className={cn(
                  "p-6 rounded-[32px] shadow-sm border flex items-center justify-between transition-colors",
                  isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/5"
                )}>
                  <div>
                    <h4 className={cn("font-bold", isDark ? "text-white" : "text-[#1A1A1A]")}>{topic.title}</h4>
                    <p className={cn("text-sm", isDark ? "text-gray-400" : "text-[#5A5A40]")}>{new Date(topic.date).toLocaleDateString()} at {topic.time}</p>
                  </div>
                  <div className="flex gap-2">
                    <a 
                      href={getGoogleCalendarUrl(topic)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-white/10" : "hover:bg-[#5A5A40]/10")}
                    >
                      <Calendar className={cn("w-5 h-5", isDark ? "text-gray-400" : "text-[#5A5A40]")} />
                    </a>
                    <button 
                      onClick={() => handleDeleteSchedule(topic.id)}
                      className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-red-900/20" : "hover:bg-red-50")}
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Action: Upload */}
        <section className="mb-10">
          <div 
            className={cn(
              "border-2 border-dashed rounded-[32px] p-12 text-center transition-all cursor-pointer",
              isDark ? "border-white/20 hover:border-white/40 bg-white/5" : "border-[#5A5A40]/20 hover:border-[#5A5A40]/40 hover:bg-[#5A5A40]/5",
              processing ? "opacity-50" : ""
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              onChange={handleFileUpload}
              accept=".pdf,.txt,.docx,image/*"
            />
            {processing ? (
              <Loader2 className={cn("w-10 h-10 mx-auto animate-spin", isDark ? "text-white" : "text-[#5A5A40]")} />
            ) : (
              <Upload className={cn("w-10 h-10 mx-auto mb-4", isDark ? "text-white" : "text-[#5A5A40]")} />
            )}
            <h3 className={cn("font-bold mb-1", isDark ? "text-white" : "text-[#1A1A1A]")}>
              {fileId ? 'File Uploaded Successfully' : 'Upload Study Material'}
            </h3>
            <p className={cn("text-sm opacity-60", isDark ? "text-white" : "text-[#5A5A40]")}>
              {fileId ? 'You can now ask questions about this file.' : 'PDF, TXT, or DOCX'}
            </p>
          </div>
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        </section>

        {/* Study Plans */}
        <section className="pb-20">
          <h3 className={cn("text-xl font-serif font-bold mb-6", isDark ? "text-white" : "text-[#1A1A1A]")}>Your Study Plans</h3>
          <div className="space-y-8">
            {plans.length > 0 ? (
              plans.map((plan: any) => {
                const planProgress = progress[plan.id]?.completedTopicIds || [];
                
                return (
                  <div key={plan.id} className={cn(
                    "p-6 md:p-8 rounded-[40px] shadow-sm border",
                    isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/5"
                  )}>
                    {(() => {
                      const totalTopics = (plan.units || []).flatMap((u: any) => (u.chapters || []).flatMap((c: any) => c.topics || [])).length;
                      const completedCount = planProgress.length;
                      const pct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
                      return (
                        <div className="mb-8">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className={cn("text-2xl font-serif font-bold", isDark ? "text-white" : "text-[#1A1A1A]")}>{plan.bookTitle}</h4>
                              <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-[#5A5A40]")}>
                                Created {new Date(plan.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => deletePlan(plan.id)}
                              className={cn("p-3 rounded-full transition-colors shrink-0", isDark ? "hover:bg-red-900/20 text-red-400" : "hover:bg-red-50 text-red-500")}
                              title="Delete Plan"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          {/* Progress bar */}
                          <div className="flex items-center gap-3">
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
                        </div>
                      );
                    })()}

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
                                          "p-4 rounded-2xl border transition-all flex flex-col md:flex-row gap-4",
                                          isDark ? "bg-[#222] border-white/5" : "bg-[#F9F9F6] border-[#1A1A1A]/5",
                                          isCompleted && (isDark ? "opacity-60" : "bg-green-50/50 border-green-100")
                                        )}
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                              <button 
                                                onClick={() => toggleTopic(plan.id, topic.id)}
                                                className={cn(
                                                  "mt-0.5 shrink-0 transition-colors",
                                                  isCompleted ? "text-green-500" : (isDark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-[#1A1A1A]")
                                                )}
                                              >
                                                <CheckCircle2 className="w-6 h-6" />
                                              </button>
                                              <div>
                                                <h6 className={cn(
                                                  "font-bold text-base", 
                                                  isCompleted && "line-through",
                                                  isDark ? "text-white" : "text-[#1A1A1A]"
                                                )}>
                                                  {topic.title}
                                                </h6>
                                                
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                  {topic.difficulty && (
                                                    <span className={cn(
                                                      "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md",
                                                      topic.difficulty.toLowerCase() === 'easy' ? "bg-green-100 text-green-700" :
                                                      topic.difficulty.toLowerCase() === 'medium' ? "bg-yellow-100 text-yellow-700" :
                                                      "bg-red-100 text-red-700"
                                                    )}>
                                                      {topic.difficulty}
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
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {(!isCompleted && (topic.dailyExercise || topic.motivation)) && (
                                            <div className="mt-4 pl-9 space-y-2">
                                              {topic.dailyExercise && (
                                                <div className={cn("text-sm p-3 rounded-xl", isDark ? "bg-white/5" : "bg-white")}>
                                                  <span className="font-bold block mb-1">Exercise:</span>
                                                  <span className={isDark ? "text-gray-300" : "text-gray-600"}>{topic.dailyExercise}</span>
                                                </div>
                                              )}
                                              {topic.motivation && (
                                                <div className="text-sm italic text-orange-600">
                                                  "{topic.motivation}"
                                                </div>
                                              )}
                                            </div>
                                          )}
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
              <div className={cn(
                "p-12 rounded-[40px] shadow-sm border text-center",
                isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/5"
              )}>
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
