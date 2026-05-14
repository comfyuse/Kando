'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const SimulatorContent = lazy(() => import('@/components/simulator/SimulatorContent'));

const features = [
  {
    id: 'simulator',
    title: 'Simulator',
    icon: '🎮',
    description: 'CANDO Protocol - Hexagonal Network Simulation',
    href: '/simulator',
  },
  {
    id: 'chat-app',
    title: 'Chat App',
    icon: '💬',
    description: 'End-to-end encrypted messaging',
    href: '/chat',
  },
  {
    id: 'waiting-list',
    title: 'Waiting List',
    icon: '⏳',
    description: 'Early access to beta features',
    href: '/waiting-list',
  },
  {
    id: 'open-source',
    title: 'Open Source',
    icon: '🔓',
    description: 'MIT licensed. Community driven',
    href: '/open-source',
  },
];

export default function FeatureSlider() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-1 md:gap-2">
        {features.map((feature) => {
          const isActive = pathname === feature.href;
          return (
            <Link
              key={feature.id}
              href={feature.href}
              className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-[#2ea88a]/10 border-l-2 border-jade'
                  : 'hover:bg-[#161b22]'
              }`}
            >
              <span className="text-xl md:text-2xl">{feature.icon}</span>
              <div className="flex-1 text-left min-w-0">
                <div className={`font-medium text-sm md:text-base truncate ${isActive ? 'text-jade' : 'text-[#c9d1d9]'}`}>
                  {feature.title}
                </div>
                {!isMobile && (
                  <div className="text-[10px] md:text-xs text-[#8b949e] truncate hidden sm:block">
                    {feature.description}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}