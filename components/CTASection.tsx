'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CTASection() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-jade/10 via-jade/5 to-transparent border border-jade/20 p-8 md:p-12 text-center"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-jade/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-jade/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Ready to be part of the future?
            </h2>
            <p className="text-base md:text-lg text-[#8b949e] mb-8 max-w-2xl mx-auto">
              Join the waiting list and be among the first to experience the next generation of secure messaging.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/waiting-list"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-jade hover:bg-jade-hover text-white font-medium transition-all duration-200"
              >
                Join Waiting List
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
              <Link
                href="/simulator"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[#30363d] hover:border-jade hover:text-jade text-[#c9d1d9] font-medium transition-all duration-200"
              >
                Try Simulator
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}