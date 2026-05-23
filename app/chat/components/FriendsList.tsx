'use client';

import { Peer } from '@/lib/p2p-client';

interface FriendsListProps {
  friends: Peer[];
  onSelectFriend: (friend: Peer) => void;
  currentChatPeer: Peer | null;
  onRemoveFriend?: (friendId: string) => void;
}

export default function FriendsList({ friends, onSelectFriend, currentChatPeer, onRemoveFriend }: FriendsListProps) {
  if (friends.length === 0) {
    return (
      <div className="glass-modern p-4 rounded-xl min-w-[220px]">
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-primary)] font-medium">No friends yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[180px]">
            Connect with other peers and they'll appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-modern rounded-xl overflow-hidden min-w-[260px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[var(--jade)]/10 to-transparent">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--jade)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Friends</h3>
          <span className="text-[10px] text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded-full">
            {friends.length}
          </span>
        </div>
      </div>

      {/* Friends List */}
      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className={`group relative px-4 py-3 hover:bg-white/5 transition-all duration-200 border-b border-white/5 last:border-b-0 ${
              currentChatPeer?.id === friend.id ? 'bg-[var(--jade)]/10' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-white font-bold shadow-md">
                  {friend.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-secondary)] animate-pulse" />
              </div>

              {/* Friend Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {friend.name}
                  </h4>
                  <span className="text-[9px] text-emerald-400 font-medium">Online</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">
                  {friend.id.slice(0, 16)}...
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => onSelectFriend(friend)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  title="Send Message"
                >
                  <svg className="w-3.5 h-3.5 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
                {onRemoveFriend && (
                  <button
                    onClick={() => onRemoveFriend(friend.id)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    title="Remove Friend"
                  >
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Chat indicator if active */}
            {currentChatPeer?.id === friend.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-gradient-to-b from-[var(--jade)] to-[var(--jade-hover)] rounded-full" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}