'use client';

import { FormEvent, useState } from 'react';
import { Account, login, register, getSecurityQuestion, resetPassword } from '@/lib/auth-client';

type Mode = 'login' | 'signup' | 'reset';

const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  "What is your mother's maiden name?",
  'What was the name of your first school?',
  'What is your favourite movie?',
];

function Field({
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--jade)] transition-colors"
    />
  );
}

export default function AuthScreen({ onAuthed }: { onAuthed: (account: Account) => void }) {
  const [mode, setMode] = useState<Mode>('login');

  // shared fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');

  // reset flow
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetQuestion, setResetQuestion] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetStep(1);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        onAuthed(await register({ name, email, password, securityQuestion, securityAnswer }));
      } else if (mode === 'login') {
        onAuthed(await login({ email, password }));
      } else if (mode === 'reset') {
        if (resetStep === 1) {
          const q = await getSecurityQuestion(email);
          setResetQuestion(q);
          setResetStep(2);
        } else {
          onAuthed(await resetPassword({ email, securityAnswer, newPassword: password }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const subtitle =
    mode === 'signup'
      ? 'Create your account to enter the hive'
      : mode === 'reset'
      ? 'Reset your password with your security question'
      : 'Log in to your account';

  return (
    <main className="min-h-[100dvh] w-full flex items-center justify-center px-5 py-10 relative overflow-hidden bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f]">
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-[var(--jade)]/10 blur-3xl animate-float pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-[#3b82f6]/10 blur-3xl animate-float-delayed pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-3xl shadow-lg shadow-[var(--jade)]/30 mb-4">
            🐝
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">KANDO</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 text-center">{subtitle}</p>
        </div>

        <div className="glass-modern rounded-3xl p-6">
          {mode !== 'reset' && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white/[0.04] mb-6">
              {(['login', 'signup'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => go(m)}
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
          )}

          <form onSubmit={submit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <Field type="text" placeholder="Full name" value={name} onChange={setName} autoComplete="name" />
            )}

            {/* email is shown for every mode; locked once a reset question is fetched */}
            <Field
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(v) => mode === 'reset' && resetStep === 2 ? null : setEmail(v)}
              autoComplete="email"
            />

            {(mode === 'login' || mode === 'signup') && (
              <Field
                type="password"
                placeholder="Password"
                value={password}
                onChange={setPassword}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            )}

            {mode === 'signup' && (
              <>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--jade)] transition-colors"
                >
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q} className="bg-[#161b22]">
                      {q}
                    </option>
                  ))}
                </select>
                <Field type="text" placeholder="Security answer" value={securityAnswer} onChange={setSecurityAnswer} />
              </>
            )}

            {mode === 'reset' && resetStep === 2 && (
              <>
                <div className="text-xs text-[var(--text-secondary)] bg-white/[0.04] rounded-xl px-4 py-3">
                  {resetQuestion}
                </div>
                <Field type="text" placeholder="Your answer" value={securityAnswer} onChange={setSecurityAnswer} />
                <Field
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />
              </>
            )}

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
              {busy
                ? 'Please wait…'
                : mode === 'signup'
                ? 'Create account'
                : mode === 'login'
                ? 'Log in'
                : resetStep === 1
                ? 'Continue'
                : 'Reset password'}
            </button>
          </form>

          {/* Google login placeholder — wired later once OAuth keys are added. */}
          {mode !== 'reset' && (
            <button
              type="button"
              disabled
              title="Coming soon"
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-sm text-[var(--text-muted)] opacity-60 cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.35 11.1H12v2.83h5.35c-.23 1.5-1.6 4.4-5.35 4.4-3.22 0-5.84-2.66-5.84-5.94S8.78 6.46 12 6.46c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.7 3.9 14.6 3 12 3 6.98 3 2.9 7.06 2.9 12s4.08 9 9.1 9c5.25 0 8.73-3.69 8.73-8.89 0-.6-.07-1.05-.18-1.51z" />
              </svg>
              Continue with Google (soon)
            </button>
          )}
        </div>

        <div className="text-center text-xs text-[var(--text-muted)] mt-6">
          {mode === 'login' && (
            <>
              <button type="button" onClick={() => go('reset')} className="text-[var(--jade)] hover:underline">
                Forgot password?
              </button>
              <span className="mx-2">·</span>
              <button type="button" onClick={() => go('signup')} className="text-[var(--jade)] hover:underline">
                Create an account
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => go('login')} className="text-[var(--jade)] hover:underline">
              Already have an account? Log in
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => go('login')} className="text-[var(--jade)] hover:underline">
              Back to log in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
