'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { IndianRupee, HeartPulse, AlertTriangle, Wallet } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function PocketBuddyWidget() {
  const expenses = useAppStore((s) => s.expenses);
  const budgetGoals = useAppStore((s) => s.budgetGoals);
  const wellnessLogs = useAppStore((s) => s.wellnessLogs);

  // Financial Stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalBudget = budgetGoals.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const isOverBudget = totalBudget > 0 && totalSpent > totalBudget;

  // Wellness Stats
  const recentLogs = wellnessLogs.slice(0, 7);
  const stressedDays = recentLogs.filter(w => w.stressLevel >= 4 && w.sleepHours <= 5).length;
  const isBurnoutRisk = stressedDays >= 3;

  return (
    <Card className="h-full relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-bl-full -z-10 group-hover:bg-violet-500/10 transition-colors" />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Wallet className="w-3 h-3 text-violet-400" />
            </div>
            PocketBuddy
          </CardTitle>
          <Link href="/pocket-buddy" className="text-[10px] text-cyan-400 hover:underline">
            View Details
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Financial Overview */}
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">This Month</p>
              <p className={cn("text-lg font-bold flex items-center gap-0.5", isOverBudget ? "text-rose-400" : "text-slate-100")}>
                <IndianRupee className="w-4 h-4" />
                {totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            {totalBudget > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Budget</p>
                <p className="text-sm font-medium text-slate-300">
                  ₹{totalBudget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
          </div>
          
          {totalBudget > 0 && (
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
                transition={{ duration: 0.5 }}
                className={cn("h-full rounded-full", isOverBudget ? "bg-rose-500" : "bg-violet-500")}
              />
            </div>
          )}
        </div>

        {/* Wellness Overview */}
        <div className={cn(
          "p-3 rounded-xl border",
          isBurnoutRisk 
            ? "bg-rose-500/10 border-rose-500/20" 
            : "bg-emerald-500/5 border-emerald-500/10"
        )}>
          <div className="flex items-start gap-2.5">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
              isBurnoutRisk ? "bg-rose-500/20" : "bg-emerald-500/20"
            )}>
              {isBurnoutRisk ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
            <div>
              <p className={cn("text-xs font-semibold", isBurnoutRisk ? "text-rose-400" : "text-emerald-400")}>
                {isBurnoutRisk ? "Burnout Risk Detected" : "Wellness Check Good"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                {isBurnoutRisk 
                  ? `${stressedDays} days of high stress + low sleep recently. Take a break.`
                  : "You've been maintaining healthy stress and sleep levels recently."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
