'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { TabKey } from './types';
import { subscribeAuth, getAccountSnapshot, getServerAccountSnapshot } from './lib/auth';
import AuthScreen from './components/AuthScreen';
import BottomNav from './components/BottomNav';
import AccountTab from './components/tabs/AccountTab';
import ChatsTab from './components/tabs/ChatsTab';
import KandoTab from './components/tabs/KandoTab';
import TasksTab from './components/tabs/TasksTab';

export default function AppPage() {
  const account = useSyncExternalStore(subscribeAuth, getAccountSnapshot, getServerAccountSnapshot);
  const [tab, setTab] = useState<TabKey>('chats');
  const [immersive, setImmersive] = useState(false);

  const handleImmersive = useCallback((v: boolean) => setImmersive(v), []);

  if (!account) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-[100dvh] relative">
      {/* Ambient background glow */}
      <div className="fixed -top-40 -right-32 w-96 h-96 rounded-full bg-[var(--jade)]/[0.07] blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -left-32 w-96 h-96 rounded-full bg-[#3b82f6]/[0.06] blur-3xl pointer-events-none" />

      <main className="relative">
        {tab === 'account' && <AccountTab account={account} />}
        {tab === 'chats' && <ChatsTab onImmersiveChange={handleImmersive} />}
        {tab === 'kando' && <KandoTab account={account} />}
        {tab === 'tasks' && <TasksTab account={account} />}
      </main>

      {!immersive && <BottomNav active={tab} onChange={setTab} />}
    </div>
  );
}
