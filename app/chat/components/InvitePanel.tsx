'use client';

import { useState } from 'react';
import { NetworkMember, Invite } from '@/lib/dht-client';

// The 6 cells adjacent to the queen at (0,0) — her invite slots.
const QUEEN_NEIGHBORS: [number, number][] = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

interface InvitePanelProps {
  members: NetworkMember[];
  invites: Invite[];
  onCreateInvite: (q: number, r: number) => Promise<Invite | null>;
  isMobile: boolean;
}

type SlotState =
  | { kind: 'occupied'; name: string; status: string }
  | { kind: 'invited'; invite: Invite }
  | { kind: 'empty' };

function slotState(q: number, r: number, members: NetworkMember[], invites: Invite[]): SlotState {
  const member = members.find(m => m.hasCell && m.cellQ === q && m.cellR === r);
  if (member) return { kind: 'occupied', name: member.name, status: member.status || 'reserved' };
  const invite = invites.find(i => i.cellQ === q && i.cellR === r);
  if (invite) return { kind: 'invited', invite };
  return { kind: 'empty' };
}

function inviteLink(token: string): string {
  return `${window.location.origin}/chat?invite=${token}`;
}

export default function InvitePanel({ members, invites, onCreateInvite, isMobile }: InvitePanelProps) {
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [copiedSlot, setCopiedSlot] = useState<string | null>(null);

  const copy = async (key: string, token: string) => {
    await navigator.clipboard.writeText(inviteLink(token));
    setCopiedSlot(key);
    setTimeout(() => setCopiedSlot(prev => (prev === key ? null : prev)), 2000);
  };

  const handleInvite = async (q: number, r: number) => {
    const key = `${q},${r}`;
    setBusySlot(key);
    try {
      const invite = await onCreateInvite(q, r);
      if (invite) await copy(key, invite.token);
    } finally {
      setBusySlot(null);
    }
  };

  const statusColor: Record<string, string> = {
    citizen: 'text-emerald-400',
    candidate: 'text-sky-400',
    reserved: 'text-red-400',
  };

  return (
    <div className={`glass-modern rounded-2xl overflow-hidden ${isMobile ? 'w-full' : 'w-72'}`}>
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <span className="text-base">👑</span>
        <div>
          <div className="text-[11px] font-semibold text-[var(--text-primary)] tracking-wider uppercase">Queen&apos;s Invites</div>
          <div className="text-[9px] text-[var(--text-muted)]">Send an invite link for each of your 6 neighbour cells</div>
        </div>
      </div>
      <div className="p-2 flex flex-col gap-1.5">
        {QUEEN_NEIGHBORS.map(([q, r]) => {
          const key = `${q},${r}`;
          const state = slotState(q, r, members, invites);
          return (
            <div key={key} className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-white/5 font-mono text-[10px] font-semibold text-[var(--jade)]">{q},{r}</span>
                {state.kind === 'occupied' ? (
                  <div>
                    <div className="text-xs font-medium text-[var(--text-primary)]">{state.name}</div>
                    <div className={`text-[9px] uppercase tracking-wider ${statusColor[state.status] || 'text-[var(--text-muted)]'}`}>{state.status}</div>
                  </div>
                ) : state.kind === 'invited' ? (
                  <div className="text-[10px] text-amber-300">Invite sent — waiting…</div>
                ) : (
                  <div className="text-[10px] text-[var(--text-muted)]">Empty cell</div>
                )}
              </div>

              {state.kind === 'invited' && (
                <button
                  onClick={() => copy(key, state.invite.token)}
                  className="px-2 py-1 text-[9px] font-medium rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                >
                  {copiedSlot === key ? '✓ Copied' : '📋 Copy link'}
                </button>
              )}
              {state.kind === 'empty' && (
                <button
                  onClick={() => handleInvite(q, r)}
                  disabled={busySlot === key}
                  className="px-2 py-1 text-[9px] font-medium rounded-lg bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {busySlot === key ? '…' : copiedSlot === key ? '✓ Copied' : '✉️ Invite'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
