'use client'

import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)
  const [showGraph, setShowGraph] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('cando-theme')
    setIsDark(stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches))
    
    const graphStored = localStorage.getItem('cando-show-graph')
    if (graphStored !== null) {
      setShowGraph(graphStored === 'true')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    localStorage.setItem('cando-theme', newTheme)
    document.documentElement.classList.toggle('dark', !isDark)
  }

  const toggleGraph = () => {
    const newState = !showGraph
    setShowGraph(newState)
    localStorage.setItem('cando-show-graph', String(newState))
    window.dispatchEvent(new CustomEvent('toggleGraph', { detail: newState }))
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleGraph}
        className={`glass rounded-full p-2.5 hover:scale-110 transition-all duration-300 ${
          showGraph ? 'text-[var(--gold)]' : 'text-[var(--text-muted)]'
        }`}
        aria-label={showGraph ? 'Hide connections' : 'Show connections'}
        title={showGraph ? 'Hide connections' : 'Show connections'}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>

      <button
        onClick={toggleTheme}
        className="glass rounded-full p-2.5 hover:scale-110 transition-all duration-300"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <div className="relative w-5 h-5">
          <svg
            className={`absolute inset-0 w-5 h-5 transition-all duration-500 ${
              isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
            }`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <svg
            className={`absolute inset-0 w-5 h-5 transition-all duration-500 ${
              isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
            }`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        </div>
      </button>
    </div>
  )
}