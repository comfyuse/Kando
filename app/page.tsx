'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, Variants } from 'framer-motion';

/* Minimal-color brand: pure black, white + grayscale UI.
   The only color comes from the holographic KANDO logo. */

const LOGO = '/kando-mark.png';
const EASE = [0.22, 1, 0.36, 1] as const;

const revealItem: Variants = {
  hidden: { opacity: 0, y: 44, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: EASE } },
};
const staggerParent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={revealItem} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
      {children}
    </motion.div>
  );
}
function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
      {children}
    </motion.div>
  );
}

const CARD = 'rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm';

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const togglePlay = () => {
    if (videoRef.current) {
      isPlaying ? videoRef.current.pause() : videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };
  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  const toolkit = [
    { icon: '🛰️', title: 'Decentralized Mesh', description: 'A peer-to-peer network with hexagonal topology. No central servers, no single point of failure — your messages route through a living mesh of nodes.' },
    { icon: '🤝', title: 'Complex-Contagion Consensus', description: 'Content spreads only when it earns approval. The 3-approval rule, grounded in complex contagion theory, makes censorship structurally impossible.' },
    { icon: '🔐', title: 'End-to-End Encryption', description: 'Every message is sealed end-to-end. Only you and your recipient hold the keys — no third party, no data collection, complete anonymity.' },
    { icon: '⛽', title: 'Gas-Free Delivery', description: 'Unlike blockchain platforms, KANDO charges no transaction fees. Free communication for everyone, with sub-100ms propagation across the mesh.' },
  ];
  const modes = [
    { icon: '🎮', title: 'Network Simulator', desc: 'Watch the protocol spread in real time.' },
    { icon: '💬', title: 'Secure Chat', desc: 'Encrypted, peer-to-peer messaging.' },
    { icon: '🧭', title: 'Node Dashboard', desc: 'Monitor your node and the mesh.' },
    { icon: '🔑', title: 'Key Management', desc: 'Own and control your identity keys.' },
    { icon: '🌐', title: 'Mesh Routing', desc: 'Adaptive routing across the hive.' },
    { icon: '📦', title: 'Open Protocol', desc: 'Audit, fork, and build freely.' },
  ];
  const faqs = [
    { q: 'How does KANDO stay censorship-resistant?', a: 'There is no central authority that can delete or block content. Messages propagate through a distributed mesh and only spread once they satisfy the 3-approval rule, a mechanism derived from complex contagion theory.' },
    { q: 'Is it really free? What about gas fees?', a: 'Yes. KANDO is not built on a fee-based blockchain. There are no transaction or gas fees of any kind — communication is free for everyone, always.' },
    { q: 'How is my privacy protected?', a: 'All messages are end-to-end encrypted. Only you and your intended recipient can read them. KANDO collects no personal data and runs without identifying you.' },
    { q: 'Where does my data live?', a: 'On a distributed peer-to-peer network of nodes rather than a company-owned server. This is what makes the network resilient and resistant to takedowns.' },
    { q: 'Is KANDO open source?', a: 'Completely. The codebase is 100% transparent and licensed under AGPL-3.0. Anyone can audit it, contribute, or fork the project.' },
    { q: 'How fast is the network?', a: 'The optimized P2P protocol with hexagonal topology delivers messages with under 100ms latency across the mesh in typical conditions.' },
  ];
  const timeline = [
    { phase: 'Closed Beta', date: 'Now', status: 'current', desc: 'Invite-only access for early testers building on the protocol.' },
    { phase: 'Founders Beta', date: 'June 22, 2026', status: 'upcoming', desc: 'Founders get in first with lifetime perks and priority access.' },
    { phase: 'Open Beta', date: 'June 29, 2026', status: 'upcoming', desc: 'The network opens to everyone on the waitlist.' },
  ];
  const testimonials = [
    { name: 'Maya R.', role: 'Privacy researcher', text: 'Finally a network where censorship resistance isn’t a marketing line — it’s baked into the protocol.' },
    { name: 'Dev K.', role: 'Open-source maintainer', text: 'Gas-free, end-to-end encrypted, and fully auditable. I forked it the day I saw the repo.' },
    { name: 'Sara L.', role: 'Early tester', text: 'The simulator made the 3-approval rule click instantly. Can’t wait for open beta.' },
    { name: 'Tomas B.', role: 'Node operator', text: 'Running a node was trivial and the mesh just works. Sub-100ms in practice.' },
  ];

  return (
    <main
      className="relative min-h-screen bg-black text-white overflow-x-hidden selection:bg-white selection:text-black"
      style={{ fontFamily: 'var(--font-instrument), system-ui, sans-serif' }}
    >
      <style>{`
        @keyframes holoHue {
          0%   { filter: hue-rotate(0deg)   saturate(1.15) brightness(1.05) drop-shadow(0 0 28px rgba(255,255,255,0.14)); }
          50%  { filter: hue-rotate(180deg) saturate(1.4)  brightness(1.12) drop-shadow(0 0 40px rgba(255,255,255,0.22)); }
          100% { filter: hue-rotate(360deg) saturate(1.15) brightness(1.05) drop-shadow(0 0 28px rgba(255,255,255,0.14)); }
        }
        @keyframes holoFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes holoSheen { 0% { background-position: -160% 0; } 100% { background-position: 260% 0; } }
        @media (prefers-reduced-motion: reduce) {
          .holo-hue, .holo-float, .holo-sheen { animation: none !important; }
        }
      `}</style>

      <MinimalBackdrop />
      <CursorFollower />
      <LandingNav />

      <div className="relative z-10">
        {/* ============================== HERO / HEADER ============================== */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 pb-20">
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Animated holographic logo */}
            <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: EASE }} className="flex justify-center mb-8">
              <div className="holo-float relative w-44 h-44 sm:w-52 sm:h-52 md:w-64 md:h-64" style={{ animation: 'holoFloat 6s ease-in-out infinite' }}>
                {/* soft glow */}
                <div className="absolute inset-0 rounded-full blur-3xl bg-white/10" />
                {/* logo */}
                <img src={LOGO} alt="KANDO" className="holo-hue relative w-full h-full object-contain" style={{ animation: 'holoHue 9s linear infinite' }} />
                {/* sweeping sheen, masked to logo shape */}
                <div
                  className="holo-sheen absolute inset-0 pointer-events-none"
                  style={{
                    WebkitMaskImage: `url(${LOGO})`, maskImage: `url(${LOGO})`,
                    WebkitMaskSize: 'contain', maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center', maskPosition: 'center',
                    backgroundImage: 'linear-gradient(110deg, transparent 38%, rgba(255,255,255,0.85) 50%, transparent 62%)',
                    backgroundSize: '250% 100%', mixBlendMode: 'overlay',
                    animation: 'holoSheen 3.8s ease-in-out infinite',
                  }}
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/15 backdrop-blur mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ea88a] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2ea88a]" />
              </span>
              <span className="text-xs text-white/70 font-medium">Closed Beta live · Open Beta June 2026</span>
            </motion.div>

            {/* Masked line reveal */}
            <motion.h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-[-0.03em] leading-[1.02]"
              initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}>
              {[
                { text: 'All in one', accent: false },
                { text: 'decentralized communication', accent: true },
                { text: 'launchpad', accent: false },
              ].map((line, i) => (
                <span key={i} className="block overflow-hidden pb-[0.12em]">
                  <motion.span
                    className={`block ${line.accent ? 'bg-gradient-to-r from-[#2ea88a] via-[#54c9a6] to-[#2ea88a] bg-clip-text text-transparent' : ''}`}
                    variants={{ hidden: { y: '115%' }, show: { y: 0, transition: { duration: 0.85, ease: EASE } } }}>
                    {line.text}
                  </motion.span>
                </span>
              ))}
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
              className="mt-6 text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto">
              KANDO is a censorship-resistant, gas-free social protocol. Private by default, decentralized by design, and open for everyone.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5, ease: EASE }} className="mt-9 max-w-md mx-auto">
              {submitted ? (
                <div className="rounded-2xl px-5 py-4 text-white text-sm font-medium border border-white/20 bg-white/10 backdrop-blur">
                  🎉 You’re on the list — we’ll be in touch before open beta.
                </div>
              ) : (
                <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                    className="flex-1 px-5 py-3.5 rounded-full bg-white/5 border border-white/15 text-white placeholder:text-white/40 focus:border-white/50 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.12)] outline-none text-sm transition-colors backdrop-blur" />
                  <button type="submit"
                    className="px-6 py-3.5 rounded-full bg-white text-black font-medium transition-transform duration-200 hover:scale-[1.03] text-sm whitespace-nowrap">
                    Get early access
                  </button>
                </form>
              )}
              <p className="mt-3 text-center text-xs text-white/45">
                or <Link href="/simulator" className="text-[#2ea88a] hover:text-[#54c9a6] underline underline-offset-4 decoration-[#2ea88a]/40 font-medium">launch the network simulator →</Link>
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.6, ease: EASE }} className="mt-14 flex justify-center">
              <div className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/15">
                <video ref={videoRef} src="/KANDOPROMOTE.mp4" className="w-full h-auto max-h-[440px] object-cover" poster={LOGO} onClick={togglePlay} />
                {!isPlaying && (
                  <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/40 group" aria-label="Play demo">
                    <span className="bg-white text-black rounded-full p-5 transition-transform duration-200 group-hover:scale-110 shadow-2xl">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ============================== TOOLKIT ============================== */}
        <section className="py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="The protocol" title="Everything the hive needs" highlight="to communicate freely"
              sub="One protocol covering identity, routing, consensus, and delivery — built for a network nobody can shut down." />
            <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mt-14">
              {toolkit.map((item) => (
                <motion.div key={item.title} variants={revealItem} className={`group ${CARD} p-7 md:p-9 hover:border-white/30 transition-colors duration-300`}>
                  <div className="text-4xl mb-5 transition-transform duration-300 group-hover:scale-110 inline-block">{item.icon}</div>
                  <h3 className="text-xl md:text-2xl font-semibold tracking-tight mb-2.5">{item.title}</h3>
                  <p className="text-sm md:text-base text-white/55 leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ============================== MODES ============================== */}
        <section className="py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Flexible modes" title="One network," highlight="every way you work"
              sub="From a visual simulator to encrypted chat and node ops — switch modes without leaving KANDO." />
            <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mt-14">
              {modes.map((m) => (
                <motion.div key={m.title} variants={revealItem} className={`group ${CARD} p-5 hover:border-white/30 transition-colors duration-300 flex items-start gap-4`}>
                  <div className="text-2xl bg-white/5 border border-white/10 rounded-xl p-2.5 transition-transform group-hover:scale-110">{m.icon}</div>
                  <div>
                    <h3 className="text-base font-semibold">{m.title}</h3>
                    <p className="text-xs md:text-sm text-white/50 mt-1">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ============================== FAQ ============================== */}
        <section id="faq" className="py-24 md:py-32">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="FAQ" title="Questions," highlight="answered" sub="Everything you might want to know before joining the network." />
            <Stagger className="mt-14 space-y-3">
              {faqs.map((faq, i) => (
                <motion.div key={i} variants={revealItem} className={`${CARD} overflow-hidden`}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="text-sm md:text-base font-medium">{faq.q}</span>
                    <svg className={`w-5 h-5 text-[#2ea88a] shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`grid transition-all duration-300 ${openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden"><p className="px-5 pb-4 text-sm text-white/55 leading-relaxed">{faq.a}</p></div>
                  </div>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ============================== TIMELINE ============================== */}
        <section className="py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Roadmap" title="The road to" highlight="open beta" sub="Three milestones between now and a fully open network." />
            <Stagger className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
              {timeline.map((t) => (
                <motion.div key={t.phase} variants={revealItem} className={`${CARD} p-7 ${t.status === 'current' ? 'border-white/35' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`relative flex h-2.5 w-2.5 ${t.status === 'current' ? '' : 'opacity-40'}`}>
                      {t.status === 'current' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ea88a] opacity-75" />}
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2ea88a]" />
                    </span>
                    <span className="text-xs font-medium text-[#2ea88a]">{t.date}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t.phase}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{t.desc}</p>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ============================== TESTIMONIALS ============================== */}
        <section className="py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Community" title="Loved by" highlight="the early hive" sub="What testers and node operators are saying about KANDO." />
            <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-14">
              {testimonials.map((t) => (
                <motion.div key={t.name} variants={revealItem} className={`${CARD} p-7 hover:border-white/25 transition-colors duration-300`}>
                  <p className="text-sm md:text-base text-white/80 leading-relaxed">“{t.text}”</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-semibold text-sm">{t.name.charAt(0)}</div>
                    <div>
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-xs text-white/45">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ============================== FINAL CTA ============================== */}
        <section className="py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.03] backdrop-blur-sm p-10 md:p-16 text-center">
                <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">Ready to join the hive?</h2>
                <p className="text-sm md:text-lg text-white/60 mb-9 max-w-2xl mx-auto">Reserve your spot for open beta, or dive into the open-source code today.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/waiting-list" className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-white text-black font-medium transition-transform duration-200 hover:scale-[1.03] text-sm md:text-base">Get early access</Link>
                  <Link href="/open-source" className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-white/25 hover:bg-white/10 text-white font-medium transition-all duration-200 text-sm md:text-base">Explore Open Source</Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============================== FOOTER ============================== */}
        <footer className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center md:text-left">
                <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
                  <img src={LOGO} alt="KANDO" className="h-9 w-auto object-contain" />
                </Link>
                <p className="text-sm text-white/45 mt-4">Building the future of decentralized communication.</p>
                <div className="flex justify-center md:justify-start gap-4 mt-6">
                  <a href="https://github.com/comfyuse/Kando" target="_blank" rel="noopener noreferrer" className="text-white/45 hover:text-white transition-colors" aria-label="GitHub">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48 0-.24-.01-.9-.01-1.75-2.78.6-3.37-1.2-3.37-1.2-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.26.1-2.62 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.36.2 2.37.1 2.62.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .26.18.58.69.48C19.13 20.17 22 16.42 22 12c0-5.52-4.48-10-10-10z" /></svg>
                  </a>
                  <a href="#" className="text-white/45 hover:text-white transition-colors" aria-label="Twitter">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0021.098-11.792c0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z" /></svg>
                  </a>
                </div>
              </div>
              <div className="col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8 text-center md:text-left">
                <div>
                  <h3 className="text-sm font-semibold mb-4">Product</h3>
                  <ul className="space-y-2">
                    <li><Link href="/simulator" className="text-sm text-white/45 hover:text-white transition-colors">Simulator</Link></li>
                    <li><Link href="/chat" className="text-sm text-white/45 hover:text-white transition-colors">Chat App</Link></li>
                    <li><Link href="/waiting-list" className="text-sm text-white/45 hover:text-white transition-colors">Waiting List</Link></li>
                    <li><Link href="/open-source" className="text-sm text-white/45 hover:text-white transition-colors">Open Source</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-4">Resources</h3>
                  <ul className="space-y-2">
                    <li><Link href="/docs" className="text-sm text-white/45 hover:text-white transition-colors">Documentation</Link></li>
                    <li><a href="https://github.com/comfyuse/Kando" target="_blank" rel="noopener noreferrer" className="text-sm text-white/45 hover:text-white transition-colors">GitHub</a></li>
                    <li><a href="#faq" className="text-sm text-white/45 hover:text-white transition-colors">FAQ</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-4">Company</h3>
                  <ul className="space-y-2">
                    <li><a href="#" className="text-sm text-white/45 hover:text-white transition-colors">About</a></li>
                    <li><a href="#" className="text-sm text-white/45 hover:text-white transition-colors">Privacy Policy</a></li>
                    <li><a href="#" className="text-sm text-white/45 hover:text-white transition-colors">Terms of Service</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 mt-12 pt-8 text-center">
              <p className="text-xs text-white/45">© {new Date().getFullYear()} KANDO. All rights reserved. Built with ❤️ for open source.</p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

// --- Minimal monochrome backdrop (subtle drifting glows on black) ----------
function MinimalBackdrop() {
  const blobs = [
    { size: '55vw', top: '-12%', left: '-8%', dur: 30, x: [0, 80, -40, 0], y: [0, 60, 120, 0], color: '46,168,138', o: 0.1 },
    { size: '45vw', top: '20%', left: '60%', dur: 26, x: [0, -90, 50, 0], y: [0, 80, -30, 0], color: '255,255,255', o: 0.05 },
    { size: '50vw', top: '65%', left: '15%', dur: 34, x: [0, 100, 30, 0], y: [0, -70, 40, 0], color: '46,168,138', o: 0.07 },
  ];
  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden bg-black pointer-events-none">
      {blobs.map((b, i) => (
        <motion.div key={i} className="absolute rounded-full blur-[110px] will-change-transform"
          style={{ width: b.size, height: b.size, top: b.top, left: b.left, background: `radial-gradient(circle at 50% 50%, rgba(${b.color},${b.o}), transparent 70%)` }}
          animate={{ x: b.x, y: b.y, scale: [1, 1.15, 0.95, 1] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
      <div className="absolute inset-0 opacity-[0.06] mix-blend-soft-light"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
    </div>
  );
}

// --- Custom cursor follower (subtle white ring that trails the mouse) ------
function CursorFollower() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { damping: 28, stiffness: 320, mass: 0.4 });
  const sy = useSpring(y, { damping: 28, stiffness: 320, mass: 0.4 });
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) return;
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); setVisible(true); };
    const over = (e: MouseEvent) => { const t = e.target as HTMLElement; setHovering(!!t.closest('a, button, input, [data-cursor]')); };
    const leave = () => setVisible(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', over);
    document.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', over);
      document.removeEventListener('mouseleave', leave);
    };
  }, [x, y]);

  return (
    <motion.div aria-hidden className="hidden md:block fixed top-0 left-0 z-[60] pointer-events-none" style={{ x: sx, y: sy }}>
      <motion.div className="-translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-white/10 backdrop-blur-[1px]"
        animate={{ width: hovering ? 60 : 20, height: hovering ? 60 : 20, opacity: visible ? 1 : 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }} />
    </motion.div>
  );
}

// --- Homepage-only navbar (minimal; shared Navbar untouched) ---------------
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const links = [
    { name: 'Simulator', href: '/simulator' },
    { name: 'Chat', href: '/chat' },
    { name: 'Waiting List', href: '/waiting-list' },
    { name: 'Open Source', href: '/open-source' },
    { name: 'Docs', href: '/docs' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -110, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${scrolled ? 'bg-black/60 backdrop-blur-md border-b border-white/10' : 'bg-transparent'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link href="/" className="flex items-center gap-2 group relative z-50">
              <div className="relative w-8 h-8 md:w-9 md:h-9 transition-transform group-hover:scale-105 duration-200">
                <img src="/KANDOlogo.png" alt="KANDO Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <span className="font-bold text-lg md:text-xl tracking-tight">KANDO</span>
            </Link>

            <div className="hidden md:flex items-center gap-7 lg:gap-9">
              {links.map((l) => (
                <Link key={l.name} href={l.href} className="text-white/65 hover:text-white transition-colors text-sm font-medium">{l.name}</Link>
              ))}
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
                {links.map((l) => (
                  <Link key={l.name} href={l.href} onClick={() => setOpen(false)} className="block px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium">{l.name}</Link>
                ))}
              </div>
              <Link href="/waiting-list" onClick={() => setOpen(false)} className="mt-6 flex items-center justify-center px-4 py-3 rounded-full bg-white text-black font-medium transition-colors">Get early access</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Shared section heading (animated on scroll) ---------------------------
function SectionHeading({ eyebrow, title, highlight, sub }: { eyebrow: string; title: string; highlight: string; sub: string }) {
  return (
    <Stagger className="text-center max-w-2xl mx-auto">
      <motion.div variants={revealItem} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/15 mb-5">
        <span className="text-xs text-white/70 font-medium uppercase tracking-wide">{eyebrow}</span>
      </motion.div>
      <motion.h2 variants={revealItem} className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-[-0.02em] leading-[1.1]">
        {title} <span className="bg-gradient-to-r from-[#2ea88a] via-[#54c9a6] to-[#2ea88a] bg-clip-text text-transparent">{highlight}</span>
      </motion.h2>
      <motion.p variants={revealItem} className="mt-4 text-sm md:text-base text-white/55">{sub}</motion.p>
    </Stagger>
  );
}
