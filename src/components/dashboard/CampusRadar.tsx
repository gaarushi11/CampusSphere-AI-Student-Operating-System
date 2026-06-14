'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Briefcase, BookOpen, Home, Radio, Plus, X,
  MapPin, Calendar, Trophy, Users, Code, Wrench, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store/useAppStore';
import { getRelativeTime, cn } from '@/lib/utils';
import type { EventCategory } from '@/types';
import { EVENT_CATEGORIES } from '@/types';

// Notice category config (existing)
const noticeCategoryConfig: Record<string, { icon: typeof AlertTriangle; borderColor: string; bgColor: string; iconColor: string }> = {
  Urgent: { icon: AlertTriangle, borderColor: 'border-l-rose-500', bgColor: 'bg-rose-500/5', iconColor: 'text-rose-400' },
  Placement: { icon: Briefcase, borderColor: 'border-l-violet-500', bgColor: 'bg-violet-500/5', iconColor: 'text-violet-400' },
  Academic: { icon: BookOpen, borderColor: 'border-l-cyan-500', bgColor: 'bg-cyan-500/5', iconColor: 'text-cyan-400' },
  Hostel: { icon: Home, borderColor: 'border-l-amber-500', bgColor: 'bg-amber-500/5', iconColor: 'text-amber-400' },
};

// Event category config
const eventCategoryConfig: Record<EventCategory, { icon: typeof BookOpen; color: string; bg: string }> = {
  Academic:  { icon: BookOpen,  color: 'text-cyan-400',    bg: 'bg-cyan-500/15' },
  Club:      { icon: Users,     color: 'text-violet-400',  bg: 'bg-violet-500/15' },
  Placement: { icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  Social:    { icon: Users,     color: 'text-pink-400',    bg: 'bg-pink-500/15' },
  Sports:    { icon: Trophy,    color: 'text-amber-400',   bg: 'bg-amber-500/15' },
  Hackathon: { icon: Code,      color: 'text-green-400',   bg: 'bg-green-500/15' },
  Workshop:  { icon: Wrench,    color: 'text-blue-400',    bg: 'bg-blue-500/15' },
};

function getCountdown(dateStr: string): string {
  const now = new Date();
  const eventDate = new Date(dateStr);
  const diffMs = eventDate.getTime() - now.getTime();
  if (diffMs < 0) return 'Past';
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today!';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  return `In ${Math.ceil(diffDays / 7)} weeks`;
}

export function CampusRadar() {
  const notices = useAppStore((s) => s.notices);
  const markNoticeRead = useAppStore((s) => s.markNoticeRead);
  const campusEvents = useAppStore((s) => s.campusEvents);
  const addCampusEvent = useAppStore((s) => s.addCampusEvent);
  const deleteCampusEvent = useAppStore((s) => s.deleteCampusEvent);
  const profile = useAppStore((s) => s.profile);

  const unreadCount = notices.filter((n) => !n.isRead).length;
  const [relativeTimes, setRelativeTimes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'events' | 'notices'>('events');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('10:00');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCategory, setEventCategory] = useState<EventCategory>('Academic');

  useEffect(() => {
    const times: Record<string, string> = {};
    notices.forEach((n) => {
      times[n.id] = getRelativeTime(n.datePosted);
    });
    setRelativeTimes(times);
  }, [notices]);

  const handleCreateEvent = async () => {
    if (!eventTitle || !eventDate) return;
    const dateTime = new Date(`${eventDate}T${eventTime}:00`).toISOString();
    await addCampusEvent({
      title: eventTitle,
      description: eventDesc,
      eventDate: dateTime,
      location: eventLocation || 'TBD',
      category: eventCategory,
    });
    setEventTitle('');
    setEventDesc('');
    setEventDate('');
    setEventTime('10:00');
    setEventLocation('');
    setShowCreateModal(false);
  };

  // Only show upcoming events
  const upcomingEvents = campusEvents.filter(e => new Date(e.eventDate) >= new Date(new Date().setHours(0, 0, 0, 0)));

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
          <div className="flex items-center gap-2">
            {unreadCount > 0 && activeTab === 'notices' && (
              <Badge variant="destructive" className="text-[10px]">
                {unreadCount} unread
              </Badge>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors text-[11px] font-medium"
            >
              <Plus className="w-3 h-3" />
              Event
            </button>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-1 mt-3 p-0.5 bg-slate-900/80 rounded-lg">
          <button
            onClick={() => setActiveTab('events')}
            className={cn(
              'flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
              activeTab === 'events' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            Campus Events ({upcomingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('notices')}
            className={cn(
              'flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
              activeTab === 'notices' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            Notices ({notices.length})
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="max-h-[340px]">
          {activeTab === 'events' ? (
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No upcoming events. Be the first to create one!
                </p>
              ) : (
                upcomingEvents.map((event, index) => {
                  const config = eventCategoryConfig[event.category];
                  const EventIcon = config?.icon || BookOpen;
                  const countdown = getCountdown(event.eventDate);
                  const isOwn = event.createdBy === profile?.id;

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', config?.bg)}>
                          <EventIcon className={cn('w-4.5 h-4.5', config?.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-slate-100 leading-tight">{event.title}</h4>
                            <Badge className={cn(
                              'text-[9px] py-0 px-1.5 flex-shrink-0',
                              countdown === 'Today!' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                              countdown === 'Tomorrow' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                              'bg-slate-500/15 text-slate-400 border-slate-500/30'
                            )}>
                              {countdown}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{event.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(event.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                            <span>by {event.createdByName}</span>
                            {isOwn && (
                              <button
                                onClick={() => deleteCampusEvent(event.id)}
                                className="text-rose-500 hover:text-rose-400 ml-auto"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          ) : (
            /* Notices Tab — Original behavior */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notices.map((notice, index) => {
                const config = noticeCategoryConfig[notice.category];
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
          )}
        </ScrollArea>
      </CardContent>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Create Campus Event</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Event Title *</label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Google DSC Hackathon 2026"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Date *</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Time</label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Location</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="LHC Auditorium, Admin Block..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_CATEGORIES.map(cat => {
                      const config = eventCategoryConfig[cat];
                      const Icon = config.icon;
                      return (
                        <button
                          key={cat}
                          onClick={() => setEventCategory(cat)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all',
                            eventCategory === cat
                              ? `${config.bg} ${config.color} border-current`
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Description (optional)</label>
                  <textarea
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="Brief details about the event..."
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateEvent}
                disabled={!eventTitle || !eventDate}
                className="w-full py-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Create Event
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
