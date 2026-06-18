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
  storeInvitedKey,
  getInvitedKey,
  reinviteNeighbour,
} from '@/lib/cell-client';
import dynamic from 'next/dynamic';
import { Network } from '@/lib/simulator';

// The same canvas hex simulator the chat page has always used.
const Scene2D = dynamic(() => import('@/components/Scene2D'), { ssr: false });

type Entry = 'waitlist' | 'key' | 'issuer';

const STATUS_COLOR: Record<string, string> = {
  reserved: '#f59e0b',
  candidate: '#3b82f6',
  citizen: 'var(--jade)',
};

export default function CellExperience() {
  const [keyBlob, setKeyBlob] = useState<string | null>(null);
  const [cell, setCell] = useState<CellState | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, setPending] = useState<{ from: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [neighbourSel, setNeighbourSel] = useState<{ q: number; r: number; pubKey: string } | null>(null);

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
    const seen = new Set<string>();
    for (const e of envs) {
      if (seen.has(e.from)) continue; // one verification request per neighbour
      try {
        const p = await decryptProfile(blob, e.from, e.ciphertext);
        decoded.push({ from: e.from, name: `${p.firstName} ${p.lastName}`.trim() });
        seen.add(e.from);
      } catch {
        /* not for me / bad ciphertext */
      }
    }
    setPending(decoded);
  }, []);

  useEffect(() => {
    if (!keyBlob) return;
    refresh(keyBlob).catch((e) => setError(String(e)));
    // auto-refresh so new verification requests + status changes show up
    // without the user reloading.
    const id = setInterval(() => refresh(keyBlob).catch(() => {}), 8000);
    return () => clearInterval(id);
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

  // ── the hive (rendered with the Scene2D simulator) ─────────────────────────
  // Build a simulator Network from my cell + occupied neighbours, carrying the
  // real backend statuses; empty neighbour slots become clickable ghost hexes.
  const net = new Network('mvp');
  net.cells.clear();
  if (cell) {
    const me = net.seedMember(cell.q, cell.r);
    me.status = cell.status as 'reserved' | 'candidate' | 'citizen';
    for (const n of cell.neighbours) {
      if (n.occupied) {
        const nc = net.seedMember(n.q, n.r);
        nc.status = (n.status || 'reserved') as 'reserved' | 'candidate' | 'citizen';
      }
    }
  }
  const ghostCoords = (cell?.neighbours || [])
    .filter((n) => !n.occupied)
    .map((n) => ({ q: n.q, r: n.r }));

  const doInvite = async (q: number, r: number) => {
    setBusy(true);
    setError(null);
    try {
      const nk = await inviteNeighbour(keyBlob, q, r);
      storeInvitedKey(q, r, nk.privateKey); // remember it so it can be re-copied
      setNotice(
        `Neighbour minted at (${q},${r}). Hand them this private key (also saved on this device — tap the cell to copy again):\n\n${nk.privateKey}`,
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

  const regenerate = async (q: number, r: number) => {
    setBusy(true);
    setError(null);
    try {
      const nk = await reinviteNeighbour(keyBlob, q, r);
      storeInvitedKey(q, r, nk.privateKey);
      setNeighbourSel(null);
      setNotice(`New key for the neighbour at (${q},${r}). Hand it to them:\n\n${nk.privateKey}`);
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

      <div className="w-full max-w-md h-[420px] rounded-2xl border border-white/10 overflow-hidden mb-3 bg-[#0a0a0f]">
        <Scene2D
          network={net}
          ghostCoords={ghostCoords}
          onGhostClick={(q, r) => doInvite(q, r)}
          onCellClick={(c) => {
            const nb = cell?.neighbours.find((n) => n.q === c.coord.q && n.r === c.coord.r && n.occupied);
            if (nb?.pubKey) setNeighbourSel({ q: nb.q, r: nb.r, pubKey: nb.pubKey });
          }}
        />
      </div>
      <p className="w-full max-w-md text-[11px] text-[var(--text-muted)] mb-3">
        Gold = queen · green = citizen · blue = candidate · red = reserved · dashed = invite. Drag to pan, scroll to zoom.
      </p>

      <div className="w-full max-w-md flex flex-col gap-2">
        <button
          onClick={requestApproval}
          disabled={busy}
          className="py-3 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white font-semibold text-sm disabled:opacity-60"
        >
          Send my profile to neighbours for verification
        </button>

        {(cell?.neighbours || []).some((n) => n.occupied) && (
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-xs text-[var(--text-muted)] mb-2">Your neighbours:</p>
            {(cell?.neighbours || [])
              .filter((n) => n.occupied)
              .map((n) => (
                <div key={`${n.q},${n.r}`} className="flex items-center justify-between py-1 text-sm">
                  <span className="capitalize" style={{ color: STATUS_COLOR[n.status || 'reserved'] || '#888' }}>
                    ({n.q},{n.r}) · {n.status}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{n.approvals ?? 0}/6 verified</span>
                </div>
              ))}
          </div>
        )}

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
      {neighbourSel && (() => {
        const saved = getInvitedKey(neighbourSel.q, neighbourSel.r);
        const isPending = pending.some((p) => p.from === neighbourSel.pubKey);
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-5 z-50" onClick={() => setNeighbourSel(null)}>
            <div className="bg-[#161b22] border border-white/10 rounded-2xl p-5 max-w-md w-full flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-sm font-semibold">
                Neighbour at ({neighbourSel.q},{neighbourSel.r})
              </h2>
              {saved ? (
                <>
                  <p className="text-xs text-[var(--text-muted)]">Their private key (saved on this device) — copy and hand it over:</p>
                  <textarea readOnly value={saved} className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-[11px] font-mono h-24" />
                  <button onClick={() => navigator.clipboard?.writeText(saved)} className="py-2 rounded-xl bg-[var(--jade)] text-white text-sm font-medium">
                    Copy key
                  </button>
                </>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">
                  No key saved on this device for this neighbour. If it was lost, regenerate a fresh one — only works while they haven&apos;t activated yet.
                </p>
              )}
              {isPending && (
                <button
                  onClick={() => { approve(neighbourSel.pubKey); setNeighbourSel(null); }}
                  disabled={busy}
                  className="py-2 rounded-xl bg-[var(--jade)]/15 text-[var(--jade)] border border-[var(--jade)]/30 text-sm disabled:opacity-60"
                >
                  Verify &amp; approve
                </button>
              )}
              <button onClick={() => regenerate(neighbourSel.q, neighbourSel.r)} disabled={busy} className="py-2 rounded-xl border border-white/10 text-sm text-[var(--text-secondary)] disabled:opacity-60">
                Regenerate key
              </button>
              <button onClick={() => setNeighbourSel(null)} className="text-xs text-[var(--text-muted)]">
                Close
              </button>
            </div>
          </div>
        );
      })()}
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
