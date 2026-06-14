// src/types/index.ts
//
// CHANGES FROM ORIGINAL:
// - ClassSession: added `dayOfWeek` — REQUIRED for per-day schedule filtering.
// - Document: added `category`, `indexError`, `chunkCount`, `filePath`
// - ChatMessage: added `sources` — RAG citations shown in chat UI.
// - New `ExtractedClass` — shape returned by AI timetable parser.

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

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
}

export interface AttendanceLog {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Cancelled';
}

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
}

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

export interface Notice {
  id: string;
  title: string;
  excerpt: string;
  category: 'Academic' | 'Hostel' | 'Placement' | 'Urgent';
  datePosted: string;
  isRead: boolean;
  postedBy: string;
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

// ── Timetable extraction (AI parsing) ──────────────────────────
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
