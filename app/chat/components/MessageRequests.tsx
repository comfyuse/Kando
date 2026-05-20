// 'use client';

// import { useEffect } from 'react';
// import { MessageRequest } from '../data/profiles';

// interface MessageRequestsProps {
//   requests: MessageRequest[];
//   onAccept: (requestId: string) => void;
//   onDeny: (requestId: string) => void;
//   onClose: () => void;
// }

// export default function MessageRequests({ requests, onAccept, onDeny, onClose }: MessageRequestsProps) {
//   const pendingRequests = requests.filter(r => r.status === 'pending');

//   // Handle escape key to close
//   useEffect(() => {
//     const handleEsc = (e: KeyboardEvent) => {
//       if (e.key === 'Escape') {
//         onClose();
//       }
//     };
//     window.addEventListener('keydown', handleEsc);
//     return () => window.removeEventListener('keydown', handleEsc);
//   }, [onClose]);

//   // Prevent body scroll when modal is open
//   useEffect(() => {
//     document.body.style.overflow = 'hidden';
//     return () => {
//       document.body.style.overflow = 'unset';
//     };
//   }, []);

//   return (
//     <div 
//       className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
//       onClick={onClose}
//     >
//       <div 
//         className="w-full max-w-md bg-[var(--bg-secondary)] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
//         onClick={(e) => e.stopPropagation()}
//       >
//         {/* Header */}
//         <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[var(--jade)]/10 to-transparent flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <div className="relative">
//               <svg className="w-5 h-5 text-[var(--jade)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//               </svg>
//               {pendingRequests.length > 0 && (
//                 <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold shadow-lg">
//                   {pendingRequests.length}
//                 </div>
//               )}
//             </div>
//             <h3 className="text-base font-semibold text-[var(--text-primary)]">Message Requests</h3>
//           </div>
//           <button 
//             onClick={onClose} 
//             className="w-8 h-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
//           >
//             <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/>
//             </svg>
//           </button>
//         </div>

//         {/* Content */}
//         <div className="max-h-[70vh] overflow-y-auto">
//           {pendingRequests.length === 0 ? (
//             <div className="px-5 py-12 text-center">
//               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
//                 <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
//                 </svg>
//               </div>
//               <p className="text-sm text-[var(--text-primary)] font-medium mb-1">No pending requests</p>
//               <p className="text-xs text-[var(--text-muted)]">When someone sends you a request, it will appear here</p>
//             </div>
//           ) : (
//             <div className="divide-y divide-white/10">
//               {pendingRequests.map((request) => (
//                 <div key={request.id} className="px-5 py-4 hover:bg-white/5 transition-colors">
//                   <div className="flex items-start gap-3">
//                     <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-white font-bold shadow-md">
//                       {request.fromName.charAt(0).toUpperCase()}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
//                         <h4 className="text-sm font-semibold text-[var(--text-primary)]">{request.fromName}</h4>
//                         <span className="text-[9px] text-[var(--text-muted)] whitespace-nowrap">
//                           {new Date(request.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                         </span>
//                       </div>
//                       <p className="text-xs text-[var(--text-secondary)] mb-3 break-words">{request.message}</p>
//                       <div className="flex gap-2">
//                         <button
//                           onClick={() => onAccept(request.id)}
//                           className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-all duration-200 flex items-center gap-1"
//                         >
//                           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                           </svg>
//                           Accept
//                         </button>
//                         <button
//                           onClick={() => onDeny(request.id)}
//                           className="px-3 py-1.5 text-xs font-medium bg-white/5 text-red-400 rounded-lg hover:bg-red-500/10 transition-all duration-200 flex items-center gap-1"
//                         >
//                           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                           </svg>
//                           Deny
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }