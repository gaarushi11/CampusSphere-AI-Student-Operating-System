import type {
  User, ClassSession, Notice, Task, Document, AttendanceStat
} from '@/types';

// ── USER ──────────────────────────────────────────────────────
export const mockUser: User = {
  id: 'usr-001',
  name: 'Rahul Sharma',
  rollNumber: '2021CSE0042',
  major: 'Computer Science & Engineering',
  semester: 6,
  cgpa: 8.7,
  email: 'rahul.sharma@iit.ac.in',
  hostelRoom: 'Block C — 214',
  avatarUrl: undefined,
};

// ── CLASS SESSIONS (TODAY) ─────────────────────────────────────
export const todayClasses: ClassSession[] = [
  {
    id: 'cls-001',
    title: 'Cloud Computing',
    shortCode: 'CS401',
    time: '9:00 AM – 10:30 AM',
    startHour: 9, startMinute: 0,
    endHour: 10, endMinute: 30,
    room: 'LH-3, Block A',
    instructor: 'Dr. Ankit Mehta',
    type: 'Lecture',
    attendancePercentage: 82,
    color: 'bg-violet-500',
  },
  {
    id: 'cls-002',
    title: 'Operating Systems',
    shortCode: 'CS302',
    time: '11:00 AM – 12:30 PM',
    startHour: 11, startMinute: 0,
    endHour: 12, endMinute: 30,
    room: 'LH-1, Block B',
    instructor: 'Prof. Sunita Rao',
    type: 'Lecture',
    attendancePercentage: 68,
    color: 'bg-rose-500',
  },
  {
    id: 'cls-003',
    title: 'Machine Learning Lab',
    shortCode: 'CS403L',
    time: '2:00 PM – 4:00 PM',
    startHour: 14, startMinute: 0,
    endHour: 16, endMinute: 0,
    room: 'Lab 204, CS Block',
    instructor: 'Dr. Priya Patel',
    type: 'Lab',
    attendancePercentage: 91,
    color: 'bg-emerald-500',
  },
  {
    id: 'cls-004',
    title: 'Database Systems',
    shortCode: 'CS303',
    time: '4:30 PM – 5:30 PM',
    startHour: 16, startMinute: 30,
    endHour: 17, endMinute: 30,
    room: 'LH-2, Block A',
    instructor: 'Dr. Rajan Verma',
    type: 'Tutorial',
    attendancePercentage: 77,
    color: 'bg-amber-500',
  },
  {
    id: 'cls-005',
    title: 'Technical Communication',
    shortCode: 'HS201',
    time: '5:45 PM – 6:45 PM',
    startHour: 17, startMinute: 45,
    endHour: 18, endMinute: 45,
    room: 'Seminar Hall, Main Block',
    instructor: 'Ms. Kavitha Nair',
    type: 'Lecture',
    attendancePercentage: 85,
    color: 'bg-sky-500',
  },
];

// ── TASKS ──────────────────────────────────────────────────────
export const mockTasks: Task[] = [
  {
    id: 'task-001',
    title: 'Submit Cloud Computing Assignment',
    description: 'Deploy a 3-tier app on AWS EC2 + RDS and submit the GitHub repo link.',
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    dueTimeLabel: 'Due in 2 hours',
    priority: 'High',
    source: 'Canvas',
    completed: false,
    subject: 'CS401',
  },
  {
    id: 'task-002',
    title: 'OS Assignment 4 — Scheduling Algorithms',
    description: 'Implement Round Robin and FCFS in C++ and compare turnaround times.',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    dueTimeLabel: 'Due tomorrow at 11:59 PM',
    priority: 'High',
    source: 'WhatsApp Extracted',
    completed: false,
    subject: 'CS302',
  },
  {
    id: 'task-003',
    title: 'ML Lab Pre-read — Regression Models',
    description: 'Read Chapter 4 of Hands-On ML (Géron) before lab.',
    dueDate: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    dueTimeLabel: 'Before 2 PM today',
    priority: 'Medium',
    source: 'Manual',
    completed: false,
    subject: 'CS403L',
  },
  {
    id: 'task-004',
    title: 'DBMS Quiz Revision — ER Diagrams & Normalization',
    description: 'Quiz scheduled next class. Review slides 45-82 from the LMS.',
    dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    dueTimeLabel: 'In 2 days',
    priority: 'Medium',
    source: 'Email Parsed',
    completed: false,
    subject: 'CS303',
  },
  {
    id: 'task-005',
    title: 'Register for Amazon Placement Pre-Talk',
    description: 'Fill Google Form sent by Training & Placement Cell. Deadline tonight.',
    dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    dueTimeLabel: 'Tonight at 11:59 PM',
    priority: 'High',
    source: 'WhatsApp Extracted',
    completed: false,
    subject: 'Placement',
  },
];

// ── NOTICES ────────────────────────────────────────────────────
export const mockNotices: Notice[] = [
  {
    id: 'ntc-001',
    title: '🚨 Amazon SDE Placement Drive — Pre-Talk Registration',
    excerpt: 'Amazon is visiting campus on June 28. Eligible: 7+ CGPA, CSE/IT/ECE. Register via the T&P portal by tonight.',
    category: 'Placement',
    datePosted: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    postedBy: 'T&P Cell',
  },
  {
    id: 'ntc-002',
    title: '⚠️ Mid-Semester Examination Schedule Released',
    excerpt: 'Mid-sem exams are scheduled from June 24–28. Date sheet is available on the Academic Portal. Hall tickets to be collected from the examination branch.',
    category: 'Academic',
    datePosted: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    postedBy: 'Examination Branch',
  },
  {
    id: 'ntc-003',
    title: 'Hostel Mess Menu — Week of June 16',
    excerpt: 'Updated weekly menu for all hostels. Special Sunday dinner: Paneer Butter Masala + Gulab Jamun. Feedback via the Hostel Portal.',
    category: 'Hostel',
    datePosted: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    postedBy: 'Hostel Management',
  },
  {
    id: 'ntc-004',
    title: 'Cloud Computing Assignment Extension Granted',
    excerpt: 'Due to server issues on AWS Academy, the CS401 assignment deadline has been extended by 48 hours. New deadline: June 17, 11:59 PM.',
    category: 'Academic',
    datePosted: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    postedBy: 'Dr. Ankit Mehta',
  },
  {
    id: 'ntc-005',
    title: '🔴 Campus Internet Maintenance — Tonight 11 PM–2 AM',
    excerpt: 'NKN internet connectivity will be unavailable tonight from 11 PM to 2 AM due to fiber maintenance. Plan your work accordingly.',
    category: 'Urgent',
    datePosted: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    postedBy: 'IT Services',
  },
];

// ── DOCUMENTS ─────────────────────────────────────────────────
export const mockDocuments: Document[] = [
  {
    id: 'doc-001',
    name: 'Cloud_Computing_Syllabus_CS401.pdf',
    type: 'PDF',
    size: '1.2 MB',
    uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    subject: 'CS401 — Cloud Computing',
    isIndexed: true,
    pageCount: 18,
  },
  {
    id: 'doc-002',
    name: 'OS_Unit3_Notes_ProcessScheduling.pdf',
    type: 'PDF',
    size: '3.8 MB',
    uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    subject: 'CS302 — Operating Systems',
    isIndexed: true,
    pageCount: 42,
  },
  {
    id: 'doc-003',
    name: 'ML_Week5_Lecture_Slides.pptx',
    type: 'PPTX',
    size: '8.1 MB',
    uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    subject: 'CS403 — Machine Learning',
    isIndexed: false,
    pageCount: 65,
  },
  {
    id: 'doc-004',
    name: 'DBMS_ER_Diagrams_Tutorial.pdf',
    type: 'PDF',
    size: '2.2 MB',
    uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    subject: 'CS303 — Database Systems',
    isIndexed: true,
    pageCount: 28,
  },
];

// ── ATTENDANCE STATS ───────────────────────────────────────────
export const attendanceStats: AttendanceStat[] = [
  { subject: 'Cloud Computing', shortCode: 'CS401', attended: 18, total: 22, percentage: 82, status: 'safe' },
  { subject: 'Operating Systems', shortCode: 'CS302', attended: 15, total: 22, percentage: 68, status: 'danger' },
  { subject: 'Machine Learning Lab', shortCode: 'CS403', attended: 20, total: 22, percentage: 91, status: 'safe' },
  { subject: 'Database Systems', shortCode: 'CS303', attended: 17, total: 22, percentage: 77, status: 'warning' },
  { subject: 'Technical Communication', shortCode: 'HS201', attended: 19, total: 22, percentage: 86, status: 'safe' },
];

// ── AGGREGATE ATTENDANCE ───────────────────────────────────────
export const overallAttendance: number = Math.round(
  attendanceStats.reduce((sum, s) => sum + s.percentage, 0) / attendanceStats.length
);
