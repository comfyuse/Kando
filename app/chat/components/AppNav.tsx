'use client';

import { SVGProps } from 'react';

export type AppTab = 'account' | 'chats' | 'kando' | 'tasks';

const svg = (p: SVGProps<SVGSVGElement>) => ({
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...p,
});

const Icons = {
  account: (p: SVGProps<SVGSVGElement>) => (
    <svg {...svg(p)}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  chats: (p: SVGProps<SVGSVGElement>) => (
    <svg {...svg(p)}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  kando: (p: SVGProps<SVGSVGElement>) => (
    <svg {...svg(p)}>
      <path d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5z" />
      <path d="m12 8 3.5 2v4L12 16l-3.5-2v-4L12 8z" />
    </svg>
  ),
  tasks: (p: SVGProps<SVGSVGElement>) => (
    <svg {...svg(p)}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
};

const TABS: { key: AppTab; label: string }[] = [
  { key: 'account', label: 'Account' },
  { key: 'chats', label: 'Chats' },
  { key: 'kando', label: 'Kando' },
  { key: 'tasks', label: 'Tasks' },
];

export default function AppNav({
  active,
  onChange,
  badge,
}: {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  /** Optional unread/notification count shown on the Chats tab. */
  badge?: Partial<Record<AppTab, number>>;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-[26px] glass-modern shadow-2xl shadow-black/50">
        {TABS.map(({ key, label }) => {
          const Icon = Icons[key];
          const isActive = active === key;
          const count = badge?.[key] ?? 0;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-1 w-[68px] md:w-[84px] py-2 md:py-2.5 rounded-[20px] transition-all duration-300"
            >
              {isActive && (
                <span className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-[var(--jade)]/25 to-[var(--jade)]/5 border border-[var(--jade)]/30" />
              )}
              {count > 0 && (
                <span className="absolute top-1 right-3 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {count}
                </span>
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
