'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, FileText, FileSpreadsheet, FileImage,
  Check, Loader2, Search, Brain, Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import type { Document } from '@/types';
import { cn, getRelativeTime } from '@/lib/utils';

const fileTypeConfig: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  PDF: { icon: FileText, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  PPTX: { icon: FileSpreadsheet, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  DOCX: { icon: FileImage, color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

export function KnowledgeVault() {
  const documents = useAppStore((s) => s.documents);
  const addDocument = useAppStore((s) => s.addDocument);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      setUploading(true);
      // Simulate upload delay
      setTimeout(() => {
        files.forEach((file) => {
          const ext = file.name.split('.').pop()?.toUpperCase() as 'PDF' | 'PPTX' | 'DOCX';
          const newDoc: Document = {
            id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            type: ext === 'PDF' || ext === 'PPTX' || ext === 'DOCX' ? ext : 'PDF',
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            uploadedAt: new Date().toISOString(),
            subject: 'User Upload',
            isIndexed: false,
            pageCount: Math.floor(Math.random() * 50) + 5,
          };
          addDocument(newDoc);
        });
        setUploading(false);
      }, 2000);
    },
    [addDocument]
  );

  const simulateUpload = () => {
    setUploading(true);
    setTimeout(() => {
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        name: 'AWS_Solutions_Architect_Notes.pdf',
        type: 'PDF',
        size: '4.5 MB',
        uploadedAt: new Date().toISOString(),
        subject: 'CS401 — Cloud Computing',
        isIndexed: false,
        pageCount: 35,
      };
      addDocument(newDoc);
      setUploading(false);
    }, 2000);
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
            onClick={simulateUpload}
          >
            {uploading ? (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                <p className="text-sm text-cyan-400 font-medium">Uploading to S3 & indexing with Bedrock...</p>
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
                        <p className="text-[11px] text-slate-500 mt-0.5">{doc.subject}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-[10px] text-slate-600">{doc.size}</span>
                          <span className="text-[10px] text-slate-600">{doc.pageCount} pages</span>
                          <span className="text-[10px] text-slate-600" suppressHydrationWarning>
                            {getRelativeTime(doc.uploadedAt)}
                          </span>
                          {doc.isIndexed ? (
                            <Badge className="text-[9px] py-0 px-1.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              Indexed
                            </Badge>
                          ) : (
                            <Badge className="text-[9px] py-0 px-1.5 bg-amber-500/15 text-amber-400 border-amber-500/30 gap-0.5">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              Indexing
                            </Badge>
                          )}
                        </div>
                      </div>
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
