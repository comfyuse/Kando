'use client';

import { TabKey } from '../types';
import { UserIcon, ChatIcon, HexIcon, TaskIcon } from './Icons';

const TABS: { key: TabKey; label: string; Icon: typeof UserIcon }[] = [
  { key: 'account', label: 'Account', Icon: UserIcon },
  { key: 'chats', label: 'Chats', Icon: ChatIcon },
  { key: 'kando', label: 'Kando', Icon: HexIcon },
  { key: 'tasks', label: 'Tasks', Icon: TaskIcon },
];

export default function BottomNav({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-[28px] glass-modern shadow-2xl shadow-black/40">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-1 w-[72px] py-2.5 rounded-[22px] transition-all duration-300"
            >
              {isActive && (
                <span className="absolute inset-0 rounded-[22px] bg-gradient-to-b from-[var(--jade)]/25 to-[var(--jade)]/5 border border-[var(--jade)]/30" />
              )}
              <Icon
                width={22}
                height={22}
                className={`relative transition-colors duration-300 ${
                  isActive ? 'text-[var(--jade)]' : 'text-[var(--text-muted)]'
                }`}
              />
              <span
                className={`relative text-[10px] font-medium transition-colors duration-300 ${
                  isActive ? 'text-[var(--jade)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
