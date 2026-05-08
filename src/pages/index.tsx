import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { saveLocalChats, getLocalChats } from '../lib/storage';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
export { Dashboard } from './Dashboard';
export { Login } from './Login';
export const Analytics = () => {
  const hasData = false; // Placeholder for actual data check

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-serif font-bold mb-6">Analytics</h1>
      {!hasData ? (
        <div className="text-center py-12 bg-gray-50 rounded-[32px] border border-gray-100">
          <p className="text-gray-500 italic">No data generated as of now.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4">Time Spent</h2>
            {/* Placeholder for graph */}
            <div className="h-40 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
              Graph Placeholder
            </div>
          </div>
          <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100">
            <h2 className="text-lg font-bold text-orange-900 mb-2">Motivation</h2>
            <p className="text-orange-700 italic">"Consistency is the key to mastery. Keep going!"</p>
          </div>
        </div>
      )}
    </div>
  );
};

export const StudyRooms = () => {
  const [inviteEmail, setInviteEmail] = React.useState('');

  const handleInviteByEmail = () => {
    console.log('Inviting by email:', inviteEmail);
    setInviteEmail('');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-serif font-bold mb-6">Study Rooms</h1>
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-bold mb-4">Invite a Friend</h2>
        <div className="flex gap-2">
          <input 
            type="email" 
            placeholder="Enter email address" 
            className="flex-1 p-3 rounded-xl border border-gray-200"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button 
            onClick={handleInviteByEmail}
            className="bg-[#5A5A40] text-white px-6 py-3 rounded-xl font-bold"
          >
            Invite
          </button>
        </div>
      </div>
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4">Active Rooms</h2>
        <p className="text-gray-500 italic">No active rooms. Start one by inviting a friend!</p>
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
          <h1 className="text-xl md:text-2xl font-serif font-bold">Study Buddy</h1>
          <Sparkles className="w-5 h-5 text-[#5A5A40] opacity-50" />
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

