'use client';

import { AppTab } from './AppNav';

// A guided, SEQUENTIAL onboarding checklist. A step unlocks only once the
// previous one is complete. Completion is derived live from the hive state
// (invites sent, neighbours approved, friends added) — not manual ticks — so
// the list always reflects reality.

interface Step {
  id: string;
  title: string;
  desc: string;
  current: number;
  total: number;
  cta?: { label: string; tab: AppTab };
}

function buildSteps(p: TasksViewProps): Step[] {
  if (p.isQueen) {
    return [
      {
        id: 'invite',
        title: 'Invite 6 neighbours',
        desc: 'Open the Kando tab and send an invite link for each of the 6 cells around you.',
        current: p.neighborsInvited,
        total: 6,
        cta: { label: 'Go to Kando', tab: 'kando' },
      },
      {
        id: 'approve',
        title: 'Approve your 6 neighbours',
        desc: 'Once they accept and join the hive, approve each neighbour so your ring becomes active.',
        current: p.neighborsApproved,
        total: 6,
        cta: { label: 'Go to Kando', tab: 'kando' },
      },
    ];
  }
  // Regular members get a lighter onboarding path.
  return [
    {
      id: 'cell',
      title: 'Claim your cell',
      desc: 'Accept your invite link to take your place in the hive.',
      current: p.hasCell ? 1 : 0,
      total: 1,
      cta: { label: 'View hive', tab: 'kando' },
    },
    {
      id: 'friend',
      title: 'Add your first contact',
      desc: 'Connect with a peer in the Chats tab and start a conversation.',
      current: Math.min(p.friendCount, 1),
      total: 1,
      cta: { label: 'Go to Chats', tab: 'chats' },
    },
  ];
}

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

interface TasksViewProps {
  isQueen: boolean;
  neighborsInvited: number;
  neighborsApproved: number;
  friendCount: number;
  hasCell: boolean;
  onGoTo: (tab: AppTab) => void;
}

export default function TasksView(props: TasksViewProps) {
  const steps = buildSteps(props);
  const doneFlags = steps.map((s) => s.current >= s.total);
  // The active step is the first one not yet done; everything after is locked.
  const activeIndex = doneFlags.findIndex((d) => !d);
  const allDone = activeIndex === -1;
  const completedCount = doneFlags.filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tasks</h1>
        <span className="text-sm text-[var(--text-muted)]">
          {completedCount} / {steps.length} done
        </span>
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        {props.isQueen
          ? 'Grow your hive — finish each step to unlock the next.'
          : 'A few steps to get you settled in the hive.'}
      </p>

      {allDone && (
        <div className="glass-modern rounded-2xl p-4 mb-4 flex items-center gap-3 border border-[var(--jade)]/30">
          <span className="text-2xl">🎉</span>
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">All tasks complete!</div>
            <div className="text-xs text-[var(--text-muted)]">Your hive is fully set up.</div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const done = doneFlags[i];
          const active = i === activeIndex;
          const locked = !done && !active;
          const pct = Math.min(100, Math.round((step.current / step.total) * 100));

          return (
            <div
              key={step.id}
              className={`glass-modern rounded-2xl p-4 md:p-5 transition-all ${
                locked ? 'opacity-50' : ''
              } ${active ? 'border border-[var(--jade)]/40' : ''}`}
            >
              <div className="flex items-start gap-4">
                {/* Status bubble */}
                <div
                  className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-semibold text-sm ${
                    done
                      ? 'bg-[var(--jade)] text-white'
                      : active
                      ? 'bg-[var(--jade)]/15 text-[var(--jade)] border-2 border-[var(--jade)]/50'
                      : 'bg-white/[0.05] text-[var(--text-muted)]'
                  }`}
                >
                  {done ? <CheckIcon /> : locked ? <LockIcon /> : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm font-semibold ${done ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                      {step.title}
                    </h3>
                    <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums shrink-0">
                      {step.current}/{step.total}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{step.desc}</p>

                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {active && step.cta && (
                    <button
                      onClick={() => props.onGoTo(step.cta!.tab)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white text-xs font-medium hover:opacity-95 transition-opacity"
                    >
                      {step.cta.label}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  )}
                  {locked && (
                    <p className="mt-3 text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                      <LockIcon /> Complete the previous step to unlock.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
