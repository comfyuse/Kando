'use client';

interface NetStats {
  alive: number;
  citizens: number;
  candidates: number;
  reserved: number;
  maxRing: number;
}

export default function AccountView({
  identity,
  email,
  myPeerHash,
  isQueen,
  backendStatus,
  stats,
  friendCount,
  onCopyHash,
  onLogout,
}: {
  identity: string;
  email: string;
  myPeerHash: string | null;
  isQueen: boolean;
  backendStatus: 'checking' | 'online' | 'offline';
  stats: NetStats;
  friendCount: number;
  onCopyHash: () => void;
  onLogout: () => void;
}) {
  const name = identity || 'KANDO User';
  const statusMeta = {
    online: { dot: 'bg-emerald-400', label: 'P2P Active' },
    offline: { dot: 'bg-red-400', label: 'Offline' },
    checking: { dot: 'bg-yellow-400', label: 'Connecting…' },
  }[backendStatus];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-5">Account</h1>

      {/* Profile card */}
      <div className="glass-modern rounded-3xl p-6 md:p-8 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-[var(--jade)]/30">
          {isQueen ? '👑' : name.charAt(0).toUpperCase()}
        </div>
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{name}</h2>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{email}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusMeta.dot} ${backendStatus !== 'offline' ? 'animate-pulse' : ''}`} />
          <span className="text-sm text-[var(--text-muted)]">{statusMeta.label}</span>
        </div>

        {isQueen && (
          <span className="mt-3 text-xs font-medium text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5">
            👑 Queen — owns cell (0,0)
          </span>
        )}

        {myPeerHash && (
          <button
            onClick={onCopyHash}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            🔑 {myPeerHash.slice(0, 18)}… · Copy
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {[
          { label: 'Friends', value: friendCount },
          { label: 'Members', value: stats.alive },
          { label: 'Citizens', value: stats.citizens },
          { label: 'Max ring', value: stats.maxRing },
        ].map((s) => (
          <div key={s.label} className="glass-modern rounded-2xl py-4 text-center">
            <div className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-[var(--text-muted)] mt-6 px-6">
        Your identity is your DHT key. Share your hash so peers can connect to you directly.
      </p>

      <button
        onClick={onLogout}
        className="mt-4 w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/15 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5M21 12H9" />
        </svg>
        Log out
      </button>
    </div>
  );
}
