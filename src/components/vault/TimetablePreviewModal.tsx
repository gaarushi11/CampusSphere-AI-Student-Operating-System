'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Loader2, CalendarPlus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import type { ExtractedClass } from '@/types';
import { cn } from '@/lib/utils';

interface TimetablePreviewModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function TimetablePreviewModal({ onClose, onSuccess }: TimetablePreviewModalProps) {
  const addBulkClasses = useAppStore((s) => s.addBulkClasses);
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'parsing' | 'review' | 'saving' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [extractedClasses, setExtractedClasses] = useState<ExtractedClass[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleDrop = useCallback(
    async (e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      let files: File[] = [];
      if ('dataTransfer' in e) {
        files = Array.from(e.dataTransfer.files);
      } else if (e.target.files) {
        files = Array.from(e.target.files);
      }

      if (files.length === 0) return;
      const file = files[0];

      setStatus('uploading');
      setErrorMsg('');

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not logged in');

        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `${user.id}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('vault_files')
          .upload(filePath, file);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        setStatus('parsing');

        // Add document record so it appears in Knowledge Vault too!
        const { data: docData } = await supabase.from('documents').insert([{
          user_id: user.id,
          name: file.name,
          type: file.name.split('.').pop()?.toUpperCase() || 'PDF',
          category: 'Timetable',
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          is_indexed: false,
          file_path: filePath
        }]).select().single();

        const res = await fetch('/api/documents/parse-timetable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: docData?.id || 'temp',
            filePath,
            userId: user.id,
          })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to parse timetable');
        }

        setExtractedClasses(data.classes || []);
        setWarnings(data.warnings || []);
        setStatus('review');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'An unknown error occurred');
      }
    },
    []
  );

  const handleImport = async () => {
    setStatus('saving');
    try {
      await addBulkClasses(extractedClasses);
      onSuccess();
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to save classes');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <CalendarPlus className="w-6 h-6 text-cyan-400" />
              AI Timetable Import
            </h3>
            <p className="text-sm text-slate-400 mt-1">Upload your college schedule PDF and let AI do the data entry.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {status === 'idle' || status === 'error' ? (
            <div className="space-y-4">
              {status === 'error' && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-lg text-sm">
                  {errorMsg}
                </div>
              )}
              <Card className="border-dashed border-2 border-slate-700 hover:border-cyan-500/40 transition-colors">
                <CardContent className="p-0">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    className={cn(
                      'flex flex-col items-center justify-center py-16 px-6 rounded-xl transition-all duration-300 cursor-pointer',
                      isDragOver ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-900/50 hover:bg-slate-800/30'
                    )}
                    onClick={() => document.getElementById('timetable-upload')?.click()}
                  >
                    <input id="timetable-upload" type="file" className="hidden" accept=".pdf,.docx" onChange={handleDrop} />
                    <Upload className={cn('w-10 h-10 mb-4 transition-colors', isDragOver ? 'text-cyan-400' : 'text-slate-400')} />
                    <p className="text-lg font-medium text-slate-200 mb-2">Drag & drop your timetable here</p>
                    <p className="text-sm text-slate-500">Supports PDF and DOCX</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : status === 'uploading' || status === 'parsing' || status === 'saving' ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
              <h3 className="text-lg font-medium text-slate-200">
                {status === 'uploading' && 'Uploading document...'}
                {status === 'parsing' && 'AI is reading your timetable...'}
                {status === 'saving' && 'Saving classes to database...'}
              </h3>
              {status === 'parsing' && (
                <p className="text-sm text-slate-500 text-center max-w-sm">
                  We use Claude 3 Haiku to intelligently extract every class, lab, and tutorial from complex grid layouts.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-amber-400 mb-2">Extraction Warnings:</h4>
                  <ul className="list-disc list-inside text-sm text-amber-200/80 space-y-1">
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-200 text-lg">
                  Extracted Classes ({extractedClasses.length})
                </h4>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStatus('idle')}>Upload Different File</Button>
                  <Button onClick={handleImport} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Import to Schedule
                  </Button>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 bg-slate-950/50 uppercase">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Day</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {extractedClasses.map((cls, i) => (
                      <tr key={i} className="bg-slate-900/30 hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium text-slate-200">{cls.title}</td>
                        <td className="px-4 py-3 text-cyan-400">{cls.shortCode}</td>
                        <td className="px-4 py-3 text-slate-300">{cls.type}</td>
                        <td className="px-4 py-3 text-slate-300">{cls.dayOfWeek}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {cls.startHour}:{cls.startMinute.toString().padStart(2,'0')} - {cls.endHour}:{cls.endMinute.toString().padStart(2,'0')}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{cls.room}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {extractedClasses.length === 0 && (
                  <div className="p-8 text-center text-slate-500">No classes could be extracted.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
