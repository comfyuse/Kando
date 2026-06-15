'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function DocumentationPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState('abstract');

  useEffect(() => {
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Handle scroll spy
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      const scrollPosition = window.scrollY + 100;
      
      for (const section of sections) {
        const sectionTop = (section as HTMLElement).offsetTop;
        const sectionBottom = sectionTop + (section as HTMLElement).offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          setActiveSection(section.id);
          break;
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  const sections = [
    { id: 'abstract', title: 'Abstract', icon: '📄' },
    { id: 'introduction', title: 'Introduction', icon: '🔍' },
    { id: 'problem', title: 'Problem Statement', icon: '⚠️' },
    { id: 'architecture', title: 'Main Architecture', icon: '🏗️' },
    { id: 'hexagonal', title: 'Hexagonal Topology', icon: '🔷' },
    { id: 'rule-of-3', title: 'Rule of 3 Confirmations', icon: '✅' },
    { id: 'optical', title: 'Optical Channels', icon: '💡' },
    { id: 'citizenship', title: 'Citizenship Protocol', icon: '👥' },
    { id: 'inactive-nodes', title: 'Managing Inactive Nodes', icon: '⏰' },
    { id: 'two-layer', title: 'Two-Layer Architecture', icon: '🌐' },
    { id: 'storage', title: 'DHT Storage', icon: '💾' },
    { id: 'rewards', title: 'Reward Layer', icon: '🎮' },
    { id: 'benefits', title: 'Technical Benefits', icon: '📊' },
    { id: 'comparison', title: 'Comparison', icon: '⚖️' },
    { id: 'use-cases', title: 'Use Cases', icon: '🎯' },
    { id: 'ip', title: 'IP & Open Source', icon: '⚖️' },
    { id: 'roadmap', title: 'Roadmap', icon: '🗺️' },
    { id: 'call-to-action', title: 'Call to Action', icon: '📢' },
  ];

  return (
    <main className="min-h-screen bg-black">
      <Navbar solid />

      <div className="flex">
        {/* Sidebar Navigation - Desktop */}
        <aside className="hidden lg:block fixed left-0 top-24 bottom-0 w-72 overflow-y-auto border-r border-[#30363d] bg-[#0d1117]/95 backdrop-blur-sm z-40">
          <div className="p-6">
            <div className="mb-6 pb-4 border-b border-[#30363d]">
              <h2 className="text-lg font-bold text-white">KANDO Whitepaper</h2>
              <p className="text-xs text-[#8b949e] mt-1">Version 1.1</p>
            </div>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                    activeSection === section.id
                      ? 'bg-jade/10 text-jade border-l-2 border-jade'
                      : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
                  }`}
                >
                  <span className="text-base">{section.icon}</span>
                  <span>{section.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 lg:ml-72">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            
            {/* Hero Section */}
            <div className="text-center mb-12 pb-8 border-b border-[#30363d]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jade/10 border border-jade/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-jade animate-pulse"></span>
                <span className="text-xs text-jade font-medium">TECHNICAL WHITEPAPER · V1.1</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                KANDO Protocol
              </h1>
              <p className="text-xl text-[#8b949e] max-w-2xl mx-auto">
                A Decentralized, Censorship-Resistant, and Gas-Free Social Network
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-6">
                <a href="https://github.com/comfyuse/Kando" target="_blank" rel="noopener noreferrer" className="github-button-secondary flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48 0-.24-.01-.9-.01-1.75-2.78.6-3.37-1.2-3.37-1.2-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.26.1-2.62 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.36.2 2.37.1 2.62.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .26.18.58.69.48C19.13 20.17 22 16.42 22 12c0-5.52-4.48-10-10-10z"/>
                  </svg>
                  GitHub Repository
                </a>
              </div>
            </div>

            {/* Abstract Section */}
            <section id="abstract" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-jade/20 flex items-center justify-center">
                  <span className="text-lg">📄</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Abstract</h2>
              </div>
              <div className="github-card p-6">
                <p className="text-[#e6edf3] leading-relaxed">
                  KANDO is a completely decentralized social network with free gas (no payment). This platform is based on hexagons similar to the structure of a beehive. From the center of the hive, each cell has six neighbors. There is one user in each cell. The location of these people is determined by the coordinate axis (q, r). In this system, content contagion is based on the rule of 3 confirmations derived from Damon Centola's theory of complex contagion.
                </p>
                <p className="text-[#e6edf3] leading-relaxed mt-4">
                  In the KANDO Co-eclosion Protocol, we have three phases for entering citizenship: Reserved (temporary), Candidate (being confirmed), and Citizen (confirmed). All identity information is stored in a distributed hash table (DHT) without the need for blockchain and cryptocurrencies.
                </p>
                <div className="mt-4 p-3 bg-jade/5 rounded-lg border border-jade/20">
                  <p className="text-sm text-jade">
                    📜 Patent Status: The KANDO hexagonal topology has been submitted to the Estonian Patent Office as a utility model, but the entire project will be released as open source under the AGPLv3 license.
                  </p>
                </div>
              </div>
            </section>

            {/* Introduction Section */}
            <section id="introduction" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <span className="text-lg">🔍</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Introduction</h2>
              </div>
              <div className="github-card p-6">
                <p className="text-[#e6edf3] leading-relaxed">
                  Today's Internet and applications are largely centralized, which can lead to risks such as censorship, collection of personal data, and single points of failure. Decentralized alternative apps often have gas fees, low processing power, and are vulnerable to cyber attacks and spam because they are still based on simple contagion (one click = one share = one contagion).
                </p>
                <p className="text-[#e6edf3] leading-relaxed mt-4">
                  Research by Professor Damon Centola of the University of Pennsylvania has shown that the spread of cooperative trust and social actions follows a complex contagion pattern. Adoption of a new behavior requires reinforcement from multiple independent sources. <strong className="text-jade">KANDO has transformed this scientific insight into a practical network architecture.</strong>
                </p>
              </div>
            </section>

            {/* Problem Section */}
            <section id="problem" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <span className="text-lg">⚠️</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Problem Statement</h2>
              </div>
              <div className="github-card p-6">
                <p className="text-[#e6edf3] leading-relaxed mb-4">Existing decentralized networks suffer from four technical drawbacks:</p>
                <div className="space-y-3">
                  {[
                    { icon: "🌊", title: "Uncontrolled message flooding", desc: "Content reaches all connected nodes without regard to quality, wasting bandwidth and facilitating misinformation spread" },
                    { icon: "🔓", title: "Lack of local trust", desc: "Cyberattacks are cheap because identity isn't tied to structural requirements; global consensus is slow and expensive" },
                    { icon: "🎲", title: "Lack of spatial embedding", desc: "Most P2P graphs are random, making community-based routing difficult without external metadata" },
                    { icon: "💰", title: "High transaction costs", desc: "Blockchain-based solutions impose transaction fees, preventing mass adoption" }
                  ].map((problem, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-[#161b22] rounded-lg">
                      <span className="text-xl">{problem.icon}</span>
                      <div>
                        <h4 className="font-semibold text-white">{problem.title}</h4>
                        <p className="text-sm text-[#8b949e]">{problem.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[#e6edf3] leading-relaxed mt-4 p-3 bg-jade/10 rounded-lg border border-jade/20">
                  ✅ KANDO solves these problems intrinsically due to its structure, without the need for cryptocurrencies or transaction fees.
                </p>
              </div>
            </section>

            {/* Main Architecture */}
            <section id="architecture" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <span className="text-lg">🏗️</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Main Architecture</h2>
              </div>
              <div className="github-card p-6">
                <p className="text-[#e6edf3] leading-relaxed mb-4">KANDO's architecture consists of several innovative layers working together:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                    <div className="text-2xl mb-2">🔷</div>
                    <h4 className="font-semibold text-white mb-1">Hexagonal Topology</h4>
                    <p className="text-xs text-[#8b949e]">Axial coordinates (q, r) with up to 6 direct neighbors per node</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                    <div className="text-2xl mb-2">✅</div>
                    <h4 className="font-semibold text-white mb-1">3-Approval Rule</h4>
                    <p className="text-xs text-[#8b949e]">Complex contagion requiring 3 confirmations for propagation</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                    <div className="text-2xl mb-2">💡</div>
                    <h4 className="font-semibold text-white mb-1">Optical Channels</h4>
                    <p className="text-xs text-[#8b949e]">Direct links for urgent information bypassing the 3-approval rule</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                    <div className="text-2xl mb-2">👥</div>
                    <h4 className="font-semibold text-white mb-1">Co-eclosion Protocol</h4>
                    <p className="text-xs text-[#8b949e]">Three-stage citizenship (Reserved → Candidate → Citizen)</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                    <div className="text-2xl mb-2">🌐</div>
                    <h4 className="font-semibold text-white mb-1">Two-Layer Architecture</h4>
                    <p className="text-xs text-[#8b949e]">Overlay network + physical mesh for offline communication</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                    <div className="text-2xl mb-2">💾</div>
                    <h4 className="font-semibold text-white mb-1">DHT Storage</h4>
                    <p className="text-xs text-[#8b949e]">No blockchain, no gas fees</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Hexagonal Topology */}
            <section id="hexagonal" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-jade/20 flex items-center justify-center">
                  <span className="text-lg">🔷</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Hexagonal Topology & Axial Coordinates</h2>
              </div>
              <div className="github-card p-6">
                <p className="text-[#e6edf3] leading-relaxed mb-4">
                  Each node is equipped with a pair of axial coordinates (q, r). The implicit third coordinate is (s = -q - r). The hexagonal distance between two nodes is calculated as:
                </p>
                <div className="bg-[#161b22] p-4 rounded-lg text-center mb-4 font-mono text-jade">
                  Distance = (|Δq| + |Δr| + |Δs|) / 2
                </div>
                <p className="text-[#e6edf3] leading-relaxed mb-4">
                  This metric defines the rings:
                </p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2"><span className="text-jade">●</span> Ring 0: Center node (queen) at (0,0)</li>
                  <li className="flex items-center gap-2"><span className="text-jade">●</span> Ring 1: 6 cells at distance 1</li>
                  <li className="flex items-center gap-2"><span className="text-jade">●</span> Ring 2: 12 cells (nodes)</li>
                  <li className="flex items-center gap-2"><span className="text-jade">●</span> Ring 3: 18 nodes, and so on</li>
                </ul>
                <div className="p-3 bg-jade/5 rounded-lg border border-jade/20">
                  <p className="text-sm"><strong className="text-jade">Why 6?</strong> A hexagonal network maximizes the clustering coefficient (between 0.4 and 0.67) compared to square or random graphs, which is optimal for complex contagions.</p>
                </div>
              </div>
            </section>

            {/* Rule of 3 Confirmations */}
            <section id="rule-of-3" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <span className="text-lg">✅</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Rule of 3 Confirmations (Complex Contagion)</h2>
              </div>
              <div className="github-card p-6">
                <p className="text-[#e6edf3] leading-relaxed mb-4">
                  When a citizen creates content, that content is initially shared with only his or her six direct neighbors. Each neighbor can send a cryptographic confirmation. The source node counts the confirmations. If at least three independent confirmations are collected in a given time interval (e.g., 24 hours), the content is propagated to the next ring.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="text-2xl mb-1">📉</div>
                    <h4 className="font-semibold text-green-400">Bandwidth Reduction</h4>
                    <p className="text-sm text-[#8b949e]">Poor-quality content stopped in first ring, reducing network traffic by 60-80% compared to flooding or gossip protocols</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="text-2xl mb-1">🛡️</div>
                    <h4 className="font-semibold text-green-400">Inherent Spam Filter</h4>
                    <p className="text-sm text-[#8b949e]">Fake news and rumors cannot collect three confirmations from trusted neighbors</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Optical Channels */}
            <section id="optical" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-lg">💡</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Optical Channels for Simple Propagation</h2>
              </div>
              <div className="github-card p-6">
                <p className="text-[#e6edf3] leading-relaxed mb-4">
                  For urgent information (e.g., earthquakes, security alerts) as well as to help the network spread, KANDO also provides optical channels. These are direct links between two non-affiliated users that bypass the 3 confirmation rule.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2"><span className="text-jade">●</span> Limited number (e.g., 10 channels per user)</li>
                  <li className="flex items-start gap-2"><span className="text-jade">●</span> Only allowed for public and urgent content</li>
                  <li className="flex items-start gap-2"><span className="text-jade">●</span> Both parties must confirm the channel</li>
                </ul>
                <div className="mt-4 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <p className="text-sm">✨ Thus KANDO has a separate layer for simple propagation alongside the complex propagation layer (trust).</p>
                </div>
              </div>
            </section>

            {/* Citizenship Protocol */}
            <section id="citizenship" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <span className="text-lg">👥</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Three-Stage Citizenship (Co-eclosion) Protocol</h2>
              </div>
              <div className="github-card p-6">
                <div className="space-y-4">
                  <div className="p-3 bg-[#161b22] rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-bold text-blue-400">1. RESERVED</h4>
                    <p className="text-sm text-[#8b949e]">Created by invitation from existing citizen with no neighbor conditions. The node occupies a coordinate but is not yet active.</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg border-l-4 border-yellow-500">
                    <h4 className="font-bold text-yellow-400">2. CANDIDATE</h4>
                    <p className="text-sm text-[#8b949e]">Promoted from reserved when all six direct neighbor slots are filled. The node becomes visible but cannot vote or create content.</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg border-l-4 border-green-500">
                    <h4 className="font-bold text-green-400">3. CITIZEN</h4>
                    <p className="text-sm text-[#8b949e]">Promoted from candidate when each of its six neighbors has at least six neighbors (second ring completely filled). A citizen has all benefits: can invite, issue endorsements, send content, and vote.</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-jade/10 rounded-lg border border-jade/20">
                  <p className="text-sm"><strong className="text-jade">Sybil Resistance:</strong> To create a fake citizen, an attacker must fill six neighborhood slots (and each of them must have six neighbors themselves). This requirement exponentially increases the cost of a large-scale attack.</p>
                </div>
                <div className="mt-3 p-2 bg-[#161b22] rounded-lg">
                  <p className="text-xs text-[#8b949e]">🔐 Each citizen receives a non-transferable digital certificate (cNFT) and a self-signed identity (DID) permanently tied to the node's public key.</p>
                </div>
              </div>
            </section>

            {/* Inactive Nodes */}
            <section id="inactive-nodes" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <span className="text-lg">⏰</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Managing Inactive Nodes & Relocation</h2>
              </div>
              <div className="github-card p-6">
                <p className="text-[#e6edf3] leading-relaxed mb-4">
                  A citizen who shows no activity for 30 days changes to the INACTIVE state. Live neighbors can start voting. If the vote is successful, the node changes to DISPLACED state and its coordinates are released.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-2 bg-red-500/10 rounded-lg text-center">
                    <span className="text-xs text-red-400">INACTIVE</span>
                    <p className="text-xs text-[#8b949e]">30 days no activity</p>
                  </div>
                  <div className="p-2 bg-yellow-500/10 rounded-lg text-center">
                    <span className="text-xs text-yellow-400">DISPLACED</span>
                    <p className="text-xs text-[#8b949e]">Coordinates released</p>
                  </div>
                  <div className="p-2 bg-gray-500/10 rounded-lg text-center">
                    <span className="text-xs text-gray-400">DEAD</span>
                    <p className="text-xs text-[#8b949e]">Historical record only</p>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded-lg text-center">
                    <span className="text-xs text-green-400">RELOCATED</span>
                    <p className="text-xs text-[#8b949e]">Return to CITIZEN</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Two-Layer Architecture */}
            <section id="two-layer" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                  <span className="text-lg">🌐</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Two-Layer Architecture: Overlay + Physical Mesh</h2>
              </div>
              <div className="github-card p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-[#161b22] rounded-lg">
                    <h4 className="font-bold text-blue-400 mb-2">Layer 1: Overlay Network</h4>
                    <p className="text-sm text-[#8b949e]">Based on virtual coordinates (q, r). Neighbors selected based on trust and common interests, not geographical location.</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg">
                    <h4 className="font-bold text-green-400 mb-2">Layer 2: Physical Mesh Network</h4>
                    <p className="text-sm text-[#8b949e]">Bluetooth Low Energy, Wi-Fi Direct, or LoRa for offline local communication during internet outages.</p>
                  </div>
                </div>
                <p className="text-[#e6edf3] leading-relaxed mt-4 text-center p-2 bg-jade/5 rounded-lg">
                  KANDO can use both online trust-based relationships and offline local communication. Online relays are used for network stability.
                </p>
              </div>
            </section>

            {/* DHT Storage */}
            <section id="storage" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center">
                  <span className="text-lg">💾</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Storage in DHT (No Blockchain)</h2>
              </div>
              <div className="github-card p-6">
                <p className="text-[#e6edf3] leading-relaxed">
                  All node records, including coordinates, status, neighbor contributions, voting records, and certificates, are stored in a Distributed Hash Table (DHT) like Kademlia. This solution makes the network without the need for a blockchain or gas fees, and users do not pay transaction fees.
                </p>
                <div className="mt-4 p-3 bg-green-500/10 rounded-lg text-center">
                  <p className="text-green-400 font-semibold">💰 Zero cost for ordinary users</p>
                </div>
              </div>
            </section>

            {/* Reward Layer */}
            <section id="rewards" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <span className="text-lg">🎮</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Optional Reward Layer (Gamification)</h2>
              </div>
              <div className="github-card p-6">
                <p className="text-[#e6edf3] leading-relaxed">
                  KANDO includes an optional and non-mandatory reward mechanism to encourage and grow the network. Users can earn points by inviting friends, endorsing content, voting, performing charitable behaviors, and participating in games.
                </p>
                <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg">
                  <p className="text-sm text-[#e6edf3]">🎖️ Points increase social reputation and are displayed as badges or numbers on profiles. <strong>No real money is involved.</strong></p>
                </div>
              </div>
            </section>

            {/* Technical Benefits Table */}
            <section id="benefits" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-jade/20 flex items-center justify-center">
                  <span className="text-lg">📊</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Technical Effects & Benefits</h2>
              </div>
              <div className="github-card p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#30363d]">
                      <th className="text-left py-2 text-jade">Feature</th>
                      <th className="text-left py-2 text-jade">Technical Effect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Hexagonal topology + Manhattan distance", "O(1) routing complexity"],
                      ["3-approval rule", "60-80% bandwidth reduction, native spam filter"],
                      ["Co-eclosion protocol", "Exponential Sybil resistance without PoW/PoS"],
                      ["Local voting and relocation", "Self-healing, resilience to long-term internet outages"],
                      ["DHT storage", "No blockchain, no gas fees — zero cost for ordinary users"],
                      ["Dual-layer architecture", "Works offline via mesh networks, online via relays"]
                    ].map(([feature, effect]) => (
                      <tr key={feature} className="border-b border-[#21262d]">
                        <td className="py-2 text-white">{feature}</td>
                        <td className="py-2 text-[#8b949e]">{effect}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Comparison Table */}
            <section id="comparison" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <span className="text-lg">⚖️</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Comparison with Existing Solutions</h2>
              </div>
              <div className="github-card p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#30363d]">
                      <th className="text-left py-2 text-jade">Feature</th>
                      <th className="text-left py-2 text-jade">KANDO</th>
                      <th className="text-left py-2 text-jade">BitChat / Briar</th>
                      <th className="text-left py-2 text-jade">Blockchain Social</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Offline mesh", "✅ (Bluetooth, Wi-Fi Direct, LoRa)", "✅", "❌"],
                      ["Gas fees", "❌ zero", "❌ zero", "❌ (high)"],
                      ["Spam filter", "✅ (3-approval rule)", "❌", "❌"],
                      ["Sybil resistance", "✅ (co-eclosion)", "❌", "✅ (expensive)"],
                      ["Identity portability", "✅ (cNFT / DID)", "❌", "✅ (NFT)"],
                      ["Scalable routing", "✅ O(1)", "❌ O(N)", "🟡 (sharding needed)"]
                    ].map(([feature, kando, other, blockchain]) => (
                      <tr key={feature} className="border-b border-[#21262d]">
                        <td className="py-2 text-white">{feature}</td>
                        <td className="py-2 text-green-400">{kando}</td>
                        <td className="py-2 text-[#8b949e]">{other}</td>
                        <td className="py-2 text-[#8b949e]">{blockchain}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Use Cases */}
            <section id="use-cases" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <span className="text-lg">🎯</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Use Cases</h2>
              </div>
              <div className="github-card p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-[#161b22] rounded-lg">
                    <div className="text-2xl mb-1">📰</div>
                    <h4 className="font-semibold text-white">Reporters & Civil Society Activists</h4>
                    <p className="text-sm text-[#8b949e]">Anonymous communication during internet outages, communication through content verified by multiple peers</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg">
                    <div className="text-2xl mb-1">🚑</div>
                    <h4 className="font-semibold text-white">Relief Organizations</h4>
                    <p className="text-sm text-[#8b949e]">Coordination of rescue operations in disaster areas where communication infrastructure has been destroyed</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg">
                    <div className="text-2xl mb-1">💻</div>
                    <h4 className="font-semibold text-white">Decentralized Application Developers</h4>
                    <p className="text-sm text-[#8b949e]">Building on a trust layer that provides local identity and consensus</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg">
                    <div className="text-2xl mb-1">🌍</div>
                    <h4 className="font-semibold text-white">Social Movements</h4>
                    <p className="text-sm text-[#8b949e]">Development and organization through complex contagion</p>
                  </div>
                </div>
              </div>
            </section>

            {/* IP & Open Source */}
            <section id="ip" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center">
                  <span className="text-lg">⚖️</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Intellectual Property & Open Source</h2>
              </div>
              <div className="github-card p-6">
                <div className="p-3 bg-yellow-500/10 rounded-lg mb-4">
                  <p className="text-sm"><strong className="text-yellow-400">Patent Status:</strong> A utility model of the hexagonal topology, the rule of three verification, and the co-eclosion protocol has been submitted to the Estonian Patent Office.</p>
                </div>
                <p className="text-[#e6edf3] leading-relaxed mb-4">
                  However, all protocols and software developed or to be developed for KANDO are or will be released under the <strong className="text-jade">GNU Affero General Public License v3 (AGPLv3)</strong>. The source code of the protocol, simulator, and documentation are freely available on GitHub.
                </p>
                <div className="flex gap-3 justify-center mt-4">
                  <a href="https://github.com/comfyuse/kando" target="_blank" rel="noopener noreferrer" className="github-button-primary text-sm">GitHub Repository</a>
                  <a href="https://kandonet.com" target="_blank" rel="noopener noreferrer" className="github-button-secondary text-sm">kandonet.com</a>
                </div>
              </div>
            </section>

            {/* Roadmap */}
            <section id="roadmap" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-jade/20 flex items-center justify-center">
                  <span className="text-lg">🗺️</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Roadmap</h2>
              </div>
              <div className="space-y-4">
                <div className="github-card p-5 border-l-4 border-green-500">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-green-400">Phase 0 — Completed</h3>
                    <span className="text-xs text-[#8b949e]">Before 20 May 2026</span>
                  </div>
                  <ul className="space-y-1 text-sm text-[#8b949e]">
                    <li>✓ React simulator (proof of concept)</li>
                    <li>✓ Whitepaper (v1.0)</li>
                    <li>✓ Utility model filed with Estonian Patent Office</li>
                  </ul>
                </div>

                <div className="github-card p-5 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-blue-400">Phase 1 — MVP Implementation</h3>
                    <span className="text-xs text-[#8b949e]">20 May 2026 — 20 Jan 2027</span>
                  </div>
                  <ul className="space-y-1 text-sm text-[#8b949e]">
                    <li>📅 20 May — 20 Aug 2026: Go-libp2p core (Host setup, Kademlia DHT, GossipSub)</li>
                    <li>📅 20 Aug — 20 Nov 2026: 3-approval rule, co-eclosion citizenship protocol, basic messaging</li>
                    <li>📅 20 Nov 2026 — 20 Jan 2027: Local voting, inactive node handling, relocation, testing</li>
                    <li className="text-jade mt-2">🎯 Milestone: MVP Alpha release (20 Jan 2027)</li>
                  </ul>
                </div>

                <div className="github-card p-5 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-yellow-400">Phase 2 — Public Testnet</h3>
                    <span className="text-xs text-[#8b949e]">Feb — Sep 2027</span>
                  </div>
                  <ul className="space-y-1 text-sm text-[#8b949e]">
                    <li>📅 Feb — Jul 2027: Deploy testnet with 100+ volunteer nodes, user-friendly CLI client</li>
                    <li>📅 Jul — Sep 2027: Stress testing, bug fixing, performance tuning</li>
                    <li className="text-jade mt-2">🎯 Milestone: Testnet stable (30 Sep 2027)</li>
                  </ul>
                </div>

                <div className="github-card p-5 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-purple-400">Phase 3 — Mainnet Launch</h3>
                    <span className="text-xs text-[#8b949e]">Oct — Dec 2027</span>
                  </div>
                  <ul className="space-y-1 text-sm text-[#8b949e]">
                    <li>📅 Oct 2027: Production release of core protocol (AGPLv3)</li>
                    <li>📅 Nov 2027: Mobile apps (iOS/Android) using KANDO's DHT and mesh layers</li>
                    <li>📅 Dec 2027: Integration with LoRa radios for long-range offline mesh</li>
                    <li className="text-jade mt-2">🎯 Milestone: Mainnet live (31 Dec 2027)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Call to Action */}
            <section id="call-to-action" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-jade/20 flex items-center justify-center">
                  <span className="text-lg">📢</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Call to Action</h2>
              </div>
              <div className="github-card p-8 text-center border-l-4 border-jade">
                <p className="text-[#e6edf3] leading-relaxed mb-6">
                  KANDO is a practical, scientific, and fully open source solution for a free and uncensored internet.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-3 bg-[#161b22] rounded-lg">
                    <div className="text-2xl mb-1">💰</div>
                    <h4 className="font-semibold text-white">Grant Funding</h4>
                    <p className="text-xs text-[#8b949e]">NLnet, NGI to accelerate Go libp2p implementation</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg">
                    <div className="text-2xl mb-1">👨‍💻</div>
                    <h4 className="font-semibold text-white">Open Source Contributors</h4>
                    <p className="text-xs text-[#8b949e]">Go, cryptography, P2P networks</p>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-lg">
                    <div className="text-2xl mb-1">🧪</div>
                    <h4 className="font-semibold text-white">Early Testers</h4>
                    <p className="text-xs text-[#8b949e]">Aid organizations, journalism networks</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <a href="https://github.com/comfyuse/Kando" target="_blank" className="github-button-primary">Join on GitHub</a>
                  <a href="https://kandonet.com" target="_blank" className="github-button-secondary">Visit kandonet.com</a>
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-[#30363d] text-center text-xs text-[#8b949e]">
              <p>KANDO Whitepaper Version 1.1 — Released under CC BY-SA 4.0</p>
              <p className="mt-1">Code licensed under AGPLv3 · Source available on GitHub</p>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}