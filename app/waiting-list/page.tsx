'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

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
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
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
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(code);
    setShowVerification(true);
    setIsSubmitting(false);
  };

  const handleVerify = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitted(true);
    setShowVerification(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const navLinks = [
    { name: 'Simulator', href: '/simulator', icon: '🎮', description: 'CANDO Protocol Simulation' },
    { name: 'Chat', href: '/chat', icon: '💬', description: 'Secure Messaging' },
    { name: 'Waiting List', href: '/waiting-list', icon: '⏳', description: 'Get Early Access' },
    { name: 'Open Source', href: '/open-source', icon: '🔓', description: 'View on GitHub' },
  ];

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-[#0d1117]">
        {isMobile && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-[#0d1117]/95 backdrop-blur-md border-b border-[#30363d]">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <Image
                    src="/KANDOlogo.png"
                    alt="KANDO Logo"
                    fill
                    className="object-contain rounded-full"
                  />
                </div>
                <span className="font-bold text-lg text-white">KANDO</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-jade transition-colors"
                aria-label="Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {isMobile && mobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed left-0 top-0 h-full w-64 bg-[#0d1117] border-r border-[#30363d] z-50 shadow-2xl pt-16">
              <div className="p-4">
                <div className="flex flex-col gap-2">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-jade/10 text-jade border-l-2 border-jade'
                            : 'hover:bg-[#161b22] text-[#c9d1d9]'
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
                <div className="border-t border-[#30363d] my-4" />
                <button className="github-button-primary w-full py-2">Sign In</button>
              </div>
            </div>
          </>
        )}

        <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-[#0d1117] border-r border-[#30363d] z-30 overflow-y-auto">
          <div className="p-4 pt-8">
            <Link href="/" className="flex items-center gap-2 mb-8 group">
              <div className="relative w-8 h-8 transition-transform group-hover:scale-105 duration-200">
                <Image
                  src="/KANDOlogo.png"
                  alt="KANDO Logo"
                  fill
                  className="object-contain rounded-full"
                />
              </div>
              <span className="font-bold text-white group-hover:text-jade transition-colors">KANDO</span>
            </Link>
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-jade/10 text-jade border-l-2 border-jade'
                        : 'hover:bg-[#161b22] text-[#c9d1d9] hover:text-jade'
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
            <div className="border-t border-[#30363d] my-6" />
            <button className="github-button-primary w-full py-2 text-sm">Sign In</button>
          </div>
        </div>

        <div className={`md:ml-64 ${isMobile ? 'pt-14' : ''}`}>
          <div className="flex items-center justify-center min-h-screen p-4 md:p-8">
            <div className="max-w-md w-full text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-jade/20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-jade" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">You're on the list! 🎉</h1>
              <p className="text-sm md:text-base text-[#8b949e] mb-4 md:mb-6">
                Thank you for joining the KANDO waiting list. You'll receive an email when early access becomes available.
              </p>
              <div className="github-card p-4 md:p-6 mb-4 md:mb-6">
                <p className="text-xs md:text-sm text-[#8b949e]">Your position on the waiting list:</p>
                <p className="text-2xl md:text-3xl font-bold text-jade mt-2">#2,348</p>
                <p className="text-xs text-[#8b949e] mt-2">out of 5,000 early access spots</p>
              </div>
              <Link href="/" className="github-button-primary inline-block w-full md:w-auto">
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d1117]">
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#0d1117]/95 backdrop-blur-md border-b border-[#30363d]">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image
                  src="/KANDOlogo.png"
                  alt="KANDO Logo"
                  fill
                  className="object-contain rounded-full"
                />
              </div>
              <span className="font-bold text-lg text-white">KANDO</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-jade transition-colors"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {isMobile && mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-[#0d1117] border-r border-[#30363d] z-50 shadow-2xl pt-16">
            <div className="p-4">
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-jade/10 text-jade border-l-2 border-jade'
                          : 'hover:bg-[#161b22] text-[#c9d1d9]'
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
              <div className="border-t border-[#30363d] my-4" />
              <button className="github-button-primary w-full py-2">Sign In</button>
            </div>
          </div>
        </>
      )}

      <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-[#0d1117] border-r border-[#30363d] z-30 overflow-y-auto">
        <div className="p-4 pt-8">
          <Link href="/" className="flex items-center gap-2 mb-8 group">
            <div className="relative w-8 h-8 transition-transform group-hover:scale-105 duration-200">
              <Image
                src="/KANDOlogo.png"
                alt="KANDO Logo"
                fill
                className="object-contain rounded-full"
              />
            </div>
            <span className="font-bold text-white group-hover:text-jade transition-colors">KANDO</span>
          </Link>
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-jade/10 text-jade border-l-2 border-jade'
                      : 'hover:bg-[#161b22] text-[#c9d1d9] hover:text-jade'
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
          <div className="border-t border-[#30363d] my-6" />
          <button className="github-button-primary w-full py-2 text-sm">Sign In</button>
        </div>
      </div>

      <div className={`md:ml-64 ${isMobile ? 'pt-14' : ''}`}>
        <div className="max-w-2xl mx-auto p-4 md:p-8 pb-20">
          <div className="text-center mb-6 md:mb-8">
            <span className="text-4xl md:text-5xl mb-2 md:mb-4 block">⏳</span>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Join the Waiting List</h1>
            <p className="text-xs md:text-sm text-[#8b949e] px-2">
              Be among the first to experience KANDO. Early access spots are limited.
            </p>
            <div className="flex flex-wrap justify-center gap-2 md:gap-4 mt-3 md:mt-4 text-xs md:text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-jade"></div>
                <span>2,347 already joined</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-jade"></div>
                <span>5,000 spots total</span>
              </div>
            </div>
          </div>

          <div className="github-card p-3 md:p-4 mb-4 md:mb-8">
            <div className="flex justify-between text-xs md:text-sm mb-2">
              <span className="text-[#8b949e]">Early Access Progress</span>
              <span className="text-jade font-mono text-xs md:text-sm">47% filled</span>
            </div>
            <div className="h-1.5 md:h-2 bg-[#30363d] rounded-full overflow-hidden">
              <div className="h-full bg-jade rounded-full" style={{ width: '47%' }}></div>
            </div>
          </div>

          {showVerification && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="github-card p-5 md:p-8 max-w-md w-full mx-4">
                <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Verify Your Email</h3>
                <p className="text-[#8b949e] text-xs md:text-sm mb-3 md:mb-4">
                  We've sent a verification code to <span className="text-jade break-all">{formData.email}</span>
                </p>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  className="w-full px-3 md:px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg focus:outline-none focus:border-jade mb-3 md:mb-4 text-sm md:text-base"
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
                <div className="flex gap-2 md:gap-3">
                  <button onClick={() => setShowVerification(false)} className="flex-1 github-button-secondary text-sm md:text-base">
                    Cancel
                  </button>
                  <button onClick={handleVerify} className="flex-1 github-button-primary text-sm md:text-base">
                    Verify
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="github-card p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <span className="text-jade text-sm md:text-base">1</span>
                <span className="text-sm md:text-base">Personal Information</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-[#c9d1d9]">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full px-3 md:px-4 py-2 bg-[#0d1117] border rounded-lg focus:outline-none focus:border-jade transition-colors text-sm md:text-base ${
                      errors.firstName ? 'border-red-500' : 'border-[#30363d]'
                    }`}
                    placeholder="John"
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-[#c9d1d9]">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full px-3 md:px-4 py-2 bg-[#0d1117] border rounded-lg focus:outline-none focus:border-jade transition-colors text-sm md:text-base ${
                      errors.lastName ? 'border-red-500' : 'border-[#30363d]'
                    }`}
                    placeholder="Doe"
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>
              </div>
            </div>

            <div className="github-card p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <span className="text-jade text-sm md:text-base">2</span>
                <span className="text-sm md:text-base">Contact Information</span>
              </h3>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-[#c9d1d9]">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 md:px-4 py-2 bg-[#0d1117] border rounded-lg focus:outline-none focus:border-jade transition-colors text-sm md:text-base ${
                      errors.email ? 'border-red-500' : 'border-[#30363d]'
                    }`}
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-[#c9d1d9]">
                    Confirm Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="confirmEmail"
                    value={formData.confirmEmail}
                    onChange={handleChange}
                    className={`w-full px-3 md:px-4 py-2 bg-[#0d1117] border rounded-lg focus:outline-none focus:border-jade transition-colors text-sm md:text-base ${
                      errors.confirmEmail ? 'border-red-500' : 'border-[#30363d]'
                    }`}
                    placeholder="john@example.com"
                  />
                  {errors.confirmEmail && <p className="text-red-500 text-xs mt-1">{errors.confirmEmail}</p>}
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-[#c9d1d9]">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full px-3 md:px-4 py-2 bg-[#0d1117] border rounded-lg focus:outline-none focus:border-jade transition-colors text-sm md:text-base ${
                      errors.username ? 'border-red-500' : 'border-[#30363d]'
                    }`}
                    placeholder="johndoe"
                  />
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                  <p className="text-[#8b949e] text-xs mt-1">Used for your KANDO profile</p>
                </div>
              </div>
            </div>

            <div className="github-card p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <span className="text-jade text-sm md:text-base">3</span>
                <span className="text-sm md:text-base">Social Links (Optional)</span>
              </h3>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-[#c9d1d9]">
                    Discord ID
                  </label>
                  <input
                    type="text"
                    name="discordId"
                    value={formData.discordId}
                    onChange={handleChange}
                    className="w-full px-3 md:px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg focus:outline-none focus:border-jade transition-colors text-sm md:text-base"
                    placeholder="username#1234"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-[#c9d1d9]">
                    GitHub Username
                  </label>
                  <input
                    type="text"
                    name="githubUsername"
                    value={formData.githubUsername}
                    onChange={handleChange}
                    className="w-full px-3 md:px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg focus:outline-none focus:border-jade transition-colors text-sm md:text-base"
                    placeholder="johndoe"
                  />
                </div>
              </div>
            </div>

            <div className="github-card p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <span className="text-jade text-sm md:text-base">4</span>
                <span className="text-sm md:text-base">Additional Information</span>
              </h3>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-[#c9d1d9]">
                    Why are you interested in KANDO?
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 md:px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg focus:outline-none focus:border-jade transition-colors resize-none text-sm md:text-base"
                    placeholder="I'm interested in decentralized communication and want to contribute..."
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-[#c9d1d9]">
                    How did you hear about us?
                  </label>
                  <select
                    name="hearAbout"
                    value={formData.hearAbout}
                    onChange={handleChange}
                    className="w-full px-3 md:px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg focus:outline-none focus:border-jade transition-colors text-sm md:text-base"
                  >
                    <option value="">Select an option</option>
                    <option value="github">GitHub</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="discord">Discord</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="github-card p-4 md:p-6">
              <div className="space-y-3">
                <label className="flex items-start gap-2 md:gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    className="w-4 h-4 mt-0.5 rounded border-[#30363d] bg-[#0d1117] focus:ring-jade focus:ring-offset-0"
                  />
                  <span className="text-xs md:text-sm text-[#c9d1d9] flex-1">
                    I agree to the <a href="#" className="text-jade hover:underline">Terms of Service</a> and <a href="#" className="text-jade hover:underline">Privacy Policy</a> <span className="text-red-500">*</span>
                  </span>
                </label>
                {errors.agreeTerms && <p className="text-red-500 text-xs">{errors.agreeTerms}</p>}
                
                <label className="flex items-start gap-2 md:gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="receiveUpdates"
                    checked={formData.receiveUpdates}
                    onChange={handleChange}
                    className="w-4 h-4 mt-0.5 rounded border-[#30363d] bg-[#0d1117] focus:ring-jade"
                  />
                  <span className="text-xs md:text-sm text-[#c9d1d9] flex-1">
                    Send me updates about KANDO development and early access
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full github-button-primary py-2.5 md:py-3 text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 md:h-5 md:w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                'Join Waiting List →'
              )}
            </button>

            <p className="text-center text-[#8b949e] text-xs">
              By joining, you'll get priority access to beta features and exclusive updates.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}