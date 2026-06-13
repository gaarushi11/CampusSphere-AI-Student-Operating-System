'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CalendarDays, Brain, Settings, Sparkles, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/components/ui/badge';
import { logout } from '@/app/auth/actions';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Schedule', href: '/schedule', icon: CalendarDays },
  { label: 'Knowledge Vault', href: '/vault', icon: Brain },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const profile = useAppStore((s) => s.profile);

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-[240px] bg-slate-900/95 backdrop-blur-md border-r border-slate-800 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center glow-cyan">
          <Sparkles className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gradient-cyan">CampusFlow</h1>
          <p className="text-[10px] text-slate-500 font-medium">AI Student OS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 pl-[10px] font-medium'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-lg shadow-violet-500/20">
              {profile?.name ? profile.name.split(' ').map((n) => n[0]).join('') : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">{profile?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
        <Badge
          variant="outline"
          className="mt-1 text-[10px] text-cyan-400 border-cyan-500/30 bg-cyan-500/5 w-full justify-center"
        >
          Sem {profile?.semester || 1} · {profile?.major || 'B.Tech'} · CGPA {profile?.cgpa || '0.0'}
        </Badge>
      </div>
    </aside>
  );
}
