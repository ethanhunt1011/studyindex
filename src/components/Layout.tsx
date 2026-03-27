import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, BarChart3, Users, Sparkles, Settings, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: BookOpen },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Study Rooms', path: '/rooms', icon: Users },
    { name: 'Study Buddy', path: '/buddy', icon: Sparkles },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#F5F5F0] overflow-hidden relative">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-6 left-6 z-50 p-2 bg-white rounded-full shadow-md border border-[#1A1A1A]/10 transition-transform active:scale-95"
      >
        {isSidebarOpen ? <X className="w-6 h-6 text-[#5A5A40]" /> : <Menu className="w-6 h-6 text-[#5A5A40]" />}
      </button>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#1A1A1A]/10 p-6 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shadow-2xl md:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="text-2xl font-serif font-bold mb-10 mt-2 md:mt-0 pl-12 md:pl-0 text-[#1A1A1A]">StudyIndex</div>
        <div className="space-y-2 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all",
                location.pathname === item.path 
                  ? "bg-[#5A5A40] text-white shadow-md" 
                  : "text-[#5A5A40] hover:bg-[#1A1A1A]/5 hover:text-[#1A1A1A]"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full h-screen overflow-y-auto">
        <div className="p-4 pt-20 md:p-8 md:pt-8 w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};
