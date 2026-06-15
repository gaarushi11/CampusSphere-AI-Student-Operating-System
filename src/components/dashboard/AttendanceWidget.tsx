'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

export function AttendanceWidget() {
  const classes = useAppStore((s) => s.classes);
  const attendanceLogs = useAppStore((s) => s.attendanceLogs || []);
  
  // Calculate dynamic stats from classes
  const uniqueSubjects = Array.from(new Set(classes.map(c => c.shortCode)));
  const attendanceStats = uniqueSubjects.map(shortCode => {
    // Find all class IDs for this subject
    const classIds = classes.filter(c => c.shortCode === shortCode).map(c => c.id);
    
    // Find all logs for these classes
    const logs = attendanceLogs.filter(log => classIds.includes(log.classId) && log.status !== 'Cancelled');
    
    const total = logs.length;
    const attended = logs.filter(log => log.status === 'Present').length;
    
    const percentage = total === 0 ? 100 : Math.round((attended / total) * 100);
    
    let status = 'safe';
    if (percentage < 75) status = 'danger';
    else if (percentage < 80) status = 'warning';
    
    return { shortCode, percentage, status, attended, total };
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-5 h-5 rounded-full border-2 border-cyan-400 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
          </div>
          Attendance Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          {/* Per-subject breakdown */}
          <div className="w-full space-y-4">
            {attendanceStats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-400 font-medium">No classes tracked yet</p>
                <p className="text-xs text-slate-600 mt-1 max-w-[220px]">Add classes in the Schedule page, then mark attendance from your daily timeline.</p>
              </div>
            )}
            {attendanceStats.map((stat, index) => {
              const needed = Math.max(0, Math.ceil((0.75 * stat.total - stat.attended) / 0.25));
              return (
                <motion.div
                  key={stat.shortCode}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-200">
                      {stat.shortCode}
                    </span>
                    <span className={cn('text-sm font-bold', 
                        stat.status === 'danger' ? 'text-rose-400' :
                        stat.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                    )}>
                      {stat.attended} / {stat.total} <span className="text-[10px] text-slate-500 ml-1 font-normal">attended</span>
                    </span>
                  </div>
                  
                  {stat.status === 'danger' && needed > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 bg-rose-500/10 px-2 py-1.5 rounded-md">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-[11px] text-rose-400 font-medium">
                        Attend next {needed} classes to reach 75%
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
