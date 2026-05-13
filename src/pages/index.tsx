import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { saveLocalChats, getLocalChats } from '../lib/storage';
import { ACHIEVEMENTS, levelFromXP, xpProgressInLevel, type UserStats } from '../lib/gamification';
import { Plus, MessageSquare, Trash2, BarChart3, Clock, CheckCircle2, Flame, Target, Users, Share2, Copy, Check, BookOpen, Sparkles, Loader2, BrainCircuit, GraduationCap, TrendingUp, Brain, AlertCircle, ChevronDown, ChevronUp, Mic, Volume2, VolumeX, Award, Download, X } from 'lucide-react';
export { Dashboard } from './Dashboard';
export { Login } from './Login';

// ─── Analytics ────────────────────────────────────────────────────────────────
interface AnalyticsProps {
  studySessions?: any[];
  plans?: any[];
  progress?: Record<string, any>;
  profile?: any;
  masteryData?: Record<string, any>;
  examSettings?: any;
  handleSaveExamSettings?: (s: any) => void;
  practiceHistory?: any[];
  sm2Cards?: Record<string, any>;
  userStats?: any;
}

export const Analytics = ({ studySessions = [], plans = [], progress = {}, profile, masteryData = {}, examSettings, handleSaveExamSettings, practiceHistory = [], sm2Cards = {} }: AnalyticsProps) => {
  const [editingExam, setEditingExam] = useState(false);
  const [examNameInput, setExamNameInput] = useState(examSettings?.examName || '');
  const [examDateInput, setExamDateInput] = useState(examSettings?.examDate || '');
  const [showAllWeakTopics, setShowAllWeakTopics] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  // ── Compute stats ────────────────────────────────────────────────────────
  const totalMinutes = studySessions.reduce((s: number, x: any) => s + (x.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const allTopics = (plans || []).flatMap((plan: any) =>
    (plan.units || []).flatMap((u: any) =>
      (u.chapters || []).flatMap((c: any) => c.topics || [])
    )
  );
  const totalTopics = allTopics.length;
  const completedTopics = Object.values(progress).reduce(
    (sum: number, p: any) => sum + (p.completedTopicIds?.length || 0), 0
  );

  // ── Last 7 days bar chart ────────────────────────────────────────────────
  const days: { label: string; date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayMinutes = studySessions
      .filter((s: any) => s.date === dateStr)
      .reduce((sum: number, s: any) => sum + (s.durationMinutes || 0), 0);
    days.push({
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      date: dateStr,
      minutes: dayMinutes,
    });
  }
  const maxMins = Math.max(...days.map(d => d.minutes), 1);

  // ── Motivational quote ───────────────────────────────────────────────────
  const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const quotes = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Consistency is the key to mastery. Keep going!", author: "StudyIndex" },
    { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Learning is not attained by chance, it must be sought for with ardor.", author: "Abigail Adams" },
  ];
  const quote = quotes[completedTopics % quotes.length];

  const hasData = studySessions.length > 0 || plans.length > 0;

  // ── Exam Readiness computation ───────────────────────────────────────────
  const allTopicsFlat = (plans || []).flatMap((p: any) =>
    (p.units || []).flatMap((u: any) =>
      (u.chapters || []).flatMap((c: any) => c.topics || [])
    )
  );
  const completedIds = Object.values(progress).flatMap((p: any) => p.completedTopicIds || []);
  const completionPct = allTopicsFlat.length > 0 ? (completedIds.length / allTopicsFlat.length) * 100 : 0;
  const avgMastery = allTopicsFlat.length > 0
    ? allTopicsFlat.reduce((sum: number, t: any) => sum + (masteryData[t.id]?.score || 0), 0) / allTopicsFlat.length
    : 0;
  const readinessPct = Math.round(completionPct * 0.6 + avgMastery * 0.4);

  const daysUntilExam = examSettings?.examDate
    ? Math.ceil((new Date(examSettings.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const weakTopics = [...allTopicsFlat]
    .filter((t: any) => masteryData[t.id])
    .sort((a: any, b: any) => (masteryData[a.id]?.score ?? 100) - (masteryData[b.id]?.score ?? 100));

  const readinessColor = readinessPct >= 70 ? 'text-green-700' : readinessPct >= 40 ? 'text-yellow-700' : 'text-red-700';
  const readinessBg = readinessPct >= 70 ? 'bg-green-50 border-green-100' : readinessPct >= 40 ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100';
  const readinessFill = readinessPct >= 70 ? 'bg-green-500' : readinessPct >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  // ── Forgetting Curve (Ebbinghaus) — R = e^(-t / S) ──────────────────────
  // S = SM-2 interval (stability), t = days since last review
  const forgettingData = allTopicsFlat.map((t: any) => {
    const cards = Object.values(sm2Cards).filter((c: any) => c.topicId === t.id && c.lastReviewed && c.interval > 0);
    if (!cards.length) return null;
    const retentions = cards.map((c: any) => {
      const daysSince = Math.floor((new Date().getTime() - new Date(c.lastReviewed + 'T00:00').getTime()) / (1000 * 60 * 60 * 24));
      return Math.exp(-Math.max(daysSince, 0) / c.interval);
    });
    const avgR = retentions.reduce((a: number, b: number) => a + b, 0) / retentions.length;
    return { id: t.id, title: t.title, retention: Math.round(avgR * 100) };
  }).filter(Boolean).sort((a: any, b: any) => a.retention - b.retention) as { id: string; title: string; retention: number }[];

  // ── Last 63 days heatmap ─────────────────────────────────────────────────
  const heatmapDays: { date: string; minutes: number }[] = [];
  for (let i = 62; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const minutes = studySessions.filter((s: any) => s.date === dateStr).reduce((sum: number, s: any) => sum + (s.durationMinutes || 0), 0);
    heatmapDays.push({ date: dateStr, minutes });
  }
  const maxHeatmap = Math.max(...heatmapDays.map(d => d.minutes), 1);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#1A1A1A]">Analytics</h1>
        <p className="text-sm text-[#5A5A40]/60 mt-1">Track your study progress over time</p>
      </div>


      {/* ── Exam Readiness Predictor — always visible ──────────────────────── */}
      <div className={cn("rounded-[32px] shadow-md shadow-black/5 p-6", examSettings?.examDate ? readinessBg : "bg-white")}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#5A5A40]" />
            <h2 className="font-bold text-[#1A1A1A]">Exam Readiness</h2>
          </div>
          <button
            onClick={() => { setEditingExam(!editingExam); setExamNameInput(examSettings?.examName || ''); setExamDateInput(examSettings?.examDate || ''); }}
            className="text-xs font-bold text-[#5A5A40]/60 hover:text-[#5A5A40] transition-colors"
          >
            {examSettings?.examDate ? 'Edit' : '+ Set Exam Date'}
          </button>
        </div>

        {editingExam && (
          <div className="space-y-3 mb-5 p-4 bg-[#F5F5F0] rounded-2xl">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 block mb-1">Exam Name</label>
              <input
                type="text"
                value={examNameInput}
                onChange={e => setExamNameInput(e.target.value)}
                placeholder="e.g. Final Exam, IELTS..."
                className="w-full bg-white border border-[#1A1A1A]/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 block mb-1">Exam Date</label>
              <input
                type="date"
                value={examDateInput}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setExamDateInput(e.target.value)}
                className="w-full bg-white border border-[#1A1A1A]/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
              />
            </div>
            <button
              onClick={() => { if (handleSaveExamSettings && examDateInput) { handleSaveExamSettings({ examDate: examDateInput, examName: examNameInput || 'Exam' }); setEditingExam(false); } }}
              disabled={!examDateInput}
              className="w-full py-2 rounded-xl bg-[#5A5A40] text-white text-sm font-bold disabled:opacity-50 hover:bg-[#4A4A30] transition-colors"
            >
              Save
            </button>
          </div>
        )}

        {examSettings?.examDate ? (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-[#1A1A1A]">{examSettings.examName || 'Exam'}</span>
                  <span className={cn("font-bold text-sm", readinessColor)}>{readinessPct}% ready</span>
                </div>
                <div className="h-3 bg-white/60 rounded-full overflow-hidden border border-white/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${readinessPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={cn("h-full rounded-full", readinessFill)}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-[#5A5A40]/60">
                  <span>Completion: {Math.round(completionPct)}%</span>
                  <span>Avg Mastery: {Math.round(avgMastery)}%</span>
                </div>
              </div>
              {daysUntilExam !== null && (
                <div className="text-center shrink-0">
                  <div className={cn("text-3xl font-serif font-bold", daysUntilExam <= 7 ? 'text-red-600' : daysUntilExam <= 14 ? 'text-yellow-600' : 'text-green-600')}>
                    {daysUntilExam > 0 ? daysUntilExam : 0}
                  </div>
                  <div className="text-[10px] text-[#5A5A40]/50 font-semibold">days left</div>
                </div>
              )}
            </div>

            {weakTopics.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 mb-2">Weakest Areas — Focus Here</p>
                <div className="space-y-1.5">
                  {(showAllWeakTopics ? weakTopics : weakTopics.slice(0, 3)).map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2">
                      <span className="text-xs font-medium text-[#1A1A1A] truncate flex-1 mr-2">{t.title}</span>
                      <span className={cn("text-xs font-bold shrink-0", masteryData[t.id]?.score >= 50 ? 'text-yellow-600' : 'text-red-600')}>
                        {masteryData[t.id]?.score ?? 0}%
                      </span>
                    </div>
                  ))}
                  {weakTopics.length > 3 && (
                    <button onClick={() => setShowAllWeakTopics(p => !p)} className="text-[10px] font-bold text-[#5A5A40]/60 hover:text-[#5A5A40] flex items-center gap-1 mt-1">
                      {showAllWeakTopics ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> {weakTopics.length - 3} more</>}
                    </button>
                  )}
                </div>
              </div>
            )}

            {allTopicsFlat.length === 0 && (
              <p className="text-xs text-[#5A5A40]/60 italic">Upload a study plan to see topic-by-topic readiness.</p>
            )}
          </>
        ) : (
          !editingExam && (
            <p className="text-sm text-[#5A5A40]/60 italic">Set your exam date to track readiness and see which topics need the most attention.</p>
          )
        )}
      </div>

      {!hasData && (
        <div className="text-center py-16 bg-white rounded-[32px] border border-gray-100 shadow-sm">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-[#5A5A40]/20" />
          <p className="text-[#5A5A40]/60 font-medium">No data yet.</p>
          <p className="text-sm text-[#5A5A40]/40 mt-1">Complete a focus session or upload a study plan to see your stats here.</p>
        </div>
      )}

      {hasData && (
        <>
          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Focus Hours', value: totalHours, sub: 'total', icon: <Clock className="w-5 h-5" />, color: 'bg-blue-50 text-blue-700' },
              { label: 'Topics Done', value: completedTopics, sub: `of ${totalTopics}`, icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-green-50 text-green-700' },
              { label: 'Streak', value: profile?.streakCount || 0, sub: 'days', icon: <Flame className="w-5 h-5" />, color: 'bg-orange-50 text-orange-700' },
              { label: 'Completion', value: `${pct}%`, sub: 'overall', icon: <Target className="w-5 h-5" />, color: 'bg-purple-50 text-purple-700' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[24px] shadow-md shadow-black/5 p-5 border-0"
              >
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-3 shadow-sm", stat.color)}>
                  {stat.icon}
                </div>
                <div className="text-3xl font-serif font-bold text-[#1A1A1A]">{stat.value}</div>
                <div className="text-xs text-[#5A5A40]/60 font-medium mt-0.5">{stat.label} · {stat.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* ── Weekly bar chart ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-[32px] shadow-md shadow-black/5 p-6">
            <h2 className="font-bold text-[#1A1A1A] mb-5">Focus Minutes — Last 7 Days</h2>
            <div className="flex items-end gap-2 h-32">
              {days.map((day) => {
                const heightPct = (day.minutes / maxMins) * 100;
                const isToday = day.date === new Date().toISOString().split('T')[0];
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-bold text-[#5A5A40]/60 mb-1">
                      {day.minutes > 0 ? `${day.minutes}m` : ''}
                    </div>
                    <div className="w-full flex items-end" style={{ height: '80px' }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(heightPct, day.minutes > 0 ? 6 : 0)}%` }}
                        transition={{ duration: 0.6, delay: 0.05, ease: 'easeOut' }}
                        className={cn(
                          "w-full rounded-t-lg min-h-0",
                          isToday ? "bg-gradient-to-t from-[#5A5A40] to-[#8A8A60]" : day.minutes > 0 ? "bg-[#5A5A40]/40" : "bg-gray-100"
                        )}
                        style={{ minHeight: day.minutes > 0 ? '4px' : '2px' }}
                      />
                    </div>
                    <span className={cn("text-[10px] font-semibold", isToday ? "text-[#5A5A40]" : "text-[#5A5A40]/40")}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Study Activity Heatmap ──────────────────────────────────────── */}
          <div className="bg-white rounded-[32px] shadow-md shadow-black/5 p-6">
            <h2 className="font-bold text-[#1A1A1A] mb-5">Study Activity — Last 63 Days</h2>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {Array.from({ length: 9 }, (_, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1 shrink-0">
                  {heatmapDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day) => {
                    const intensity = day.minutes > 0 ? Math.max(0.15, day.minutes / maxHeatmap) : 0;
                    const isToday = day.date === new Date().toISOString().split('T')[0];
                    return (
                      <div
                        key={day.date}
                        title={`${day.date}: ${day.minutes} min`}
                        className={cn("w-7 h-7 rounded-md transition-all", isToday && day.minutes === 0 ? "ring-2 ring-[#5A5A40]/30" : "")}
                        style={{ backgroundColor: day.minutes > 0 ? `rgba(90, 90, 64, ${intensity})` : '#F0F0EC' }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-[10px] text-[#5A5A40]/40 font-medium">Less</span>
              {[0.15, 0.35, 0.55, 0.75, 1].map(i => (
                <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgba(90, 90, 64, ${i})` }} />
              ))}
              <span className="text-[10px] text-[#5A5A40]/40 font-medium">More</span>
            </div>
          </div>

          {/* ── Plan progress ─────────────────────────────────────────────────── */}
          {plans.length > 0 && (
            <div className="bg-white rounded-[32px] shadow-md shadow-black/5 p-6">
              <h2 className="font-bold text-[#1A1A1A] mb-5">Plan Progress</h2>
              <div className="space-y-4">
                {plans.map((plan: any) => {
                  const planTopics = (plan.units || []).flatMap((u: any) => (u.chapters || []).flatMap((c: any) => c.topics || []));
                  const done = progress[plan.id]?.completedTopicIds?.length || 0;
                  const total = planTopics.length;
                  const p = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={plan.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-[#1A1A1A] truncate flex-1 mr-3">{plan.bookTitle}</span>
                        <span className="text-xs font-bold text-[#5A5A40]/60 shrink-0">{done}/{total} · {p}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${p}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-[#5A5A40] to-[#8A8A60]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Knowledge Map ────────────────────────────────────────────────── */}
          {plans.length > 0 && (
            <div className="bg-white rounded-[32px] shadow-md shadow-black/5 p-6">
              <div className="flex items-center gap-2 mb-5">
                <BookOpen className="w-5 h-5 text-[#5A5A40]" />
                <h2 className="font-bold text-[#1A1A1A]">Knowledge Map</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#5A5A40]/10 text-[#5A5A40] rounded-full ml-1">
                  {allTopicsFlat.length} topics
                </span>
              </div>
              <div className="space-y-3">
                {plans.map((plan: any) => {
                  const planProgress = progress[plan.id]?.completedTopicIds || [];
                  const isExpanded = expandedPlans[plan.id] !== false; // default open
                  return (
                    <div key={plan.id}>
                      <button
                        onClick={() => setExpandedPlans(p => ({ ...p, [plan.id]: !isExpanded }))}
                        className="w-full flex items-center gap-2 p-3 rounded-2xl hover:bg-[#F5F5F0] transition-colors text-left"
                      >
                        <span className="text-base">{isExpanded ? '📖' : '📕'}</span>
                        <span className="font-bold text-sm text-[#1A1A1A] flex-1 truncate">{plan.bookTitle}</span>
                        <ChevronDown className={cn("w-4 h-4 text-[#5A5A40]/40 shrink-0 transition-transform", !isExpanded && "-rotate-90")} />
                      </button>
                      {isExpanded && (
                        <div className="pl-5 mt-1 space-y-2 border-l-2 border-[#5A5A40]/10 ml-4">
                          {plan.units?.map((unit: any) => (
                            <div key={unit.id || unit.title}>
                              <p className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]/60 py-1">{unit.title}</p>
                              {unit.chapters?.map((ch: any) => (
                                <div key={ch.id || ch.title} className="pl-3 border-l border-gray-100 mb-2">
                                  <p className="text-[10px] font-semibold text-[#5A5A40]/40 uppercase tracking-wider mb-1">{ch.title}</p>
                                  <div className="space-y-1">
                                    {ch.topics?.map((t: any) => {
                                      const isCompleted = planProgress.includes(t.id);
                                      const m = masteryData[t.id];
                                      const dotColor = m ? (m.score >= 70 ? 'bg-green-500' : m.score >= 40 ? 'bg-yellow-500' : 'bg-red-500') : isCompleted ? 'bg-[#5A5A40]' : 'bg-gray-200';
                                      return (
                                        <div key={t.id} className="flex items-center gap-2">
                                          <div className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                                          <span className={cn("text-xs flex-1 truncate", isCompleted ? "line-through text-[#5A5A40]/40" : "text-[#1A1A1A]")}>{t.title}</span>
                                          {m && <span className="text-[10px] font-bold text-[#5A5A40]/50 shrink-0">{m.score}%</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                {[
                  { color: 'bg-green-500', label: '≥70% mastery' },
                  { color: 'bg-yellow-500', label: '40–69%' },
                  { color: 'bg-red-500', label: '<40%' },
                  { color: 'bg-[#5A5A40]', label: 'Completed' },
                  { color: 'bg-gray-200', label: 'Not started' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                    <span className="text-[10px] text-[#5A5A40]/50">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Forgetting Curve / Retention ──────────────────────────────────── */}
          {forgettingData.length > 0 && (
            <div className="bg-white rounded-[32px] shadow-md shadow-black/5 p-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-[#5A5A40]" />
                <h2 className="font-bold text-[#1A1A1A]">Forgetting Curve</h2>
              </div>
              <p className="text-[10px] text-[#5A5A40]/50 mb-5">
                Estimated retention per topic using Ebbinghaus formula: R = e<sup>–t/S</sup> (t = days since review, S = SM-2 stability)
              </p>
              <div className="space-y-2">
                {forgettingData.slice(0, 8).map((item) => {
                  const pct = item.retention;
                  const barColor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
                  const textColor = pct >= 70 ? 'text-green-700' : pct >= 40 ? 'text-yellow-700' : 'text-red-700';
                  return (
                    <div key={item.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[#1A1A1A] truncate flex-1 mr-3">{item.title}</span>
                        <span className={cn("text-xs font-bold shrink-0 tabular-nums", textColor)}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={cn("h-full rounded-full", barColor)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#5A5A40]/40 mt-4 italic">
                Sorted by lowest retention first — these topics need review soonest.
              </p>
            </div>
          )}

          {/* ── Practice Exam History ─────────────────────────────────────────── */}
          {practiceHistory.length > 0 && (
            <div className="bg-white rounded-[32px] shadow-md shadow-black/5 p-6">
              <div className="flex items-center gap-2 mb-5">
                <GraduationCap className="w-5 h-5 text-[#5A5A40]" />
                <h2 className="font-bold text-[#1A1A1A]">Practice Exam History</h2>
              </div>
              <div className="space-y-2">
                {practiceHistory.slice(0, 8).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-[#F5F5F0] rounded-2xl">
                    <span className="text-lg">{r.score >= 80 ? '🎉' : r.score >= 60 ? '👍' : '📚'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A1A1A] truncate">{r.topicTitle}</p>
                      <p className="text-[10px] text-[#5A5A40]/50">{r.date} · {r.totalQuestions} questions</p>
                    </div>
                    <span className={cn(
                      "text-sm font-bold shrink-0",
                      r.score >= 80 ? "text-green-600" : r.score >= 60 ? "text-yellow-600" : "text-red-600"
                    )}>{r.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Motivational quote ────────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-[#5A5A40] to-[#3F3F2D] rounded-[32px] p-6 text-white shadow-lg shadow-[#5A5A40]/20">
            <p className="font-serif text-lg italic leading-relaxed">"{quote.text}"</p>
            <p className="text-sm text-white/60 mt-3 font-medium">— {quote.author}</p>
          </div>

        </>
      )}

      {/* ── AI Stack — always visible ─────────────────────────────────────────── */}
      <div className="bg-white rounded-[32px] shadow-md shadow-black/5 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5A5A40]/10 to-[#5A5A40]/5 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-[#5A5A40]" />
          </div>
          <h2 className="font-bold text-[#1A1A1A]">AI Under the Hood</h2>
        </div>
        <div className="space-y-3">
          {[
            {
              icon: '🧠',
              title: 'Gemini 2.5 Flash (LLM)',
              desc: 'Large language model for plan extraction, chat responses, summaries, and flashcard generation via Google GenAI API.',
              tag: 'Generative AI',
              tagColor: 'bg-purple-50 text-purple-700',
            },
            {
              icon: '🔍',
              title: 'RAG Pipeline (text-embedding-004)',
              desc: "Documents are chunked (800 char, 150 overlap) and embedded with Gemini's text-embedding-004 model. Chat queries retrieve the top-5 most semantically relevant chunks via cosine similarity before generation.",
              tag: 'Vector Search · NLP',
              tagColor: 'bg-blue-50 text-blue-700',
            },
            {
              icon: '📅',
              title: 'SM-2 Spaced Repetition',
              desc: 'Flashcard review intervals are scheduled using the SuperMemo SM-2 algorithm (Wozniak, 1987). Each card tracks EaseFactor, interval, and repetitions to model the Ebbinghaus forgetting curve.',
              tag: 'Cognitive Science · Algorithm',
              tagColor: 'bg-green-50 text-green-700',
            },
            {
              icon: '📊',
              title: 'Topic Mastery Scoring',
              desc: 'Per-topic mastery is computed from cumulative SM-2 review outcomes (correct/total), displayed as a 0–100% score with colour-coded badges on topic cards.',
              tag: 'Knowledge Tracing',
              tagColor: 'bg-orange-50 text-orange-700',
            },
            {
              icon: '📝',
              title: 'AI Practice Exam + Auto-Grader',
              desc: 'Gemini generates a 5-question exam (4 MCQ + 1 short-answer) per topic using structured JSON schema. MCQ is auto-graded instantly; short answers are graded by a second AI call that returns a 0/0.5/1 score with feedback.',
              tag: 'LLM Evaluation · NLG',
              tagColor: 'bg-red-50 text-red-700',
            },
            {
              icon: '🧠',
              title: 'Socratic Mode AI Tutor',
              desc: 'A system-prompt switch transforms Study Buddy from a direct answering model into a Socratic guide that never gives answers directly — it asks leading questions to promote active recall and deeper understanding.',
              tag: 'Prompt Engineering',
              tagColor: 'bg-teal-50 text-teal-700',
            },
            {
              icon: '📝',
              title: 'AI Study Notes (NLG)',
              desc: 'Structured study notes generated on demand per topic using Gemini with a JSON schema: summary, key concepts (term+definition pairs), examples, common mistakes, and a memory tip. Cached server-side.',
              tag: 'Natural Language Generation',
              tagColor: 'bg-indigo-50 text-indigo-700',
            },
            {
              icon: '📉',
              title: 'Forgetting Curve (Ebbinghaus)',
              desc: 'For each reviewed topic, retention R is estimated using R = e^(–t/S) where t = days since last review and S = SM-2 interval (stability). Sorted by lowest retention to surface topics that need immediate review.',
              tag: 'Cognitive Modelling · Math',
              tagColor: 'bg-rose-50 text-rose-700',
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 p-4 rounded-2xl bg-[#F5F5F0]">
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-[#1A1A1A]">{item.title}</span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", item.tagColor)}>
                    {item.tag}
                  </span>
                </div>
                <p className="text-xs text-[#5A5A40]/70 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── StudyRooms ───────────────────────────────────────────────────────────────
export const StudyRooms = () => {
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const shareLink = `${window.location.origin}?room=study-${Math.random().toString(36).slice(2, 8)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const features = [
    { icon: '🎙️', title: 'Voice Rooms', desc: 'Study together with live audio' },
    { icon: '📋', title: 'Shared Plans', desc: 'Sync study plans with your group' },
    { icon: '🏆', title: 'Group Streaks', desc: 'Keep each other accountable' },
    { icon: '💬', title: 'Chat', desc: 'Real-time study chat & notes' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#1A1A1A]">Study Rooms</h1>
        <p className="text-sm text-[#5A5A40]/60 mt-1">Collaborative study with friends</p>
      </div>

      {/* Coming soon hero */}
      <div className="bg-gradient-to-br from-white to-[#F5F5F0] rounded-[32px] shadow-md shadow-black/5 p-8 text-center">
        <div className="w-16 h-16 bg-[#5A5A40]/10 rounded-[20px] flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-[#5A5A40]" />
        </div>
        <h2 className="text-xl font-serif font-bold text-[#1A1A1A] mb-2">Coming Soon</h2>
        <p className="text-sm text-[#5A5A40]/70 leading-relaxed max-w-xs mx-auto">
          Study rooms with voice, shared plans, and live accountability partners are in development.
        </p>
      </div>

      {/* Preview features */}
      <div className="grid grid-cols-2 gap-4">
        {features.map((f) => (
          <div key={f.title} className="bg-white rounded-[24px] shadow-md shadow-black/5 p-5">
            <div className="text-2xl mb-2">{f.icon}</div>
            <h3 className="font-bold text-sm text-[#1A1A1A]">{f.title}</h3>
            <p className="text-xs text-[#5A5A40]/60 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Share study plan */}
      <div className="bg-white rounded-[32px] shadow-md shadow-black/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Share2 className="w-5 h-5 text-[#5A5A40]" />
          <h2 className="font-bold text-[#1A1A1A]">Share Your Progress</h2>
        </div>
        <p className="text-sm text-[#5A5A40]/60 mb-4">
          Copy a link to share your study room invite with a friend. Room features will be live soon.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-[#F5F5F0] rounded-xl px-4 py-3 text-sm text-[#5A5A40]/60 font-mono truncate border border-[#1A1A1A]/5">
            {shareLink}
          </div>
          <button
            onClick={handleCopyLink}
            className={cn(
              "px-4 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all active:scale-[0.98]",
              copied ? "bg-green-500 text-white" : "bg-[#5A5A40] text-white hover:bg-[#4A4A30]"
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Join room */}
      <div className="bg-white rounded-[32px] shadow-md shadow-black/5 p-6">
        <h2 className="font-bold text-[#1A1A1A] mb-4">Join a Room</h2>
        <p className="text-sm text-[#5A5A40]/60 mb-4">Got an invite code? Enter it below.</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter invite code"
            value={joinCode}
            onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
            className="flex-1 bg-[#F5F5F0] border border-[#1A1A1A]/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
          />
          <button
            onClick={() => setJoinError('Study Rooms are coming soon. Stay tuned!')}
            className="px-5 py-3 rounded-xl bg-[#5A5A40] text-white font-semibold text-sm hover:bg-[#4A4A30] transition-all active:scale-[0.98]"
          >
            Join
          </button>
        </div>
        {joinError && <p className="text-sm text-[#5A5A40]/60 mt-2 italic">{joinError}</p>}
      </div>
    </div>
  );
};

interface ChatSession {
  id: string;
  title: string;
  messages: { role: 'user' | 'ai', text: string }[];
  updatedAt: number;
}

export const StudyBuddy = ({ fileId, onMessageSent }: { fileId: string | null; onMessageSent?: () => void }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [ragInfo, setRagInfo] = useState<{ retrieved: number; enabled: boolean } | null>(null);
  const [socraticMode, setSocraticMode] = useState(false);
  // ─── Voice mode (Web Speech API) ──────────────────────────────────────────
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speakResponses, setSpeakResponses] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  // Detect Web Speech API on mount and prepare a recognizer.
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setVoiceSupported(false); return; }
    setVoiceSupported(true);
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    return () => { try { recognition.stop(); } catch {} };
  }, []);

  const toggleVoiceListening = () => {
    const r = recognitionRef.current;
    if (!r) return;
    if (voiceListening) {
      r.stop(); setVoiceListening(false); return;
    }
    setInput('');
    r.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((res: any) => res[0].transcript)
        .join('');
      setInput(transcript);
    };
    r.onend = () => setVoiceListening(false);
    r.onerror = () => setVoiceListening(false);
    try { r.start(); setVoiceListening(true); }
    catch { setVoiceListening(false); }
  };

  // Speak AI responses if voice mode is on
  const speak = (text: string) => {
    if (!speakResponses || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  useEffect(() => {
    const loadChats = async () => {
      const loadedChats = await getLocalChats();
      setChats(loadedChats);
      if (loadedChats.length > 0) {
        setCurrentChatId(loadedChats[0].id);
      } else {
        createNewChat();
      }
    };
    loadChats();
  }, []);

  const createNewChat = () => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now(),
    };
    setChats(prev => {
      const updated = [newChat, ...prev];
      saveLocalChats(updated);
      return updated;
    });
    setCurrentChatId(newChat.id);
  };

  const currentChat = chats.find(c => c.id === currentChatId);
  const messages = currentChat?.messages || [];

  const updateCurrentChat = (newMessages: { role: 'user' | 'ai', text: string }[]) => {
    if (!currentChatId) return;
    
    let title = currentChat?.title || 'New Chat';
    if (title === 'New Chat' && newMessages.length > 0) {
      const firstUserMsg = newMessages.find(m => m.role === 'user');
      if (firstUserMsg) {
        title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
      }
    }

    setChats(prev => {
      const updatedChats = prev.map(chat => {
        if (chat.id === currentChatId) {
          return { ...chat, messages: newMessages, title, updatedAt: Date.now() };
        }
        return chat;
      }).sort((a, b) => b.updatedAt - a.updatedAt);
      saveLocalChats(updatedChats);
      return updatedChats;
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentChatId) return;
    
    const userMessage = { role: 'user' as const, text: input };
    const newMessages = [...messages, userMessage];
    updateCurrentChat(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Include context of previous messages
      const history = messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
      const promptWithHistory = history ? `Previous conversation:\n${history}\n\nUser: ${input}` : input;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: promptWithHistory, fileId, socraticMode }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error generating response.');
      }
      
      const data = await response.json();
      setRagInfo({ retrieved: data.retrievedChunks || 0, enabled: data.ragEnabled || false });
      updateCurrentChat([...newMessages, { role: 'ai', text: data.text }]);
      if (onMessageSent) onMessageSent();
      speak(data.text);
    } catch (error: any) {
      console.error('Error:', error);
      updateCurrentChat([...newMessages, { role: 'ai', text: error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!fileId || !currentChatId) return;
    setSummarizing(true);
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });
      
      if (!response.ok) throw new Error('Failed to summarize.');
      
      const data = await response.json();
      updateCurrentChat([...messages, { role: 'ai', text: `Summary: ${data.summary}` }]);
    } catch (error: any) {
      updateCurrentChat([...messages, { role: 'ai', text: 'Error summarizing file.' }]);
    } finally {
      setSummarizing(false);
    }
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChats(prev => {
      const updatedChats = prev.filter(c => c.id !== id);
      saveLocalChats(updatedChats);
      if (currentChatId === id) {
        setCurrentChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
        if (updatedChats.length === 0) {
          setTimeout(createNewChat, 0); // Create new chat if all are deleted
        }
      }
      return updatedChats;
    });
  };

  return (
    <div className="max-w-5xl mx-auto flex h-[calc(100vh-64px)] gap-6 flex-col md:flex-row p-4 md:p-0">
      {/* Sidebar for chat history */}
      <div className="w-full md:w-64 bg-white rounded-[32px] shadow-md shadow-black/5 flex flex-col shrink-0 md:h-full max-h-[300px] md:max-h-none overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#5A5A40] to-[#4A4A30] text-white p-3 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-md shadow-[#5A5A40]/20"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {chats.map(chat => (
            <div 
              key={chat.id}
              onClick={() => setCurrentChatId(chat.id)}
              className={cn(
                "p-3 rounded-xl cursor-pointer flex items-center justify-between group transition-all",
                currentChatId === chat.id ? "bg-gradient-to-r from-[#5A5A40]/10 to-[#5A5A40]/5 text-[#1A1A1A] shadow-sm" : "hover:bg-gray-50 text-gray-600"
              )}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
                <span className="truncate text-sm font-medium">{chat.title}</span>
              </div>
              <button 
                onClick={(e) => deleteChat(e, chat.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-all md:opacity-0 opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-[32px] shadow-md shadow-black/5 overflow-hidden h-[500px] md:h-full">
        <div className="p-4 md:p-5 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-white to-[#F5F5F0]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5A5A40] to-[#3F3F2D] flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#1A1A1A]">Study Buddy</h1>
              <p className="text-[10px] text-[#5A5A40]/50 font-semibold uppercase tracking-widest">
                Gemini 2.5 Flash · RAG
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {ragInfo?.enabled && (
              <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                RAG · {ragInfo.retrieved} chunks
              </span>
            )}
            <button
              onClick={() => setSocraticMode(p => !p)}
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all border",
                socraticMode
                  ? "bg-teal-50 text-teal-700 border-teal-200"
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
              )}
              title="Toggle Socratic Mode — AI asks questions instead of giving answers"
            >
              <Brain className="w-3 h-3" />
              {socraticMode ? 'Socratic · ON' : 'Socratic'}
            </button>
            {voiceSupported && (
              <button
                onClick={() => setSpeakResponses(p => !p)}
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all border",
                  speakResponses
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                )}
                title="Speak AI responses aloud"
              >
                {speakResponses ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                {speakResponses ? 'Voice · ON' : 'Voice'}
              </button>
            )}
            <Sparkles className="w-5 h-5 text-[#5A5A40] opacity-50" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-gray-50/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm md:text-base">Start a conversation or ask about your uploaded document.</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={cn(
                "p-4 rounded-2xl whitespace-pre-wrap max-w-[85%] text-sm md:text-base shadow-sm",
                m.role === 'user' ? "bg-gradient-to-br from-[#5A5A40] to-[#3F3F2D] text-white ml-auto rounded-tr-sm" : "bg-gradient-to-br from-[#F5F5F0] to-[#EEEEE8] border border-gray-100 mr-auto rounded-tl-sm"
              )}>
                {m.text}
              </div>
            ))
          )}
          {(loading || summarizing) && (
            <div className="p-4 rounded-2xl bg-white border border-gray-100 mr-auto max-w-[80%] rounded-tl-sm shadow-sm flex items-center gap-3 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-[#5A5A40]" />
              {loading ? 'Thinking...' : 'Summarizing...'}
            </div>
          )}
        </div>
        
        <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
          <div className="flex gap-2 mb-3 overflow-x-auto custom-scrollbar pb-1">
            {fileId && (
              <button 
                onClick={handleSummarize}
                disabled={summarizing}
                className="whitespace-nowrap shrink-0 text-xs md:text-sm bg-orange-50 border border-orange-100 text-orange-900 px-4 py-2 rounded-xl font-bold hover:bg-orange-100 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Summarize File
              </button>
            )}
          </div>
          <div className="flex gap-2 items-end">
            <textarea 
              placeholder="Ask me anything..." 
              className="flex-1 p-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 bg-gray-50 resize-none min-h-[56px] max-h-[120px] text-sm md:text-base"
              value={input}
              rows={1}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            {voiceSupported && (
              <button
                onClick={toggleVoiceListening}
                className={cn(
                  "p-4 rounded-2xl font-bold shrink-0 shadow-md active:scale-95 transition-all",
                  voiceListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                )}
                title={voiceListening ? "Stop recording" : "Voice input — speak your question"}
              >
                <Mic className="w-6 h-6" />
              </button>
            )}
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-br from-[#5A5A40] to-[#3F3F2D] text-white p-4 rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-40 shrink-0 shadow-md shadow-[#5A5A40]/25 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </div>
          <div className="text-center mt-2 text-[10px] text-gray-400">
            StudyBuddy AI can make mistakes. Consider verifying important information.
            {voiceListening && <span className="ml-2 text-red-500 font-bold">● Listening…</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Settings = ({ theme, setTheme, profile, updateProfile, userStats, masteryData, studySessions, focusSoundType, setFocusSoundType }: { theme: 'day' | 'dark', setTheme: (t: 'day' | 'dark') => void, profile: any, updateProfile: (updates: any) => void, userStats?: any, masteryData?: any, studySessions?: any[], focusSoundType?: string, setFocusSoundType?: (t: any) => void }) => {
  const [reminderTime, setReminderTime] = React.useState(profile?.reminderTime || '09:00');
  const [focusTime, setFocusTime] = React.useState(profile?.focusTime || 25);
  const [topicsForDay, setTopicsForDay] = React.useState(profile?.topicsForDay || 2);
  const [showShareCard, setShowShareCard] = React.useState(false);
  const shareCardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleSave = () => {
    updateProfile({
      reminderTime,
      focusTime,
      topicsForDay
    });
    alert('Settings saved!');
  };

  return (
    <div className={cn("p-6 max-w-2xl mx-auto min-h-screen transition-colors duration-300", theme === 'dark' ? "bg-[#0A0A0A] text-white" : "bg-[#F5F5F0] text-[#1A1A1A]")}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold">Settings</h1>
          <p className={cn("text-sm mt-0.5", theme === 'dark' ? "text-white/40" : "text-[#5A5A40]/60")}>Customize your study experience</p>
        </div>
        <button onClick={handleSave} className="bg-gradient-to-r from-[#5A5A40] to-[#4A4A30] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-md shadow-[#5A5A40]/20">
          Save Changes
        </button>
      </div>
      <div className="space-y-4">
        {/* Theme */}
        <div className={cn("p-6 rounded-[32px] shadow-md shadow-black/5 flex items-center justify-between", theme === 'dark' ? "bg-[#1A1A1A]" : "bg-white")}>
          <div>
            <h2 className="text-base font-bold">Appearance</h2>
            <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-white/40" : "text-[#5A5A40]/60")}>Choose your preferred theme</p>
          </div>
          <div className="flex gap-2 p-1 rounded-xl bg-gray-100">
            <button onClick={() => setTheme('day')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${theme === 'day' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>☀️ Day</button>
            <button onClick={() => setTheme('dark')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${theme === 'dark' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🌙 Dark</button>
          </div>
        </div>

        {/* Focus & Reminders */}
        <div className={cn("p-6 rounded-[32px] shadow-md shadow-black/5 space-y-5", theme === 'dark' ? "bg-[#1A1A1A]" : "bg-white")}>
          <h2 className="text-base font-bold">Focus & Reminders</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Focus Duration</p>
              <p className={cn("text-xs", theme === 'dark' ? "text-white/40" : "text-[#5A5A40]/60")}>Minutes per Pomodoro session</p>
            </div>
            <input type="number" value={focusTime} onChange={(e) => setFocusTime(Number(e.target.value))} className={cn("w-20 p-2 rounded-xl border text-center font-bold text-sm", theme === 'dark' ? "bg-[#0A0A0A] border-white/20 text-white" : "bg-[#F5F5F0] border-transparent text-[#1A1A1A]")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Daily Reminder</p>
              <p className={cn("text-xs", theme === 'dark' ? "text-white/40" : "text-[#5A5A40]/60")}>Local notification time</p>
            </div>
            <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className={cn("p-2 rounded-xl border text-sm font-medium", theme === 'dark' ? "bg-[#0A0A0A] border-white/20 text-white" : "bg-[#F5F5F0] border-transparent text-[#1A1A1A]")} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">Focus Sounds</p>
                <p className={cn("text-xs", theme === 'dark' ? "text-white/40" : "text-[#5A5A40]/60")}>Ambient audio plays while timer is running</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([
                { id: 'none',  label: 'Off',    icon: '🔇' },
                { id: 'wind',  label: 'Wind',   icon: '🌬️' },
                { id: 'rain',  label: 'Rain',   icon: '🌧️' },
                { id: 'ocean', label: 'Ocean',  icon: '🌊' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFocusSoundType?.(opt.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition-all border",
                    focusSoundType === opt.id
                      ? "bg-gradient-to-b from-[#5A5A40] to-[#3F3F2D] text-white border-transparent shadow-md"
                      : theme === 'dark'
                        ? "bg-white/5 text-white/50 border-white/10 hover:bg-white/10"
                        : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                  )}
                >
                  <span className="text-xl">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Topic Customization */}
        <div className={cn("p-6 rounded-[32px] shadow-md shadow-black/5", theme === 'dark' ? "bg-[#1A1A1A]" : "bg-white")}>
          <h2 className="text-base font-bold mb-1">Daily Topics</h2>
          <p className={cn("text-xs mb-5", theme === 'dark' ? "text-white/40" : "text-[#5A5A40]/60")}>How many topics to tackle each day</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Topics per Day</span>
            <input type="number" min="1" max="10" value={topicsForDay} onChange={(e) => setTopicsForDay(Number(e.target.value))} className={cn("w-20 p-2 rounded-xl border text-center font-bold text-sm", theme === 'dark' ? "bg-[#0A0A0A] border-white/20 text-white" : "bg-[#F5F5F0] border-transparent text-[#1A1A1A]")} />
          </div>
        </div>

        {/* ── Achievements Gallery ──────────────────────────────────────── */}
        <div className={cn("p-6 rounded-[32px] shadow-md shadow-black/5", theme === 'dark' ? "bg-[#1A1A1A]" : "bg-white")}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-100 to-amber-200 flex items-center justify-center">
                <Award className="w-4 h-4 text-yellow-600" />
              </div>
              <h2 className="text-base font-bold">Achievements</h2>
            </div>
            <span className={cn("text-xs font-bold px-3 py-1.5 rounded-lg", theme === 'dark' ? "bg-white/10 text-white/70" : "bg-[#5A5A40]/10 text-[#5A5A40]")}>
              {(userStats?.achievements?.length || 0)} / {ACHIEVEMENTS.length} unlocked
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {ACHIEVEMENTS.map(a => {
              const unlocked = userStats?.achievements?.includes(a.id);
              return (
                <div
                  key={a.id}
                  title={`${a.title} — ${a.description}`}
                  className={cn(
                    "aspect-square rounded-2xl flex flex-col items-center justify-center p-2 text-center transition-all relative overflow-hidden",
                    unlocked
                      ? a.rarity === 'legendary' ? 'bg-gradient-to-br from-yellow-200 to-amber-300 shadow-md shadow-amber-200 scale-100 hover:scale-105'
                      : a.rarity === 'epic'      ? 'bg-gradient-to-br from-purple-100 to-purple-200 shadow-sm shadow-purple-100 hover:scale-105'
                      : a.rarity === 'rare'      ? 'bg-gradient-to-br from-blue-100 to-sky-200 shadow-sm shadow-blue-100 hover:scale-105'
                                                  : 'bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm hover:scale-105'
                      : (theme === 'dark' ? 'bg-white/5' : 'bg-gray-50 grayscale opacity-40')
                  )}
                >
                  <span className="text-2xl mb-0.5">{unlocked ? a.icon : '🔒'}</span>
                  <p className={cn("text-[9px] font-bold uppercase tracking-wide leading-tight", unlocked ? 'text-[#1A1A1A]' : (theme === 'dark' ? 'text-white/30' : 'text-gray-400'))}>
                    {a.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Shareable Progress Card ───────────────────────────────────── */}
        <div className={cn("p-6 rounded-[32px] shadow-md shadow-black/5", theme === 'dark' ? "bg-[#1A1A1A]" : "bg-white")}>
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-5 h-5 text-[#5A5A40]" />
            <h2 className="text-lg font-bold">Share Your Progress</h2>
          </div>
          <p className={cn("text-sm mb-4", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
            Generate a beautiful card with your stats — share it on Twitter, Instagram, LinkedIn, or with study friends.
          </p>
          <button
            onClick={() => setShowShareCard(true)}
            className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-[#5A5A40] to-[#3F3F2D] text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Generate Share Card
          </button>
        </div>
      </div>

      {/* ── Share Card Modal ─────────────────────────────────────────────── */}
      {showShareCard && (
        <ShareCardModal
          stats={userStats}
          profile={profile}
          masteryData={masteryData}
          studySessions={studySessions}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
};

// ─── Shareable Progress Card Modal ───────────────────────────────────────────
// Renders a glanceable card the user can download as a PNG and share on
// social media. The card is drawn as SVG (so download keeps perfect quality)
// and converted to PNG via a canvas + dataURL on demand.
const ShareCardModal = ({ stats, profile, masteryData, studySessions, onClose }: {
  stats: UserStats; profile: any; masteryData: any; studySessions: any[]; onClose: () => void;
}) => {
  const [downloading, setDownloading] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const safeStats: UserStats = stats || {
    xp: 0, totalReviews: 0, totalExams: 0, perfectExams: 0, topicsMastered: 0,
    documentsUploaded: 0, studyBuddyMessages: 0, achievements: [],
    lastQuestRefreshDate: '', questsCompletedToday: [],
  };
  const xpInfo = xpProgressInLevel(safeStats.xp);
  const totalMinutes = (studySessions || []).reduce((s: number, x: any) => s + (x.durationMinutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const masteredTopics = (Object.values(masteryData || {}) as any[]).filter((m: any) => m.score >= 80).length;
  const masteryArr = Object.values(masteryData || {}) as any[];
  const avgMastery = masteryArr.length
    ? Math.round(masteryArr.reduce((s: number, m: any) => s + (m.score || 0), 0) / masteryArr.length)
    : 0;
  const streak = profile?.streakCount || 0;
  const displayName = profile?.displayName || 'Scholar';

  // Convert the SVG node to a downloadable PNG.
  const handleDownload = async () => {
    if (!svgRef.current) return;
    setDownloading(true);
    try {
      const svg = svgRef.current;
      const xml = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200; canvas.height = 630; // OG image dims
        const ctx = canvas.getContext('2d');
        if (!ctx) { setDownloading(false); return; }
        ctx.fillStyle = '#F5F5F0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(b => {
          if (!b) { setDownloading(false); return; }
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = `studyindex-progress-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          setDownloading(false);
        }, 'image/png');
      };
      img.onerror = () => setDownloading(false);
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
    } catch (e) {
      console.error(e);
      setDownloading(false);
    }
  };

  // Use Web Share API if available; fall back to download.
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `I'm on Level ${xpInfo.level} on StudyIndex`,
          text: `📚 ${safeStats.totalReviews} cards reviewed · ${masteredTopics} topics mastered · ${streak}-day streak\nJoin me on StudyIndex!`,
          url: 'https://studyindex.onrender.com',
        });
        return;
      } catch {}
    }
    handleDownload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-8" onClick={onClose}>
      <div className="bg-white rounded-[40px] p-6 max-w-2xl w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 transition-colors z-10">
          <X className="w-5 h-5 text-[#5A5A40]" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-5 h-5 text-[#5A5A40]" />
          <h2 className="font-bold text-lg text-[#1A1A1A]">Your StudyIndex Card</h2>
        </div>

        {/* SVG Card preview */}
        <div className="rounded-3xl overflow-hidden border border-gray-200 bg-[#F5F5F0] mb-4">
          <svg ref={svgRef} viewBox="0 0 1200 630" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
            {/* Background gradient */}
            <defs>
              <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#5A5A40" />
                <stop offset="1" stopColor="#2A2A1A" />
              </linearGradient>
              <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FCD34D" />
                <stop offset="1" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            <rect width="1200" height="630" fill="url(#bg)" />

            {/* Decorative dots */}
            <g opacity="0.06">
              {Array.from({ length: 60 }).map((_, i) => (
                <circle key={i} cx={(i * 73) % 1200} cy={((i * 41) % 600) + 30} r="2" fill="white" />
              ))}
            </g>

            {/* Header */}
            <text x="60" y="80" fill="white" fontSize="24" fontWeight="800" letterSpacing="6" opacity="0.5">STUDYINDEX</text>
            <text x="60" y="160" fill="white" fontSize="56" fontWeight="800">{displayName.slice(0, 18)}</text>
            <text x="60" y="200" fill="white" fontSize="22" opacity="0.6">AI-powered study companion</text>

            {/* Big level circle */}
            <circle cx="1010" cy="160" r="100" fill="url(#gold)" opacity="0.15" />
            <circle cx="1010" cy="160" r="80" fill="url(#gold)" />
            <text x="1010" y="155" fill="#3A2D00" fontSize="28" fontWeight="800" textAnchor="middle">LEVEL</text>
            <text x="1010" y="195" fill="#3A2D00" fontSize="48" fontWeight="900" textAnchor="middle">{xpInfo.level}</text>

            {/* XP bar */}
            <rect x="60" y="250" width="900" height="14" rx="7" fill="white" opacity="0.15" />
            <rect x="60" y="250" width={Math.max(8, 900 * xpInfo.pct)} height="14" rx="7" fill="url(#gold)" />
            <text x="60" y="290" fill="white" fontSize="16" opacity="0.6">{safeStats.xp.toLocaleString()} XP · {Math.round(xpInfo.pct * 100)}% to Level {xpInfo.nextLevel}</text>

            {/* Stats grid */}
            {[
              { label: 'CARDS REVIEWED', value: safeStats.totalReviews.toLocaleString(), x: 60 },
              { label: 'TOPICS MASTERED', value: masteredTopics, x: 350 },
              { label: 'HOURS STUDIED', value: totalHours, x: 640 },
              { label: 'DAY STREAK', value: streak, x: 930 },
            ].map((s, i) => (
              <g key={i}>
                <rect x={s.x} y="350" width="220" height="120" rx="20" fill="white" opacity="0.08" />
                <text x={s.x + 110} y="395" fill="white" opacity="0.55" fontSize="14" fontWeight="700" letterSpacing="2" textAnchor="middle">{s.label}</text>
                <text x={s.x + 110} y="445" fill="white" fontSize="44" fontWeight="900" textAnchor="middle">{s.value}</text>
              </g>
            ))}

            {/* Mastery bar */}
            <text x="60" y="525" fill="white" opacity="0.55" fontSize="14" fontWeight="700" letterSpacing="2">AVERAGE MASTERY</text>
            <rect x="60" y="540" width="900" height="14" rx="7" fill="white" opacity="0.15" />
            <rect x="60" y="540" width={Math.max(8, 900 * (avgMastery / 100))} height="14" rx="7" fill="#22C55E" />
            <text x="980" y="552" fill="white" fontSize="20" fontWeight="800">{avgMastery}%</text>

            {/* Footer */}
            <text x="60" y="600" fill="white" opacity="0.4" fontSize="14">studyindex.onrender.com · Powered by Gemini 2.5 Flash</text>
            <text x="1140" y="600" fill="white" opacity="0.4" fontSize="14" textAnchor="end">{safeStats.achievements?.length || 0} achievements unlocked</text>
          </svg>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-3 rounded-2xl bg-[#5A5A40] text-white font-bold text-sm hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? 'Downloading…' : 'Download PNG'}
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-3">
          Card is generated client-side as 1200×630 PNG (perfect for Twitter/LinkedIn previews).
        </p>
      </div>
    </div>
  );
};

