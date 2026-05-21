'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const replay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const forward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
    }
  };

  const backward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const whyKandoItems = [
    {
      icon: "🔒",
      title: "Privacy First",
      description: "End-to-end encryption ensures only you and your recipient can read your messages. No third-party access, no data collection, complete anonymity.",
      stats: "100% encrypted"
    },
    {
      icon: "🌐",
      title: "Truly Decentralized",
      description: "No central servers, no single point of failure. Your data lives on a distributed network of nodes, making censorship impossible.",
      stats: "P2P network"
    },
    {
      icon: "⛽",
      title: "Gas-Free",
      description: "Unlike blockchain-based platforms, KANDO operates without transaction fees. Communication is free for everyone, always.",
      stats: "$0 fees"
    },
    {
      icon: "🛡️",
      title: "Censorship-Resistant",
      description: "Built on complex contagion theory with the 3-approval rule. No central authority can delete or block your content.",
      stats: "3-approval rule"
    },
    {
      icon: "🔓",
      title: "Open Source",
      description: "100% transparent codebase. Anyone can audit, contribute, or fork the project. Community-driven development.",
      stats: "AGPL-3.0"
    },
    {
      icon: "⚡",
      title: "Lightning Fast",
      description: "Optimized P2P protocol with hexagonal network topology. Messages spread instantly through the mesh network.",
      stats: "< 100ms latency"
    }
  ];

  return (
    <main className="min-h-screen bg-[#0d1117] overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 md:pt-20 pb-10">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-jade/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-jade/5 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-jade/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(46,168,138,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(46,168,138,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Video Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-6 md:mb-8"
          >
            <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-jade/20 border border-jade/30">
              <video
                ref={videoRef}
                src="/KANDOPROMOTE.mp4"
                className="w-full h-auto max-h-[280px] md:max-h-[350px] object-cover"
                poster="/KANDOlogo.png"
              />
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 md:p-4">
                {/* Progress Bar */}
                <div className="mb-2">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-jade"
                  />
                  <div className="flex justify-between text-[10px] md:text-xs text-white/70 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
                
                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <button
                    onClick={backward}
                    className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 md:p-2 transition-all duration-200"
                    aria-label="Backward 10 seconds"
                  >
                    <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={togglePlay}
                    className="bg-jade hover:bg-jade-hover rounded-full p-2 md:p-3 transition-all duration-200 transform hover:scale-105 shadow-lg"
                    aria-label={isPlaying ? "Pause video" : "Play video"}
                  >
                    {isPlaying ? (
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                  
                  <button
                    onClick={forward}
                    className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 md:p-2 transition-all duration-200"
                    aria-label="Forward 10 seconds"
                  >
                    <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={replay}
                    className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 md:p-2 transition-all duration-200"
                    aria-label="Replay from start"
                  >
                    <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Play Button Overlay (when not playing) */}
              {!isPlaying && currentTime === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <button
                    onClick={togglePlay}
                    className="bg-jade hover:bg-jade-hover rounded-full p-4 md:p-5 transition-all duration-200 transform hover:scale-110 shadow-2xl"
                    aria-label="Play video"
                  >
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center mb-4 md:mb-6"
          >
            <div className="relative w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24">
              <Image
                src="/KANDOlogo.png"
                alt="KANDO Logo"
                fill
                className="object-contain rounded-full"
                priority
              />
            </div>
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jade/10 border border-jade/20 mb-4 md:mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-jade opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-jade" />
            </span>
            <span className="text-xs text-jade font-medium">revolutionary protocol</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tighter"
          >
            <span className="bg-gradient-to-r from-jade via-jade-hover to-jade bg-clip-text text-transparent">
              KANDO
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-3 md:mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-[#8b949e] max-w-2xl mx-auto px-4"
          >
            Decentralized, censorship-resistant, and gas-free social network protocol.
            <span className="block text-xs sm:text-sm md:text-base mt-1">Join the revolution of free communication.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-5 md:mt-6 flex flex-col sm:flex-row gap-2 md:gap-3 justify-center px-4"
          >
            <Link
              href="/simulator"
              className="group inline-flex items-center justify-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg bg-jade hover:bg-jade-hover text-white font-medium transition-all duration-200 transform hover:scale-105 text-sm md:text-base shadow-lg shadow-jade/20"
            >
              Launch Simulator
              <svg className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/waiting-list"
              className="group inline-flex items-center justify-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg border border-[#30363d] hover:border-jade hover:text-jade text-[#c9d1d9] font-medium transition-all duration-200 text-sm md:text-base"
            >
              Join Waiting List
              <svg className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2"
          >
            <div className="w-4 h-7 md:w-5 md:h-8 border-2 border-jade/30 rounded-full flex justify-center">
              <div className="w-1 h-1.5 bg-jade rounded-full mt-2 animate-bounce" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why KANDO? Section */}
      <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-b from-[#0d1117] to-[#0a0a0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jade/10 border border-jade/20 mb-4">
              <span className="text-xs text-jade font-medium">Why KANDO?</span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3">
              The Future of{' '}
              <span className="bg-gradient-to-r from-jade to-jade-hover bg-clip-text text-transparent">
                Free Communication
              </span>
            </h2>
            <p className="text-sm md:text-base text-[#8b949e] max-w-2xl mx-auto">
              KANDO combines cutting-edge research with practical technology to create a truly decentralized messaging protocol.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {whyKandoItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="github-card p-5 md:p-6 h-full hover:border-jade transition-all duration-300">
                  <div className="text-3xl md:text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-white group-hover:text-jade transition-colors mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs md:text-sm text-[#8b949e] mb-3 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="inline-block px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-jade/10 border border-jade/20">
                    <span className="text-[10px] md:text-xs text-jade font-mono">{item.stats}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-16 lg:py-20 border-y border-[#30363d] bg-[#0d1117]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {[
              { value: '2.4k+', label: 'GitHub Stars', icon: '⭐' },
              { value: '189+', label: 'Forks', icon: '🍴' },
              { value: '47+', label: 'Contributors', icon: '👥' },
              { value: '100%', label: 'Open Source', icon: '🔓' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center group"
              >
                <div className="text-2xl md:text-3xl lg:text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div className="text-xl md:text-2xl lg:text-3xl font-bold text-jade">{stat.value}</div>
                <div className="text-xs md:text-sm text-[#8b949e] mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-12 lg:mb-16"
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">
              Powerful Features for{' '}
              <span className="bg-gradient-to-r from-jade to-jade-hover bg-clip-text text-transparent">
                Modern Communication
              </span>
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-[#8b949e] max-w-2xl mx-auto px-4">
              Everything you need for secure and decentralized messaging
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                title: 'Network Simulator',
                description: 'Interactive hexagonal network simulation to visualize the KANDO protocol in action.',
                icon: '🎮',
                color: 'from-orange-500/20',
                href: '/simulator',
              },
              {
                title: 'End-to-End Encryption',
                description: 'Military-grade encryption ensuring your conversations stay private and secure.',
                icon: '🔐',
                color: 'from-blue-500/20',
                href: '/chat',
              },
              {
                title: 'Open Source',
                description: '100% transparent codebase. Audit, contribute, and build with freedom.',
                icon: '📦',
                color: 'from-purple-500/20',
                href: '/open-source',
              },
              {
                title: 'Decentralized',
                description: 'No central servers. Your data belongs to you, not corporations.',
                icon: '🌐',
                color: 'from-green-500/20',
                href: '/waiting-list',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link href={feature.href}>
                  <div className="github-card p-4 md:p-6 hover:border-jade transition-all duration-300 cursor-pointer group h-full">
                    <div className={`text-3xl md:text-4xl mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300 inline-block bg-gradient-to-br ${feature.color} p-2 md:p-3 rounded-xl`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-base md:text-lg font-semibold text-white group-hover:text-jade transition-colors mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-xs md:text-sm text-[#8b949e] mb-3">
                      {feature.description}
                    </p>
                    <div className="flex items-center gap-2 text-jade text-xs md:text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Learn more
                      <svg className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-20 lg:py-24 bg-[#0d1117]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-12 lg:mb-16"
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">
              How{' '}
              <span className="bg-gradient-to-r from-jade to-jade-hover bg-clip-text text-transparent">
                KANDO
              </span>{' '}
              Works
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-[#8b949e] max-w-2xl mx-auto px-4">
              Simple, secure, and revolutionary approach to messaging
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                step: '01',
                title: 'Connect',
                description: 'Join the decentralized network using the KANDO protocol.',
                icon: '🔌',
              },
              {
                step: '02',
                title: 'Communicate',
                description: 'Send encrypted messages with end-to-end security.',
                icon: '💬',
              },
              {
                step: '03',
                title: 'Collaborate',
                description: 'Build and contribute to the open-source ecosystem.',
                icon: '🤝',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="text-center">
                  <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-jade/20 mb-3 md:mb-4">
                    {item.step}
                  </div>
                  <div className="text-3xl md:text-4xl mb-3 md:mb-4">{item.icon}</div>
                  <h3 className="text-lg md:text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-xs md:text-sm text-[#8b949e] px-2">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/3 -right-4 lg:-right-6 text-xl lg:text-2xl text-jade/30">
                    →
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-jade/10 via-jade/5 to-transparent border border-jade/20 p-6 md:p-8 lg:p-12 text-center"
          >
            <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-jade/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 md:w-64 md:h-64 bg-jade/5 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="text-5xl md:text-6xl mb-4">🚀</div>
              <h2 className="text-xl md:text-2xl lg:text-4xl font-bold text-white mb-3 md:mb-4">
                Ready to Join the Revolution?
              </h2>
              <p className="text-sm md:text-base lg:text-lg text-[#8b949e] mb-6 md:mb-8 max-w-2xl mx-auto px-4">
                Be part of the future of communication. Join our waiting list and get early access.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
                <Link
                  href="/waiting-list"
                  className="inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-lg bg-jade hover:bg-jade-hover text-white font-medium transition-all duration-200 transform hover:scale-105 text-sm md:text-base shadow-lg shadow-jade/20"
                >
                  Join Waiting List
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Link>
                <Link
                  href="/simulator"
                  className="inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-lg border border-[#30363d] hover:border-jade hover:text-jade text-[#c9d1d9] font-medium transition-all duration-200 text-sm md:text-base"
                >
                  Try Simulator
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#30363d] bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
            <div className="col-span-1 md:col-span-1 text-center md:text-left">
              <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
                <div className="relative w-8 h-8">
                  <Image
                    src="/KANDOlogo.png"
                    alt="KANDO Logo"
                    fill
                    className="object-contain rounded-full"
                  />
                </div>
                <span className="font-bold text-base md:text-lg text-white group-hover:text-jade transition-colors">
                  KANDO
                </span>
              </Link>
              <p className="text-xs md:text-sm text-[#8b949e] mt-3 md:mt-4">
                Building the future of decentralized communication.
              </p>
              <div className="flex justify-center md:justify-start gap-4 mt-4 md:mt-6">
                <a 
                  href="https://github.com/comfyuse/Kando" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#8b949e] hover:text-jade transition-colors"
                  aria-label="GitHub"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48 0-.24-.01-.9-.01-1.75-2.78.6-3.37-1.2-3.37-1.2-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.26.1-2.62 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.36.2 2.37.1 2.62.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .26.18.58.69.48C19.13 20.17 22 16.42 22 12c0-5.52-4.48-10-10-10z"/>
                  </svg>
                </a>
                <a href="#" className="text-[#8b949e] hover:text-jade transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0021.098-11.792c0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className="col-span-3 grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 text-center md:text-left">
              <div>
                <h3 className="text-xs md:text-sm font-semibold text-white mb-3 md:mb-4">Product</h3>
                <ul className="space-y-2">
                  <li><Link href="/simulator" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">Simulator</Link></li>
                  <li><Link href="/chat" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">Chat App</Link></li>
                  <li><Link href="/waiting-list" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">Waiting List</Link></li>
                  <li><Link href="/open-source" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">Open Source</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-semibold text-white mb-3 md:mb-4">Resources</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">Documentation</a></li>
                  <li><a href="#" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">API Reference</a></li>
                  <li><a href="https://github.com/comfyuse/Kando" target="_blank" rel="noopener noreferrer" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">GitHub</a></li>
                  <li><a href="#" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">Blog</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-semibold text-white mb-3 md:mb-4">Company</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">About</a></li>
                  <li><a href="#" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">Contact</a></li>
                  <li><a href="#" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="text-xs md:text-sm text-[#8b949e] hover:text-jade transition-colors">Terms of Service</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-[#30363d] mt-8 md:mt-10 lg:mt-12 pt-6 md:pt-8 text-center">
            <p className="text-[10px] md:text-xs text-[#8b949e]">
              © {new Date().getFullYear()} KANDO. All rights reserved. Built with ❤️ for open source.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}