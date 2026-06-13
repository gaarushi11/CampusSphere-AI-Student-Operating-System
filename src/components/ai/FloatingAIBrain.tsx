'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Send, Sparkles, BotMessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import type { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';

function renderFormattedText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold text: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });

    // List items
    if (line.startsWith('• ') || line.startsWith('- ')) {
      return (
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-cyan-400 flex-shrink-0">•</span>
          <span>{rendered}</span>
        </div>
      );
    }
    // Numbered lists
    if (/^\d+\.\s/.test(line)) {
      return (
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-cyan-400 flex-shrink-0">{line.match(/^\d+/)?.[0]}.</span>
          <span>{rendered.map((r, ri) => {
            if (ri === 0 && typeof parts[0] === 'string') {
              return <span key={ri}>{parts[0].replace(/^\d+\.\s/, '')}</span>;
            }
            return r;
          })}</span>
        </div>
      );
    }
    // Table rows (simple detection)
    if (line.startsWith('|') && line.includes('|')) {
      if (line.match(/^\|[-\s|]+\|$/)) return null; // separator row
      const cells = line.split('|').filter(Boolean).map((c) => c.trim());
      return (
        <div key={i} className="flex gap-2 text-[11px] font-mono my-0.5">
          {cells.map((cell, ci) => (
            <span key={ci} className="flex-1 truncate">{cell}</span>
          ))}
        </div>
      );
    }
    // Emoji/icon lines
    if (line.startsWith('📄') || line.startsWith('💡') || line.startsWith('📌') || line.startsWith('⚠️') || line.startsWith('📝') || line.startsWith('📅') || line.startsWith('📍') || line.startsWith('⏰') || line.startsWith('↳')) {
      return <div key={i} className="my-1 text-slate-300 text-[12px]">{rendered}</div>;
    }
    // Empty line
    if (line.trim() === '') {
      return <div key={i} className="h-2" />;
    }
    return <div key={i} className="my-0.5">{rendered}</div>;
  });
}

const suggestedQueries = [
  'Summarize today\'s notices',
  'How\'s my attendance?',
  'What\'s my schedule today?',
  'Tell me about Amazon drive',
];

export function FloatingAIBrain() {
  const isChatOpen = useAppStore((s) => s.isChatOpen);
  const setIsChatOpen = useAppStore((s) => s.setIsChatOpen);
  const messages = useAppStore((s) => s.messages);
  const addMessage = useAppStore((s) => s.addMessage);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isChatOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    addMessage(userMsg);
    setInputValue('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: data.content || 'I apologize, I could not process that request.',
        timestamp: new Date(),
      };
      setIsTyping(false);
      addMessage(aiMsg);
    } catch {
      setIsTyping(false);
      addMessage({
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
            aria-label="Open CampusFlow AI Chat"
          >
            <Brain className="w-6 h-6 text-white" />
            {/* Ping ring */}
            <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[520px] flex flex-col glass rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">CampusFlow AI</h3>
                  <p className="text-[10px] text-slate-500">Powered by Amazon Bedrock</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-slate-400 hover:text-slate-200"
                onClick={() => setIsChatOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && !isTyping && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center mb-3">
                    <BotMessageSquare className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">Hi Rahul! 👋</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    I&apos;m your AI campus assistant. Ask me about classes, assignments, attendance, placements, or anything campus-related.
                  </p>
                  <div className="space-y-2 w-full">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Try asking</p>
                    {suggestedQueries.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all duration-200"
                      >
                        &ldquo;{q}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex gap-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <Brain className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] px-3.5 py-2.5 text-[12px] leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-cyan-500/20 text-slate-100 rounded-2xl rounded-br-md border border-cyan-500/20'
                        : 'bg-slate-800/80 text-slate-300 rounded-2xl rounded-bl-md border border-slate-700/50'
                    )}
                  >
                    {msg.role === 'assistant'
                      ? renderFormattedText(msg.content)
                      : msg.content}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-slate-800/80 px-4 py-3 rounded-2xl rounded-bl-md border border-slate-700/50 flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot" />
                    <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot" />
                    <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-slate-700/50 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask CampusFlow AI..."
                  className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  disabled={isTyping}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 disabled:opacity-50"
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                >
                  <Send className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
