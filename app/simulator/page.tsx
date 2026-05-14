'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const SimulatorContent = dynamic(() => import('@/components/simulator/SimulatorContent'), { ssr: false });

export default function SimulatorPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

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

  const navLinks = [
    { name: 'Simulator', href: '/simulator', icon: '🎮', description: 'CANDO Protocol Simulation' },
    { name: 'Chat', href: '/chat', icon: '💬', description: 'Secure Messaging' },
    { name: 'Waiting List', href: '/waiting-list', icon: '⏳', description: 'Get Early Access' },
    { name: 'Open Source', href: '/open-source', icon: '🔓', description: 'View on GitHub' },
  ];

  return (
    <main className="h-screen flex flex-col bg-[#0d1117] overflow-hidden">
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
          <div 
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
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
            <span className="font-bold text-white group-hover:text-jade transition-colors">
              KANDO
            </span>
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

      <div className={`flex-1 flex flex-col min-h-0 ${!isMobile ? 'md:ml-64' : 'mt-14'} transition-all duration-300`}>
        <div className="flex-1 min-h-0">
          <SimulatorContent />
        </div>
      </div>
    </main>
  );
}