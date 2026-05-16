'use client';

// ============================================
// TODO: Decentralized Chat Feature - Coming Soon
// This feature is currently under development with Go-libp2p backend
// ============================================

// import { useState, useEffect } from 'react';
// import Navbar from '@/components/Navbar';
// import { ChatNetwork, ChatUser, ChatMessage } from '@/lib/chat-network';
// import dynamic from 'next/dynamic';

// const HexagonalChatNetwork = dynamic(() => import('@/components/chat/HexagonalChatNetwork'), { ssr: false });
// const UserDetailModal = dynamic(() => import('@/components/chat/UserDetailModal'), { ssr: false });

import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
    
//     network.onMessage((message) => {
//       if (selectedUser && (message.fromUserId === selectedUser.id || message.toUserId === selectedUser.id)) {
//         setMessages(prev => [...prev, message]);
//       }
//     });
//   }, [network, selectedUser]);

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

//   const handleStartChat = () => {};

//   const visibleUsers = currentUser ? network.getVisibleUsers(currentUser.id) : [];
  
//   const usersByLayer = {
//     layer1: [...network.users.values()].filter(u => u.layer === 1 && u.id !== currentUser?.id),
//     layer2: [...network.users.values()].filter(u => u.layer === 2 && u.id !== currentUser?.id),
//     layer3: [...network.users.values()].filter(u => u.layer === 3 && u.id !== currentUser?.id),
//     layer4: [...network.users.values()].filter(u => u.layer === 4 && u.id !== currentUser?.id),
//   };

//   const layerNames: Record<number, string> = {
//     1: "👑 Queen's Court",
//     2: '🔹 Inner Circle',
//     3: '🔸 Middle Ring',
//     4: '🌐 Outer Ring',
//   };

//   return (
//     <main className="min-h-screen bg-[#0d1117]">
//       <Navbar />
      
//       <div className="pt-16 h-screen">
//         <div className="h-full p-4">
//           <div className="mb-4">
//             <h1 className="text-2xl font-bold text-white">
//               <span className="text-jade">Decentralized</span> Chat Network
//             </h1>
//             <p className="text-sm text-[#8b949e]">
//               {stats.totalUsers} users • {stats.layer1} Queen • {stats.layer2} Inner • {stats.layer3} Middle • {stats.layer4} Outer
//               {currentUser && ` • You are: ${currentUser.name} (Layer ${currentUser.layer})`}
//             </p>
//           </div>
          
//           <div className="grid grid-cols-12 gap-4 h-[calc(100%-60px)]">
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

// ============================================
// Coming Soon Page
// ============================================

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-[#0d1117]">
      <Navbar />
      
      <div className="pt-32 flex items-center justify-center min-h-screen">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="mb-8"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-jade/20 to-jade/5 rounded-full flex items-center justify-center">
              <span className="text-5xl">💬</span>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jade/10 border border-jade/20 mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-jade opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-jade" />
            </span>
            <span className="text-xs text-jade font-medium">Under Development</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Decentralized Chat
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-[#8b949e] text-lg mb-6"
          >
            A peer-to-peer encrypted messaging system built on the KANDO protocol.
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-[#8b949e] text-sm mb-8 max-w-md mx-auto"
          >
            Features: End-to-end encryption • Peer-to-peer networking • Hexagonal network topology • 3-approval rule
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "100%" }}
            transition={{ delay: 0.6, duration: 1 }}
            className="max-w-md mx-auto mb-8"
          >
            <div className="flex justify-between text-xs text-[#8b949e] mb-2">
              <span>Backend (Go-libp2p)</span>
              <span>In Progress</span>
            </div>
            <div className="w-full h-2 bg-[#161b22] rounded-full overflow-hidden">
              <div className="h-full bg-jade rounded-full" style={{ width: "45%" }} />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/waiting-list"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-jade hover:bg-jade-hover text-white font-medium transition-all duration-200 transform hover:scale-105"
            >
              Join Waiting List
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
            <Link
              href="/simulator"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[#30363d] hover:border-jade hover:text-jade text-[#c9d1d9] font-medium transition-all duration-200"
            >
              Try Simulator
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xs text-[#8b949e] mt-8 pt-6 border-t border-[#30363d] inline-block px-4 py-2"
          >
            🚧 The decentralized chat feature is being built with Go-libp2p. Stay tuned!
          </motion.p>
        </div>
      </div>
    </main>
  );
}