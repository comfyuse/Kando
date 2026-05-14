'use client'

import { useState, useCallback } from 'react'

interface Proposal {
  id: string
  title: string
  description: string
  votesFor: number
  votesAgainst: number
  status: 'active' | 'passed' | 'rejected'
}

export default function SlidingSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'voting' | 'members' | 'settings'>('voting')
  const [proposals, setProposals] = useState<Proposal[]>([
    {
      id: '1',
      title: 'Increase Max Ring to 10',
      description: 'Should we expand the hive from 8 rings to 10 rings?',
      votesFor: 42,
      votesAgainst: 18,
      status: 'active',
    },
    {
      id: '2',
      title: 'New Member Role: Ambassador',
      description: 'Add a special role for cells that connect different colonies.',
      votesFor: 67,
      votesAgainst: 12,
      status: 'active',
    },
    {
      id: '3',
      title: 'Reduce Death Rate',
      description: 'Change death ratio from 1:100 to 1:200.',
      votesFor: 89,
      votesAgainst: 5,
      status: 'passed',
    },
  ])

  const [userVotes, setUserVotes] = useState<Set<string>>(new Set())

  const handleVote = useCallback((proposalId: string, voteType: 'for' | 'against') => {
    if (userVotes.has(proposalId)) return

    setProposals(prev =>
      prev.map(p =>
        p.id === proposalId
          ? {
              ...p,
              votesFor: voteType === 'for' ? p.votesFor + 1 : p.votesFor,
              votesAgainst: voteType === 'against' ? p.votesAgainst + 1 : p.votesAgainst,
              status: (voteType === 'for' && p.votesFor + 1 >= 100) ? 'passed'
                : (voteType === 'against' && p.votesAgainst + 1 >= 50) ? 'rejected'
                : p.status,
            }
          : p
      )
    )
    setUserVotes(prev => new Set(prev).add(proposalId))
  }, [userVotes])

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute top-1/2 left-0 -translate-y-1/2 z-40 pointer-events-auto glass-btn !rounded-l-none !rounded-r-xl !px-3 !py-4"
        >
          <svg className="w-5 h-5 text-[var(--gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <div
        className={`absolute top-0 left-0 h-full w-96 z-40 pointer-events-auto transition-all duration-500 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full glass-strong rounded-r-2xl overflow-hidden flex flex-col shadow-2xl border border-[var(--glass-border)] border-l-0">
          
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-bold gold-text tracking-[0.15em] uppercase">GOVERNANCE</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex border-b border-[var(--border)]">
            {(['voting', 'members', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase transition-all ${
                  activeTab === tab
                    ? 'text-[var(--gold)] border-b-2 border-[var(--gold)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {activeTab === 'voting' && (
              <div className="space-y-3">
                <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.1em] uppercase px-2 mb-1">
                  Active Proposals
                </div>
                {proposals.filter(p => p.status === 'active').map(proposal => (
                  <div
                    key={proposal.id}
                    className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] space-y-3 animate-fadeIn"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{proposal.title}</h3>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">{proposal.description}</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                        <span>For: {proposal.votesFor}</span>
                        <span>Against: {proposal.votesAgainst}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {!userVotes.has(proposal.id) ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVote(proposal.id, 'for')}
                          className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-[11px] font-semibold hover:bg-emerald-500/20 transition-all"
                        >
                          Vote For
                        </button>
                        <button
                          onClick={() => handleVote(proposal.id, 'against')}
                          className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-500 text-[11px] font-semibold hover:bg-red-500/20 transition-all"
                        >
                          Vote Against
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2 rounded-lg bg-amber-500/10 text-amber-500 text-[11px] font-semibold">
                        Vote Recorded
                      </div>
                    )}
                  </div>
                ))}

                {proposals.filter(p => p.status !== 'active').length > 0 && (
                  <>
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.1em] uppercase px-2 mt-6 mb-1">
                      Completed
                    </div>
                    {proposals.filter(p => p.status !== 'active').map(proposal => (
                      <div
                        key={proposal.id}
                        className={`p-4 rounded-xl border animate-fadeIn ${
                          proposal.status === 'passed'
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-red-500/5 border-red-500/20'
                        }`}
                      >
                        <span className={`text-[10px] font-bold tracking-[0.1em] uppercase ${
                          proposal.status === 'passed' ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {proposal.status}
                        </span>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1">{proposal.title}</h3>
                        <div className="flex gap-4 mt-2 text-[10px] text-[var(--text-muted)]">
                          <span>For: {proposal.votesFor}</span>
                          <span>Against: {proposal.votesAgainst}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="flex items-center justify-center h-40 text-[var(--text-muted)] text-sm">
                Members list coming soon
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="flex items-center justify-center h-40 text-[var(--text-muted)] text-sm">
                Settings coming soon
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}