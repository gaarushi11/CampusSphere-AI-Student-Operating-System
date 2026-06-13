'use client';

import { motion } from 'framer-motion';
import {
  Clock, MapPin, User as UserIcon, BookOpen, FlaskConical, GraduationCap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { todayClasses } from '@/lib/mockData';
import { cn } from '@/lib/utils';

const daySchedule = [
  { day: 'Monday', isToday: true },
  { day: 'Tuesday', isToday: false },
  { day: 'Wednesday', isToday: false },
  { day: 'Thursday', isToday: false },
  { day: 'Friday', isToday: false },
];

const typeIcons: Record<string, typeof BookOpen> = {
  Lecture: BookOpen,
  Lab: FlaskConical,
  Tutorial: GraduationCap,
};

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          Weekly Schedule
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Your complete class schedule for the week. Today&apos;s classes are highlighted.
        </p>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {daySchedule.map(({ day, isToday }) => (
          <button
            key={day}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              isToday
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-300'
            )}
          >
            {day}
            {isToday && <span className="ml-1.5 text-[10px]">(Today)</span>}
          </button>
        ))}
      </div>

      {/* Full schedule grid */}
      <div className="space-y-3">
        {todayClasses.map((cls, index) => {
          const TypeIcon = typeIcons[cls.type] || BookOpen;

          return (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <Card className="hover:border-slate-700 transition-all group">
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Time block */}
                    <div className="flex items-center gap-3 md:w-48 flex-shrink-0">
                      <div className={cn('w-1.5 h-12 rounded-full', cls.color)} />
                      <div>
                        <p className="text-sm font-mono text-slate-300">{cls.time}</p>
                        <Badge
                          variant="outline"
                          className="mt-1 text-[9px] border-slate-700 text-slate-500 gap-1"
                        >
                          <TypeIcon className="w-3 h-3" />
                          {cls.type}
                        </Badge>
                      </div>
                    </div>

                    {/* Course info */}
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                        {cls.title}
                        <span className="text-slate-500 font-normal ml-2 text-sm">
                          {cls.shortCode}
                        </span>
                      </h3>
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                          <MapPin className="w-3.5 h-3.5" />
                          {cls.room}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                          <UserIcon className="w-3.5 h-3.5" />
                          {cls.instructor}
                        </span>
                      </div>
                    </div>

                    {/* Attendance */}
                    <div className="flex items-center gap-3 md:flex-col md:items-end">
                      <div
                        className={cn(
                          'text-lg font-bold',
                          cls.attendancePercentage < 75
                            ? 'text-rose-400'
                            : cls.attendancePercentage < 80
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        )}
                      >
                        {cls.attendancePercentage}%
                      </div>
                      <span className="text-[10px] text-slate-500">attendance</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Summary card */}
      <Card className="border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-violet-500/5">
        <CardHeader>
          <CardTitle className="text-sm text-cyan-400">Today&apos;s Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-slate-100">{todayClasses.length}</p>
              <p className="text-xs text-slate-500">Total Classes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">6.5</p>
              <p className="text-xs text-slate-500">Hours</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">
                {todayClasses.filter((c) => c.type === 'Lab').length}
              </p>
              <p className="text-xs text-slate-500">Labs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-400">
                {todayClasses.filter((c) => c.attendancePercentage < 75).length}
              </p>
              <p className="text-xs text-slate-500">Low Attendance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
