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
  // لینک صحیح برای فایل PDF در گیت‌هاب
  whitepaperUrl: "https://raw.githubusercontent.com/comfyuse/Kando/main/KANDO-WHITPAPERV1.0.pdf",
  contributorsUrl: "https://github.com/comfyuse/Kando/graphs/contributors",
  issuesUrl: "https://github.com/comfyuse/Kando/issues",
  forkUrl: "https://github.com/comfyuse/Kando/fork"
};

export default function OpenSourcePage() {
  const [isMobile, setIsMobile] = useState(false);

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

  return (
    <main className="min-h-screen bg-[#0d1117]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jade/10 border border-jade/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-jade animate-pulse"></span>
            <span className="text-xs text-jade font-medium">OPEN SOURCE · AGPL-3.0</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Built in the Open
          </h1>
          <p className="text-lg text-[#8b949e]">
            KANDO is 100% open source. Audit, contribute, fork – it's all yours.
          </p>
        </div>

        {/* Main Card */}
        <div className="github-card p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <h2 className="text-2xl font-bold text-white">KANDO</h2>
                <span className="px-2 py-1 text-xs rounded-full border border-[#30363d] text-jade">
                  {repoStats.language}
                </span>
              </div>
              <p className="text-[#8b949e] mb-4">
                {repoStats.description}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {repoStats.topics.slice(0, 5).map((topic) => (
                  <span key={topic} className="px-2 py-1 text-xs rounded-full bg-jade/10 text-jade">
                    #{topic}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href={repoStats.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="github-button-primary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48 0-.24-.01-.9-.01-1.75-2.78.6-3.37-1.2-3.37-1.2-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.26.1-2.62 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.36.2 2.37.1 2.62.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .26.18.58.69.48C19.13 20.17 22 16.42 22 12c0-5.52-4.48-10-10-10z"/>
                </svg>
                GitHub Repository
              </a>
              {/* دکمه Whitepaper با لینک مستقیم به فایل PDF */}
              <a
                href={repoStats.whitepaperUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="github-button-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Whitepaper
              </a>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="github-card p-4 text-center">
            <div className="text-3xl mb-1">⭐</div>
            <div className="text-2xl font-bold text-jade">{repoStats.stars}k+</div>
            <div className="text-xs text-[#8b949e]">Stars</div>
          </div>
          <div className="github-card p-4 text-center">
            <div className="text-3xl mb-1">⑂</div>
            <div className="text-2xl font-bold text-jade">{repoStats.forks}+</div>
            <div className="text-xs text-[#8b949e]">Forks</div>
          </div>
          <div className="github-card p-4 text-center">
            <div className="text-3xl mb-1">⚠️</div>
            <div className="text-2xl font-bold text-jade">{repoStats.openIssues}</div>
            <div className="text-xs text-[#8b949e]">Open Issues</div>
          </div>
          <div className="github-card p-4 text-center">
            <div className="text-3xl mb-1">👁️</div>
            <div className="text-2xl font-bold text-jade">{repoStats.watchers}</div>
            <div className="text-xs text-[#8b949e]">Watchers</div>
          </div>
        </div>

        {/* License and Last Updated */}
        <div className="github-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="text-sm text-[#8b949e]">License</div>
            <div className="text-white font-mono text-lg">{repoStats.license}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-[#8b949e]">Last updated</div>
            <div className="text-white">{repoStats.lastUpdated}</div>
          </div>
          <a
            href={repoStats.contributorsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-jade hover:underline text-sm"
          >
            View all contributors →
          </a>
        </div>

        {/* Key Features */}
        <div className="github-card p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-4">🔑 Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div><div className="font-semibold text-white">Censorship‑Resistant</div><div className="text-sm text-[#8b949e]">Works over internet and offline mesh</div></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⛽️</span>
              <div><div className="font-semibold text-white">Gas‑Free</div><div className="text-sm text-[#8b949e]">Zero transaction costs – no blockchain</div></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌐</span>
              <div><div className="font-semibold text-white">Decentralised</div><div className="text-sm text-[#8b949e]">DHT‑based, self‑healing network</div></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🧠</span>
              <div><div className="font-semibold text-white">3‑Approval Rule</div><div className="text-sm text-[#8b949e]">Complex contagion stops fake news</div></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🆔</span>
              <div><div className="font-semibold text-white">Portable Identity</div><div className="text-sm text-[#8b949e]">Non‑transferable cNFT / DID passport</div></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🧩</span>
              <div><div className="font-semibold text-white">Open Source</div><div className="text-sm text-[#8b949e]">AGPLv3 licensed – transparent, auditable</div></div>
            </div>
          </div>
        </div>

        {/* CTA - Contribute */}
        <div className="github-card p-8 text-center border-l-4 border-jade">
          <h3 className="text-xl font-bold text-white mb-2">🐝 Want to contribute?</h3>
          <p className="text-[#8b949e] mb-6 max-w-2xl mx-auto">
            We welcome contributors of all sizes. From Go‑libp2p development to documentation – every help matters.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={repoStats.issuesUrl} target="_blank" rel="noopener noreferrer" className="github-button-primary">Browse Issues</a>
            <a href={repoStats.forkUrl} target="_blank" rel="noopener noreferrer" className="github-button-secondary">Fork Repository</a>
            <a href={repoStats.whitepaperUrl} target="_blank" rel="noopener noreferrer" className="github-button-secondary">📄 Read Whitepaper</a>
          </div>
          <div className="mt-6 pt-6 border-t border-[#30363d] text-xs text-[#8b949e]">
            📜 Code: <strong>AGPL-3.0</strong> · Whitepaper: <strong>CC BY-SA 4.0</strong>
          </div>
        </div>
      </div>
    </main>
  );
}