'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { Network, Cell, AxialCoord } from '@/lib/simulator';
import { p2pClient, ChatMessage as P2PMessage, Peer } from '@/lib/p2p-client';
import { dhtClient, NetworkMember, Invite } from '@/lib/dht-client';

// Components
import ProfilePanel from './components/ProfilePanel';
import ChatPanel from './components/ChatPanel';
import MessageRequests from './components/MessageRequests';
import InvitePanel from './components/InvitePanel';
import Navbar from '@/components/Navbar';
import AppNav, { AppTab } from './components/AppNav';
import ChatsView from './components/ChatsView';
import TasksView from './components/TasksView';
import AccountView from './components/AccountView';
import AuthScreen from './components/AuthScreen';
import { Account, getStoredAccount, clearSession, logout as authLogout } from '@/lib/auth-client';

// Data
import { citizenNames, personProfiles, generatePeerHash, UserProfile, MessageRequest } from './data/profiles';

// Import the EXACT Scene2D component from your simulator
const Scene2D = dynamic(() => import('@/components/Scene2D'), { ssr: false });

interface CurveSelection {
  fromCell: Cell;
  toCell: Cell;
}
// Add this export
export interface ChatUser {
  id: string;
  name: string;
  layer: number;
  status: 'online' | 'away' | 'offline';
  avatarColor: string;
  coord: { q: number; r: number };
}

// Store user profiles for each cell
const userProfiles = new Map<string, UserProfile>();
let citizenCounter = 0;

// Function to get or create profile for a cell
const getProfileForCell = (cell: Cell): UserProfile => {
  const key = cell.coord.key();

  if (userProfiles.has(key)) {
    return userProfiles.get(key)!;
  }

  let profile: UserProfile;

  if (cell.status === 'citizen' && citizenNames.length > 0) {
    const nameIndex = citizenCounter % citizenNames.length;
    const name = citizenNames[nameIndex];
    profile = { ...personProfiles[name] };
    profile.peerId = generatePeerHash(name);
    profile.peerHash = generatePeerHash(name);
    profile.isConnected = false;
    citizenCounter++;
  } else {
    const genericNames = ['Visitor', 'Guest', 'Member', 'Participant', 'Traveler', 'Explorer'];
    const randomName = genericNames[Math.floor(Math.random() * genericNames.length)];
    const emojis = ['👤', '👥', '🌟', '⭐', '💫', '✨', '⚡', '🔥', '💎', '🎯'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    profile = {
      name: randomName,
      avatar: randomEmoji,
      role: 'Network Participant',
      level: Math.floor(Math.random() * 3) + 1,
      joinDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      messagesSent: Math.floor(Math.random() * 500),
      trustScore: Math.floor(Math.random() * 50) + 50,
      bio: 'Participating in the KANDO network',
      interests: ['Blockchain', 'Networking'],
      status: cell.status === 'candidate' ? 'away' : 'offline',
      location: 'Unknown',
      email: 'participant@kando.network',
      peerId: generatePeerHash(randomName + Math.random()),
      peerHash: generatePeerHash(randomName + Math.random()),
      isConnected: false
    };
  }

  userProfiles.set(key, profile);
  return profile;
};

export default function ChatPage() {
  // The hive shows REAL members only: the queen owns (0,0) forever; every
  // other cell is claimed by accepting an invite link. Stages follow the
  // hambalidan protocol (RESERVED → CANDIDATE → CITIZEN), derived from
  // occupancy — the same rules the Go backend computes.
  const netRef = useRef(new Network('mvp'));
  const [tick, setTick] = useState(0);
  const [stats, setStats] = useState(() => netRef.current.stats());
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isQueen, setIsQueen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [selectedCurve, setSelectedCurve] = useState<CurveSelection | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const sceneRef = useRef<{ render: () => void }>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // The 4-tab shell — 'kando' is the live hive (Scene2D), the others overlay it.
  const [activeTab, setActiveTab] = useState<AppTab>('kando');
  // Account auth gate — until a user is logged in, only AuthScreen renders.
  const [account, setAccount] = useState<Account | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // P2P Chat States
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [myPeerName, setMyPeerName] = useState<string | null>(null);
  const [myPeerHash, setMyPeerHash] = useState<string | null>(null);
  const [receivedMessages, setReceivedMessages] = useState<P2PMessage[]>([]);
  const [onlinePeers, setOnlinePeers] = useState<Peer[]>([]);
  const [currentChatPeer, setCurrentChatPeer] = useState<Peer | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [connectHash, setConnectHash] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [myIdentity, setMyIdentity] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');

  // Message Request States
  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  const [pendingRequestFrom, setPendingRequestFrom] = useState<Peer | null>(null);
  const [acceptedRequestFrom, setAcceptedRequestFrom] = useState<Peer | null>(null);
  const [connectedPeers, setConnectedPeers] = useState<Peer[]>([]);

  // Friends States
  const [friends, setFriends] = useState<Peer[]>([]);


  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Restore a logged-in account from a previous session (validated at login).
  useEffect(() => {
    setAccount(getStoredAccount());
    setAuthReady(true);
  }, []);

  // Load friends from localStorage on mount
  useEffect(() => {
    const savedFriends = localStorage.getItem('kando_friends');
    if (savedFriends) {
      try {
        const parsed = JSON.parse(savedFriends);
        const loadedFriends = parsed.map((f: any) => ({
          id: f.id,
          name: f.name,
          lastSeen: new Date().toISOString()
        } as Peer));
        setFriends(loadedFriends);
      } catch (e) {
        console.error('Failed to load friends:', e);
      }
    }
  }, []);

  // Rebuild the hive from the backend's member list. Each cell-holding member
  // occupies their permanent DHT cell (q,r); stages (RESERVED → CANDIDATE →
  // CITIZEN) are recomputed from occupancy — the same rules the backend uses.
  const rebuildHive = useCallback((memberList: NetworkMember[]) => {
    const net = new Network('mvp');
    for (const m of memberList) {
      if (!m.hasCell) continue;
      const cell = net.seedMember(m.cellQ, m.cellR);
      const isQueenCell = m.cellQ === 0 && m.cellR === 0;
      const known = personProfiles[m.name];
      userProfiles.set(cell.coord.key(), {
        ...(known ?? {
          name: m.name,
          avatar: isQueenCell ? '👑' : '🐝',
          role: isQueenCell ? 'Queen — Genesis Node' : 'KANDO Member',
          level: 1,
          joinDate: new Date().toLocaleDateString(),
          messagesSent: 0,
          trustScore: 100,
          bio: isQueenCell
            ? 'Permanent owner of cell (0,0) — the hive grows from here'
            : 'Registered member of the KANDO network',
          interests: ['KANDO', 'P2P'],
          status: 'online' as const,
          location: 'KANDO Hive',
          email: `${m.name.toLowerCase()}@kando.network`,
        }),
        peerId: m.id,
        peerHash: m.dhtId,
        isConnected: true,
      });
    }
    net.applyMvpPromotions();
    netRef.current = net;
    setMembers(memberList);
    setStats(net.stats());
    setTick(t => t + 1);
  }, []);

  // Pull members + pending invites from the backend and redraw the hive.
  const refreshHive = useCallback(async () => {
    try {
      const [memberList, inviteList] = await Promise.all([
        dhtClient.getMembers(),
        dhtClient.getInvites(),
      ]);
      rebuildHive(memberList);
      setInvites(inviteList);
    } catch (e) {
      console.warn('Hive refresh failed (backend offline?):', e);
    }
  }, [rebuildHive]);

  // Keep the hive in sync — new members may accept invites at any moment.
  useEffect(() => {
    const id = setInterval(() => { refreshHive(); }, 8000);
    return () => clearInterval(id);
  }, [refreshHive]);

  // Queen action: reserve an empty neighbour cell and get an invite link.
  const handleCreateInvite = useCallback(async (q: number, r: number): Promise<Invite | null> => {
    try {
      const invite = await dhtClient.createInvite(q, r);
      setInvites(prev => prev.some(i => i.token === invite.token) ? prev : [...prev, invite]);
      return invite;
    } catch (e) {
      alert(`Could not create invite: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }, []);

  // Register user once they are logged in. The hive identity is the account
  // name; no more anonymous prompt() — auth happens against the backend first.
  useEffect(() => {
    if (!account) return;
    const registerUser = async () => {
      try {
        console.log('🔍 Checking backend connection...');
        const nodeInfo = await p2pClient.getNodeInfo();
        if (nodeInfo) {
          console.log('✅ Backend is online:', nodeInfo);
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }

        // Invite-link landing: /chat?invite=<token> claims the reserved cell
        const inviteToken = new URLSearchParams(window.location.search).get('invite');

        // Identity is the authenticated account's name.
        const selectedIdentity = account.name;
        setMyIdentity(selectedIdentity);

        // DHT registration first — the FIRST member ever becomes the QUEEN and
        // owns cell (0,0) with its Kademlia DHT id forever. With an invite
        // token, the invitee claims the reserved cell instead.
        try {
          let dhtResult = null;
          if (inviteToken) {
            const info = await dhtClient.getInviteInfo(inviteToken);
            if (info) {
              try {
                dhtResult = await dhtClient.acceptInvite(inviteToken, selectedIdentity);
                alert(`🐝 Welcome to the hive!\n\nCell (${dhtResult.cellQ},${dhtResult.cellR}) is now reserved for you.\nDHT ID: ${dhtResult.dhtId}`);
              } catch (e) {
                console.warn('Invite accept failed:', e);
                alert(`Could not accept the invite: ${e instanceof Error ? e.message : e}`);
              }
            } else {
              alert('This invite link is invalid or was already used.');
            }
          }
          if (!dhtResult) {
            dhtResult = await dhtClient.register(selectedIdentity);
          }
          setMyPeerHash(dhtResult.dhtId || generatePeerHash(selectedIdentity));
          setIsQueen(dhtResult.isQueen);
          if (dhtResult.isQueen) {
            console.log('👑 You are the QUEEN — cell (0,0) is permanently yours');
          }
          console.log(`🔑 DHT identity: ${dhtResult.dhtId || '(guest — no cell yet)'} stage=${dhtResult.stage}`);
        } catch (e) {
          console.warn('DHT register failed (backend offline?):', e);
          // Fallback only if DHT backend is unreachable
          setMyPeerHash(generatePeerHash(selectedIdentity));
        }

        console.log('👤 Registering user:', selectedIdentity);
        const registration = await p2pClient.register(selectedIdentity);
        setMyPeerId(registration.peerId);
        setMyPeerName(registration.name);

        p2pClient.connect(registration.peerId, registration.name);

        // Draw the real hive (queen + accepted members + pending invites)
        await refreshHive();

        const messages = await p2pClient.getMessages();
        setReceivedMessages(messages);

        const peers = await p2pClient.getPeers();
        setOnlinePeers(peers);

      } catch (error) {
        console.error('❌ Failed to register:', error);
        setBackendStatus('offline');
      }
    };

    registerUser();

    p2pClient.onMessage((message) => {
      console.log('💬 New message received:', message);

      setReceivedMessages(prev => {
        const messageTime = new Date(message.timestamp).getTime();
        const exists = prev.some(m => {
          if (message.id && m.id === message.id) return true;
          return m.content === message.content &&
                 m.from === message.from &&
                 Math.abs(m.timestamp.getTime() - messageTime) < 1000;
        });

        if (exists) {
          console.log('🔄 Duplicate message ignored:', message.content);
          return prev;
        }

        return [...prev, { ...message, timestamp: new Date(message.timestamp) }];
      });

      if (message.from !== myPeerId && document.hidden) {
        const sender = onlinePeers.find(p => p.id === message.from);
        if (sender) {
          alert(`New message from ${sender.name}: ${message.content}`);
        }
      }
    });

    p2pClient.onMessageRequest((request) => {
      console.log('📨 New message request:', request);
      const newRequest: MessageRequest = {
        id: Date.now().toString(),
        from: request.from,
        fromName: request.fromName,
        fromHash: request.from,
        message: request.message,
        timestamp: new Date(request.timestamp),
        status: 'pending'
      };
      setMessageRequests(prev => [...prev, newRequest]);
    });

    p2pClient.onPeersUpdate((peers) => {
      console.log('👥 Peers updated:', peers);
      setOnlinePeers(peers);
    });

    return () => {
      p2pClient.disconnect();
    };
  }, [account]);

  useEffect(() => {
    const cells = Array.from(netRef.current.cells.values());
    for (const cell of cells) {
      getProfileForCell(cell);
    }
  }, []);

  useEffect(() => {
    const cells = Array.from(netRef.current.cells.values());
    for (const cell of cells) {
      getProfileForCell(cell);
    }
  }, [tick]);

  useEffect(() => {
    setStats(netRef.current.stats());
  }, [tick]);

  const handleCurveClick = useCallback((f: Cell, t: Cell) => {
    setSelectedCell(null);
    setSelectedUserProfile(null);
    setSelectedCurve({ fromCell: f, toCell: t });
  }, []);

  const handleCellClick = useCallback((cell: Cell) => {
    setSelectedCurve(null);
    // People in cells removed for now — clicking a cell shows nothing.
    // The cell stays visible in the network; no profile panel opens.
    // To re-add people later, restore the lines below:
    // if (cell.isAlive()) {
    //   setSelectedCell(cell);
    //   const profile = getProfileForCell(cell);
    //   setSelectedUserProfile(profile);
    // }
    void cell;
  }, []);

  const handleSendP2PMessage = async (content: string) => {
    if (!content.trim() || !currentChatPeer) return;

    try {
      await p2pClient.sendMessage(currentChatPeer.id, content, 'general');
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message.');
    }
  };

  const handleSendMessageToUser = async (userName: string) => {
    try {
      const peer = await p2pClient.findPeerByName(userName);
      if (peer) {
        setCurrentChatPeer(peer);
        if (acceptedRequestFrom?.id === peer.id) {
          setAcceptedRequestFrom(null);
        }
      } else {
        alert(`User ${userName} is not online. They need to register with that name.`);
      }
    } catch (error) {
      console.error('Error finding peer:', error);
    }
  };

  const handleSendMessageRequest = async (peer: Peer, message: string) => {
    try {
      console.log('📨 Sending message request to:', peer.name, peer.id);

      const peerExists = onlinePeers.some(p => p.id === peer.id);
      if (!peerExists) {
        alert(`User ${peer.name} is not online. They need to be registered first.`);
        return;
      }

      await p2pClient.sendMessageRequest(peer.id, message);
      setPendingRequestFrom(peer);
      alert(`Message request sent to ${peer.name}! They will need to accept before you can chat.`);
    } catch (error) {
      console.error('Error sending request:', error);
      alert(`Failed to send request to ${peer.name}. Make sure the backend is running.`);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const request = messageRequests.find(r => r.id === requestId);
    if (request) {
      setMessageRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, status: 'accepted' } : r
      ));

      const peer = onlinePeers.find(p => p.id === request.from);
      if (peer) {
        setAcceptedRequestFrom(peer);
        setCurrentChatPeer(peer);
        setPendingRequestFrom(null);
        handleAddFriend(peer);
      }

      setShowRequestsPanel(false);
      await p2pClient.acceptMessageRequest(request.from);
    }
  };

  const handleDenyRequest = (requestId: string) => {
    const request = messageRequests.find(r => r.id === requestId);
    if (request) {
      p2pClient.denyMessageRequest(request.from);
      setMessageRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, status: 'denied' } : r
      ));
      setTimeout(() => {
        setMessageRequests(prev => prev.filter(r => r.id !== requestId));
      }, 300);
    }
  };

  const handleConnectByHash = async () => {
    if (!connectHash.trim()) {
      alert('Please enter a hash');
      return;
    }

    try {
      const query = connectHash.trim();

      // 1. Resolve the real DHT Kademlia hash via the backend
      const dhtContact = await dhtClient.findByHash(query);
      if (dhtContact) {
        const peer: Peer = { id: dhtContact.id, name: dhtContact.name, lastSeen: new Date().toISOString() };
        setCurrentChatPeer(peer);
        setShowConnectModal(false);
        setConnectHash('');
        alert(`🔐 Connected to ${dhtContact.name} via DHT!\n\nDHT Hash: ${dhtContact.dhtId}`);
        return;
      }

      // 2. Fallback: match by peer id / name in the live peer list
      const peers = await p2pClient.getPeers();
      const peer = peers.find(p =>
        p.id === query ||
        p.id.includes(query) ||
        query.includes(p.id) ||
        p.name.toLowerCase() === query.toLowerCase()
      );

      if (peer) {
        setCurrentChatPeer(peer);
        setShowConnectModal(false);
        setConnectHash('');
        alert(`Connected to ${peer.name}! Start chatting.`);
      } else {
        alert(`Peer not found. Make sure they are online and you entered the correct DHT hash.\n\nAvailable peers: ${peers.map(p => `${p.name} (${p.id})`).join(', ')}`);
      }
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  const copyMyHash = () => {
    if (myPeerHash) {
      navigator.clipboard.writeText(myPeerHash);
      alert(`Your hash copied!\n\nHash: ${myPeerHash}\n\nShare this with others to connect to you.`);
    }
  };

  const copyPeerHash = (hash: string, name: string) => {
    navigator.clipboard.writeText(hash);
    alert(`Hash for ${name} copied!\n\nHash: ${hash}\n\nShare this with others to connect to ${name}.`);
  };

  const handleAddConnectedPeer = useCallback((peer: Peer) => {
    setConnectedPeers(prev => {
      if (!prev.some(p => p.id === peer.id)) {
        console.log('✅ Added connected peer:', peer.name);
        return [...prev, peer];
      }
      return prev;
    });
    handleAddFriend(peer);
  }, []);

  const handleAddFriend = useCallback((peer: Peer) => {
    setFriends(prev => {
      if (!prev.some(p => p.id === peer.id)) {
        console.log('👥 Added friend:', peer.name);
        const updatedFriends = [...prev, peer];
        localStorage.setItem('kando_friends', JSON.stringify(updatedFriends.map(f => ({ id: f.id, name: f.name }))));
        return updatedFriends;
      }
      return prev;
    });
  }, []);

  const handleRemoveFriend = useCallback((friendId: string) => {
    setFriends(prev => {
      const updatedFriends = prev.filter(f => f.id !== friendId);
      localStorage.setItem('kando_friends', JSON.stringify(updatedFriends.map(f => ({ id: f.id, name: f.name }))));
      return updatedFriends;
    });
  }, []);

  const handleLogout = async () => {
    await authLogout();
    clearSession();
    p2pClient.disconnect();
    setMyIdentity('');
    setMyPeerId(null);
    setMyPeerHash(null);
    setAccount(null);
    setActiveTab('kando');
  };

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!authReady) {
    return <main className="min-h-[100dvh] flex items-center justify-center bg-[#0a0a0f] text-3xl">🐝</main>;
  }
  if (!account) {
    return <AuthScreen onAuthed={setAccount} />;
  }

  // ── Onboarding-task progress, derived live from the hive ──────────────────
  // The queen's 6 neighbour cells (axial coords around the genesis cell).
  const QUEEN_NEIGHBORS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const neighborMember = (q: number, r: number) =>
    members.find((m) => m.hasCell && m.cellQ === q && m.cellR === r);
  const neighborsInvited = QUEEN_NEIGHBORS.filter(
    ([q, r]) => neighborMember(q, r) || invites.some((i) => i.cellQ === q && i.cellR === r),
  ).length;
  const neighborsApproved = QUEEN_NEIGHBORS.filter(([q, r]) => {
    const m = neighborMember(q, r);
    return m && (m.status === 'candidate' || m.status === 'citizen');
  }).length;
  const myHasCell = isQueen || !!members.find((m) => m.id === myPeerId)?.hasCell;

  return (
    <main className="w-full h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] overflow-hidden relative">
      <Navbar solid />
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--jade)]/5 via-transparent to-[var(--jade)]/5 animate-pulse-slow pointer-events-none hidden md:block" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--jade)]/10 rounded-full blur-3xl animate-float pointer-events-none hidden md:block" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--jade)]/10 rounded-full blur-3xl animate-float-delayed pointer-events-none hidden md:block" />

      <Scene2D ref={sceneRef} network={netRef.current} onCellClick={handleCellClick} />

      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-0 left-0 right-0 h-16 md:h-32 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-16 md:h-32 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
      </div>

      {/* Mobile Header */}
      <header className="absolute top-16 md:top-20 left-0 right-0 z-20 pointer-events-auto">
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-3">
          <div />

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
          >
            <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setShowRequestsPanel(true)}
              className="relative p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 group"
            >
              <svg className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {messageRequests.filter(r => r.status === 'pending').length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold shadow-lg">
                  {messageRequests.filter(r => r.status === 'pending').length}
                </div>
              )}
            </button>

            {myPeerHash && (
              <button
                onClick={copyMyHash}
                className="px-2 py-1 text-[9px] font-mono rounded-lg bg-white/5 hover:bg-white/10 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                🔑 {myPeerHash.slice(0, 10)}...
              </button>
            )}

            <button
              onClick={() => setShowConnectModal(true)}
              className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white hover:opacity-90 transition-all shadow-md shadow-[var(--jade)]/20"
            >
              🔗 Connect
            </button>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' :
                backendStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
              }`} />
              <span className="text-[9px] text-[var(--text-muted)] hidden sm:inline">
                {backendStatus === 'online' ? 'P2P Active' :
                 backendStatus === 'offline' ? 'Offline' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && isMobile && (
          <div className="absolute top-full left-0 right-0 bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-b border-white/10 p-4 flex flex-col gap-3 animate-slideDown z-30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Your Hash</span>
              <button
                onClick={copyMyHash}
                className="px-2 py-1 text-[9px] font-mono rounded-lg bg-white/5 text-[var(--text-secondary)]"
              >
                {myPeerHash?.slice(0, 12)}...
              </button>
            </div>
            <button
              onClick={() => {
                setShowRequestsPanel(true);
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-between p-2 rounded-lg bg-white/5"
            >
              <span className="text-sm text-[var(--text-primary)]">Message Requests</span>
              {messageRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                  {messageRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setShowConnectModal(true);
                setMobileMenuOpen(false);
              }}
              className="p-2 rounded-lg bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white text-sm font-medium"
            >
              🔗 Connect to Peer
            </button>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <span className="text-sm text-[var(--text-primary)]">P2P Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' :
                  backendStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
                }`} />
                <span className="text-xs text-[var(--text-muted)]">
                  {backendStatus === 'online' ? 'Connected' :
                   backendStatus === 'offline' ? 'Offline' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Stats Panel - Responsive (hive tab only) */}
      {activeTab === 'kando' && (
        <div className="absolute top-32 md:top-44 left-0 right-0 z-20 pointer-events-auto animate-fadeIn px-2 md:px-0" style={{ animationDelay: '0.15s' }}>
          <div className="flex justify-center">
            <div className="glass-modern px-2 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl flex gap-1 md:gap-2 overflow-x-auto scrollbar-hide max-w-[calc(100vw-1rem)] md:max-w-none">
              {[
                { label: 'MEMBERS', value: stats.alive, color: 'text-[var(--jade)]' },
                { label: 'CIT', value: stats.citizens, color: 'text-emerald-400' },
                { label: 'CAND', value: stats.candidates, color: 'text-sky-400' },
                { label: 'RES', value: stats.reserved, color: 'text-red-400' },
                { label: 'INVITES', value: invites.length, color: 'text-amber-400' },
                { label: 'RING', value: stats.maxRing, color: 'text-purple-400' }
              ].map((stat) => (
                <div key={stat.label} className="stat-card-modern px-1.5 md:px-3 py-1 md:py-1.5 text-center min-w-[40px] md:min-w-[60px]">
                  <div className="text-[7px] md:text-[8px] font-semibold text-[var(--text-muted)] tracking-wider uppercase">{stat.label}</div>
                  <div className={`text-[10px] md:text-sm font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab content overlay — Chats / Tasks / Account render above the hive.
          The 'kando' tab shows the live Scene2D hive underneath (no overlay). */}
      {activeTab !== 'kando' && (
        <div className="absolute inset-0 z-30 overflow-y-auto custom-scrollbar bg-[#0a0a0f]/92 backdrop-blur-xl pointer-events-auto animate-fadeIn">
          <div className="min-h-full px-4 md:px-6 pt-24 md:pt-28 pb-32">
            {activeTab === 'chats' && (
              <ChatsView
                friends={friends}
                onlinePeers={onlinePeers}
                currentChatPeer={currentChatPeer}
                onSelectPeer={(peer) => setCurrentChatPeer(peer)}
                onRemoveFriend={handleRemoveFriend}
                onConnect={() => setShowConnectModal(true)}
              />
            )}
            {activeTab === 'tasks' && (
              <TasksView
                isQueen={isQueen}
                neighborsInvited={neighborsInvited}
                neighborsApproved={neighborsApproved}
                friendCount={friends.length}
                hasCell={myHasCell}
                onGoTo={setActiveTab}
              />
            )}
            {activeTab === 'account' && (
              <AccountView
                identity={myIdentity || account.name}
                email={account.email}
                myPeerHash={myPeerHash}
                isQueen={isQueen}
                backendStatus={backendStatus}
                stats={stats}
                friendCount={friends.length}
                onCopyHash={copyMyHash}
                onLogout={handleLogout}
              />
            )}
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-4">
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 md:p-6 w-[90%] md:w-96 border border-white/10 shadow-2xl">
            <h3 className="text-lg md:text-xl font-bold text-[var(--text-primary)] mb-2">Connect to Peer</h3>
            <p className="text-xs md:text-sm text-[var(--text-muted)] mb-4 md:mb-5">Enter the hash of the person you want to chat with:</p>
            <input
              type="text"
              value={connectHash}
              onChange={(e) => setConnectHash(e.target.value)}
              placeholder="e.g., Ali-kando-peer"
              className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--jade)] transition-all text-sm mb-4 md:mb-5"
              onKeyPress={(e) => e.key === 'Enter' && handleConnectByHash()}
            />
            <div className="text-xs text-[var(--text-muted)] mb-4 md:mb-5 p-3 rounded-xl bg-white/5">
              <p className="font-semibold mb-2">How to get a hash:</p>
              <p className="text-[9px] md:text-[10px]">1. Click on any green cell (citizen)</p>
              <p className="text-[9px] md:text-[10px]">2. Copy their DHT hash from the profile</p>
              <p className="text-[9px] md:text-[10px]">3. Paste it here to connect</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleConnectByHash} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white font-medium hover:opacity-90 transition-all">Connect</button>
              <button onClick={() => setShowConnectModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Message Requests Panel */}
      {showRequestsPanel && (
        <MessageRequests
          requests={messageRequests}
          onAccept={handleAcceptRequest}
          onDeny={handleDenyRequest}
          onClose={() => setShowRequestsPanel(false)}
        />
      )}

      {/* Chat Panel */}
      {currentChatPeer && backendStatus === 'online' && (
        <ChatPanel
          peer={currentChatPeer}
          myPeerId={myPeerId}
          messages={receivedMessages}
          onSendMessage={handleSendP2PMessage}
          onClose={() => {
            setCurrentChatPeer(null);
            setPendingRequestFrom(null);
            setAcceptedRequestFrom(null);
          }}
          onSendRequest={handleSendMessageRequest}
          isRequestPending={pendingRequestFrom?.id === currentChatPeer?.id}
          isRequestAccepted={acceptedRequestFrom?.id === currentChatPeer?.id}
          onAddConnectedPeer={handleAddConnectedPeer}
          connectedPeers={connectedPeers}
          onAddFriend={handleAddFriend}
          isMobile={isMobile}
        />
      )}

      {/* Profile Panel */}
      {selectedCell && selectedUserProfile && (
        <ProfilePanel
          profile={selectedUserProfile}
          cellCoord={selectedCell.coord}
          cellStatus={selectedCell.status}
          onClose={() => { setSelectedCell(null); setSelectedUserProfile(null); }}
          onSendMessage={handleSendMessageToUser}
          backendStatus={backendStatus}
          onCopyHash={copyPeerHash}
          isMobile={isMobile}
        />
      )}

      {/* Curve Selection Panel */}
      {selectedCurve && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:absolute md:top-20 md:bottom-20 md:right-4 md:left-auto md:w-80 md:bg-transparent md:p-0">
          <div className="w-full glass-modern rounded-2xl overflow-hidden flex flex-col max-h-[80vh] md:max-h-full">
            <div className="px-4 py-3.5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-wider uppercase">CONNECTION</span>
                </div>
                <button onClick={() => setSelectedCurve(null)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {[{ label: 'FROM', cell: selectedCurve.fromCell }, { label: 'TO', cell: selectedCurve.toCell }].map(({ label, cell }) => {
                const profile = getProfileForCell(cell);
                return (
                  <div key={label} className="mb-4">
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase mb-2 px-1">{label}</div>
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 font-mono text-xs font-semibold text-[var(--jade)]">{cell.coord.q},{cell.coord.r}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Ring {cell.coord.ring()}</span>
                    </div>
                    {profile && (
                      <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-lg">
                          {profile.avatar}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[var(--text-primary)]">{profile.name}</div>
                          <div className="text-[10px] font-mono text-[var(--text-muted)]">{profile.peerHash}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-white/10">
              <button onClick={() => setSelectedCurve(null)} className="w-full py-2 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-xl hover:bg-white/5">Close Panel</button>
            </div>
          </div>
        </div>
      )}

      {/* Queen's Invite Panel — send invite links for the 6 neighbour cells */}
      {isQueen && activeTab === 'kando' && (
        <div className={`z-20 pointer-events-auto animate-fadeIn ${
          isMobile ? 'absolute top-32 left-2 right-2' : 'absolute top-36 left-4'
        }`} style={{ animationDelay: '0.2s' }}>
          <InvitePanel
            members={members}
            invites={invites}
            onCreateInvite={handleCreateInvite}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* 4-tab bottom navigation — Account · Chats · Kando · Tasks */}
      <AppNav
        active={activeTab}
        onChange={setActiveTab}
        badge={{ chats: messageRequests.filter((r) => r.status === 'pending').length }}
      />
    </main>
  );
}
