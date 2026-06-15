// Frontend client for the Go account-auth API (email + password, with a
// security-question reset). The bearer token + account are cached in
// localStorage so a reload restores the session.

import { NODE_HTTP } from '@/lib/node-config';

const BASE_URL = NODE_HTTP;
const TOKEN_KEY = 'kando_auth_token';
const ACCOUNT_KEY = 'kando_auth_account';

export interface Account {
  name: string;
  email: string;
  securityQuestion?: string;
}

const isBrowser = () => typeof window !== 'undefined';

interface AuthResponse {
  token: string;
  account: Account;
}

async function post(path: string, body: unknown): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Something went wrong.');
  return data as AuthResponse;
}

function store(token: string, account: Account) {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

export function getStoredToken(): string | null {
  return isBrowser() ? localStorage.getItem(TOKEN_KEY) : null;
}

export function getStoredAccount(): Account | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
}): Promise<Account> {
  const { token, account } = await post('/api/auth/register', input);
  store(token, account);
  return account;
}

export async function login(input: { email: string; password: string }): Promise<Account> {
  const { token, account } = await post('/api/auth/login', input);
  store(token, account);
  return account;
}

/**
 * Join the public waitlist. This grants NO access and issues no session —
 * entry to the hive is by invite code only. It simply records the email.
 */
export async function joinWaitlist(input: {
  email: string;
  name?: string;
}): Promise<{ status: string; position?: number; message?: string }> {
  const res = await fetch(`${BASE_URL}/api/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || 'Something went wrong.');
  return data as { status: string; position?: number; message?: string };
}

/** Look up the security question shown during password reset. */
export async function getSecurityQuestion(email: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/security-question?email=${encodeURIComponent(email)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No account found for this email.');
  return data.securityQuestion as string;
}

export async function resetPassword(input: {
  email: string;
  securityAnswer: string;
  newPassword: string;
}): Promise<Account> {
  const { token, account } = await post('/api/auth/reset', input);
  store(token, account);
  return account;
}

export async function logout(): Promise<void> {
  const token = getStoredToken();
  clearSession();
  if (!token) return;
  try {
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // best effort — local session is already cleared
  }
}

/** Validate the cached token against the backend; returns the account or null. */
export async function fetchMe(): Promise<Account | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.account as Account;
  } catch {
    return null;
  }
}
