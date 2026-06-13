'use client';

import { motion } from 'framer-motion';
import {
  Sparkles, Bot, Mail, PenLine, MonitorSmartphone,
  CheckCircle2, Circle, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const sourceConfig: Record<string, { icon: typeof Bot; color: string; label: string }> = {
  'Canvas': { icon: MonitorSmartphone, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', label: 'Canvas' },
  'WhatsApp Extracted': { icon: Bot, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', label: 'WhatsApp' },
  'Email Parsed': { icon: Mail, color: 'text-violet-400 border-violet-500/30 bg-violet-500/10', label: 'Email' },
  'Manual': { icon: PenLine, color: 'text-slate-400 border-slate-600 bg-slate-800', label: 'Manual' },
};

const priorityConfig: Record<string, string> = {
  'High': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'Medium': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Low': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export function TaskPrioritizer() {
  const tasks = useAppStore((s) => s.tasks);
  const toggleTask = useAppStore((s) => s.toggleTask);

  // Sort: Incomplete High → Medium → Low → Completed
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            AI Task Prioritizer
            <Badge className="text-[9px] py-0 px-1.5 bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
              AI
            </Badge>
          </CardTitle>
          <span className="text-xs text-slate-500">
            {tasks.filter((t) => !t.completed).length} pending
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[380px] pr-2">
          <div className="space-y-2">
            {sortedTasks.map((task, index) => {
              const source = sourceConfig[task.source];
              const SourceIcon = source?.icon || PenLine;
              const isHighAndActive = task.priority === 'High' && !task.completed;

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                  className={cn(
                    'group relative p-3 rounded-xl border transition-all duration-300 cursor-pointer',
                    task.completed
                      ? 'bg-slate-900/50 border-slate-800/50 opacity-60'
                      : 'bg-slate-800/30 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700',
                    isHighAndActive && 'pulse-high-priority border-rose-500/30'
                  )}
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task.id);
                      }}
                      aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : isHighAndActive ? (
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600 group-hover:text-slate-400" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className={cn(
                            'text-sm font-medium leading-tight',
                            task.completed
                              ? 'line-through text-slate-500'
                              : 'text-slate-100'
                          )}
                        >
                          {task.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn('text-[9px] py-0 px-1.5 border', priorityConfig[task.priority])}
                        >
                          {task.priority}
                        </Badge>
                        <span className={cn(
                          'text-[10px] font-medium',
                          task.priority === 'High' && !task.completed ? 'text-rose-400' : 'text-slate-500'
                        )}>
                          {task.dueTimeLabel}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-[9px] py-0 px-1.5 ml-auto gap-1 border', source?.color)}
                        >
                          <SourceIcon className="w-3 h-3" />
                          {source?.label}
                        </Badge>
                      </div>
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
