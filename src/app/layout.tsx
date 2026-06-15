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
    'Your AI-powered Operating System for Student Life. Unified schedules, smart task management, financial wellness tracking, and a RAG-powered campus assistant.',
  icons: { icon: '/favicon.ico' },
};

import { createClient } from '@/utils/supabase/server';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 min-h-screen overflow-x-hidden">
        {user ? (
          <>
            <Sidebar />
            <MobileNav />
            <main className="md:ml-[240px] min-h-screen flex flex-col pb-16 md:pb-0">
              <Header />
              <div className="flex-1 p-4 md:p-6">{children}</div>
            </main>
            <FloatingAIBrain />
          </>
        ) : (
          <main className="min-h-screen flex flex-col items-center justify-center p-4">
            {children}
          </main>
        )}
      </body>
    </html>
  );
}
