// app/chat/data/profiles.ts

export interface UserProfile {
  name: string;
  avatar: string;
  role: string;
  level: number;
  joinDate: string;
  messagesSent: number;
  trustScore: number;
  bio: string;
  interests: string[];
  status: 'online' | 'away' | 'offline';
  favoriteQuote?: string;
  achievements?: string[];
  location?: string;
  email?: string;
  peerId?: string;
  peerHash?: string;
  isConnected?: boolean;
}

export interface MessageRequest {
  id: string;
  from: string;
  fromName: string;
  fromHash: string;
  message: string;
  timestamp: Date;
  status: 'pending' | 'accepted' | 'denied';
}

// The hive is empty until real people register. No seed/demo members.
export const citizenNames: string[] = [];

// Known profiles by name. Empty — every member is a real registered account.
export const personProfiles: Record<string, UserProfile> = {};

// Generate peer hash
export const generatePeerHash = (name: string): string => {
  return `${name}-cando-peer`;
};