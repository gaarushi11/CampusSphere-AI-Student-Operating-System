import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DAYS_OF_WEEK, type DayOfWeek } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function isCurrentClass(startHour: number, startMinute: number, endHour: number, endMinute: number): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export function isPastClass(endHour: number, endMinute: number): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const endMinutes = endHour * 60 + endMinute;
  return currentMinutes > endMinutes;
}

/** Returns the current day name matching the DayOfWeek type. */
export function getTodayName(): DayOfWeek {
  const jsDay = new Date().getDay(); // 0 = Sunday
  const index = jsDay === 0 ? 6 : jsDay - 1; // remap to 0=Monday..6=Sunday
  return DAYS_OF_WEEK[index];
}

export function getDayName(date: Date): DayOfWeek {
  const jsDay = date.getDay();
  const index = jsDay === 0 ? 6 : jsDay - 1;
  return DAYS_OF_WEEK[index];
}

/** Format an hour/minute pair as a 12-hour clock string, e.g. "9:00 AM". */
export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

export function formatTimeRange(startHour: number, startMinute: number, endHour: number, endMinute: number): string {
  return `${formatTime(startHour, startMinute)} - ${formatTime(endHour, endMinute)}`;
}

/** Deterministic color assignment based on shortCode hash. */
const COLOR_PALETTE = [
  'bg-cyan-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
];

export function colorForClass(shortCode: string): string {
  let hash = 0;
  for (let i = 0; i < shortCode.length; i++) {
    hash = (hash << 5) - hash + shortCode.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

/** Compute total scheduled hours for a list of classes. */
export function totalHours(classes: { startHour: number; startMinute: number; endHour: number; endMinute: number }[]): number {
  const totalMinutes = classes.reduce((sum, c) => {
    const start = c.startHour * 60 + c.startMinute;
    const end = c.endHour * 60 + c.endMinute;
    return sum + Math.max(0, end - start);
  }, 0);
  return Math.round((totalMinutes / 60) * 10) / 10;
}
