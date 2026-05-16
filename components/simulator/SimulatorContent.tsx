'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Network, Cell } from '@/lib/simulator';

const Scene2D = dynamic(() => import('@/components/Scene2D'), { ssr: false });

export default function SimulatorContent() {
  const netRef = useRef(new Network());
  const [tick, setTick] = useState(0);
  const [stats, setStats] = useState(() => netRef.current.stats());
  const [auto, setAuto] = useState(false);
  const [messageStatus, setMessageStatus] = useState<string>("");
  const [currentRing, setCurrentRing] = useState<number>(0);
  const [voteCount, setVoteCount] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showStatsBox, setShowStatsBox] = useState(true);
  const [showRuleBox, setShowRuleBox] = useState(true); 
  const timer = useRef<NodeJS.Timeout | null>(null);
  const sceneRef = useRef<{ render: () => void }>(null);

  useEffect(() => { 
    setStats(netRef.current.stats()); 
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    netRef.current.setMessageStatusCallback((status: string, ring: number, votes?: number) => {
      setMessageStatus(status);
      setCurrentRing(ring);
      if (votes !== undefined) setVoteCount(votes);
      
      setTimeout(() => {
        if (messageStatus === status) {
          if (!status.includes('stopped') && !status.includes('maximum')) {
            setMessageStatus("");
          }
        }
      }, 4000);
    });
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setStats(netRef.current.stats());
  }, [tick]);

  const step = useCallback(() => {
    netRef.current.tick();
    setTick(t => t + 1);
    sceneRef.current?.render();
  }, []);

  const toggleAuto = useCallback(() => {
    if (auto) { 
      if (timer.current) clearInterval(timer.current); 
      setAuto(false); 
    } else { 
      setAuto(true); 
      timer.current = setInterval(() => step(), 1200); 
    }
  }, [auto, step]);

  const resetSimulation = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    setAuto(false);
    window.location.reload();
  }, []);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return (
    <div className="w-full h-full bg-[#0d1117] relative">
      <Scene2D ref={sceneRef} network={netRef.current} />
      
      {messageStatus && (
        <div className={`absolute z-20 bg-[#0d1117]/95 backdrop-blur-sm rounded-lg px-3 py-2 md:px-4 md:py-3 border-l-4 border-[#2ea88a] shadow-xl max-w-[90%] md:max-w-md ${
          isMobile ? 'bottom-16 left-2 right-2' : 'bottom-20 left-4'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${messageStatus.includes('🛑') || messageStatus.includes('🏁') ? 'bg-red-500' : 'bg-[#2ea88a]'}`} />
              <span className={`text-[10px] md:text-sm font-mono ${messageStatus.includes('🛑') || messageStatus.includes('🏁') ? 'text-red-400' : 'text-[#2ea88a]'} break-words flex-1`}>
                {messageStatus}
              </span>
            </div>
            <div className="flex gap-2">
              {voteCount > 0 && (
                <span className="text-[9px] md:text-xs bg-[#2ea88a]/20 px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[#2ea88a] font-mono">
                  {voteCount}/3 YES
                </span>
              )}
              {currentRing > 0 && (
                <span className="text-[9px] md:text-xs bg-[#30363d] px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[#8b949e] font-mono">
                  Ring {currentRing}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {showRuleBox && (
        <div className={`absolute z-20 bg-[#0d1117]/90 backdrop-blur-sm rounded-lg px-2 py-1.5 md:px-3 md:py-2 border border-[#30363d] shadow-lg ${
          isMobile ? 'bottom-16 right-2' : 'bottom-4 right-4'
        }`}>
          <button
            onClick={() => setShowRuleBox(false)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#30363d] hover:bg-red-500 text-white flex items-center justify-center transition-all duration-200 z-30"
            aria-label="Close rule box"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="text-[#2ea88a] text-[8px] md:text-xs font-mono font-bold">3 Approval Rule</div>
          <div className="text-[#8b949e] text-[7px] md:text-[9px] font-mono mt-0.5">
            6 neighbors must vote
          </div>
          <div className="text-[#8b949e] text-[7px] md:text-[9px] font-mono">
            Need 3+ YES to spread
          </div>
          <div className="text-[#8b949e] text-[7px] md:text-[9px] font-mono">
            Spreads ring by ring
          </div>
        </div>
      )}

      {!showRuleBox && (
        <button
          onClick={() => setShowRuleBox(true)}
          className={`absolute z-20 bg-[#2ea88a] hover:bg-[#3fb892] text-white rounded-full p-1.5 md:p-2 shadow-lg transition-all duration-200 ${
            isMobile ? 'bottom-16 right-2' : 'bottom-4 right-4'
          }`}
          aria-label="Show rules"
        >
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}
      
      {/* فقط این بخش تغییر کرده - موقعیت دکمه‌ها */}
      <div className={`absolute z-20 pointer-events-auto flex gap-2 md:gap-3 ${
        isMobile 
          ? 'left-3 top-1/2 -translate-y-1/2 flex-col' 
          : 'bottom-3 left-1/2 -translate-x-1/2'
      }`}>
        <button 
          onClick={step} 
          className="px-3 md:px-5 py-1.5 md:py-2 bg-[#2ea88a] hover:bg-[#3fb892] text-white rounded-lg text-xs md:text-sm font-medium transition-all shadow-lg"
        >
          STEP
        </button>
        <button 
          onClick={toggleAuto} 
          className={`px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all shadow-lg ${
            auto ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2ea88a] hover:bg-[#3fb892]'
          } text-white`}
        >
          {auto ? 'STOP' : 'AUTO'}
        </button>
        <button 
          onClick={resetSimulation} 
          className="px-3 md:px-5 py-1.5 md:py-2 bg-[#161b22] border border-[#30363d] hover:border-[#2ea88a] hover:text-[#2ea88a] rounded-lg text-xs md:text-sm font-medium transition-all shadow-lg"
        >
          RESET
        </button>
      </div>

      {showStatsBox && (
        <div className={`absolute z-20 bg-[#0d1117]/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-[#30363d] shadow-lg ${
          isMobile ? 'top-2 left-2 right-2' : 'top-20 left-3'
        }`}>
          <button
            onClick={() => setShowStatsBox(false)}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#30363d] hover:bg-red-500 text-white flex items-center justify-center transition-all duration-200 z-30"
            aria-label="Close stats box"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="grid grid-cols-3 gap-x-3 md:gap-x-4 gap-y-1 text-[10px] md:text-xs">
            <div className="flex justify-between gap-2 md:gap-3">
              <span className="text-[#8b949e]">DAY:</span>
              <span className="text-[#2ea88a] font-mono font-bold">{stats.day}</span>
            </div>
            <div className="flex justify-between gap-2 md:gap-3">
              <span className="text-[#8b949e]">ALIVE:</span>
              <span className="text-[#2ea88a] font-mono font-bold">{stats.alive}</span>
            </div>
            <div className="flex justify-between gap-2 md:gap-3">
              <span className="text-[#8b949e]">CITIZENS:</span>
              <span className="text-[#2ea88a] font-mono font-bold">{stats.citizens}</span>
            </div>
            <div className="flex justify-between gap-2 md:gap-3">
              <span className="text-[#8b949e]">CANDIDATES:</span>
              <span className="text-[#2ea88a] font-mono font-bold">{stats.candidates}</span>
            </div>
            <div className="flex justify-between gap-2 md:gap-3">
              <span className="text-[#8b949e]">TEMPORARY:</span>
              <span className="text-[#2ea88a] font-mono font-bold">{stats.temporary}</span>
            </div>
            <div className="flex justify-between gap-2 md:gap-3">
              <span className="text-[#8b949e]">DEAD:</span>
              <span className="text-[#2ea88a] font-mono font-bold">{stats.dead}</span>
            </div>
          </div>
        </div>
      )}

      {!showStatsBox && (
        <button
          onClick={() => setShowStatsBox(true)}
          className={`absolute z-20 bg-[#2ea88a] hover:bg-[#3fb892] text-white rounded-full p-2 shadow-lg transition-all duration-200 ${
            isMobile ? 'top-2 left-2' : 'top-20 left-3'
          }`}
          aria-label="Show stats"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      )}
    </div>
  );
}