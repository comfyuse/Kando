// Client-side account store for the KANDO app.
//
// The Go backend has no email/password accounts (it identifies peers by a DHT
// keypair), so sessions live in the browser. Passwords are never stored in
// plaintext — we keep a per-account salted SHA-256 hash. This is demo-grade
// auth meant to drive the UI, not a substitute for a real auth server.

import { Account } from '../types';

const ACCOUNTS_KEY = 'kando.accounts';
const SESSION_KEY = 'kando.session';

interface StoredAccount extends Account {
  salt: string;
  passwordHash: string;
}

const isBrowser = () => typeof window !== 'undefined';

function readAccounts(): StoredAccount[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function strip(a: StoredAccount): Account {
  return { id: a.id, name: a.name, email: a.email, status: a.status, createdAt: a.createdAt };
}

// --- Reactive session store (consumed via useSyncExternalStore) -------------
// getCurrentAccount() returns a fresh object each call, so we cache it and only
// swap the reference when something actually changes — that keeps snapshots
// stable between renders and lets React skip needless re-renders.

const listeners = new Set<() => void>();
let snapshot: Account | null | undefined; // undefined = not yet read this session

function emit() {
  snapshot = getCurrentAccount();
  listeners.forEach((l) => l());
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAccountSnapshot(): Account | null {
  if (snapshot === undefined) snapshot = getCurrentAccount();
  return snapshot;
}

/** Server render has no session — always signed out. */
export function getServerAccountSnapshot(): Account | null {
  return null;
}

function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Create an account and start a session. Throws on validation/conflict. */
export async function signup(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Account> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (name.length < 2) throw new Error('Name must be at least 2 characters.');
  if (!isValidEmail(email)) throw new Error('Please enter a valid email address.');
  if (input.password.length < 6) throw new Error('Password must be at least 6 characters.');

  const accounts = readAccounts();
  if (accounts.some((a) => a.email === email)) {
    throw new Error('An account with this email already exists.');
  }

  const salt = randomHex();
  const account: StoredAccount = {
    id: randomHex(8),
    name,
    email,
    status: 'New to the hive 🐝',
    createdAt: Date.now(),
    salt,
    passwordHash: await hashPassword(input.password, salt),
  };

  writeAccounts([...accounts, account]);
  localStorage.setItem(SESSION_KEY, account.id);
  emit();
  return strip(account);
}

/** Validate credentials and start a session. Throws on mismatch. */
export async function login(input: { email: string; password: string }): Promise<Account> {
  const email = input.email.trim().toLowerCase();
  const account = readAccounts().find((a) => a.email === email);
  if (!account) throw new Error('No account found for this email.');

  const hash = await hashPassword(input.password, account.salt);
  if (hash !== account.passwordHash) throw new Error('Incorrect password.');

  localStorage.setItem(SESSION_KEY, account.id);
  emit();
  return strip(account);
}

export function logout() {
  if (isBrowser()) localStorage.removeItem(SESSION_KEY);
  emit();
}

/** The currently signed-in account, or null. */
export function getCurrentAccount(): Account | null {
  if (!isBrowser()) return null;
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const account = readAccounts().find((a) => a.id === id);
  return account ? strip(account) : null;
}

/** Persist editable profile fields (name, status) for the signed-in account. */
export function updateAccount(id: string, patch: Partial<Pick<Account, 'name' | 'status'>>): Account | null {
  const accounts = readAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  accounts[idx] = { ...accounts[idx], ...patch };
  writeAccounts(accounts);
  emit();
  return strip(accounts[idx]);
}
