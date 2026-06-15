import Link from 'next/link';
import { Brain, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { login } from '@/app/auth/actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error: string };
}) {
  return (
    <div className="w-full max-w-md relative">
      {/* Background glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 blur-xl z-0" />
      
      <Card className="relative z-10 border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-3 pb-6 border-b border-slate-800">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold text-slate-100">
            Welcome back to CampusFlow
          </CardTitle>
          <CardDescription className="text-center text-slate-400">
            Enter your credentials to access your AI Student OS
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-4" action={login}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="email">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="student@university.edu"
                required
                className="bg-slate-950/50 border-slate-800 focus:border-cyan-500/50 focus:ring-cyan-500/20"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300" htmlFor="password">
                  Password
                </label>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-slate-950/50 border-slate-800 focus:border-cyan-500/50 focus:ring-cyan-500/20"
              />
            </div>

            {searchParams.error && (
              <div className="p-3 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                {searchParams.error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-medium shadow-lg shadow-cyan-500/20 border-0"
            >
              Sign In <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 hover:underline">
              Create one now
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <div className="relative z-10 mt-6 grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
          <p className="text-lg font-bold text-cyan-400">📅</p>
          <p className="text-[10px] text-slate-400 mt-1">Smart Schedule</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
          <p className="text-lg font-bold text-cyan-400">🧠</p>
          <p className="text-[10px] text-slate-400 mt-1">AI Assistant</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
          <p className="text-lg font-bold text-cyan-400">💰</p>
          <p className="text-[10px] text-slate-400 mt-1">Budget Tracker</p>
        </div>
      </div>
    </div>
  );
}
