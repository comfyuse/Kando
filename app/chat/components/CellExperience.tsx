'use client';

// The key-based hive experience: issuer mints the queen, holders log in with a
// private key, set a local-only profile, and the ego-centric hive shows their 6
// neighbours. Invite empty slots; verify neighbours by exchanging an encrypted
// profile and signing an approval. Status is derived by the backend from those
// approvals (reserved → candidate → citizen).

import { useCallback, useEffect, useState } from 'react';
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
  setPublicProfile,
  getPublicProfile,
  ChatMessage,
  sendMessage,
  fetchMessages,
} from '@/lib/cell-client';
import dynamic from 'next/dynamic';
import { Network } from '@/lib/simulator';
import AppNav, { AppTab } from './AppNav';
import AccountView from './AccountView';
import TasksView from './TasksView';

// The same canvas hex simulator the chat page has always used.
const Scene2D = dynamic(() => import('@/components/Scene2D'), { ssr: false });

type Entry = 'waitlist' | 'key' | 'issuer';

const STATUS_COLOR: Record<string, string> = {
  reserved: '#f59e0b',
  candidate: '#3b82f6',
  citizen: 'var(--jade)',
};

// Soft blurred colour orbs that give the transparent page a glassy depth.
const Orbs = () => (
  <>
    <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-[var(--jade)]/10 blur-3xl pointer-events-none -z-10" />
    <div className="absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-[#3b82f6]/10 blur-3xl pointer-events-none -z-10" />
  </>
);

// A fixed top-left link back to the main site, on every screen.
const BackToSite = () => (
  <a
    href="/"
    className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-xl glass-modern text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
    Back
  </a>
);

export default function CellExperience() {
  const [keyBlob, setKeyBlob] = useState<string | null>(null);
  const [cell, setCell] = useState<CellState | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, setPending] = useState<{ from: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [neighbourSel, setNeighbourSel] = useState<{ q: number; r: number; pubKey: string } | null>(null);
  const [selName, setSelName] = useState('');
  const [tab, setTab] = useState<AppTab>('kando');
  const [intro, setIntro] = useState(false);

  // show the step-by-step intro once for new visitors
  useEffect(() => {
    try {
      if (!localStorage.getItem('kando_intro_seen')) setIntro(true);
    } catch {
      /* ignore */
    }
  }, []);
  const closeIntro = () => {
    setIntro(false);
    try {
      localStorage.setItem('kando_intro_seen', '1');
    } catch {
      /* ignore */
    }
  };

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
    return (
      <>
        {intro && <IntroModal onClose={closeIntro} />}
        <EntryScreen onEnterKey={enterWithKey} />
      </>
    );
  }

  // ── signed in but no profile yet: first task ─────────────────────────────
  if (!profile) {
    return (
      <>
        {intro && <IntroModal onClose={closeIntro} />}
        <ProfileForm
          onSave={(p) => {
            storeProfile(p);
            setProfile(p);
            // also publish a public display name so others see who this cell is
            if (keyBlob) setPublicProfile(keyBlob, `${p.firstName} ${p.lastName}`.trim()).catch(() => {});
          }}
        />
      </>
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
    <main className="min-h-[100dvh] w-full flex flex-col items-center px-5 py-8 pb-28 relative overflow-hidden text-[var(--text-primary)]">
      <Orbs />
      <BackToSite />
      <button
        onClick={() => setIntro(true)}
        aria-label="How to use this page"
        className="fixed top-4 right-4 z-50 w-9 h-9 rounded-full glass-modern flex items-center justify-center text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        ?
      </button>
      {intro && <IntroModal onClose={closeIntro} />}
      {tab === 'kando' && (
      <>
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
            if (nb?.pubKey) {
              setNeighbourSel({ q: nb.q, r: nb.r, pubKey: nb.pubKey });
              setSelName('');
              getPublicProfile(nb.pubKey).then(setSelName).catch(() => {});
            }
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
      </>
      )}

      {tab === 'chats' && <ChatView keyBlob={keyBlob} neighbours={cell?.neighbours || []} />}

      {tab === 'tasks' && (
        <TasksView
          isQueen={cell?.q === 0 && cell?.r === 0}
          neighborsInvited={(cell?.neighbours || []).filter((n) => n.occupied).length}
          neighborsApproved={approvedCount}
          friendCount={(cell?.neighbours || []).filter((n) => n.occupied).length}
          hasCell={!!cell}
          onGoTo={setTab}
        />
      )}

      {tab === 'account' && (
        <AccountView
          identity={`${profile.firstName} ${profile.lastName}`.trim()}
          email={`Cell (${cell?.q ?? '–'},${cell?.r ?? '–'})`}
          myPeerHash={cell?.publicKey ?? null}
          isQueen={cell?.q === 0 && cell?.r === 0}
          backendStatus="online"
          stats={{
            alive: (cell?.neighbours || []).filter((n) => n.occupied).length + 1,
            citizens:
              (cell?.status === 'citizen' ? 1 : 0) +
              (cell?.neighbours || []).filter((n) => n.status === 'citizen').length,
            candidates: (cell?.neighbours || []).filter((n) => n.status === 'candidate').length,
            reserved: (cell?.neighbours || []).filter((n) => n.occupied && n.status === 'reserved').length,
            maxRing: 1,
          }}
          friendCount={(cell?.neighbours || []).filter((n) => n.occupied).length}
          onCopyHash={() => {
            if (cell?.publicKey) navigator.clipboard?.writeText(cell.publicKey);
          }}
          onLogout={logout}
        />
      )}

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
                {selName ? `${selName} · ` : ''}Neighbour at ({neighbourSel.q},{neighbourSel.r})
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

      <AppNav active={tab} onChange={setTab} badge={{ kando: pending.length }} />
    </main>
  );
}

// ── 1-to-1 P2P chat with neighbour cells (end-to-end encrypted) ──────────────
function ChatView({ keyBlob, neighbours }: { keyBlob: string; neighbours: Neighbour[] }) {
  const [peer, setPeer] = useState<{ pubKey: string; name: string } | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');

  const occupied = neighbours.filter((n) => n.occupied && n.pubKey);

  useEffect(() => {
    occupied.forEach((n) => {
      if (n.pubKey && names[n.pubKey] === undefined) {
        getPublicProfile(n.pubKey).then((nm) => setNames((p) => ({ ...p, [n.pubKey!]: nm }))).catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighbours]);

  useEffect(() => {
    if (!peer) return;
    let on = true;
    const load = () => fetchMessages(keyBlob, peer.pubKey).then((m) => { if (on) setMsgs(m); }).catch(() => {});
    load();
    const id = setInterval(load, 3000);
    return () => { on = false; clearInterval(id); };
  }, [peer, keyBlob]);

  const send = async () => {
    if (!peer || !text.trim()) return;
    const t = text.trim();
    setText('');
    await sendMessage(keyBlob, peer.pubKey, t);
    setMsgs(await fetchMessages(keyBlob, peer.pubKey));
  };

  if (!peer) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-5">Chats</h1>
        {occupied.length === 0 && (
          <div className="glass-modern rounded-2xl p-6 text-center text-sm text-[var(--text-muted)]">
            No neighbours yet — invite some from the Kando tab.
          </div>
        )}
        <div className="flex flex-col gap-1">
          {occupied.map((n) => {
            const nm = names[n.pubKey!] || `Neighbour (${n.q},${n.r})`;
            return (
              <button
                key={n.pubKey}
                onClick={() => setPeer({ pubKey: n.pubKey!, name: nm })}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.04] transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                  {nm.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{nm}</div>
                  <div className="text-xs text-[var(--text-muted)] capitalize">
                    {n.status || 'reserved'} · ({n.q},{n.r})
                  </div>
                </div>
                <span className="text-[var(--text-muted)]">›</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col h-[72vh]">
      <div className="flex items-center gap-3 mb-3 glass-modern rounded-2xl px-4 py-3">
        <button onClick={() => setPeer(null)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">‹</button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-white font-bold text-sm shrink-0">
          {peer.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-semibold">{peer.name}</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-4 glass-modern rounded-2xl">
        {msgs.length === 0 && <p className="text-xs text-[var(--text-muted)] text-center mt-4">No messages yet — say hi 👋</p>}
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm break-words shadow-sm ${
              m.mine
                ? 'self-end bg-gradient-to-br from-[var(--jade)]/30 to-[var(--jade)]/15 border border-[var(--jade)]/25'
                : 'self-start bg-white/[0.06] border border-white/10'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3 glass-modern rounded-2xl p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message…"
          className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--jade)] outline-none"
        />
        <button onClick={send} className="px-5 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white text-sm font-medium">Send</button>
      </div>
    </div>
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
  const [name, setName] = useState('');
  const [secA, setSecA] = useState('');
  const [issuerSignup, setIssuerSignup] = useState(false);
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
    <main className="min-h-[100dvh] w-full flex items-center justify-center px-5 py-10 relative overflow-hidden">
      <Orbs />
      <BackToSite />
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
              <p className="text-sm text-[var(--text-muted)] text-center">
                {issuerSignup ? 'Create an issuer account' : 'Issuer sign-in'}
              </p>
              {issuerSignup && (
                <input className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)]" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              )}
              <input className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)]" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input type="password" className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)]" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {issuerSignup && (
                <input className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-[var(--text-primary)]" placeholder="Security answer (for password reset)" value={secA} onChange={(e) => setSecA(e.target.value)} />
              )}
              <button disabled={busy} onClick={() => run(async () => {
                const { register, login, getStoredToken } = await import('@/lib/auth-client');
                if (issuerSignup) {
                  await register({ name, email, password, securityQuestion: 'What is your security answer?', securityAnswer: secA });
                } else {
                  await login({ email, password });
                }
                setIssuerToken(getStoredToken());
              })} className="py-3 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white font-semibold text-sm disabled:opacity-60">
                {issuerSignup ? 'Create account' : 'Sign in'}
              </button>
              <button type="button" onClick={() => { setIssuerSignup((s) => !s); setError(null); }} className="text-xs text-[var(--jade)] hover:underline">
                {issuerSignup ? 'Already have an issuer account? Sign in' : 'No issuer account? Create one'}
              </button>
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
    <main className="min-h-[100dvh] w-full flex items-center justify-center px-5 py-10 relative overflow-hidden">
      <Orbs />
      <BackToSite />
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
    <main className="min-h-[100dvh] w-full flex items-center justify-center px-5 py-10 relative overflow-hidden">
      <Orbs />
      <BackToSite />
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

// ── Step-by-step intro for new visitors ─────────────────────────────────────
function IntroModal({ onClose }: { onClose: () => void }) {
  const steps = [
    { icon: '🐝', title: 'Welcome to Kando', body: 'Every member is a hexagonal cell in a living hive. Your identity is a private key — it never leaves your device.' },
    { icon: '🔑', title: 'Getting in', body: 'Have a private key? Use the “Private key” tab. Bootstrapping the hive? Open the “Issuer” tab to create an account and mint the queen.' },
    { icon: '⬡', title: 'Kando tab', body: 'See your cell and its 6 neighbours. Tap a dashed “+” hex to invite a neighbour, then hand them their key.' },
    { icon: '✅', title: 'Tasks tab', body: 'A step-by-step checklist — invite your neighbours and get verified to grow from reserved → candidate → citizen.' },
    { icon: '💬', title: 'Chats tab', body: 'Message your neighbours with end-to-end encryption. Only you and they can read it.' },
    { icon: '👤', title: 'Account tab', body: 'Your identity, status, and public key live here. Use the bottom bar to switch tabs anytime.' },
  ];
  const [i, setI] = useState(0);
  const last = i === steps.length - 1;
  const s = steps[i];
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5 z-[60]" onClick={onClose}>
      <div className="glass-modern rounded-3xl p-7 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl mb-3">{s.icon}</div>
        <h2 className="text-xl font-bold mb-2 text-[var(--text-primary)]">{s.title}</h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{s.body}</p>
        <div className="flex justify-center gap-1.5 my-5">
          {steps.map((_, k) => (
            <span key={k} className={`w-2 h-2 rounded-full transition-colors ${k === i ? 'bg-[var(--jade)]' : 'bg-white/15'}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {i > 0 && (
            <button onClick={() => setI(i - 1)} className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-[var(--text-secondary)]">
              Back
            </button>
          )}
          <button
            onClick={() => (last ? onClose() : setI(i + 1))}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white font-semibold text-sm"
          >
            {last ? 'Got it' : 'Next'}
          </button>
        </div>
        {!last && (
          <button onClick={onClose} className="mt-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
