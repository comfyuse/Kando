'use client';

import { FormEvent, useState } from 'react';
import { login, signup } from '../lib/auth';
import { MailIcon, LockIcon, UserIcon, EyeIcon, EyeOffIcon } from './Icons';

type Mode = 'login' | 'signup';

interface Field {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}

function InputRow({ field, trailing }: { field: Field; trailing?: React.ReactNode }) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none">{field.icon}</span>
      <input
        type={field.type}
        placeholder={field.placeholder}
        value={field.value}
        onChange={(e) => field.onChange(e.target.value)}
        autoComplete={field.autoComplete}
        className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-11 pr-11 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--jade)] transition-colors"
      />
      {trailing && <span className="absolute right-2">{trailing}</span>}
    </div>
  );
}

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      // On success the auth store notifies AppPage, which swaps to the shell.
      if (mode === 'signup') {
        await signup({ name, email, password });
      } else {
        await login({ email, password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const iconSize = { width: 18, height: 18 };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 py-10 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-[var(--jade)]/10 blur-3xl animate-float pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-[#3b82f6]/10 blur-3xl animate-float-delayed pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-3xl shadow-lg shadow-[var(--jade)]/30 mb-4">
            🐝
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">KANDO</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {mode === 'signup' ? 'Create your account to join the hive' : 'Welcome back to the hive'}
          </p>
        </div>

        <div className="glass-modern rounded-3xl p-6">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white/[0.04] mb-6">
            {(['signup', 'login'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`py-2 rounded-xl text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white shadow'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {m === 'signup' ? 'Sign up' : 'Log in'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <InputRow
                field={{
                  icon: <UserIcon {...iconSize} />,
                  type: 'text',
                  placeholder: 'Full name',
                  value: name,
                  onChange: setName,
                  autoComplete: 'name',
                }}
              />
            )}
            <InputRow
              field={{
                icon: <MailIcon {...iconSize} />,
                type: 'email',
                placeholder: 'Email address',
                value: email,
                onChange: setEmail,
                autoComplete: 'email',
              }}
            />
            <InputRow
              field={{
                icon: <LockIcon {...iconSize} />,
                type: showPassword ? 'text' : 'password',
                placeholder: 'Password',
                value: password,
                onChange: setPassword,
                autoComplete: mode === 'signup' ? 'new-password' : 'current-password',
              }}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
                </button>
              }
            />

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 animate-fadeIn">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 py-3 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white font-semibold text-sm shadow-lg shadow-[var(--jade)]/25 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
            className="text-[var(--jade)] font-medium hover:underline"
          >
            {mode === 'signup' ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
