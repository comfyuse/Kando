// lib/chat-network.ts

export interface ChatUser {
  id: string;
  name: string;
  layer: number;
  position: number;
  q: number;
  r: number;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  avatarColor: string;
  bio: string;
  publicKey: string;
}

export interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  votesFor: string[];
  votesAgainst: string[];
  status: 'active' | 'passed' | 'rejected';
  createdAt: Date;
}

export class ChatNetwork {
  users = new Map<string, ChatUser>();
  messages = new Map<string, ChatMessage[]>();
  proposals = new Map<string, Proposal>();
  currentUserId: string | null = null;
  private messageCallbacks: ((message: ChatMessage) => void)[] = [];

  constructor() {
    this.generateNetwork();
  }

  // مختصات شش ضلعی برای هر لایه
  private getLayerCoordinates(): { layer: number; q: number; r: number; position: number }[] {
    const coords: { layer: number; q: number; r: number; position: number }[] = [];
    
    // لایه 1: Queen (مرکز)
    coords.push({ layer: 1, q: 0, r: 0, position: 0 });
    
    // لایه 2: حلقه اول (6 سلول)
    const ring2 = [
      [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
    ];
    ring2.forEach(([q, r], idx) => {
      coords.push({ layer: 2, q, r, position: idx });
    });
    
    // لایه 3: حلقه دوم (12 سلول)
    const ring3 = [
      [2, -1], [2, -2], [1, -2], [0, -2], [-1, -1], [-2, 0],
      [-2, 1], [-1, 2], [0, 2], [1, 1], [2, 0], [1, -1]
    ];
    ring3.forEach(([q, r], idx) => {
      coords.push({ layer: 3, q, r, position: idx });
    });
    
    // لایه 4: حلقه سوم (18 سلول)
    const ring4 = [
      [3, -2], [3, -3], [2, -3], [1, -3], [0, -3], [-1, -2],
      [-2, -1], [-3, 0], [-3, 1], [-2, 2], [-1, 3], [0, 3],
      [1, 2], [2, 1], [3, 0], [2, -1], [1, -2], [0, -1]
    ];
    ring4.forEach(([q, r], idx) => {
      coords.push({ layer: 4, q, r, position: idx });
    });
    
    return coords;
  }

  // تولید شبکه با 37 کاربر
  generateNetwork() {
    const coordinates = this.getLayerCoordinates();
    
    const namesByLayer: Record<number, string[]> = {
      1: ['Queen 👑'],
      2: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'],
      3: ['Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett',
          'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa'],
      4: ['Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor',
          'Whiskey', 'Xray', 'Yankee', 'Zulu', 'Alice', 'Bob',
          'Charlie', 'David', 'Eva', 'Frank', 'Grace', 'Henry']
    };
    
    const bios = [
      "Building the future of decentralized communication",
      "Privacy advocate | Open source contributor",
      "Web3 enthusiast | P2P networking",
      "Cryptography researcher",
      "Mesh network specialist",
      "Decentralization believer",
      "Software engineer | Blockchain",
      "Digital rights activist"
    ];
    
    const colors = [
      '#ffd700', '#3fb950', '#58a6ff', '#f85149', '#d4a843',
      '#a371f7', '#db61a2', '#7ee2ff', '#ff7b72', '#79c0ff',
      '#2ea88a', '#f0883e', '#da3633', '#8b949e', '#c9d1d9'
    ];
    
    coordinates.forEach((coord, index) => {
      const layerNames = namesByLayer[coord.layer];
      const name = layerNames[coord.position % layerNames.length] + 
                   (coord.layer === 1 ? '' : ` ${Math.floor(Math.random() * 900) + 100}`);
      
      const user: ChatUser = {
        id: `user_${coord.q}_${coord.r}`,
        name: name,
        layer: coord.layer,
        position: coord.position,
        q: coord.q,
        r: coord.r,
        status: Math.random() > 0.2 ? 'online' : (Math.random() > 0.5 ? 'away' : 'offline'),
        lastSeen: new Date(),
        avatarColor: colors[index % colors.length],
        bio: bios[Math.floor(Math.random() * bios.length)],
        publicKey: `0x${Math.random().toString(36).substring(2, 15)}`,
      };
      this.users.set(user.id, user);
      this.messages.set(user.id, []);
    });
    
    // تنظیم کاربر فعلی (Queen)
    this.currentUserId = 'user_0_0';
  }

  // دریافت همسایه‌های یک کاربر
  getNeighbors(userId: string): ChatUser[] {
    const user = this.users.get(userId);
    if (!user) return [];
    
    const neighbors: ChatUser[] = [];
    const neighborCoords = [
      [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
    ];
    
    for (const [dq, dr] of neighborCoords) {
      const neighborId = `user_${user.q + dq}_${user.r + dr}`;
      const neighbor = this.users.get(neighborId);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }
    
    return neighbors;
  }

  // دریافت کاربران بر اساس لایه
  getUsersByLayer(layer: number): ChatUser[] {
    return [...this.users.values()].filter(user => user.layer === layer);
  }

  // دریافت کاربران قابل مشاهده (همسایه‌ها + همسایه‌های همسایه)
  getVisibleUsers(userId: string): ChatUser[] {
    const user = this.users.get(userId);
    if (!user) return [];
    
    const visible = new Set<ChatUser>();
    const neighbors = this.getNeighbors(userId);
    neighbors.forEach(n => visible.add(n));
    
    // همسایه‌های همسایه (برای ارتباط غیرمستقیم)
    neighbors.forEach(neighbor => {
      this.getNeighbors(neighbor.id).forEach(n => {
        if (n.id !== userId) visible.add(n);
      });
    });
    
    return [...visible];
  }

  // دریافت آمار شبکه
  getStats() {
    const users = [...this.users.values()];
    return {
      totalUsers: users.length,
      layer1: users.filter(u => u.layer === 1).length,
      layer2: users.filter(u => u.layer === 2).length,
      layer3: users.filter(u => u.layer === 3).length,
      layer4: users.filter(u => u.layer === 4).length,
      online: users.filter(u => u.status === 'online').length,
    };
  }

  // ارسال پیام
  sendMessage(fromUserId: string, toUserId: string, content: string): ChatMessage {
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      fromUserId,
      toUserId,
      content,
      timestamp: new Date(),
      status: 'sent',
    };
    
    // ذخیره در تاریخچه هر دو کاربر
    const fromMessages = this.messages.get(fromUserId) || [];
    fromMessages.push(message);
    this.messages.set(fromUserId, fromMessages);
    
    const toMessages = this.messages.get(toUserId) || [];
    toMessages.push(message);
    this.messages.set(toUserId, toMessages);
    
    // فراخوانی callback‌ها
    this.messageCallbacks.forEach(cb => cb(message));
    
    return message;
  }

  // ثبت callback برای پیام‌های جدید
  onMessage(callback: (message: ChatMessage) => void) {
    this.messageCallbacks.push(callback);
  }

  // دریافت مکالمات بین دو کاربر
  getConversation(userId1: string, userId2: string): ChatMessage[] {
    const messages = this.messages.get(userId1) || [];
    return messages.filter(m => 
      (m.fromUserId === userId1 && m.toUserId === userId2) ||
      (m.fromUserId === userId2 && m.toUserId === userId1)
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // ایجاد پیشنهاد جدید
  createProposal(title: string, description: string, createdBy: string): Proposal {
    const proposal: Proposal = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      description,
      createdBy,
      votesFor: [],
      votesAgainst: [],
      status: 'active',
      createdAt: new Date(),
    };
    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  // رای دادن به پیشنهاد
  voteOnProposal(proposalId: string, userId: string, vote: 'for' | 'against') {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'active') return false;
    
    if (vote === 'for' && !proposal.votesFor.includes(userId)) {
      proposal.votesFor.push(userId);
    } else if (vote === 'against' && !proposal.votesAgainst.includes(userId)) {
      proposal.votesAgainst.push(userId);
    }
    
    // بررسی نتیجه (نیاز به 3 رای موافق برای تصویب در لایه‌های بیرونی)
    const user = this.users.get(userId);
    const requiredVotes = user?.layer === 4 ? 5 : user?.layer === 3 ? 4 : 3;
    
    if (proposal.votesFor.length >= requiredVotes) {
      proposal.status = 'passed';
    } else if (proposal.votesAgainst.length >= requiredVotes) {
      proposal.status = 'rejected';
    }
    
    return true;
  }

  // تغییر وضعیت کاربر
  setUserStatus(userId: string, status: ChatUser['status']) {
    const user = this.users.get(userId);
    if (user) {
      user.status = status;
      user.lastSeen = new Date();
    }
  }

  // تغییر کاربر فعلی
  setCurrentUser(userId: string) {
    this.currentUserId = userId;
  }
}