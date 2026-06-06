// lib/dht-client.ts
// DHT-aware P2P client with ECDH + AES-GCM end-to-end encryption.

const BASE_URL = 'http://localhost:8080';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DHTContact {
  id: string;        // peerId  e.g. "Ali-cando-peer"
  name: string;
  dhtId: string;     // Kademlia hex node ID — the shareable hash
  publicKey?: string;
  lastSeen?: string;
  address?: string;
}

export interface ChatMessage {
  id: string;
  from: string;      // peerId
  to: string;        // peerId
  content: string;   // plaintext (already decrypted)
  timestamp: Date;
  encrypted: boolean;
  room: string;
}

export interface RegisterResult {
  peerId: string;
  dhtId: string;   // derived from cell (q,r) — the cell IS the identity
  name: string;
  publicKey: string;
  cellQ: number;   // hexagonal coordinate q
  cellR: number;   // hexagonal coordinate r
}

export interface NetworkMember {
  id: string;       // peerId
  name: string;
  dhtId: string;
  publicKey?: string;
  cellQ: number;
  cellR: number;
  address?: string;
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

function b64ToUint8(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function uint8ToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return uint8ToB64(raw);
}

async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    b64ToUint8(b64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
}

async function deriveSharedKey(myPrivate: CryptoKey, theirPublic: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublic },
    myPrivate,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── DHT Client ────────────────────────────────────────────────────────────────

class DHTClient {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;

  // Identity
  private peerId: string | null = null;
  private peerName: string | null = null;
  private dhtId: string | null = null;

  // Crypto
  private keyPair: CryptoKeyPair | null = null;
  private publicKeyB64: string | null = null;
  private sharedKeys = new Map<string, CryptoKey>(); // peerId → AES-GCM key

  // Event handlers
  private messageHandlers: ((msg: ChatMessage) => void)[] = [];
  private peerHandlers: ((peers: DHTContact[]) => void)[] = [];
  private requestHandlers: ((req: any) => void)[] = [];
  private statusHandlers: ((status: 'online' | 'offline' | 'connecting') => void)[] = [];

  // ── Crypto identity ──────────────────────────────────────────────────────

  async initCrypto(): Promise<string> {
    if (this.publicKeyB64) return this.publicKeyB64;

    const storedPriv = localStorage.getItem('kando_priv_key');
    const storedPub  = localStorage.getItem('kando_pub_key');

    if (storedPriv && storedPub) {
      try {
        const privJwk = JSON.parse(storedPriv);
        const privateKey = await crypto.subtle.importKey(
          'jwk', privJwk,
          { name: 'ECDH', namedCurve: 'P-256' },
          true, ['deriveKey', 'deriveBits']
        );
        const publicKey = await importPublicKey(storedPub);
        this.keyPair = { privateKey, publicKey };
        this.publicKeyB64 = storedPub;
        return storedPub;
      } catch {
        // Keys corrupted — regenerate below
      }
    }

    this.keyPair = await generateKeyPair();
    this.publicKeyB64 = await exportPublicKey(this.keyPair.publicKey);

    const privJwk = await crypto.subtle.exportKey('jwk', this.keyPair.privateKey);
    localStorage.setItem('kando_priv_key', JSON.stringify(privJwk));
    localStorage.setItem('kando_pub_key', this.publicKeyB64);

    return this.publicKeyB64;
  }

  // ── Registration ─────────────────────────────────────────────────────────

  async register(name: string): Promise<RegisterResult> {
    const publicKey = await this.initCrypto();

    const res = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, publicKey }),
    });
    if (!res.ok) throw new Error('Registration failed');

    const data = await res.json();
    this.peerId   = data.peerId;
    this.peerName = name;
    this.dhtId    = data.dhtId;

    return {
      peerId: data.peerId,
      dhtId: data.dhtId,
      name,
      publicKey,
      cellQ: data.cellQ ?? 0,
      cellR: data.cellR ?? 0,
    };
  }

  // ── WebSocket connection ──────────────────────────────────────────────────

  connect(peerId: string, name: string) {
    this.peerId   = peerId;
    this.peerName = name;

    const url = `ws://localhost:8080/ws?peerId=${encodeURIComponent(peerId)}&name=${encodeURIComponent(name)}`;
    this.ws = new WebSocket(url);

    this.statusHandlers.forEach(h => h('connecting'));

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.statusHandlers.forEach(h => h('online'));
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30_000);
    };

    this.ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'peer-list') {
          const contacts: DHTContact[] = (data.peers || []).map((p: any) => ({
            id:        p.id,
            name:      p.name,
            dhtId:     p.dhtId || '',
            publicKey: p.publicKey,
            lastSeen:  p.lastSeen,
          }));
          this.peerHandlers.forEach(h => h(contacts));
          return;
        }

        if (data.type === 'message_request') {
          this.requestHandlers.forEach(h => h(data));
          return;
        }

        if (data.from !== undefined && data.content !== undefined) {
          let content = data.content;
          let encrypted = false;

          // Try to decrypt if it looks like an encrypted payload
          if (data.iv && data.ciphertext) {
            const plain = await this.decrypt(data.ciphertext, data.iv, data.from);
            if (plain !== null) { content = plain; encrypted = true; }
          }

          const msg: ChatMessage = {
            id:        data.id || Date.now().toString(),
            from:      data.from,
            to:        data.to,
            content,
            timestamp: new Date(data.timestamp || Date.now()),
            encrypted,
            room:      data.room || 'general',
          };
          this.messageHandlers.forEach(h => h(msg));
        }
      } catch { /* ignore parse errors */ }
    };

    this.ws.onclose = () => {
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.statusHandlers.forEach(h => h('offline'));
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.statusHandlers.forEach(h => h('offline'));
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= 5 || !this.peerId || !this.peerName) return;
    this.reconnectAttempts++;
    setTimeout(() => this.connect(this.peerId!, this.peerName!), 2_000 * this.reconnectAttempts);
  }

  disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) { this.ws.close(); this.ws = null; }
  }

  // ── E2E encryption ────────────────────────────────────────────────────────

  private async fetchPeerPublicKey(peerId: string): Promise<string | null> {
    // First try local peer list, then backend DHT lookup.
    try {
      const res = await fetch(`${BASE_URL}/api/find-peer?name=${encodeURIComponent(peerId.replace('-cando-peer', ''))}`);
      if (res.ok) {
        const peer = await res.json();
        if (peer.publicKey) return peer.publicKey;
      }
    } catch { /* ignore */ }

    try {
      const res = await fetch(`${BASE_URL}/api/dht/lookup?key=pubkey:${peerId}`);
      if (res.ok) {
        const data = await res.json();
        return data.value || null;
      }
    } catch { /* ignore */ }

    return null;
  }

  private async getSharedKey(peerId: string): Promise<CryptoKey | null> {
    if (this.sharedKeys.has(peerId)) return this.sharedKeys.get(peerId)!;
    if (!this.keyPair) return null;

    const pubKeyB64 = await this.fetchPeerPublicKey(peerId);
    if (!pubKeyB64) return null;

    try {
      const theirPublic = await importPublicKey(pubKeyB64);
      const shared = await deriveSharedKey(this.keyPair.privateKey, theirPublic);
      this.sharedKeys.set(peerId, shared);
      return shared;
    } catch {
      return null;
    }
  }

  async canEncrypt(peerId: string): Promise<boolean> {
    return (await this.getSharedKey(peerId)) !== null;
  }

  private async encrypt(plaintext: string, toPeerId: string): Promise<{ ciphertext: string; iv: string } | null> {
    const key = await this.getSharedKey(toPeerId);
    if (!key) return null;

    const ivRaw = new ArrayBuffer(12);
    crypto.getRandomValues(new Uint8Array(ivRaw));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ivRaw },
      key,
      new TextEncoder().encode(plaintext)
    );

    return { ciphertext: uint8ToB64(encrypted), iv: uint8ToB64(ivRaw) };
  }

  private async decrypt(ciphertext: string, ivB64: string, fromPeerId: string): Promise<string | null> {
    const key = await this.getSharedKey(fromPeerId);
    if (!key) return null;

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToUint8(ivB64) },
        key,
        b64ToUint8(ciphertext)
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      return null;
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────

  async sendMessage(to: string, content: string, room = 'general'): Promise<void> {
    if (!this.peerId) throw new Error('Not registered');

    const base = { from: this.peerId, to, room };
    const enc = await this.encrypt(content, to);

    const payload = enc
      ? { ...base, content: '🔐 encrypted', ciphertext: enc.ciphertext, iv: enc.iv }
      : { ...base, content };

    const res = await fetch(`${BASE_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Send failed');
  }

  // ── Peer discovery ────────────────────────────────────────────────────────

  /** Fetch all registered network members with their hexagonal cell positions. */
  async getMembers(): Promise<NetworkMember[]> {
    try {
      const res = await fetch(`${BASE_URL}/api/members`);
      if (!res.ok) return [];
      const list = await res.json();
      return list.map((p: any) => ({
        id: p.id, name: p.name, dhtId: p.dhtId || '',
        publicKey: p.publicKey, cellQ: p.cellQ ?? 0, cellR: p.cellR ?? 0,
      }));
    } catch { return []; }
  }

  async getPeers(): Promise<DHTContact[]> {
    try {
      const res = await fetch(`${BASE_URL}/api/peers`);
      if (!res.ok) return [];
      const list = await res.json();
      return list.map((p: any) => ({
        id: p.id, name: p.name, dhtId: p.dhtId || '', publicKey: p.publicKey, lastSeen: p.lastSeen,
      }));
    } catch { return []; }
  }

  async getMessages(): Promise<ChatMessage[]> {
    try {
      const res = await fetch(`${BASE_URL}/api/messages`);
      if (!res.ok) return [];
      const list = await res.json();
      return list.map((m: any) => ({
        id: m.id, from: m.from, to: m.to, content: m.content,
        timestamp: new Date(m.timestamp), encrypted: false, room: m.room || 'general',
      }));
    } catch { return []; }
  }

  /** Find a peer by their shareable DHT hash (dhtId). */
  async findByHash(hash: string): Promise<DHTContact | null> {
    const trimmed = hash.trim();

    // Try exact match on local peers first
    try {
      const peers = await this.getPeers();
      const local = peers.find(p => p.dhtId === trimmed);
      if (local) return local;
    } catch { /* ignore */ }

    // Ask backend to resolve the hash
    try {
      const res = await fetch(`${BASE_URL}/api/peer-by-hash?hash=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const p = await res.json();
        return { id: p.id, name: p.name, dhtId: p.dhtId || trimmed, publicKey: p.publicKey };
      }
    } catch { /* ignore */ }

    return null;
  }

  async sendMessageRequest(toPeerId: string, message: string): Promise<void> {
    if (!this.peerId || !this.peerName) throw new Error('Not registered');
    const res = await fetch(`${BASE_URL}/api/send-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message_request', from: this.peerId, fromName: this.peerName,
        to: toPeerId, message, timestamp: new Date(),
      }),
    });
    if (!res.ok) throw new Error('Send request failed');
  }

  async acceptRequest(fromPeerId: string): Promise<void> {
    if (!this.peerId) return;
    await fetch(`${BASE_URL}/api/accept-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'request_accepted', from: this.peerId, to: fromPeerId }),
    });
  }

  async denyRequest(fromPeerId: string): Promise<void> {
    if (!this.peerId) return;
    await fetch(`${BASE_URL}/api/deny-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'request_denied', from: this.peerId, to: fromPeerId }),
    });
  }

  async getNodeInfo(): Promise<any> {
    try {
      const res = await fetch(`${BASE_URL}/api/info`);
      return res.ok ? res.json() : null;
    } catch { return null; }
  }

  // ── Event subscriptions ───────────────────────────────────────────────────

  onMessage(h: (msg: ChatMessage) => void) { this.messageHandlers.push(h); }
  onPeersUpdate(h: (peers: DHTContact[]) => void) { this.peerHandlers.push(h); }
  onMessageRequest(h: (req: any) => void) { this.requestHandlers.push(h); }
  onStatusChange(h: (s: 'online' | 'offline' | 'connecting') => void) { this.statusHandlers.push(h); }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getPeerId()     { return this.peerId; }
  getPeerName()   { return this.peerName; }
  getDhtId()      { return this.dhtId; }
  getPublicKey()  { return this.publicKeyB64; }
}

export const dhtClient = new DHTClient();
