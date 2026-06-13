export interface User {
  id: string;
  name: string;
  rollNumber: string;
  major: string;
  semester: number;
  cgpa: number;
  avatarUrl?: string;
  email: string;
  hostelRoom: string;
}

export interface ClassSession {
  id: string;
  title: string;
  shortCode: string;
  time: string;
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

export interface Document {
  id: string;
  name: string;
  type: 'PDF' | 'PPTX' | 'DOCX';
  size: string;
  uploadedAt: string;
  subject: string;
  isIndexed: boolean;
  pageCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface AttendanceStat {
  subject: string;
  shortCode: string;
  attended: number;
  total: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
}
