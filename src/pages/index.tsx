import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { saveLocalChats, getLocalChats } from '../lib/storage';
import { Plus, MessageSquare, Trash2, BarChart3, Clock, CheckCircle2, Flame, Target, Users, Share2, Copy, Check, BookOpen, Sparkles, Loader2, BrainCircuit } from 'lucide-react';
export { Dashboard } from './Dashboard';
export { Login } from './Login';

// ─── Analytics ────────────────────────────────────────────────────────────────
interface AnalyticsProps {
  studySessions?: any[];
  plans?: any[];
  progress?: Record<string, any>;
  profile?: any;
}

export const Analytics = ({ studySessions = [], plans = [], progress = {}, profile }: AnalyticsProps) => {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#1A1A1A]">Analytics</h1>
        <p className="text-sm text-[#5A5A40]/60 mt-1">Track your study progress over time</p>
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
                className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5"
              >
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", stat.color)}>
                  {stat.icon}
                </div>
                <div className="text-2xl font-serif font-bold text-[#1A1A1A]">{stat.value}</div>
                <div className="text-xs text-[#5A5A40]/60 font-medium mt-0.5">{stat.label} · {stat.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* ── Weekly bar chart ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
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
                          isToday ? "bg-[#5A5A40]" : day.minutes > 0 ? "bg-[#5A5A40]/40" : "bg-gray-100"
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

          {/* ── Plan progress ─────────────────────────────────────────────────── */}
          {plans.length > 0 && (
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
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

          {/* ── Motivational quote ────────────────────────────────────────────── */}
          <div className="bg-[#5A5A40] rounded-[32px] p-6 text-white">
            <p className="font-serif text-lg italic leading-relaxed">"{quote.text}"</p>
            <p className="text-sm text-white/60 mt-3 font-medium">— {quote.author}</p>
          </div>

        </>
      )}

      {/* ── AI Stack — always visible ─────────────────────────────────────────── */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <BrainCircuit className="w-5 h-5 text-[#5A5A40]" />
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
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 text-center">
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
          <div key={f.title} className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-5">
            <div className="text-2xl mb-2">{f.icon}</div>
            <h3 className="font-bold text-sm text-[#1A1A1A]">{f.title}</h3>
            <p className="text-xs text-[#5A5A40]/60 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Share study plan */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
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
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
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

export const StudyBuddy = ({ fileId }: { fileId: string | null }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [ragInfo, setRagInfo] = useState<{ retrieved: number; enabled: boolean } | null>(null);

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
        body: JSON.stringify({ input: promptWithHistory, fileId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error generating response.');
      }
      
      const data = await response.json();
      setRagInfo({ retrieved: data.retrievedChunks || 0, enabled: data.ragEnabled || false });
      updateCurrentChat([...newMessages, { role: 'ai', text: data.text }]);
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
      <div className="w-full md:w-64 bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col shrink-0 md:h-full max-h-[300px] md:max-h-none overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <button 
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 bg-[#5A5A40] text-white p-3 rounded-xl font-bold hover:bg-[#4A4A30] transition-colors"
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
                "p-3 rounded-xl cursor-pointer flex items-center justify-between group transition-colors",
                currentChatId === chat.id ? "bg-orange-50 text-orange-900" : "hover:bg-gray-50 text-gray-600"
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
      <div className="flex-1 flex flex-col bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden h-[500px] md:h-full">
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-serif font-bold">Study Buddy</h1>
            <p className="text-[10px] text-[#5A5A40]/50 font-semibold uppercase tracking-widest mt-0.5">
              Gemini 2.5 Flash · RAG Pipeline
            </p>
          </div>
          <div className="flex items-center gap-2">
            {ragInfo?.enabled && (
              <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                RAG · {ragInfo.retrieved} chunks
              </span>
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
                m.role === 'user' ? "bg-[#5A5A40] text-white ml-auto rounded-tr-sm" : "bg-white border border-gray-100 mr-auto rounded-tl-sm"
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
            <button 
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="bg-[#5A5A40] text-white p-4 rounded-2xl font-bold hover:bg-[#4A4A30] transition-colors disabled:opacity-50 shrink-0 shadow-md active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </div>
          <div className="text-center mt-2 text-[10px] text-gray-400">
            StudyBuddy AI can make mistakes. Consider verifying important information.
          </div>
        </div>
      </div>
    </div>
  );
};

export const Settings = ({ theme, setTheme, profile, updateProfile }: { theme: 'day' | 'dark', setTheme: (t: 'day' | 'dark') => void, profile: any, updateProfile: (updates: any) => void }) => {
  const [focusSound, setFocusSound] = React.useState(false);
  const [reminderTime, setReminderTime] = React.useState(profile?.reminderTime || '09:00');
  const [focusTime, setFocusTime] = React.useState(profile?.focusTime || 25);
  const [topicsForDay, setTopicsForDay] = React.useState(profile?.topicsForDay || 2);

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold">Settings</h1>
        <button onClick={handleSave} className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#4A4A30] transition-colors">
          Save Changes
        </button>
      </div>
      <div className="space-y-6">
        {/* Theme */}
        <div className={cn("p-6 rounded-[32px] shadow-sm border flex items-center justify-between", theme === 'dark' ? "bg-[#1A1A1A] border-white/10" : "bg-white border-gray-100")}>
          <h2 className="text-lg font-bold">Theme</h2>
          <div className="flex gap-2">
            <button onClick={() => setTheme('day')} className={`px-4 py-2 rounded-xl ${theme === 'day' ? 'bg-[#5A5A40] text-white' : 'bg-gray-100'}`}>Day</button>
            <button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-xl ${theme === 'dark' ? 'bg-[#5A5A40] text-white' : 'bg-gray-100'}`}>Dark</button>
          </div>
        </div>
        
        {/* Focus & Reminders */}
        <div className={cn("p-6 rounded-[32px] shadow-sm border space-y-4", theme === 'dark' ? "bg-[#1A1A1A] border-white/10" : "bg-white border-gray-100")}>
          <h2 className="text-lg font-bold">Focus & Reminders</h2>
          <div className="flex items-center justify-between">
            <span>Focus Duration (min)</span>
            <input type="number" value={focusTime} onChange={(e) => setFocusTime(Number(e.target.value))} className={cn("w-20 p-2 rounded-xl border", theme === 'dark' ? "bg-[#0A0A0A] border-white/20" : "bg-white border-gray-200")} />
          </div>
          <div className="flex items-center justify-between">
            <span>Reminder Time</span>
            <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className={cn("p-2 rounded-xl border", theme === 'dark' ? "bg-[#0A0A0A] border-white/20" : "bg-white border-gray-200")} />
          </div>
          <div className="flex items-center justify-between">
            <span>Focus Sounds</span>
            <button onClick={() => setFocusSound(!focusSound)} className={`px-4 py-2 rounded-xl ${focusSound ? 'bg-[#5A5A40] text-white' : 'bg-gray-100'}`}>
              {focusSound ? 'On' : 'Off'}
            </button>
          </div>
        </div>
        
        {/* Topic Customization */}
        <div className={cn("p-6 rounded-[32px] shadow-sm border", theme === 'dark' ? "bg-[#1A1A1A] border-white/10" : "bg-white border-gray-100")}>
          <h2 className="text-lg font-bold mb-4">Topic Customization</h2>
          <p className={cn("text-sm mb-4", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>Manage your study topics and priorities here.</p>
          <div className="flex items-center justify-between">
            <span>Topics for the Day</span>
            <input type="number" min="1" max="10" value={topicsForDay} onChange={(e) => setTopicsForDay(Number(e.target.value))} className={cn("w-20 p-2 rounded-xl border", theme === 'dark' ? "bg-[#0A0A0A] border-white/20" : "bg-white border-gray-200")} />
          </div>
        </div>
      </div>
    </div>
  );
};

