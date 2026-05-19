'use client';

import { UserProfile } from '../data/profiles';

interface ProfilePanelProps {
  profile: UserProfile;
  cellCoord: { q: number; r: number };
  cellStatus: string;
  onClose: () => void;
  onSendMessage: (name: string) => void;
  backendStatus: 'online' | 'offline' | 'checking';
  onCopyHash: (hash: string, name: string) => void;
  isMobile?: boolean;
}

export default function ProfilePanel({ 
  profile, 
  cellCoord, 
  cellStatus, 
  onClose, 
  onSendMessage, 
  backendStatus,
  onCopyHash,
  isMobile = false
}: ProfilePanelProps) {
  const ring = Math.max(Math.abs(cellCoord.q), Math.abs(cellCoord.r), Math.abs(-cellCoord.q - cellCoord.r));
  
  // Button disabled when backend is not online
  const isButtonDisabled = backendStatus !== 'online';
  
  return (
    <div className={`${!isMobile ? 'absolute top-20 bottom-20 right-4 z-30 w-96' : 'fixed inset-0 z-50'} animate-fadeInLeft pointer-events-auto`}>
      <div className={`h-full ${!isMobile ? 'glass-strong' : 'bg-[var(--bg-secondary)]'} overflow-hidden flex flex-col ${!isMobile ? 'rounded-2xl' : ''}`}>
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/10 bg-gradient-to-r from-[var(--jade)]/5 to-transparent">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                profile.status === 'online' ? 'bg-emerald-400' : 
                profile.status === 'away' ? 'bg-amber-400' : 'bg-gray-400'
              }`} />
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-[0.08em] uppercase">
                {profile.status}
              </span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 font-mono text-xs font-semibold text-[var(--jade)]">
              {cellCoord.q},{cellCoord.r}
            </span>
            <span className="px-2 py-1 rounded-lg bg-white/10 text-[11px] text-[var(--text-secondary)]">
              Ring {ring}
            </span>
          </div>
        </div>
        
        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-5xl shadow-lg">
                {profile.avatar}
              </div>
              <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[var(--bg-secondary)] ${
                profile.status === 'online' ? 'bg-emerald-400' : 
                profile.status === 'away' ? 'bg-amber-400' : 'bg-gray-400'
              }`} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{profile.name}</h2>
              <p className="text-sm text-[var(--jade)] font-medium">{profile.role}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-[var(--text-muted)]">Level {profile.level}</span>
                <span className="text-xs text-[var(--text-muted)]">•</span>
                <span className="text-xs text-[var(--text-muted)]">Trust: {profile.trustScore}%</span>
              </div>
            </div>
          </div>
          
          {/* DHT Hash Section */}
          {profile.peerHash && (
            <div className="px-3 py-3 rounded-xl bg-gradient-to-r from-[var(--jade)]/15 to-transparent border border-[var(--jade)]/30">
              <div className="text-[10px] font-semibold text-[var(--jade)] tracking-[0.1em] uppercase mb-2">🔑 DHT Peer Hash</div>
              <div className="text-xs font-mono text-[var(--text-primary)] break-all bg-black/30 p-2 rounded-lg">
                {profile.peerHash}
              </div>
              <button 
                onClick={() => onCopyHash(profile.peerHash!, profile.name)} 
                className="mt-2 text-[10px] font-medium text-[var(--jade)] hover:underline flex items-center gap-1"
              >
                📋 Copy Hash to Connect
              </button>
              <p className="text-[9px] text-[var(--text-muted)] mt-2">
                Share this hash with others so they can connect and chat with you P2P!
              </p>
            </div>
          )}
          
          {/* Favorite Quote */}
          {profile.favoriteQuote && (
            <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-[var(--jade)]/10 to-transparent border-l-2 border-[var(--jade)]">
              <p className="text-xs text-[var(--text-secondary)] italic">"{profile.favoriteQuote}"</p>
            </div>
          )}
          
          {/* Bio */}
          <div className="px-3 py-2 rounded-xl bg-white/5">
            <p className="text-sm text-[var(--text-primary)]">{profile.bio}</p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2 rounded-xl bg-white/5">
              <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.1em] uppercase">Messages</div>
              <div className="text-lg font-bold text-[var(--jade)]">{profile.messagesSent}</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/5">
              <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.1em] uppercase">Joined</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{profile.joinDate}</div>
            </div>
          </div>
          
          {/* Location & Email */}
          {profile.location && (
            <div className="px-3 py-2 rounded-xl bg-white/5">
              <div className="flex items-center gap-2 text-xs">
                <span>📍</span>
                <span className="text-[var(--text-primary)]">{profile.location}</span>
              </div>
              {profile.email && (
                <div className="flex items-center gap-2 text-xs mt-1">
                  <span>📧</span>
                  <span className="text-[var(--text-primary)]">{profile.email}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Achievements */}
          {profile.achievements && profile.achievements.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.1em] uppercase mb-2">🏆 Achievements</div>
              <div className="flex flex-wrap gap-2">
                {profile.achievements.map((achievement, idx) => (
                  <span key={idx} className="px-2 py-1 text-xs rounded-lg bg-[var(--jade)]/10 text-[var(--jade)]">
                    {achievement}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Interests */}
          <div>
            <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.1em] uppercase mb-2">🎯 Interests</div>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest, idx) => (
                <span key={idx} className="px-2 py-1 text-xs rounded-lg bg-white/10 text-[var(--text-secondary)]">
                  {interest}
                </span>
              ))}
            </div>
          </div>
          
          {/* Cell Status */}
          <div className="px-3 py-2 rounded-xl bg-white/5">
            <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.1em] uppercase mb-1">Cell Status</div>
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                cellStatus === 'citizen' ? 'bg-emerald-400/20 text-emerald-400' :
                cellStatus === 'candidate' ? 'bg-sky-400/20 text-sky-400' :
                cellStatus === 'temporary' ? 'bg-red-400/20 text-red-400' :
                'bg-gray-400/20 text-gray-400'
              }`}>
                {cellStatus.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="px-4 py-3 border-t border-white/10 space-y-2 bg-gradient-to-t from-[var(--bg-secondary)] to-transparent">
          <button 
            onClick={() => onSendMessage(profile.name)}
            className="w-full py-2.5 text-[11px] font-medium bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg shadow-[var(--jade)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isButtonDisabled}
          >
            💬 Send Message Request {isButtonDisabled && '(P2P Offline)'}
          </button>
          <button 
            onClick={onClose}
            className="w-full py-2.5 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-xl hover:bg-white/5"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}