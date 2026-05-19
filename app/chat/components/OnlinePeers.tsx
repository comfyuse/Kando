'use client';

import { Peer } from '@/lib/p2p-client';
import { citizenNames } from '../data/profiles';

interface OnlinePeersProps {
  peers: Peer[];
  currentChatPeer: Peer | null;
  myPeerName: string | null;
  myPeerHash: string | null;
  onSelectPeer: (peer: Peer) => void;
}

export default function OnlinePeers({ peers, currentChatPeer, myPeerName, myPeerHash, onSelectPeer }: OnlinePeersProps) {
  // Filter to only show the 11 green cell members
  const greenCellPeers = peers.filter(p => citizenNames.includes(p.name));
  
  return (
    <div className="absolute bottom-24 left-4 z-20 pointer-events-auto">
      <div className="glass p-3 rounded-xl min-w-[280px]">
        <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.1em] uppercase mb-2">
          👥 Citizens ({greenCellPeers.length})
        </div>
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {greenCellPeers.map(peer => (
            <button
              key={peer.id}
              onClick={() => onSelectPeer(peer)}
              className={`px-2 py-1.5 text-xs rounded-lg transition-all text-left w-full ${
                currentChatPeer?.id === peer.id 
                  ? 'bg-[var(--gold)]/20 text-[var(--gold)]' 
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{peer.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <span className="text-[8px] font-mono text-[var(--text-muted)] truncate">{peer.id}</span>
              </div>
            </button>
          ))}
          {greenCellPeers.length === 0 && (
            <div className="text-xs text-[var(--text-muted)] text-center py-2">
              No citizens online yet. Wait for the network to grow.
            </div>
          )}
        </div>
        {myPeerName && (
          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
            <div className="text-[10px] text-[var(--text-muted)]">You: {myPeerName}</div>
            <div className="text-[8px] font-mono text-[var(--text-muted)] break-all">Hash: {myPeerHash}</div>
          </div>
        )}
      </div>
    </div>
  );
}