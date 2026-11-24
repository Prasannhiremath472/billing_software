import React, { useState } from 'react';
import { Gem, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { errorMessage } from '@/services/api-client';

interface LoginProps {
  onSubmit: (email: string, password: string) => Promise<void>;
}

export default function Login({ onSubmit }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await onSubmit(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err, 'Unable to sign in. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-[#2D2A26] text-[#C9A96E] flex items-center justify-center mb-3">
            <Gem className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#2D2A26]">JewelSync</h1>
          <p className="text-xs text-[#8A8278] mt-1">Smart Billing. Seamless Retail.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-[#E5DDD0] bg-white p-5 space-y-4 shadow-xs">
          <div>
            <h2 className="font-serif text-base font-semibold text-[#2D2A26]">Staff sign in</h2>
            <p className="text-xs text-[#8A8278]">Use the email and password issued by your administrator.</p>
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-px text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <Label htmlFor="login-email" required>Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@yourstore.com"
              icon={<Mail className="h-4 w-4" />}
              className="h-11"
            />
          </div>

          <div>
            <Label htmlFor="login-password" required>Password</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
              className="h-11"
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading || !email || !password}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
