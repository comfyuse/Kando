'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { Network, Cell, AxialCoord } from '@/lib/simulator';
import { p2pClient, ChatMessage as P2PMessage, Peer } from '@/lib/p2p-client';

// Components
import ProfilePanel from './components/ProfilePanel';
import ChatPanel from './components/ChatPanel';
import MessageRequests from './components/MessageRequests';
import FriendsList from './components/FriendsList';

// Data
import { citizenNames, personProfiles, generatePeerHash, UserProfile, MessageRequest } from './data/profiles';

// Import the EXACT Scene2D component from your simulator
const Scene2D = dynamic(() => import('@/components/Scene2D'), { ssr: false });

interface CurveSelection {
  fromCell: Cell;
  toCell: Cell;
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
  
  if (cell.status === 'citizen') {
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
  const netRef = useRef(new Network());
  const [tick, setTick] = useState(0);
  const [stats, setStats] = useState(() => netRef.current.stats());
  const [auto, setAuto] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [selectedCurve, setSelectedCurve] = useState<CurveSelection | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const sceneRef = useRef<{ render: () => void }>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Register user when component mounts
  useEffect(() => {
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
        
        let selectedIdentity = localStorage.getItem('kando_selected_identity');
        
        if (!selectedIdentity) {
          const identityOptions = [...citizenNames, 'KANDO_User'];
          selectedIdentity = prompt(
            `Select your identity for this session:\n\nAvailable: ${identityOptions.join(', ')}\n\nEnter your name:`,
            'KANDO_User'
          );
          if (selectedIdentity && selectedIdentity.trim()) {
            localStorage.setItem('kando_selected_identity', selectedIdentity);
          } else {
            selectedIdentity = 'KANDO_User';
          }
        }
        
        setMyIdentity(selectedIdentity);
        
        const userHash = generatePeerHash(selectedIdentity);
        setMyPeerHash(userHash);
        
        console.log('👤 Registering user:', selectedIdentity, 'Hash:', userHash);
        const registration = await p2pClient.register(selectedIdentity);
        setMyPeerId(registration.peerId);
        setMyPeerName(registration.name);
        
        p2pClient.connect(registration.peerId, registration.name);
        
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
  }, []);

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

  const step = useCallback(() => {
    if (netRef.current.day >= 60) {
      if (auto) {
        setAuto(false);
        if (timer.current) clearInterval(timer.current);
      }
      return;
    }
    
    netRef.current.tick();
    setTick(t => t + 1);
    sceneRef.current?.render();
  }, [auto]);

  const toggleAuto = useCallback(() => {
    if (auto) { 
      if (timer.current) clearInterval(timer.current); 
      setAuto(false); 
    } else { 
      if (netRef.current.day >= 60) return;
      setAuto(true); 
      timer.current = setInterval(() => step(), 200); 
    }
  }, [auto, step]);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const handleCurveClick = useCallback((f: Cell, t: Cell) => { 
    setSelectedCell(null); 
    setSelectedUserProfile(null);
    setSelectedCurve({ fromCell: f, toCell: t }); 
  }, []);
  
  const handleCellClick = useCallback((cell: Cell) => { 
    setSelectedCurve(null); 
    if (cell.isAlive()) {
      setSelectedCell(cell);
      const profile = getProfileForCell(cell);
      setSelectedUserProfile(profile);
    }
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
      const peers = await p2pClient.getPeers();
      const peer = peers.find(p => 
        p.id === connectHash || 
        p.id.includes(connectHash) || 
        connectHash.includes(p.id) ||
        p.name.toLowerCase() === connectHash.toLowerCase()
      );
      
      if (peer) {
        setCurrentChatPeer(peer);
        setShowConnectModal(false);
        setConnectHash('');
        alert(`Connected to ${peer.name}! Start chatting.`);
      } else {
        alert(`Peer not found. Make sure they are online and you entered the correct hash.\n\nAvailable peers: ${peers.map(p => `${p.name} (${p.id})`).join(', ')}`);
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

  const isGrowthStopped = stats.day >= 60;

  return (
    <main className="w-full h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--jade)]/5 via-transparent to-[var(--jade)]/5 animate-pulse-slow pointer-events-none hidden md:block" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--jade)]/10 rounded-full blur-3xl animate-float pointer-events-none hidden md:block" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--jade)]/10 rounded-full blur-3xl animate-float-delayed pointer-events-none hidden md:block" />
      
      <Scene2D ref={sceneRef} network={netRef.current} onCellClick={handleCellClick} onCurveClick={handleCurveClick} />
      
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-0 left-0 right-0 h-16 md:h-32 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-16 md:h-32 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
      </div>
      
      {/* Mobile Header */}
      <header className="absolute top-0 left-0 right-0 z-20 pointer-events-auto">
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-3">
          <div className="flex items-center gap-2 md:gap-2.5 animate-fadeIn">
            <Link href="/" className="relative block transition-transform hover:scale-105 active:scale-95">
              <div className="w-8 h-8 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center shadow-md shadow-[var(--jade)]/20 overflow-hidden">
                <Image 
                  src="/KANDOlogo.png" 
                  alt="KANDO Logo" 
                  width={28} 
                  height={28}
                  className="object-contain rounded-full"
                  loading="eager"
                />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </Link>
            <div className="hidden sm:block">
              <h1 className="text-sm md:text-base font-bold tracking-wider bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">KANDO</h1>
              <p className="text-[7px] md:text-[8px] text-[var(--text-muted)] tracking-wider font-medium">DECENTRALIZED PROTOCOL</p>
            </div>
          </div>
          
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
      
      {/* Stats Panel - Responsive */}
      <div className="absolute top-16 md:top-20 left-0 right-0 z-20 pointer-events-auto animate-fadeIn px-2 md:px-0" style={{ animationDelay: '0.15s' }}>
        <div className="flex justify-center">
          <div className="glass-modern px-2 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl flex gap-1 md:gap-2 overflow-x-auto scrollbar-hide max-w-[calc(100vw-1rem)] md:max-w-none">
            {[
              { label: 'DAY', value: stats.day, color: 'text-[var(--jade)]' },
              { label: 'ALIVE', value: stats.alive, color: 'text-emerald-400' },
              { label: 'CIT', value: stats.citizens, color: 'text-emerald-400' },
              { label: 'CAND', value: stats.candidates, color: 'text-sky-400' },
              { label: 'TEMP', value: stats.temporary, color: 'text-amber-400' },
              { label: 'DEAD', value: stats.dead, color: 'text-red-400' },
              { label: 'RING', value: stats.maxRing, color: 'text-purple-400' },
              { label: 'STATUS', value: isGrowthStopped ? 'STOP' : 'GROW', color: isGrowthStopped ? 'text-red-400' : 'text-emerald-400' }
            ].map((stat) => (
              <div key={stat.label} className="stat-card-modern px-1.5 md:px-3 py-1 md:py-1.5 text-center min-w-[40px] md:min-w-[60px]">
                <div className="text-[7px] md:text-[8px] font-semibold text-[var(--text-muted)] tracking-wider uppercase">{stat.label}</div>
                <div className={`text-[10px] md:text-sm font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connected Peers Section - Mobile Friendly */}
      {connectedPeers.length > 0 && !isMobile && (
        <div className="absolute bottom-24 left-4 z-20 pointer-events-auto">
          <div className="glass-modern p-3 rounded-xl min-w-[200px]">
            <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase mb-2">
              🔗 Connected ({connectedPeers.length})
            </div>
            <div className="flex flex-col gap-1">
              {connectedPeers.slice(0, 3).map(peer => (
                <button
                  key={peer.id}
                  onClick={() => setCurrentChatPeer(peer)}
                  className="px-2 py-1.5 text-xs rounded-lg transition-all text-left w-full bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] flex items-center justify-center text-xs font-bold text-white">
                        {peer.name.charAt(0)}
                      </div>
                      <span className="truncate max-w-[100px]">{peer.name}</span>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                </button>
              ))}
              {connectedPeers.length > 3 && (
                <div className="text-[10px] text-center text-[var(--text-muted)] pt-1">
                  +{connectedPeers.length - 3} more
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Friends Section - Desktop */}
      {!isMobile && (
        <div className="absolute bottom-24 right-4 z-20 pointer-events-auto">
          <FriendsList 
            friends={friends}
            onSelectFriend={(friend) => setCurrentChatPeer(friend)}
            currentChatPeer={currentChatPeer}
            onRemoveFriend={handleRemoveFriend}
          />
        </div>
      )}

      {/* Mobile Friends Bottom Sheet */}
      {isMobile && friends.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl animate-slideUp">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--jade)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-sm font-semibold text-[var(--text-primary)]">Friends</span>
              <span className="text-[10px] text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded-full">
                {friends.length}
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">Tap to chat</div>
          </div>
          <div className="overflow-x-auto whitespace-nowrap p-3 flex gap-2">
            {friends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => {
                  setCurrentChatPeer(friend);
                  setMobileMenuOpen(false);
                }}
                className="flex flex-col items-center gap-1 min-w-[60px]"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--jade)] to-[var(--jade-hover)] flex items-center justify-center text-white font-bold shadow-md">
                    {friend.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-secondary)] animate-pulse" />
                </div>
                <span className="text-[10px] text-[var(--text-primary)] truncate max-w-[60px]">{friend.name}</span>
              </button>
            ))}
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
      
      {/* Control Buttons */}
      <div className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        <div className="glass-modern flex gap-1 md:gap-2 p-1 rounded-xl md:rounded-2xl">
          <button onClick={step} className={`px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-xs font-medium rounded-lg md:rounded-xl transition-all duration-200 ${
            isGrowthStopped 
              ? 'bg-white/5 text-[var(--text-muted)] cursor-not-allowed opacity-50' 
              : 'bg-white/5 hover:bg-white/10 text-[var(--text-primary)] hover:text-[var(--jade)]'
          }`} disabled={isGrowthStopped}>
            STEP
          </button>
          <button onClick={toggleAuto} className={`px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-xs font-medium rounded-lg md:rounded-xl transition-all duration-200 ${
            auto 
              ? 'bg-gradient-to-r from-[var(--jade)] to-[var(--jade-hover)] text-white shadow-lg shadow-[var(--jade)]/20' 
              : 'bg-white/5 hover:bg-white/10 text-[var(--text-primary)]'
          }`}>
            {auto ? 'STOP' : 'AUTO'}
          </button>
          <button onClick={() => window.location.reload()} className="px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-xs font-medium rounded-lg md:rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-primary)] transition-all duration-200">
            RESET
          </button>
        </div>
      </div>
    </main>
  );
}