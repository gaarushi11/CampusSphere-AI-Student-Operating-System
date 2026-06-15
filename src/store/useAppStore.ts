import { create } from 'zustand';
import type {
  Task, Notice, ChatMessage, Document, ClassSession, Profile,
  ExtractedClass, DayOfWeek, AttendanceLog,
  Expense, ExpenseCategory, BudgetGoal, WellnessLog,
  CampusEvent, EventCategory, UserSettings, DEFAULT_SETTINGS,
} from '@/types';
import { createClient } from '@/utils/supabase/client';
import { colorForClass } from '@/lib/utils';

interface AppState {
  // ── Existing ──
  profile: Profile | null;
  classes: ClassSession[];
  attendanceLogs: AttendanceLog[];
  tasks: Task[];
  notices: Notice[];
  messages: ChatMessage[];
  documents: Document[];
  isChatOpen: boolean;
  activeNavItem: string;
  isLoading: boolean;

  // ── PocketBuddy ──
  expenses: Expense[];
  budgetGoals: BudgetGoal[];
  wellnessLogs: WellnessLog[];

  // ── Campus Events ──
  campusEvents: CampusEvent[];

  // ── Existing Actions ──
  fetchData: () => Promise<void>;
  toggleTask: (id: string, currentStatus: boolean) => Promise<void>;
  markNoticeRead: (id: string) => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<void>;
  addClass: (cls: Partial<ClassSession>) => Promise<void>;
  updateClass: (id: string, updates: Partial<ClassSession>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  addBulkClasses: (classes: ExtractedClass[]) => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
  addDocument: (doc: Partial<Document>) => Promise<string | undefined>;
  removeDocument: (id: string) => Promise<void>;
  markDocumentIndexed: (id: string) => void;
  markDocumentError: (id: string, error: string) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setIsChatOpen: (open: boolean) => void;
  setActiveNavItem: (item: string) => void;
  markAttendance: (classId: string, date: string, status: 'Present' | 'Absent' | 'Cancelled') => Promise<void>;

  // ── PocketBuddy Actions ──
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  setBudgetGoal: (category: ExpenseCategory, monthlyLimit: number) => Promise<void>;
  logWellness: (log: Omit<WellnessLog, 'id'>) => Promise<void>;

  // ── Campus Events Actions ──
  addCampusEvent: (event: Omit<CampusEvent, 'id' | 'createdBy' | 'createdByName'>) => Promise<void>;
  deleteCampusEvent: (id: string) => Promise<void>;

  // ── Settings Actions ──
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  classes: [],
  attendanceLogs: [],
  tasks: [],
  notices: [],
  messages: [],
  documents: [],
  isChatOpen: false,
  activeNavItem: 'dashboard',
  isLoading: true,

  // ── PocketBuddy State ──
  expenses: [],
  budgetGoals: [],
  wellnessLogs: [],

  // ── Campus Events State ──
  campusEvents: [],

  // ════════════════════════════════════════════════════════════
  // FETCH ALL DATA — Single entry point for hydration
  // ════════════════════════════════════════════════════════════
  fetchData: async () => {
    set({ isLoading: true });
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ isLoading: false });
      return;
    }

    // Parallel fetch for maximum speed
    const [
      profileRes, classesRes, tasksRes, noticesRes,
      documentsRes, attendanceRes, expensesRes,
      budgetRes, wellnessRes, eventsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('classes').select('*').eq('user_id', user.id).order('start_hour', { ascending: true }),
      supabase.from('tasks').select('*').eq('user_id', user.id).order('due_date', { ascending: true }),
      supabase.from('notices').select('*').order('timestamp', { ascending: false }),
      supabase.from('documents').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false }),
      supabase.from('attendance_logs').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('budget_goals').select('*').eq('user_id', user.id),
      supabase.from('wellness_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
      supabase.from('campus_events').select('*').order('event_date', { ascending: true }),
    ]);

    const profileData = profileRes.data;
    const attendanceData = attendanceRes.data || [];
    const classesData = classesRes.data || [];

    const mappedAttendance: AttendanceLog[] = attendanceData.map((a: any) => ({
      id: a.id,
      classId: a.class_id,
      date: a.date,
      status: a.status as AttendanceLog['status']
    }));

    const mappedClasses: ClassSession[] = classesData.map((c: any) => {
      const logsForClass = mappedAttendance.filter(a => a.classId === c.id && a.status !== 'Cancelled');
      let calculatedPercentage = c.attendance_percentage ?? 100;
      if (logsForClass.length > 0) {
        const presentCount = logsForClass.filter(a => a.status === 'Present').length;
        calculatedPercentage = Math.round((presentCount / logsForClass.length) * 100);
      }

      return {
        id: c.id,
        title: c.title,
        shortCode: c.short_code || c.title.slice(0, 4).toUpperCase(),
        type: c.type,
        dayOfWeek: (c.day_of_week || 'Monday') as DayOfWeek,
        room: c.room || 'TBD',
        instructor: c.instructor || 'TBD',
        time: `${c.start_hour}:${c.start_minute.toString().padStart(2, '0')} - ${c.end_hour}:${c.end_minute.toString().padStart(2, '0')}`,
        startHour: c.start_hour,
        startMinute: c.start_minute,
        endHour: c.end_hour,
        endMinute: c.end_minute,
        attendancePercentage: calculatedPercentage,
        color: c.color || colorForClass(c.short_code || c.title),
      };
    });

    const mappedTasks: Task[] = (tasksRes.data || []).map((t: any) => {
      const dueDate = new Date(t.due_date);
      return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        subject: t.course,
        priority: t.priority,
        source: t.source as Task['source'],
        completed: t.is_completed,
        dueDate: dueDate.toISOString(),
        dueTimeLabel: dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });

    const readNotices = profileData?.settings?.read_notices || [];

    const mappedNotices: Notice[] = (noticesRes.data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      excerpt: n.description,
      category: n.category as Notice['category'],
      postedBy: n.sender,
      isRead: readNotices.includes(n.id) || n.is_read,
      datePosted: new Date(n.timestamp).toISOString(),
    }));

    const mappedDocuments: Document[] = (documentsRes.data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type as Document['type'],
      category: (d.category || 'Other') as Document['category'],
      size: d.size,
      uploadedAt: new Date(d.uploaded_at).toISOString(),
      subject: d.subject || '',
      isIndexed: d.is_indexed,
      pageCount: d.page_count || 1,
      chunkCount: d.chunk_count || 0,
      indexError: d.index_error || null,
      filePath: d.file_path || undefined,
    }));

    const mappedExpenses: Expense[] = (expensesRes.data || []).map((e: any) => ({
      id: e.id,
      amount: parseFloat(e.amount),
      category: e.category as ExpenseCategory,
      description: e.description || '',
      date: e.date,
    }));

    const mappedBudgetGoals: BudgetGoal[] = (budgetRes.data || []).map((b: any) => ({
      id: b.id,
      category: b.category as ExpenseCategory,
      monthlyLimit: parseFloat(b.monthly_limit),
    }));

    const mappedWellnessLogs: WellnessLog[] = (wellnessRes.data || []).map((w: any) => ({
      id: w.id,
      date: w.date,
      mood: w.mood,
      sleepHours: parseFloat(w.sleep_hours),
      stressLevel: w.stress_level,
      notes: w.notes || '',
    }));

    const mappedCampusEvents: CampusEvent[] = (eventsRes.data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description || '',
      eventDate: new Date(e.event_date).toISOString(),
      location: e.location || 'TBD',
      category: e.category as EventCategory,
      createdBy: e.created_by,
      createdByName: e.created_by_name || 'Anonymous',
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
        settings: profileData.settings || undefined,
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
      attendanceLogs: mappedAttendance,
      tasks: mappedTasks,
      notices: mappedNotices,
      documents: mappedDocuments,
      expenses: mappedExpenses,
      budgetGoals: mappedBudgetGoals,
      wellnessLogs: mappedWellnessLogs,
      campusEvents: mappedCampusEvents,
      isLoading: false,
    });
  },

  // ════════════════════════════════════════════════════════════
  // EXISTING ACTIONS (unchanged)
  // ════════════════════════════════════════════════════════════

  toggleTask: async (id, currentStatus) => {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentProfile = get().profile;
    const currentSettings = (currentProfile?.settings as any) || {};
    const readNotices = (currentSettings as any).read_notices || [];
    
    if (!readNotices.includes(id)) {
      const newSettings = {
        ...currentSettings,
        read_notices: [...readNotices, id]
      };
      
      // Update profile in store
      set((state) => ({
        profile: state.profile ? { ...state.profile, settings: newSettings as any } : null,
      }));

      // Persist to Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ settings: newSettings })
        .eq('id', user.id);
        
      if (error) {
        console.error('Error saving read notice:', error);
      }
    }
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
      day_of_week: cls.dayOfWeek || 'Monday',
      start_hour: cls.startHour,
      start_minute: cls.startMinute,
      end_hour: cls.endHour,
      end_minute: cls.endMinute,
      attendance_percentage: 100,
      color: colorForClass(cls.shortCode || cls.title || 'CS'),
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
      dayOfWeek: data.day_of_week as DayOfWeek,
      room: data.room,
      instructor: data.instructor,
      time: `${data.start_hour}:${data.start_minute.toString().padStart(2, '0')} - ${data.end_hour}:${data.end_minute.toString().padStart(2, '0')}`,
      startHour: data.start_hour,
      startMinute: data.start_minute,
      endHour: data.end_hour,
      endMinute: data.end_minute,
      attendancePercentage: data.attendance_percentage,
      color: data.color || colorForClass(data.short_code),
    };

    set((state) => ({
      classes: [...state.classes, newClass].sort((a, b) => a.startHour - b.startHour),
    }));
  },

  updateClass: async (id, updates) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.shortCode !== undefined) dbUpdates.short_code = updates.shortCode;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.room !== undefined) dbUpdates.room = updates.room;
    if (updates.instructor !== undefined) dbUpdates.instructor = updates.instructor;
    if (updates.dayOfWeek !== undefined) dbUpdates.day_of_week = updates.dayOfWeek;
    if (updates.startHour !== undefined) dbUpdates.start_hour = updates.startHour;
    if (updates.startMinute !== undefined) dbUpdates.start_minute = updates.startMinute;
    if (updates.endHour !== undefined) dbUpdates.end_hour = updates.endHour;
    if (updates.endMinute !== undefined) dbUpdates.end_minute = updates.endMinute;

    const { error } = await supabase
      .from('classes')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating class:', error);
      return;
    }

    set((state) => ({
      classes: state.classes.map(c => c.id === id ? { ...c, ...updates, time: updates.startHour !== undefined ? `${updates.startHour}:${(updates.startMinute || 0).toString().padStart(2, '0')} - ${updates.endHour}:${(updates.endMinute || 0).toString().padStart(2, '0')}` : c.time } : c).sort((a, b) => a.startHour - b.startHour),
    }));
  },

  deleteClass: async (id) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting class:', error);
      return;
    }

    set((state) => ({
      classes: state.classes.filter(c => c.id !== id),
    }));
  },

  addBulkClasses: async (extractedClasses) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbRows = extractedClasses.map((cls) => ({
      user_id: user.id,
      title: cls.title,
      short_code: cls.shortCode,
      type: cls.type,
      room: cls.room,
      instructor: cls.instructor,
      day_of_week: cls.dayOfWeek,
      start_hour: cls.startHour,
      start_minute: cls.startMinute,
      end_hour: cls.endHour,
      end_minute: cls.endMinute,
      attendance_percentage: 100,
      color: colorForClass(cls.shortCode),
    }));

    const { data, error } = await supabase
      .from('classes')
      .insert(dbRows)
      .select();

    if (error || !data) {
      console.error('Error bulk inserting classes:', error);
      return;
    }

    const newClasses: ClassSession[] = data.map((c: any) => ({
      id: c.id,
      title: c.title,
      shortCode: c.short_code,
      type: c.type,
      dayOfWeek: c.day_of_week as DayOfWeek,
      room: c.room,
      instructor: c.instructor,
      time: `${c.start_hour}:${c.start_minute.toString().padStart(2, '0')} - ${c.end_hour}:${c.end_minute.toString().padStart(2, '0')}`,
      startHour: c.start_hour,
      startMinute: c.start_minute,
      endHour: c.end_hour,
      endMinute: c.end_minute,
      attendancePercentage: c.attendance_percentage,
      color: c.color || colorForClass(c.short_code),
    }));

    set((state) => ({
      classes: [...state.classes, ...newClasses].sort((a, b) => a.startHour - b.startHour),
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
      category: doc.category || 'Other',
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
      type: data.type as Document['type'],
      category: (data.category || 'Other') as Document['category'],
      size: data.size,
      uploadedAt: new Date(data.uploaded_at).toISOString(),
      subject: data.subject || '',
      isIndexed: data.is_indexed,
      pageCount: data.page_count,
      chunkCount: 0,
      indexError: null,
    };

    set((state) => ({
      documents: [newDoc, ...state.documents],
    }));

    return data.id;
  },

  removeDocument: async (id) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Optimistic UI update
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    }));

    if (!user) return;

    try {
      const res = await fetch('/api/documents/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: id, userId: user.id })
      });
      if (!res.ok) {
        console.error('Failed to delete document via API');
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  },

  markDocumentIndexed: (id) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, isIndexed: true, indexError: null } : d
      ),
    })),

  markDocumentError: (id, error) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, isIndexed: false, indexError: error } : d
      ),
    })),

  updateProfile: async (updates) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    }));

    const dbUpdates: Record<string, unknown> = {};
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

  markAttendance: async (classId, date, status) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set((state) => {
      let newLogs = [...state.attendanceLogs];
      const existingLogIndex = newLogs.findIndex(l => l.classId === classId && l.date === date);
      
      if (existingLogIndex >= 0) {
        newLogs[existingLogIndex] = { ...newLogs[existingLogIndex], status };
      } else {
        newLogs.push({ id: 'temp-' + Date.now(), classId, date, status });
      }

      const logsForClass = newLogs.filter(a => a.classId === classId && a.status !== 'Cancelled');
      let newPercentage = 100;
      if (logsForClass.length > 0) {
        const presentCount = logsForClass.filter(a => a.status === 'Present').length;
        newPercentage = Math.round((presentCount / logsForClass.length) * 100);
      }

      const newClasses = state.classes.map(c => 
        c.id === classId ? { ...c, attendancePercentage: newPercentage } : c
      );

      return {
        attendanceLogs: newLogs,
        classes: newClasses
      };
    });

    const { error } = await supabase
      .from('attendance_logs')
      .upsert({
        user_id: user.id,
        class_id: classId,
        date: date,
        status: status
      }, { onConflict: 'class_id,date' });

    if (error) {
      console.error("Failed to mark attendance", error);
    }
  },

  // ════════════════════════════════════════════════════════════
  // POCKETBUDDY ACTIONS
  // ════════════════════════════════════════════════════════════

  addExpense: async (expense) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        user_id: user.id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: expense.date,
      }])
      .select()
      .single();

    if (error || !data) {
      console.error('Error adding expense:', error);
      return;
    }

    const newExpense: Expense = {
      id: data.id,
      amount: parseFloat(data.amount),
      category: data.category as ExpenseCategory,
      description: data.description || '',
      date: data.date,
    };

    set((state) => ({
      expenses: [newExpense, ...state.expenses],
    }));
  },

  deleteExpense: async (id) => {
    set((state) => ({
      expenses: state.expenses.filter(e => e.id !== id),
    }));

    const supabase = createClient();
    await supabase.from('expenses').delete().eq('id', id);
  },

  setBudgetGoal: async (category, monthlyLimit) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('budget_goals')
      .upsert({
        user_id: user.id,
        category,
        monthly_limit: monthlyLimit,
      }, { onConflict: 'user_id,category' })
      .select()
      .single();

    if (error || !data) {
      console.error('Error setting budget goal:', error);
      return;
    }

    set((state) => {
      const existing = state.budgetGoals.findIndex(b => b.category === category);
      const newGoal: BudgetGoal = {
        id: data.id,
        category: data.category as ExpenseCategory,
        monthlyLimit: parseFloat(data.monthly_limit),
      };

      if (existing >= 0) {
        const updated = [...state.budgetGoals];
        updated[existing] = newGoal;
        return { budgetGoals: updated };
      }
      return { budgetGoals: [...state.budgetGoals, newGoal] };
    });
  },

  logWellness: async (log) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('wellness_logs')
      .upsert({
        user_id: user.id,
        date: log.date,
        mood: log.mood,
        sleep_hours: log.sleepHours,
        stress_level: log.stressLevel,
        notes: log.notes,
      }, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error || !data) {
      console.error('Error logging wellness:', error);
      return;
    }

    const newLog: WellnessLog = {
      id: data.id,
      date: data.date,
      mood: data.mood,
      sleepHours: parseFloat(data.sleep_hours),
      stressLevel: data.stress_level,
      notes: data.notes || '',
    };

    set((state) => {
      const existing = state.wellnessLogs.findIndex(w => w.date === log.date);
      if (existing >= 0) {
        const updated = [...state.wellnessLogs];
        updated[existing] = newLog;
        return { wellnessLogs: updated };
      }
      return { wellnessLogs: [newLog, ...state.wellnessLogs] };
    });
  },

  // ════════════════════════════════════════════════════════════
  // CAMPUS EVENTS ACTIONS
  // ════════════════════════════════════════════════════════════

  addCampusEvent: async (event) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const profile = get().profile;

    const { data, error } = await supabase
      .from('campus_events')
      .insert([{
        created_by: user.id,
        title: event.title,
        description: event.description,
        event_date: event.eventDate,
        location: event.location,
        category: event.category,
        created_by_name: profile?.name || 'Anonymous',
      }])
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating campus event:', error);
      return;
    }

    const newEvent: CampusEvent = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      eventDate: new Date(data.event_date).toISOString(),
      location: data.location,
      category: data.category as EventCategory,
      createdBy: data.created_by,
      createdByName: data.created_by_name || 'Anonymous',
    };

    set((state) => ({
      campusEvents: [...state.campusEvents, newEvent].sort(
        (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      ),
    }));
  },

  deleteCampusEvent: async (id) => {
    set((state) => ({
      campusEvents: state.campusEvents.filter(e => e.id !== id),
    }));

    const supabase = createClient();
    await supabase.from('campus_events').delete().eq('id', id);
  },

  // ════════════════════════════════════════════════════════════
  // SETTINGS ACTIONS
  // ════════════════════════════════════════════════════════════

  updateSettings: async (settingsUpdate) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentProfile = get().profile;
    const currentSettings = currentProfile?.settings || {};
    const newSettings = { ...currentSettings, ...settingsUpdate };

    // Optimistic update
    set((state) => ({
      profile: state.profile ? { ...state.profile, settings: newSettings as any } : null,
    }));

    const { error } = await supabase
      .from('profiles')
      .update({ settings: newSettings })
      .eq('id', user.id);

    if (error) {
      console.error('Error saving settings:', error);
    }
  },
}));
