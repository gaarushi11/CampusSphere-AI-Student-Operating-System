'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, IndianRupee, UtensilsCrossed, Car, Gamepad2,
  GraduationCap, ShoppingBag, HeartPulse, MoreHorizontal, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { ExpenseCategory } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';

const categoryConfig: Record<ExpenseCategory, { icon: typeof IndianRupee; color: string; bg: string }> = {
  Food:          { icon: UtensilsCrossed, color: 'text-amber-400',   bg: 'bg-amber-500/15' },
  Transport:     { icon: Car,             color: 'text-blue-400',    bg: 'bg-blue-500/15' },
  Entertainment: { icon: Gamepad2,        color: 'text-pink-400',    bg: 'bg-pink-500/15' },
  Academic:      { icon: GraduationCap,   color: 'text-cyan-400',    bg: 'bg-cyan-500/15' },
  Shopping:      { icon: ShoppingBag,     color: 'text-violet-400',  bg: 'bg-violet-500/15' },
  Health:        { icon: HeartPulse,       color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  Other:         { icon: MoreHorizontal,  color: 'text-slate-400',   bg: 'bg-slate-500/15' },
};

export function ExpenseTracker() {
  const expenses = useAppStore((s) => s.expenses);
  const addExpense = useAppStore((s) => s.addExpense);
  const deleteExpense = useAppStore((s) => s.deleteExpense);

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    await addExpense({
      amount: parseFloat(amount),
      category,
      description,
      date,
    });
    setAmount('');
    setDescription('');
    setShowForm(false);
  };

  // Current month expenses
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalThisMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown
  const categoryBreakdown = EXPENSE_CATEGORIES.map(cat => {
    const total = monthExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
    return { category: cat, total };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-5">
      {/* Monthly Summary */}
      <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-violet-500/5">
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">This Month&apos;s Spending</p>
              <p className="text-3xl font-bold text-slate-100 mt-1 flex items-center gap-1">
                <IndianRupee className="w-6 h-6" />
                {totalThisMonth.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {monthExpenses.length} transaction{monthExpenses.length !== 1 ? 's' : ''} in {now.toLocaleString('default', { month: 'long' })}
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center hover:bg-cyan-500/30 transition-colors"
            >
              <Plus className={cn("w-5 h-5 text-cyan-400 transition-transform", showForm && "rotate-45")} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Amount (₹)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="250"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {EXPENSE_CATEGORIES.map(cat => {
                      const config = categoryConfig[cat];
                      const Icon = config.icon;
                      return (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all',
                            category === cat
                              ? `${config.bg} ${config.color} border-current`
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
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
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mess dinner, Uber to station..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none transition-colors"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full py-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Add Expense
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryBreakdown.map(({ category: cat, total }) => {
              const config = categoryConfig[cat];
              const Icon = config.icon;
              const percent = totalThisMonth > 0 ? (total / totalThisMonth) * 100 : 0;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', config.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', config.color)} />
                      </div>
                      <span className="text-sm text-slate-300">{cat}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-200">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className={cn('h-full rounded-full', config.bg.replace('/15', '/60'))}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No expenses yet. Add your first one above!</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {expenses.slice(0, 20).map((expense, i) => {
                const config = categoryConfig[expense.category];
                const Icon = config.icon;
                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
                        <Icon className={cn('w-4 h-4', config.color)} />
                      </div>
                      <div>
                        <p className="text-sm text-slate-200">{expense.description || expense.category}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          <span className="text-[10px] text-slate-500">{new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">₹{expense.amount.toLocaleString('en-IN')}</span>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 rounded transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
