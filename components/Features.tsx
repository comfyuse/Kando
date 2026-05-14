'use client';

import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const features = [
  {
    id: 'simulator',
    title: 'Network Simulator',
    description: 'Visualize and test the CANDO protocol with our interactive hexagonal network simulator.',
    icon: '🎮',
    color: 'from-jade/20 to-transparent',
    href: '/simulator',
    stats: 'Real-time simulation',
  },
  {
    id: 'encryption',
    title: 'E2E Encryption',
    description: 'Military-grade end-to-end encryption ensuring your conversations stay private.',
    icon: '🔐',
    color: 'from-jade/20 to-transparent',
    href: '/chat',
    stats: 'Signal Protocol',
  },
  {
    id: 'open-source',
    title: 'Open Source',
    description: 'Fully transparent codebase. Audit, contribute, and build with complete freedom.',
    icon: '📦',
    color: 'from-jade/20 to-transparent',
    href: '/open-source',
    stats: 'MIT License',
  },
  {
    id: 'decentralized',
    title: 'Decentralized',
    description: 'No central servers. Your data belongs to you, not corporations.',
    icon: '🌐',
    color: 'from-jade/20 to-transparent',
    href: '/waiting-list',
    stats: 'P2P Network',
  },
];

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Why Choose{' '}
            <span className="bg-gradient-to-r from-jade to-jade-hover bg-clip-text text-transparent">
              Cando Hex
            </span>
          </h2>
          <p className="text-base md:text-lg text-[#8b949e] max-w-2xl mx-auto">
            Built with cutting-edge technology to redefine how we communicate
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link href={feature.href}>
                <div className="github-card p-6 hover:border-jade transition-all duration-300 cursor-pointer group h-full">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-semibold text-white group-hover:text-jade transition-colors mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-[#8b949e] mb-3">
                        {feature.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-jade font-mono">{feature.stats}</span>
                        <span className="text-[#8b949e] group-hover:translate-x-1 transition-transform duration-200">
                          →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}