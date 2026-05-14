'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function ChatPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navLinks = [
    { name: 'Simulator', href: '/simulator', icon: '🎮', description: 'CANDO Protocol Simulation' },
    { name: 'Chat', href: '/chat', icon: '💬', description: 'Secure Messaging' },
    { name: 'Waiting List', href: '/waiting-list', icon: '⏳', description: 'Get Early Access' },
    { name: 'Open Source', href: '/open-source', icon: '🔓', description: 'View on GitHub' },
  ];

  return (
    <main className="min-h-screen bg-[#0d1117]">
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#0d1117]/95 backdrop-blur-md border-b border-[#30363d]">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image
                  src="/KANDOlogo.png"
                  alt="KANDO Logo"
                  fill
                  className="object-contain rounded-full"
                />
              </div>
              <span className="font-bold text-lg text-white">KANDO</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-jade transition-colors"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      )}

      {isMobile && mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 bg-[#0d1117] border-r border-[#30363d] z-50 shadow-2xl pt-16">
            <div className="p-4">
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-jade/10 text-jade border-l-2 border-jade'
                          : 'hover:bg-[#161b22] text-[#c9d1d9]'
                      }`}
                    >
                      <span className="text-2xl">{link.icon}</span>
                      <div>
                        <div className="font-medium">{link.name}</div>
                        <div className="text-xs text-[#8b949e]">{link.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="border-t border-[#30363d] my-4" />
              <button className="github-button-primary w-full py-2">Sign In</button>
            </div>
          </div>
        </>
      )}

      <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-[#0d1117] border-r border-[#30363d] z-30 overflow-y-auto">
        <div className="p-4 pt-8">
          <Link href="/" className="flex items-center gap-2 mb-8 group">
            <div className="relative w-8 h-8 transition-transform group-hover:scale-105 duration-200">
              <Image
                src="/KANDOlogo.png"
                alt="KANDO Logo"
                fill
                className="object-contain rounded-full"
              />
            </div>
            <span className="font-bold text-white group-hover:text-jade transition-colors">KANDO</span>
          </Link>
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-jade/10 text-jade border-l-2 border-jade'
                      : 'hover:bg-[#161b22] text-[#c9d1d9] hover:text-jade'
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{link.name}</div>
                    <div className="text-[10px] text-[#8b949e]">{link.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-[#30363d] my-6" />
          <button className="github-button-primary w-full py-2 text-sm">Sign In</button>
        </div>
      </div>

      <div className={`md:ml-64 ${isMobile ? 'pt-14' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jade/10 border border-jade/20 mb-4">
              <span className="w-2 h-2 rounded-full bg-jade animate-pulse"></span>
              <span className="text-xs text-jade font-medium">COMING SOON</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Secure Chat App
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-[#8b949e] max-w-2xl mx-auto">
              End-to-end encrypted messaging with voice & video calls. 
              Privacy by design, security by default.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12">
            <div className="github-card p-4 md:p-6">
              <div className="text-3xl md:text-4xl mb-3">🔐</div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-2">End-to-End Encryption</h3>
              <p className="text-xs md:text-sm text-[#8b949e]">
                Your messages are encrypted on your device and only decrypted on the recipient's device. 
                No one in between can read them.
              </p>
            </div>

            <div className="github-card p-4 md:p-6">
              <div className="text-3xl md:text-4xl mb-3">🎥</div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-2">HD Voice & Video</h3>
              <p className="text-xs md:text-sm text-[#8b949e]">
                Crystal clear audio and high-definition video calls with WebRTC technology. 
                Group calls coming soon.
              </p>
            </div>

            <div className="github-card p-4 md:p-6">
              <div className="text-3xl md:text-4xl mb-3">💾</div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-2">No Data Collection</h3>
              <p className="text-xs md:text-sm text-[#8b949e]">
                We don't collect your metadata, contacts, or messages. 
                Your privacy is our priority.
              </p>
            </div>

            <div className="github-card p-4 md:p-6">
              <div className="text-3xl md:text-4xl mb-3">🌐</div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-2">Decentralized</h3>
              <p className="text-xs md:text-sm text-[#8b949e]">
                No central servers. Your data belongs to you, not corporations.
                Built on the KANDO protocol.
              </p>
            </div>
          </div>

          <div className="github-card p-4 md:p-6 mb-6 md:mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-3 md:mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <span className="text-xs md:text-sm text-amber-500 font-medium">Under Active Development</span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">Be the First to Know</h3>
            <p className="text-xs md:text-sm text-[#8b949e] mb-4 md:mb-6 max-w-md mx-auto">
              We're building something amazing. Join the waiting list to get early access when the chat app launches.
            </p>
            <Link
              href="/waiting-list"
              className="inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-lg bg-jade hover:bg-jade-hover text-white font-medium transition-all duration-200 text-sm md:text-base"
            >
              Join Waiting List
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>

          <div className="text-center">
            <h4 className="text-[10px] md:text-xs uppercase tracking-wider text-[#8b949e] mb-3 md:mb-4">Built with</h4>
            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              <span className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs rounded-full bg-[#161b22] border border-[#30363d] text-[#c9d1d9]">WebRTC</span>
              <span className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs rounded-full bg-[#161b22] border border-[#30363d] text-[#c9d1d9]">Signal Protocol</span>
              <span className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs rounded-full bg-[#161b22] border border-[#30363d] text-[#c9d1d9]">libp2p</span>
              <span className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs rounded-full bg-[#161b22] border border-[#30363d] text-[#c9d1d9]">WebAssembly</span>
              <span className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs rounded-full bg-[#161b22] border border-[#30363d] text-[#c9d1d9]">Next.js</span>
              <span className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs rounded-full bg-[#161b22] border border-[#30363d] text-[#c9d1d9]">TypeScript</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
// 'use client';

// import { useState, useEffect } from 'react';
// import Navbar from '@/components/Navbar';
// import { ChatNetwork, ChatUser, ChatMessage } from '@/lib/chat-network';
// import dynamic from 'next/dynamic';

// const HexagonalChatNetwork = dynamic(() => import('@/components/chat/HexagonalChatNetwork'), { ssr: false });
// const UserDetailModal = dynamic(() => import('@/components/chat/UserDetailModal'), { ssr: false });

// export default function ChatPage() {
//   const [network] = useState(() => new ChatNetwork());
//   const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
//   const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
//   const [showModal, setShowModal] = useState(false);
//   const [messages, setMessages] = useState<ChatMessage[]>([]);
//   const [stats, setStats] = useState(() => network.getStats());

//   useEffect(() => {
//     const queen = network.users.get('user_0_0');
//     if (queen) {
//       setCurrentUser(queen);
//       network.setCurrentUser(queen.id);
//     }
//     setStats(network.getStats());
    
//     // Listen for new messages
//     network.onMessage((message) => {
//       if (selectedUser && (message.fromUserId === selectedUser.id || message.toUserId === selectedUser.id)) {
//         setMessages(prev => [...prev, message]);
//       }
//     });
//   }, [network]);

//   const handleUserClick = (user: ChatUser) => {
//     setSelectedUser(user);
//     if (currentUser) {
//       const conversation = network.getConversation(currentUser.id, user.id);
//       setMessages(conversation);
//     }
//     setShowModal(true);
//   };

//   const handleCloseModal = () => {
//     setShowModal(false);
//     setSelectedUser(null);
//     setMessages([]);
//   };

//   const handleStartChat = () => {
//     // Just keep modal open, chat tab will be selected
//   };

//   // Get visible users (neighbors + neighbors of neighbors)
//   const visibleUsers = currentUser ? network.getVisibleUsers(currentUser.id) : [];
  
//   // Group users by layer for sidebar
//   const usersByLayer = {
//     layer1: [...network.users.values()].filter(u => u.layer === 1 && u.id !== currentUser?.id),
//     layer2: [...network.users.values()].filter(u => u.layer === 2 && u.id !== currentUser?.id),
//     layer3: [...network.users.values()].filter(u => u.layer === 3 && u.id !== currentUser?.id),
//     layer4: [...network.users.values()].filter(u => u.layer === 4 && u.id !== currentUser?.id),
//   };

//   const layerNames: Record<number, string> = {
//     1: '👑 Queen\'s Court',
//     2: '🔹 Inner Circle',
//     3: '🔸 Middle Ring',
//     4: '🌐 Outer Ring',
//   };

//   return (
//     <main className="min-h-screen bg-[#0d1117]">
//       <Navbar />
      
//       <div className="pt-16 h-screen">
//         <div className="h-full p-4">
//           {/* Header */}
//           <div className="mb-4">
//             <h1 className="text-2xl font-bold text-white">
//               <span className="text-jade">Decentralized</span> Chat Network
//             </h1>
//             <p className="text-sm text-[#8b949e]">
//               {stats.totalUsers} users • {stats.layer1} Queen • {stats.layer2} Inner • {stats.layer3} Middle • {stats.layer4} Outer
//               {currentUser && ` • You are: ${currentUser.name} (Layer ${currentUser.layer})`}
//             </p>
//           </div>
          
//           {/* Main Content */}
//           <div className="grid grid-cols-12 gap-4 h-[calc(100%-60px)]">
//             {/* Network Visualization */}
//             <div className="col-span-12 lg:col-span-7 xl:col-span-8 bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
//               <div className="p-2 border-b border-[#30363d] flex justify-between items-center">
//                 <span className="text-sm font-medium text-white">Hexagonal Network Map</span>
//                 <span className="text-xs text-[#8b949e]">Click on any cell to interact</span>
//               </div>
//               <div className="h-[400px] lg:h-[calc(100%-40px)]">
//                 <HexagonalChatNetwork 
//                   network={network} 
//                   onUserClick={handleUserClick}
//                   currentUserId={currentUser?.id}
//                   selectedUserId={selectedUser?.id}
//                 />
//               </div>
//             </div>
            
//             {/* User List Sidebar */}
//             <div className="col-span-12 lg:col-span-5 xl:col-span-4 h-full overflow-y-auto space-y-4">
//               {Object.entries(usersByLayer).map(([layer, users]) => (
//                 users.length > 0 && (
//                   <div key={layer} className="bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
//                     <div className="px-3 py-2 bg-[#0d1117] border-b border-[#30363d]">
//                       <span className="text-xs font-semibold text-[#8b949e]">{layerNames[parseInt(layer)]}</span>
//                       <span className="text-xs text-[#8b949e] ml-2">({users.length})</span>
//                     </div>
//                     <div className="divide-y divide-[#30363d]">
//                       {users.map((user) => {
//                         const isVisible = visibleUsers.some(v => v.id === user.id);
//                         return (
//                           <button
//                             key={user.id}
//                             onClick={() => handleUserClick(user)}
//                             className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-[#0d1117] transition-all text-left ${
//                               selectedUser?.id === user.id ? 'bg-[#2ea88a]/10' : ''
//                             }`}
//                           >
//                             <div className="relative">
//                               <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
//                                    style={{ backgroundColor: user.avatarColor }}>
//                                 {user.name.charAt(0)}
//                               </div>
//                               <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#161b22] ${
//                                 user.status === 'online' ? 'bg-[#3fb950]' : user.status === 'away' ? 'bg-[#f0d68a]' : 'bg-[#8b949e]'
//                               }`} />
//                             </div>
//                             <div className="flex-1 min-w-0">
//                               <div className="flex items-center gap-2">
//                                 <div className="text-sm font-medium text-white truncate">{user.name}</div>
//                                 {!isVisible && (
//                                   <span className="text-[8px] bg-[#30363d] px-1 py-0.5 rounded text-[#8b949e]">indirect</span>
//                                 )}
//                               </div>
//                               <div className="text-xs text-[#8b949e]">Layer {user.layer}</div>
//                             </div>
//                             {user.status === 'online' && (
//                               <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
//                             )}
//                           </button>
//                         );
//                       })}
//                     </div>
//                   </div>
//                 )
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
      
//       {/* User Detail Modal */}
//       {showModal && selectedUser && currentUser && (
//         <UserDetailModal
//           user={selectedUser}
//           currentUser={currentUser}
//           network={network}
//           onClose={handleCloseModal}
//           onStartChat={handleStartChat}
//           messages={messages}
//         />
//       )}
//     </main>
//   );
// }