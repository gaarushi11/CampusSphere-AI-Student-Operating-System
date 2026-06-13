import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { FloatingAIBrain } from '@/components/ai/FloatingAIBrain';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CampusFlow — AI Student OS',
  description:
    'Your AI-powered Operating System for Student Life. Unified schedules, smart task management, RAG-powered campus assistant. Built for HackOn with Amazon 2026.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 min-h-screen overflow-x-hidden">
        <Sidebar />
        <MobileNav />
        <main className="md:ml-[240px] min-h-screen flex flex-col pb-16 md:pb-0">
          <Header />
          <div className="flex-1 p-4 md:p-6">{children}</div>
        </main>
        <FloatingAIBrain />
      </body>
    </html>
  );
}
