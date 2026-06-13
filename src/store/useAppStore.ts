import { create } from 'zustand';
import type { Task, Notice, ChatMessage, Document, ClassSession, Profile } from '@/types';
import { mockDocuments } from '@/lib/mockData';
import { createClient } from '@/utils/supabase/client';

interface AppState {
  profile: Profile | null;
  classes: ClassSession[];
  tasks: Task[];
  notices: Notice[];
  messages: ChatMessage[];
  documents: Document[];
  isChatOpen: boolean;
  activeNavItem: string;
  isLoading: boolean;

  fetchData: () => Promise<void>;
  toggleTask: (id: string, currentStatus: boolean) => Promise<void>;
  markNoticeRead: (id: string) => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<void>;
  addClass: (cls: Partial<ClassSession>) => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
  addDocument: (doc: Partial<Document>) => Promise<string | undefined>;
  markDocumentIndexed: (id: string) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setIsChatOpen: (open: boolean) => void;
  setActiveNavItem: (item: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  classes: [],
  tasks: [],
  notices: [],
  messages: [],
  documents: [],
  isChatOpen: false,
  activeNavItem: 'dashboard',
  isLoading: true,

  fetchData: async () => {
    set({ isLoading: true });
    const supabase = createClient();
    
    // Fetch currently logged in user to get their ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ isLoading: false });
      return;
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Fetch classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .order('start_hour', { ascending: true });

    // Fetch tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });

    // Fetch notices
    const { data: noticesData } = await supabase
      .from('notices')
      .select('*')
      .order('timestamp', { ascending: false });

    // Fetch documents
    const { data: documentsData } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false });

    // Map database snake_case to frontend camelCase
    const mappedClasses: ClassSession[] = (classesData || []).map((c) => ({
      id: c.id,
      title: c.title,
      shortCode: c.short_code,
      type: c.type,
      room: c.room,
      instructor: c.instructor,
      time: `${c.start_hour}:${c.start_minute.toString().padStart(2, '0')} - ${c.end_hour}:${c.end_minute.toString().padStart(2, '0')}`,
      startHour: c.start_hour,
      startMinute: c.start_minute,
      endHour: c.end_hour,
      endMinute: c.end_minute,
      attendancePercentage: c.attendance_percentage,
      color: 'bg-cyan-500', // Default color
    }));

    const mappedTasks: Task[] = (tasksData || []).map((t) => {
      const dueDate = new Date(t.due_date);
      return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        subject: t.course,
        priority: t.priority,
        source: t.source as any,
        completed: t.is_completed,
        dueDate: dueDate.toISOString(),
        dueTimeLabel: dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });

    const mappedNotices: Notice[] = (noticesData || []).map((n) => ({
      id: n.id,
      title: n.title,
      excerpt: n.description,
      category: n.category as any,
      postedBy: n.sender,
      isRead: n.is_read,
      datePosted: new Date(n.timestamp).toISOString(),
    }));

    const mappedDocuments: Document[] = (documentsData || []).map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type as any,
      size: d.size,
      uploadedAt: new Date(d.uploaded_at).toISOString(),
      subject: d.subject || '',
      isIndexed: d.is_indexed,
      pageCount: d.page_count || 1,
    }));

    set({
      profile: profileData ? {
        id: profileData.id,
        name: profileData.name || 'Student',
        email: profileData.email || user.email || '',
        rollNumber: profileData.roll_number || 'TBD',
        major: profileData.major || 'Unknown',
        semester: profileData.semester || 1,
        cgpa: profileData.cgpa || 0.0,
        avatarUrl: profileData.avatar_url,
        hostelRoom: profileData.hostel_room || 'TBD',
      } : {
        id: user.id,
        name: 'New Student',
        email: user.email || '',
        rollNumber: 'TBD',
        major: 'B.Tech',
        semester: 1,
        cgpa: 0.0,
        hostelRoom: 'TBD',
      },
      classes: mappedClasses,
      tasks: mappedTasks,
      notices: mappedNotices,
      documents: mappedDocuments,
      isLoading: false,
    });
  },

  toggleTask: async (id, currentStatus) => {
    // Optimistic UI update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completed: !currentStatus } : t
      ),
    }));

    const supabase = createClient();
    await supabase
      .from('tasks')
      .update({ is_completed: !currentStatus })
      .eq('id', id);
  },

  markNoticeRead: async (id) => {
    // Optimistic UI update
    set((state) => ({
      notices: state.notices.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));

    const supabase = createClient();
    await supabase
      .from('notices')
      .update({ is_read: true })
      .eq('id', id);
  },

  addTask: async (task) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbTask = {
      user_id: user.id,
      title: task.title,
      description: task.description,
      course: task.subject,
      priority: task.priority || 'Medium',
      due_date: task.dueDate,
      is_completed: false,
      source: 'Manual',
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([dbTask])
      .select()
      .single();

    if (error || !data) {
      console.error('Error adding task:', error);
      return;
    }

    const newTask: Task = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      subject: data.course,
      priority: data.priority,
      source: 'Manual',
      completed: data.is_completed,
      dueDate: new Date(data.due_date).toISOString(),
      dueTimeLabel: new Date(data.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set((state) => ({
      tasks: [...state.tasks, newTask].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    }));
  },

  addClass: async (cls) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbClass = {
      user_id: user.id,
      title: cls.title,
      short_code: cls.shortCode,
      type: cls.type || 'Lecture',
      room: cls.room,
      instructor: cls.instructor,
      day_of_week: 'Monday', // Simplification for demo
      start_hour: cls.startHour,
      start_minute: cls.startMinute,
      end_hour: cls.endHour,
      end_minute: cls.endMinute,
      attendance_percentage: 100, // Default for new class
    };

    const { data, error } = await supabase
      .from('classes')
      .insert([dbClass])
      .select()
      .single();

    if (error || !data) {
      console.error('Error adding class:', error);
      return;
    }

    const newClass: ClassSession = {
      id: data.id,
      title: data.title,
      shortCode: data.short_code,
      type: data.type,
      room: data.room,
      instructor: data.instructor,
      time: `${data.start_hour}:${data.start_minute.toString().padStart(2, '0')} - ${data.end_hour}:${data.end_minute.toString().padStart(2, '0')}`,
      startHour: data.start_hour,
      startMinute: data.start_minute,
      endHour: data.end_hour,
      endMinute: data.end_minute,
      attendancePercentage: data.attendance_percentage,
      color: 'bg-cyan-500',
    };

    set((state) => ({
      classes: [...state.classes, newClass].sort((a, b) => a.startHour - b.startHour),
    }));
  },

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  addDocument: async (doc) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbDoc = {
      user_id: user.id,
      name: doc.name,
      type: doc.type,
      size: doc.size,
      subject: doc.subject,
      is_indexed: doc.isIndexed || false,
      page_count: doc.pageCount || 1,
    };

    const { data, error } = await supabase
      .from('documents')
      .insert([dbDoc])
      .select()
      .single();

    if (error || !data) {
      console.error('Error adding document:', error);
      return;
    }

    const newDoc: Document = {
      id: data.id,
      name: data.name,
      type: data.type as any,
      size: data.size,
      uploadedAt: new Date(data.uploaded_at).toISOString(),
      subject: data.subject || '',
      isIndexed: data.is_indexed,
      pageCount: data.page_count,
    };

    set((state) => ({
      documents: [newDoc, ...state.documents],
    }));

    return data.id;
  },

  markDocumentIndexed: (id) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, isIndexed: true } : d
      ),
    })),

  updateProfile: async (updates) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic UI update
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    }));

    // Update DB
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.rollNumber !== undefined) dbUpdates.roll_number = updates.rollNumber;
    if (updates.major !== undefined) dbUpdates.major = updates.major;
    if (updates.semester !== undefined) dbUpdates.semester = updates.semester;
    if (updates.cgpa !== undefined) dbUpdates.cgpa = updates.cgpa;
    if (updates.hostelRoom !== undefined) dbUpdates.hostel_room = updates.hostelRoom;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
    }
  },

  setIsChatOpen: (open) => set({ isChatOpen: open }),

  setActiveNavItem: (item) => set({ activeNavItem: item }),
}));
