'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Receipt, Target, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExpenseTracker } from '@/components/pocket-buddy/ExpenseTracker';
import { BudgetGoals } from '@/components/pocket-buddy/BudgetGoals';
import { WellnessCheck } from '@/components/pocket-buddy/WellnessCheck';

const tabs = [
  { id: 'expenses', label: 'Expenses', icon: Receipt, color: 'text-cyan-400' },
  { id: 'budget', label: 'Budget Goals', icon: Target, color: 'text-violet-400' },
  { id: 'wellness', label: 'Wellness', icon: HeartPulse, color: 'text-emerald-400' },
] as const;

type TabId = typeof tabs[number]['id'];

export default function PocketBuddyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('expenses');

  return (
    <div className="space-y-6 max-w-4xl pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">PocketBuddy</h2>
            <p className="text-sm text-slate-500">
              AI Financial & Wellness Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
        {tabs.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeTab === id
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <Icon className={cn('w-4 h-4', activeTab === id && color)} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'expenses' && <ExpenseTracker />}
        {activeTab === 'budget' && <BudgetGoals />}
        {activeTab === 'wellness' && <WellnessCheck />}
      </motion.div>
    </div>
  );
}
