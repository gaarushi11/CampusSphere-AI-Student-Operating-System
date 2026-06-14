// src/types/index.ts
//
// CampusFlow — Complete Type Definitions
// All interfaces map 1:1 to Supabase tables (snake_case → camelCase)

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

// ── Core Models ────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  major: string;
  semester: number;
  cgpa: number;
  avatarUrl?: string;
  hostelRoom: string;
  settings?: UserSettings;
}

export interface UserSettings {
  notifications_assignments: boolean;
  notifications_attendance: boolean;
  notifications_placement: boolean;
  notifications_hostel: boolean;
  appearance_dark_mode: boolean;
  appearance_compact: boolean;
  appearance_animations: boolean;
  ai_auto_summarize: boolean;
  ai_deadline_alerts: boolean;
  ai_whatsapp_extraction: boolean;
  privacy_share_analytics: boolean;
  privacy_2fa: boolean;
  read_notices?: string[];
}

export const DEFAULT_SETTINGS: UserSettings = {
  notifications_assignments: true,
  notifications_attendance: true,
  notifications_placement: true,
  notifications_hostel: false,
  appearance_dark_mode: true,
  appearance_compact: false,
  appearance_animations: true,
  ai_auto_summarize: true,
  ai_deadline_alerts: true,
  ai_whatsapp_extraction: true,
  privacy_share_analytics: false,
  privacy_2fa: true,
};

export interface ClassSession {
  id: string;
  title: string;
  shortCode: string;
  time: string;
  dayOfWeek: DayOfWeek;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  room: string;
  instructor: string;
  type: 'Lecture' | 'Lab' | 'Tutorial';
  attendancePercentage: number;
  color: string;
}

export interface AttendanceLog {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Cancelled';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  dueTimeLabel: string;
  priority: 'High' | 'Medium' | 'Low';
  source: 'Canvas' | 'WhatsApp Extracted' | 'Manual' | 'Email Parsed';
  completed: boolean;
  subject: string;
}

export interface Notice {
  id: string;
  title: string;
  excerpt: string;
  category: 'Academic' | 'Hostel' | 'Placement' | 'Urgent';
  datePosted: string;
  isRead: boolean;
  postedBy: string;
}

// ── Knowledge Vault (RAG) ──────────────────────────────────

export type DocumentCategory = 'Syllabus' | 'Timetable' | 'Notes' | 'Other';

export interface Document {
  id: string;
  name: string;
  type: 'PDF' | 'PPTX' | 'DOCX';
  category: DocumentCategory;
  size: string;
  uploadedAt: string;
  subject: string;
  isIndexed: boolean;
  pageCount: number;
  chunkCount?: number;
  indexError?: string | null;
  filePath?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
}

export interface ChatSource {
  title: string;
  type: string;
  relevance: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  sources?: ChatSource[];
}

export interface AttendanceStat {
  subject: string;
  shortCode: string;
  attended: number;
  total: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
}

// ── Timetable extraction (AI parsing) ──────────────────────
export interface ExtractedClass {
  title: string;
  shortCode: string;
  type: 'Lecture' | 'Lab' | 'Tutorial';
  dayOfWeek: DayOfWeek;
  room: string;
  instructor: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface TimetableExtractionResult {
  classes: ExtractedClass[];
  warnings: string[];
}

// ── PocketBuddy: Expenses ──────────────────────────────────

export type ExpenseCategory = 'Food' | 'Transport' | 'Entertainment' | 'Academic' | 'Shopping' | 'Health' | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food', 'Transport', 'Entertainment', 'Academic', 'Shopping', 'Health', 'Other'
];

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string; // YYYY-MM-DD
}

export interface BudgetGoal {
  id: string;
  category: ExpenseCategory;
  monthlyLimit: number;
}

// ── PocketBuddy: Wellness ──────────────────────────────────

export interface WellnessLog {
  id: string;
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  sleepHours: number;
  stressLevel: number; // 1-5
  notes: string;
}

// ── Campus Events ──────────────────────────────────────────

export type EventCategory = 'Academic' | 'Club' | 'Placement' | 'Social' | 'Sports' | 'Hackathon' | 'Workshop';

export const EVENT_CATEGORIES: EventCategory[] = [
  'Academic', 'Club', 'Placement', 'Social', 'Sports', 'Hackathon', 'Workshop'
];

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  eventDate: string; // ISO string
  location: string;
  category: EventCategory;
  createdBy: string;
  createdByName: string;
}
