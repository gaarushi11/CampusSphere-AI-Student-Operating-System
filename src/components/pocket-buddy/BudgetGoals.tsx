'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Target, IndianRupee, AlertTriangle, Check,
  UtensilsCrossed, Car, Gamepad2, GraduationCap,
  ShoppingBag, HeartPulse, MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { ExpenseCategory } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';

const categoryIcons: Record<ExpenseCategory, typeof IndianRupee> = {
  Food: UtensilsCrossed,
  Transport: Car,
  Entertainment: Gamepad2,
  Academic: GraduationCap,
  Shopping: ShoppingBag,
  Health: HeartPulse,
  Other: MoreHorizontal,
};

const categoryColors: Record<ExpenseCategory, { bar: string; text: string; bg: string }> = {
  Food:          { bar: 'bg-amber-500',   text: 'text-amber-400',   bg: 'bg-amber-500/15' },
  Transport:     { bar: 'bg-blue-500',    text: 'text-blue-400',    bg: 'bg-blue-500/15' },
  Entertainment: { bar: 'bg-pink-500',    text: 'text-pink-400',    bg: 'bg-pink-500/15' },
  Academic:      { bar: 'bg-cyan-500',    text: 'text-cyan-400',    bg: 'bg-cyan-500/15' },
  Shopping:      { bar: 'bg-violet-500',  text: 'text-violet-400',  bg: 'bg-violet-500/15' },
  Health:        { bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  Other:         { bar: 'bg-slate-500',   text: 'text-slate-400',   bg: 'bg-slate-500/15' },
};

export function BudgetGoals() {
  const expenses = useAppStore((s) => s.expenses);
  const budgetGoals = useAppStore((s) => s.budgetGoals);
  const setBudgetGoal = useAppStore((s) => s.setBudgetGoal);

  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editAmount, setEditAmount] = useState('');

  // Current month expenses by category
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthExpensesByCategory = (cat: ExpenseCategory) => {
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && e.category === cat;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const handleSaveGoal = async (cat: ExpenseCategory) => {
    const limit = parseFloat(editAmount);
    if (isNaN(limit) || limit < 0) return;
    await setBudgetGoal(cat, limit);
    setEditingCategory(null);
    setEditAmount('');
  };

  return (
    <div className="space-y-5">
      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5">
        <CardContent className="py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Monthly Budget Goals</p>
              <p className="text-xs text-slate-500">Set spending limits per category to stay on track</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {EXPENSE_CATEGORIES.map((cat, i) => {
          const goal = budgetGoals.find(b => b.category === cat);
          const spent = monthExpensesByCategory(cat);
          const limit = goal?.monthlyLimit || 0;
          const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const isOver = limit > 0 && spent > limit;
          const Icon = categoryIcons[cat];
          const colors = categoryColors[cat];

          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={cn(isOver && 'border-rose-500/30')}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
                        <Icon className={cn('w-4 h-4', colors.text)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{cat}</p>
                        <p className="text-[10px] text-slate-500">
                          ₹{spent.toLocaleString('en-IN')} spent
                          {limit > 0 && ` / ₹${limit.toLocaleString('en-IN')} limit`}
                        </p>
                      </div>
                    </div>

                    {editingCategory === cat ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          placeholder="5000"
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveGoal(cat)}
                          className="p-1 bg-emerald-500/20 rounded hover:bg-emerald-500/30"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setEditAmount(limit > 0 ? limit.toString() : '');
                        }}
                        className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors px-2 py-1 rounded hover:bg-slate-800"
                      >
                        {limit > 0 ? 'Edit' : 'Set Limit'}
                      </button>
                    )}
                  </div>

                  {limit > 0 && (
                    <>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                          className={cn(
                            'h-full rounded-full transition-colors',
                            isOver ? 'bg-rose-500' : percentage > 80 ? 'bg-amber-500' : colors.bar
                          )}
                        />
                      </div>
                      {isOver && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-[11px] text-rose-400 font-medium">
                            Over budget by ₹{(spent - limit).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
