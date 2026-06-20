// lib/cell-client.ts
// Client for the key-based cell identity model. The PRIVATE key lives only in
// this browser (localStorage); only the public key, signatures, and opaque
// ciphertext ever reach the backend. P-256 throughout, interoperable with the
// Go backend (ECDSA raw r||s over SHA-256; ECDH + AES-GCM for profiles).

import { NODE_HTTP } from '@/lib/node-config';

const BASE = NODE_HTTP;
const PRIV_KEY = 'kando_cell_priv';      // base64(JSON JWK) — the secret, never sent
const PROFILE_KEY = 'kando_cell_profile'; // local-only profile (name)

export interface Neighbour {
  q: number;
  r: number;
  occupied: boolean;
  pubKey?: string;
  status?: string;
  approved?: boolean; // has this neighbour approved ME?
  approvals?: number; // how many of THEIR 6 neighbours approved them (x/6)
}
export interface CellState {
  publicKey: string;
  q: number;
  r: number;
  status: string; // reserved | candidate | citizen
  neighbours: Neighbour[];
}
export interface Profile {
  firstName: string;
  lastName: string;
}

const isBrowser = () => typeof window !== 'undefined';
const enc = new TextEncoder();
const dec = new TextDecoder();

// ── base64 helpers ──────────────────────────────────────────────────────────
function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(b: Uint8Array): string {
  let s = '';
  b.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s);
}
function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return b64ToBytes(s);
}

function jwkFromBlob(blob: string): JsonWebKey {
  return JSON.parse(dec.decode(b64ToBytes(blob)));
}

// publicKeyFromBlob derives the base64 uncompressed-point identity from the
// stored private JWK (0x04 || X || Y) without any network call.
export function publicKeyFromBlob(blob: string): string {
  const jwk = jwkFromBlob(blob);
  const x = b64urlToBytes(jwk.x!);
  const y = b64urlToBytes(jwk.y!);
  const pt = new Uint8Array(65);
  pt[0] = 4;
  pt.set(x, 1);
  pt.set(y, 33);
  return bytesToB64(pt);
}

// ── signing (ECDSA P-256, raw r||s, matches Go verifySig) ─────────────────────
async function importSigner(blob: string): Promise<CryptoKey> {
  const j = jwkFromBlob(blob);
  return crypto.subtle.importKey(
    'jwk',
    { kty: j.kty, crv: j.crv, x: j.x, y: j.y, d: j.d },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}
export async function sign(blob: string, msg: string): Promise<string> {
  const key = await importSigner(blob);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(msg));
  return bytesToB64(new Uint8Array(sig));
}

// ── ECDH + AES-GCM (encrypt a profile to a neighbour) ─────────────────────────
async function importECDHPriv(blob: string): Promise<CryptoKey> {
  const j = jwkFromBlob(blob);
  return crypto.subtle.importKey(
    'jwk',
    { kty: j.kty, crv: j.crv, x: j.x, y: j.y, d: j.d },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );
}
async function importECDHPub(pubB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', b64ToBytes(pubB64), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
}
async function sharedKey(blob: string, peerPubB64: string): Promise<CryptoKey> {
  const bits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: await importECDHPub(peerPubB64) },
    await importECDHPriv(blob),
    256,
  );
  return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
export async function encryptProfile(blob: string, toPubB64: string, profile: Profile): Promise<string> {
  const key = await sharedKey(blob, toPubB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(profile))),
  );
  const out = new Uint8Array(12 + ct.length);
  out.set(iv, 0);
  out.set(ct, 12);
  return bytesToB64(out);
}
export async function decryptProfile(blob: string, fromPubB64: string, ciphertext: string): Promise<Profile> {
  const key = await sharedKey(blob, fromPubB64);
  const data = b64ToBytes(ciphertext);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(0, 12) }, key, data.slice(12));
  return JSON.parse(dec.decode(pt));
}

// ── local storage (key + profile stay on the device) ─────────────────────────
export function storeKeyBlob(blob: string) {
  if (isBrowser()) localStorage.setItem(PRIV_KEY, blob);
}
export function getStoredKeyBlob(): string | null {
  return isBrowser() ? localStorage.getItem(PRIV_KEY) : null;
}
export function clearCellSession() {
  if (!isBrowser()) return;
  localStorage.removeItem(PRIV_KEY);
  localStorage.removeItem(PROFILE_KEY);
}
export function storeProfile(p: Profile) {
  if (isBrowser()) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}
export function getProfile(): Profile | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Invited-neighbour keys: when you invite a neighbour, their one-time private
// key is remembered on THIS device (keyed by coordinate) so you can re-copy it
// later if the hand-off dialog was closed before you saved it.
const INVITED_PREFIX = 'kando_invited_';
export function storeInvitedKey(q: number, r: number, blob: string) {
  if (isBrowser()) localStorage.setItem(`${INVITED_PREFIX}${q}_${r}`, blob);
}
export function getInvitedKey(q: number, r: number): string | null {
  return isBrowser() ? localStorage.getItem(`${INVITED_PREFIX}${q}_${r}`) : null;
}

// ── API ───────────────────────────────────────────────────────────────────────
async function readError(res: Response): Promise<string> {
  const d = await res.json().catch(() => ({}));
  return (d as { error?: string })?.error || 'Something went wrong.';
}

/** Issuer mints the queen at (0,0). Returns the queen's keypair ONCE. */
export async function mintQueen(issuerToken: string): Promise<{ publicKey: string; privateKey: string }> {
  const res = await fetch(`${BASE}/api/cell/mint-queen`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + issuerToken },
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Look up a cell by its public key. Returns null if no such cell (→ waitlist). */
export async function cellLogin(publicKey: string): Promise<CellState | null> {
  const res = await fetch(`${BASE}/api/cell/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey }),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Invite (mint) a neighbour at an adjacent coord. Returns the new keypair. */
export async function inviteNeighbour(
  blob: string,
  q: number,
  r: number,
): Promise<{ publicKey: string; privateKey: string }> {
  const inviter = publicKeyFromBlob(blob);
  const sig = await sign(blob, `kando-invite:${q},${r}`);
  const res = await fetch(`${BASE}/api/cell/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviter, q, r, sig }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Regenerate a lost neighbour key (only works while they're still reserved). */
export async function reinviteNeighbour(
  blob: string,
  q: number,
  r: number,
): Promise<{ publicKey: string; privateKey: string }> {
  const inviter = publicKeyFromBlob(blob);
  const sig = await sign(blob, `kando-reinvite:${q},${r}`);
  const res = await fetch(`${BASE}/api/cell/reinvite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviter, q, r, sig }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Approve a neighbour's identity (sign their pubkey). */
export async function approveNeighbour(
  blob: string,
  targetPub: string,
): Promise<{ status: string; approvals: number }> {
  const approver = publicKeyFromBlob(blob);
  const sig = await sign(blob, `kando-approve:${targetPub}`);
  const res = await fetch(`${BASE}/api/cell/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approver, target: targetPub, sig }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Send my encrypted profile to a neighbour for verification. */
export async function sendProfile(blob: string, toPub: string, profile: Profile): Promise<void> {
  const from = publicKeyFromBlob(blob);
  const ciphertext = await encryptProfile(blob, toPub, profile);
  const sig = await sign(blob, `kando-profile:${toPub}`);
  const res = await fetch(`${BASE}/api/cell/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: toPub, ciphertext, sig }),
  });
  if (!res.ok) throw new Error(await readError(res));
}

/** Fetch encrypted profiles addressed to me (decrypt locally). */
export async function fetchProfiles(pubKey: string): Promise<{ from: string; ciphertext: string }[]> {
  const res = await fetch(`${BASE}/api/cell/profiles?pubKey=${encodeURIComponent(pubKey)}`);
  if (!res.ok) return [];
  const d = await res.json();
  return d.envelopes || [];
}

/** Publish my PUBLIC display name (signed) so others see it when they click my cell. */
export async function setPublicProfile(blob: string, name: string): Promise<void> {
  const pub = publicKeyFromBlob(blob);
  const sig = await sign(blob, `kando-pubprofile:${name}`);
  await fetch(`${BASE}/api/cell/set-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pub, name, sig }),
  });
}

/** Get a cell's public display name (empty string if none). */
export async function getPublicProfile(pubKey: string): Promise<string> {
  const res = await fetch(`${BASE}/api/cell/get-profile?pubKey=${encodeURIComponent(pubKey)}`);
  if (!res.ok) return '';
  const d = await res.json();
  return d.name || '';
}

// ── 1-to-1 end-to-end-encrypted chat ─────────────────────────────────────────
export interface ChatMessage {
  from: string;
  text: string;
  at: string;
  mine: boolean;
}

async function encryptText(blob: string, peerPubB64: string, text: string): Promise<string> {
  const key = await sharedKey(blob, peerPubB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text)));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv, 0);
  out.set(ct, 12);
  return bytesToB64(out);
}
async function decryptText(blob: string, peerPubB64: string, ciphertext: string): Promise<string> {
  const key = await sharedKey(blob, peerPubB64);
  const data = b64ToBytes(ciphertext);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(0, 12) }, key, data.slice(12));
  return dec.decode(pt);
}

/** Send an end-to-end-encrypted message to another cell. */
export async function sendMessage(blob: string, toPub: string, text: string): Promise<void> {
  const from = publicKeyFromBlob(blob);
  const ct = await encryptText(blob, toPub, text);
  const sig = await sign(blob, `kando-msg:${toPub}`);
  await fetch(`${BASE}/api/cell/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: toPub, ct, sig }),
  });
}

/** Fetch + decrypt the 1-to-1 conversation with a peer cell. */
export async function fetchMessages(blob: string, peerPub: string): Promise<ChatMessage[]> {
  const me = publicKeyFromBlob(blob);
  const res = await fetch(
    `${BASE}/api/cell/messages?me=${encodeURIComponent(me)}&peer=${encodeURIComponent(peerPub)}`,
  );
  if (!res.ok) return [];
  const d = await res.json();
  const raw: { from: string; ct: string; at: string }[] = d.messages || [];
  const out: ChatMessage[] = [];
  for (const m of raw) {
    try {
      out.push({ from: m.from, text: await decryptText(blob, peerPub, m.ct), at: m.at, mine: m.from === me });
    } catch {
      /* skip undecryptable */
    }
  }
  return out;
}
