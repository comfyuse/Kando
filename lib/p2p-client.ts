// app/lib/p2p-client.ts

export interface Peer {
  id: string;
  name: string;
  address?: string;
  lastSeen: string;
}

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  room: string;
}

export interface MessageRequest {
  type: string;
  from: string;
  fromName: string;
  to: string;
  message: string;
  timestamp: Date;
}

interface RegisterResponse {
  peerId: string;
  name: string;
  status: string;
}

class P2PClient {
  private ws: WebSocket | null = null;
  private peerId: string | null = null;
  private peerName: string | null = null;
  private messageHandlers: ((msg: ChatMessage) => void)[] = [];
  private requestHandlers: ((request: MessageRequest) => void)[] = [];
  private peerHandlers: ((peers: Peer[]) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pingInterval: NodeJS.Timeout | null = null;
  private baseUrl = 'http://localhost:8080';

  async register(name: string): Promise<RegisterResponse> {
    try {
      console.log('📝 Registering user:', name);
      const response = await fetch(`${this.baseUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error(`Failed to register: ${response.status}`);
      const data = await response.json();
      console.log('✅ Registered successfully:', data);
      this.peerId = data.peerId;
      this.peerName = data.name;
      return data;
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  }

  connect(peerId: string, name: string) {
    this.peerId = peerId;
    this.peerName = name;
    const wsUrl = `ws://localhost:8080/ws?peerId=${peerId}&name=${encodeURIComponent(name)}`;
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'ping' }));
      }, 30000);
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle peer list updates
        if (data.type === 'peer-list') {
          console.log('👥 Received peer list:', data.peers);
          this.peerHandlers.forEach(handler => handler(data.peers));
          return;
        }
        
        // Handle message requests
        if (data.type === 'message_request') {
          console.log('📨 Received message request:', data);
          this.requestHandlers.forEach(handler => handler(data));
          return;
        }
        
        // Handle chat messages
        if (data.content !== undefined || data.from !== undefined) {
          const chatMessage: ChatMessage = {
            id: data.id || Date.now().toString(),
            from: data.from,
            to: data.to,
            content: data.content,
            timestamp: new Date(data.timestamp || Date.now()),
            room: data.room || 'general',
          };
          console.log('💬 Received message:', chatMessage);
          this.messageHandlers.forEach(handler => handler(chatMessage));
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.reconnect();
    };
    
    this.ws.onerror = (error) => console.error('❌ WebSocket error:', error);
  }
  
  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.peerId && this.peerName) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(this.peerId!, this.peerName!), 2000 * this.reconnectAttempts);
    }
  }
  
  async getPeers(): Promise<Peer[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/peers`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Failed to get peers:', error);
      return [];
    }
  }
  
  async getMessages(): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/messages`);
      if (!response.ok) return [];
      const messages = await response.json();
      return messages.map((msg: any) => ({ ...msg, timestamp: new Date(msg.timestamp) }));
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }
  
  async sendMessage(to: string, content: string, room: string = 'general'): Promise<void> {
    if (!this.peerId) throw new Error('Not registered');
    const message = { from: this.peerId, to, content, room };
    console.log('📤 Sending message:', message);
    try {
      const response = await fetch(`${this.baseUrl}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      if (!response.ok) throw new Error(`Failed to send message: ${response.status}`);
      console.log('✅ Message sent');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }
  
  async sendMessageRequest(toPeerId: string, message: string): Promise<void> {
    if (!this.peerId) throw new Error('Not registered');
    if (!this.peerName) throw new Error('No peer name');
    
    const request = {
      type: 'message_request',
      from: this.peerId,
      fromName: this.peerName,
      to: toPeerId,
      message: message,
      timestamp: new Date()
    };
    
    console.log('📤 Sending message request to:', toPeerId);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/send-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);
        throw new Error(`Failed to send request: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Message request sent:', result);
    } catch (error) {
      console.error('❌ Failed to send request:', error);
      throw error;
    }
  }
  
  async acceptMessageRequest(fromPeerId: string): Promise<void> {
    if (!this.peerId) throw new Error('Not registered');
    
    const response = {
      type: 'request_accepted',
      from: this.peerId,
      to: fromPeerId,
      timestamp: new Date()
    };
    
    try {
      await fetch(`${this.baseUrl}/api/accept-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      });
      console.log('✅ Request accepted');
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  }
  
  async denyMessageRequest(fromPeerId: string): Promise<void> {
    if (!this.peerId) throw new Error('Not registered');
    
    const response = {
      type: 'request_denied',
      from: this.peerId,
      to: fromPeerId,
      timestamp: new Date()
    };
    
    try {
      await fetch(`${this.baseUrl}/api/deny-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      });
      console.log('❌ Request denied');
    } catch (error) {
      console.error('Failed to deny request:', error);
    }
  }
  
  async findPeerByName(name: string): Promise<Peer | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/find-peer?name=${encodeURIComponent(name)}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Failed to find peer:', error);
      return null;
    }
  }
  
  async getNodeInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/info`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Failed to get node info:', error);
      return null;
    }
  }
  
  onMessage(handler: (msg: ChatMessage) => void) {
    this.messageHandlers.push(handler);
  }
  
  onMessageRequest(handler: (request: MessageRequest) => void) {
    this.requestHandlers.push(handler);
  }
  
  onPeersUpdate(handler: (peers: Peer[]) => void) {
    this.peerHandlers.push(handler);
  }
  
  getPeerId(): string | null {
    return this.peerId;
  }
  
  getPeerName(): string | null {
    return this.peerName;
  }
  
  disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) { this.ws.close(); this.ws = null; }
  }
}

export const p2pClient = new P2PClient();