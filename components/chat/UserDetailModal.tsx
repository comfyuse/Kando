'use client';

import { useState } from 'react';
import { ChatUser, ChatMessage, ChatNetwork } from '@/lib/chat-network';

interface UserDetailModalProps {
  user: ChatUser;
  currentUser: ChatUser;
  network: ChatNetwork;
  onClose: () => void;
  onStartChat: () => void;
  messages?: ChatMessage[];
}

type TabType = 'profile' | 'chat' | 'vote';

export default function UserDetailModal({ 
  user, 
  currentUser, 
  network, 
  onClose, 
  onStartChat,
  messages = [] 
}: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [newMessage, setNewMessage] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposals, setProposals] = useState(network.proposals);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      network.sendMessage(currentUser.id, user.id, newMessage);
      setNewMessage('');
      onStartChat();
    }
  };

  const handleCreateProposal = () => {
    if (proposalTitle.trim() && proposalDescription.trim()) {
      network.createProposal(proposalTitle, proposalDescription, currentUser.id);
      setProposalTitle('');
      setProposalDescription('');
      setProposals(new Map(network.proposals));
    }
  };

  const handleVote = (proposalId: string, vote: 'for' | 'against') => {
    network.voteOnProposal(proposalId, currentUser.id, vote);
    setProposals(new Map(network.proposals));
  };

  const getLayerName = (layer: number) => {
    const names: Record<number, string> = {
      1: '👑 Queen\'s Court',
      2: '🔹 Inner Circle',
      3: '🔸 Middle Ring',
      4: '🌐 Outer Ring',
    };
    return names[layer] || `Layer ${layer}`;
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'online': return '🟢';
      case 'away': return '🟡';
      default: return '⚫';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#30363d] bg-gradient-to-r from-jade/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg`}
                 style={{ backgroundColor: user.avatarColor }}>
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{user.name}</h2>
              <div className="flex items-center gap-2 text-xs text-[#8b949e]">
                <span>{getLayerName(user.layer)}</span>
                <span>•</span>
                <span>{getStatusIcon(user.status)} {user.status}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#30363d] flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-[#30363d]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'profile' 
                ? 'text-jade border-b-2 border-jade' 
                : 'text-[#8b949e] hover:text-white'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'chat' 
                ? 'text-jade border-b-2 border-jade' 
                : 'text-[#8b949e] hover:text-white'
            }`}
          >
            Chat {messages.length > 0 && `(${messages.length})`}
          </button>
          <button
            onClick={() => setActiveTab('vote')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'vote' 
                ? 'text-jade border-b-2 border-jade' 
                : 'text-[#8b949e] hover:text-white'
            }`}
          >
            Governance
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 max-h-[500px] overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="github-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-[#8b949e]">Public Key</span>
                  <button className="text-xs text-jade hover:text-jade-hover">Copy</button>
                </div>
                <code className="text-xs text-[#c9d1d9] break-all">{user.publicKey}</code>
              </div>
              
              <div className="github-card p-4">
                <div className="text-sm text-[#8b949e] mb-2">Bio</div>
                <p className="text-sm text-white">{user.bio}</p>
              </div>
              
              <div className="github-card p-4">
                <div className="text-sm text-[#8b949e] mb-2">Network Info</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8b949e]">Layer:</span>
                    <span className="text-white">{user.layer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b949e]">Coordinates:</span>
                    <span className="text-white font-mono">({user.q}, {user.r})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b949e]">Last Seen:</span>
                    <span className="text-white">{user.lastSeen.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={onStartChat}
                  className="flex-1 py-2 bg-jade hover:bg-jade-hover text-white rounded-lg transition-all"
                >
                  Send Message
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 border border-[#30363d] hover:border-jade text-[#c9d1d9] rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div className="h-80 overflow-y-auto space-y-2 mb-4">
                {messages.length === 0 ? (
                  <div className="text-center text-[#8b949e] py-8">
                    No messages yet. Start a conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCurrentUser = msg.fromUserId === currentUser.id;
                    return (
                      <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          isCurrentUser 
                            ? 'bg-jade text-white' 
                            : 'bg-[#161b22] border border-[#30363d] text-[#c9d1d9]'
                        }`}>
                          <div className="text-sm break-words">{msg.content}</div>
                          <div className="text-[9px] opacity-70 mt-1 text-right">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={`Message ${user.name}...`}
                  className="flex-1 px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg focus:outline-none focus:border-jade text-sm resize-none"
                  rows={2}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-jade hover:bg-jade-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  Send
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'vote' && (
            <div className="space-y-4">
              {/* Create Proposal */}
              <div className="github-card p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Create Proposal</h3>
                <input
                  type="text"
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  placeholder="Proposal title"
                  className="w-full px-3 py-2 mb-2 bg-[#161b22] border border-[#30363d] rounded-lg focus:outline-none focus:border-jade text-sm"
                />
                <textarea
                  value={proposalDescription}
                  onChange={(e) => setProposalDescription(e.target.value)}
                  placeholder="Proposal description"
                  className="w-full px-3 py-2 mb-2 bg-[#161b22] border border-[#30363d] rounded-lg focus:outline-none focus:border-jade text-sm resize-none"
                  rows={2}
                />
                <button
                  onClick={handleCreateProposal}
                  disabled={!proposalTitle.trim() || !proposalDescription.trim()}
                  className="w-full py-2 bg-jade hover:bg-jade-hover disabled:opacity-50 text-white rounded-lg transition-all"
                >
                  Submit Proposal
                </button>
              </div>
              
              {/* Active Proposals */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Active Proposals</h3>
                {[...proposals.values()].filter(p => p.status === 'active').length === 0 ? (
                  <div className="text-center text-[#8b949e] py-4 text-sm">
                    No active proposals
                  </div>
                ) : (
                  [...proposals.values()].filter(p => p.status === 'active').map(proposal => {
                    const hasVoted = proposal.votesFor.includes(currentUser.id) || proposal.votesAgainst.includes(currentUser.id);
                    return (
                      <div key={proposal.id} className="github-card p-4 mb-3">
                        <h4 className="font-semibold text-white mb-1">{proposal.title}</h4>
                        <p className="text-xs text-[#8b949e] mb-3">{proposal.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 text-xs">
                            <span className="text-green-500">For: {proposal.votesFor.length}</span>
                            <span className="text-red-500">Against: {proposal.votesAgainst.length}</span>
                          </div>
                          {!hasVoted && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVote(proposal.id, 'for')}
                                className="px-3 py-1 text-xs bg-green-500/20 text-green-500 rounded hover:bg-green-500/30 transition-all"
                              >
                                Vote For
                              </button>
                              <button
                                onClick={() => handleVote(proposal.id, 'against')}
                                className="px-3 py-1 text-xs bg-red-500/20 text-red-500 rounded hover:bg-red-500/30 transition-all"
                              >
                                Vote Against
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}