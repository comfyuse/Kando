'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatUser, ChatMessage, ChatNetwork } from '@/lib/chat-network';

interface ChatWindowProps {
  currentUser: ChatUser;
  targetUser: ChatUser;
  network: ChatNetwork;
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
}

export default function ChatWindow({ currentUser, targetUser, network, onSendMessage, messages }: ChatWindowProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // محاسبه فاصله لایه‌ای بین دو کاربر
  const getLayerDistance = () => {
    const distance = Math.abs(currentUser.layer - targetUser.layer);
    if (distance === 0) return 'Same layer - Direct message';
    if (distance === 1) return 'Adjacent layer - 1 hop';
    if (distance === 2) return 'Two layers apart - 2 hops';
    return 'Three layers apart - 3 hops (via P2P)';
  };

  return (
    <div className="flex flex-col h-full bg-[#161b22] rounded-lg overflow-hidden border border-[#30363d]">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-[#30363d] bg-[#0d1117]">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold`}
               style={{ backgroundColor: targetUser.avatarColor }}>
            {targetUser.name.charAt(0)}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0d1117] ${
            targetUser.status === 'online' ? 'bg-[#3fb950]' : targetUser.status === 'away' ? 'bg-[#f0d68a]' : 'bg-[#8b949e]'
          }`} />
        </div>
        
        <div className="flex-1">
          <div className="font-semibold text-white">{targetUser.name}</div>
          <div className="text-xs text-[#8b949e] flex items-center gap-2">
            <span>Layer {targetUser.layer}</span>
            <span>•</span>
            <span>{getLayerDistance()}</span>
          </div>
        </div>
        
        <div className="text-xs text-[#8b949e]">
          {targetUser.status === 'online' ? 'Online' : 'Offline'}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-[#8b949e] text-sm py-8">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.fromUserId === currentUser.id;
            return (
              <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-lg px-3 py-2 ${
                  isCurrentUser 
                    ? 'bg-[#2ea88a] text-white' 
                    : 'bg-[#0d1117] border border-[#30363d] text-[#c9d1d9]'
                }`}>
                  <div className="text-sm break-words">{msg.content}</div>
                  <div className="text-[9px] opacity-70 mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isCurrentUser && (
                      <span className="ml-1">
                        {msg.status === 'sent' && '✓'}
                        {msg.status === 'delivered' && '✓✓'}
                        {msg.status === 'read' && '✓✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-3 border-t border-[#30363d] bg-[#0d1117]">
        <div className="flex gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${targetUser.name}...`}
            className="flex-1 px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg focus:outline-none focus:border-[#2ea88a] text-sm resize-none"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-[#2ea88a] hover:bg-[#3fb892] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}