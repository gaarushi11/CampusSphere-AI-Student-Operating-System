'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';

export default function AdminPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fetchData = useAppStore((s) => s.fetchData);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Academic',
    sender: 'Dean of Academics',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);
    setErrorMsg('');

    try {
      const supabase = createClient();
      
      const newNotice = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        sender: formData.sender,
        is_read: false,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase.from('notices').insert([newNotice]);

      if (error) throw new Error(error.message);

      setSuccess(true);
      setFormData({
        title: '',
        description: '',
        category: 'Academic',
        sender: 'Dean of Academics',
      });
      fetchData(); // Refresh local store so it appears immediately on dashboard
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to post notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-8 pb-16">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Radio className="w-6 h-6 text-rose-400" />
          Campus Radar Broadcast
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Admin portal. Push real-time notices to all student dashboards.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-lg">New Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-md text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {errorMsg}
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-md text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Notice broadcasted successfully! It is now live on the dashboard.
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Title</label>
              <Input
                required
                placeholder="e.g. End Semester Exam Schedule Released"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-950/50 border-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Message Content</label>
              <textarea
                required
                rows={4}
                placeholder="Detailed information..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500/50"
                >
                  <option value="Urgent">Urgent</option>
                  <option value="Academic">Academic</option>
                  <option value="Placement">Placement</option>
                  <option value="Hostel">Hostel</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Sender / Department</label>
                <Input
                  required
                  placeholder="e.g. Examination Cell"
                  value={formData.sender}
                  onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                  className="bg-slate-950/50 border-slate-800"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold"
              >
                {isSubmitting ? 'Broadcasting...' : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Broadcast to All Students
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
