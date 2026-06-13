export interface AIResponse {
  content: string;
  sources?: string[];
}

export const aiResponseMap: Record<string, AIResponse> = {
  'os syllabus': {
    content: `**Operating Systems (CS302) — Syllabus Summary**\n\nHere's a structured overview indexed from your uploaded notes:\n\n**Unit 1 — Process Management**\n• Process states, PCB, context switching\n• Threads: user-level vs kernel-level\n• Inter-process Communication (IPC): pipes, shared memory\n\n**Unit 2 — CPU Scheduling**\n• FCFS, SJF, Round Robin, Priority Scheduling\n• Multilevel Queue & Feedback Queue\n\n**Unit 3 — Memory Management** *(Your current unit)*\n• Paging, Segmentation, TLB\n• Virtual memory, Demand paging, Page replacement algorithms (LRU, FIFO, Optimal)\n\n**Unit 4 — Deadlocks**\n• Banker's Algorithm, Detection & Recovery\n\n**Unit 5 — File Systems**\n• FAT, NTFS, i-nodes, disk scheduling (SCAN, C-SCAN)\n\n📄 *Source: OS_Unit3_Notes_ProcessScheduling.pdf (42 pages, indexed)*`,
    sources: ['OS_Unit3_Notes_ProcessScheduling.pdf'],
  },
  'cloud assignment': {
    content: `**Cloud Computing Assignment (CS401) — What You Need to Submit**\n\n⚠️ *This task is due in ~2 hours!*\n\nBased on the Canvas portal data:\n\n**Requirements:**\n1. Deploy a 3-tier application (React frontend + Node.js API + MySQL RDS) on AWS\n2. Use EC2 t2.micro instances (Free Tier eligible)\n3. Configure Security Groups to allow only HTTP (80) and SSH (22)\n4. Submit your GitHub repo link + a 1-page architecture diagram\n\n**Grading Rubric:**\n• Working deployment: 40 points\n• Security Group configuration: 20 points\n• Architecture diagram: 20 points\n• Clean code & README: 20 points\n\n💡 *Tip: Use the AWS Free Tier calculator to ensure you stay within limits.*`,
    sources: ['Cloud_Computing_Syllabus_CS401.pdf'],
  },
  'attendance': {
    content: `**Your Attendance Summary**\n\n| Subject | Attended | Total | % |\n|---|---|---|---|\n| Cloud Computing (CS401) | 18 | 22 | **82%** ✅ |\n| Operating Systems (CS302) | 15 | 22 | **68%** 🔴 |\n| ML Lab (CS403) | 20 | 22 | **91%** ✅ |\n| Database Systems (CS303) | 17 | 22 | **77%** 🟡 |\n| Technical Comm (HS201) | 19 | 22 | **86%** ✅ |\n\n⚠️ **Critical Warning:** Your OS attendance is at 68%, which is below the 75% mandatory requirement.\n\n**To reach 75% in OS**, you must attend the next **7 consecutive classes** without a single absence.\n\n📌 *Action: Contact Prof. Sunita Rao before the next class to explain.*`,
    sources: [],
  },
  'summarize': {
    content: `**Campus Updates Summary — Today**\n\n🔴 **Urgent:**\n• Campus internet maintenance tonight 11 PM–2 AM. Plan offline work now.\n\n💼 **Placement:**\n• Amazon SDE drive pre-talk registration closes **tonight**. Register via T&P portal ASAP.\n\n📚 **Academic:**\n• Mid-sem exam schedule is out: June 24–28. Start preparation now.\n• CS401 assignment deadline extended by 48 hours (new deadline: June 17).\n\n🏠 **Hostel:**\n• Updated mess menu is live. Special Sunday dinner this week.\n\n✅ *3 unread notices require your attention.*`,
    sources: [],
  },
  'amazon': {
    content: `**Amazon SDE Placement Drive — Key Info**\n\n📅 **Date:** June 28, 2026\n📍 **Venue:** Main Auditorium (OAT)\n⏰ **Registration Deadline:** Tonight, 11:59 PM\n\n**Eligibility Criteria:**\n• CGPA ≥ 7.0 (you're at **8.7** ✅)\n• Branches: CSE, IT, ECE, EE\n• No active backlogs\n\n**Selection Process:**\n1. Online Coding Test (2 hrs — DSA problems on HackerRank)\n2. Technical Interview Round 1 (Data Structures + CS fundamentals)\n3. Technical Interview Round 2 (System Design)\n4. HR Round\n\n💡 **Preparation Tips from the Vault:**\n• Focus on Arrays, Trees, Graphs, DP\n• Practice LeetCode Medium problems\n• Revise OS, DBMS, and Networking basics\n\n📝 Register here: T&P Portal → Placement Drives → Amazon 2026`,
    sources: [],
  },
  'schedule': {
    content: `**Your Schedule for Today**\n\n⏰ **09:00 – 10:30 AM** — Cloud Computing (LH-3, Block A)\n↳ Dr. Ankit Mehta | Assignment due today!\n\n⏰ **11:00 AM – 12:30 PM** — Operating Systems (LH-1, Block B)\n↳ Prof. Sunita Rao | ⚠️ Attendance critical (68%)\n\n⏰ **02:00 – 04:00 PM** — ML Lab (Lab 204, CS Block)\n↳ Dr. Priya Patel | Pre-read regression chapter first!\n\n⏰ **04:30 – 05:30 PM** — Database Systems Tutorial (LH-2, Block A)\n↳ Dr. Rajan Verma | Quiz next class, start revising\n\n⏰ **05:45 – 06:45 PM** — Technical Communication (Seminar Hall)\n↳ Ms. Kavitha Nair\n\n**Total class time today: 6.5 hours**`,
    sources: [],
  },
  'deadline': {
    content: `**Upcoming Deadlines — Priority Order**\n\n🔴 **CRITICAL (Today):**\n• Cloud Computing Assignment — Due in ~2 hours\n• Amazon Pre-Talk Registration — Tonight 11:59 PM\n\n🟡 **HIGH (Tomorrow):**\n• OS Assignment 4 (Scheduling Algorithms) — Due tomorrow 11:59 PM\n\n🟢 **MEDIUM (This Week):**\n• ML Lab Pre-read (Chapter 4) — Before 2 PM today\n• DBMS Quiz Revision — In 2 days\n\n💡 *Suggested Action: Complete the Cloud Computing assignment first (2 hrs left), then immediately register for Amazon drive (5 min task).*`,
    sources: [],
  },
  'exam': {
    content: `**Mid-Semester Examination Schedule**\n\n📅 **Dates:** June 24–28, 2026\n\n| Date | Subject | Time | Venue |\n|---|---|---|---|\n| June 24 (Mon) | Cloud Computing (CS401) | 9:00 AM – 12:00 PM | Exam Hall 1 |\n| June 25 (Tue) | Operating Systems (CS302) | 9:00 AM – 12:00 PM | Exam Hall 2 |\n| June 26 (Wed) | Machine Learning (CS403) | 2:00 PM – 5:00 PM | Exam Hall 1 |\n| June 27 (Thu) | Database Systems (CS303) | 9:00 AM – 12:00 PM | Exam Hall 3 |\n| June 28 (Fri) | Technical Comm (HS201) | 2:00 PM – 4:00 PM | Seminar Hall |\n\n📌 **Important Notes:**\n• Collect hall tickets from Exam Branch by June 22\n• Bring college ID + hall ticket to every exam\n• No electronic devices allowed\n\n💡 *You have 11 days to prepare. Prioritize OS (lowest attendance & toughest syllabus).*`,
    sources: [],
  },
  'hostel': {
    content: `**Hostel Updates — Block C**\n\n🏠 **Your Room:** Block C — 214\n\n**This Week's Mess Menu Highlights:**\n• Monday: Chole Bhature (Lunch), Dal Makhani (Dinner)\n• Wednesday: Rajma Chawal (Lunch), Chicken Biryani (Dinner)\n• Sunday Special: Paneer Butter Masala + Gulab Jamun\n\n**Notices:**\n• ⚠️ Water supply maintenance on June 18 (6 AM – 10 AM)\n• Room inspection scheduled for June 20\n• Laundry service timings changed: 8 AM – 8 PM (extended)\n\n**Complaints Portal:**\nSubmit maintenance requests via the Hostel Portal → Complaints section.`,
    sources: [],
  },
};

export const defaultAIResponse: AIResponse = {
  content: `I'm CampusFlow AI, your intelligent campus assistant powered by Amazon Bedrock. I can help you with:\n\n• 📚 **Syllabus summaries** — *"Summarize OS syllabus"*\n• ✅ **Assignment details** — *"What's due in Cloud Computing?"*\n• 📊 **Attendance analysis** — *"How's my attendance?"*\n• 📅 **Schedule queries** — *"What's my schedule today?"*\n• 💼 **Placement info** — *"Tell me about Amazon drive"*\n• 📋 **Notice summaries** — *"Summarize today's notices"*\n• 🏠 **Hostel updates** — *"Any hostel notices?"*\n• 📝 **Exam schedule** — *"When are my exams?"*\n\nAll responses are grounded in your uploaded documents and real campus data via RAG (Retrieval-Augmented Generation).`,
};

export function getMockAIResponse(userMessage: string): AIResponse {
  const lowerMsg = userMessage.toLowerCase();
  for (const [keyword, response] of Object.entries(aiResponseMap)) {
    if (lowerMsg.includes(keyword)) {
      return response;
    }
  }
  return defaultAIResponse;
}
