import Link from 'next/link';
import { Brain, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signup } from '@/app/auth/actions';

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error: string };
}) {
  return (
    <div className="w-full max-w-md relative">
      {/* Background glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 blur-xl z-0" />
      
      <Card className="relative z-10 border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-3 pb-6 border-b border-slate-800">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold text-slate-100">
            Join CampusFlow
          </CardTitle>
          <CardDescription className="text-center text-slate-400">
            Create your account to supercharge your student life
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-4" action={signup}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="fullName">
                Full Name
              </label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Rahul Sharma"
                required
                className="bg-slate-950/50 border-slate-800 focus:border-violet-500/50 focus:ring-violet-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="email">
                University Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="student@university.edu"
                required
                className="bg-slate-950/50 border-slate-800 focus:border-violet-500/50 focus:ring-violet-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="bg-slate-950/50 border-slate-800 focus:border-violet-500/50 focus:ring-violet-500/20"
              />
            </div>

            {searchParams.error && (
              <div className="p-3 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                {searchParams.error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-medium shadow-lg shadow-violet-500/20 border-0"
            >
              Create Account <UserPlus className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 hover:underline">
              Sign in instead
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
