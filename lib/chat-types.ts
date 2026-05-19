// app/lib/chat-types.ts
export interface ChatUser {
  id: string;
  name: string;
  layer: number;
  status: 'online' | 'away' | 'offline';
  avatarColor: string;
  coord: { q: number; r: number };
}

export interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: Date;
  encrypted: boolean;
}