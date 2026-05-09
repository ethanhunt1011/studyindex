import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, BarChart3, Users, Sparkles, Settings, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard',   path: '/',          icon: BookOpen  },
    { name: 'Analytics',   path: '/analytics', icon: BarChart3 },
    { name: 'Study Rooms', path: '/rooms',      icon: Users     },
    { name: 'Study Buddy', path: '/buddy',      icon: Sparkles  },
    { name: 'Settings',    path: '/settings',   icon: Settings  },
  ];

  const close = () => setIsSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F5F5F0] to-[#EEEEE6] overflow-hidden relative">

      {/* ── Mobile hamburger ─────────────────────────────────────── */}
      <button
        onClick={() => setIsSidebarOpen(v => !v)}
        className="md:hidden fixed top-5 left-5 z-50 p-2.5 bg-white rounded-full shadow-md border border-[#1A1A1A]/10 transition-transform active:scale-90"
        aria-label="Toggle menu"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isSidebarOpen
            ? <motion.span key="x"    initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X    className="w-5 h-5 text-[#5A5A40]" /></motion.span>
            : <motion.span key="menu" initial={{ rotate:  90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="w-5 h-5 text-[#5A5A40]" /></motion.span>
          }
        </AnimatePresence>
      </button>

      {/* ── Mobile overlay ───────────────────────────────────────── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm"
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <nav className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white/95 backdrop-blur-md border-r border-[#1A1A1A]/5 p-6 flex flex-col",
        "transform transition-transform duration-300 ease-in-out",
        "md:relative md:translate-x-0 shadow-xl shadow-black/5 md:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10 mt-2 md:mt-0 pl-10 md:pl-0">
          <div className="w-8 h-8 bg-gradient-to-br from-[#5A5A40] to-[#3F3F2D] rounded-[10px] flex items-center justify-center shadow-md shadow-[#5A5A40]/30 shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-serif font-bold text-[#1A1A1A] tracking-tight">StudyIndex</span>
        </div>

        {/* Nav items */}
        <div className="space-y-1 flex-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={close}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group",
                  isActive
                    ? "text-white"
                    : "text-[#5A5A40] hover:bg-[#5A5A40]/5 hover:text-[#1A1A1A]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-gradient-to-r from-[#5A5A40] to-[#4A4A30] rounded-xl shadow-md shadow-[#5A5A40]/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 relative z-10 shrink-0", isActive ? "text-white" : "")} />
                <span className="font-medium text-sm relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer hint */}
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#5A5A40]/30 mt-4">
          AI-Powered Learning
        </p>
      </nav>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 w-full h-screen overflow-y-auto">
        <div className="p-4 pt-20 md:p-8 md:pt-8 w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};
