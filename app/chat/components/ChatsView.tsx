'use client';

import { useMemo, useState } from 'react';
import { Peer } from '@/lib/p2p-client';

function Avatar({ name, online }: { name: string; online?: boolean }) {
  return (
    <div className="relative shrink-0">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-white font-bold text-lg shadow-md">
        {name.charAt(0).toUpperCase()}
      </div>
      {online && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0d1117]" />}
    </div>
  );
}

export default function ChatsView({
  friends,
  onlinePeers,
  currentChatPeer,
  onSelectPeer,
  onRemoveFriend,
  onConnect,
}: {
  friends: Peer[];
  onlinePeers: Peer[];
  currentChatPeer: Peer | null;
  onSelectPeer: (peer: Peer) => void;
  onRemoveFriend: (id: string) => void;
  onConnect: () => void;
}) {
  const [query, setQuery] = useState('');

  const onlineIds = useMemo(() => new Set(onlinePeers.map((p) => p.id)), [onlinePeers]);

  // Friends first, then any online peer who isn't already a friend (contacts).
  const contacts = useMemo(() => {
    const friendIds = new Set(friends.map((f) => f.id));
    const extras = onlinePeers.filter((p) => !friendIds.has(p.id));
    const all = [...friends, ...extras];
    const q = query.trim().toLowerCase();
    return q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all;
  }, [friends, onlinePeers, query]);

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Chats</h1>
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white text-xs font-medium shadow-md shadow-[var(--jade)]/20 hover:opacity-95 transition-opacity"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Connect
        </button>
      </div>

      {/* Search */}
      <div className="relative flex items-center mb-4">
        <svg className="absolute left-3.5 text-[var(--text-muted)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-11 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--jade)] transition-colors"
        />
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-16 glass-modern rounded-3xl">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/[0.05] flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">No contacts yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Connect with a peer and they&apos;ll appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {contacts.map((peer) => {
            const online = onlineIds.has(peer.id);
            const isFriend = friendIds.has(peer.id);
            const isActive = currentChatPeer?.id === peer.id;
            return (
              <div
                key={peer.id}
                className={`group flex items-center gap-3 p-2.5 rounded-2xl transition-colors ${
                  isActive ? 'bg-[var(--jade)]/10 border border-[var(--jade)]/25' : 'hover:bg-white/[0.04]'
                }`}
              >
                <button onClick={() => onSelectPeer(peer)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <Avatar name={peer.name} online={online} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">{peer.name}</div>
                    <div className="text-xs text-[var(--text-muted)] truncate">
                      {online ? 'Online · tap to chat' : isFriend ? 'Friend' : 'Contact'}
                    </div>
                  </div>
                </button>
                {isFriend && (
                  <button
                    onClick={() => onRemoveFriend(peer.id)}
                    className="shrink-0 p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Remove friend"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
