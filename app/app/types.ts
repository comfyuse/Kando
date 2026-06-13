// Shared types for the authenticated KANDO app shell.

export type TabKey = 'account' | 'chats' | 'kando' | 'tasks';

export interface Account {
  id: string;
  name: string;
  email: string;
  /** Short status line shown on the profile, e.g. "Building the hive 🐝". */
  status: string;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  /** 'now' | 'soon' | 'later' — a lightweight priority bucket. */
  priority: 'now' | 'soon' | 'later';
  createdAt: number;
}
