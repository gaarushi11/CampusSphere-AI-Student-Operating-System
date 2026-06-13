'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TodayTimeline } from './TodayTimeline';
import { TaskPrioritizer } from './TaskPrioritizer';
import { AttendanceWidget } from './AttendanceWidget';
import { CampusRadar } from './CampusRadar';
import { useAppStore } from '@/store/useAppStore';

import { useEffect } from 'react';

export function DashboardGrid() {
  const setIsChatOpen = useAppStore((s) => s.setIsChatOpen);
  const fetchData = useAppStore((s) => s.fetchData);
  const isLoading = useAppStore((s) => s.isLoading);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Daily Digest Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-violet-500/5 to-cyan-500/10 p-4 md:p-5"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-violet-500/10 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 glow-cyan">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-cyan-400">CampusFlow AI — Daily Digest</h3>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                You have <span className="text-rose-400 font-semibold">3 urgent items</span> today: Cloud Computing assignment due in 2 hours, Amazon placement registration closes tonight, and campus internet maintenance from 11 PM. Your OS attendance is critically low at 68% — attend today&apos;s class.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 gap-1.5 flex-shrink-0 self-start md:self-center"
            onClick={() => setIsChatOpen(true)}
          >
            Ask AI
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </motion.div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <TodayTimeline />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <TaskPrioritizer />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="md:col-span-2 xl:col-span-1"
        >
          <AttendanceWidget />
        </motion.div>
      </div>

      {/* Campus Radar - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <CampusRadar />
      </motion.div>
    </div>
  );
}
