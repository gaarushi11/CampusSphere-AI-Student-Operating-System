'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, MessageCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';

export function MagicPaste() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const addTask = useAppStore(s => s.addTask);
  const addCampusEvent = useAppStore(s => s.addCampusEvent);
  const markAttendance = useAppStore(s => s.markAttendance);
  const classes = useAppStore(s => s.classes);

  const handleParse = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const res = await fetch('/api/parse-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          contextDate: new Date().toISOString()
        })
      });

      if (!res.ok) throw new Error('Failed to parse text');
      const data = await res.json();

      // Apply changes to store
      if (data.tasks) {
        for (const t of data.tasks) {
          await addTask({
            title: t.title,
            description: t.description || 'Extracted from WhatsApp',
            subject: t.subject || 'General',
            dueDate: t.dueDate,
            priority: t.priority || 'Medium',
          });
        }
      }

      if (data.events) {
        for (const e of data.events) {
          await addCampusEvent({
            title: e.title,
            description: e.description,
            eventDate: e.eventDate,
            location: e.location || 'TBD',
            category: e.category || 'Other'
          });
        }
      }

      if (data.attendance) {
        for (const a of data.attendance) {
          // Find matching class ID
          const cls = classes.find(c => c.shortCode?.toLowerCase() === a.shortCode?.toLowerCase() || c.title.toLowerCase().includes(a.shortCode?.toLowerCase() || ''));
          if (cls && (a.status === 'Cancelled' || a.status === 'Present' || a.status === 'Absent')) {
            await markAttendance(cls.id, a.date, a.status);
          }
        }
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ error: 'Failed to extract information.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
      <div 
        className="px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border-b border-slate-800 flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">WhatsApp Chaos Parser</h3>
            <p className="text-[10px] text-slate-400">Paste messy group messages to auto-update schedule</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">AWS Bedrock</Badge>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste messy message here... e.g. 'Hey guys, CS101 is cancelled tmrw but assignment 3 is due Friday 5PM! Also tech club meeting at 6 in LHC.'"
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {result?.summary && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 py-1.5 px-3 rounded-md border border-emerald-500/20 inline-flex">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {result.summary}
                    </div>
                  )}
                  {result?.error && (
                    <div className="text-xs text-rose-400">{result.error}</div>
                  )}
                </div>
                <Button 
                  onClick={handleParse} 
                  disabled={isProcessing || !text.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Magic Parse
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Needed local badge for this file
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  );
}
