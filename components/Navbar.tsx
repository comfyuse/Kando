'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const navLinks = [
    { name: 'Simulator', href: '/simulator', icon: '🎮' },
    { name: 'Chat', href: '/chat', icon: '💬' },
    { name: 'Waiting List', href: '/waiting-list', icon: '⏳' },
    { name: 'Open Source', href: '/open-source', icon: '🔓' },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#0d1117]/95 backdrop-blur-md border-b border-[#30363d]' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link href="/" className="flex items-center gap-2 group relative z-50">
              <div className="relative w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:scale-105 duration-200">
                <Image
                  src="/KANDOlogo.png"
                  alt="KANDO Logo"
                  fill
                  className="object-contain rounded-full"
                  priority
                />
              </div>
              <span className="font-bold text-lg md:text-xl tracking-tight transition-colors group-hover:text-jade">
                KANDO
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-[#c9d1d9] hover:text-jade transition-colors text-sm font-medium"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button className="hidden md:block github-button-primary">
                Sign In
              </button>
              
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden relative z-50 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#161b22] transition-colors"
                aria-label="Toggle menu"
              >
                <div className="relative w-5 h-5">
                  <span className={`absolute block w-5 h-0.5 bg-white transition-all duration-300 ease-in-out ${
                    isOpen ? 'rotate-45 top-2' : 'top-0.5'
                  }`} />
                  <span className={`absolute block w-5 h-0.5 bg-white transition-all duration-300 ease-in-out top-2 ${
                    isOpen ? 'opacity-0' : ''
                  }`} />
                  <span className={`absolute block w-5 h-0.5 bg-white transition-all duration-300 ease-in-out ${
                    isOpen ? '-rotate-45 top-2' : 'top-3.5'
                  }`} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute right-0 top-0 h-full w-72 bg-[#0d1117] shadow-2xl border-l border-[#30363d]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8">
                    <Image
                      src="/KANDOlogo.png"
                      alt="KANDO Logo"
                      fill
                      className="object-contain rounded-full"
                    />
                  </div>
                  <span className="font-bold text-white">KANDO</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#161b22] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="py-6 px-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#161b22] transition-colors group"
                  >
                    <span className="text-2xl">{link.icon}</span>
                    <div>
                      <div className="text-white font-medium group-hover:text-jade transition-colors">
                        {link.name}
                      </div>
                      <div className="text-xs text-[#8b949e]">
                        {link.name === 'Simulator' && 'Try the KANDO protocol'}
                        {link.name === 'Chat' && 'Secure messaging'}
                        {link.name === 'Waiting List' && 'Get early access'}
                        {link.name === 'Open Source' && 'View on GitHub'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="border-t border-[#30363d] my-4" />

              <div className="px-4 space-y-3">
                <button className="github-button-primary w-full py-3">
                  Sign In
                </button>
                <button className="github-button-secondary w-full py-3">
                  Get Started
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#30363d]">
                <div className="flex justify-center gap-6">
                  <a href="#" className="text-xs text-[#8b949e] hover:text-jade transition-colors">Privacy</a>
                  <a href="#" className="text-xs text-[#8b949e] hover:text-jade transition-colors">Terms</a>
                  <a href="#" className="text-xs text-[#8b949e] hover:text-jade transition-colors">Contact</a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}