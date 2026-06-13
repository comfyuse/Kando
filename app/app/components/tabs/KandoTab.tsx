'use client';

import { useMemo, useState } from 'react';
import { Account } from '../../types';
import { CopyIcon, CheckIcon, PlusIcon } from '../Icons';

// The 6 cells adjacent to the queen at (0,0) — her invite slots.
const NEIGHBORS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

function randomToken(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Flat-top hexagon points for an SVG <polygon>, centered at (cx, cy).
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

function HiveDiagram({ filled }: { filled: boolean[] }) {
  const size = 240;
  const c = size / 2;
  const r = 34; // hex radius
  const gap = r * 1.8; // distance from center to neighbour centers

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px] mx-auto">
      {NEIGHBORS.map((_, i) => {
        const angle = (Math.PI / 180) * (60 * i);
        const x = c + gap * Math.cos(angle);
        const y = c + gap * Math.sin(angle);
        const isFilled = filled[i];
        return (
          <polygon
            key={i}
            points={hexPoints(x, y, r)}
            className={isFilled ? 'fill-[var(--jade)]/25 stroke-[var(--jade)]' : 'fill-white/[0.03] stroke-white/10'}
            strokeWidth={1.5}
          />
        );
      })}
      {/* Queen cell */}
      <polygon
        points={hexPoints(c, c, r)}
        className="fill-[var(--jade)] stroke-[var(--jade-hover)]"
        strokeWidth={2}
      />
      <text x={c} y={c + 7} textAnchor="middle" fontSize="22">
        👑
      </text>
    </svg>
  );
}

export default function KandoTab({ account }: { account: Account }) {
  const [invites, setInvites] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const filled = useMemo(() => NEIGHBORS.map(([q, r]) => Boolean(invites[`${q},${r}`])), [invites]);
  const sentCount = filled.filter(Boolean).length;

  const linkFor = (token: string) => `${origin}/chat?invite=${token}`;

  const generate = (key: string) => {
    setInvites((prev) => (prev[key] ? prev : { ...prev, [key]: randomToken() }));
  };

  const copy = async (key: string, token: string) => {
    await navigator.clipboard.writeText(linkFor(token));
    setCopied(key);
    setTimeout(() => setCopied((p) => (p === key ? null : p)), 2000);
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-36">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">Kando</h1>
      <p className="text-sm text-[var(--text-muted)] mb-5">
        You are the queen of your hive. Invite up to 6 neighbours into the cells around you.
      </p>

      {/* Hive visual */}
      <div className="glass-modern rounded-3xl p-6">
        <HiveDiagram filled={filled} />
        <div className="text-center mt-2">
          <div className="text-sm font-semibold text-[var(--text-primary)]">{account.name}&apos;s Hive</div>
          <div className="text-xs text-[var(--text-muted)]">
            {sentCount} of 6 cells invited
          </div>
        </div>
      </div>

      {/* Invite slots */}
      <div className="mt-4 flex flex-col gap-1.5">
        {NEIGHBORS.map(([q, r]) => {
          const key = `${q},${r}`;
          const token = invites[key];
          return (
            <div key={key} className="glass-modern rounded-2xl flex items-center gap-3 px-3.5 py-3">
              <span className="px-2 py-1 rounded-lg bg-white/[0.05] font-mono text-[11px] font-semibold text-[var(--jade)]">
                {q},{r}
              </span>
              <div className="flex-1 min-w-0">
                {token ? (
                  <div className="text-xs text-[var(--text-secondary)] truncate font-mono">{linkFor(token)}</div>
                ) : (
                  <div className="text-xs text-[var(--text-muted)]">Empty cell — invite a neighbour</div>
                )}
              </div>
              {token ? (
                <button
                  onClick={() => copy(key, token)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors"
                >
                  {copied === key ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
                  {copied === key ? 'Copied' : 'Copy'}
                </button>
              ) : (
                <button
                  onClick={() => generate(key)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white text-xs font-medium hover:opacity-95 transition-opacity"
                >
                  <PlusIcon width={14} height={14} />
                  Invite
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
