'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import FeatureSlider from '@/components/FeatureSlider';

const ThreeScene = dynamic(() => import('@/components/ThreeScene'), { ssr: false });
const SimulatorContent = dynamic(() => import('@/components/simulator/SimulatorContent'), { ssr: false });

export default function SimulatorPage() {
  const [isSliderOpen, setIsSliderOpen] = useState(true);

  return (
    <main className="min-h-screen flex flex-col">
      <ThreeScene />
      <Navbar />
      
      <div className="flex flex-1">
        <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-[#0d1117]/95 backdrop-blur-md border-r border-[#30363d] transition-all duration-300 z-30 ${
          isSliderOpen ? 'w-80' : 'w-16'
        }`}>
          <button
            onClick={() => setIsSliderOpen(!isSliderOpen)}
            className="absolute -right-3 top-6 bg-[#161b22] border border-[#30363d] rounded-full p-1.5 hover:border-jade transition-colors z-50"
          >
            <svg className={`w-4 h-4 transition-transform duration-300 ${isSliderOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="h-full overflow-y-auto pt-6">
            {isSliderOpen ? (
              <div className="px-4">
                <FeatureSlider />
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 gap-6">
                <div className="flex flex-col gap-4">
                  <Link href="/simulator" className="text-2xl hover:scale-110 transition-transform">🎮</Link>
                  <Link href="/chat" className="text-2xl hover:scale-110 transition-transform">💬</Link>
                  <Link href="/waiting-list" className="text-2xl hover:scale-110 transition-transform">⏳</Link>
                  <Link href="/open-source" className="text-2xl hover:scale-110 transition-transform">🔓</Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`flex-1 transition-all duration-300 ${isSliderOpen ? 'ml-80' : 'ml-16'}`}>
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">
                <span className="text-jade">CANDO</span> Protocol Simulator
              </h1>
              <p className="text-[#8b949e] mt-2">Hexagonal network simulation - watch the hive grow!</p>
            </div>
            
            <SimulatorContent />
          </div>
        </div>
      </div>
    </main>
  );
}