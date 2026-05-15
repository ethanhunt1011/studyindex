import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  LogOut,
  LogIn,
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
  GraduationCap,
  FileText,
  Target,
  Edit3,
  BrainCircuit,
  Network,
  Star,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  XP,
  levelFromXP,
  xpProgressInLevel,
  generateDailyQuests,
  evaluateQuestProgress,
  ACHIEVEMENTS,
  type UserStats,
  type DailyQuest,
} from '../lib/gamification';

// ─── Progress Ring (SVG circular progress) ───────────────────────────────────
const ProgressRing = ({
  value, max, size = 72, strokeWidth = 7, color = '#5A5A40', label, sublabel,
}: {
  value: number; max: number; size?: number; strokeWidth?: number;
  color?: string; label?: string; sublabel?: string;
}) => {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0F0EC" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-base font-bold text-[#1A1A1A] leading-none">{value}</span>
          {sublabel && <span className="text-[9px] text-[#5A5A40]/50 font-semibold leading-none mt-0.5">/{max}</span>}
        </div>
      </div>
      {label && <span className="text-[10px] font-semibold text-[#5A5A40]/60 uppercase tracking-wider text-center">{label}</span>}
    </div>
  );
};

// ─── Study Notes Modal ───────────────────────────────────────────────────────
const StudyNotesModal = ({ topic, onClose }: { topic: any; onClose: () => void }) => {
  const [notes, setNotes] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/study-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicTitle: topic.title, context: topic.dailyExercise || '' }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setNotes(data);
        setLoading(false);
      })
      .catch((err: any) => { setError(err.message || 'Failed to load notes'); setLoading(false); });
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-[40px] p-8 max-w-lg w-full shadow-2xl relative"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-[#5A5A40]" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-2xl flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-[#1A1A1A]">Study Notes</h2>
              <p className="text-xs text-[#5A5A40]/60 truncate max-w-[220px]">{topic.title}</p>
            </div>
          </div>

          {loading && (
            <div className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
              <p className="text-sm text-[#5A5A40]/60">Generating notes…</p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm py-4">{error}</p>}

          {notes && !loading && (
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {/* Summary */}
              <div className="p-4 bg-[#5A5A40] rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1.5">Summary</p>
                <p className="text-sm text-white leading-relaxed">{notes.summary}</p>
              </div>

              {/* Key Concepts */}
              {notes.keyConcepts?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 mb-2">Key Concepts</p>
                  <div className="space-y-2">
                    {notes.keyConcepts.map((c: any, i: number) => (
                      <div key={i} className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <span className="font-bold text-sm text-blue-900">{c.term}</span>
                        <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">{c.definition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Points */}
              {notes.keyPoints?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 mb-2">Key Points</p>
                  <ul className="space-y-1.5">
                    {notes.keyPoints.map((p: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#1A1A1A]">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#5A5A40] shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Examples */}
              {notes.examples?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 mb-2">Examples</p>
                  <div className="space-y-1.5">
                    {notes.examples.map((ex: string, i: number) => (
                      <div key={i} className="p-3 bg-green-50 rounded-xl text-sm text-green-800 border border-green-100">
                        {ex}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Common Mistakes */}
              {notes.commonMistakes?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 mb-2">Common Mistakes</p>
                  <div className="space-y-1.5">
                    {notes.commonMistakes.map((m: string, i: number) => (
                      <div key={i} className="p-3 bg-red-50 rounded-xl text-sm text-red-800 border border-red-100 flex gap-2">
                        <span>⚠️</span> {m}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exam Tips */}
              {notes.examTips?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 mb-2">🎯 Exam Tips</p>
                  <div className="space-y-1.5">
                    {notes.examTips.map((t: string, i: number) => (
                      <div key={i} className="p-3 bg-purple-50 rounded-xl text-sm text-purple-800 border border-purple-100 flex gap-2">
                        <span className="shrink-0 font-bold text-purple-400">{i + 1}.</span> {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Memory Tip */}
              {notes.memoryTip && (
                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-700/60 mb-1.5">💡 Memory Tip</p>
                  <p className="text-sm text-yellow-900 font-medium leading-relaxed">{notes.memoryTip}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── AI Mind Map Modal ───────────────────────────────────────────────────────
// Generates a hierarchical concept map for a topic via /api/mind-map and
// renders it as an SVG radial tree. Each branch is colour-rotated through a
// fixed palette so the resulting diagram is genuinely glanceable.
const MindMapModal = ({ topic, onClose }: { topic: any; onClose: () => void }) => {
  const [data, setData] = React.useState<{ root: string; branches: { name: string; leaves: string[] }[] } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/mind-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicTitle: topic.title, context: topic.dailyExercise || '' }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d); setLoading(false);
      })
      .catch((err: any) => { setError(err.message || 'Failed to generate mind map'); setLoading(false); });
  }, []);

  // ── SVG layout ──────────────────────────────────────────────────────────────
  const PALETTE = ['#5A5A40', '#8B7355', '#3F6B6E', '#7B4F3A', '#6B5A8B', '#4F8B6B'];
  // Larger canvas with generous padding so no node clips at the edge.
  const W = 960, H = 740, CX = W / 2, CY = H / 2;
  const branches = data?.branches || [];
  const branchAngles = branches.map((_, i) => (i / branches.length) * 2 * Math.PI - Math.PI / 2);
  const BRANCH_R = 170;   // centre → branch node centre
  const BRANCH_NR = 34;   // branch node radius
  const LEAF_R = 105;     // branch node → leaf dot
  const LEAF_DOT_R = 5;
  const LABEL_GAP = 14;   // gap between dot edge and label start

  /** Wrap a string into lines of at most `maxCh` characters. */
  const wrapText = (text: string, maxCh = 12): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const candidate = line ? line + ' ' + w : w;
      if (candidate.length > maxCh) { if (line) lines.push(line); line = w; }
      else line = candidate;
    }
    if (line) lines.push(line);
    return lines;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-[40px] p-6 max-w-4xl w-full shadow-2xl relative"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 transition-colors z-10">
            <X className="w-5 h-5 text-[#5A5A40]" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-2xl flex items-center justify-center shrink-0">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-[#1A1A1A]">AI Mind Map</h2>
              <p className="text-xs text-[#5A5A40]/60 truncate max-w-xs">{topic.title}</p>
            </div>
          </div>

          {loading && (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
              <p className="text-sm text-[#5A5A40]/60">Building concept map…</p>
            </div>
          )}

          {error && (
            <div className="py-8 text-center">
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button onClick={onClose} className="px-6 py-2 bg-gray-100 rounded-xl text-sm font-bold">Close</button>
            </div>
          )}

          {data && !loading && (
            <div className="w-full bg-gradient-to-br from-[#FAFAF5] to-[#F0F0E8] rounded-3xl p-4">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-auto"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {/* ── Connector lines (rendered first, sits behind everything) ── */}
                {branches.map((branch, i) => {
                  const angle = branchAngles[i];
                  const bx = CX + Math.cos(angle) * BRANCH_R;
                  const by = CY + Math.sin(angle) * BRANCH_R;
                  const color = PALETTE[i % PALETTE.length];
                  const leafCount = branch.leaves.length;
                  // Adaptive spread: wider when there are more leaves (capped at 100°).
                  const leafSpread = Math.min(Math.PI * 0.78, Math.PI / 2.5 + Math.max(0, leafCount - 3) * 0.09);
                  return (
                    <g key={`lines-${i}`}>
                      {/* Centre → branch */}
                      <line x1={CX} y1={CY} x2={bx} y2={by} stroke={color} strokeWidth={2.5} opacity={0.55} />
                      {/* Branch → each leaf */}
                      {(branch.leaves || []).map((_, li) => {
                        const leafAngle = leafCount === 1
                          ? angle
                          : angle - leafSpread / 2 + (li / (leafCount - 1)) * leafSpread;
                        const lx = bx + Math.cos(leafAngle) * LEAF_R;
                        const ly = by + Math.sin(leafAngle) * LEAF_R;
                        return <line key={`ll-${i}-${li}`} x1={bx} y1={by} x2={lx} y2={ly} stroke={color} strokeWidth={1.2} opacity={0.35} />;
                      })}
                    </g>
                  );
                })}

                {/* ── Leaf dots + labels ───────────────────────────────────── */}
                {branches.map((branch, i) => {
                  const angle = branchAngles[i];
                  const bx = CX + Math.cos(angle) * BRANCH_R;
                  const by = CY + Math.sin(angle) * BRANCH_R;
                  const color = PALETTE[i % PALETTE.length];
                  const leafCount = branch.leaves.length;
                  const leafSpread = Math.min(Math.PI * 0.78, Math.PI / 2.5 + Math.max(0, leafCount - 3) * 0.09);
                  return (branch.leaves || []).map((leaf, li) => {
                    const leafAngle = leafCount === 1
                      ? angle
                      : angle - leafSpread / 2 + (li / (leafCount - 1)) * leafSpread;
                    const lx = bx + Math.cos(leafAngle) * LEAF_R;
                    const ly = by + Math.sin(leafAngle) * LEAF_R;

                    // Label positioning: push label away from the map centre so it
                    // never sits on top of connecting lines or the branch node.
                    const dxFromCenter = lx - CX;
                    const dyFromCenter = ly - CY;
                    const anchor = dxFromCenter > 25 ? 'start' : dxFromCenter < -25 ? 'end' : 'middle';
                    const lbx = anchor === 'start'  ? lx + LEAF_DOT_R + LABEL_GAP
                               : anchor === 'end'   ? lx - LEAF_DOT_R - LABEL_GAP
                               : lx;
                    // For vertically-centred leaves (left/right), centre text on y;
                    // for near-horizontal leaves (top/bottom), push label up or down.
                    const lby = Math.abs(dxFromCenter) > 25
                      ? ly + 3.5                                     // vertically centre on dot
                      : dyFromCenter < 0 ? ly - LEAF_DOT_R - LABEL_GAP  // above dot
                                         : ly + LEAF_DOT_R + LABEL_GAP + 9; // below dot
                    const lines = wrapText(leaf, 13);
                    const lineH = 12;

                    return (
                      <g key={`leaf-${i}-${li}`}>
                        <circle cx={lx} cy={ly} r={LEAF_DOT_R} fill={color} opacity={0.55} />
                        <text textAnchor={anchor} fontSize="9.5" fontWeight="500" fill="#4A4A30">
                          {lines.map((ln, idx) => (
                            <tspan key={idx} x={lbx} y={lby + idx * lineH}>{ln}</tspan>
                          ))}
                        </text>
                      </g>
                    );
                  });
                })}

                {/* ── Branch nodes ─────────────────────────────────────────── */}
                {branches.map((branch, i) => {
                  const angle = branchAngles[i];
                  const bx = CX + Math.cos(angle) * BRANCH_R;
                  const by = CY + Math.sin(angle) * BRANCH_R;
                  const color = PALETTE[i % PALETTE.length];
                  const lines = wrapText(branch.name, 11);
                  const lineH = 13;
                  // Vertically centre the text block inside the circle.
                  const textTopY = by - ((lines.length - 1) * lineH) / 2;
                  return (
                    <g key={`bn-${i}`}>
                      <circle cx={bx} cy={by} r={BRANCH_NR + 10} fill={color} opacity={0.14} />
                      <circle cx={bx} cy={by} r={BRANCH_NR} fill={color} />
                      <text textAnchor="middle" fontSize="10.5" fontWeight="700" fill="white">
                        {lines.map((ln, idx) => (
                          <tspan key={idx} x={bx} y={textTopY + idx * lineH}>{ln}</tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}

                {/* ── Root node ────────────────────────────────────────────── */}
                <circle cx={CX} cy={CY} r={62} fill="#1A1A1A" opacity={0.07} />
                <circle cx={CX} cy={CY} r={50} fill="#1A1A1A" />
                {(() => {
                  const lines = wrapText(data.root, 12);
                  const lineH = 14;
                  const topY = CY - ((lines.length - 1) * lineH) / 2;
                  return (
                    <text textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
                      {lines.map((ln, idx) => (
                        <tspan key={idx} x={CX} y={topY + idx * lineH}>{ln}</tspan>
                      ))}
                    </text>
                  );
                })()}
              </svg>

              <p className="text-[10px] text-[#5A5A40]/50 text-center mt-3">
                Generated by Gemini · concept tree with {branches.length} branches · {branches.reduce((s, b) => s + (b.leaves?.length || 0), 0)} leaves
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

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

// ─── Practice Exam Modal ──────────────────────────────────────────────────────
interface PracticeQuestion {
  id: number;
  type: 'mcq' | 'short' | 'long';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

type ExamType = 'mcq' | 'short' | 'long';

const EXAM_TYPES: { id: ExamType; label: string; icon: string; desc: string; color: string }[] = [
  { id: 'mcq',   label: 'Multiple Choice', icon: '🔘', desc: '10 MCQ questions · auto-graded', color: 'from-blue-500 to-blue-600' },
  { id: 'short', label: 'Short Answer',    icon: '✏️', desc: '10 questions · 1-3 sentence answers', color: 'from-purple-500 to-purple-600' },
  { id: 'long',  label: 'Long Answer',     icon: '📝', desc: '10 essay questions · paragraph answers', color: 'from-[#5A5A40] to-[#3F3F2D]' },
];

const PracticeExamModal = ({
  topic,
  onClose,
  onSaveResult,
}: {
  topic: any;
  onClose: () => void;
  onSaveResult: (r: { topicId: string; topicTitle: string; score: number; totalQuestions: number }) => void;
}) => {
  const [phase, setPhase] = useState<'select' | 'loading' | 'question' | 'feedback' | 'final'>('select');
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { answer: string; score: number; feedback: string; isCorrect: boolean }>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shortAnswerText, setShortAnswerText] = useState('');
  const [gradingShort, setGradingShort] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<{ isCorrect: boolean; feedback: string; score: number } | null>(null);
  const [finalScore, setFinalScore] = useState(0);

  const startExam = (type: ExamType) => {
    setExamType(type);
    setPhase('loading');
    fetch('/api/practice-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicTitle: topic.title, context: topic.dailyExercise || '', examType: type }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setQuestions(data.questions || []);
        setPhase('question');
      })
      .catch((err: any) => setError(err.message || 'Failed to generate exam'));
  };

  const q = questions[currentQ];

  const handleMCQSelect = (option: string) => {
    if (phase !== 'question') return;
    setSelectedOption(option);
    const isCorrect = option === q.correctAnswer;
    const result = { answer: option, score: isCorrect ? 1 : 0, feedback: q.explanation, isCorrect };
    setAnswers(prev => ({ ...prev, [currentQ]: result }));
    setCurrentFeedback(result);
    setPhase('feedback');
  };

  const handleShortSubmit = async () => {
    if (!shortAnswerText.trim() || gradingShort) return;
    setGradingShort(true);
    try {
      const r = await fetch('/api/grade-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, correctAnswer: q.correctAnswer, userAnswer: shortAnswerText }),
      });
      const data = await r.json();
      const result = { answer: shortAnswerText, score: data.score ?? 0, feedback: data.feedback ?? '', isCorrect: data.isCorrect ?? false };
      setAnswers(prev => ({ ...prev, [currentQ]: result }));
      setCurrentFeedback(result);
    } catch {
      const result = { answer: shortAnswerText, score: 0, feedback: 'Could not auto-grade. Review the model answer yourself.', isCorrect: false };
      setAnswers(prev => ({ ...prev, [currentQ]: result }));
      setCurrentFeedback(result);
    }
    setGradingShort(false);
    setPhase('feedback');
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(p => p + 1);
      setSelectedOption(null);
      setShortAnswerText('');
      setCurrentFeedback(null);
      setPhase('question');
    } else {
      const total = (Object.values(answers) as any[]).reduce((s: number, a: any) => s + (a.score || 0), 0);
      const pct = Math.round((total / questions.length) * 100);
      setFinalScore(pct);
      onSaveResult({ topicId: topic.id, topicTitle: topic.title, score: pct, totalQuestions: questions.length });
      setPhase('final');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-[#5A5A40]" />
          </button>

          {/* ── Exam Type Selection ───────────────────────────────────────── */}
          {phase === 'select' && (
            <div className="py-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#5A5A40] rounded-2xl flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-[#1A1A1A] leading-tight">Choose Exam Format</p>
                  <p className="text-xs text-[#5A5A40]/60 truncate max-w-[220px]">{topic.title}</p>
                </div>
              </div>
              <div className="space-y-3">
                {EXAM_TYPES.map(et => (
                  <button
                    key={et.id}
                    onClick={() => startExam(et.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[#1A1A1A]/8 bg-gray-50 hover:bg-gray-100 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-left group"
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br shrink-0", et.color)}>
                      {et.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#1A1A1A] text-sm">{et.label}</p>
                      <p className="text-xs text-[#5A5A40]/60 mt-0.5">{et.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#5A5A40]/30 group-hover:text-[#5A5A40]/60 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'loading' && !error && (
            <div className="py-16 flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-[#5A5A40]" />
              </div>
              <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
              <p className="text-sm text-[#5A5A40]/60 text-center">
                Generating {examType === 'mcq' ? 'MCQ' : examType === 'short' ? 'short answer' : 'long answer'} exam for<br />
                <span className="font-bold text-[#1A1A1A]">{topic.title}</span>
              </p>
            </div>
          )}

          {error && (
            <div className="py-8 text-center">
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button onClick={onClose} className="px-6 py-2 bg-gray-100 rounded-xl text-sm font-bold">Close</button>
            </div>
          )}

          {(phase === 'question' || phase === 'feedback') && q && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#5A5A40] rounded-xl flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-[#1A1A1A]">Practice Exam</span>
                  <p className="text-[10px] text-[#5A5A40]/50 truncate">{topic.title}</p>
                </div>
                <span className="text-xs text-[#5A5A40]/50 shrink-0">{currentQ + 1} / {questions.length}</span>
              </div>

              <div className="h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden">
                <div
                  className="h-full bg-[#5A5A40] rounded-full transition-all duration-500"
                  style={{ width: `${((currentQ + (phase === 'feedback' ? 1 : 0)) / questions.length) * 100}%` }}
                />
              </div>

              <span className={cn(
                "inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md mb-3",
                q.type === 'mcq' ? "bg-blue-50 text-blue-700" : q.type === 'short' ? "bg-purple-50 text-purple-700" : "bg-[#5A5A40]/10 text-[#5A5A40]"
              )}>
                {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'short' ? 'Short Answer' : 'Long Answer'}
              </span>

              <p className="font-semibold text-[#1A1A1A] leading-relaxed mb-5">{q.question}</p>

              {q.type === 'mcq' && q.options && (
                <div className="space-y-2 mb-4">
                  {q.options.map((opt, i) => {
                    let cls = "border-[#1A1A1A]/10 bg-gray-50 hover:bg-gray-100 text-[#1A1A1A] cursor-pointer active:scale-[0.98]";
                    if (phase === 'feedback') {
                      if (opt === q.correctAnswer) cls = "border-green-300 bg-green-50 text-green-800 cursor-default";
                      else if (opt === selectedOption) cls = "border-red-300 bg-red-50 text-red-800 cursor-default";
                      else cls = "border-gray-100 bg-gray-50 text-gray-300 cursor-default";
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleMCQSelect(opt)}
                        disabled={phase === 'feedback'}
                        className={cn("w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all", cls)}
                      >
                        <span className="font-bold mr-2 opacity-40">{['A', 'B', 'C', 'D'][i]}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type !== 'mcq' && phase === 'question' && (
                <div className="mb-4">
                  <textarea
                    value={shortAnswerText}
                    onChange={e => setShortAnswerText(e.target.value)}
                    placeholder={q.type === 'long' ? 'Write a detailed paragraph answer...' : 'Type your answer here...'}
                    className={cn("w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20", q.type === 'long' ? 'h-48' : 'h-28')}
                  />
                  <button
                    onClick={handleShortSubmit}
                    disabled={!shortAnswerText.trim() || gradingShort}
                    className="w-full mt-2 py-3 rounded-2xl bg-[#5A5A40] text-white font-bold text-sm hover:bg-[#4A4A30] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {gradingShort ? <><Loader2 className="w-4 h-4 animate-spin" /> Grading…</> : 'Submit Answer'}
                  </button>
                </div>
              )}

              {q.type !== 'mcq' && phase === 'feedback' && (
                <div className="mb-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#5A5A40]/40 mb-1">Your Answer</p>
                  <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{shortAnswerText}</p>
                  {q.type === 'long' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#5A5A40]/40 mb-1">Key Points (Model Answer)</p>
                      <p className="text-xs text-[#5A5A40]/70 leading-relaxed">{q.correctAnswer}</p>
                    </div>
                  )}
                </div>
              )}

              {phase === 'feedback' && currentFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("p-4 rounded-2xl mb-4 border", currentFeedback.isCorrect ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100")}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{currentFeedback.isCorrect ? '✅' : currentFeedback.score > 0 ? '🟡' : '❌'}</span>
                    <span className={cn("font-bold text-sm", currentFeedback.isCorrect ? "text-green-700" : "text-red-700")}>
                      {currentFeedback.isCorrect ? 'Correct!' : currentFeedback.score > 0 ? 'Partially correct' : 'Incorrect'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{currentFeedback.feedback}</p>
                  {!currentFeedback.isCorrect && q.type === 'mcq' && (
                    <p className="text-xs text-green-700 font-semibold mt-1.5">Correct: {q.correctAnswer}</p>
                  )}
                </motion.div>
              )}

              {phase === 'feedback' && (
                <button
                  onClick={handleNext}
                  className="w-full py-3.5 rounded-2xl bg-[#5A5A40] text-white font-bold text-sm hover:bg-[#4A4A30] transition-colors active:scale-[0.98]"
                >
                  {currentQ < questions.length - 1 ? 'Next Question →' : 'See Results'}
                </button>
              )}
            </>
          )}

          {phase === 'final' && (
            <div className="text-center py-2">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="text-5xl mb-4"
              >
                {finalScore >= 80 ? '🎉' : finalScore >= 60 ? '👍' : '📚'}
              </motion.div>
              <h2 className="text-2xl font-serif font-bold text-[#1A1A1A] mb-1">
                {finalScore >= 80 ? 'Excellent!' : finalScore >= 60 ? 'Good work!' : 'Keep practising!'}
              </h2>
              <p className="text-sm text-[#5A5A40]/60 mb-4 truncate px-4">{topic.title}</p>
              <div className={cn(
                "inline-block text-4xl font-serif font-bold px-8 py-3 rounded-2xl mb-6",
                finalScore >= 80 ? "bg-green-50 text-green-700" : finalScore >= 60 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"
              )}>
                {finalScore}%
              </div>
              <div className="space-y-2 mb-6 text-left">
                {questions.map((qn, i) => {
                  const a = answers[i];
                  return (
                    <div key={i} className={cn("flex items-center gap-2 p-3 rounded-xl", a?.isCorrect ? "bg-green-50" : (a?.score || 0) > 0 ? "bg-yellow-50" : "bg-red-50")}>
                      <span className="text-base shrink-0">{a?.isCorrect ? '✅' : (a?.score || 0) > 0 ? '🟡' : '❌'}</span>
                      <p className="text-xs text-[#1A1A1A] font-medium flex-1 line-clamp-1">{qn.question}</p>
                      <span className="text-xs font-bold shrink-0 tabular-nums">{Math.round((a?.score || 0) * 100)}%</span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-[#5A5A40] text-white font-semibold hover:bg-[#4A4A30] transition-colors active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          )}
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
  handleSavePracticeResult,
  weeklyGoal,
  handleSaveWeeklyGoal,
  userStats,
  focusSoundType,
}: any) => {
  const isDark = isDeepFocus || theme === 'dark';

  // ── Ambient sound engine (Web Audio API) ────────────────────────────────
  const ambientRef = React.useRef<{ ctx: AudioContext; src: AudioBufferSourceNode; gain: GainNode } | null>(null);

  const stopAmbient = React.useCallback(() => {
    const curr = ambientRef.current;
    if (!curr) return;
    ambientRef.current = null;
    const { ctx, src, gain } = curr;
    try {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    } catch {}
    setTimeout(() => {
      try { src.stop(); } catch {}
      try { ctx.close(); } catch {}
    }, 400);
  }, []);

  const startAmbient = React.useCallback((type: string) => {
    // Kill previous context immediately (synchronous) to prevent any overlap
    const prev = ambientRef.current;
    ambientRef.current = null;
    if (prev) {
      try { prev.src.stop(); } catch {}
      try { prev.ctx.close(); } catch {}
    }
    try {
      const ctx = new AudioContext();
      const rate = ctx.sampleRate;
      const secs = 8;
      const buf = ctx.createBuffer(1, rate * secs, rate);
      const d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'rain') {
          b0 = 0.97 * b0 + w * 0.03;
          d[i] = (w - b0) * 0.8;
        } else if (type === 'wind') {
          b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759; b2 = 0.96900*b2 + w*0.1538520;
          d[i] = (b0 + b1 + b2 + w*0.5362) * 0.22;
        } else {
          b0 = (b0 + w * 0.02) / 1.02;
          const wave = Math.sin(i / (rate * 2.5) * Math.PI);
          d[i] = b0 * 4 * (0.5 + 0.5 * Math.abs(wave));
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(0.25, ctx.currentTime, 0.8);
      const filter = ctx.createBiquadFilter();
      if (type === 'rain') { filter.type = 'highpass'; filter.frequency.value = 800; }
      else if (type === 'wind') { filter.type = 'bandpass'; filter.frequency.value = 600; filter.Q.value = 0.5; }
      else { filter.type = 'lowpass'; filter.frequency.value = 600; }
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start();
      ambientRef.current = { ctx, src, gain };
    } catch (e) { console.warn('Ambient sound error', e); }
  }, []);

  React.useEffect(() => {
    if (isTimerRunning && focusSoundType && focusSoundType !== 'none') {
      startAmbient(focusSoundType);
    } else {
      stopAmbient();
    }
    return () => stopAmbient(); // always stop on cleanup — no stale closure conditional
  }, [isTimerRunning, focusSoundType, startAmbient, stopAmbient]);

  // ── Local modal state ────────────────────────────────────────────────────
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showPracticeExam, setShowPracticeExam] = useState(false);
  const [practiceExamTopic, setPracticeExamTopic] = useState<any>(null);
  const [showStudyNotes, setShowStudyNotes] = useState(false);
  const [studyNotesTopic, setStudyNotesTopic] = useState<any>(null);
  const [showMindMap, setShowMindMap] = useState(false);
  const [mindMapTopic, setMindMapTopic] = useState<any>(null);
  const [drillCaughtUp, setDrillCaughtUp] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(weeklyGoal?.minutesPerWeek?.toString() || '120');

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

  // ── SM-2 helpers ─────────────────────────────────────────────────────────────
  const getDueCardCount = (topicId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return Object.values(sm2Cards || {}).filter((c: any) => c.topicId === topicId && c.dueDate <= today).length;
  };

  const handleDrillMode = () => {
    const today = new Date().toISOString().split('T')[0];
    const candidates = allTopics
      .map((t: any) => ({
        topic: t,
        dueCount: Object.values(sm2Cards || {}).filter((c: any) => c.topicId === t.id && c.dueDate <= today).length,
      }))
      .filter(x => x.dueCount > 0)
      .sort((a, b) => b.dueCount - a.dueCount);

    if (!candidates.length) {
      setDrillCaughtUp(true);
      setTimeout(() => setDrillCaughtUp(false), 3000);
      return;
    }
    handleGenerateFlashcards(candidates[0].topic);
  };

  // ── Weekly stats ─────────────────────────────────────────────────────────────
  const startOfWeek = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const thisWeekSessions = (studySessions || []).filter(
    (s: any) => s.date && new Date(s.date + 'T00:00') >= startOfWeek
  );
  const thisWeekMinutes = thisWeekSessions.reduce((sum: number, s: any) => sum + (s.durationMinutes || 0), 0);
  const goalMinutes = weeklyGoal?.minutesPerWeek || 120;

  // ── Quick stats ─────────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = (studySessions || []).filter((s: any) => s.date === todayStr);
  const todayMinutes = todaySessions.reduce((sum: number, s: any) => sum + (s.durationMinutes || 0), 0);

  // ── Gamification: Level + Daily Quests ───────────────────────────────────
  const stats: UserStats = userStats || { xp: 0, totalReviews: 0, totalExams: 0, perfectExams: 0, topicsMastered: 0, documentsUploaded: 0, studyBuddyMessages: 0, achievements: [], lastQuestRefreshDate: '', questsCompletedToday: [] };
  const xpInfo = xpProgressInLevel(stats.xp);
  const dailyQuests = generateDailyQuests(todayStr);
  // Approximate today-only counters from sessions/practiceHistory/sm2 for quest progress
  const todayReviewCount = Object.values(sm2Cards || {}).filter((c: any) => c.lastReviewed === todayStr).length;
  const todayExamCount = ((typeof window !== 'undefined' && (window as any).__todayExams) || 0);
  const masteryAt80 = Object.values(masteryData || {}).filter((m: any) => m.score >= 80).length;
  const questCtx = {
    todayReviews: todayReviewCount,
    todayExams: todayExamCount,
    todayMinutes,
    todayChats: 0,
    masteryAtOrAbove80: masteryAt80,
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-1000",
      isDark ? "bg-[#0A0A0A] text-white" : "bg-[#F5F5F0] text-[#1A1A1A]"
    )}>

      {/* ── Guest Login Prompt ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6"
            onClick={() => setShowLoginPrompt(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className={cn(
                "w-full max-w-sm rounded-3xl shadow-2xl p-7 flex flex-col gap-5",
                isDark ? "bg-[#141414] border border-white/8" : "bg-white border border-black/6"
              )}
            >
              <div className="flex flex-col gap-1.5">
                <p className="font-serif font-bold text-xl">Sign in to StudyIndex</p>
                <p className={cn("text-sm leading-relaxed", isDark ? "text-white/50" : "text-black/40")}>
                  Create a free account or sign in to sync your study plans, streaks, and progress across all your devices.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setShowLoginPrompt(false); handleLogout(); }}
                  className="w-full py-3.5 rounded-2xl bg-[#5A5A40] text-white font-bold text-sm tracking-wide hover:bg-[#3F3F2D] transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Continue to Sign In
                </button>
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className={cn(
                    "w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-colors",
                    isDark ? "bg-white/6 text-white/70 hover:bg-white/10" : "bg-black/5 text-black/50 hover:bg-black/8"
                  )}
                >
                  Stay as Guest
                </button>
              </div>

              <p className={cn("text-[10px] text-center leading-relaxed", isDark ? "text-white/25" : "text-black/25")}>
                Your local guest data will remain in this browser.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showCelebration && (
        <CelebrationModal
          focusMinutes={profile?.focusTime || 25}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* Drill mode "all caught up" toast */}
      <AnimatePresence>
        {drillCaughtUp && (
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-green-400" /> All caught up! No cards due today.
          </motion.div>
        )}
      </AnimatePresence>

      {showStudyNotes && studyNotesTopic && (
        <StudyNotesModal
          topic={studyNotesTopic}
          onClose={() => { setShowStudyNotes(false); setStudyNotesTopic(null); }}
        />
      )}

      {showMindMap && mindMapTopic && (
        <MindMapModal
          topic={mindMapTopic}
          onClose={() => { setShowMindMap(false); setMindMapTopic(null); }}
        />
      )}

      {showPracticeExam && practiceExamTopic && (
        <PracticeExamModal
          topic={practiceExamTopic}
          onClose={() => { setShowPracticeExam(false); setPracticeExamTopic(null); }}
          onSaveResult={(r) => { if (handleSavePracticeResult) handleSavePracticeResult(r); }}
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
          Guest Mode — data stored locally only.
          <button
            onClick={() => setShowLoginPrompt(true)}
            className="underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Sign in to sync
          </button>
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
          {isGuest ? (
            <button
              onClick={() => setShowLoginPrompt(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#5A5A40] text-white hover:bg-[#3F3F2D] transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          ) : (
            <button onClick={handleLogout} className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors">
              <LogOut className="w-5 h-5 text-[#5A5A40]" />
            </button>
          )}
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
                  "flex items-center gap-3 px-5 py-3 rounded-2xl shrink-0 font-semibold text-sm border shadow-sm",
                  isDark ? "bg-white/10 text-white border-white/10" : stat.color + " border-transparent"
                )}
              >
                <div className="p-1.5 rounded-lg bg-white/60">{stat.icon}</div>
                <div>
                  <div className="text-xs font-medium opacity-60 leading-none mb-0.5">{stat.label}</div>
                  <div className="font-bold leading-none">{stat.value}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Upload ───────────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div
            className={cn(
              "border-2 border-dashed rounded-[32px] p-12 text-center transition-all cursor-pointer group",
              isDark ? "border-white/20 hover:border-white/40 bg-white/5" : "border-[#5A5A40]/20 hover:border-[#5A5A40]/50 hover:bg-gradient-to-b hover:from-[#5A5A40]/5 hover:to-transparent",
              processing ? "opacity-50 pointer-events-none" : ""
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.txt,.docx,image/*" />
            {processing ? (
              <Loader2 className={cn("w-10 h-10 mx-auto animate-spin", isDark ? "text-white" : "text-[#5A5A40]")} />
            ) : (
              <Upload className={cn("w-10 h-10 mx-auto mb-4 transition-transform group-hover:scale-110", isDark ? "text-white" : "text-[#5A5A40]")} />
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

        {/* ── Weekly Goal ──────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className={cn(
            "p-6 rounded-[32px] border flex items-center gap-6",
            isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/5 shadow-sm"
          )}>
            <ProgressRing
              value={thisWeekMinutes}
              max={goalMinutes}
              size={80}
              strokeWidth={8}
              color={thisWeekMinutes >= goalMinutes ? '#22c55e' : '#5A5A40'}
              label="min this week"
              sublabel="goal"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Target className={cn("w-4 h-4", isDark ? "text-white/60" : "text-[#5A5A40]/60")} />
                <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-[#1A1A1A]")}>Weekly Goal</span>
                <button
                  onClick={() => setEditingGoal(p => !p)}
                  className={cn("p-1 rounded-full transition-colors ml-auto", isDark ? "hover:bg-white/10 text-white/40" : "hover:bg-gray-100 text-[#5A5A40]/40")}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {editingGoal ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    placeholder="minutes/week"
                    className="w-24 bg-[#F5F5F0] border border-[#1A1A1A]/10 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                    min="1"
                  />
                  <button
                    onClick={() => {
                      const mins = parseInt(goalInput, 10);
                      if (mins > 0 && handleSaveWeeklyGoal) {
                        handleSaveWeeklyGoal({ minutesPerWeek: mins });
                        setEditingGoal(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#5A5A40] text-white text-xs font-bold hover:bg-[#4A4A30] transition-colors"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <p className={cn("text-xs mt-1", isDark ? "text-gray-400" : "text-[#5A5A40]/70")}>
                    {thisWeekMinutes >= goalMinutes
                      ? `🎉 Goal reached! ${thisWeekMinutes}/${goalMinutes} min`
                      : `${thisWeekMinutes}/${goalMinutes} min · ${Math.max(0, goalMinutes - thisWeekMinutes)} min to go`}
                  </p>
                  <div className={cn("h-1.5 rounded-full mt-2 overflow-hidden", isDark ? "bg-white/10" : "bg-gray-100")}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((thisWeekMinutes / goalMinutes) * 100, 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn("h-full rounded-full", thisWeekMinutes >= goalMinutes ? "bg-green-500" : "bg-[#5A5A40]")}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Focus Timer ──────────────────────────────────────────────────── */}
        <section className="mb-8">
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
                  {focusSoundType && focusSoundType !== 'none' && isTimerRunning && (
                    <span className="ml-2 opacity-70">
                      {focusSoundType === 'wind' ? '🌬️' : focusSoundType === 'rain' ? '🌧️' : '🌊'}
                    </span>
                  )}
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

        {/* ── Level + XP Bar ──────────────────────────────────────────────── */}
        <section className="mb-6">
          <div className={cn(
            "p-5 rounded-[28px] border relative overflow-hidden",
            isDark ? "bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border-white/10" : "bg-gradient-to-br from-[#5A5A40] to-[#3F3F2D] border-transparent shadow-lg"
          )}>
            <div className="absolute -right-6 -top-6 opacity-10">
              <Star className="w-32 h-32 text-yellow-400 fill-yellow-400" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 backdrop-blur-sm flex items-center justify-center border border-yellow-400/30">
                    <span className="text-xl font-black text-yellow-300">{xpInfo.level}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Level {xpInfo.level}</p>
                    <p className="text-base font-bold text-white">{stats.xp.toLocaleString()} XP</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Next</p>
                  <p className="text-xs font-bold text-white/80">Level {xpInfo.nextLevel}</p>
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpInfo.pct * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-400"
                />
              </div>
              <p className="text-[10px] text-white/50 mt-1.5 text-right">
                {xpInfo.current.toLocaleString()} / {xpInfo.needed.toLocaleString()} XP
              </p>
            </div>
          </div>
        </section>

        {/* ── Daily Quests ────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className={cn("text-sm font-bold uppercase tracking-widest", isDark ? "text-white/60" : "text-[#5A5A40]/70")}>
              Today's Quests
            </h3>
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-white/40" : "text-[#5A5A40]/40")}>
              Resets at midnight
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dailyQuests.map((q: DailyQuest) => {
              const prog = evaluateQuestProgress(q, questCtx);
              return (
                <motion.div
                  key={q.id}
                  whileHover={{ y: -2 }}
                  className={cn(
                    "p-4 rounded-2xl border relative overflow-hidden",
                    prog.complete
                      ? (isDark ? "bg-green-900/20 border-green-500/30" : "bg-green-50 border-green-200")
                      : (isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-[#1A1A1A]/5 shadow-sm")
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{q.icon}</span>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                      prog.complete
                        ? "bg-green-500 text-white"
                        : (isDark ? "bg-yellow-400/20 text-yellow-300" : "bg-yellow-100 text-yellow-800")
                    )}>
                      {prog.complete ? '✓ Done' : `+${q.xp} XP`}
                    </span>
                  </div>
                  <p className={cn("font-bold text-sm leading-tight", isDark ? "text-white" : "text-[#1A1A1A]")}>{q.title}</p>
                  <p className={cn("text-xs mt-0.5 leading-snug", isDark ? "text-white/50" : "text-[#5A5A40]/60")}>{q.description}</p>
                  <div className={cn("h-1 rounded-full overflow-hidden mt-2.5", isDark ? "bg-white/10" : "bg-gray-100")}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prog.pct * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={cn("h-full rounded-full", prog.complete ? "bg-green-500" : "bg-[#5A5A40]")}
                    />
                  </div>
                  <p className={cn("text-[10px] mt-1 tabular-nums text-right", isDark ? "text-white/40" : "text-[#5A5A40]/50")}>
                    {prog.current} / {q.target}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Topics for the Day ───────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn("text-xl font-serif font-bold", isDark ? "text-white" : "text-[#1A1A1A]")}>
              Topics for the Day
            </h3>
            <button
              onClick={handleDrillMode}
              className={cn(
                "flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors",
                isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#5A5A40]/10 text-[#5A5A40] hover:bg-[#5A5A40]/20"
              )}
              title="Drill Mode — practice your overdue SM-2 cards"
            >
              <Zap className="w-3.5 h-3.5" />
              Drill Mode
            </button>
          </div>
          <div className="space-y-4">
            {topicsForToday.length > 0 ? (
              topicsForToday.map((topic: any) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={cn(
                    "p-6 rounded-[32px] shadow-md shadow-black/5 border-0 border-l-4 transition-all hover:-translate-y-0.5",
                    isDark ? "bg-[#1A1A1A] border-l-[#5A5A40]" : "bg-white border-l-[#5A5A40]"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={cn("font-bold truncate", isDark ? "text-white" : "text-[#1A1A1A]")}>{topic.title}</h4>
                        {getDueCardCount(topic.id) > 0 && (
                          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                            {getDueCardCount(topic.id)} due
                          </span>
                        )}
                      </div>
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
                      {/* Study Notes button */}
                      <button
                        onClick={() => { setStudyNotesTopic(topic); setShowStudyNotes(true); }}
                        className={cn(
                          "p-2.5 rounded-full transition-colors",
                          isDark ? "bg-white/10 hover:bg-white/20 text-teal-300" : "bg-teal-50 hover:bg-teal-100 text-teal-600"
                        )}
                        title="AI Study Notes"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {/* Practice Exam button */}
                      <button
                        onClick={() => { setPracticeExamTopic(topic); setShowPracticeExam(true); }}
                        className={cn(
                          "p-2.5 rounded-full transition-colors",
                          isDark ? "bg-white/10 hover:bg-white/20 text-purple-300" : "bg-purple-50 hover:bg-purple-100 text-purple-600"
                        )}
                        title="Practice Exam"
                      >
                        <GraduationCap className="w-4 h-4" />
                      </button>
                      {/* Mind Map button */}
                      <button
                        onClick={() => { setMindMapTopic(topic); setShowMindMap(true); }}
                        className={cn(
                          "p-2.5 rounded-full transition-colors",
                          isDark ? "bg-white/10 hover:bg-white/20 text-pink-300" : "bg-pink-50 hover:bg-pink-100 text-pink-600"
                        )}
                        title="AI Mind Map"
                      >
                        <Network className="w-4 h-4" />
                      </button>
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
                    "p-5 rounded-[28px] flex items-center justify-between border-l-4",
                    isDark ? "bg-[#1A1A1A] border-l-green-800" : "bg-green-50/80 border-l-green-500 shadow-sm shadow-green-100"
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
                  <div key={plan.id} className={cn("p-6 md:p-8 rounded-[40px] shadow-lg shadow-black/5 border-0", isDark ? "bg-[#1A1A1A]" : "bg-white")}>
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
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <h6 className={cn("font-bold text-base", isCompleted && "line-through", isDark ? "text-white" : "text-[#1A1A1A]")}>
                                                    {topic.title}
                                                  </h6>
                                                  {getDueCardCount(topic.id) > 0 && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full shrink-0">
                                                      {getDueCardCount(topic.id)} due
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                  onClick={() => { setStudyNotesTopic(topic); setShowStudyNotes(true); }}
                                                  className={cn("p-1.5 rounded-full transition-colors", isDark ? "hover:bg-white/10 text-teal-300" : "hover:bg-teal-50 text-teal-500")}
                                                  title="Study Notes"
                                                >
                                                  <FileText className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => { setPracticeExamTopic(topic); setShowPracticeExam(true); }}
                                                  className={cn("p-1.5 rounded-full transition-colors", isDark ? "hover:bg-white/10 text-purple-300" : "hover:bg-purple-50 text-purple-500")}
                                                  title="Practice Exam"
                                                >
                                                  <GraduationCap className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => handleGenerateFlashcards(topic)}
                                                  className={cn("p-1.5 rounded-full shrink-0 transition-colors", isDark ? "hover:bg-white/10 text-yellow-300" : "hover:bg-yellow-50 text-yellow-500")}
                                                  title="Flashcards"
                                                >
                                                  <Sparkles className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
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
