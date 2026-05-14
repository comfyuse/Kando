'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const stats = [
  { value: '2.4k+', label: 'GitHub Stars', icon: '⭐' },
  { value: '189+', label: 'Forks', icon: '🍴' },
  { value: '47+', label: 'Contributors', icon: '👥' },
  { value: '100%', label: 'Open Source', icon: '🔓' },
];

export default function Stats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-12 md:py-16 border-y border-[#30363d] bg-[#0d1117]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl mb-2">{stat.icon}</div>
              <div className="text-2xl md:text-3xl font-bold text-jade">{stat.value}</div>
              <div className="text-xs md:text-sm text-[#8b949e] mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}