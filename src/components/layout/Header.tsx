'use client';

import { Bell, Search } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useEffect, useState } from 'react';

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function Header() {
  const notices = useAppStore((s) => s.notices);
  const profile = useAppStore((s) => s.profile);
  const unreadCount = notices.filter((n) => !n.isRead).length;
  const [greeting, setGreeting] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const now = new Date();
    setGreeting(getGreeting(now.getHours()));
    setDateStr(formatDate(now));
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div>
        <p className="text-sm font-medium text-slate-200" suppressHydrationWarning>
          {greeting ? `${greeting}, ${profile?.name?.split(' ')[0] || 'Student'}` : '\u00A0'}
        </p>
        <p className="text-xs text-slate-500" suppressHydrationWarning>{dateStr || '\u00A0'}</p>
      </div>
      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="p-2 rounded-lg hover:bg-slate-800 transition-colors" aria-label="Search">
          <Search className="w-4 h-4 text-slate-400" />
        </button>
        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors" aria-label="Notifications">
          <Bell className="w-4 h-4 text-slate-400" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:shadow-lg hover:shadow-cyan-500/20 transition-shadow">
          {profile?.name ? profile.name.split(' ').map((n) => n[0]).join('') : 'U'}
        </div>
      </div>
    </header>
  );
}
