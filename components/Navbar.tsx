'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const links = [
  { name: 'Simulator', href: '/simulator' },
  { name: 'Chat', href: '/chat' },
  { name: 'Waiting List', href: '/waiting-list' },
  { name: 'Open Source', href: '/open-source' },
  { name: 'Docs', href: '/docs' },
];

/** Shared site navbar. `solid` keeps the dark blurred background always on
 *  (for inner pages); on the homepage it stays transparent until you scroll. */
export default function Navbar({ solid = false, animateIn = false }: { solid?: boolean; animateIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showBg = solid || scrolled;

  return (
    <>
      <motion.nav
        initial={animateIn ? { y: -110, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${showBg ? 'bg-black/60 backdrop-blur-md border-b border-white/10' : 'bg-transparent'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link href="/" className="flex items-center gap-2 group relative z-50">
              <div className="relative w-8 h-8 md:w-9 md:h-9 transition-transform group-hover:scale-105 duration-200">
                <Image src="/KANDOlogo.png" alt="KANDO Logo" fill className="object-contain rounded-full" priority />
              </div>
              <span className="font-bold text-lg md:text-xl tracking-tight text-white">KANDO</span>
            </Link>

            <div className="hidden md:flex items-center gap-7 lg:gap-9">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link key={l.name} href={l.href} className={`transition-colors text-sm font-medium ${active ? 'text-[#2ea88a]' : 'text-white/65 hover:text-white'}`}>
                    {l.name}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <Link href="/waiting-list" className="hidden md:inline-flex px-4 py-2 rounded-full bg-white text-black text-sm font-medium transition-transform duration-200 hover:scale-[1.03]">
                Get early access
              </Link>
              <button onClick={() => setOpen(!open)} className="md:hidden relative z-50 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors" aria-label="Toggle menu">
                <div className="relative w-5 h-5">
                  <span className={`absolute block w-5 h-0.5 bg-white transition-all duration-300 ${open ? 'rotate-45 top-2' : 'top-0.5'}`} />
                  <span className={`absolute block w-5 h-0.5 bg-white transition-all duration-300 top-2 ${open ? 'opacity-0' : ''}`} />
                  <span className={`absolute block w-5 h-0.5 bg-white transition-all duration-300 ${open ? '-rotate-45 top-2' : 'top-3.5'}`} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.3 }}
              className="absolute right-0 top-0 h-full w-72 bg-black border-l border-white/10 p-6 pt-24" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-1">
                {links.map((l) => {
                  const active = pathname === l.href;
                  return (
                    <Link key={l.name} href={l.href} onClick={() => setOpen(false)} className={`block px-4 py-3 rounded-xl transition-colors font-medium ${active ? 'text-[#2ea88a] bg-white/5' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
                      {l.name}
                    </Link>
                  );
                })}
              </div>
              <Link href="/waiting-list" onClick={() => setOpen(false)} className="mt-6 flex items-center justify-center px-4 py-3 rounded-full bg-white text-black font-medium">Get early access</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
