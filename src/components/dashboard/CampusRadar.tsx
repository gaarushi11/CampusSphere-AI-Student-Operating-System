'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Briefcase, BookOpen, Home, Radio,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store/useAppStore';
import { getRelativeTime, cn } from '@/lib/utils';

const categoryConfig: Record<string, { icon: typeof AlertTriangle; borderColor: string; bgColor: string; iconColor: string }> = {
  Urgent: { icon: AlertTriangle, borderColor: 'border-l-rose-500', bgColor: 'bg-rose-500/5', iconColor: 'text-rose-400' },
  Placement: { icon: Briefcase, borderColor: 'border-l-violet-500', bgColor: 'bg-violet-500/5', iconColor: 'text-violet-400' },
  Academic: { icon: BookOpen, borderColor: 'border-l-cyan-500', bgColor: 'bg-cyan-500/5', iconColor: 'text-cyan-400' },
  Hostel: { icon: Home, borderColor: 'border-l-amber-500', bgColor: 'bg-amber-500/5', iconColor: 'text-amber-400' },
};

export function CampusRadar() {
  const notices = useAppStore((s) => s.notices);
  const markNoticeRead = useAppStore((s) => s.markNoticeRead);
  const unreadCount = notices.filter((n) => !n.isRead).length;
  const [relativeTimes, setRelativeTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    const times: Record<string, string> = {};
    notices.forEach((n) => {
      times[n.id] = getRelativeTime(n.datePosted);
    });
    setRelativeTimes(times);
  }, [notices]);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="relative">
              <Radio className="w-4 h-4 text-cyan-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
            </div>
            Campus Radar
          </CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[340px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notices.map((notice, index) => {
              const config = categoryConfig[notice.category];
              const CategoryIcon = config?.icon || BookOpen;

              return (
                <motion.div
                  key={notice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                  onClick={() => markNoticeRead(notice.id)}
                  className={cn(
                    'relative p-4 rounded-xl border-l-[3px] transition-all duration-200 cursor-pointer',
                    config?.borderColor,
                    notice.isRead
                      ? 'bg-slate-900/30 border border-l-[3px] border-slate-800/50 hover:bg-slate-800/30'
                      : `${config?.bgColor} border border-l-[3px] border-slate-800 hover:bg-slate-800/50`
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      `${config?.bgColor} border border-slate-800`
                    )}>
                      <CategoryIcon className={cn('w-4 h-4', config?.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn(
                          'text-sm leading-tight',
                          notice.isRead ? 'text-slate-400 font-normal' : 'text-slate-100 font-semibold'
                        )}>
                          {notice.title}
                        </h4>
                        {!notice.isRead && (
                          <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {notice.excerpt}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-600">
                          by {notice.postedBy}
                        </span>
                        <span className="text-[10px] text-slate-600" suppressHydrationWarning>
                          {relativeTimes[notice.id] || ''}
                        </span>
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
