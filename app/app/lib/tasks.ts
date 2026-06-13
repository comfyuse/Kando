// Per-account task store (localStorage), exposed as a reactive external store
// so components can read it with useSyncExternalStore — no mount effects, no
// hydration mismatch.

import { Task } from '../types';

const keyFor = (accountId: string) => `kando.tasks.${accountId}`;
const isBrowser = () => typeof window !== 'undefined';

const listeners = new Set<() => void>();
const cache = new Map<string, Task[]>();
const EMPTY: Task[] = [];

function readFromStorage(accountId: string): Task[] {
  if (!isBrowser()) return EMPTY;
  try {
    return JSON.parse(localStorage.getItem(keyFor(accountId)) ?? '[]');
  } catch {
    return EMPTY;
  }
}

export function subscribeTasks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current tasks for an account — a stable reference until setTasks is called. */
export function getTasks(accountId: string): Task[] {
  if (!cache.has(accountId)) cache.set(accountId, readFromStorage(accountId));
  return cache.get(accountId)!;
}

/** Server render has no storage — always empty. */
export function getServerTasks(): Task[] {
  return EMPTY;
}

export function setTasks(accountId: string, tasks: Task[]) {
  cache.set(accountId, tasks);
  if (isBrowser()) localStorage.setItem(keyFor(accountId), JSON.stringify(tasks));
  listeners.forEach((l) => l());
}
