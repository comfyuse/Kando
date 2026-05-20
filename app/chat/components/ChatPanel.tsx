// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import { Peer, ChatMessage } from '@/lib/p2p-client';

// interface ChatPanelProps {
//   peer: Peer;
//   myPeerId: string | null;
//   messages: ChatMessage[];
//   onSendMessage: (content: string) => void;
//   onClose: () => void;
//   onSendRequest?: (peer: Peer, message: string) => void;
//   isRequestPending?: boolean;
//   isRequestAccepted?: boolean;
//   onAddConnectedPeer?: (peer: Peer) => void;
//   connectedPeers?: Peer[];
//   onAddFriend?: (peer: Peer) => void;
//   isMobile?: boolean;
// }

// export default function ChatPanel({ 
//   peer, 
//   myPeerId, 
//   messages, 
//   onSendMessage, 
//   onClose,
//   onSendRequest,
//   isRequestPending = false,
//   isRequestAccepted = false,
//   onAddConnectedPeer,
//   connectedPeers = [],
//   onAddFriend,
//   isMobile = false
// }: ChatPanelProps) {
//   const [inputMessage, setInputMessage] = useState('');
//   const [showRequestModal, setShowRequestModal] = useState(false);
//   const [requestMessage, setRequestMessage] = useState('');
//   const [isRequestSent, setIsRequestSent] = useState(false);
//   const [hasExistingMessages, setHasExistingMessages] = useState(false);
//   const [isTyping, setIsTyping] = useState(false);
//   const [isConnected, setIsConnected] = useState(false);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLTextAreaElement>(null);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     inputRef.current?.focus();
//   }, []);

//   useEffect(() => {
//     const hasMessages = messages.some(
//       msg => (msg.from === peer.id && msg.to === myPeerId) || 
//              (msg.from === myPeerId && msg.to === peer.id)
//     );
//     setHasExistingMessages(hasMessages);
    
//     const alreadyConnected = connectedPeers.some(p => p.id === peer.id);
//     if ((hasMessages || isRequestAccepted) && !alreadyConnected && onAddConnectedPeer) {
//       setIsConnected(true);
//       onAddConnectedPeer(peer);
//     }
    
//     if (hasMessages && onAddFriend) {
//       onAddFriend(peer);
//     }
//   }, [messages, peer.id, myPeerId, isRequestAccepted, connectedPeers, onAddConnectedPeer, onAddFriend]);

//   const handleSend = () => {
//     if (!inputMessage.trim()) return;
//     onSendMessage(inputMessage);
//     setInputMessage('');
//     inputRef.current?.focus();
//   };

//   const handleSendRequest = () => {
//     if (!requestMessage.trim() || !onSendRequest) return;
//     onSendRequest(peer, requestMessage);
//     setIsRequestSent(true);
//     setShowRequestModal(false);
//     setRequestMessage('');
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       if (hasExistingMessages || isRequestAccepted) {
//         handleSend();
//       }
//     }
//   };

//   const formatTime = (date: Date) => {
//     return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//   };

//   const formatDate = (date: Date) => {
//     const today = new Date();
//     const yesterday = new Date(today);
//     yesterday.setDate(yesterday.getDate() - 1);
    
//     if (date.toDateString() === today.toDateString()) {
//       return 'Today';
//     } else if (date.toDateString() === yesterday.toDateString()) {
//       return 'Yesterday';
//     }
//     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//   };

//   // Deduplicate messages
//   const filteredMessages = messages
//     .filter(
//       msg => (msg.from === peer.id && msg.to === myPeerId) || 
//              (msg.from === myPeerId && msg.to === peer.id)
//     )
//     .filter((msg, index, self) => 
//       index === self.findIndex(m => 
//         m.id === msg.id && m.timestamp.getTime() === msg.timestamp.getTime()
//       )
//     );

//   const groupedMessages = filteredMessages.reduce((groups, message) => {
//     const date = new Date(message.timestamp).toDateString();
//     if (!groups[date]) {
//       groups[date] = [];
//     }
//     groups[date].push(message);
//     return groups;
//   }, {} as Record<string, ChatMessage[]>);

//   const canSendMessages = hasExistingMessages || isRequestAccepted;
//   const showPendingStatus = !canSendMessages && (isRequestSent || isRequestPending) && !hasExistingMessages;

//   // Simulate typing indicator
//   useEffect(() => {
//     if (inputMessage.length > 0) {
//       setIsTyping(true);
//       const timer = setTimeout(() => setIsTyping(false), 1000);
//       return () => clearTimeout(timer);
//     }
//   }, [inputMessage]);

//   return (
//     <>
//       <div className={`${!isMobile ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[680px]' : 'fixed inset-0'} z-50 animate-scaleIn pointer-events-auto`}>
//         <div className="h-full bg-[var(--bg-secondary)]/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10">
          
//           {/* Modern Header */}
//           <div className="relative px-4 md:px-6 py-4 bg-gradient-to-r from-[var(--gold)]/5 to-transparent border-b border-white/5">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 {/* Animated Avatar */}
//                 <div className="relative">
//                   <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center text-xl md:text-2xl font-bold text-white shadow-lg">
//                     {peer.name.charAt(0)}
//                   </div>
//                   <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--bg-secondary)] animate-pulse" />
//                 </div>
                
//                 <div>
//                   <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)] tracking-tight">
//                     {peer.name}
//                   </h3>
//                   <div className="flex items-center gap-2 mt-0.5">
//                     <span className="text-[10px] md:text-[11px] text-emerald-400 font-medium">● Online</span>
//                     <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]/30" />
//                     <span className="text-[9px] md:text-[10px] text-[var(--text-muted)] font-mono">
//                       {peer.id.slice(0, 10)}...
//                     </span>
//                     {(hasExistingMessages || isRequestAccepted || isConnected) && (
//                       <>
//                         <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]/30" />
//                         <span className="text-[9px] md:text-[10px] text-[var(--gold)] font-medium">✓ Connected</span>
//                       </>
//                     )}
//                   </div>
//                 </div>
//               </div>
              
//               {/* Close Button */}
//               <button 
//                 onClick={onClose} 
//                 className="w-8 h-8 md:w-9 md:h-9 rounded-xl hover:bg-white/5 transition-all duration-200 flex items-center justify-center group"
//               >
//                 <svg className="w-4 h-4 md:w-5 md:h-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/>
//                 </svg>
//               </button>
//             </div>
//           </div>
          
//           {/* Messages Area */}
//           <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 md:py-6 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-[var(--bg-primary)]/5">
            
//             {/* Request Pending State */}
//             {showPendingStatus && (
//               <div className="flex flex-col items-center justify-center h-full text-center py-12">
//                 <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center mb-4">
//                   <svg className="w-8 h-8 md:w-10 md:h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//                   </svg>
//                 </div>
//                 <p className="text-base md:text-lg font-medium text-[var(--text-primary)]">Request Pending</p>
//                 <p className="text-xs md:text-sm text-[var(--text-muted)] mt-2 max-w-xs">
//                   Waiting for {peer.name} to accept your message request
//                 </p>
//                 <button
//                   onClick={() => setShowRequestModal(true)}
//                   className="mt-6 px-4 md:px-5 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 text-[var(--text-secondary)]"
//                 >
//                   Resend Request
//                 </button>
//               </div>
//             )}
            
//             {/* No Messages - Empty State */}
//             {!hasExistingMessages && !isRequestAccepted && !isRequestSent && !isRequestPending && (
//               <div className="flex flex-col items-center justify-center h-full text-center py-12">
//                 <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[var(--gold)]/10 to-transparent flex items-center justify-center mb-4 md:mb-5">
//                   <svg className="w-10 h-10 md:w-12 md:h-12 text-[var(--gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
//                   </svg>
//                 </div>
//                 <p className="text-base md:text-lg font-medium text-[var(--text-primary)]">No messages yet</p>
//                 <p className="text-xs md:text-sm text-[var(--text-muted)] mt-2 max-w-xs">
//                   Send a request to start a conversation with {peer.name}
//                 </p>
//                 <button
//                   onClick={() => setShowRequestModal(true)}
//                   className="mt-6 px-5 md:px-6 py-2.5 text-sm font-medium bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-white rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg shadow-[var(--gold)]/20"
//                 >
//                   Send Message Request
//                 </button>
//               </div>
//             )}
            
//             {/* Messages Display */}
//             {hasExistingMessages && Object.entries(groupedMessages).map(([date, dateMessages]) => (
//               <div key={date}>
//                 <div className="flex justify-center my-4 md:my-5">
//                   <div className="px-2 md:px-3 py-1 rounded-full bg-white/5 text-[9px] md:text-[10px] font-medium text-[var(--text-muted)]">
//                     {formatDate(new Date(date))}
//                   </div>
//                 </div>
                
//                 {dateMessages.map((msg, idx) => {
//                   const isOwnMessage = msg.from === myPeerId;
//                   return (
//                     <div 
//                       key={`${msg.id}-${idx}`} 
//                       className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 md:mb-4 animate-fadeInUp`}
//                     >
//                       <div className={`max-w-[80%] md:max-w-[75%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
//                         <div className={`relative px-3 md:px-4 py-2 md:py-2.5 rounded-2xl ${
//                           isOwnMessage 
//                             ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-white shadow-lg shadow-[var(--gold)]/20 rounded-br-md' 
//                             : 'bg-white/5 backdrop-blur-sm text-[var(--text-primary)] rounded-bl-md border border-white/10'
//                         }`}>
//                           <p className="text-sm leading-relaxed break-words">{msg.content}</p>
//                           <div className={`flex items-center gap-1 mt-1 text-[9px] md:text-[10px] ${
//                             isOwnMessage ? 'text-white/60' : 'text-[var(--text-muted)]/60'
//                           }`}>
//                             <span>{formatTime(new Date(msg.timestamp))}</span>
//                             {isOwnMessage && (
//                               <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
//                                 <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
//                               </svg>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                       {!isOwnMessage && (
//                         <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center text-sm font-bold text-white ml-2 order-2 shadow-md">
//                           {peer.name.charAt(0)}
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             ))}
            
//             <div ref={messagesEndRef} />
//           </div>
          
//           {/* Typing Indicator */}
//           {isTyping && canSendMessages && (
//             <div className="px-4 md:px-5 py-2">
//               <div className="flex items-center gap-2">
//                 <div className="flex gap-1">
//                   <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[var(--text-muted)]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
//                   <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[var(--text-muted)]/40 animate-bounce" style={{ animationDelay: '150ms' }} />
//                   <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[var(--text-muted)]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
//                 </div>
//                 <span className="text-[10px] md:text-xs text-[var(--text-muted)]">typing...</span>
//               </div>
//             </div>
//           )}
          
//           {/* Input Area */}
//           {canSendMessages && (
//             <div className="px-4 md:px-5 py-3 md:py-4 border-t border-white/5 bg-[var(--bg-primary)]/30 backdrop-blur-sm">
//               <div className="flex gap-2 md:gap-3 items-end">
//                 <div className="flex-1 relative">
//                   <textarea
//                     ref={inputRef as any}
//                     value={inputMessage}
//                     onChange={(e) => setInputMessage(e.target.value)}
//                     onKeyPress={handleKeyPress}
//                     placeholder="Type a message..."
//                     rows={1}
//                     className="w-full px-3 md:px-4 py-2 md:py-3 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] transition-all resize-none text-sm"
//                     style={{ minHeight: '40px', maxHeight: '100px' }}
//                     onInput={(e) => {
//                       const target = e.target as HTMLTextAreaElement;
//                       target.style.height = 'auto';
//                       target.style.height = Math.min(target.scrollHeight, 100) + 'px';
//                     }}
//                   />
//                 </div>
//                 <button
//                   onClick={handleSend}
//                   disabled={!inputMessage.trim()}
//                   className={`px-4 md:px-5 py-2 md:py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
//                     inputMessage.trim()
//                       ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
//                       : 'bg-white/5 text-[var(--text-muted)] cursor-not-allowed'
//                   }`}
//                 >
//                   <span className="text-xs md:text-sm font-medium">Send</span>
//                   <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
//                   </svg>
//                 </button>
//               </div>
//               <div className="text-[9px] md:text-[10px] text-[var(--text-muted)]/50 text-center mt-2">
//                 Press Enter to send
//               </div>
//             </div>
//           )}
          
//           {/* Request Accepted Banner */}
//           {isRequestAccepted && !hasExistingMessages && (
//             <div className="mx-4 md:mx-5 mb-3 md:mb-4 px-3 md:px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
//               <p className="text-[10px] md:text-[11px] text-emerald-400 font-medium">✓ Request accepted! You can now start chatting.</p>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Modern Request Modal */}
//       {showRequestModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-4">
//           <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 md:p-6 w-[90%] max-w-md border border-white/10 shadow-2xl">
//             <h3 className="text-lg md:text-xl font-bold text-[var(--text-primary)] mb-2">Send Request to {peer.name}</h3>
//             <p className="text-xs md:text-sm text-[var(--text-muted)] mb-4 md:mb-5">
//               Send a request to start a conversation. {peer.name} will need to accept before you can exchange messages.
//             </p>
//             <textarea
//               value={requestMessage}
//               onChange={(e) => setRequestMessage(e.target.value)}
//               placeholder="Write an introduction message..."
//               rows={3}
//               className="w-full px-3 md:px-4 py-2 md:py-3 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--gold)] transition-all resize-none text-sm mb-4 md:mb-5"
//             />
//             <div className="flex gap-3">
//               <button
//                 onClick={handleSendRequest}
//                 disabled={!requestMessage.trim()}
//                 className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
//                   requestMessage.trim()
//                     ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-white hover:opacity-90'
//                     : 'bg-white/5 text-[var(--text-muted)] cursor-not-allowed'
//                 }`}
//               >
//                 Send Request
//               </button>
//               <button
//                 onClick={() => setShowRequestModal(false)}
//                 className="flex-1 py-2.5 rounded-xl bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }