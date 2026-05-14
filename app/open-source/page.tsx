'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function OpenSourcePage() {
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

  const repoStats = {
    stars: '2.4k',
    forks: '189',
    contributors: '47',
    license: 'AGPL-3.0',
    lastUpdated: 'May 12, 2026',
    repoUrl: 'https://github.com/comfyuse/Kando',
    whitepaperUrl: 'https://github.com/comfyuse/Kando/blob/main/KANDO%20Whitepaper%20(v1.0).md',
    description: 'KandoNet is the opensource organization behind KANDO, a decentralized, censorship-resistant, and gas-free social network protocol.',
    features: [
      { icon: '🔒', title: 'Censorship‑Resistant', description: 'Works over internet and offline mesh (Bluetooth, Wi‑Fi Direct, LoRa)' },
      { icon: '⛽️', title: 'Gas‑Free', description: 'Zero transaction costs – no blockchain, no tokens, no hidden fees' },
      { icon: '🌐', title: 'Decentralised', description: 'DHT‑based, self‑healing network with local voting and relocation' },
      { icon: '🧠', title: 'Complex Contagion', description: '3‑approval rule stops fake news and spam at the first ring' },
      { icon: '🆔', title: 'Portable Identity', description: 'Non‑transferable cNFT / DID passport – use across all KANDO‑compatible apps' },
      { icon: '🧩', title: 'Open Source', description: 'AGPLv3 licensed – transparent, auditable, and community‑driven' },
    ],
    roadmap: [
      { phase: 'Phase 0', title: 'Whitepaper, simulator, utility model filing', status: '✅ Completed', timeframe: 'Q1‑Q2 2026' },
      { phase: 'Phase 1', title: 'Go‑libp2p MVP (DHT, GossipSub, 3‑approval, co‑eclosion)', status: '🔄 In progress', timeframe: 'Q3‑Q4 2026' },
      { phase: 'Phase 2', title: 'Public testnet (100+ nodes, user client)', status: '⏳ Planned', timeframe: 'Q1‑Q2 2027' },
      { phase: 'Phase 3', title: 'Mainnet, mobile apps (iOS/Android), mesh radio integration', status: '⏳ Planned', timeframe: 'Q3‑Q4 2027' },
    ],
  };

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

      <div className={`md:ml-64 ${isMobile ? 'pt-14' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jade/10 border border-jade/20 mb-4">
              <span className="w-2 h-2 rounded-full bg-jade animate-pulse"></span>
              <span className="text-xs text-jade font-medium">OPEN SOURCE · AGPL-3.0</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Built in the Open
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-[#8b949e] max-w-2xl mx-auto">
              KANDO is 100% open source. Audit, contribute, fork – it's all yours.
            </p>
          </div>

          <div className="github-card p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <h2 className="text-2xl font-bold text-white">KANDO</h2>
                  <span className="px-2 py-1 text-xs rounded-full border border-[#30363d] text-jade">
                    TypeScript / Go
                  </span>
                </div>
                <p className="text-[#8b949e] mb-4 text-sm md:text-base">
                  {repoStats.description}
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href={repoStats.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="github-button-primary flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48 0-.24-.01-.9-.01-1.75-2.78.6-3.37-1.2-3.37-1.2-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.26.1-2.62 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.36.2 2.37.1 2.62.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .26.18.58.69.48C19.13 20.17 22 16.42 22 12c0-5.52-4.48-10-10-10z"/>
                  </svg>
                  GitHub Repository
                </a>
                <a
                  href={repoStats.whitepaperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="github-button-secondary text-sm"
                >
                  📄 Whitepaper
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="github-card p-4 text-center">
              <div className="text-3xl mb-1">⭐</div>
              <div className="text-2xl font-bold text-jade">{repoStats.stars}</div>
              <div className="text-xs text-[#8b949e]">GitHub Stars</div>
            </div>
            <div className="github-card p-4 text-center">
              <div className="text-3xl mb-1">⑂</div>
              <div className="text-2xl font-bold text-jade">{repoStats.forks}</div>
              <div className="text-xs text-[#8b949e]">Forks</div>
            </div>
            <div className="github-card p-4 text-center">
              <div className="text-3xl mb-1">👥</div>
              <div className="text-2xl font-bold text-jade">{repoStats.contributors}</div>
              <div className="text-xs text-[#8b949e]">Contributors</div>
            </div>
            <div className="github-card p-4 text-center">
              <div className="text-3xl mb-1">📜</div>
              <div className="text-sm font-bold text-jade">{repoStats.license}</div>
              <div className="text-xs text-[#8b949e]">License</div>
            </div>
          </div>

          <div className="github-card p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">🔑 Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repoStats.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="text-2xl">{feature.icon}</span>
                  <div>
                    <div className="font-semibold text-white text-sm">{feature.title}</div>
                    <div className="text-xs text-[#8b949e]">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="github-card p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">🛣 Roadmap</h3>
            <div className="space-y-3">
              {repoStats.roadmap.map((item, idx) => (
                <div key={idx} className="flex flex-wrap justify-between items-center p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                  <div>
                    <span className="font-semibold text-white text-sm">{item.phase}:</span>
                    <span className="text-sm text-[#c9d1d9] ml-2">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${
                      item.status.includes('✅') ? 'text-jade' : 
                      item.status.includes('🔄') ? 'text-amber-500' : 'text-[#8b949e]'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-xs text-[#8b949e]">{item.timeframe}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="github-card p-8 text-center border-l-4 border-jade">
            <h3 className="text-xl font-bold text-white mb-2">🐝 Want to contribute?</h3>
            <p className="text-[#8b949e] mb-6 max-w-2xl mx-auto text-sm">
              We welcome contributors of all sizes. From Go‑libp2p development to documentation – every help matters.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href={`${repoStats.repoUrl}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="github-button-primary"
              >
                Browse Issues
              </a>
              <a
                href={`${repoStats.repoUrl}/fork`}
                target="_blank"
                rel="noopener noreferrer"
                className="github-button-secondary"
              >
                Fork Repository
              </a>
            </div>
            <div className="mt-6 pt-6 border-t border-[#30363d] text-xs text-[#8b949e]">
              📜 Code: <strong>AGPL-3.0</strong> · Whitepaper: <strong>CC BY-SA 4.0</strong><br />
              🗃 Utility model filed with the Estonian Patent Office
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}