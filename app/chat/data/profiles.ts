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

// The 11 main characters for green cells
export const citizenNames = [
  'Shaya', 'Ali', 'Sahand', 'Danial', 'Sadra', 
  'Farbod', 'Arman', 'Dorsa', 'Bahram', 'Farzam', 'Behnam'
];

// Complete profiles for each specific person with unique avatar stickers
export const personProfiles: Record<string, UserProfile> = {
  'Shaya': {
    name: 'Shaya',
    avatar: '🌟',
    role: 'Blockchain Architect',
    level: 5,
    joinDate: '2024-01-15',
    messagesSent: 847,
    trustScore: 98,
    bio: 'Passionate about decentralized governance and Web3 innovation. Building the future of peer-to-peer networks.',
    interests: ['DeFi', 'Smart Contracts', 'Layer 2', 'Web3'],
    status: 'online',
    favoriteQuote: 'Code is law, but community is king',
    achievements: ['Genesis Block Creator', 'Protocol Designer', 'Core Contributor'],
    location: 'Toronto, Canada',
    email: 'shaya@cando.network'
  },
  'Ali': {
    name: 'Ali',
    avatar: '🦁',
    role: 'Network Validator',
    level: 4,
    joinDate: '2024-02-20',
    messagesSent: 623,
    trustScore: 95,
    bio: 'Ensuring security and consensus across the network. Validator since day one.',
    interests: ['Cryptography', 'Security', 'Consensus', 'Nodes'],
    status: 'online',
    favoriteQuote: 'Decentralization is not an option, it is a necessity',
    achievements: ['Validator of the Month', 'Security Champion', 'Uptime Hero'],
    location: 'Dubai, UAE',
    email: 'ali@cando.network'
  },
  'Sahand': {
    name: 'Sahand',
    avatar: '🎨',
    role: 'Community Manager',
    level: 4,
    joinDate: '2024-01-30',
    messagesSent: 1245,
    trustScore: 96,
    bio: 'Building bridges between citizens and the council. Community first, always.',
    interests: ['DAO', 'Community', 'Education', 'Moderation'],
    status: 'online',
    favoriteQuote: 'Together we build, together we grow',
    achievements: ['Community Hero', 'Top Moderator', 'Best Supporter'],
    location: 'London, UK',
    email: 'sahand@cando.network'
  },
  'Danial': {
    name: 'Danial',
    avatar: '💻',
    role: 'Full Stack Developer',
    level: 5,
    joinDate: '2024-01-10',
    messagesSent: 934,
    trustScore: 97,
    bio: 'Creating tools for the decentralized future. Building dApps and interfaces.',
    interests: ['Development', 'Open Source', 'Hackathons', 'React'],
    status: 'online',
    favoriteQuote: 'Ship early, ship often',
    achievements: ['Core Contributor', 'Bug Bounty Hunter', 'Best Developer'],
    location: 'Berlin, Germany',
    email: 'danial@cando.network'
  },
  'Sadra': {
    name: 'Sadra',
    avatar: '🎯',
    role: 'UX Designer',
    level: 3,
    joinDate: '2024-03-05',
    messagesSent: 456,
    trustScore: 92,
    bio: 'Making decentralized tech accessible to everyone. Design is the bridge.',
    interests: ['Design', 'User Experience', 'Accessibility', 'UI'],
    status: 'away',
    favoriteQuote: 'Simplicity is the ultimate sophistication',
    achievements: ['Design Award Winner', 'Accessibility Advocate'],
    location: 'Stockholm, Sweden',
    email: 'sadra@cando.network'
  },
  'Farbod': {
    name: 'Farbod',
    avatar: '🔬',
    role: 'Research Scientist',
    level: 5,
    joinDate: '2024-01-05',
    messagesSent: 567,
    trustScore: 99,
    bio: 'Exploring the frontiers of distributed systems. Pushing the boundaries.',
    interests: ['Research', 'AI', 'Distributed Systems', 'Algorithms'],
    status: 'online',
    favoriteQuote: 'The network is the computer',
    achievements: ['Research Grant Recipient', 'Patent Holder', 'Published Author'],
    location: 'Boston, USA',
    email: 'farbod@cando.network'
  },
  'Arman': {
    name: 'Arman',
    avatar: '📊',
    role: 'Economic Analyst',
    level: 4,
    joinDate: '2024-02-10',
    messagesSent: 789,
    trustScore: 94,
    bio: 'Studying tokenomics and network incentives. Economics of the future.',
    interests: ['Economics', 'Game Theory', 'Tokenomics', 'Markets'],
    status: 'online',
    favoriteQuote: 'Incentives drive behavior',
    achievements: ['Economic Model Designer', 'Tokenomics Expert'],
    location: 'Singapore',
    email: 'arman@cando.network'
  },
  'Dorsa': {
    name: 'Dorsa',
    avatar: '⚖️',
    role: 'Governance Lead',
    level: 4,
    joinDate: '2024-02-15',
    messagesSent: 892,
    trustScore: 96,
    bio: 'Facilitating decentralized decision making. Every voice matters.',
    interests: ['Governance', 'Voting', 'Democracy', 'Participation'],
    status: 'online',
    favoriteQuote: 'Voice matters, vote counts',
    achievements: ['Governance Framework Creator', 'DAO Pioneer'],
    location: 'Zurich, Switzerland',
    email: 'dorsa@cando.network'
  },
  'Bahram': {
    name: 'Bahram',
    avatar: '🏗️',
    role: 'Infrastructure Engineer',
    level: 5,
    joinDate: '2024-01-20',
    messagesSent: 678,
    trustScore: 97,
    bio: 'Building robust and scalable network infrastructure. Behind the scenes.',
    interests: ['DevOps', 'Cloud', 'Scaling', 'Infrastructure'],
    status: 'away',
    favoriteQuote: 'Infrastructure is invisible when it works',
    achievements: ['Infrastructure MVP', 'Uptime Champion', 'Performance Expert'],
    location: 'Amsterdam, Netherlands',
    email: 'bahram@cando.network'
  },
  'Farzam': {
    name: 'Farzam',
    avatar: '📢',
    role: 'Protocol Evangelist',
    level: 3,
    joinDate: '2024-03-10',
    messagesSent: 523,
    trustScore: 91,
    bio: 'Spreading the word about decentralized technologies. Education first.',
    interests: ['Public Speaking', 'Education', 'Outreach', 'Content'],
    status: 'online',
    favoriteQuote: 'Education is the key to adoption',
    achievements: ['Top Speaker', 'Community Builder', 'Best Content'],
    location: 'Austin, USA',
    email: 'farzam@cando.network'
  },
  'Behnam': {
    name: 'Behnam',
    avatar: '🛡️',
    role: 'Security Auditor',
    level: 5,
    joinDate: '2024-01-25',
    messagesSent: 734,
    trustScore: 100,
    bio: 'Keeping the network safe from threats. Security is priority one.',
    interests: ['Security', 'Auditing', 'Penetration Testing', 'Cryptography'],
    status: 'online',
    favoriteQuote: 'Trust but verify',
    achievements: ['Security Audit Lead', 'Bug Bounty Winner', 'Security Expert'],
    location: 'Tel Aviv, Israel',
    email: 'behnam@cando.network'
  }
};

// Generate peer hash
export const generatePeerHash = (name: string): string => {
  return `${name}-cando-peer`;
};