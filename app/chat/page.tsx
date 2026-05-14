'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { ChatNetwork, ChatUser, ChatMessage } from '@/lib/chat-network';
import dynamic from 'next/dynamic';

const HexagonalChatNetwork = dynamic(() => import('@/components/chat/HexagonalChatNetwork'), { ssr: false });
const UserDetailModal = dynamic(() => import('@/components/chat/UserDetailModal'), { ssr: false });

export default function ChatPage() {
  const [network] = useState(() => new ChatNetwork());
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState(() => network.getStats());

  useEffect(() => {
    const queen = network.users.get('user_0_0');
    if (queen) {
      setCurrentUser(queen);
      network.setCurrentUser(queen.id);
    }
    setStats(network.getStats());
    
    network.onMessage((message) => {
      if (selectedUser && (message.fromUserId === selectedUser.id || message.toUserId === selectedUser.id)) {
        setMessages(prev => [...prev, message]);
      }
    });
  }, [network, selectedUser]);

  const handleUserClick = (user: ChatUser) => {
    setSelectedUser(user);
    if (currentUser) {
      const conversation = network.getConversation(currentUser.id, user.id);
      setMessages(conversation);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setMessages([]);
  };

  const handleStartChat = () => {};

  const visibleUsers = currentUser ? network.getVisibleUsers(currentUser.id) : [];
  
  const usersByLayer = {
    layer1: [...network.users.values()].filter(u => u.layer === 1 && u.id !== currentUser?.id),
    layer2: [...network.users.values()].filter(u => u.layer === 2 && u.id !== currentUser?.id),
    layer3: [...network.users.values()].filter(u => u.layer === 3 && u.id !== currentUser?.id),
    layer4: [...network.users.values()].filter(u => u.layer === 4 && u.id !== currentUser?.id),
  };

  const layerNames: Record<number, string> = {
    1: '👑 Queen\'s Court',
    2: '🔹 Inner Circle',
    3: '🔸 Middle Ring',
    4: '🌐 Outer Ring',
  };

  return (
    <main className="min-h-screen bg-[#0d1117]">
      <Navbar />
      
      <div className="pt-16 h-screen">
        <div className="h-full p-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-white">
              <span className="text-jade">Decentralized</span> Chat Network
            </h1>
            <p className="text-sm text-[#8b949e]">
              {stats.totalUsers} users • {stats.layer1} Queen • {stats.layer2} Inner • {stats.layer3} Middle • {stats.layer4} Outer
              {currentUser && ` • You are: ${currentUser.name} (Layer ${currentUser.layer})`}
            </p>
          </div>
          
          <div className="grid grid-cols-12 gap-4 h-[calc(100%-60px)]">
            <div className="col-span-12 lg:col-span-7 xl:col-span-8 bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
              <div className="p-2 border-b border-[#30363d] flex justify-between items-center">
                <span className="text-sm font-medium text-white">Hexagonal Network Map</span>
                <span className="text-xs text-[#8b949e]">Click on any cell to interact</span>
              </div>
              <div className="h-[400px] lg:h-[calc(100%-40px)]">
                <HexagonalChatNetwork 
                  network={network} 
                  onUserClick={handleUserClick}
                  currentUserId={currentUser?.id}
                  selectedUserId={selectedUser?.id}
                />
              </div>
            </div>
            
            <div className="col-span-12 lg:col-span-5 xl:col-span-4 h-full overflow-y-auto space-y-4">
              {Object.entries(usersByLayer).map(([layer, users]) => (
                users.length > 0 && (
                  <div key={layer} className="bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
                    <div className="px-3 py-2 bg-[#0d1117] border-b border-[#30363d]">
                      <span className="text-xs font-semibold text-[#8b949e]">{layerNames[parseInt(layer)]}</span>
                      <span className="text-xs text-[#8b949e] ml-2">({users.length})</span>
                    </div>
                    <div className="divide-y divide-[#30363d]">
                      {users.map((user) => {
                        const isVisible = visibleUsers.some(v => v.id === user.id);
                        return (
                          <button
                            key={user.id}
                            onClick={() => handleUserClick(user)}
                            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-[#0d1117] transition-all text-left ${
                              selectedUser?.id === user.id ? 'bg-[#2ea88a]/10' : ''
                            }`}
                          >
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                   style={{ backgroundColor: user.avatarColor }}>
                                {user.name.charAt(0)}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#161b22] ${
                                user.status === 'online' ? 'bg-[#3fb950]' : user.status === 'away' ? 'bg-[#f0d68a]' : 'bg-[#8b949e]'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-white truncate">{user.name}</div>
                                {!isVisible && (
                                  <span className="text-[8px] bg-[#30363d] px-1 py-0.5 rounded text-[#8b949e]">indirect</span>
                                )}
                              </div>
                              <div className="text-xs text-[#8b949e]">Layer {user.layer}</div>
                            </div>
                            {user.status === 'online' && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {showModal && selectedUser && currentUser && (
        <UserDetailModal
          user={selectedUser}
          currentUser={currentUser}
          network={network}
          onClose={handleCloseModal}
          onStartChat={handleStartChat}
          messages={messages}
        />
      )}
    </main>
  );
}