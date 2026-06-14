'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, FileText, FileSpreadsheet, FileImage,
  Check, Loader2, Search, Brain, Sparkles, Trash2, AlertTriangle, XCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import type { Document, DocumentCategory } from '@/types';
import { cn, getRelativeTime } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';

const fileTypeConfig: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  PDF: { icon: FileText, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  PPTX: { icon: FileSpreadsheet, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  DOCX: { icon: FileImage, color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

function detectCategory(filename: string): DocumentCategory {
  const lower = filename.toLowerCase();
  if (lower.includes('timetable') || lower.includes('schedule') || lower.includes('time-table')) return 'Timetable';
  if (lower.includes('syllabus') || lower.includes('curriculum')) return 'Syllabus';
  if (lower.includes('notes') || lower.includes('lecture') || lower.includes('tutorial')) return 'Notes';
  return 'Other';
}

export function KnowledgeVault() {
  const documents = useAppStore((s) => s.documents);
  const addDocument = useAppStore((s) => s.addDocument);
  const removeDocument = useAppStore((s) => s.removeDocument);
  const markDocumentIndexed = useAppStore((s) => s.markDocumentIndexed);
  const markDocumentError = useAppStore((s) => s.markDocumentError);
  const fetchData = useAppStore((s) => s.fetchData);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredDocs = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      setUploading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUploading(false);
        return;
      }

      for (const file of files) {
        const ext = file.name.split('.').pop()?.toUpperCase() as 'PDF' | 'PPTX' | 'DOCX';
        const fileType = ext === 'PDF' || ext === 'PPTX' || ext === 'DOCX' ? ext : 'PDF';
        const fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        const category = detectCategory(file.name);
        
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `${user.id}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('vault_files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload failed:', uploadError);
          alert(`Upload failed: ${uploadError.message}. Did you create the 'vault_files' storage bucket in Supabase?`);
          continue;
        }

        const documentId = await addDocument({
          name: file.name,
          type: fileType,
          category,
          size: fileSizeStr,
          subject: 'Uploaded Document',
          isIndexed: false,
          pageCount: 1,
        });

        if (!documentId) continue;

        // Trigger backend indexing
        fetch('/api/documents/index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            filePath,
            userId: user.id,
          })
        }).then(async res => {
          const data = await res.json();
          if (!res.ok) {
            console.error('Indexing failed', data);
            markDocumentError(documentId, data.error || 'Unknown indexing error');
          } else {
            markDocumentIndexed(documentId);
          }
        }).catch(err => {
          console.error('Network error during indexing:', err);
          markDocumentError(documentId, 'Network error — check if the server is running.');
        });
      }

      setUploading(false);
    },
    [addDocument, markDocumentIndexed, markDocumentError]
  );

  const handleRetryIndexing = async (doc: Document) => {
    if (!doc.filePath) {
      alert('Cannot retry: File path is missing.');
      return;
    }
    markDocumentError(doc.id, ''); // Clears error to show spinner

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    fetch('/api/documents/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: doc.id,
        filePath: doc.filePath,
        userId: user.id,
      })
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) {
        markDocumentError(doc.id, data.error || 'Unknown indexing error');
      } else {
        markDocumentIndexed(doc.id);
      }
    }).catch(err => {
      console.error(err);
      markDocumentError(doc.id, 'Network error — check if the server is running.');
    });
  };

  const renderDocStatus = (doc: Document) => {
    if (doc.indexError) {
      return (
        <div className="flex items-center gap-2">
          <Badge className="text-[9px] py-0 px-1.5 bg-rose-500/15 text-rose-400 border-rose-500/30 gap-0.5 cursor-help max-w-[160px] truncate"
            title={doc.indexError}
          >
            <XCircle className="w-2.5 h-2.5 flex-shrink-0" />
            Failed
          </Badge>
          <button 
            onClick={(e) => { e.stopPropagation(); handleRetryIndexing(doc); }}
            className="text-[10px] text-slate-400 hover:text-cyan-400 underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      );
    }
    if (doc.isIndexed) {
      return (
        <Badge className="text-[9px] py-0 px-1.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-0.5">
          <Check className="w-2.5 h-2.5" />
          Indexed
        </Badge>
      );
    }
    return (
      <Badge className="text-[9px] py-0 px-1.5 bg-amber-500/15 text-amber-400 border-amber-500/30 gap-0.5">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        Indexing
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            Knowledge Vault
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Upload syllabi, notes, and slides — CampusFlow AI indexes them for instant RAG-powered answers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-500/5 gap-1">
            <Sparkles className="w-3 h-3" />
            {documents.filter((d) => d.isIndexed).length} / {documents.length} Indexed
          </Badge>
        </div>
      </div>

      {/* Upload Zone */}
      <Card className="border-dashed border-2 border-slate-700 hover:border-cyan-500/40 transition-colors">
        <CardContent className="p-0">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center justify-center py-12 px-6 rounded-xl transition-all duration-300 cursor-pointer',
              isDragOver
                ? 'bg-cyan-500/10 border-cyan-500/30'
                : 'bg-slate-900/50 hover:bg-slate-800/30'
            )}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.pptx,.docx"
              onChange={handleDrop}
            />
            {uploading ? (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                <p className="text-sm text-cyan-400 font-medium">Uploading & indexing with Bedrock...</p>
                <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: 'easeInOut' }}
                  />
                </div>
              </motion.div>
            ) : (
              <>
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-colors',
                  isDragOver ? 'bg-cyan-500/20' : 'bg-slate-800'
                )}>
                  <Upload className={cn('w-6 h-6', isDragOver ? 'text-cyan-400' : 'text-slate-400')} />
                </div>
                <p className="text-sm font-medium text-slate-200 mb-1">
                  Drag & drop files here or click to upload
                </p>
                <p className="text-xs text-slate-500">
                  Supports PDF, PPTX, DOCX — Max 50MB per file
                </p>
                <p className="text-[10px] text-cyan-500/60 mt-2">
                  ☁️ Files stored on AWS S3 → Indexed by Amazon Bedrock Knowledge Base
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search & Documents */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800"
            />
          </div>
          <Button variant="outline" size="sm" className="border-slate-700">
            {filteredDocs.length} Documents
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredDocs.map((doc, index) => {
            const config = fileTypeConfig[doc.type] || fileTypeConfig.PDF;
            const DocIcon = config.icon;

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
              >
                <Card className="group hover:border-slate-700 transition-all hover:bg-slate-800/30 cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
                        <DocIcon className={cn('w-5 h-5', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
                          {doc.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {doc.category !== 'Other' ? doc.category : doc.subject}
                        </p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-[10px] text-slate-600">{doc.size}</span>
                          <span className="text-[10px] text-slate-600">{doc.pageCount} pages</span>
                          <span className="text-[10px] text-slate-600" suppressHydrationWarning>
                            {getRelativeTime(doc.uploadedAt)}
                          </span>
                          {renderDocStatus(doc)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this document?')) {
                            removeDocument(doc.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
