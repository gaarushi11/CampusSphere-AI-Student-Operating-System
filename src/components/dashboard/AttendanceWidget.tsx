'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { attendanceStats, overallAttendance } from '@/lib/mockData';
import { cn } from '@/lib/utils';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~339.29

function getColorForPercentage(pct: number): string {
  if (pct < 75) return '#f43f5e'; // rose-500
  if (pct < 80) return '#f59e0b'; // amber-500
  return '#10b981'; // emerald-500
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'danger': return 'bg-rose-500';
    case 'warning': return 'bg-amber-500';
    case 'safe': return 'bg-emerald-500';
    default: return 'bg-slate-500';
  }
}

function getStatusTextColor(status: string): string {
  switch (status) {
    case 'danger': return 'text-rose-400';
    case 'warning': return 'text-amber-400';
    case 'safe': return 'text-emerald-400';
    default: return 'text-slate-400';
  }
}

function classesNeeded(attended: number, total: number, target: number = 75): number {
  // How many consecutive classes needed to reach target%
  // (attended + x) / (total + x) >= target/100
  // 100*(attended + x) >= target*(total + x)
  // 100*attended + 100x >= target*total + target*x
  // x*(100 - target) >= target*total - 100*attended
  // x >= (target*total - 100*attended) / (100 - target)
  const needed = Math.ceil((target * total - 100 * attended) / (100 - target));
  return Math.max(0, needed);
}

export function AttendanceWidget() {
  const [animatedOffset, setAnimatedOffset] = useState(CIRCUMFERENCE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      const offset = CIRCUMFERENCE - (overallAttendance / 100) * CIRCUMFERENCE;
      setAnimatedOffset(offset);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const ringColor = getColorForPercentage(overallAttendance);

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
        <div className="flex flex-col items-center">
          {/* SVG Circular Progress Ring */}
          <div className="relative w-[140px] h-[140px]">
            <svg
              className="w-full h-full -rotate-90"
              viewBox="0 0 120 120"
            >
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="rgb(30, 41, 59)" // slate-800
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke={ringColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={mounted ? animatedOffset : CIRCUMFERENCE}
                style={{
                  transition: 'stroke-dashoffset 1.5s ease-out',
                  filter: `drop-shadow(0 0 6px ${ringColor}40)`,
                }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-3xl font-bold"
                style={{ color: ringColor }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
              >
                {overallAttendance}%
              </motion.span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">Overall</span>
            </div>
          </div>

          {/* Per-subject breakdown */}
          <div className="w-full mt-6 space-y-3">
            {attendanceStats.map((stat, index) => {
              const needed = classesNeeded(stat.attended, stat.total);
              return (
                <motion.div
                  key={stat.shortCode}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1, duration: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-300">
                      {stat.shortCode}
                    </span>
                    <span className={cn('text-[11px] font-semibold', getStatusTextColor(stat.status))}>
                      {stat.percentage}%
                    </span>
                  </div>
                  <Progress
                    value={stat.percentage}
                    className="h-1.5"
                    indicatorClassName={getStatusColor(stat.status)}
                  />
                  {stat.status === 'danger' && needed > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span className="text-[10px] text-rose-400">
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
