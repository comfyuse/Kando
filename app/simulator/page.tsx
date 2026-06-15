'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';

const SimulatorContent = dynamic(() => import('@/components/simulator/SimulatorContent'), { ssr: false });

export default function SimulatorPage() {
  useEffect(() => {
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <main className="h-screen flex flex-col bg-black overflow-hidden">
      <Navbar solid />
      {/* Simulator content is intentionally left untouched */}
      <div className="flex-1 flex flex-col min-h-0 pt-16 md:pt-20">
        <div className="flex-1 min-h-0">
          <SimulatorContent />
        </div>
      </div>
    </main>
  );
}
