'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// Where waiting-list submissions are delivered. FormSubmit forwards every
// submission to this inbox as a structured email. The very first submission
// triggers a one-time activation email to this address — click the confirm
// link once and all future submissions arrive automatically.
const DESTINATION_EMAIL = 'brainsbalance21@gmail.com';
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${DESTINATION_EMAIL}`;

const navLinks = [
  { name: 'Simulator', href: '/simulator', icon: '🎮', description: 'CANDO Protocol Simulation' },
  { name: 'Chat', href: '/chat', icon: '💬', description: 'Secure Messaging' },
  { name: 'Waiting List', href: '/waiting-list', icon: '⏳', description: 'Get Early Access' },
  { name: 'Docs', href: '/docs', icon: '📄', description: 'Protocol Documentation' },
  { name: 'Open Source', href: '/open-source', icon: '🔓', description: 'View on GitHub' },
];

// ── Shared field styles ───────────────────────────────────────────────────────

const inputBase =
  'w-full px-4 py-2.5 bg-white/5 border rounded-xl text-white placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#2ea88a]/40 focus:border-[#2ea88a] transition-all text-sm md:text-base';
const cls = (hasError?: string) => `${inputBase} ${hasError ? 'border-red-500/70' : 'border-white/10'}`;

// ── Presentational components (module scope so inputs never lose focus) ─────────

function GlassBackdrop() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[#0a0c10]" />
      <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-[#2ea88a]/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute top-1/3 -right-32 w-[26rem] h-[26rem] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] bg-[#2ea88a]/10 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s' }} />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}

function Sidebar({
  isMobile,
  mobileMenuOpen,
  setMobileMenuOpen,
  pathname,
}: {
  isMobile: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  pathname: string;
}) {
  return (
    <>
      {/* Mobile top bar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/[0.04] backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image src="/KANDOlogo.png" alt="KANDO Logo" fill className="object-contain rounded-full" />
              </div>
              <span className="font-bold text-lg text-white">KANDO</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#2ea88a]/60 transition-colors"
              aria-label="Menu"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-white/[0.04] backdrop-blur-2xl border-r border-white/10 z-50 shadow-2xl pt-16">
            <div className="p-4 flex flex-col gap-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#2ea88a]/15 text-[#2ea88a] border border-[#2ea88a]/30'
                        : 'hover:bg-white/5 text-[#c9d1d9] border border-transparent'
                    }`}
                  >
                    <span className="text-2xl">{link.icon}</span>
                    <div>
                      <div className="font-medium">{link.name}</div>
                      <div className="text-xs text-[#8b949e]">{link.description}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-white/[0.03] backdrop-blur-2xl border-r border-white/10 z-30 overflow-y-auto">
        <div className="p-4 pt-8">
          <Link href="/" className="flex items-center gap-2 mb-8 group">
            <div className="relative w-8 h-8 transition-transform group-hover:scale-105 duration-200">
              <Image src="/KANDOlogo.png" alt="KANDO Logo" fill className="object-contain rounded-full" />
            </div>
            <span className="font-bold text-white group-hover:text-[#2ea88a] transition-colors">KANDO</span>
          </Link>
          <div className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#2ea88a]/15 text-[#2ea88a] border border-[#2ea88a]/30'
                      : 'hover:bg-white/5 text-[#c9d1d9] border border-transparent hover:text-[#2ea88a]'
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{link.name}</div>
                    <div className="text-[10px] text-[#8b949e]">{link.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function SectionCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl shadow-black/20 transition-all hover:border-white/20">
      <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2ea88a]/15 border border-[#2ea88a]/30 text-[#2ea88a] text-sm font-bold">
          {step}
        </span>
        <span>{title}</span>
      </h3>
      {children}
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs md:text-sm font-medium mb-2 text-[#c9d1d9]">
      {children} {required && <span className="text-red-400">*</span>}
    </label>
  );
}

export default function WaitingListPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    confirmEmail: '',
    username: '',
    discordId: '',
    githubUsername: '',
    reason: '',
    hearAbout: '',
    agreeTerms: false,
    receiveUpdates: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (formData.email !== formData.confirmEmail) {
      newErrors.confirmEmail = 'Emails do not match';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the terms';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `🐝 New KANDO Waiting List Signup — ${formData.username}`,
          _template: 'table',
          _captcha: 'false',
          'Full Name': `${formData.firstName} ${formData.lastName}`,
          Email: formData.email,
          Username: formData.username,
          'Discord ID': formData.discordId || '—',
          'GitHub Username': formData.githubUsername || '—',
          'Why interested': formData.reason || '—',
          'Heard about us via': formData.hearAbout || '—',
          'Wants updates': formData.receiveUpdates ? 'Yes' : 'No',
        }),
      });

      const data = await res.json();
      if (res.ok && (data.success === 'true' || data.success === true)) {
        setIsSubmitted(true);
      } else {
        setSubmitError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitError('Network error — please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // ── Success screen ────────────────────────────────────────────────────────

  if (isSubmitted) {
    return (
      <main className="min-h-screen text-white">
        <GlassBackdrop />
        <Sidebar isMobile={isMobile} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} pathname={pathname} />
        <div className={`md:ml-64 ${isMobile ? 'pt-14' : ''}`}>
          <div className="flex items-center justify-center min-h-screen p-4 md:p-8">
            <div className="max-w-md w-full text-center bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl shadow-[#2ea88a]/10 animate-[fadeIn_0.5s_ease-out]">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-[#2ea88a]/30 rounded-full blur-xl animate-pulse" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-[#2ea88a] to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-[#2ea88a]/40">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-3">You're on the list! 🎉</h1>
              <p className="text-sm md:text-base text-[#8b949e] mb-6">
                Thank you for joining the KANDO waiting list. Your details were sent to our team —
                we'll email you the moment early access opens.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
                <p className="text-xs md:text-sm text-[#8b949e]">Confirmation sent to</p>
                <p className="text-base md:text-lg font-mono text-[#2ea88a] mt-1 break-all">{formData.email}</p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-[#2ea88a] to-emerald-600 hover:from-[#3fb892] hover:to-emerald-500 text-white font-semibold transition-all shadow-lg shadow-[#2ea88a]/30 hover:scale-[1.02]"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen text-white">
      <GlassBackdrop />
      <Sidebar isMobile={isMobile} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} pathname={pathname} />

      <div className={`md:ml-64 ${isMobile ? 'pt-14' : ''}`}>
        <div className="max-w-2xl mx-auto p-4 md:p-8 pb-20">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2ea88a]/10 border border-[#2ea88a]/30 text-[#2ea88a] text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2ea88a] animate-pulse" />
              Early Access — Limited Spots
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-white to-[#8fe3ce] bg-clip-text text-transparent">
              Join the Waiting List
            </h1>
            <p className="text-sm md:text-base text-[#8b949e] px-2 max-w-md mx-auto">
              Be among the first to experience KANDO — the decentralized, censorship-resistant social protocol.
            </p>
          </div>

          {/* Progress */}
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-6 md:mb-8 shadow-xl shadow-black/20">
            <div className="flex justify-between text-xs md:text-sm mb-2">
              <span className="text-[#8b949e]">Early Access Progress</span>
              <span className="text-[#2ea88a] font-mono">47% filled</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#2ea88a] to-emerald-400 rounded-full shadow-[0_0_12px_rgba(46,168,138,0.6)]" style={{ width: '47%' }} />
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-[#8b949e]">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2ea88a]" /> 2,347 already joined</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2ea88a]" /> 5,000 spots total</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1 — Personal */}
            <SectionCard step={1} title="Personal Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label required>First Name</Label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={cls(errors.firstName)} placeholder="John" />
                  {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <Label required>Last Name</Label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={cls(errors.lastName)} placeholder="Doe" />
                  {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                </div>
              </div>
            </SectionCard>

            {/* 2 — Contact */}
            <SectionCard step={2} title="Contact Information">
              <div className="space-y-4">
                <div>
                  <Label required>Email Address</Label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className={cls(errors.email)} placeholder="john@example.com" />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <Label required>Confirm Email</Label>
                  <input type="email" name="confirmEmail" value={formData.confirmEmail} onChange={handleChange} className={cls(errors.confirmEmail)} placeholder="john@example.com" />
                  {errors.confirmEmail && <p className="text-red-400 text-xs mt-1">{errors.confirmEmail}</p>}
                </div>
                <div>
                  <Label required>Username</Label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} className={cls(errors.username)} placeholder="johndoe" />
                  {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
                  <p className="text-[#6e7681] text-xs mt-1">Used for your KANDO profile</p>
                </div>
              </div>
            </SectionCard>

            {/* 3 — Social */}
            <SectionCard step={3} title="Social Links (Optional)">
              <div className="space-y-4">
                <div>
                  <Label>Discord ID</Label>
                  <input type="text" name="discordId" value={formData.discordId} onChange={handleChange} className={cls()} placeholder="username#1234" />
                </div>
                <div>
                  <Label>GitHub Username</Label>
                  <input type="text" name="githubUsername" value={formData.githubUsername} onChange={handleChange} className={cls()} placeholder="johndoe" />
                </div>
              </div>
            </SectionCard>

            {/* 4 — Additional */}
            <SectionCard step={4} title="Additional Information">
              <div className="space-y-4">
                <div>
                  <Label>Why are you interested in KANDO?</Label>
                  <textarea name="reason" value={formData.reason} onChange={handleChange} rows={3} className={`${cls()} resize-none`} placeholder="I'm interested in decentralized communication and want to contribute..." />
                </div>
                <div>
                  <Label>How did you hear about us?</Label>
                  <select name="hearAbout" value={formData.hearAbout} onChange={handleChange} className={cls()}>
                    <option value="" className="bg-[#161b22]">Select an option</option>
                    <option value="github" className="bg-[#161b22]">GitHub</option>
                    <option value="twitter" className="bg-[#161b22]">Twitter/X</option>
                    <option value="discord" className="bg-[#161b22]">Discord</option>
                    <option value="friend" className="bg-[#161b22]">Friend</option>
                    <option value="other" className="bg-[#161b22]">Other</option>
                  </select>
                </div>
              </div>
            </SectionCard>

            {/* Agreements */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-6 space-y-3 shadow-xl shadow-black/20">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} className="w-4 h-4 mt-0.5 rounded accent-[#2ea88a]" />
                <span className="text-xs md:text-sm text-[#c9d1d9] flex-1">
                  I agree to the <a href="#" className="text-[#2ea88a] hover:underline">Terms of Service</a> and <a href="#" className="text-[#2ea88a] hover:underline">Privacy Policy</a> <span className="text-red-400">*</span>
                </span>
              </label>
              {errors.agreeTerms && <p className="text-red-400 text-xs">{errors.agreeTerms}</p>}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="receiveUpdates" checked={formData.receiveUpdates} onChange={handleChange} className="w-4 h-4 mt-0.5 rounded accent-[#2ea88a]" />
                <span className="text-xs md:text-sm text-[#c9d1d9] flex-1">
                  Send me updates about KANDO development and early access
                </span>
              </label>
            </div>

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-300 text-sm">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#2ea88a] to-emerald-600 hover:from-[#3fb892] hover:to-emerald-500 text-white font-semibold text-base md:text-lg transition-all shadow-lg shadow-[#2ea88a]/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending…
                </span>
              ) : (
                'Join Waiting List →'
              )}
            </button>

            <p className="text-center text-[#6e7681] text-xs">
              By joining, you'll get priority access to beta features and exclusive updates.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
