'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Moon, Zap, AlertTriangle, Smile, Meh, Frown,
  SmilePlus, Angry, TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const moodEmojis = ['😰', '😔', '😐', '🙂', '😄'];
const moodLabels = ['Terrible', 'Bad', 'Okay', 'Good', 'Great'];
const stressLabels = ['Relaxed', 'Mild', 'Moderate', 'High', 'Overwhelmed'];
const stressColors = ['text-emerald-400', 'text-emerald-400', 'text-amber-400', 'text-rose-400', 'text-rose-400'];

export function WellnessCheck() {
  const wellnessLogs = useAppStore((s) => s.wellnessLogs);
  const logWellness = useAppStore((s) => s.logWellness);

  const today = new Date().toISOString().split('T')[0];
  const todayLog = wellnessLogs.find(w => w.date === today);

  const [mood, setMood] = useState(todayLog?.mood || 3);
  const [sleepHours, setSleepHours] = useState(todayLog?.sleepHours?.toString() || '7');
  const [stressLevel, setStressLevel] = useState(todayLog?.stressLevel || 2);
  const [notes, setNotes] = useState(todayLog?.notes || '');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await logWellness({
      date: today,
      mood,
      sleepHours: parseFloat(sleepHours) || 7,
      stressLevel,
      notes,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Burnout Detection: 3+ consecutive days of high stress (≥4) + low sleep (≤5)
  const recentLogs = wellnessLogs.slice(0, 7);
  const stressedDays = recentLogs.filter(w => w.stressLevel >= 4 && w.sleepHours <= 5).length;
  const isBurnoutRisk = stressedDays >= 3;

  // Weekly trend data (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const weeklyData = last7Days.map(date => {
    const log = wellnessLogs.find(w => w.date === date);
    return {
      date,
      dayLabel: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
      mood: log?.mood || 0,
      sleep: log?.sleepHours || 0,
      stress: log?.stressLevel || 0,
      hasData: !!log,
    };
  });

  return (
    <div className="space-y-5">
      {/* Burnout Warning */}
      {isBurnoutRisk && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-amber-500/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-rose-400">Burnout Risk Detected</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    You&apos;ve logged {stressedDays} days with high stress and low sleep this week.
                    Consider taking a break, talking to a friend, or visiting the campus counseling center.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Daily Check-in */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              Daily Wellness Check
            </CardTitle>
            {todayLog && (
              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                Logged Today
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mood */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">How are you feeling?</label>
            <div className="flex justify-between">
              {moodEmojis.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setMood(i + 1)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl transition-all',
                    mood === i + 1
                      ? 'bg-violet-500/20 border border-violet-500/30 scale-110'
                      : 'hover:bg-slate-800 border border-transparent'
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-[9px] text-slate-500">{moodLabels[i]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sleep */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Moon className="w-3 h-3" />
              Sleep Hours
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="flex-1 accent-cyan-500"
              />
              <span className={cn(
                'text-sm font-bold w-12 text-center',
                parseFloat(sleepHours) < 5 ? 'text-rose-400' :
                parseFloat(sleepHours) < 7 ? 'text-amber-400' : 'text-emerald-400'
              )}>
                {sleepHours}h
              </span>
            </div>
          </div>

          {/* Stress */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Stress Level
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  onClick={() => setStressLevel(level)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-medium border transition-all',
                    stressLevel === level
                      ? level >= 4
                        ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                        : level >= 3
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                          : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                  )}
                >
                  {stressLabels[level - 1]}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Had a tough quiz today, but gym session helped..."
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:border-violet-500/50 focus:outline-none transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            className={cn(
              'w-full py-2.5 rounded-lg border text-sm font-medium transition-all',
              saved
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-violet-500/20 text-violet-400 border-violet-500/30 hover:bg-violet-500/30'
            )}
          >
            {saved ? '✓ Saved!' : todayLog ? 'Update Today\'s Log' : 'Log Today\'s Wellness'}
          </button>
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Weekly Mood & Sleep Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end gap-2 h-32">
            {weeklyData.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                {day.hasData ? (
                  <>
                    <span className="text-lg">{moodEmojis[day.mood - 1]}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(day.sleep / 12) * 100}%` }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className={cn(
                        'w-full rounded-t-md min-h-[4px]',
                        day.sleep < 5 ? 'bg-rose-500/60' :
                        day.sleep < 7 ? 'bg-amber-500/60' : 'bg-cyan-500/60'
                      )}
                    />
                    <span className="text-[9px] text-slate-500">{day.sleep}h</span>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[10px] text-slate-600">—</span>
                  </div>
                )}
                <span className={cn(
                  'text-[10px] font-medium',
                  day.date === today ? 'text-cyan-400' : 'text-slate-600'
                )}>
                  {day.dayLabel}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
