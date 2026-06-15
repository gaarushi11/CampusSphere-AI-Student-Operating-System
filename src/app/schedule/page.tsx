'use client';

import { motion } from 'framer-motion';
import {
  Clock, MapPin, User as UserIcon, BookOpen, FlaskConical, GraduationCap, Trash2, Edit2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import { cn, getTodayName, totalHours } from '@/lib/utils';
import { DAYS_OF_WEEK, type DayOfWeek } from '@/types';

const typeIcons: Record<string, typeof BookOpen> = {
  Lecture: BookOpen,
  Lab: FlaskConical,
  Tutorial: GraduationCap,
};

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
export default function SchedulePage() {
  const allClasses = useAppStore((s) => s.classes);
  const fetchData = useAppStore((s) => s.fetchData);
  const addClass = useAppStore((s) => s.addClass);
  const updateClass = useAppStore((s) => s.updateClass);
  const deleteClass = useAppStore((s) => s.deleteClass);
  const isLoading = useAppStore((s) => s.isLoading);

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayName());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    shortCode: '',
    room: '',
    instructor: '',
    type: 'Lecture',
    dayOfWeek: getTodayName() as string,
    startHour: 9,
    startMinute: 0,
    endHour: 10,
    endMinute: 0,
  });

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (editingClassId) {
      await updateClass(editingClassId, formData as any);
    } else {
      await addClass(formData as any);
    }
    
    setIsSubmitting(false);
    setEditingClassId(null);
    setIsModalOpen(false);
    setFormData({
      title: '',
      shortCode: '',
      room: '',
      instructor: '',
      type: 'Lecture',
      dayOfWeek: getTodayName() as string,
      startHour: 9,
      startMinute: 0,
      endHour: 10,
      endMinute: 0,
    });
  };

  const openEditModal = (cls: any) => {
    setFormData({
      title: cls.title,
      shortCode: cls.shortCode,
      room: cls.room,
      instructor: cls.instructor,
      type: cls.type,
      dayOfWeek: cls.dayOfWeek,
      startHour: cls.startHour,
      startMinute: cls.startMinute,
      endHour: cls.endHour,
      endMinute: cls.endMinute,
    });
    setEditingClassId(cls.id);
    setIsModalOpen(true);
  };

  const classes = allClasses.filter((c) => c.dayOfWeek === selectedDay);

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
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Weekly Schedule
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Your complete class schedule for the week. Today&apos;s classes are highlighted.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingClassId(null);
            setIsModalOpen(true);
          }}
          className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 w-full md:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Class
        </Button>
      </div>

      {/* Manual Add Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                {editingClassId ? 'Edit Class' : 'Add New Class'}
              </h2>
            </div>
            <form onSubmit={handleAddClass} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Course Title</label>
                <Input
                  required
                  placeholder="e.g. Operating Systems"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-slate-950/50 border-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1 block">Short Code</label>
                  <Input
                    required
                    placeholder="e.g. CS302"
                    value={formData.shortCode}
                    onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
                    className="bg-slate-950/50 border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1 block">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full h-10 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab">Lab</option>
                    <option value="Tutorial">Tutorial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Day of Week</label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                  className="w-full h-10 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1 block">Room</label>
                  <Input
                    required
                    placeholder="e.g. LT-3"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="bg-slate-950/50 border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1 block">Instructor</label>
                  <Input
                    required
                    placeholder="e.g. Dr. Smith"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    className="bg-slate-950/50 border-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1 block">Start Time</label>
                  <div className="flex gap-2">
                    <Input
                      type="number" min="0" max="23" required
                      value={formData.startHour}
                      onChange={(e) => setFormData({ ...formData, startHour: parseInt(e.target.value) })}
                      className="bg-slate-950/50 border-slate-800 w-16"
                    />
                    <Input
                      type="number" min="0" max="59" required
                      value={formData.startMinute}
                      onChange={(e) => setFormData({ ...formData, startMinute: parseInt(e.target.value) })}
                      className="bg-slate-950/50 border-slate-800 w-16"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1 block">End Time</label>
                  <div className="flex gap-2">
                    <Input
                      type="number" min="0" max="23" required
                      value={formData.endHour}
                      onChange={(e) => setFormData({ ...formData, endHour: parseInt(e.target.value) })}
                      className="bg-slate-950/50 border-slate-800 w-16"
                    />
                    <Input
                      type="number" min="0" max="59" required
                      value={formData.endMinute}
                      onChange={(e) => setFormData({ ...formData, endMinute: parseInt(e.target.value) })}
                      className="bg-slate-950/50 border-slate-800 w-16"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="ghost" onClick={() => {
                  setIsModalOpen(false);
                  setEditingClassId(null);
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold">
                  {isSubmitting ? 'Saving...' : (editingClassId ? 'Save Changes' : 'Save Class')}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {DAYS_OF_WEEK.map((day) => {
          const isToday = day === getTodayName();
          const isSelected = day === selectedDay;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                isSelected
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-300'
              )}
            >
              {day.slice(0, 3)}
              {isToday && <span className="ml-1.5 text-[10px]">(Today)</span>}
            </button>
          );
        })}
      </div>

      {/* Full schedule grid */}
      <div className="space-y-3">
        {classes.map((cls, index) => {
          const TypeIcon = typeIcons[cls.type] || BookOpen;

          return (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <Card className="hover:border-slate-700 transition-all group relative">
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button 
                    onClick={() => openEditModal(cls)}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteClass(cls.id)}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 pr-16">
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
              <p className="text-2xl font-bold text-slate-100">{classes.length}</p>
              <p className="text-xs text-slate-500">Total Classes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{totalHours(classes)}</p>
              <p className="text-xs text-slate-500">Hours</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">
                {classes.filter((c) => c.type === 'Lab').length}
              </p>
              <p className="text-xs text-slate-500">Labs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-400">
                {classes.filter((c) => c.attendancePercentage < 75).length}
              </p>
              <p className="text-xs text-slate-500">Low Attendance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
