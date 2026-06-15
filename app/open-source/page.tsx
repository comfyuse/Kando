'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';

// اطلاعات واقعی برگرفته از مخزن شما
const repoStats = {
  stars: 2.4,
  forks: 189,
  openIssues: 47,
  watchers: 47,
  language: "TypeScript / Go",
  license: "AGPL-3.0",
  lastUpdated: "May 2026",
  description: "KandoNet is the opensource organization behind KANDO, a decentralized, censorship-resistant, and gas-free social network protocol.",
  topics: ["p2p-network", "libp2p", "decentralized-social-network", "censorship-resistance", "nlnet-grant", "agplv3"],
  repoUrl: "https://github.com/comfyuse/Kando",
  contributorsUrl: "https://github.com/comfyuse/Kando/graphs/contributors",
  issuesUrl: "https://github.com/comfyuse/Kando/issues",
  forkUrl: "https://github.com/comfyuse/Kando/fork",
  localPdfPath: "/KANDO_The_Digital_Hive.pdf"
};

export default function OpenSourcePage() {
  const [isMobile, setIsMobile] = useState(false);
  const [pdfScale, setPdfScale] = useState(1);

  useEffect(() => {
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // تنظیم مقیاس PDF بر اساس عرض صفحه
      if (window.innerWidth < 640) {
        setPdfScale(0.55);
      } else if (window.innerWidth < 768) {
        setPdfScale(0.7);
      } else if (window.innerWidth < 1024) {
        setPdfScale(0.85);
      } else {
        setPdfScale(1);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <main className="min-h-screen bg-black">
      <Navbar solid />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jade/10 border border-jade/20 mb-5">
            <span className="w-2 h-2 rounded-full bg-jade animate-pulse"></span>
            <span className="text-xs text-jade font-medium">OPEN SOURCE · AGPL-3.0</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
            Built in the Open
          </h1>
          <p className="text-base md:text-lg text-[#8b949e]">
            KANDO is 100% open source. Audit, contribute, fork – it's all yours.
          </p>
        </div>

        {/* Main Card */}
        <div className="github-card p-5 md:p-7 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <h2 className="text-xl md:text-2xl font-bold text-white">KANDO</h2>
                <span className="px-2 py-1 text-xs rounded-full border border-[#30363d] text-jade">
                  {repoStats.language}
                </span>
              </div>
              <p className="text-sm md:text-base text-[#8b949e] mb-4">
                {repoStats.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {repoStats.topics.slice(0, 5).map((topic) => (
                  <span key={topic} className="px-2 py-1 text-xs rounded-full bg-jade/10 text-jade">
                    #{topic}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <a
                href={repoStats.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="github-button-primary flex items-center gap-2 w-full md:w-auto justify-center"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48 0-.24-.01-.9-.01-1.75-2.78.6-3.37-1.2-3.37-1.2-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.26.1-2.62 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.36.2 2.37.1 2.62.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .26.18.58.69.48C19.13 20.17 22 16.42 22 12c0-5.52-4.48-10-10-10z"/>
                </svg>
                GitHub Repository
              </a>
            </div>
          </div>
        </div>

        {/* PDF Reader Section */}
        <div className="github-card p-4 md:p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#30363d]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-jade/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-jade" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold text-white">KANDO Visual Deck</h3>
                <p className="text-xs text-[#8b949e]">The Digital Hive — Decentralized Social Network Protocol</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPdfScale(prev => Math.max(0.4, prev - 0.1))}
                className="p-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
                aria-label="Zoom out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <span className="text-xs text-[#8b949e] px-2 min-w-[45px] text-center">{Math.round(pdfScale * 100)}%</span>
              <button
                onClick={() => setPdfScale(prev => Math.min(1.5, prev + 0.1))}
                className="p-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
                aria-label="Zoom in"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
              <a
                href={repoStats.localPdfPath}
                download
                className="p-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
                aria-label="Download PDF"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </div>
          </div>
          
          {/* PDF Viewer */}
          <div className="relative w-full overflow-auto rounded-lg bg-[#161b22] border border-[#30363d]" style={{ height: isMobile ? '450px' : '650px' }}>
            <div className="flex justify-center p-2 md:p-4">
              <div style={{ transform: `scale(${pdfScale})`, transformOrigin: 'center top', transition: 'transform 0.2s ease' }}>
                <iframe
                  src={`${repoStats.localPdfPath}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full"
                  style={{ width: isMobile ? '700px' : '800px', height: isMobile ? '400px' : '600px', border: 'none' }}
                  title="KANDO Visual Deck PDF Viewer"
                />
              </div>
            </div>
          </div>
          
          {/* PDF info bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mt-4 pt-3 border-t border-[#30363d] text-xs text-[#8b949e]">
            <div className="flex items-center gap-4">
              <span>📄 PDF Document</span>
              <span>🔒 Read-only preview</span>
            </div>
            <div className="flex items-center gap-3">
              <span>💡 Tip: Use zoom buttons for better readability</span>
            </div>
          </div>
        </div>

        {/* CTA - Contribute */}
        <div className="github-card p-6 md:p-8 text-center border-l-4 border-jade">
          <h3 className="text-lg md:text-xl font-bold text-white mb-2">🐝 Want to contribute?</h3>
          <p className="text-sm md:text-base text-[#8b949e] mb-5 max-w-2xl mx-auto">
            We welcome contributors of all sizes. From Go‑libp2p development to documentation – every help matters.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={repoStats.issuesUrl} target="_blank" rel="noopener noreferrer" className="github-button-primary text-sm md:text-base">Browse Issues</a>
            <a href={repoStats.forkUrl} target="_blank" rel="noopener noreferrer" className="github-button-secondary text-sm md:text-base">Fork Repository</a>
          </div>
          <div className="mt-6 pt-5 border-t border-[#30363d] text-xs text-[#8b949e]">
            📜 Code: <strong>AGPL-3.0</strong> · Whitepaper: <strong>CC BY-SA 4.0</strong>
          </div>
        </div>
      </div>
    </main>
  );
}