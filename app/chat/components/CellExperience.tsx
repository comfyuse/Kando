'use client';

// The key-based hive experience: issuer mints the queen, holders log in with a
// private key, set a local-only profile, and the ego-centric hive shows their 6
// neighbours. Invite empty slots; verify neighbours by exchanging an encrypted
// profile and signing an approval. Status is derived by the backend from those
// approvals (reserved → candidate → citizen).

import { useCallback, useEffect, useState } from 'react';
import { login as issuerLogin } from '@/lib/auth-client';
import { joinWaitlist } from '@/lib/auth-client';
import {
  CellState,
  Neighbour,
  Profile,
  mintQueen,
  cellLogin,
  inviteNeighbour,
  approveNeighbour,
  sendProfile,
  fetchProfiles,
  decryptProfile,
  publicKeyFromBlob,
  storeKeyBlob,
  getStoredKeyBlob,
  clearCellSession,
  storeProfile,
  getProfile,
} from '@/lib/cell-client';

type Entry = 'waitlist' | 'key' | 'issuer';

const STATUS_COLOR: Record<string, string> = {
  reserved: '#f59e0b',
  candidate: '#3b82f6',
  citizen: 'var(--jade)',
};

// axial (q,r) → pixel offset from centre, flat-top hexagons
function hexPixel(q: number, r: number, size: number): { x: number; y: number } {
  return { x: size * 1.5 * q, y: size * Math.sqrt(3) * (r + q / 2) };
}

function Hexagon({
  cx,
  cy,
  size,
  fill,
  stroke,
  onClick,
  children,
}: {
  cx: number;
  cy: number;
  size: number;
  fill: string;
  stroke: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i);
    return `${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`;
  }).join(' ');
  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={2} />
      {children}
    </g>
  );
}

export default function CellExperience() {
  const [keyBlob, setKeyBlob] = useState<string | null>(null);
  const [cell, setCell] = useState<CellState | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, setPending] = useState<{ from: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // restore a stored key session
  useEffect(() => {
    const b = getStoredKeyBlob();
    if (b) {
      setKeyBlob(b);
      setProfile(getProfile());
    }
  }, []);

  const refresh = useCallback(async (blob: string) => {
    const pub = publicKeyFromBlob(blob);
    const state = await cellLogin(pub);
    setCell(state);
    // pull + decrypt any profiles neighbours sent me to verify
    const envs = await fetchProfiles(pub);
    const decoded: { from: string; name: string }[] = [];
    for (const e of envs) {
      try {
        const p = await decryptProfile(blob, e.from, e.ciphertext);
        decoded.push({ from: e.from, name: `${p.firstName} ${p.lastName}`.trim() });
      } catch {
        /* not for me / bad ciphertext */
      }
    }
    setPending(decoded);
  }, []);

  useEffect(() => {
    if (keyBlob) refresh(keyBlob).catch((e) => setError(String(e)));
  }, [keyBlob, refresh]);

  const enterWithKey = (blob: string) => {
    storeKeyBlob(blob);
    setKeyBlob(blob);
    setProfile(getProfile());
  };

  const logout = () => {
    clearCellSession();
    setKeyBlob(null);
    setCell(null);
    setProfile(null);
  };

  // ── not signed in: entry screen ──────────────────────────────────────────
  if (!keyBlob) {
    return <EntryScreen onEnterKey={enterWithKey} />;
  }

  // ── signed in but no profile yet: first task ─────────────────────────────
  if (!profile) {
    return (
      <ProfileForm
        onSave={(p) => {
          storeProfile(p);
          setProfile(p);
        }}
      />
    );
  }

  // ── the hive ──────────────────────────────────────────────────────────────
  const SIZE = 46;
  const W = 360;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;

  const doInvite = async (q: number, r: number) => {
    setBusy(true);
    setError(null);
    try {
      const nk = await inviteNeighbour(keyBlob, q, r);
      setNotice(
        `Neighbour minted at (${q},${r}). Hand them this private key:\n\n${nk.privateKey}`,
      );
      await refresh(keyBlob);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const requestApproval = async () => {
    setBusy(true);
    setError(null);
    try {
      const targets = (cell?.neighbours || []).filter((n) => n.occupied && n.pubKey);
      for (const n of targets) {
        await sendProfile(keyBlob, n.pubKey!, profile);
      }
      setNotice(`Sent your encrypted profile to ${targets.length} neighbour(s) for verification.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const approve = async (targetPub: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await approveNeighbour(keyBlob, targetPub);
      setNotice(`Approved. Their status is now: ${res.status} (${res.approvals}/6).`);
      setPending((p) => p.filter((x) => x.from !== targetPub));
      await refresh(keyBlob);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const myColor = STATUS_COLOR[cell?.status || 'reserved'] || '#888';
  const approvedCount = (cell?.neighbours || []).filter((n) => n.approved).length;

  return (
    <main className="min-h-[100dvh] w-full flex flex-col items-center px-5 py-8 bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] text-[var(--text-primary)]">
      <div className="w-full max-w-md flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold">🐝 Your cell</h1>
          <p className="text-xs text-[var(--text-muted)]">
            {profile.firstName} {profile.lastName} · ({cell?.q ?? '–'},{cell?.r ?? '–'})
          </p>
        </div>
        <button onClick={logout} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          Sign out
        </button>
      </div>

      <div className="w-full max-w-md flex items-center gap-2 mb-4">
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
          style={{ background: `${myColor}22`, color: myColor, border: `1px solid ${myColor}55` }}
        >
          {cell?.status || '…'}
        </span>
        <span className="text-xs text-[var(--text-muted)]">{approvedCount}/6 neighbours approved you</span>
      </div>

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mb-2">
        {/* neighbours */}
        {(cell?.neighbours || []).map((n) => {
          const p = hexPixel(n.q - (cell?.q ?? 0), n.r - (cell?.r ?? 0), SIZE);
          const x = cx + p.x;
          const y = cy + p.y;
          const fill = n.occupied ? `${STATUS_COLOR[n.status || 'reserved']}22` : 'rgba(255,255,255,0.03)';
          const stroke = n.occupied ? STATUS_COLOR[n.status || 'reserved'] : 'rgba(255,255,255,0.15)';
          return (
            <Hexagon
              key={`${n.q},${n.r}`}
              cx={x}
              cy={y}
              size={SIZE}
              fill={fill}
              stroke={stroke}
              onClick={n.occupied ? undefined : () => doInvite(n.q, n.r)}
            >
              <text x={x} y={y - 4} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
                {n.q},{n.r}
              </text>
              <text x={x} y={y + 10} textAnchor="middle" fontSize="9" fill="var(--text-muted)">
                {n.occupied ? (n.approved ? '✓ approved' : n.status) : '+ invite'}
              </text>
            </Hexagon>
          );
        })}
        {/* centre = me */}
        <Hexagon cx={cx} cy={cy} size={SIZE} fill={`${myColor}33`} stroke={myColor}>
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize="11" fill="var(--text-primary)" fontWeight="600">
            you
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--text-muted)">
            {cell?.status}
          </text>
        </Hexagon>
      </svg>

      <div className="w-full max-w-md flex flex-col gap-2">
        <button
          onClick={requestApproval}
          disabled={busy}
          className="py-3 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white font-semibold text-sm disabled:opacity-60"
        >
          Send my profile to neighbours for verification
        </button>

        {pending.length > 0 && (
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-xs text-[var(--text-muted)] mb-2">Neighbours asking you to verify them:</p>
            {pending.map((p) => (
              <div key={p.from} className="flex items-center justify-between py-1">
                <span className="text-sm">{p.name || 'Unknown'}</span>
                <button
                  onClick={() => approve(p.from)}
                  disabled={busy}
                  className="text-xs px-3 py-1 rounded-lg bg-[var(--jade)]/15 text-[var(--jade)] border border-[var(--jade)]/30 disabled:opacity-60"
                >
                  Verify &amp; approve
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-[var(--text-muted)] text-center">
          Tap an empty hex to invite a neighbour. Your profile never leaves this device unencrypted.
        </p>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 max-w-md">
          {error}
        </p>
      )}
      {notice && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-5 z-50" onClick={() => setNotice(null)}>
          <div className="bg-[#161b22] border border-white/10 rounded-2xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm whitespace-pre-wrap break-all">{notice}</p>
            <button onClick={() => setNotice(null)} className="mt-4 w-full py-2 rounded-xl bg-[var(--jade)] text-white text-sm font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Entry: waitlist · key login · issuer ────────────────────────────────────
function EntryScreen({ onEnterKey }: { onEnterKey: (blob: string) => void }) {
  const [mode, setMode] = useState<Entry>('waitlist');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [blob, setBlob] = useState('');
  const [joined, setJoined] = useState(false);
  const [issuerToken, setIssuerToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (issuerToken) return <IssuerPanel token={issuerToken} onEnterKey={onEnterKey} />;

  return (
    <main className="min-h-[100dvh] w-full flex items-center justify-center px-5 py-10 bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-2xl mb-3">🐝</div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">KANDO</h1>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-white/[0.04] mb-5 text-xs">
          {(['waitlist', 'key', 'issuer'] as Entry[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`py-2 rounded-xl font-medium capitalize ${mode === m ? 'bg-[var(--jade)] text-white' : 'text-[var(--text-muted)]'}`}
            >
              {m === 'key' ? 'Private key' : m}
            </button>
          ))}
        </div>

        <div className="glass-modern rounded-3xl p-6 flex flex-col gap-3">
          {mode === 'waitlist' && !joined && (
            <>
              <p className="text-sm text-[var(--text-muted)] text-center">Join the waitlist for early access</p>
              <input className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)]" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button disabled={busy} onClick={() => run(async () => { await joinWaitlist({ email }); setJoined(true); })} className="py-3 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white font-semibold text-sm disabled:opacity-60">Join the waitlist</button>
            </>
          )}
          {mode === 'waitlist' && joined && (
            <div className="text-center py-2">
              <div className="text-3xl mb-2">🐝</div>
              <p className="text-sm">You&apos;re on the waitlist. Entry is by invite key only.</p>
            </div>
          )}

          {mode === 'key' && (
            <>
              <p className="text-sm text-[var(--text-muted)] text-center">Enter with your private key</p>
              <textarea className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-xs text-[var(--text-primary)] font-mono h-28" placeholder="Paste your private key" value={blob} onChange={(e) => setBlob(e.target.value)} />
              <button disabled={busy || !blob.trim()} onClick={() => run(async () => {
                const b = blob.trim();
                const pub = publicKeyFromBlob(b); // throws if malformed
                const state = await cellLogin(pub);
                if (!state) throw new Error('No cell found for this key.');
                onEnterKey(b);
              })} className="py-3 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white font-semibold text-sm disabled:opacity-60">Enter the hive</button>
            </>
          )}

          {mode === 'issuer' && (
            <>
              <p className="text-sm text-[var(--text-muted)] text-center">Issuer sign-in</p>
              <input className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)]" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input type="password" className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)]" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button disabled={busy} onClick={() => run(async () => {
                await issuerLogin({ email, password });
                const { getStoredToken } = await import('@/lib/auth-client');
                setIssuerToken(getStoredToken());
              })} className="py-3 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white font-semibold text-sm disabled:opacity-60">Sign in</button>
            </>
          )}

          {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
      </div>
    </main>
  );
}

// ── Issuer: mint the queen ──────────────────────────────────────────────────
function IssuerPanel({ token, onEnterKey }: { token: string; onEnterKey: (blob: string) => void }) {
  const [minted, setMinted] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="min-h-[100dvh] w-full flex items-center justify-center px-5 py-10 bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f]">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">Issuer</h1>
        <p className="text-sm text-[var(--text-muted)] text-center mb-6">Mint the queen cell at (0,0)</p>
        <div className="glass-modern rounded-3xl p-6 flex flex-col gap-3">
          {!minted && (
            <button disabled={busy} onClick={async () => {
              setBusy(true); setError(null);
              try { setMinted(await mintQueen(token)); }
              catch (e) { setError(e instanceof Error ? e.message : String(e)); }
              finally { setBusy(false); }
            }} className="py-3 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white font-semibold text-sm disabled:opacity-60">
              {busy ? 'Minting…' : 'Mint the queen'}
            </button>
          )}
          {minted && (
            <>
              <p className="text-xs text-[var(--text-muted)]">Queen minted. Hand this private key to the queen (shown once):</p>
              <textarea readOnly className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-[11px] font-mono h-28" value={minted.privateKey} />
              <button onClick={() => onEnterKey(minted.privateKey)} className="py-3 rounded-xl bg-[var(--jade)] text-white font-semibold text-sm">Enter as the queen on this device</button>
            </>
          )}
          {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
      </div>
    </main>
  );
}

// ── First task: local-only profile ─────────────────────────────────────────
function ProfileForm({ onSave }: { onSave: (p: Profile) => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  return (
    <main className="min-h-[100dvh] w-full flex items-center justify-center px-5 py-10 bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f]">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">Your profile</h1>
        <p className="text-sm text-[var(--text-muted)] text-center mb-6">Stored only on this device — never sent to any server.</p>
        <div className="glass-modern rounded-3xl p-6 flex flex-col gap-3">
          <input className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)]" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)]" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <button disabled={!firstName.trim()} onClick={() => onSave({ firstName: firstName.trim(), lastName: lastName.trim() })} className="py-3 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white font-semibold text-sm disabled:opacity-60">Save &amp; enter the hive</button>
        </div>
      </div>
    </main>
  );
}
