import { create } from 'zustand';
import type { Task, Notice, ChatMessage, Document } from '@/types';
import { mockTasks, mockNotices, mockDocuments } from '@/lib/mockData';

interface AppState {
  tasks: Task[];
  notices: Notice[];
  messages: ChatMessage[];
  documents: Document[];
  isChatOpen: boolean;
  activeNavItem: string;

  toggleTask: (id: string) => void;
  markNoticeRead: (id: string) => void;
  addMessage: (msg: ChatMessage) => void;
  addDocument: (doc: Document) => void;
  setIsChatOpen: (open: boolean) => void;
  setActiveNavItem: (item: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  tasks: mockTasks,
  notices: mockNotices,
  messages: [],
  documents: mockDocuments,
  isChatOpen: false,
  activeNavItem: 'dashboard',

  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    })),

  markNoticeRead: (id) =>
    set((state) => ({
      notices: state.notices.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  addDocument: (doc) =>
    set((state) => ({
      documents: [doc, ...state.documents],
    })),

  setIsChatOpen: (open) => set({ isChatOpen: open }),

  setActiveNavItem: (item) => set({ activeNavItem: item }),
}));
