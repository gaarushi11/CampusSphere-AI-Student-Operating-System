'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, MapPin, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store/useAppStore';
import { isCurrentClass, isPastClass, getTodayName } from '@/lib/utils';

export function TodayTimeline() {
  const [, setTick] = useState(0);
  const allClasses = useAppStore((s) => s.classes);
  const attendanceLogs = useAppStore((s) => s.attendanceLogs || []);
  const markAttendance = useAppStore((s) => s.markAttendance);
  const todayName = getTodayName();
  const classes = allClasses.filter((c) => c.dayOfWeek === todayName);
  const todayDateString = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Today&apos;s Timeline
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {classes.length} classes
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[380px] pr-3">
          <div className="space-y-0">
            {classes.map((cls, index) => {
              const isCurrent = isCurrentClass(cls.startHour, cls.startMinute, cls.endHour, cls.endMinute);
              const isPast = isPastClass(cls.endHour, cls.endMinute);
              const log = attendanceLogs.find(l => l.classId === cls.id && l.date === todayDateString);

              return (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  className="relative"
                >
                  {/* Timeline connector line */}
                  {index < classes.length - 1 && (
                    <div className="absolute left-[15px] top-[36px] bottom-0 w-[2px] bg-gradient-to-b from-slate-700 to-slate-800" />
                  )}

                  <div
                    className={`relative flex gap-4 p-3 rounded-xl mb-2 transition-all duration-300 ${
                      isCurrent
                        ? 'bg-cyan-500/5 border border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                        : isPast
                        ? 'opacity-50'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="relative flex-shrink-0 mt-1">
                      <div
                        className={`w-[32px] h-[32px] rounded-full flex items-center justify-center ${
                          isPast
                            ? 'bg-slate-700'
                            : isCurrent
                            ? `${cls.color} shadow-lg`
                            : `${cls.color}/20`
                        }`}
                      >
                        {isPast ? (
                          <Check className="w-4 h-4 text-slate-400" />
                        ) : (
                          <span className="text-[10px] font-bold text-white">
                            {cls.shortCode.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      {isCurrent && (
                        <div className={`absolute inset-0 rounded-full ${cls.color}/30 animate-ping`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-slate-400">{cls.time}</span>
                        {isCurrent && (
                          <Badge className="text-[9px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30 py-0 px-1.5">
                            NOW
                          </Badge>
                        )}
                      </div>
                      <h4 className={`text-sm font-semibold mt-1 ${isPast ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                        {cls.title}
                        <span className="text-slate-500 font-normal ml-1.5">({cls.shortCode})</span>
                      </h4>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <MapPin className="w-3 h-3" />
                          {cls.room}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <UserIcon className="w-3 h-3" />
                          {cls.instructor}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant={cls.type === 'Lab' ? 'success' : cls.type === 'Tutorial' ? 'warning' : 'secondary'}
                          className="text-[9px] py-0"
                        >
                          {cls.type}
                        </Badge>
                        <span
                          className={`text-[11px] font-medium ${
                            cls.attendancePercentage < 75
                              ? 'text-rose-400'
                              : cls.attendancePercentage < 80
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {cls.attendancePercentage}% attendance
                        </span>
                      </div>
                      
                      {/* Attendance Actions */}
                      {(isPast || isCurrent) && (
                        <div className="mt-3 flex items-center gap-2">
                          {log ? (
                            <Badge variant={log.status === 'Present' ? 'success' : 'destructive'} className="text-[10px]">
                              Marked {log.status}
                            </Badge>
                          ) : (
                            <>
                              <button
                                onClick={() => markAttendance(cls.id, todayDateString, 'Present')}
                                className="text-[10px] font-medium px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                              >
                                ✅ Present
                              </button>
                              <button
                                onClick={() => markAttendance(cls.id, todayDateString, 'Absent')}
                                className="text-[10px] font-medium px-2 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                              >
                                ❌ Absent
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
